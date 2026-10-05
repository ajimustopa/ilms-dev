import React, { useState, useEffect, useMemo } from 'react';
import api from '../../../shared/services/api';
import StatusPill from '../../../shared/components/StatusPill';
import FlatAlertBanner from '../../../shared/components/FlatAlertBanner';
import DatePickerField from '../../../shared/components/DatePickerField';
import SearchableSelect from '../../../shared/components/SearchableSelect';
import { formatCurrency, formatDate } from '../../../shared/utils/formatters';
import {
  Coins,
  Receipt,
  Search,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Clock,
  ArrowDownToLine,
  X,
  Calendar,
  Building2,
  FileCheck2,
  Wallet,
  Banknote,
  QrCode,
  Layers,
  Filter,
  RefreshCw,
  TrendingUp,
  PackageCheck,
  ShoppingBag,
  ArrowRight,
  Info,
  BadgeCheck,
  AlertTriangle,
  Landmark,
  BookOpen,
  CheckSquare,
  Square,
  Sparkles,
  FileSpreadsheet
} from 'lucide-react';

export default function PiutangHakKantin() {
  const [summary, setSummary] = useState(null);
  const [details, setDetails] = useState([]);
  const [payments, setPayments] = useState([]);
  const [cashAccounts, setCashAccounts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('detail'); // 'detail' | 'by_product' | 'history'

  // Filters
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('all');
  const [disbursementStatusFilter, setDisbursementStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal Pencairan / Setor ke Keuangan
  const [showModal, setShowModal] = useState(false);
  const [loadingModalData, setLoadingModalData] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [coaAccounts, setCoaAccounts] = useState([]);
  const [bankStatements, setBankStatements] = useState([]);
  const [undisbursedSales, setUndisbursedSales] = useState([]);
  const [selectedTxIds, setSelectedTxIds] = useState([]);

  // Pilihan transaksi langsung dari tabel rincian utama
  const [selectedMainTxIds, setSelectedMainTxIds] = useState([]);

  const [formData, setFormData] = useState({
    paid_at: new Date().toISOString().slice(0, 10),
    amount: '',
    cash_account_id: '',
    coa_account_id: '',
    bank_statement_id: '',
    notes: ''
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = {};
      if (dateFrom) params.period_start = dateFrom;
      if (dateTo) params.period_end = dateTo;
      if (paymentMethodFilter !== 'all') params.payment_method = paymentMethodFilter;
      if (disbursementStatusFilter !== 'all') params.disbursement_status = disbursementStatusFilter;
      if (searchQuery.trim()) params.search = searchQuery.trim();

      const [resSum, resDet, resPay, resAcc] = await Promise.all([
        api.get('/kantin/receivables/canteen-share', { params: { period_start: dateFrom || undefined, period_end: dateTo || undefined } }),
        api.get('/kantin/receivables/canteen-share/detail', { params }),
        api.get('/kantin/canteen-fee-payments'),
        api.get('/kantin/canteen-fee-payments/cash-accounts').catch(() => ({ data: { data: [] } }))
      ]);

      const sumData = resSum.data?.data || null;
      setSummary(sumData);
      setDetails(resDet.data?.data || []);
      setPayments(resPay.data?.data || []);

      const accounts = resAcc.data?.data || [];
      setCashAccounts(accounts);
    } catch (err) {
      console.error('Error fetching canteen share data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [dateFrom, dateTo, paymentMethodFilter, disbursementStatusFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchData();
  };

  const handleResetFilter = () => {
    setDateFrom('');
    setDateTo('');
    setPaymentMethodFilter('all');
    setDisbursementStatusFilter('all');
    setSearchQuery('');
    setSelectedMainTxIds([]);
  };

  // Kumpulan transaksi dompet santri yang belum diserahkan dari tabel saat ini
  const pendingWalletTransactions = useMemo(() => {
    const map = new Map();
    details.forEach(d => {
      if (d.payment_method === 'wallet' && !d.is_disbursed) {
        const txId = d.sales_transaction_id;
        if (!map.has(txId)) {
          map.set(txId, {
            id: txId,
            buyer_name: d.buyer_name,
            cached_class_group_name: d.cached_class_group_name,
            transaction_at: d.transaction_at,
            total_amount: 0
          });
        }
        const tx = map.get(txId);
        tx.total_amount += (d.subtotal_price || 0);
      }
    });
    return Array.from(map.values());
  }, [details]);

  // Total nominal dari transaksi yang dicentang di tabel utama
  const selectedMainTotalAmount = useMemo(() => {
    return pendingWalletTransactions
      .filter(t => selectedMainTxIds.includes(t.id))
      .reduce((sum, t) => sum + t.total_amount, 0);
  }, [pendingWalletTransactions, selectedMainTxIds]);

  const handleToggleMainTx = (txId) => {
    setSelectedMainTxIds(prev =>
      prev.includes(txId) ? prev.filter(id => id !== txId) : [...prev, txId]
    );
  };

  const handleToggleSelectAllMain = () => {
    if (selectedMainTxIds.length === pendingWalletTransactions.length && pendingWalletTransactions.length > 0) {
      setSelectedMainTxIds([]);
    } else {
      setSelectedMainTxIds(pendingWalletTransactions.map(t => t.id));
    }
  };

  // Buka Modal Setor Hak Kantin & Load Master Data Terkait
  const handleOpenSetorModal = async (initialTxIds = null) => {
    setError(null);
    setShowModal(true);
    setLoadingModalData(true);

    try {
      const [resCoa, resBank, resSales, resAcc] = await Promise.all([
        api.get('/kantin/canteen-fee-payments/coa-accounts').catch(() => ({ data: { data: { accounts: [], default_coa_id: null } } })),
        api.get('/kantin/canteen-fee-payments/bank-statements').catch(() => ({ data: { data: [] } })),
        api.get('/kantin/canteen-fee-payments/undisbursed-sales').catch(() => ({ data: { data: { transactions: [], total_amount: 0, total_count: 0 } } })),
        api.get('/kantin/canteen-fee-payments/cash-accounts').catch(() => ({ data: { data: [] } }))
      ]);

      const coaData = resCoa.data?.data || {};
      const coaList = coaData.accounts || [];
      const defaultCoa = coaData.default_coa_id ? String(coaData.default_coa_id) : (coaList[0] ? String(coaList[0].id) : '');
      setCoaAccounts(coaList);

      const bankList = resBank.data?.data || [];
      setBankStatements(bankList);

      const salesData = resSales.data?.data || {};
      const txs = salesData.transactions || [];
      setUndisbursedSales(txs);

      const accounts = resAcc.data?.data || [];
      setCashAccounts(accounts);

      const defaultAcc = accounts.find(a => (a.name || '').toLowerCase().includes('kantin')) || accounts[0];
      const defaultAccId = defaultAcc ? String(defaultAcc.id) : '';

      // Tentukan transaksi yang dipilih:
      // Jika initialTxIds diberikan (dari seleksi tabel utama), gunakan itu.
      // Jika tidak, default pilih seluruh transaksi belum disetor.
      let chosenIds = [];
      if (Array.isArray(initialTxIds) && initialTxIds.length > 0) {
        chosenIds = initialTxIds;
      } else if (selectedMainTxIds.length > 0) {
        chosenIds = selectedMainTxIds;
      } else {
        chosenIds = txs.map(t => t.id);
      }
      setSelectedTxIds(chosenIds);

      // Hitung nominal yang otomatis terisi berdasarkan transaksi yang dipilih
      const chosenTxs = txs.filter(t => chosenIds.includes(t.id));
      const calcAmount = chosenTxs.length > 0
        ? chosenTxs.reduce((sum, t) => sum + (parseFloat(t.total_amount) || 0), 0)
        : (salesData.total_amount > 0 ? salesData.total_amount : (summary?.canteen_receivable || 0));

      setFormData({
        paid_at: new Date().toISOString().slice(0, 10),
        amount: calcAmount > 0 ? String(calcAmount) : '',
        cash_account_id: defaultAccId,
        coa_account_id: defaultCoa,
        bank_statement_id: '',
        notes: `Penyetoran Bagi Hasil Hak Kantin (${chosenIds.length} Transaksi)`
      });
    } catch (err) {
      console.error('Error loading modal data:', err);
    } finally {
      setLoadingModalData(false);
    }
  };

  // Saat mutasi rekening koran dipilih, otomatis sinkron nominal, tanggal, dan rekening kas/bank
  const handleBankStatementChange = (statementId) => {
    if (!statementId) {
      // Direset ke manual
      const selectedTxs = undisbursedSales.filter(t => selectedTxIds.includes(t.id));
      const calcAmount = selectedTxs.reduce((sum, t) => sum + (parseFloat(t.total_amount) || 0), 0);
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

  // Toggle checklist transaksi penjualan
  const handleToggleTx = (txId) => {
    let nextSelected = [];
    if (selectedTxIds.includes(txId)) {
      nextSelected = selectedTxIds.filter(id => id !== txId);
    } else {
      nextSelected = [...selectedTxIds, txId];
    }
    setSelectedTxIds(nextSelected);

    // Hitung ulang nominal jika tidak menggunakan rekening koran tetap
    if (!formData.bank_statement_id) {
      const selectedTxs = undisbursedSales.filter(t => nextSelected.includes(t.id));
      const calcAmount = selectedTxs.reduce((sum, t) => sum + (parseFloat(t.total_amount) || 0), 0);
      setFormData(prev => ({
        ...prev,
        amount: String(calcAmount),
        notes: `Penyetoran Bagi Hasil Hak Kantin (${nextSelected.length} Transaksi)`
      }));
    }
  };

  // Pilih Semua / Batal Pilih Semua
  const handleToggleSelectAll = () => {
    if (selectedTxIds.length === undisbursedSales.length) {
      setSelectedTxIds([]);
      if (!formData.bank_statement_id) {
        setFormData(prev => ({ ...prev, amount: '0', notes: 'Penyetoran Bagi Hasil Hak Kantin' }));
      }
    } else {
      const allIds = undisbursedSales.map(t => t.id);
      setSelectedTxIds(allIds);
      if (!formData.bank_statement_id) {
        const total = undisbursedSales.reduce((sum, t) => sum + (parseFloat(t.total_amount) || 0), 0);
        setFormData(prev => ({ ...prev, amount: String(total), notes: `Penyetoran Bagi Hasil Hak Kantin (${allIds.length} Transaksi)` }));
      }
    }
  };

  const handleDisbursementSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      await api.post('/kantin/canteen-fee-payments', {
        paid_at: formData.paid_at,
        amount: parseFloat(formData.amount),
        cash_account_id: formData.cash_account_id ? Number(formData.cash_account_id) : undefined,
        coa_account_id: formData.coa_account_id ? Number(formData.coa_account_id) : undefined,
        bank_statement_id: formData.bank_statement_id ? Number(formData.bank_statement_id) : undefined,
        sales_transaction_ids: selectedTxIds,
        notes: formData.notes
      });
      setShowModal(false);
      fetchData();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Gagal mencatat penyetoran hak kantin');
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

  // Grouped details by product for 'by_product' tab
  const groupedProducts = useMemo(() => {
    const map = new Map();
    details.forEach(item => {
      const key = item.vendor_product_id || item.product_name;
      if (!map.has(key)) {
        map.set(key, {
          product_name: item.product_name,
          vendor_name: item.vendor_name || 'Kantin Mandiri',
          total_qty: 0,
          total_sales: 0,
          total_cost: 0,
          total_margin: 0,
          cost_price: item.cost_price,
          sale_price: item.sale_price
        });
      }
      const g = map.get(key);
      g.total_qty += item.qty;
      g.total_sales += item.subtotal_price;
      g.total_cost += item.subtotal_cost;
      g.total_margin += item.canteen_share_amount;
    });
    return Array.from(map.values());
  }, [details]);

  // Dynamic sum from filtered details
  const filteredTotals = useMemo(() => {
    return details.reduce((acc, d) => ({
      qty: acc.qty + (d.qty || 0),
      sales: acc.sales + (d.subtotal_price || 0),
      cost: acc.cost + (d.subtotal_cost || 0),
      margin: acc.margin + (d.canteen_share_amount || 0),
      wallet_pending: acc.wallet_pending + (d.payment_method === 'wallet' && !d.is_disbursed ? d.subtotal_price : 0),
      wallet_disbursed: acc.wallet_disbursed + (d.payment_method === 'wallet' && d.is_disbursed ? d.subtotal_price : 0)
    }), { qty: 0, sales: 0, cost: 0, margin: 0, wallet_pending: 0, wallet_disbursed: 0 });
  }, [details]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
            <Coins className="w-6 h-6 text-emerald-600" />
            <span>Piutang & Rekonsiliasi Hak Penjualan Kantin</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Monitoring piutang penjualan dompet siswa yang perlu diserahkan ke kasir kantin, penerimaan tunai, dan rekonsiliasi BKM Keuangan
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
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-emerald-600' : ''}`} />
            <span>Refresh</span>
          </button>
          <button
            type="button"
            onClick={() => handleOpenSetorModal(selectedMainTxIds.length > 0 ? selectedMainTxIds : null)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition"
          >
            <ArrowDownToLine className="w-4 h-4" />
            {selectedMainTxIds.length > 0 ? (
              <span>Setor {selectedMainTxIds.length} Transaksi Terpilih ({formatRupiah(selectedMainTotalAmount)})</span>
            ) : (
              <span>Setor Hak Kantin ke Kas Keuangan</span>
            )}
          </button>
        </div>
      </div>

      {/* Info Banner Aliran Dana Piutang */}
      <div className="bg-emerald-50/40 border border-emerald-200/80 rounded-2xl p-4.5 shadow-2xs">
        <div className="flex items-start gap-3.5">
          <div className="p-2.5 bg-emerald-600 text-white rounded-xl shrink-0 shadow-xs mt-0.5">
            <Info className="w-4 h-4" />
          </div>
          <div className="space-y-1.5 flex-1">
            <h4 className="text-xs font-bold text-slate-800">
              Ketentuan Piutang Hak Kantin dari Penjualan Dompet Siswa
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] text-slate-600 leading-relaxed">
              <div className="flex items-start gap-1.5 bg-white/70 border border-emerald-100 rounded-xl p-2.5">
                <span className="text-emerald-600 font-bold">•</span>
                <span>
                  <strong>Piutang yang Perlu Ditransfer:</strong> Seluruh hasil penjualan yang pembayarannya menggunakan <u>Dompet Siswa</u> (karena dana top-up tersimpan di rekening kas Keuangan/Yayasan).
                </span>
              </div>
              <div className="flex items-start gap-1.5 bg-white/70 border border-emerald-100 rounded-xl p-2.5">
                <span className="text-emerald-600 font-bold">•</span>
                <span>
                  <strong>Penjualan Tunai Kasir &amp; QRIS:</strong> Uang langsung diterima oleh kasir kantin fisik saat transaksi (bukan piutang yang perlu ditransfer).
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Metric Cards (3 Kartu Utama) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* KARTU 1: Piutang Hak Kantin (Nominal transaksi dompet belum disetor) */}
        <div className="bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 text-white p-5 rounded-2xl shadow-sm flex flex-col justify-between relative overflow-hidden min-h-[150px] border border-emerald-500/30">
          <div className="absolute right-[-8px] bottom-[-8px] opacity-10 pointer-events-none">
            <Coins className="w-28 h-28 text-white" />
          </div>
          <div className="flex items-center justify-between z-10">
            <div>
              <span className="text-[11px] font-bold text-emerald-100 uppercase tracking-wider block">
                Piutang Hak Kantin
              </span>
              <span className="text-[10px] text-emerald-200/80">
                Nominal transaksi dompet yang belum disetorkan
              </span>
            </div>
            <span className="px-2.5 py-0.5 bg-emerald-500/30 text-emerald-100 rounded-full text-[10px] font-semibold border border-emerald-400/30 shrink-0">
              Perlu Disetor
            </span>
          </div>
          <div className="my-2.5 z-10">
            <p className="text-2xl lg:text-3xl font-black tracking-tight text-white font-mono">
              {formatRupiah(summary?.canteen_receivable)}
            </p>
          </div>
          <div className="flex items-center justify-between text-[11px] text-emerald-100/90 pt-2 border-t border-emerald-500/30 z-10">
            <span>Status Transaksi:</span>
            <span className="font-bold text-emerald-50">
              {summary?.wallet_tx_pending_count || 0} Trx Dompet Belum Diserahkan
            </span>
          </div>
        </div>

        {/* KARTU 2: Sudah Diserahkan (Nominal yang sudah diserahkan ke kantin) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between hover:border-emerald-200 hover:shadow-sm transition min-h-[150px]">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Sudah Diserahkan
              </span>
              <span className="text-[10px] text-slate-400">
                Nominal dana yang telah diserahkan ke kantin
              </span>
            </div>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100 shrink-0">
              <FileCheck2 className="w-4 h-4" />
            </div>
          </div>
          <div className="my-2.5">
            <p className="text-2xl lg:text-3xl font-black text-emerald-700 font-mono tracking-tight">
              {formatRupiah(summary?.total_canteen_paid)}
            </p>
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100">
            <span>Status Transaksi:</span>
            <span className="font-semibold text-slate-700">
              {summary?.wallet_tx_disbursed_count || 0} Trx Dompet Diserahkan
            </span>
          </div>
        </div>

        {/* KARTU 3: Penjualan Non-Dompet (Tunai Kasir & QRIS - Tidak perlu penyetoran) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between hover:border-slate-300 hover:shadow-sm transition min-h-[150px]">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Penjualan Non-Dompet
              </span>
              <span className="text-[10px] text-slate-400">
                Diterima langsung kasir fisik (Tunai / QRIS)
              </span>
            </div>
            <div className="p-2 bg-slate-100 text-slate-600 rounded-xl border border-slate-200/60 shrink-0">
              <Banknote className="w-4 h-4" />
            </div>
          </div>
          <div className="my-2.5">
            <p className="text-2xl lg:text-3xl font-black text-slate-800 font-mono tracking-tight">
              {formatRupiah(summary?.total_cash_sales)}
            </p>
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100">
            <span>Kewajiban Penyetoran:</span>
            <span className="font-bold text-emerald-600">Rp0 (Tidak Perlu Disetor)</span>
          </div>
        </div>
      </div>

      {/* Ringkasan HPP & Margin Penjualan Keseluruhan */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-4 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200/70 px-3.5 py-2 rounded-xl">
            <ShoppingBag className="w-4 h-4 text-slate-500" />
            <span className="text-slate-500 font-medium">Omzet Kotor:</span>
            <strong className="text-slate-800 font-mono font-bold">{formatRupiah(summary?.total_sales)}</strong>
          </div>
          <div className="flex items-center gap-2 bg-amber-50/70 border border-amber-200/70 px-3.5 py-2 rounded-xl">
            <PackageCheck className="w-4 h-4 text-amber-600" />
            <span className="text-amber-800 font-medium">Modal / HPP:</span>
            <strong className="text-amber-900 font-mono font-bold">{formatRupiah(summary?.total_cost)}</strong>
          </div>
          <div className="flex items-center gap-2 bg-emerald-50/70 border border-emerald-200/70 px-3.5 py-2 rounded-xl">
            <TrendingUp className="w-4 h-4 text-emerald-600" />
            <span className="text-emerald-800 font-medium">Laba Margin Kantin:</span>
            <strong className="text-emerald-900 font-mono font-bold">{formatRupiah(summary?.total_canteen_share)}</strong>
          </div>
        </div>
        <div className="text-[11px] text-slate-400 italic">
          * Seluruh pencairan piutang dompet langsung memvalidasi hak kasir kantin.
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
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Periode Sampai</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Metode Bayar</label>
            <select
              value={paymentMethodFilter}
              onChange={(e) => setPaymentMethodFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
            >
              <option value="all">Semua Metode</option>
              <option value="wallet">Dompet Siswa (Non-Tunai)</option>
              <option value="cash">Tunai Kasir</option>
              <option value="qris">QRIS</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Status Penyerahan Dana</label>
            <select
              value={disbursementStatusFilter}
              onChange={(e) => setDisbursementStatusFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition font-medium"
            >
              <option value="all">Semua Status Dana</option>
              <option value="pending">⏳ Belum Diserahkan (Piutang Dompet)</option>
              <option value="disbursed">✅ Sudah Diserahkan (Lunas Transfer)</option>
              <option value="direct_cash">💵 Diterima Kasir Langsung (Tunai/QRIS)</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Cari Transaksi / Santri / BKM</label>
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ID Trx, santri, produk, BKM..."
                className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
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
            {(dateFrom || dateTo || paymentMethodFilter !== 'all' || disbursementStatusFilter !== 'all' || searchQuery) && (
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
                  ? 'border-emerald-600 text-emerald-700'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <Receipt className="w-3.5 h-3.5" />
              <span>Rincian Transaksi Penjualan ({details.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('by_product')}
              className={`pb-3 text-xs font-bold transition border-b-2 inline-flex items-center gap-1.5 ${
                activeTab === 'by_product'
                  ? 'border-emerald-600 text-emerald-700'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Rekapitulasi per Produk ({groupedProducts.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('history')}
              className={`pb-3 text-xs font-bold transition border-b-2 inline-flex items-center gap-1.5 ${
                activeTab === 'history'
                  ? 'border-emerald-600 text-emerald-700'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <FileCheck2 className="w-3.5 h-3.5" />
              <span>Riwayat Penyetoran & BKM Keuangan ({payments.length})</span>
            </button>
          </div>

          <div className="text-[11px] text-slate-400 pb-2">
            {details.length} item transaksi dimuat
          </div>
        </div>

        {/* Tab 1: Rincian Transaksi Penjualan */}
        {activeTab === 'detail' && (
          <div className="space-y-4">
            {/* Pilihan Transaksi Terpilih Banner jika ada yang dicentang */}
            {selectedMainTxIds.length > 0 && (
              <div className="bg-emerald-50 border border-emerald-300 rounded-2xl p-3.5 flex flex-wrap items-center justify-between gap-3 shadow-xs animate-in fade-in duration-150">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-600 text-white rounded-xl font-bold text-xs">
                    {selectedMainTxIds.length} Trx
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-emerald-900">
                      {selectedMainTxIds.length} Transaksi Dompet Santri Siap Disetorkan
                    </h5>
                    <p className="text-[11px] text-emerald-700">
                      Total Nominal Penyetoran: <strong className="font-mono text-xs font-black">{formatRupiah(selectedMainTotalAmount)}</strong>
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedMainTxIds([])}
                    className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-emerald-100/60 rounded-xl transition"
                  >
                    Batal Pilih
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOpenSetorModal(selectedMainTxIds)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition"
                  >
                    <ArrowDownToLine className="w-4 h-4" />
                    <span>Setorkan {selectedMainTxIds.length} Transaksi Terpilih</span>
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
                        checked={selectedMainTxIds.length === pendingWalletTransactions.length && pendingWalletTransactions.length > 0}
                        onChange={handleToggleSelectAllMain}
                        disabled={pendingWalletTransactions.length === 0}
                        className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer disabled:opacity-30"
                        title="Pilih / Batal Pilih Semua Transaksi Belum Diserahkan"
                      />
                    </th>
                    <th className="px-3.5 py-3">ID Trx</th>
                    <th className="px-3.5 py-3">Waktu</th>
                    <th className="px-3.5 py-3">Pembeli / Santri</th>
                    <th className="px-3.5 py-3">Metode Bayar</th>
                    <th className="px-3.5 py-3">Produk & Suplier</th>
                    <th className="px-3.5 py-3 text-right">Qty</th>
                    <th className="px-3.5 py-3 text-right">Harga Jual</th>
                    <th className="px-3.5 py-3 text-right">Modal (HPP)</th>
                    <th className="px-3.5 py-3 text-right">Margin Kantin</th>
                    <th className="px-3.5 py-3">Status Penyerahan Dana ke Kantin</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {details.map((d, i) => {
                    const isWallet = d.payment_method === 'wallet';
                    const isPendingWallet = isWallet && !d.is_disbursed;
                    const isChecked = selectedMainTxIds.includes(d.sales_transaction_id);
                    return (
                      <tr
                        key={i}
                        className={`hover:bg-slate-50/70 transition ${
                          isChecked ? 'bg-emerald-50/40' : (isPendingWallet ? 'bg-amber-50/25' : '')
                        }`}
                      >
                        {/* Checkbox Kolom */}
                        <td className="px-3 py-3 text-center">
                          {isPendingWallet ? (
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleToggleMainTx(d.sales_transaction_id)}
                              className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                              title="Pilih transaksi ini untuk disetorkan"
                            />
                          ) : isWallet && d.is_disbursed ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-500 mx-auto" title="Sudah Diserahkan" />
                          ) : (
                            <span className="text-slate-300 text-xs font-mono">-</span>
                          )}
                        </td>

                        {/* ID Trx */}
                        <td className="px-3.5 py-3 font-mono font-bold text-slate-700">
                          #{d.sales_transaction_id}
                          {d.transaction_status === 'revised' && (
                            <span className="ml-1 text-[9px] px-1 py-0.5 bg-amber-100 text-amber-700 rounded font-normal">
                              Rev
                            </span>
                          )}
                        </td>

                        {/* Waktu */}
                        <td className="px-3.5 py-3 text-slate-500 font-mono text-[11px] whitespace-nowrap">
                          {d.transaction_at ? new Date(d.transaction_at).toLocaleString('id-ID', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          }) : '-'}
                        </td>

                        {/* Pembeli / Santri */}
                        <td className="px-3.5 py-3">
                          <div className="font-semibold text-slate-800">{d.buyer_name}</div>
                          {d.cached_class_group_name && (
                            <span className="text-[10px] text-slate-400 font-mono">Kelas: {d.cached_class_group_name}</span>
                          )}
                        </td>

                        {/* Metode Bayar */}
                        <td className="px-3.5 py-3 whitespace-nowrap">
                          {isWallet ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 border border-indigo-200 text-indigo-700">
                              <Wallet className="w-3 h-3 text-indigo-600" />
                              <span>Dompet Siswa</span>
                            </span>
                          ) : d.payment_method === 'cash' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 border border-emerald-200 text-emerald-700">
                              <Banknote className="w-3 h-3 text-emerald-600" />
                              <span>Tunai Kasir</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-sky-50 border border-sky-200 text-sky-700">
                              <QrCode className="w-3 h-3 text-sky-600" />
                              <span>{d.payment_method?.toUpperCase()}</span>
                            </span>
                          )}
                        </td>

                        {/* Produk & Suplier */}
                        <td className="px-3.5 py-3">
                          <div className="font-bold text-slate-800">{d.product_name}</div>
                          <div className="text-[10px] text-slate-500">{d.vendor_name || 'Kantin Mandiri'}</div>
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

                        {/* Modal (HPP) */}
                        <td className="px-3.5 py-3 text-right font-mono">
                          <div className="font-semibold text-amber-700">{formatRupiah(d.subtotal_cost)}</div>
                          <div className="text-[10px] text-slate-400">@{formatRupiah(d.cost_price)}</div>
                        </td>

                        {/* Margin Kantin */}
                        <td className="px-3.5 py-3 text-right font-mono font-black text-emerald-700">
                          {formatRupiah(d.canteen_share_amount)}
                        </td>

                        {/* Status Penyerahan Dana ke Kantin */}
                        <td className="px-3.5 py-3 whitespace-nowrap">
                          {isWallet ? (
                            d.is_disbursed ? (
                              <div className="flex flex-col gap-0.5">
                                <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/90 px-2.5 py-1 rounded-lg">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                  <span>Sudah Diserahkan</span>
                                </span>
                                <span className="text-[9.5px] text-slate-500 font-mono pl-1">
                                  {d.finance_receipt_number ? `No. BKM: ${d.finance_receipt_number}` : (d.canteen_fee_payment_id ? `Ref: #CFP-${d.canteen_fee_payment_id}` : 'Ditransfer ke Kantin')}
                                </span>
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
                                    onClick={() => handleOpenSetorModal([d.sales_transaction_id])}
                                    className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-md transition shadow-2xs"
                                    title="Setor hanya transaksi ini ke Keuangan"
                                  >
                                    <ArrowDownToLine className="w-3 h-3 text-emerald-600" />
                                    <span>Setor Trx Ini</span>
                                  </button>
                                  <span className="text-[9.5px] text-amber-700 font-medium">
                                    Piutang Yayasan
                                  </span>
                                </div>
                              </div>
                            )
                          ) : (
                            <div className="flex flex-col gap-0.5">
                              <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-700 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-lg">
                                <BadgeCheck className="w-3.5 h-3.5 text-slate-500" />
                                <span>Diterima Kasir Langsung</span>
                              </span>
                              <span className="text-[9.5px] text-slate-400 pl-1">
                                Kas Fisik Kasir (Non-Piutang)
                              </span>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}

                  {details.length === 0 && (
                    <tr>
                      <td colSpan="11" className="py-12 text-center text-slate-400 italic">
                        {loading ? (
                          <div className="flex items-center justify-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                            <span>Memuat rincian transaksi...</span>
                          </div>
                        ) : (
                          'Belum ada transaksi penjualan yang sesuai filter'
                        )}
                      </td>
                    </tr>
                  )}
                </tbody>

                {/* Dynamic Totals Footer */}
                {details.length > 0 && (
                  <tfoot className="bg-slate-100/90 font-bold border-t-2 border-slate-300 text-slate-800 text-xs">
                    <tr>
                      <td colSpan="6" className="px-3.5 py-3 text-right uppercase tracking-wider text-[11px] text-slate-600">
                        Total ({details.length} Baris):
                      </td>
                      <td className="px-3.5 py-3 text-right font-mono font-black">{filteredTotals.qty}</td>
                      <td className="px-3.5 py-3 text-right font-mono font-black text-slate-900">
                        {formatRupiah(filteredTotals.sales)}
                      </td>
                      <td className="px-3.5 py-3 text-right font-mono font-black text-amber-700">
                        {formatRupiah(filteredTotals.cost)}
                      </td>
                      <td className="px-3.5 py-3 text-right font-mono font-black text-emerald-800">
                        {formatRupiah(filteredTotals.margin)}
                      </td>
                      <td className="px-3.5 py-3 text-right">
                        {filteredTotals.wallet_pending > 0 && (
                          <span className="inline-flex items-center gap-1 text-[11px] text-amber-800 font-bold font-mono bg-amber-100/80 px-2 py-0.5 rounded">
                            Piutang: {formatRupiah(filteredTotals.wallet_pending)}
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

        {/* Tab 2: Rekapitulasi per Produk */}
        {activeTab === 'by_product' && (
          <div className="table-container overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Nama Produk</th>
                  <th className="px-4 py-3">Vendor / Suplier</th>
                  <th className="px-4 py-3 text-right">Total Terjual (Qty)</th>
                  <th className="px-4 py-3 text-right">Harga Jual Satuan</th>
                  <th className="px-4 py-3 text-right">Modal / HPP Satuan</th>
                  <th className="px-4 py-3 text-right">Total Penjualan (Omzet)</th>
                  <th className="px-4 py-3 text-right">Total Modal (HPP)</th>
                  <th className="px-4 py-3 text-right">Total Laba Kantin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {groupedProducts.map((p, i) => (
                  <tr key={i} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3 font-bold text-slate-800">{p.product_name}</td>
                    <td className="px-4 py-3 text-slate-600">{p.vendor_name}</td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-slate-700">{p.total_qty}</td>
                    <td className="px-4 py-3 text-right font-mono text-slate-700">{formatRupiah(p.sale_price)}</td>
                    <td className="px-4 py-3 text-right font-mono text-amber-700">{formatRupiah(p.cost_price)}</td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-slate-800">{formatRupiah(p.total_sales)}</td>
                    <td className="px-4 py-3 text-right font-mono font-semibold text-amber-700">{formatRupiah(p.total_cost)}</td>
                    <td className="px-4 py-3 text-right font-mono font-black text-emerald-700">
                      {formatRupiah(p.total_margin)}
                    </td>
                  </tr>
                ))}

                {groupedProducts.length === 0 && (
                  <tr>
                    <td colSpan="8" className="py-12 text-center text-slate-400 italic">
                      Belum ada data produk terjual
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 3: Riwayat Penyetoran & BKM Keuangan */}
        {activeTab === 'history' && (
          <div className="table-container overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">ID Penyetoran</th>
                  <th className="px-4 py-3">Periode Transaksi</th>
                  <th className="px-4 py-3">Nominal Penyetoran</th>
                  <th className="px-4 py-3">Waktu Eksekusi</th>
                  <th className="px-4 py-3">No. Bukti Kas Masuk (Modul Keuangan)</th>
                  <th className="px-4 py-3">Status Sinkronisasi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3 font-mono font-bold text-slate-800">#CFP-{p.id}</td>
                    <td className="px-4 py-3 text-slate-700 font-mono">
                      {p.period_start?.slice(0, 10)} s/d {p.period_end?.slice(0, 10)}
                    </td>
                    <td className="px-4 py-3 font-mono font-extrabold text-emerald-700">
                      {formatRupiah(p.amount)}
                    </td>
                    <td className="px-4 py-3 text-slate-500 font-mono text-[11px]">
                      {p.paid_at ? new Date(p.paid_at).toLocaleString('id-ID') : '-'}
                    </td>
                    <td className="px-4 py-3">
                      {p.finance_receipt_number ? (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 font-mono font-bold text-[11px]">
                          <FileCheck2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>{p.finance_receipt_number}</span>
                        </div>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-600">
                          Tercatat Lokal
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Tersinkron ke Kas Keuangan</span>
                      </span>
                    </td>
                  </tr>
                ))}

                {payments.length === 0 && (
                  <tr>
                    <td colSpan="6" className="py-12 text-center text-slate-400 italic">
                      Belum ada riwayat penyetoran hak kantin
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Serah Terima / Setor Hak Kantin ke Kas Keuangan */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-4xl w-full p-6 shadow-2xl border border-slate-100 space-y-5 my-8 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-100 text-emerald-700 rounded-2xl shadow-xs">
                  <Building2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">
                    Setor Hak Kantin ke Kas Keuangan
                  </h3>
                  <p className="text-xs text-slate-500">
                    Mencatat serah terima dana penjualan dompet siswa &amp; sinkronisasi otomatis BKM ke Modul Keuangan
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
                <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
                <span className="text-xs font-semibold">Memuat data COA, Rekening Kas, dan Transaksi Penjualan Terkait...</span>
              </div>
            ) : (
              <form onSubmit={handleDisbursementSubmit} className="space-y-5">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                  {/* KOLOM KIRI: Pengaturan Penyetoran & Akuntansi (6 cols) */}
                  <div className="lg:col-span-6 space-y-4">
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 pb-1 border-b border-slate-100">
                      <Landmark className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Data Penyetoran &amp; Akuntansi</span>
                    </h4>

                    {/* 1. Tanggal Penyerahan Uang (DatePickerField) */}
                    <div>
                      <DatePickerField
                        label="Tanggal Penyerahan Uang *"
                        value={formData.paid_at}
                        onChange={(isoStr) => setFormData({ ...formData, paid_at: isoStr })}
                        placeholder="DD/MM/YYYY"
                        helperText="Format tanggal dd/mm/yyyy. Otomatis tercatat pada bukti kas masuk (BKM)."
                        required
                      />
                    </div>

                    {/* 2. Referensi Rekening Koran (Mutasi Bank) */}
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
                            label: '-- Tanpa Rekening Koran (Setor Tunai / Manual) --',
                            sublabel: 'Penyetoran tunai fisik atau mutasi di luar rekening koran bank'
                          },
                          ...bankStatements.map(stmt => ({
                            value: String(stmt.id),
                            label: `[${formatDate(stmt.transaction_date)}] ${formatRupiah(stmt.unallocated_amount || stmt.amount)} - ${stmt.description}`,
                            sublabel: `${stmt.bank_name || 'Bank'} ${stmt.bank_account_number || ''} • Sisa Alokasi: ${formatRupiah(stmt.unallocated_amount)}`,
                            badge: 'CR (Masuk)',
                            badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          }))
                        ]}
                        value={formData.bank_statement_id}
                        onChange={handleBankStatementChange}
                        placeholder="-- Pilih Mutasi Rekening Koran Bank Masuk --"
                        searchPlaceholder="Cari tanggal / deskripsi / nominal rekening koran..."
                      />
                      {formData.bank_statement_id && (
                        <p className="text-[10px] text-emerald-700 mt-1 flex items-center gap-1">
                          <Sparkles className="w-3 h-3" />
                          <span>Nominal dan tanggal penyerahan otomatis disinkronkan dari mutasi bank rekening koran.</span>
                        </p>
                      )}
                    </div>

                    {/* 3. Rekening Kas/Bank Penerima */}
                    {/* 3. Rekening Kas/Bank Penerima (Akun Debet) */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                        <span className="flex items-center gap-1">
                          <Wallet className="w-3.5 h-3.5 text-slate-500" />
                          <span>Rekening Kas/Bank Penerima (Akun Debet) *</span>
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">Posisi: Debet (Kas Masuk)</span>
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
                        placeholder="Pilih Rekening Kas / Bank Penerima"
                        searchPlaceholder="Cari rekening kas atau bank..."
                      />
                    </div>

                    {/* 4. Akun Akuntansi Terkait (COA Kredit) */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                        <span className="flex items-center gap-1">
                          <BookOpen className="w-3.5 h-3.5 text-slate-500" />
                          <span>Akun Akuntansi Terkait (Akun Kredit) *</span>
                        </span>
                        <span className="text-[10px] text-emerald-700 font-mono font-bold bg-emerald-50 px-1.5 py-0.5 rounded">Posisi: Kredit (Pendapatan)</span>
                      </label>
                      <SearchableSelect
                        options={coaAccounts.map(c => ({
                          value: String(c.id),
                          label: c.display_label || `[${c.account_code}] ${c.account_name}`,
                          sublabel: `Kelompok: ${(c.account_group || '').toUpperCase()} • Saldo Normal: ${(c.normal_balance || 'credit').toUpperCase()}`,
                          badge: String(c.id) === String(formData.coa_account_id) ? 'Akun Default' : undefined,
                          badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        }))}
                        value={formData.coa_account_id}
                        onChange={(val) => setFormData({ ...formData, coa_account_id: val })}
                        placeholder="Pilih Akun Bagan Perkiraan (COA Kredit)"
                        searchPlaceholder="Cari kode akun atau nama COA..."
                      />
                      <p className="text-[10px] text-slate-400 mt-1">
                        * Otomatis terhubung ke akun kredit pendapatan bagi hasil unit usaha kantin.
                      </p>
                    </div>

                    {/* Pratinjau Jurnal Akuntansi Otomatis */}
                    {(() => {
                      const selectedCash = cashAccounts.find(c => String(c.id) === String(formData.cash_account_id));
                      const selectedCoa = coaAccounts.find(c => String(c.id) === String(formData.coa_account_id));
                      const nominal = parseFloat(formData.amount) || 0;
                      return (
                        <div className="p-3 bg-slate-900 text-slate-100 rounded-xl space-y-1.5 font-mono text-[11px] border border-slate-800">
                          <div className="text-[10px] text-slate-400 font-sans font-bold uppercase tracking-wider flex items-center gap-1.5 pb-1 border-b border-slate-800">
                            <BookOpen className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Pratinjau Jurnal Kas Masuk (BKM):</span>
                          </div>
                          <div className="flex items-center justify-between text-emerald-400">
                            <span>[Debet] {selectedCash?.name || selectedCash?.display_label || 'Kas/Bank Penerima'}</span>
                            <span className="font-bold">{formatRupiah(nominal)}</span>
                          </div>
                          <div className="flex items-center justify-between text-amber-300 pl-4">
                            <span>[Kredit] {selectedCoa?.display_label || selectedCoa?.account_name || 'Akun Pendapatan Bagi Hasil'}</span>
                            <span className="font-bold">{formatRupiah(nominal)}</span>
                          </div>
                        </div>
                      );
                    })()}

                    {/* 5. Nominal Penyetoran (Rp) */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Nominal Penyetoran (Rp) *
                      </label>
                      <input
                        type="number"
                        min={1}
                        required
                        value={formData.amount}
                        onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                        placeholder="Contoh: 100000"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold font-mono text-emerald-800 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
                      />
                      <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1">
                        <span>Total Terpilih dari Transaksi:</span>
                        <span className="font-bold text-indigo-700 font-mono">
                          {formatRupiah(undisbursedSales.filter(t => selectedTxIds.includes(t.id)).reduce((s, t) => s + (parseFloat(t.total_amount) || 0), 0))}
                        </span>
                      </div>
                    </div>

                    {/* 6. Catatan / Keterangan */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Catatan / Keterangan</label>
                      <input
                        type="text"
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        placeholder="Contoh: Penyetoran bagi hasil kantin dompet santri"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
                      />
                    </div>
                  </div>

                  {/* KOLOM KANAN: Transaksi Penjualan Terkait (6 cols) */}
                  <div className="lg:col-span-6 flex flex-col h-full bg-slate-50/60 rounded-2xl p-4 border border-slate-200/80">
                    <div className="flex items-center justify-between pb-2.5 border-b border-slate-200/80 mb-2.5">
                      <div>
                        <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                          <Receipt className="w-3.5 h-3.5 text-indigo-600" />
                          <span>Transaksi Penjualan Terkait</span>
                        </h4>
                        <p className="text-[10px] text-slate-500">
                          Pilih transaksi dompet siswa yang dananya diserahkan
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleToggleSelectAll}
                        className="px-2 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-[10px] font-bold transition shadow-2xs flex items-center gap-1"
                      >
                        {selectedTxIds.length === undisbursedSales.length && undisbursedSales.length > 0 ? (
                          <>
                            <Square className="w-3 h-3 text-slate-500" />
                            <span>Batal Semua</span>
                          </>
                        ) : (
                          <>
                            <CheckSquare className="w-3 h-3 text-emerald-600" />
                            <span>Pilih Semua ({undisbursedSales.length})</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Summary Terpilih */}
                    <div className="p-2.5 bg-indigo-50/70 border border-indigo-100 rounded-xl text-[11px] flex items-center justify-between text-indigo-900 mb-2.5">
                      <span>Terpilih: <strong>{selectedTxIds.length}</strong> dari {undisbursedSales.length} transaksi</span>
                      <strong className="font-mono font-bold text-indigo-700">
                        {formatRupiah(undisbursedSales.filter(t => selectedTxIds.includes(t.id)).reduce((s, t) => s + (parseFloat(t.total_amount) || 0), 0))}
                      </strong>
                    </div>

                    {/* Scrollable Table Transaksi */}
                    <div className="flex-1 overflow-y-auto max-h-[320px] rounded-xl border border-slate-200 bg-white custom-scrollbar">
                      <table className="w-full text-left text-[11px]">
                        <thead className="bg-slate-50 text-slate-500 font-semibold sticky top-0 border-b border-slate-200 z-10">
                          <tr>
                            <th className="p-2 text-center w-8">#</th>
                            <th className="p-2">Waktu &amp; Siswa</th>
                            <th className="p-2">Kasir</th>
                            <th className="p-2 text-right">Nominal</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {undisbursedSales.map((tx) => {
                            const isChecked = selectedTxIds.includes(tx.id);
                            return (
                              <tr
                                key={tx.id}
                                onClick={() => handleToggleTx(tx.id)}
                                className={`cursor-pointer transition ${
                                  isChecked ? 'bg-emerald-50/50 hover:bg-emerald-50' : 'hover:bg-slate-50'
                                }`}
                              >
                                <td className="p-2 text-center">
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => {}} // handled by row click
                                    className="w-3.5 h-3.5 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                                  />
                                </td>
                                <td className="p-2">
                                  <div className="font-semibold text-slate-800">
                                    {tx.student_name || tx.buyer_name || 'Santri'}
                                  </div>
                                  <div className="text-[10px] text-slate-400 font-mono">
                                    {formatDate(tx.transaction_at)} &bull; {tx.class_group_name || 'Umum'}
                                  </div>
                                </td>
                                <td className="p-2 text-slate-500 text-[10px]">
                                  {tx.cashier_name || 'Kasir'}
                                </td>
                                <td className="p-2 text-right font-mono font-bold text-slate-800">
                                  {formatRupiah(tx.total_amount)}
                                </td>
                              </tr>
                            );
                          })}

                          {undisbursedSales.length === 0 && (
                            <tr>
                              <td colSpan="4" className="py-12 text-center text-slate-400 italic">
                                Tidak ada transaksi penjualan dompet yang belum diserahkan.
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
                    * Menerbitkan Bukti Kas Masuk (BKM) Keuangan in-process dan menandai transaksi penjualan sebagai diserahkan.
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
                      type="submit"
                      disabled={submitting || !formData.amount || parseFloat(formData.amount) <= 0}
                      className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition disabled:opacity-50 inline-flex items-center gap-2"
                    >
                      {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                      <span>{submitting ? 'Memproses ke Keuangan...' : 'Konfirmasi & Setor ke Keuangan'}</span>
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
