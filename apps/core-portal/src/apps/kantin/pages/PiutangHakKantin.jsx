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
  FileSpreadsheet,
  Settings,
  Check
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

  // Accounting Settings State
  const [accountingConfig, setAccountingConfig] = useState(null);
  const [loadingConfig, setLoadingConfig] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);
  const [configSuccess, setConfigSuccess] = useState(null);
  const [configError, setConfigError] = useState(null);

  const [configForm, setConfigForm] = useState({
    auto_journal_enabled: true,
    default_fund_source_name: 'Kantin Sekolah',
    default_cash_account_id: '',
    default_bank_account_id: '',
    debit_coa_id: '',
    credit_coa_id: '',
    default_bank_statement_id: ''
  });

  const [formData, setFormData] = useState({
    paid_at: new Date().toISOString().slice(0, 10),
    amount: '',
    cash_account_id: '',
    coa_account_id: '',
    bank_statement_id: '',
    fund_source_name: 'Kantin Sekolah',
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

      const [resSum, resDet, resPay, resAcc, resConfig] = await Promise.all([
        api.get('/kantin/receivables/canteen-share', { params: { period_start: dateFrom || undefined, period_end: dateTo || undefined } }),
        api.get('/kantin/receivables/canteen-share/detail', { params }),
        api.get('/kantin/canteen-fee-payments'),
        api.get('/kantin/canteen-fee-payments/cash-accounts').catch(() => ({ data: { data: [] } })),
        api.get('/kantin/canteen-fee-payments/accounting-config').catch(() => ({ data: null }))
      ]);

      const sumData = resSum.data?.data || null;
      setSummary(sumData);
      setDetails(resDet.data?.data || []);
      setPayments(resPay.data?.data || []);

      const accounts = resAcc.data?.data || [];
      setCashAccounts(accounts);

      if (resConfig?.data?.data) {
        const cfg = resConfig.data.data;
        setAccountingConfig(cfg);
        const s = cfg.settings || {};
        setConfigForm({
          auto_journal_enabled: s.auto_journal_enabled ?? true,
          default_fund_source_name: s.default_fund_source_name || 'Kantin Sekolah',
          default_cash_account_id: s.default_cash_account_id || '',
          default_bank_account_id: s.default_bank_account_id || '',
          debit_coa_id: s.debit_coa_id || '',
          credit_coa_id: s.credit_coa_id || '',
          default_bank_statement_id: s.default_bank_statement_id || ''
        });
      }
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

  const handleSaveAccountingConfig = async (e) => {
    e.preventDefault();
    setSavingConfig(true);
    setConfigError(null);
    setConfigSuccess(null);

    try {
      const res = await api.post('/kantin/canteen-fee-payments/accounting-config', configForm);
      setConfigSuccess('Konfigurasi akuntansi penyetoran hak kantin berhasil diperbarui!');
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
      const [resCoa, resBank, resSales, resAcc, resConfig] = await Promise.all([
        api.get('/kantin/canteen-fee-payments/coa-accounts').catch(() => ({ data: { data: { accounts: [], default_coa_id: null } } })),
        api.get('/kantin/canteen-fee-payments/bank-statements').catch(() => ({ data: { data: [] } })),
        api.get('/kantin/canteen-fee-payments/undisbursed-sales').catch(() => ({ data: { data: { transactions: [], total_amount: 0, total_count: 0 } } })),
        api.get('/kantin/canteen-fee-payments/cash-accounts').catch(() => ({ data: { data: [] } })),
        api.get('/kantin/canteen-fee-payments/accounting-config').catch(() => ({ data: null }))
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

      const cfg = resConfig?.data?.data || accountingConfig;
      const defCashId = cfg?.settings?.default_cash_account_id ? String(cfg.settings.default_cash_account_id) : '';
      const defFundSource = cfg?.settings?.default_fund_source_name || 'Kantin Sekolah';
      const defBankStmtId = cfg?.settings?.default_bank_statement_id ? String(cfg.settings.default_bank_statement_id) : '';

      const defaultAcc = accounts.find(a => String(a.id) === String(defCashId)) || accounts.find(a => (a.name || '').toLowerCase().includes('kantin')) || accounts[0];
      const defaultAccId = defaultAcc ? String(defaultAcc.id) : '';

      // Tentukan transaksi yang dipilih
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
        coa_account_id: cfg?.settings?.debit_coa_id ? String(cfg.settings.debit_coa_id) : defaultCoa,
        bank_statement_id: defBankStmtId,
        fund_source_name: defFundSource,
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
        fund_source_name: formData.fund_source_name || 'Kantin Sekolah',
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

  const allCoas = accountingConfig?.coa_accounts || coaAccounts || [];
  const cfgCashAccounts = accountingConfig?.cash_accounts || [];
  const cfgBankAccounts = accountingConfig?.bank_accounts || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
            <Coins className="w-6 h-6 text-emerald-600" />
            <span>Piutang &amp; Rekonsiliasi Hak Penjualan Kantin</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Monitoring piutang penjualan dompet siswa yang perlu diserahkan ke kasir kantin, penerimaan tunai, dan penjurnalan akuntansi otomatis
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Tombol Setelan Akuntansi */}
          <button
            type="button"
            onClick={() => setShowConfigModal(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl shadow-xs transition cursor-pointer"
            title="Konfigurasi Akun COA & Kas Default untuk Setor Hak Kantin"
          >
            <Settings className="w-4 h-4 text-slate-600" />
            <span>Setelan Akuntansi</span>
            <span className={`inline-block w-2 h-2 rounded-full ${accountingConfig?.settings?.auto_journal_enabled !== false ? 'bg-emerald-500' : 'bg-slate-300'}`} />
          </button>

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
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer"
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
              <p className="text-[10px] text-emerald-200/90 mt-0.5">
                Dana penjualan via Dompet Santri yang belum diserahkan
              </p>
            </div>
            <div className="p-2 bg-white/15 rounded-xl border border-white/20">
              <Clock className="w-4 h-4 text-emerald-200" />
            </div>
          </div>
          <div className="z-10 mt-3">
            <div className="text-2xl font-black font-mono tracking-tight text-white">
              {formatRupiah(summary?.canteen_receivable)}
            </div>
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-emerald-500/30 text-[11px] text-emerald-100">
              <span>Transaksi Belum Diserahkan:</span>
              <span className="font-bold bg-white/20 px-2 py-0.5 rounded-full font-mono">
                {summary?.pending_wallet_transactions_count || 0} Tx
              </span>
            </div>
          </div>
        </div>

        {/* KARTU 2: Total Penjualan Dompet Santri */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col justify-between min-h-[150px]">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Total Penjualan Dompet Santri
              </span>
              <p className="text-[10px] text-slate-400 mt-0.5">
                Omzet transaksi digital non-tunai dompet
              </p>
            </div>
            <div className="p-2 bg-indigo-50 text-indigo-700 rounded-xl border border-indigo-100">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-extrabold font-mono text-slate-800 tracking-tight">
              {formatRupiah(summary?.total_wallet_sales)}
            </div>
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 text-[11px] text-slate-500">
              <span>Sudah Diserahkan:</span>
              <span className="font-bold text-emerald-600 font-mono">
                {formatRupiah(summary?.disbursed_wallet_sales)}
              </span>
            </div>
          </div>
        </div>

        {/* KARTU 3: Penerimaan Kasir Fisik & QRIS */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col justify-between min-h-[150px]">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Penerimaan Langsung di Kasir
              </span>
              <p className="text-[10px] text-slate-400 mt-0.5">
                Kas Tunai Fisik &amp; QRIS langsung masuk kasir
              </p>
            </div>
            <div className="p-2 bg-amber-50 text-amber-700 rounded-xl border border-amber-100">
              <Banknote className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-extrabold font-mono text-slate-800 tracking-tight">
              {formatRupiah((summary?.total_cash_sales || 0) + (summary?.total_qris_sales || 0))}
            </div>
            <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-slate-100 text-[11px]">
              <div>
                <span className="text-slate-400 block text-[10px]">Tunai Fisik:</span>
                <strong className="font-mono text-slate-700">{formatRupiah(summary?.total_cash_sales)}</strong>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">QRIS:</span>
                <strong className="font-mono text-slate-700">{formatRupiah(summary?.total_qris_sales)}</strong>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filter & Navigation Tabs */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Navigation Tabs */}
          <div className="flex p-1 bg-slate-100 rounded-xl max-w-fit">
            <button
              type="button"
              onClick={() => setActiveTab('detail')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'detail'
                  ? 'bg-white text-slate-800 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Receipt className="w-3.5 h-3.5" />
              <span>Rincian Transaksi Penjualan ({details.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('by_product')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'by_product'
                  ? 'bg-white text-slate-800 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>Rekap per Produk ({groupedProducts.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('history')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'history'
                  ? 'bg-white text-slate-800 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileCheck2 className="w-3.5 h-3.5" />
              <span>Riwayat Penyetoran Hak ({payments.length})</span>
            </button>
          </div>

          {/* Quick Selection Action for Main Table */}
          {activeTab === 'detail' && pendingWalletTransactions.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={handleToggleSelectAllMain}
                className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer"
              >
                {selectedMainTxIds.length === pendingWalletTransactions.length ? (
                  <>
                    <Square className="w-3.5 h-3.5 text-slate-500" />
                    <span>Batal Pilih Semua</span>
                  </>
                ) : (
                  <>
                    <CheckSquare className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Pilih Semua Piutang ({pendingWalletTransactions.length})</span>
                  </>
                )}
              </button>
              {selectedMainTxIds.length > 0 && (
                <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-200 font-mono">
                  Terpilih: {selectedMainTxIds.length} Tx ({formatRupiah(selectedMainTotalAmount)})
                </span>
              )}
            </div>
          )}
        </div>

        {/* Filter Toolbar */}
        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-3 border-t border-slate-100">
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Dari Tanggal:</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-hidden focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Sampai Tanggal:</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-hidden focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Metode Bayar:</label>
            <select
              value={paymentMethodFilter}
              onChange={(e) => setPaymentMethodFilter(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-hidden focus:border-emerald-500"
            >
              <option value="all">Semua Metode</option>
              <option value="wallet">Dompet Siswa (Piutang)</option>
              <option value="cash">Tunai Kasir</option>
              <option value="qris">QRIS</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Status Penyerahan:</label>
            <select
              value={disbursementStatusFilter}
              onChange={(e) => setDisbursementStatusFilter(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-hidden focus:border-emerald-500"
            >
              <option value="all">Semua Status</option>
              <option value="pending">Belum Diserahkan (Piutang)</option>
              <option value="disbursed">Sudah Diserahkan (Lunas)</option>
            </select>
          </div>

          <div className="flex items-end gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari santri/produk..."
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 placeholder-slate-400 focus:outline-hidden focus:border-emerald-500"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            </div>
            <button
              type="button"
              onClick={handleResetFilter}
              className="px-2.5 py-1.5 text-xs text-slate-500 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
              title="Reset Filter"
            >
              Reset
            </button>
          </div>
        </form>
      </div>

      {/* Main Content Area */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        {/* Tab 1: Rincian Transaksi */}
        {activeTab === 'detail' && (
          <div className="table-container overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="p-3 text-center w-8">#</th>
                  <th className="px-3.5 py-3">Waktu &amp; Siswa</th>
                  <th className="px-3.5 py-3">Produk &amp; Vendor</th>
                  <th className="px-3.5 py-3 text-center">Metode</th>
                  <th className="px-3.5 py-3 text-right">Qty</th>
                  <th className="px-3.5 py-3 text-right">Harga Jual</th>
                  <th className="px-3.5 py-3 text-right">Total Penjualan</th>
                  <th className="px-3.5 py-3 text-right">HPP / Modal</th>
                  <th className="px-3.5 py-3 text-right">Laba Kantin</th>
                  <th className="px-3.5 py-3 text-center">Status Piutang</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {details.map((d, i) => {
                  const isWallet = d.payment_method === 'wallet';
                  const isPending = isWallet && !d.is_disbursed;
                  const isChecked = selectedMainTxIds.includes(d.sales_transaction_id);

                  return (
                    <tr
                      key={i}
                      className={`hover:bg-slate-50/70 transition ${
                        isChecked ? 'bg-emerald-50/40' : ''
                      }`}
                    >
                      <td className="p-3 text-center">
                        {isPending ? (
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleMainTx(d.sales_transaction_id)}
                            className="w-3.5 h-3.5 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                          />
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>
                      <td className="px-3.5 py-3">
                        <div className="font-bold text-slate-800">
                          {d.buyer_name || 'Santri'}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {d.transaction_at ? formatDate(d.transaction_at) : '-'} &bull; {d.cached_class_group_name || 'Umum'}
                        </div>
                      </td>
                      <td className="px-3.5 py-3">
                        <div className="font-semibold text-slate-700">{d.product_name}</div>
                        <div className="text-[10px] text-slate-400">
                          {d.vendor_name || 'Kantin Mandiri'}
                        </div>
                      </td>
                      <td className="px-3.5 py-3 text-center">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            d.payment_method === 'wallet'
                              ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                              : d.payment_method === 'cash'
                              ? 'bg-amber-50 text-amber-800 border border-amber-200'
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          }`}
                        >
                          {d.payment_method === 'wallet' ? 'Dompet' : d.payment_method === 'cash' ? 'Tunai' : 'QRIS'}
                        </span>
                      </td>
                      <td className="px-3.5 py-3 text-right font-mono font-bold text-slate-700">
                        {d.qty}
                      </td>
                      <td className="px-3.5 py-3 text-right font-mono text-slate-600">
                        {formatRupiah(d.sale_price)}
                      </td>
                      <td className="px-3.5 py-3 text-right font-mono font-bold text-slate-800">
                        {formatRupiah(d.subtotal_price)}
                      </td>
                      <td className="px-3.5 py-3 text-right font-mono text-amber-700 font-semibold">
                        {formatRupiah(d.subtotal_cost)}
                      </td>
                      <td className="px-3.5 py-3 text-right font-mono font-bold text-emerald-700">
                        {formatRupiah(d.canteen_share_amount)}
                      </td>
                      <td className="px-3.5 py-3 text-center">
                        {isWallet ? (
                          d.is_disbursed ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Diserahkan</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                              <Clock className="w-3 h-3" />
                              <span>Piutang</span>
                            </span>
                          )
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-500">
                            Tunai Langsung
                          </span>
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
            </table>
          </div>
        )}

        {/* Tab 2: Rekap per Produk */}
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

        {/* Tab 3: Riwayat Penyetoran & Jurnal Akuntansi */}
        {activeTab === 'history' && (
          <div className="table-container overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">ID Penyetoran</th>
                  <th className="px-4 py-3">Periode Transaksi</th>
                  <th className="px-4 py-3">Nominal Penyetoran</th>
                  <th className="px-4 py-3">Jurnal &amp; Rekening</th>
                  <th className="px-4 py-3">No. BKM (Keuangan)</th>
                  <th className="px-4 py-3">Status Sinkronisasi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3 font-mono font-bold text-slate-800">
                      #CFP-{p.id}
                      <p className="text-[10px] text-slate-400 font-sans font-normal mt-0.5">
                        {p.paid_at ? new Date(p.paid_at).toLocaleString('id-ID') : '-'}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-slate-700 font-mono">
                      {p.period_start?.slice(0, 10)} s/d {p.period_end?.slice(0, 10)}
                    </td>
                    <td className="px-4 py-3 font-mono font-extrabold text-emerald-700">
                      {formatRupiah(p.amount)}
                      {p.fund_source_name && (
                        <p className="text-[10px] font-sans font-normal text-slate-500">
                          Pos: {p.fund_source_name}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="space-y-1">
                        {p.journal_number ? (
                          <span className="font-mono bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md font-bold text-[10px] border border-emerald-200 inline-flex items-center gap-1">
                            <BadgeCheck className="w-3 h-3 text-emerald-600" />
                            Jurnal #{p.journal_number}
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400 italic">Jurnal Lokal</span>
                        )}
                        {p.cash_account_name && (
                          <div className="text-[10px] text-slate-600 flex items-center gap-1">
                            <Wallet className="w-3 h-3 text-slate-400" />
                            <span>{p.cash_account_name}</span>
                          </div>
                        )}
                      </div>
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
                    Mencatat serah terima dana penjualan dompet siswa, penjurnalan buku besar &amp; sinkronisasi otomatis BKM Keuangan
                  </p>
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

                    {/* Pos Dana Terkait */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Pos Dana Terkait *
                      </label>
                      <input
                        type="text"
                        value={formData.fund_source_name}
                        onChange={(e) => setFormData({ ...formData, fund_source_name: e.target.value })}
                        placeholder="Contoh: Kantin Sekolah"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-hidden focus:border-emerald-500"
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
                    </div>

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
                          <span>Akun Akuntansi Terkait (Akun Debet/Kredit Penyesuaian)</span>
                        </span>
                        <span className="text-[10px] text-emerald-700 font-mono font-bold bg-emerald-50 px-1.5 py-0.5 rounded">COA Penerimaan</span>
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
                        placeholder="Pilih Akun Bagan Perkiraan (COA)"
                        searchPlaceholder="Cari kode akun atau nama COA..."
                      />
                    </div>

                    {/* DYNAMIC LIVE JOURNAL PREVIEW CARD */}
                    {(() => {
                      const selectedCash = cashAccounts.find(c => String(c.id) === String(formData.cash_account_id));
                      const selectedCoa = coaAccounts.find(c => String(c.id) === String(formData.coa_account_id));
                      const nominal = parseFloat(formData.amount) || 0;
                      return (
                        <div className="p-3.5 bg-gradient-to-br from-emerald-950 via-slate-900 to-slate-900 text-white rounded-2xl shadow-md border border-emerald-500/30 space-y-2.5">
                          <div className="flex items-center justify-between border-b border-emerald-500/20 pb-1.5">
                            <div className="flex items-center gap-1.5">
                              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                              <span className="text-xs font-bold text-emerald-300">
                                Pratinjau Jurnal Otomatis (Buku Besar)
                              </span>
                            </div>
                            <span className="text-[10px] font-mono text-emerald-300 font-bold bg-emerald-500/20 px-2 py-0.5 rounded-full border border-emerald-500/30">
                              Double-Entry
                            </span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                            <div className="p-2 bg-white/5 rounded-xl border border-emerald-500/20 space-y-0.5">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold text-emerald-400 uppercase">[DEBET]</span>
                                <span className="font-mono text-emerald-300 font-bold">{formatRupiah(nominal)}</span>
                              </div>
                              <p className="font-bold text-slate-100 text-[11px]">{selectedCash?.name || selectedCash?.display_label || 'Kas / Bank Penerima'}</p>
                              <p className="text-[10px] text-slate-400 font-mono">Kas Masuk Penyetoran Hak Kantin</p>
                            </div>

                            <div className="p-2 bg-white/5 rounded-xl border border-rose-500/20 space-y-0.5">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold text-rose-400 uppercase">[KREDIT]</span>
                                <span className="font-mono text-rose-300 font-bold">{formatRupiah(nominal)}</span>
                              </div>
                              <p className="font-bold text-slate-100 text-[11px]">Piutang Penjualan Dompet Siswa</p>
                              <p className="text-[10px] text-slate-400 font-mono">Kode: 10200 (Pelunasan Piutang)</p>
                            </div>
                          </div>

                          <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                            <span>Pos: <strong className="text-slate-200">{formData.fund_source_name || 'Kantin Sekolah'}</strong></span>
                            <span className="text-[10px] text-emerald-400 flex items-center gap-1">
                              <BadgeCheck className="w-3 h-3" />
                              Otomatis Buku Besar &amp; BKM
                            </span>
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
                        className="px-2 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-[10px] font-bold transition shadow-2xs flex items-center gap-1 cursor-pointer"
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
                                    onChange={() => {}}
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
                      className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      disabled={submitting || !formData.amount || parseFloat(formData.amount) <= 0}
                      className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition disabled:opacity-50 inline-flex items-center gap-2 cursor-pointer"
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

      {/* MODAL SETELAN AKUNTANSI SETOR HAK KANTIN */}
      {showConfigModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-slate-100 text-slate-700 border border-slate-200">
                  <Settings className="w-5 h-5 text-slate-700" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Konfigurasi Default Akuntansi Setor Hak Kantin</h3>
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
                  <p className="text-[11px] text-slate-500">Mencatat jurnal umum debet/kredit secara otomatis setiap ada penyetoran hak kantin</p>
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

              {/* Pos Dana & Kas Tunai Default */}
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
                    {cfgCashAccounts.map(acc => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name} ({acc.account_kind})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Akun Bank Default & Mutasi Rekening Koran */}
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
                    {cfgBankAccounts.map(acc => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name} ({acc.account_kind})
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
                        {stmt.transaction_date ? formatDate(stmt.transaction_date) : ''} • +{formatCurrency(stmt.amount)} • {stmt.description?.slice(0, 30)}...
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Pemetaan COA Debet & Kredit */}
              <div className="p-3.5 bg-emerald-50/60 rounded-xl border border-emerald-200/80 space-y-3">
                <span className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                  <Landmark className="w-4 h-4 text-emerald-700" />
                  <span>Pemetaan Akun Buku Besar (Double Entry)</span>
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      [DEBET] Akun Penerimaan Kas/Bank
                    </label>
                    <select
                      value={configForm.debit_coa_id}
                      onChange={(e) => setConfigForm(prev => ({ ...prev, debit_coa_id: e.target.value }))}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-hidden focus:border-emerald-500"
                    >
                      <option value="">-- Otomatis (10101 Kas Operasional Kantin) --</option>
                      {allCoas.map(coa => (
                        <option key={coa.id} value={coa.id}>
                          {coa.account_code} - {coa.account_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      [KREDIT] Akun Piutang Penjualan Dompet
                    </label>
                    <select
                      value={configForm.credit_coa_id}
                      onChange={(e) => setConfigForm(prev => ({ ...prev, credit_coa_id: e.target.value }))}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-hidden focus:border-emerald-500"
                    >
                      <option value="">-- Otomatis (10200 Piutang Penjualan Dompet) --</option>
                      {allCoas.map(coa => (
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
