import React, { useState, useEffect, useMemo, useRef } from 'react';
import api from '../../../shared/services/api';
import StatusPill from '../../../shared/components/StatusPill';
import FlatAlertBanner from '../../../shared/components/FlatAlertBanner';
import DatePickerField from '../../../shared/components/DatePickerField';
import SearchableSelect from '../../../shared/components/SearchableSelect';
import { formatCurrency, formatDate } from '../../../shared/utils/formatters';
import {
  BadgeDollarSign,
  Plus,
  Search,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ArrowUpRight,
  ArrowDownLeft,
  X,
  CreditCard,
  Wallet,
  Coins,
  Building2,
  RefreshCw,
  ArrowRight,
  Banknote,
  DollarSign,
  Info,
  Calendar,
  Layers,
  FileCheck2,
  TrendingUp,
  Printer,
  Sparkles,
  FileSpreadsheet,
  Trash2,
  BookOpen,
  Receipt,
  Scale,
  Landmark,
  ShieldCheck,
  CheckSquare,
  Filter
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
    if (num < 1000000000000) return `${sebut(Math.floor(num / 1000000000))} Miliar ${sebut(num % 1000000000)}`.trim();
    return `${sebut(Math.floor(num / 1000000000000))} Triliun ${sebut(num % 1000000000000)}`.trim();
  }

  return `${sebut(n)} Rupiah`;
}

// Opsi Kategori Pemasukan
const INCOME_CATEGORIES = [
  { value: 'modal_kantin', label: 'Setoran Modal / Tambahan Modal Kerja SBU' },
  { value: 'sewa_stand', label: 'Sewa Stand / Lapak Kantin' },
  { value: 'insentif_mitra', label: 'Insentif & Sponsor Mitra/Vendor' },
  { value: 'penjualan_limbah', label: 'Penjualan Barang Bekas / Limbah (Kardus, Jelantah)' },
  { value: 'jasa_catering', label: 'Pesanan Khusus / Jasa Catering Kantin' },
  { value: 'operasional', label: 'Pemasukan Operasional Lainnya' }
];

// Opsi Kategori Pengeluaran
const EXPENSE_CATEGORIES = [
  { value: 'gaji_upah', label: 'Gaji, Honor & Upah Pramusaji / Kasir Kantin' },
  { value: 'kemasan_plastik', label: 'Kemasan, Plastik, Mika, Cup & Sedotan' },
  { value: 'bahan_pelengkap', label: 'Bahan Pelengkap (Es Batu, Gas LPG, Air Galon)' },
  { value: 'listrik_air', label: 'Listrik & PDAM Kantin' },
  { value: 'kebersihan', label: 'Kebersihan, Sabun Cuci & Sanitasi' },
  { value: 'perawatan_alat', label: 'Perawatan & Servis Peralatan (Freezer, Showcase, Kompor)' },
  { value: 'sewa_tempat', label: 'Sewa Tempat / Beban Lokasi Kantin' },
  { value: 'transport_belanja', label: 'Transportasi & Logistik Belanja Pasar' },
  { value: 'operasional', label: 'Biaya Operasional Umum Lainnya' }
];

export default function PengeluaranOperasional() {
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'income' | 'expense' | 'accounting'
  const [expenses, setExpenses] = useState([]);
  const [summary, setSummary] = useState(null);
  const [ledgerData, setLedgerData] = useState(null);
  const [cashAccounts, setCashAccounts] = useState([]);
  const [coaIncomeList, setCoaIncomeList] = useState([]);
  const [coaExpenseList, setCoaExpenseList] = useState([]);
  const [defaultIncomeCoa, setDefaultIncomeCoa] = useState(null);
  const [defaultExpenseCoa, setDefaultExpenseCoa] = useState(null);
  const [bankStatements, setBankStatements] = useState([]);

  const [loading, setLoading] = useState(false);
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [filterCashAccount, setFilterCashAccount] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('expense'); // 'income' | 'expense'
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    type: 'expense',
    expense_name: '',
    category: 'kemasan_plastik',
    amount: '',
    expense_date: new Date().toISOString().slice(0, 10),
    cash_account_id: '',
    coa_account_id: '',
    bank_statement_id: '',
    note: '',
    sync_finance: true
  });

  // Kwitansi / Print Modal
  const [receiptData, setReceiptData] = useState(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);

  // Delete Confirmation Modal
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Load Data
  const fetchData = async () => {
    setLoading(true);
    try {
      const params = {
        type: activeTab === 'income' || activeTab === 'expense' ? activeTab : 'all',
        category: filterCategory !== 'all' ? filterCategory : undefined,
        cash_account_id: filterCashAccount !== 'all' ? filterCashAccount : undefined,
        date_from: filterDateFrom || undefined,
        date_to: filterDateTo || undefined,
        search: search.trim() || undefined
      };

      const [resList, resSummary] = await Promise.all([
        api.get('/kantin/operational-expenses', { params }),
        api.get('/kantin/operational-expenses/summary', {
          params: {
            date_from: filterDateFrom || undefined,
            date_to: filterDateTo || undefined
          }
        })
      ]);

      setExpenses(resList.data?.data || []);
      setSummary(resSummary.data?.data || null);
    } catch (err) {
      console.error('Error fetching operational cashflows:', err);
    } finally {
      setLoading(false);
    }
  };

  // Load Master Accounts (Cash Accounts & COA)
  const fetchMasterAccounts = async () => {
    try {
      const [resCash, resCoaInc, resCoaExp] = await Promise.all([
        api.get('/kantin/operational-expenses/cash-accounts'),
        api.get('/kantin/operational-expenses/coa-accounts', { params: { type: 'income' } }),
        api.get('/kantin/operational-expenses/coa-accounts', { params: { type: 'expense' } })
      ]);

      const caList = resCash.data?.data || [];
      setCashAccounts(caList);

      const incCoas = resCoaInc.data?.data?.accounts || [];
      setCoaIncomeList(incCoas);
      setDefaultIncomeCoa(resCoaInc.data?.data?.default_coa_id || null);

      const expCoas = resCoaExp.data?.data?.accounts || [];
      setCoaExpenseList(expCoas);
      setDefaultExpenseCoa(resCoaExp.data?.data?.default_coa_id || null);
    } catch (err) {
      console.warn('Gagal memuat akun kas / COA:', err.message);
    }
  };

  // Load Bank Statements untuk Rekonsiliasi Bank
  const fetchBankStatements = async (cashAccountId, type = 'income') => {
    if (!cashAccountId) {
      setBankStatements([]);
      return;
    }
    try {
      const res = await api.get('/kantin/operational-expenses/bank-statements', {
        params: { cash_account_id: cashAccountId, type }
      });
      setBankStatements(res.data?.data || []);
    } catch (err) {
      setBankStatements([]);
    }
  };

  // Load Accounting Ledger (Tab 4)
  const fetchAccountingLedger = async () => {
    setLedgerLoading(true);
    try {
      const params = {
        date_from: filterDateFrom || undefined,
        date_to: filterDateTo || undefined
      };
      const res = await api.get('/kantin/operational-expenses/accounting-ledger', { params });
      setLedgerData(res.data?.data || null);
    } catch (err) {
      console.error('Error fetching canteen accounting ledger:', err);
    } finally {
      setLedgerLoading(false);
    }
  };

  useEffect(() => {
    fetchMasterAccounts();
  }, []);

  useEffect(() => {
    if (activeTab === 'accounting') {
      fetchAccountingLedger();
    } else {
      fetchData();
    }
  }, [activeTab, filterCashAccount, filterCategory, filterDateFrom, filterDateTo]);

  // Open Create Modal
  const handleOpenCreateModal = (type = 'expense') => {
    setModalType(type);
    const defaultCa = cashAccounts.find(a => a.is_canteen_account) || cashAccounts[0];
    const defaultCoa = type === 'income' ? defaultIncomeCoa : defaultExpenseCoa;
    const defaultCat = type === 'income' ? 'sewa_stand' : 'kemasan_plastik';

    if (defaultCa) {
      fetchBankStatements(defaultCa.id, type);
    }

    setFormData({
      type,
      expense_name: '',
      category: defaultCat,
      amount: '',
      expense_date: new Date().toISOString().slice(0, 10),
      cash_account_id: defaultCa ? String(defaultCa.id) : '',
      coa_account_id: defaultCoa ? String(defaultCoa) : '',
      bank_statement_id: '',
      note: '',
      sync_finance: true
    });
    setError(null);
    setShowModal(true);
  };

  // Switch modal type inside modal
  const handleSwitchType = (newType) => {
    setModalType(newType);
    const defaultCoa = newType === 'income' ? defaultIncomeCoa : defaultExpenseCoa;
    const defaultCat = newType === 'income' ? 'sewa_stand' : 'kemasan_plastik';
    if (formData.cash_account_id) {
      fetchBankStatements(formData.cash_account_id, newType);
    }
    setFormData(prev => ({
      ...prev,
      type: newType,
      category: defaultCat,
      bank_statement_id: '',
      coa_account_id: defaultCoa ? String(defaultCoa) : prev.coa_account_id
    }));
  };

  // Submit Handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const payload = {
        type: modalType,
        expense_name: formData.expense_name,
        category: formData.category,
        amount: parseFloat(formData.amount),
        expense_date: formData.expense_date,
        cash_account_id: formData.cash_account_id ? Number(formData.cash_account_id) : null,
        coa_account_id: formData.coa_account_id ? Number(formData.coa_account_id) : null,
        bank_statement_id: formData.bank_statement_id ? Number(formData.bank_statement_id) : null,
        note: formData.note,
        sync_finance: formData.sync_finance
      };

      const res = await api.post('/kantin/operational-expenses', payload);
      setShowModal(false);
      fetchData();
      if (activeTab === 'accounting') fetchAccountingLedger();

      // Show receipt option
      if (res.data?.data) {
        setReceiptData(res.data.data);
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Gagal menyimpan transaksi operasional');
    } finally {
      setSubmitting(false);
    }
  };

  // Delete Handler
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/kantin/operational-expenses/${deleteTarget.id}`);
      setDeleteTarget(null);
      fetchData();
      if (activeTab === 'accounting') fetchAccountingLedger();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menghapus transaksi');
    } finally {
      setDeleting(false);
    }
  };

  // Selected cash account label
  const selectedCashAccountObj = useMemo(() => {
    return cashAccounts.find(a => String(a.id) === String(formData.cash_account_id));
  }, [cashAccounts, formData.cash_account_id]);

  // Selected COA label
  const selectedCoaObj = useMemo(() => {
    const list = modalType === 'income' ? coaIncomeList : coaExpenseList;
    return list.find(c => String(c.id) === String(formData.coa_account_id));
  }, [modalType, coaIncomeList, coaExpenseList, formData.coa_account_id]);

  // Filtered expenses list
  const filteredList = useMemo(() => {
    if (!search.trim()) return expenses;
    const term = search.toLowerCase();
    return expenses.filter(e =>
      e.expense_name?.toLowerCase().includes(term) ||
      e.receipt_number?.toLowerCase().includes(term) ||
      e.note?.toLowerCase().includes(term) ||
      e.cash_account_name?.toLowerCase().includes(term) ||
      e.coa_account_name?.toLowerCase().includes(term)
    );
  }, [expenses, search]);

  return (
    <div className="space-y-6">
      {/* Header Halaman */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-800 tracking-tight">Kas &amp; Operasional Kantin</h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
              SBU Mandiri
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Pencatatan pemasukan operasional (non-POS), beban operasional kantin, dan pembukuan akuntansi mandiri
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => handleOpenCreateModal('income')}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-xs transition"
          >
            <ArrowDownLeft className="w-4 h-4" />
            <span>Catat Pemasukan</span>
          </button>

          <button
            type="button"
            onClick={() => handleOpenCreateModal('expense')}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-xl shadow-xs transition"
          >
            <ArrowUpRight className="w-4 h-4" />
            <span>Catat Pengeluaran</span>
          </button>
        </div>
      </div>

      {/* 6 Intuitive Financial Condition Metric Cards */}
      {(() => {
        const fo = summary?.financial_overview || {};
        const isProfitPositive = (fo.net_canteen_profit || 0) >= 0;

        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Card 1: Total Kas & Uang Fisik Kantin */}
            <div className="bg-white rounded-2xl border border-emerald-100 p-4 shadow-xs relative overflow-hidden flex flex-col justify-between hover:shadow-md transition">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">
                    Uang Kas & Brankas Kantin
                  </span>
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <Wallet className="w-4 h-4" />
                  </div>
                </div>
                <h3 className="text-xl font-extrabold text-emerald-900 mt-2 font-mono">
                  {formatCurrency(fo.estimated_cash_vault || 0)}
                </h3>
              </div>
              <div className="mt-3 pt-2.5 border-t border-emerald-50 text-[11px] text-slate-500">
                <div className="flex items-center justify-between">
                  <span>Kas Fisik Kasir & Bank</span>
                  <span className="font-semibold text-emerald-700">Tersedia Riil</span>
                </div>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Setelah disisihkan untuk belanja operasional & bayar vendor
                </p>
              </div>
            </div>

            {/* Card 2: Total Penjualan & Omzet POS */}
            <div className="bg-white rounded-2xl border border-indigo-100 p-4 shadow-xs relative overflow-hidden flex flex-col justify-between hover:shadow-md transition">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-indigo-700 uppercase tracking-wider">
                    Total Penjualan / Omzet POS
                  </span>
                  <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <Coins className="w-4 h-4" />
                  </div>
                </div>
                <h3 className="text-xl font-extrabold text-indigo-900 mt-2 font-mono">
                  {formatCurrency(fo.total_gross_sales || 0)}
                </h3>
              </div>
              <div className="mt-3 pt-2.5 border-t border-indigo-50 text-[11px] space-y-0.5">
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Bagi Hasil Milik Kantin:</span>
                  <span className="font-bold text-indigo-700 font-mono">
                    {formatCurrency(fo.total_canteen_pos_share || 0)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-400">
                  <span>Tunai: {formatCurrency(fo.cash_sales_amount || 0)}</span>
                  <span>Dompet: {formatCurrency(fo.wallet_sales_amount || 0)}</span>
                </div>
              </div>
            </div>

            {/* Card 3: Beban & Biaya Operasional */}
            <div className="bg-white rounded-2xl border border-rose-100 p-4 shadow-xs relative overflow-hidden flex flex-col justify-between hover:shadow-md transition">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-rose-700 uppercase tracking-wider">
                    Beban Biaya Operasional
                  </span>
                  <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                    <ArrowUpRight className="w-4 h-4" />
                  </div>
                </div>
                <h3 className="text-xl font-extrabold text-rose-900 mt-2 font-mono">
                  {formatCurrency(fo.total_operating_expense || summary?.total_expense || 0)}
                </h3>
              </div>
              <div className="mt-3 pt-2.5 border-t border-rose-50 text-[11px] text-slate-500">
                <div className="flex items-center justify-between">
                  <span>{summary?.count_expense || 0} Pengeluaran Tercatat</span>
                  <span className="font-semibold text-rose-600">Biaya Rutin</span>
                </div>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Kemasan, cup plastik, es batu, gas LPG, listrik & kebersihan
                </p>
              </div>
            </div>

            {/* Card 4: Laba Bersih SBU Kantin */}
            <div className={`bg-white rounded-2xl border p-4 shadow-xs relative overflow-hidden flex flex-col justify-between hover:shadow-md transition ${
              isProfitPositive ? 'border-teal-200' : 'border-amber-200'
            }`}>
              <div>
                <div className="flex items-center justify-between">
                  <span className={`text-[11px] font-bold uppercase tracking-wider ${
                    isProfitPositive ? 'text-teal-700' : 'text-amber-700'
                  }`}>
                    Laba Bersih Unit Kantin
                  </span>
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                    isProfitPositive ? 'bg-teal-50 text-teal-600' : 'bg-amber-50 text-amber-600'
                  }`}>
                    <TrendingUp className="w-4 h-4" />
                  </div>
                </div>
                <div className="flex items-baseline gap-2 mt-2">
                  <h3 className={`text-xl font-extrabold font-mono ${
                    isProfitPositive ? 'text-teal-900' : 'text-amber-900'
                  }`}>
                    {formatCurrency(fo.net_canteen_profit || 0)}
                  </h3>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                    isProfitPositive ? 'bg-teal-100 text-teal-800' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {isProfitPositive ? 'Surplus' : 'Defisit'}
                  </span>
                </div>
              </div>
              <div className="mt-3 pt-2.5 border-t border-slate-100 text-[11px] text-slate-500">
                <p className="text-[10px] text-slate-500">
                  (Bagi Hasil POS + Pendapatan Lain) dikurangi Biaya Operasional
                </p>
              </div>
            </div>

            {/* Card 5: Hak Mitra / Vendor Titipan */}
            <div className="bg-white rounded-2xl border border-amber-100 p-4 shadow-xs relative overflow-hidden flex flex-col justify-between hover:shadow-md transition">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider">
                    Hak Mitra / Vendor Makanan
                  </span>
                  <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                    <Receipt className="w-4 h-4" />
                  </div>
                </div>
                <h3 className="text-xl font-extrabold text-amber-950 mt-2 font-mono">
                  {formatCurrency(fo.vendor_total_right || 0)}
                </h3>
              </div>
              <div className="mt-3 pt-2.5 border-t border-amber-50 text-[11px] space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Sudah Diserahkan:</span>
                  <span className="font-semibold text-emerald-700 font-mono">
                    {formatCurrency(fo.vendor_paid_amount || 0)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Belum Diserahkan (Titipan):</span>
                  <span className="font-bold text-amber-700 font-mono">
                    {formatCurrency(fo.vendor_unpaid_amount || 0)}
                  </span>
                </div>
              </div>
            </div>

            {/* Card 6: Pemasukan Non-POS & Modal */}
            <div className="bg-white rounded-2xl border border-sky-100 p-4 shadow-xs relative overflow-hidden flex flex-col justify-between hover:shadow-md transition">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-sky-800 uppercase tracking-wider">
                    Pemasukan Lain & Modal
                  </span>
                  <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
                    <BadgeDollarSign className="w-4 h-4" />
                  </div>
                </div>
                <h3 className="text-xl font-extrabold text-sky-950 mt-2 font-mono">
                  {formatCurrency((fo.total_non_pos_income || 0) + (fo.capital_injection || 0))}
                </h3>
              </div>
              <div className="mt-3 pt-2.5 border-t border-sky-50 text-[11px] space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Sewa Lapak & Limbah:</span>
                  <span className="font-semibold text-sky-700 font-mono">
                    {formatCurrency(fo.total_non_pos_income || 0)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Setoran Modal Usaha:</span>
                  <span className="font-semibold text-indigo-700 font-mono">
                    {formatCurrency(fo.capital_injection || 0)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Tab Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('all')}
          className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 ${
            activeTab === 'all'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Semua Arus Kas</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('income')}
          className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 ${
            activeTab === 'income'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <ArrowDownLeft className="w-3.5 h-3.5" />
          <span>Pemasukan Operasional</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('expense')}
          className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 ${
            activeTab === 'expense'
              ? 'bg-rose-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <ArrowUpRight className="w-3.5 h-3.5" />
          <span>Pengeluaran Operasional</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('accounting')}
          className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 ml-auto ${
            activeTab === 'accounting'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>Buku Kas &amp; Akuntansi Kantin</span>
        </button>
      </div>

      {/* FILTER BAR (Untuk Tab 1, 2, 3) */}
      {activeTab !== 'accounting' && (
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5 flex-1">
            {/* Search Input */}
            <div className="relative min-w-[220px] flex-1 max-w-xs">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari transaksi, BKM/BKK, akun..."
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:border-emerald-500"
              />
            </div>

            {/* Filter Akun Kas */}
            <select
              value={filterCashAccount}
              onChange={(e) => setFilterCashAccount(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-medium"
            >
              <option value="all">Semua Akun Kas</option>
              {cashAccounts.map(a => (
                <option key={a.id} value={a.id}>{a.display_label}</option>
              ))}
            </select>

            {/* Filter Tanggal */}
            <div className="flex items-center gap-1.5">
              <input
                type="date"
                value={filterDateFrom}
                onChange={(e) => setFilterDateFrom(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700"
                title="Dari Tanggal"
              />
              <span className="text-xs text-slate-400">s/d</span>
              <input
                type="date"
                value={filterDateTo}
                onChange={(e) => setFilterDateTo(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700"
                title="Sampai Tanggal"
              />
            </div>

            {(filterCashAccount !== 'all' || filterDateFrom || filterDateTo || search) && (
              <button
                type="button"
                onClick={() => {
                  setFilterCashAccount('all');
                  setFilterCategory('all');
                  setFilterDateFrom('');
                  setFilterDateTo('');
                  setSearch('');
                }}
                className="text-xs text-slate-500 hover:text-rose-600 font-medium px-2 py-1"
              >
                Reset Filter
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={fetchData}
            title="Refresh Data"
            className="p-2 text-slate-500 hover:text-emerald-700 hover:bg-slate-100 rounded-xl border border-slate-200 transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* TAB CONTENT 1, 2, 3: TRANSAKSI ARUS KAS */}
      {activeTab !== 'accounting' && (
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-2">
              <Loader2 className="w-6 h-6 text-emerald-600 animate-spin" />
              <p className="text-xs text-slate-400">Memuat transaksi kas operasional...</p>
            </div>
          ) : (
            <div className="table-container">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3">No. Bukti &amp; Tanggal</th>
                    <th className="px-4 py-3">Uraian / Transaksi</th>
                    <th className="px-4 py-3">Akun Kas Kantin</th>
                    <th className="px-4 py-3">Akun Akuntansi (COA)</th>
                    <th className="px-4 py-3 text-right">Pemasukan</th>
                    <th className="px-4 py-3 text-right">Pengeluaran</th>
                    <th className="px-4 py-3 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredList.map((item) => {
                    const isIncome = item.type === 'income';
                    return (
                      <tr key={item.id} className="hover:bg-slate-50/60 transition">
                        {/* No Bukti & Tanggal */}
                        <td className="px-4 py-3">
                          <div className="font-mono font-bold text-slate-800 text-[11px]">
                            {item.receipt_number || `-`}
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            {formatDate(item.expense_date)}
                          </div>
                        </td>

                        {/* Uraian */}
                        <td className="px-4 py-3">
                          <div className="font-bold text-slate-800 flex items-center gap-1.5">
                            {isIncome ? (
                              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
                            ) : (
                              <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0"></span>
                            )}
                            <span>{item.expense_name}</span>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${
                              isIncome
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}>
                              {item.category ? item.category.replace('_', ' ').toUpperCase() : 'OPERASIONAL'}
                            </span>
                            {item.note && (
                              <span className="text-[10px] text-slate-400 italic truncate max-w-xs">
                                {item.note}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Akun Kas */}
                        <td className="px-4 py-3 text-slate-700">
                          <div className="font-semibold">{item.cash_account_name || 'Kas Utama'}</div>
                          <div className="text-[10px] text-slate-400">
                            {item.bank_statement_id ? 'Terkoneksi Rekening Koran' : 'Pencatatan Kas Internal'}
                          </div>
                        </td>

                        {/* Akun Akuntansi (COA) */}
                        <td className="px-4 py-3 text-slate-600">
                          {item.coa_account_name ? (
                            <div>
                              <span className="font-mono font-bold text-[11px] text-slate-800">
                                [{item.coa_account_code}]
                              </span>{' '}
                              <span className="text-[11px]">{item.coa_account_name}</span>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">COA Default ({isIncome ? 'Pendapatan' : 'Beban'})</span>
                          )}
                        </td>

                        {/* Nominal Pemasukan */}
                        <td className="px-4 py-3 text-right font-mono font-bold text-emerald-700">
                          {isIncome ? formatCurrency(item.amount) : '-'}
                        </td>

                        {/* Nominal Pengeluaran */}
                        <td className="px-4 py-3 text-right font-mono font-bold text-rose-700">
                          {!isIncome ? formatCurrency(item.amount) : '-'}
                        </td>

                        {/* Aksi */}
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setReceiptData(item);
                                setShowReceiptModal(true);
                              }}
                              title="Cetak Bukti Kas (Kwitansi)"
                              className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => setDeleteTarget(item)}
                              title="Hapus Transaksi"
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {filteredList.length === 0 && (
                    <tr>
                      <td colSpan="7" className="py-12 text-center text-slate-400 italic">
                        Belum ada transaksi arus kas operasional kantin
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT 4: BUKU KAS & AKUNTANSI KANTIN */}
      {activeTab === 'accounting' && (
        <div className="space-y-6">
          {/* Banner Edukatif & Status Entitas Akuntansi SBU */}
          <div className="p-4 rounded-xl bg-indigo-900 text-white shadow-md relative overflow-hidden">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0 mt-0.5">
                <Scale className="w-5 h-5 text-indigo-200" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold tracking-wide">Pencatatan Akuntansi Mandiri Unit Usaha Kantin</h3>
                  <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-indigo-500/40 border border-indigo-400/40 uppercase">
                    Terintegrasi Realtime
                  </span>
                </div>
                <p className="text-xs text-indigo-200 leading-relaxed">
                  <strong>Apakah akuntansi kantin terpisah dari sekolah?</strong> Ya, di tingkat manajerial operasional, Kantin dikelola sebagai <em>Strategic Business Unit (SBU)</em> mandiri dengan Buku Kas, Rekonsiliasi Kas/Bank, dan Laporan Laba Rugi Operasional tersendiri. Namun di tingkat yayasan, seluruh mutasi kas dan pendapatan bagi hasil otomatis tersinkronisasi realtime ke Buku Besar Keuangan Pusat tanpa perlu input ulang.
                </p>
              </div>
            </div>
          </div>

          {/* Laporan Laba Rugi Operasional Kantin (Income Statement) */}
          <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-800">Laporan Laba Rugi Operasional Kantin</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Rekapitulasi Margin Bagi Hasil POS &amp; Pemasukan Non-POS terhadap Beban Operasional
                </p>
              </div>
              <div className="text-right">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Laba Bersih Operasional</span>
                <span className={`text-base font-extrabold font-mono ${
                  (ledgerData?.income_statement?.net_operating_income || 0) >= 0 ? 'text-emerald-700' : 'text-rose-700'
                }`}>
                  {formatCurrency(ledgerData?.income_statement?.net_operating_income || 0)}
                </span>
              </div>
            </div>

            {ledgerLoading ? (
              <div className="py-12 flex justify-center">
                <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Kolom Kiri: Pendapatan Operasional */}
                <div className="space-y-3 bg-emerald-50/40 rounded-xl p-4 border border-emerald-100">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-emerald-900 uppercase tracking-wide">1. Pendapatan Operasional</h4>
                    <span className="text-xs font-extrabold font-mono text-emerald-800">
                      {formatCurrency(ledgerData?.income_statement?.total_revenue || 0)}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {ledgerData?.income_statement?.revenues?.map((rev, idx) => (
                      <div key={idx} className="bg-white p-2.5 rounded-lg border border-emerald-100 flex items-center justify-between text-xs">
                        <div>
                          <div className="font-semibold text-slate-800">{rev.name}</div>
                          <div className="text-[10px] text-slate-400">{rev.notes}</div>
                        </div>
                        <div className="font-mono font-bold text-emerald-700 text-right">
                          {formatCurrency(rev.amount)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Kolom Kanan: Beban Operasional */}
                <div className="space-y-3 bg-rose-50/40 rounded-xl p-4 border border-rose-100">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-rose-900 uppercase tracking-wide">2. Beban &amp; Pengeluaran</h4>
                    <span className="text-xs font-extrabold font-mono text-rose-800">
                      {formatCurrency(ledgerData?.income_statement?.total_expense || 0)}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {ledgerData?.income_statement?.expenses?.length > 0 ? (
                      ledgerData.income_statement.expenses.map((exp, idx) => (
                        <div key={idx} className="bg-white p-2.5 rounded-lg border border-rose-100 flex items-center justify-between text-xs">
                          <div>
                            <div className="font-semibold text-slate-800">{exp.name}</div>
                            <div className="text-[10px] text-slate-400 uppercase tracking-wider">{exp.category}</div>
                          </div>
                          <div className="font-mono font-bold text-rose-700 text-right">
                            {formatCurrency(exp.amount)}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-3 text-center text-xs text-slate-400 italic bg-white rounded-lg border border-dashed border-slate-200">
                        Belum ada beban operasional tercatat pada periode ini
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Buku Kas & Mutasi Jurnal Kantin (General Ledger) */}
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Buku Kas &amp; Jurnal Mutasi Kantin (General Ledger)
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Pencatatan kronologis mutasi kas masuk (Debet) dan kas keluar (Kredit) operasional kantin
                </p>
              </div>
              <button
                type="button"
                onClick={fetchAccountingLedger}
                className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 text-xs font-semibold rounded-lg border border-slate-200 flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Muat Ulang</span>
              </button>
            </div>

            <div className="table-container">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3">Tanggal &amp; No. Bukti</th>
                    <th className="px-4 py-3">Uraian Transaksi</th>
                    <th className="px-4 py-3">Akun Kas / Bank</th>
                    <th className="px-4 py-3">Kode Akun (COA)</th>
                    <th className="px-4 py-3 text-right">Debet (Masuk)</th>
                    <th className="px-4 py-3 text-right">Kredit (Keluar)</th>
                    <th className="px-4 py-3 text-right">Saldo Kas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {ledgerData?.ledger_lines?.map((line) => (
                    <tr key={line.id} className="hover:bg-slate-50/60 transition">
                      <td className="px-4 py-3 font-sans">
                        <div className="font-bold text-slate-800 text-[11px] font-mono">{line.receipt_number}</div>
                        <div className="text-[10px] text-slate-400">{formatDate(line.date)}</div>
                      </td>
                      <td className="px-4 py-3 font-sans text-slate-800 font-medium">
                        {line.description}
                      </td>
                      <td className="px-4 py-3 font-sans text-slate-600">
                        {line.account_name}
                      </td>
                      <td className="px-4 py-3 font-sans">
                        <span className="font-bold text-slate-700 font-mono">[{line.coa_code}]</span>{' '}
                        <span className="text-[10px] text-slate-500">{line.coa_name}</span>
                      </td>
                      <td className="px-4 py-3 text-right text-emerald-700 font-bold">
                        {line.debit > 0 ? formatCurrency(line.debit) : '-'}
                      </td>
                      <td className="px-4 py-3 text-right text-rose-700 font-bold">
                        {line.credit > 0 ? formatCurrency(line.credit) : '-'}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-900 font-extrabold bg-slate-50/50">
                        {formatCurrency(line.balance)}
                      </td>
                    </tr>
                  ))}

                  {(!ledgerData?.ledger_lines || ledgerData.ledger_lines.length === 0) && (
                    <tr>
                      <td colSpan="7" className="py-12 text-center text-slate-400 font-sans italic">
                        Belum ada mutasi buku kas operasional tercatat
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL PENCATATAN TRANSAKSI */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-4 max-h-[90vh] overflow-y-auto custom-scrollbar">
            {/* Header Modal */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                  modalType === 'income' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                }`}>
                  {modalType === 'income' ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">
                    {modalType === 'income' ? 'Catat Pemasukan Operasional (BKM)' : 'Catat Pengeluaran Operasional (BKK)'}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {modalType === 'income' ? 'Penerimaan kas/bank selain penjualan kasir POS' : 'Beban kemasan, es batu, listrik, kebersihan, dll'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Toggle Tipe Transaksi */}
            <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-xl gap-1">
              <button
                type="button"
                onClick={() => handleSwitchType('income')}
                className={`py-2 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 ${
                  modalType === 'income'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <ArrowDownLeft className="w-3.5 h-3.5" />
                <span>Pemasukan (Masuk)</span>
              </button>

              <button
                type="button"
                onClick={() => handleSwitchType('expense')}
                className={`py-2 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 ${
                  modalType === 'expense'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <ArrowUpRight className="w-3.5 h-3.5" />
                <span>Pengeluaran (Keluar)</span>
              </button>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Uraian Transaksi */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nama / Uraian Transaksi <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.expense_name}
                  onChange={(e) => setFormData({ ...formData, expense_name: e.target.value })}
                  placeholder={
                    modalType === 'income'
                      ? 'Contoh: Sewa Lapak Kantin Stand 2 Bulan Oktober, Penjualan Kardus Bekas...'
                      : 'Contoh: Pembelian Plastik Mika & Sedotan, Beli Es Batu 5 Bal, Token Listrik...'
                  }
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-hidden focus:border-emerald-500"
                />
              </div>

              {/* Kategori & Tanggal */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Kategori</label>
                  <select
                    value={formData.category}
                    onChange={(e) => {
                      const newCat = e.target.value;
                      let suggestedCoa = formData.coa_account_id;
                      if (modalType === 'income') {
                        if (newCat === 'modal_kantin') {
                          const modalCoa = coaIncomeList.find(c => c.account_code === '30105' || (c.account_name || '').toLowerCase().includes('modal'));
                          if (modalCoa) suggestedCoa = String(modalCoa.id);
                        } else {
                          suggestedCoa = defaultIncomeCoa ? String(defaultIncomeCoa) : formData.coa_account_id;
                        }
                      } else {
                        if (newCat === 'gaji_upah') {
                          const gajiCoa = coaExpenseList.find(c => c.account_code === '730' || c.account_code === '73000' || (c.account_name || '').toLowerCase().includes('gaji') || (c.account_name || '').toLowerCase().includes('honor'));
                          if (gajiCoa) suggestedCoa = String(gajiCoa.id);
                        } else if (newCat === 'listrik_air') {
                          const listrikCoa = coaExpenseList.find(c => c.account_code === '711' || (c.account_name || '').toLowerCase().includes('listrik'));
                          if (listrikCoa) suggestedCoa = String(listrikCoa.id);
                        } else if (newCat === 'bahan_pelengkap') {
                          const bbmCoa = coaExpenseList.find(c => c.account_code === '715' || (c.account_name || '').toLowerCase().includes('bakar'));
                          if (bbmCoa) suggestedCoa = String(bbmCoa.id);
                        } else if (newCat === 'kebersihan') {
                          const cleanCoa = coaExpenseList.find(c => c.account_code === '720' || (c.account_name || '').toLowerCase().includes('kebersihan'));
                          if (cleanCoa) suggestedCoa = String(cleanCoa.id);
                        } else if (newCat === 'sewa_tempat') {
                          const rentCoa = coaExpenseList.find(c => c.account_code === '726' || (c.account_name || '').toLowerCase().includes('sewa'));
                          if (rentCoa) suggestedCoa = String(rentCoa.id);
                        } else if (newCat === 'perawatan_alat') {
                          const repairCoa = coaExpenseList.find(c => c.account_code === '760' || (c.account_name || '').toLowerCase().includes('pemeliharaan'));
                          if (repairCoa) suggestedCoa = String(repairCoa.id);
                        } else {
                          suggestedCoa = defaultExpenseCoa ? String(defaultExpenseCoa) : formData.coa_account_id;
                        }
                      }
                      setFormData({ ...formData, category: newCat, coa_account_id: suggestedCoa });
                    }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700"
                  >
                    {(modalType === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map(cat => (
                      <option key={cat.value} value={cat.value}>{cat.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Tanggal Transaksi</label>
                  <input
                    type="date"
                    required
                    value={formData.expense_date}
                    onChange={(e) => setFormData({ ...formData, expense_date: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700"
                  />
                </div>
              </div>

              {/* Nominal Transaksi */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nominal Transaksi (Rp) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">Rp</span>
                  <input
                    type="number"
                    min={1}
                    required
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    placeholder="0"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold font-mono text-slate-800 focus:outline-hidden focus:border-emerald-500"
                  />
                </div>
                {formData.amount && (
                  <p className="text-[11px] text-emerald-700 font-medium mt-1">
                    {terbilangRupiah(formData.amount)}
                  </p>
                )}
              </div>

              {/* Rekening Kas / Bank Kantin */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Jenis Kas / Rekening Bank Penampung <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={formData.cash_account_id}
                  onChange={(e) => {
                    const newCaId = e.target.value;
                    setFormData({ ...formData, cash_account_id: newCaId, bank_statement_id: '' });
                    if (newCaId) fetchBankStatements(newCaId, modalType);
                  }}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700"
                >
                  <option value="">-- Pilih Akun Kas Kantin --</option>
                  {cashAccounts.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.is_canteen_account ? '⭐ ' : ''}{a.display_label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Referensi Rekening Koran (Jika akun berupa Bank dan ada mutasi) */}
              {selectedCashAccountObj?.bank_account_number && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-700">
                      Referensi Rekening Koran (Bank Statement)
                    </label>
                    <span className="text-[10px] text-indigo-600 font-medium bg-indigo-50 px-1.5 py-0.5 rounded">
                      Rekonsiliasi Bank
                    </span>
                  </div>
                  <select
                    value={formData.bank_statement_id}
                    onChange={(e) => {
                      const stmtId = e.target.value;
                      const selectedStmt = bankStatements.find(s => String(s.id) === String(stmtId));
                      setFormData(prev => ({
                        ...prev,
                        bank_statement_id: stmtId,
                        amount: selectedStmt && !prev.amount ? String(selectedStmt.amount) : prev.amount,
                        expense_date: selectedStmt?.transaction_date ? String(selectedStmt.transaction_date).slice(0, 10) : prev.expense_date,
                        expense_name: selectedStmt && !prev.expense_name ? selectedStmt.description : prev.expense_name
                      }));
                    }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700"
                  >
                    <option value="">-- Tidak Terhubung / Input Manual --</option>
                    {bankStatements.map(stmt => (
                      <option key={stmt.id} value={stmt.id}>
                        {formatDate(stmt.transaction_date)} | {formatCurrency(stmt.amount)} - {stmt.description?.slice(0, 45)}
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-slate-400 mt-1">
                    {bankStatements.length > 0
                      ? `Ditemukan ${bankStatements.length} mutasi bank belum rekonsiliasi`
                      : 'Belum ada mutasi bank pending yang belum rekonsiliasi'}
                  </p>
                </div>
              )}

              {/* Pos Dana Terkait & Akun COA Akuntansi */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Pos Dana Terkait */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Pos Dana Terkait
                  </label>
                  <div className="px-3 py-2 bg-slate-100/80 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0"></span>
                    <span className="truncate">
                      {formData.category === 'modal_kantin'
                        ? 'Pos Ekuitas & Modal SBU'
                        : formData.category === 'gaji_upah'
                        ? 'Pos Beban Gaji & Upah SBU'
                        : formData.category === 'sewa_tempat'
                        ? 'Pos Beban Lokasi / Sewa'
                        : modalType === 'income'
                        ? 'Pos Pendapatan SBU Kantin'
                        : 'Pos Beban Operasional SBU'}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    {formData.category === 'modal_kantin'
                      ? 'Sumber: Setoran Modal Yayasan / Pemilik'
                      : formData.category === 'gaji_upah'
                      ? 'Alokasi: Biaya Tenaga Kerja Kantin'
                      : 'Sumber: Unit Usaha Mandiri Kantin'}
                  </span>
                </div>

                {/* Akun COA Akuntansi */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {modalType === 'income' ? (formData.category === 'modal_kantin' ? 'Akun COA Kredit (Modal / Ekuitas)' : 'Akun COA Kredit (Pendapatan)') : 'Akun COA Debet (Beban)'}
                  </label>
                  <select
                    value={formData.coa_account_id}
                    onChange={(e) => setFormData({ ...formData, coa_account_id: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700"
                  >
                    {(modalType === 'income' ? coaIncomeList : coaExpenseList).map(c => (
                      <option key={c.id} value={c.id}>{c.display_label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Catatan / Keterangan */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Catatan Tambahan (Opsional)</label>
                <input
                  type="text"
                  value={formData.note}
                  onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                  placeholder="Catatan kwitansi atau detail barang..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              {/* Pratinjau Jurnal Ganda Akuntansi */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Pratinjau Jurnal Akuntansi (Debet & Kredit)</span>
                  <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                    Double-Entry Realtime
                  </span>
                </div>
                <div className="text-[11px] font-mono space-y-1 pt-1">
                  {modalType === 'income' ? (
                    <>
                      <div className="flex justify-between text-slate-700">
                        <span>[DEBET] {selectedCashAccountObj?.name || 'Kas / Bank Kantin'}</span>
                        <span className="font-bold text-emerald-700">{formatCurrency(formData.amount || 0)}</span>
                      </div>
                      <div className="flex justify-between text-slate-500 pl-4">
                        <span>[KREDIT] {selectedCoaObj?.account_name || 'Pendapatan Unit Usaha Kantin'} [{selectedCoaObj?.account_code || '617'}]</span>
                        <span className="font-bold text-emerald-700">{formatCurrency(formData.amount || 0)}</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex justify-between text-slate-700">
                        <span>[DEBET] {selectedCoaObj?.account_name || 'Beban Operasional Kantin'} [{selectedCoaObj?.account_code || '79200'}]</span>
                        <span className="font-bold text-rose-700">{formatCurrency(formData.amount || 0)}</span>
                      </div>
                      <div className="flex justify-between text-slate-500 pl-4">
                        <span>[KREDIT] {selectedCashAccountObj?.name || 'Kas / Bank Kantin'}</span>
                        <span className="font-bold text-rose-700">{formatCurrency(formData.amount || 0)}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2.5">
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
                  className={`px-5 py-2 text-white text-xs font-bold rounded-xl shadow-xs transition disabled:opacity-50 flex items-center gap-1.5 ${
                    modalType === 'income' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
                  }`}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Simpan Transaksi</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL PRINT / KWITANSI BUKTI KAS */}
      {showReceiptModal && receiptData && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Printer className="w-4 h-4 text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-800">
                  {receiptData.type === 'income' ? 'Kwitansi Bukti Kas Masuk (BKM)' : 'Kwitansi Bukti Kas Keluar (BKK)'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowReceiptModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Printable Receipt Card */}
            <div id="print-receipt-area" className="border border-slate-200 rounded-xl p-5 bg-slate-50 space-y-4 text-xs">
              <div className="flex items-start justify-between border-b border-slate-200 pb-3">
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">YAYASAN ALDEPOS</h4>
                  <p className="text-[10px] text-slate-500">Unit Usaha Mandiri Kantin Smart</p>
                </div>
                <div className="text-right font-mono">
                  <div className="font-extrabold text-slate-800">{receiptData.receipt_number}</div>
                  <div className="text-[10px] text-slate-400">{formatDate(receiptData.expense_date)}</div>
                </div>
              </div>

              <div className="space-y-2 text-slate-700">
                <div className="flex justify-between py-1 border-b border-dashed border-slate-200">
                  <span className="text-slate-500">Jenis Transaksi:</span>
                  <span className="font-bold uppercase">
                    {receiptData.type === 'income' ? 'Pemasukan Kas Operasional' : 'Pengeluaran Beban Operasional'}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-dashed border-slate-200">
                  <span className="text-slate-500">Uraian / Keterangan:</span>
                  <span className="font-bold text-right max-w-xs">{receiptData.expense_name}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-dashed border-slate-200">
                  <span className="text-slate-500">Akun Kas Penampung:</span>
                  <span className="font-semibold">{receiptData.cash_account_name || 'Kas Utama Kantin'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-dashed border-slate-200">
                  <span className="text-slate-500">Nominal:</span>
                  <span className="font-bold font-mono text-sm text-slate-900">
                    {formatCurrency(receiptData.amount)}
                  </span>
                </div>
                <div className="py-1">
                  <span className="text-slate-500 block text-[10px]">Terbilang:</span>
                  <span className="font-semibold italic text-slate-800">{terbilangRupiah(receiptData.amount)}</span>
                </div>
              </div>

              <div className="pt-4 grid grid-cols-2 text-center text-[10px] text-slate-600 border-t border-slate-200">
                <div>
                  <p>Petugas / Kasir</p>
                  <div className="h-10"></div>
                  <p className="font-bold">( Pengelola Kantin )</p>
                </div>
                <div>
                  <p>Mengetahui / Penyetor</p>
                  <div className="h-10"></div>
                  <p className="font-bold">( ......................... )</p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowReceiptModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Tutup
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-xs"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Cetak Kwitansi</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL HAPUS TRANSAKSI */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800">Hapus Transaksi</h3>
                <p className="text-xs text-slate-500">Tindakan ini tidak dapat dibatalkan</p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl text-xs space-y-1">
              <p className="font-bold text-slate-800">{deleteTarget.expense_name}</p>
              <p className="font-mono font-bold text-rose-700">{formatCurrency(deleteTarget.amount)}</p>
              <p className="text-[10px] text-slate-400">{deleteTarget.receipt_number || formatDate(deleteTarget.expense_date)}</p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-xs disabled:opacity-50"
              >
                {deleting ? 'Menghapus...' : 'Ya, Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
