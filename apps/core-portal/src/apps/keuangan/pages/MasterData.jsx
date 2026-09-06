import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../../shared/store/AuthContext';
import api from '../../../shared/services/api';
import DatePickerField from '../../../shared/components/DatePickerField';
import SearchableSelect from '../../../shared/components/SearchableSelect';
import {
  FolderTree,
  Wallet,
  BookOpen,
  Receipt,
  Tags,
  Percent,
  Plus,
  Edit2,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertCircle,
  X,
  Search,
  History,
  Power,
  Info,
  Clock,
  ShieldCheck,
  Building2,
  School,
  FileText,
  RotateCw,
  Lock,
  Sliders,
  Layers,
  Calendar,
  Coins,
  Banknote,
  Landmark,
  TrendingUp,
  ArrowRightLeft,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  RefreshCw
} from 'lucide-react';

const COA_GROUPS = {
  harta: { label: 'Harta', normal: 'debit', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  piutang: { label: 'Piutang', normal: 'debit', bg: 'bg-amber-50 text-amber-700 border-amber-200' },
  inventaris: { label: 'Inventaris', normal: 'debit', bg: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
  utang: { label: 'Utang', normal: 'credit', bg: 'bg-rose-50 text-rose-700 border-rose-200' },
  modal: { label: 'Modal', normal: 'credit', bg: 'bg-purple-50 text-purple-700 border-purple-200' },
  pendapatan: { label: 'Pendapatan', normal: 'credit', bg: 'bg-teal-50 text-teal-700 border-teal-200' },
  biaya: { label: 'Biaya', normal: 'debit', bg: 'bg-pink-50 text-pink-700 border-pink-200' },
  // Backward-compat
  asset: { label: 'Harta', normal: 'debit', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  liability: { label: 'Utang', normal: 'credit', bg: 'bg-rose-50 text-rose-700 border-rose-200' },
  equity: { label: 'Modal', normal: 'credit', bg: 'bg-purple-50 text-purple-700 border-purple-200' },
  revenue: { label: 'Pendapatan', normal: 'credit', bg: 'bg-teal-50 text-teal-700 border-teal-200' },
  expense: { label: 'Biaya', normal: 'debit', bg: 'bg-pink-50 text-pink-700 border-pink-200' }
};

const RULE_SECTIONS = [
  {
    key: 'student_payments',
    title: '1. Penerimaan & Pelunasan Tagihan Siswa (Per Pos Piutang)',
    desc: 'Aturan akuntansi otomatis saat kasir menerima pembayaran tagihan siswa: mendebet Kas Bank Penerimaan dan mengkredit pos Piutang terkait sesuai pos tagihan.',
    codes: [
      'student_bill_payment',
      'bill_payment_spp',
      'bill_payment_pendaftaran',
      'bill_payment_penunjang_pembelajaran',
      'bill_payment_kegiatan',
      'bill_payment_sarpras',
      'bill_payment_seragam',
      'bill_payment_pemeliharaan_sarpras',
      'bill_payment_bangunan',
      'bill_payment_kegiatan_akhir_jenjang',
      'bill_payment_kelebihan_laundry',
      'bill_payment_buku',
      'bill_payment_tunggakan_tp_lalu'
    ]
  },
  {
    key: 'student_billings',
    title: '2. Penerbitan Tagihan Siswa (Non-Kas: Piutang vs Pendapatan)',
    desc: 'Aturan akuntansi non-kas saat tagihan diterbitkan/dibukukan ke siswa: mendebet pos Piutang dan mengkredit pos Pendapatan terkait.',
    codes: [
      'student_bill_issued',
      'bill_issued_spp',
      'bill_issued_pendaftaran',
      'bill_issued_penunjang_pembelajaran',
      'bill_issued_kegiatan',
      'bill_issued_sarpras',
      'bill_issued_seragam',
      'bill_issued_pemeliharaan_sarpras',
      'bill_issued_bangunan',
      'bill_issued_kegiatan_akhir_jenjang',
      'bill_issued_kelebihan_laundry',
      'bill_issued_buku',
      'bill_issued_tunggakan_tp_lalu'
    ]
  },
  {
    key: 'student_discounts',
    title: '3. Diskon & Penyesuaian Tagihan Siswa',
    desc: 'Aturan akuntansi diskon beasiswa, pemotongan tagihan, penghapusan piutang, dan pengembalian (refund).',
    codes: [
      'student_bill_discount',
      'student_bill_write_off',
      'student_bill_refund',
      'bill_discount_spp',
      'pay_discount_spp',
      'bill_discount_pendaftaran',
      'pay_discount_pendaftaran',
      'bill_discount_penunjang_pembelajaran',
      'pay_discount_penunjang_pembelajaran',
      'bill_discount_kegiatan',
      'pay_discount_kegiatan',
      'bill_discount_sarpras',
      'pay_discount_sarpras',
      'bill_discount_seragam',
      'pay_discount_seragam',
      'bill_discount_pemeliharaan_sarpras',
      'pay_discount_pemeliharaan_sarpras',
      'bill_discount_bangunan',
      'pay_discount_bangunan',
      'bill_discount_kegiatan_akhir_jenjang',
      'pay_discount_kegiatan_akhir_jenjang',
      'bill_discount_kelebihan_laundry',
      'pay_discount_kelebihan_laundry'
    ]
  },
  {
    key: 'other_receipts',
    title: '4. Penerimaan Kas Lain & RAPBS',
    desc: 'Aturan akuntansi donasi, infaq, sewa fasilitas, unit usaha, dan pendapatan non-siswa.',
    codes: ['other_income_default']
  },
  {
    key: 'expenses',
    title: '5. Pengeluaran Operasional & Belanja',
    desc: 'Aturan pembebanan anggaran operasional, belanja barang/jasa, dan kegiatan lembaga (RAPBS).',
    codes: ['expense_default']
  },
  {
    key: 'payroll_savings',
    title: '6. Payroll & Tabungan Siswa',
    desc: 'Aturan akuntansi pencairan gaji/honor GTK serta mutasi setor dan tarik tabungan santri.',
    codes: ['payroll_disbursement', 'savings_deposit', 'savings_withdrawal']
  },
  {
    key: 'internal_cash',
    title: '7. Kas Internal, Saldo Awal & Jurnal',
    desc: 'Aturan mutasi transfer antar jenis kas lembaga, saldo awal cutover, dan jurnal penyesuaian manual.',
    codes: ['opening_balance_entry', 'internal_cash_transfer', 'manual_journal_entry']
  },
  {
    key: 'year_end_closing',
    title: '8. Tutup Buku Tahunan',
    desc: 'Aturan penihilan pendapatan/biaya dan pemindahan surplus/defisit tahunan ke saldo modal ditahan.',
    codes: ['fiscal_year_closing_revenue', 'fiscal_year_closing_expense', 'fiscal_year_closing_net']
  }
];

export default function MasterData() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('cash_accounts'); // cash_accounts, coa, transaction_rules, fee_types, categories, fee_adjustments
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [ruleTypeFilter, setRuleTypeFilter] = useState(''); // '' | 'penambahan_kas' | 'pengurangan_kas' | 'non_kas' | 'pemindahan_kas'

  // Data States
  const [cashAccounts, setCashAccounts] = useState([]);
  const [coaList, setCoaList] = useState([]);
  const [transactionRules, setTransactionRules] = useState([]);
  const [feeTypes, setFeeTypes] = useState([]);
  const [categories, setCategories] = useState([]);
  const [feeAdjustments, setFeeAdjustments] = useState([]);

  // Modal State Tambah / Edit
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // 'create' | 'edit'
  const [selectedItem, setSelectedItem] = useState(null);
  const [formData, setFormData] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // Modal State Riwayat Audit Trail
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [historyItem, setHistoryItem] = useState(null);
  const [historyLogs, setHistoryLogs] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Modal State Override Struktural Aturan Sistem
  const [overrideModalOpen, setOverrideModalOpen] = useState(false);
  const [selectedRuleForOverride, setSelectedRuleForOverride] = useState(null);
  const [overrideFormData, setOverrideFormData] = useState({
    transaction_label: '',
    debit_account_id: '',
    credit_account_id: '',
    default_cash_account_id: '',
    is_dynamic_account: false,
    reason: ''
  });

  // Modal State Pemindahan Kas (Mutasi Internal Antar Dompet/Rekening)
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [transferHistoryOpen, setTransferHistoryOpen] = useState(false);
  const [transferFormData, setTransferFormData] = useState({
    from_cash_account_id: '',
    to_cash_account_id: '',
    amount: '',
    transfer_date: new Date().toISOString().slice(0, 10),
    reference_number: '',
    reason: ''
  });
  const [transferSubmitting, setTransferSubmitting] = useState(false);
  const [transfersList, setTransfersList] = useState([]);
  const [transfersLoading, setTransfersLoading] = useState(false);

  const { activeSchoolUnit } = useAuth();
  const isYayasan = !activeSchoolUnit || activeSchoolUnit.id === 'all' || activeSchoolUnit.is_foundation || activeSchoolUnit.id === null;
  const isSuperAdmin = user?.role === 'super_admin' || user?.role === 'admin_yayasan' || user?.is_super_admin || isYayasan;

  const fetchTabData = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      if (activeTab === 'cash_accounts') {
        const [cashRes, coaRes] = await Promise.allSettled([
          api.get('/keuangan/cash-accounts'),
          api.get('/keuangan/chart-of-accounts')
        ]);
        if (cashRes.status === 'fulfilled') setCashAccounts(cashRes.value.data?.data || []);
        if (coaRes.status === 'fulfilled') setCoaList(coaRes.value.data?.data || []);
      } else if (activeTab === 'coa') {
        const res = await api.get('/keuangan/chart-of-accounts');
        setCoaList(res.data?.data || []);
      } else if (activeTab === 'transaction_rules') {
        const results = await Promise.allSettled([
          api.get('/keuangan/transaction-account-mappings'),
          api.get('/keuangan/chart-of-accounts'),
          api.get('/keuangan/cash-accounts'),
          api.get('/keuangan/fee-types'),
          api.get('/keuangan/transaction-categories')
        ]);
        if (results[0].status === 'fulfilled') setTransactionRules(results[0].value.data?.data || []);
        if (results[1].status === 'fulfilled') setCoaList(results[1].value.data?.data || []);
        if (results[2].status === 'fulfilled') setCashAccounts(results[2].value.data?.data || []);
        if (results[3].status === 'fulfilled') setFeeTypes(results[3].value.data?.data || []);
        if (results[4].status === 'fulfilled') setCategories(results[4].value.data?.data || []);
      } else if (activeTab === 'fee_types') {
        const [feeRes, coaRes, ruleRes] = await Promise.allSettled([
          api.get('/keuangan/fee-types'),
          api.get('/keuangan/chart-of-accounts'),
          api.get('/keuangan/transaction-account-mappings')
        ]);
        if (feeRes.status === 'fulfilled') setFeeTypes(feeRes.value.data?.data || []);
        if (coaRes.status === 'fulfilled') setCoaList(coaRes.value.data?.data || []);
        if (ruleRes.status === 'fulfilled') setTransactionRules(ruleRes.value.data?.data || []);
      } else if (activeTab === 'categories') {
        const res = await api.get('/keuangan/transaction-categories');
        setCategories(res.data?.data || []);
      } else if (activeTab === 'fee_adjustments') {
        const res = await api.get('/keuangan/student-fee-adjustments');
        setFeeAdjustments(res.data?.data || []);
      }
    } catch (err) {
      console.error('Error loading master data:', err);
      setErrorMsg(err.response?.data?.message || 'Gagal memuat data master');
    } finally {
      setLoading(false);
    }
  };

  // Load Data saat Tab Berubah
  useEffect(() => {
    fetchTabData();
  }, [activeTab, activeSchoolUnit]);

  // Buka Modal Tambah Data Baru
  const openCreateModal = () => {
    setModalMode('create');
    setSelectedItem(null);
    if (activeTab === 'cash_accounts') {
      setFormData({
        name: '',
        account_kind: 'cash',
        bank_name: '',
        bank_account_number: '',
        account_id: '',
        opening_balance: 0,
        opening_date: new Date().toISOString().slice(0, 10),
        is_active: true,
        edit_reason: ''
      });
    } else if (activeTab === 'coa') {
      setFormData({
        account_code: '',
        account_name: '',
        account_group: 'harta',
        normal_balance: 'debit',
        is_active: true,
        edit_reason: ''
      });
    } else if (activeTab === 'transaction_rules') {
      setFormData({
        transaction_code: '',
        transaction_label: '',
        transaction_type: 'non_kas',
        debit_account_id: coaList[0]?.id || 1,
        credit_account_id: coaList[1]?.id || 2,
        default_cash_account_id: '',
        related_fee_type_id: '',
        related_transaction_category_id: '',
        is_active: true,
        edit_reason: ''
      });
    } else if (activeTab === 'fee_types') {
      setFormData({
        name: '',
        billing_pattern: 'monthly',
        description: '',
        related_revenue_account_id: '',
        billing_account_mapping_id: '',
        billing_discount_account_mapping_id: '',
        payment_account_mapping_id: '',
        payment_discount_account_mapping_id: '',
        is_active: true,
        edit_reason: ''
      });
    } else if (activeTab === 'categories') {
      setFormData({
        name: '',
        category_kind: 'expense',
        edit_reason: ''
      });
    } else if (activeTab === 'fee_adjustments') {
      setFormData({
        student_id: 1,
        fee_type_id: feeTypes[0]?.id || 1,
        adjustment_kind: 'waiver',
        waiver_type: 'Beasiswa Prestasi',
        waiver_percentage: 50,
        override_amount: '',
        reason: '',
        edit_reason: ''
      });
    }
    setModalOpen(true);
  };

  // Buka Modal Edit Data (Wajib Catatan Perubahan)
  const openEditModal = (item) => {
    setModalMode('edit');
    setSelectedItem(item);
    setFormData({
      ...item,
      transaction_type: item.transaction_type || 'non_kas',
      opening_balance: item.opening_balance ?? 0,
      opening_date: item.opening_date || new Date().toISOString().slice(0, 10),
      default_cash_account_id: item.default_cash_account_id || '',
      related_fee_type_id: item.related_fee_type_id || '',
      related_transaction_category_id: item.related_transaction_category_id || '',
      related_revenue_account_id: item.related_revenue_account_id || '',
      billing_account_mapping_id: item.billing_account_mapping_id || '',
      billing_discount_account_mapping_id: item.billing_discount_account_mapping_id || '',
      payment_account_mapping_id: item.payment_account_mapping_id || '',
      payment_discount_account_mapping_id: item.payment_discount_account_mapping_id || '',
      description: item.description || '',
      edit_reason: '' // reset catatan keterangan perubahan agar selalu diisi saat edit
    });
    setModalOpen(true);
  };

  // Toggle Pengaktifan / Penonaktifan Data Master
  const handleToggleStatus = async (item, entityType) => {
    const nextStatus = !item.is_active;
    const actionText = nextStatus ? 'mengaktifkan' : 'menonaktifkan';
    if (!window.confirm(`Konfirmasi: Apakah Anda yakin ingin ${actionText} "${item.name || item.account_name || item.account_code}"? Data keuangan tidak dihapus untuk menjaga integritas pembukuan.`)) {
      return;
    }

    try {
      if (entityType === 'cash_account') {
        await api.patch(`/keuangan/cash-accounts/${item.id}/status`, { is_active: nextStatus });
      } else if (entityType === 'coa') {
        await api.patch(`/keuangan/chart-of-accounts/${item.id}/status`, { is_active: nextStatus });
      } else if (entityType === 'transaction_rule') {
        await api.patch(`/keuangan/transaction-account-mappings/${item.id}/status`, { is_active: nextStatus });
      } else if (entityType === 'fee_type') {
        await api.patch(`/keuangan/fee-types/${item.id}/status`, { is_active: nextStatus });
      }
      fetchTabData();
    } catch (err) {
      alert(err.response?.data?.message || `Gagal ${actionText} data`);
    }
  };

  // Buka Modal Riwayat Perubahan (Audit Trail)
  const openHistoryModal = async (item, entityType, titleLabel) => {
    setHistoryItem({ ...item, entityType, titleLabel });
    setHistoryModalOpen(true);
    setHistoryLoading(true);
    setHistoryLogs([]);

    try {
      const res = await api.get(`/keuangan/finance-audit-logs`, {
        params: {
          entity_type: entityType,
          entity_id: item.id
        }
      });
      setHistoryLogs(res.data?.data || []);
    } catch (err) {
      console.warn('Gagal memuat audit logs:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  // Submit Form Tambah / Edit
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (modalMode === 'edit' && (!formData.edit_reason || !formData.edit_reason.trim())) {
      alert('Mohon isi Catatan / Keterangan Perubahan sebagai bentuk transparansi dan audit keuangan.');
      return;
    }

    setSubmitting(true);
    try {
      let endpoint = '';
      if (activeTab === 'cash_accounts') endpoint = '/keuangan/cash-accounts';
      else if (activeTab === 'coa') endpoint = '/keuangan/chart-of-accounts';
      else if (activeTab === 'transaction_rules') endpoint = '/keuangan/transaction-account-mappings';
      else if (activeTab === 'fee_types') endpoint = '/keuangan/fee-types';
      else if (activeTab === 'categories') endpoint = '/keuangan/transaction-categories';
      else if (activeTab === 'fee_adjustments') endpoint = '/keuangan/student-fee-adjustments';

      const payload = {
        ...formData,
        default_cash_account_id: formData.default_cash_account_id ? Number(formData.default_cash_account_id) : null,
        related_fee_type_id: formData.related_fee_type_id ? Number(formData.related_fee_type_id) : null,
        related_transaction_category_id: formData.related_transaction_category_id ? Number(formData.related_transaction_category_id) : null,
        related_revenue_account_id: formData.related_revenue_account_id ? Number(formData.related_revenue_account_id) : null,
        billing_account_mapping_id: formData.billing_account_mapping_id ? Number(formData.billing_account_mapping_id) : null,
        billing_discount_account_mapping_id: formData.billing_discount_account_mapping_id ? Number(formData.billing_discount_account_mapping_id) : null,
        payment_account_mapping_id: formData.payment_account_mapping_id ? Number(formData.payment_account_mapping_id) : null,
        payment_discount_account_mapping_id: formData.payment_discount_account_mapping_id ? Number(formData.payment_discount_account_mapping_id) : null
      };

      if (modalMode === 'create') {
        await api.post(endpoint, payload);
      } else {
        await api.put(`${endpoint}/${selectedItem.id}`, payload);
      }
      setModalOpen(false);
      fetchTabData();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menyimpan perubahan data');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenOverrideModal = (rule) => {
    setSelectedRuleForOverride(rule);
    setOverrideFormData({
      transaction_label: rule.transaction_label || '',
      debit_account_id: rule.debit_account_id || '',
      credit_account_id: rule.credit_account_id || '',
      default_cash_account_id: rule.default_cash_account_id || '',
      is_dynamic_account: Boolean(rule.is_dynamic_account),
      reason: ''
    });
    setOverrideModalOpen(true);
  };

  const handleOverrideSubmit = async (e) => {
    e.preventDefault();
    if (!overrideFormData.reason || !overrideFormData.reason.trim()) {
      alert('Alasan override struktural aturan sistem wajib diisi untuk catatan audit trail.');
      return;
    }

    setSubmitting(true);
    try {
      await api.patch(`/keuangan/transaction-account-mappings/${selectedRuleForOverride.id}/system-override`, {
        ...overrideFormData,
        debit_account_id: overrideFormData.debit_account_id ? Number(overrideFormData.debit_account_id) : null,
        credit_account_id: overrideFormData.credit_account_id ? Number(overrideFormData.credit_account_id) : null,
        default_cash_account_id: overrideFormData.default_cash_account_id ? Number(overrideFormData.default_cash_account_id) : null
      });
      setOverrideModalOpen(false);
      fetchTabData();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menerapkan override aturan transaksi sistem');
    } finally {
      setSubmitting(false);
    }
  };

  const handleApproveAdjustment = async (id) => {
    try {
      await api.patch(`/keuangan/student-fee-adjustments/${id}/approve`);
      fetchTabData();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menyetujui beasiswa');
    }
  };

  // Handlers Pemindahan Kas
  const openTransferModal = (fromAcc = null) => {
    const defaultFrom = fromAcc ? fromAcc.id : (cashAccounts[0]?.id || '');
    const defaultTo = fromAcc ? (cashAccounts.find(c => c.id !== fromAcc.id)?.id || '') : (cashAccounts[1]?.id || '');
    setTransferFormData({
      from_cash_account_id: defaultFrom,
      to_cash_account_id: defaultTo,
      amount: '',
      transfer_date: new Date().toISOString().slice(0, 10),
      reference_number: '',
      reason: ''
    });
    setTransferModalOpen(true);
  };

  const handleTransferSubmit = async (e) => {
    e.preventDefault();
    if (!transferFormData.from_cash_account_id || !transferFormData.to_cash_account_id) {
      alert('Mohon pilih kas asal dan kas tujuan pemindahan.');
      return;
    }
    if (String(transferFormData.from_cash_account_id) === String(transferFormData.to_cash_account_id)) {
      alert('Kas asal dan kas tujuan tidak boleh sama.');
      return;
    }
    const amt = parseFloat(transferFormData.amount);
    if (isNaN(amt) || amt <= 0) {
      alert('Nominal pemindahan kas harus lebih besar dari Rp 0.');
      return;
    }

    setTransferSubmitting(true);
    try {
      const res = await api.post('/keuangan/cash-transfers', {
        ...transferFormData,
        amount: amt
      });
      alert(res.data?.message || 'Pemindahan kas berhasil dicatat.');
      setTransferModalOpen(false);
      fetchTabData();
    } catch (err) {
      console.error('Error submitting cash transfer:', err);
      alert(err.response?.data?.message || 'Gagal memproses pemindahan kas');
    } finally {
      setTransferSubmitting(false);
    }
  };

  const openTransferHistoryModal = async () => {
    setTransferHistoryOpen(true);
    setTransfersLoading(true);
    try {
      const res = await api.get('/keuangan/cash-transfers?limit=50');
      setTransfersList(res.data?.data || []);
    } catch (err) {
      console.error('Error fetching cash transfers history:', err);
    } finally {
      setTransfersLoading(false);
    }
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val || 0);
  };

  const formatDateTime = (dateVal) => {
    if (!dateVal) return '-';
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return String(dateVal);
    return d.toLocaleString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  // Filter Search
  const filterList = (list, keys) => {
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase().trim();
    return list.filter((item) =>
      keys.some((k) => item[k] && String(item[k]).toLowerCase().includes(q))
    );
  };

  // COA Pengelolaan Umum (tanpa akun khusus SMP / SMA)
  const cleanCoaList = useMemo(() => {
    return coaList.filter((a) => {
      const name = (a.account_name || '').toUpperCase();
      return !name.includes('SMP') && !name.includes('SMA');
    });
  }, [coaList]);

  const filteredCashAccounts = filterList(cashAccounts, ['name', 'account_kind', 'bank_name', 'bank_account_number', 'account_code', 'account_name']);
  const filteredCoa = filterList(cleanCoaList, ['account_code', 'account_name', 'account_group']);
  const filteredRules = useMemo(() => {
    let list = transactionRules;
    if (ruleTypeFilter) {
      list = list.filter((r) => r.transaction_type === ruleTypeFilter);
    }
    return filterList(list, ['transaction_code', 'transaction_label', 'debit_account_code', 'debit_account_name', 'credit_account_code', 'credit_account_name', 'default_cash_account_name', 'related_fee_type_name', 'related_category_name']);
  }, [transactionRules, ruleTypeFilter, searchQuery]);
  const filteredFeeTypes = filterList(feeTypes, ['name', 'billing_pattern', 'description', 'revenue_account_name', 'revenue_account_code', 'billing_mapping_label', 'billing_mapping_code', 'payment_mapping_label', 'payment_mapping_code']);
  const filteredCategories = filterList(categories, ['name', 'category_kind', 'related_account_name']);
  const filteredAdjustments = filterList(feeAdjustments, ['student_name', 'fee_type_name', 'waiver_type']);

  const renderTypeBadge = (type) => {
    switch (type) {
      case 'penambahan_kas':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <ArrowDownLeft className="w-3 h-3 text-emerald-600" /> Penambahan Kas
          </span>
        );
      case 'pengurangan_kas':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
            <ArrowUpRight className="w-3 h-3 text-rose-600" /> Pengurangan Kas
          </span>
        );
      case 'pemindahan_kas':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
            <ArrowLeftRight className="w-3 h-3 text-purple-600" /> Pemindahan Kas
          </span>
        );
      case 'non_kas':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
            <RefreshCw className="w-3 h-3 text-blue-600" /> Non-Kas
          </span>
        );
    }
  };

  const totalOpeningBalance = useMemo(() => {
    return cashAccounts.reduce((sum, item) => sum + (parseFloat(item.opening_balance) || 0), 0);
  }, [cashAccounts]);

  const totalCurrentBalance = useMemo(() => {
    return cashAccounts.reduce((sum, item) => sum + (parseFloat(item.current_balance !== undefined ? item.current_balance : item.opening_balance) || 0), 0);
  }, [cashAccounts]);

  const bankAccountsCount = useMemo(() => {
    return cashAccounts.filter((item) => item.account_kind === 'bank').length;
  }, [cashAccounts]);

  const cashPhysicalCount = useMemo(() => {
    return cashAccounts.filter((item) => item.account_kind === 'cash').length;
  }, [cashAccounts]);

  return (
    <div className="space-y-6">
      {/* Header & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold text-slate-800 tracking-tight">Data Master Keuangan</h1>
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                isYayasan
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                  : 'bg-indigo-100 text-indigo-800 border border-indigo-200'
              }`}
            >
              {isYayasan ? <Building2 className="w-3 h-3 text-emerald-600" /> : <School className="w-3 h-3 text-indigo-600" />}
              <span>{isYayasan ? 'Konteks: Pusat Yayasan (Gabungan)' : `Konteks: ${activeSchoolUnit?.name || 'Satuan'}`}</span>
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Pengaturan dompet kas, bagan akun (COA), jenis tagihan, kategori transaksi &amp; beasiswa dengan perlindungan integritas audit
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {activeTab === 'cash_accounts' && (
            <>
              <button
                type="button"
                onClick={() => openTransferModal()}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-xs transition"
                title="Pindahkan saldo antar dompet kas fisik / rekening bank"
              >
                <ArrowRightLeft className="w-4 h-4" />
                <span>Pemindahan Kas</span>
              </button>
              <button
                type="button"
                onClick={openTransferHistoryModal}
                className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl shadow-2xs transition"
                title="Lihat riwayat pemindahan saldo kas"
              >
                <History className="w-3.5 h-3.5 text-indigo-600" />
                <span>Riwayat Transfer</span>
              </button>
            </>
          )}
          <button
            type="button"
            onClick={fetchTabData}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl shadow-2xs transition disabled:opacity-60"
            title="Muat ulang data master dari database"
          >
            <RotateCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-emerald-600' : 'text-slate-500'}`} />
            <span>{loading ? 'Memuat...' : 'Muat Ulang'}</span>
          </button>
          <button
            type="button"
            onClick={openCreateModal}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-xs transition self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Data Baru</span>
          </button>
        </div>
      </div>

      {/* Info Notice: Integritas Keuangan & Kebijakan Non-Delete */}
      <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-4 flex items-start gap-3 text-xs text-emerald-900 shadow-2xs">
        <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <div className="font-bold text-emerald-950 flex items-center gap-2">
            <span>Integritas Audit &amp; Transparansi Keuangan Terlindungi</span>
          </div>
          <p className="text-emerald-800 leading-relaxed text-[11px]">
            Sesuai standar pembukuan dan akuntansi, tidak ada opsi penghapusan permanen (Delete) pada data master &amp; referensi keuangan. Pengelolaan status dilakukan melalui mekanisme <strong>Pengaktifan &amp; Penonaktifan</strong>, dan setiap pengeditan data wajib mencantumkan catatan keterangan perubahan yang tercatat pada riwayat audit.
          </p>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-slate-200 gap-2 overflow-x-auto">
        {[
          {
            id: 'cash_accounts',
            label: 'Jenis Kas',
            icon: Wallet,
            badge: 'Dompet & Rekening'
          },
          {
            id: 'coa',
            label: 'Bagan Akun (COA)',
            icon: BookOpen,
            badge: 'Akuntansi'
          },
          {
            id: 'transaction_rules',
            label: 'Aturan Transaksi',
            icon: ShieldCheck,
            badge: 'Mapping Jurnal'
          },
          {
            id: 'fee_types',
            label: 'Jenis Biaya Tagihan',
            icon: Receipt,
            badge: 'Tarif & SPP'
          },
          {
            id: 'categories',
            label: 'Kategori Transaksi',
            icon: Tags,
            badge: 'Penerimaan/Belanja'
          },
          {
            id: 'fee_adjustments',
            label: 'Keringanan & Beasiswa',
            icon: Percent,
            badge: 'Diskon'
          },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition whitespace-nowrap ${
                isActive
                  ? 'border-emerald-600 text-emerald-700 bg-emerald-50/60 rounded-t-xl shadow-2xs'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Context Explanation Banner & Summary Cards */}
      {activeTab === 'cash_accounts' && (
        <div className="space-y-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-emerald-600 to-teal-700 p-4 rounded-2xl text-white shadow-xs flex items-center justify-between">
              <div>
                <p className="text-[11px] font-medium text-emerald-100 uppercase tracking-wider">Total Saldo Awal</p>
                <h3 className="text-lg font-black mt-0.5 font-mono">{formatCurrency(totalOpeningBalance)}</h3>
                <p className="text-[10px] text-emerald-200 mt-1">Akumulasi saldo awal cutover</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center backdrop-blur-xs">
                <Wallet className="w-5 h-5 text-white" />
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Total Saldo Berjalan</p>
                <h3 className="text-lg font-black text-slate-800 mt-0.5 font-mono">{formatCurrency(totalCurrentBalance)}</h3>
                <p className="text-[10px] text-slate-400 mt-1">Kas riil saat ini (Awal + Masuk - Keluar)</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center">
                <Coins className="w-5 h-5 text-indigo-600" />
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Rekening Bank</p>
                <h3 className="text-lg font-bold text-slate-800 mt-0.5">{bankAccountsCount} <span className="text-xs font-normal text-slate-400">Rekening</span></h3>
                <p className="text-[10px] text-slate-400 mt-1">BSI &amp; BNI terdaftar</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center">
                <Building2 className="w-5 h-5 text-blue-600" />
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Kas Tunai Fisik</p>
                <h3 className="text-lg font-bold text-slate-800 mt-0.5">{cashPhysicalCount} <span className="text-xs font-normal text-slate-400">Dompet</span></h3>
                <p className="text-[10px] text-slate-400 mt-1">Brankas / Bendahara</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center">
                <Banknote className="w-5 h-5 text-amber-600" />
              </div>
            </div>
          </div>

          <div className="bg-slate-100/80 border border-slate-200 rounded-xl px-4 py-2.5 flex items-center justify-between text-xs text-slate-600">
            <div className="flex items-center gap-2">
              <Wallet className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                <strong>Jenis Kas:</strong> Dompet penyimpanan kas lembaga baik berbentuk kas fisik/tunai (di brankas/bendahara) maupun rekening kas bank.
              </span>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded">
              Dompet Kas
            </span>
          </div>
        </div>
      )}

      {activeTab === 'transaction_rules' && (
        <div className="bg-slate-100/80 border border-slate-200 rounded-xl px-4 py-2.5 flex items-center justify-between text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0" />
            <span>
              <strong>Aturan Transaksi:</strong> Pemetaan otomatis akun debit &amp; kredit saat transaksi dicatat. Aturan bawaan sistem dilindungi (hanya bisa ganti akun / non-aktifkan) untuk menjaga integritas pembukuan.
            </span>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 bg-indigo-100/80 px-2 py-0.5 rounded">
            Accounting Rules
          </span>
        </div>
      )}

      {/* Search & Actions Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari data master..."
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
          />
        </div>
        <div className="text-xs text-slate-500 flex items-center gap-3">
          <span>
            Menampilkan <strong className="text-slate-800 font-bold">
              {activeTab === 'cash_accounts' && filteredCashAccounts.length}
              {activeTab === 'coa' && filteredCoa.length}
              {activeTab === 'transaction_rules' && filteredRules.length}
              {activeTab === 'fee_types' && filteredFeeTypes.length}
              {activeTab === 'categories' && filteredCategories.length}
              {activeTab === 'fee_adjustments' && filteredAdjustments.length}
            </strong> data
          </span>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2">
            <Loader2 className="w-6 h-6 text-emerald-600 animate-spin" />
            <p className="text-xs text-slate-400">Memuat data master...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            {/* 1. TAB JENIS KAS (DOMPET KAS TUNAI & BANK) */}
            {activeTab === 'cash_accounts' && (
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="px-5 py-3">Nama Dompet Kas</th>
                    <th className="px-5 py-3">Bentuk Penyimpanan</th>
                    <th className="px-5 py-3">Bank / No. Rekening</th>
                    <th className="px-5 py-3">Akun Akuntansi Terkait (CoA)</th>
                    <th className="px-5 py-3 text-right">Saldo Awal Kas</th>
                    <th className="px-5 py-3 text-right">Saldo Berjalan</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3 text-right">Aksi &amp; Riwayat</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredCashAccounts.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="px-5 py-8 text-center text-slate-400">
                        Tidak ada data jenis kas yang sesuai.
                      </td>
                    </tr>
                  ) : (
                    filteredCashAccounts.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/60 transition">
                        <td className="px-5 py-3.5 font-bold text-slate-800">
                          <div className="flex items-center gap-2">
                            <Wallet className="w-3.5 h-3.5 text-emerald-600" />
                            <span>{item.name}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              item.account_kind === 'bank'
                                ? 'bg-indigo-50 text-indigo-700 border border-indigo-200/60'
                                : 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                            }`}
                          >
                            {item.account_kind === 'bank' ? 'Kas Rekening Bank' : 'Kas Tunai (Fisik)'}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-slate-600">
                          {item.bank_name ? (
                            <span className="font-medium text-slate-700">{item.bank_name} &bull; <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-[11px]">{item.bank_account_number}</code></span>
                          ) : (
                            <span className="text-slate-400 italic">Kas Tunai / Brankas</span>
                          )}
                        </td>
                        <td className="px-5 py-3.5">
                          {item.account_code ? (
                            <div className="flex flex-col">
                              <div className="flex items-center gap-1.5">
                                <span className="px-1.5 py-0.5 rounded bg-blue-50 border border-blue-200 text-blue-700 font-mono font-bold text-[10px]">
                                  {item.account_code}
                                </span>
                                <span className="font-semibold text-slate-800 text-[11px] truncate max-w-[200px]" title={item.account_name}>
                                  {item.account_name}
                                </span>
                              </div>
                              <span className="text-[10px] text-slate-400 capitalize mt-0.5">
                                Kelompok {item.account_group || 'Harta / Kas'}
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic text-[11px]">Belum Dihubungkan</span>
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-right font-mono font-bold text-slate-800">
                          {formatCurrency(item.opening_balance || 0)}
                        </td>
                        <td className="px-5 py-3.5 text-right font-mono font-bold text-emerald-700">
                          {formatCurrency(item.current_balance !== undefined ? item.current_balance : item.opening_balance)}
                        </td>
                        <td className="px-5 py-3.5">
                          {item.is_active ? (
                            <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md text-[10px] font-bold">
                              <CheckCircle2 className="w-3 h-3" /> Aktif
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md text-[10px] font-bold">
                              <XCircle className="w-3 h-3" /> Non-aktif
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Tombol Pindah Saldo Kas */}
                            <button
                              type="button"
                              onClick={() => openTransferModal(item)}
                              title="Pindahkan Saldo dari Kas Ini"
                              className="p-1.5 text-slate-500 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition"
                            >
                              <ArrowRightLeft className="w-3.5 h-3.5" />
                            </button>

                            {/* Tombol Edit */}
                            <button
                              type="button"
                              onClick={() => openEditModal(item)}
                              title="Ubah Data Kas"
                              className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            {/* Tombol Toggle Status (Aktifkan / Nonaktifkan) */}
                            <button
                              type="button"
                              onClick={() => handleToggleStatus(item, 'cash_account')}
                              title={item.is_active ? 'Nonaktifkan Akun Kas' : 'Aktifkan Akun Kas'}
                              className={`p-1.5 rounded-lg transition ${
                                item.is_active
                                  ? 'text-amber-600 hover:bg-amber-50 hover:text-amber-700'
                                  : 'text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700'
                              }`}
                            >
                              <Power className="w-3.5 h-3.5" />
                            </button>

                            {/* Tombol Riwayat Perubahan */}
                            <button
                              type="button"
                              onClick={() => openHistoryModal(item, 'cash_account', item.name)}
                              title="Lihat Riwayat Perubahan & Audit Trail"
                              className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                            >
                              <History className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                {filteredCashAccounts.length > 0 && (
                  <tfoot className="bg-slate-50/90 border-t-2 border-slate-200 font-bold text-slate-800 text-xs">
                    <tr>
                      <td colSpan="3" className="px-5 py-3.5 text-slate-600 uppercase tracking-wider">
                        Total ({filteredCashAccounts.length} Akun Kas)
                      </td>
                      <td className="px-5 py-3.5 text-right font-mono text-slate-800">
                        {formatCurrency(filteredCashAccounts.reduce((sum, item) => sum + (parseFloat(item.opening_balance) || 0), 0))}
                      </td>
                      <td className="px-5 py-3.5 text-right font-mono text-emerald-700">
                        {formatCurrency(filteredCashAccounts.reduce((sum, item) => sum + (parseFloat(item.current_balance !== undefined ? item.current_balance : item.opening_balance) || 0), 0))}
                      </td>
                      <td colSpan="2" className="px-5 py-3.5"></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            )}

            {/* 2. TAB BAGAN AKUN (COA) */}
            {activeTab === 'coa' && (
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="px-5 py-3">Kode Akun</th>
                    <th className="px-5 py-3">Nama Akun (COA)</th>
                    <th className="px-5 py-3">Kelompok Akun</th>
                    <th className="px-5 py-3">Saldo Normal</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3 text-right">Aksi &amp; Riwayat</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredCoa.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="px-5 py-8 text-center text-slate-400">
                        Tidak ada data COA yang sesuai.
                      </td>
                    </tr>
                  ) : (
                    filteredCoa.map((item) => {
                      const grp = COA_GROUPS[item.account_group] || { label: item.account_group, bg: 'bg-slate-100 text-slate-700 border-slate-200' };
                      const normal = item.normal_balance || grp.normal || 'debit';
                      return (
                        <tr key={item.id} className={`hover:bg-slate-50/60 transition ${item.level === 1 ? 'bg-slate-50/30' : ''}`}>
                          <td className="px-5 py-3.5 font-mono text-xs">
                            <span className={item.level === 2 ? 'pl-3 font-mono font-medium text-emerald-600' : 'font-mono font-bold text-emerald-800'}>
                              {item.account_code}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-xs text-slate-800">
                            <div className={`flex items-center gap-1.5 ${item.level === 2 ? 'pl-4 font-normal text-slate-700' : 'font-bold text-slate-900'}`}>
                              {item.level === 2 && <span className="text-slate-300 font-mono text-xs">&bull;</span>}
                              <span>{item.account_name}</span>
                            </div>
                          </td>
                          <td className="px-5 py-3.5">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${grp.bg}`}>
                              {grp.label}
                            </span>
                          </td>
                          <td className="px-5 py-3.5">
                            {normal === 'credit' ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-purple-50 text-purple-700 border border-purple-200 font-mono">
                                KREDIT
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-50 text-blue-700 border border-blue-200 font-mono">
                                DEBIT
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-3.5">
                            {item.is_active ? (
                              <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md text-[10px] font-bold">
                                <CheckCircle2 className="w-3 h-3" /> Aktif
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md text-[10px] font-bold">
                                <XCircle className="w-3 h-3" /> Non-aktif
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => openEditModal(item)}
                                title="Ubah Akun COA"
                                className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleToggleStatus(item, 'coa')}
                                title={item.is_active ? 'Nonaktifkan Akun COA' : 'Aktifkan Akun COA'}
                                className={`p-1.5 rounded-lg transition ${
                                  item.is_active
                                    ? 'text-amber-600 hover:bg-amber-50 hover:text-amber-700'
                                    : 'text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700'
                                }`}
                              >
                                <Power className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => openHistoryModal(item, 'chart_of_account', `${item.account_code} - ${item.account_name}`)}
                                title="Lihat Riwayat Perubahan & Audit Trail"
                                className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                              >
                                <History className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            )}

            {/* 3. TAB ATURAN TRANSAKSI (DIKELOMPOKKAN KE 6 SEKSI UTAMA) */}
            {activeTab === 'transaction_rules' && (
              <div className="p-4 space-y-6">
                {/* Filter Jenis Transaksi */}
                <div className="flex flex-wrap items-center gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
                  <span className="text-[11px] font-bold text-slate-600 mr-1 flex items-center gap-1">
                    <Sliders className="w-3.5 h-3.5 text-indigo-600" /> Filter Jenis:
                  </span>
                  <button
                    type="button"
                    onClick={() => setRuleTypeFilter('')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                      !ruleTypeFilter ? 'bg-indigo-600 text-white shadow-2xs' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                    }`}
                  >
                    Semua Jenis ({transactionRules.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setRuleTypeFilter('penambahan_kas')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition ${
                      ruleTypeFilter === 'penambahan_kas' ? 'bg-emerald-600 text-white shadow-2xs' : 'bg-white text-emerald-700 hover:bg-emerald-50 border border-emerald-200'
                    }`}
                  >
                    <ArrowDownLeft className="w-3 h-3" /> Penambahan Kas ({transactionRules.filter(r => r.transaction_type === 'penambahan_kas').length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setRuleTypeFilter('pengurangan_kas')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition ${
                      ruleTypeFilter === 'pengurangan_kas' ? 'bg-rose-600 text-white shadow-2xs' : 'bg-white text-rose-700 hover:bg-rose-50 border border-rose-200'
                    }`}
                  >
                    <ArrowUpRight className="w-3 h-3" /> Pengurangan Kas ({transactionRules.filter(r => r.transaction_type === 'pengurangan_kas').length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setRuleTypeFilter('non_kas')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition ${
                      ruleTypeFilter === 'non_kas' ? 'bg-blue-600 text-white shadow-2xs' : 'bg-white text-blue-700 hover:bg-blue-50 border border-blue-200'
                    }`}
                  >
                    <RefreshCw className="w-3 h-3" /> Non-Kas ({transactionRules.filter(r => r.transaction_type === 'non_kas').length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setRuleTypeFilter('pemindahan_kas')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition ${
                      ruleTypeFilter === 'pemindahan_kas' ? 'bg-purple-600 text-white shadow-2xs' : 'bg-white text-purple-700 hover:bg-purple-50 border border-purple-200'
                    }`}
                  >
                    <ArrowLeftRight className="w-3 h-3" /> Pemindahan Kas ({transactionRules.filter(r => r.transaction_type === 'pemindahan_kas').length})
                  </button>
                </div>

                {filteredRules.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 text-xs">
                    Tidak ada aturan transaksi yang sesuai dengan filter atau pencarian.
                  </div>
                ) : (
                  <>
                    {RULE_SECTIONS.map((section) => {
                      const sectionRules = filteredRules.filter((r) => section.codes.includes(r.transaction_code));
                      if (sectionRules.length === 0) return null;

                      return (
                        <div key={section.key} className="space-y-2.5">
                          {/* Section Header */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-slate-200/80 pb-2">
                            <div>
                              <h4 className="text-xs font-bold text-slate-900 flex items-center gap-2">
                                <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                                {section.title}
                              </h4>
                              <p className="text-[11px] text-slate-500 mt-0.5">{section.desc}</p>
                            </div>
                            <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full w-fit">
                              {sectionRules.length} Aturan
                            </span>
                          </div>

                          {/* Section Table */}
                          <div className="border border-slate-200/70 rounded-xl overflow-hidden shadow-2xs">
                            <table className="w-full text-left text-xs">
                              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                                <tr>
                                  <th className="px-4 py-2.5">Kode &amp; Nama Aturan</th>
                                  <th className="px-4 py-2.5">Jenis Transaksi</th>
                                  <th className="px-4 py-2.5">Akun Debit</th>
                                  <th className="px-4 py-2.5">Akun Kredit</th>
                                  <th className="px-4 py-2.5">Kas Terkait</th>
                                  <th className="px-4 py-2.5">Pos / Kategori</th>
                                  <th className="px-4 py-2.5">Tipe Aturan</th>
                                  <th className="px-4 py-2.5">Status</th>
                                  <th className="px-4 py-2.5 text-right">Aksi &amp; Riwayat</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {sectionRules.map((item) => (
                                  <tr key={item.id} className="hover:bg-slate-50/60 transition">
                                    <td className="px-4 py-3">
                                      <div className="font-bold text-slate-800 flex items-center gap-1.5">
                                        <span>{item.transaction_label}</span>
                                        {item.is_system && (
                                          <Lock className="w-3 h-3 text-slate-400 shrink-0" title="Aturan sistem terproteksi" />
                                        )}
                                      </div>
                                      <div className="font-mono text-[11px] text-indigo-700 font-semibold">{item.transaction_code}</div>
                                      {item.linked_feature_note && (
                                        <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">
                                          <Info className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                                          <span>Terkait: {item.linked_feature_note}</span>
                                        </div>
                                      )}
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap">
                                      {renderTypeBadge(item.transaction_type)}
                                    </td>
                                    <td className="px-4 py-3">
                                      {item.debit_account_name ? (
                                        <>
                                          <div className="font-semibold text-slate-800">{item.debit_account_name}</div>
                                          <div className="font-mono text-[10px] text-slate-400">{item.debit_account_code}</div>
                                        </>
                                      ) : item.is_dynamic_account ? (
                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-50 text-amber-700 border border-amber-200">
                                          Dinamis (Runtime)
                                        </span>
                                      ) : (
                                        <span className="text-slate-400 italic text-[11px]">-</span>
                                      )}
                                    </td>
                                    <td className="px-4 py-3">
                                      {item.credit_account_name ? (
                                        <>
                                          <div className="font-semibold text-slate-800">{item.credit_account_name}</div>
                                          <div className="font-mono text-[10px] text-slate-400">{item.credit_account_code}</div>
                                        </>
                                      ) : item.is_dynamic_account ? (
                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-50 text-amber-700 border border-amber-200">
                                          Dinamis (Runtime)
                                        </span>
                                      ) : (
                                        <span className="text-slate-400 italic text-[11px]">-</span>
                                      )}
                                    </td>
                                    <td className="px-4 py-3 text-slate-600">
                                      {item.transaction_type !== 'non_kas' ? (
                                        item.default_cash_account_name ? (
                                          <div className="font-medium text-slate-700 flex items-center gap-1">
                                            <Wallet className="w-3 h-3 text-emerald-600 shrink-0" />
                                            <span>{item.default_cash_account_name}</span>
                                          </div>
                                        ) : (
                                          <span className="text-slate-400 italic text-[11px]">Sesuai Kas Transaksi</span>
                                        )
                                      ) : (
                                        <span className="text-slate-300 italic text-[11px]">- Non-Kas -</span>
                                      )}
                                    </td>
                                    <td className="px-4 py-3 text-slate-600">
                                      {item.related_fee_type_name ? (
                                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
                                          Pos: {item.related_fee_type_name}
                                        </span>
                                      ) : item.related_category_name ? (
                                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
                                          Kat: {item.related_category_name}
                                        </span>
                                      ) : (
                                        <span className="text-slate-400 italic text-[11px]">-</span>
                                      )}
                                    </td>
                                    <td className="px-4 py-3">
                                      {item.is_system ? (
                                        <span
                                          title={item.linked_feature_note || 'Aturan bawaan sistem terlindungi'}
                                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200"
                                        >
                                          <Lock className="w-3 h-3 text-slate-500" /> Bawaan Sistem
                                        </span>
                                      ) : (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                          <Sliders className="w-3 h-3" /> Kustom
                                        </span>
                                      )}
                                    </td>
                                    <td className="px-4 py-3">
                                      {item.is_active ? (
                                        <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md text-[10px] font-bold">
                                          <CheckCircle2 className="w-3 h-3" /> Aktif
                                        </span>
                                      ) : (
                                        <span className="inline-flex items-center gap-1 text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md text-[10px] font-bold">
                                          <XCircle className="w-3 h-3" /> Non-aktif
                                        </span>
                                      )}
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                      <div className="flex items-center justify-end gap-1.5">
                                        {/* Tombol Edit Biasa */}
                                        <button
                                          type="button"
                                          onClick={() => openEditModal(item)}
                                          title={item.is_system ? 'Ubah Pengaturan Kas Default / Status' : 'Ubah Aturan Transaksi'}
                                          className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition"
                                        >
                                          <Edit2 className="w-3.5 h-3.5" />
                                        </button>

                                        {/* Tombol Override Struktural bagi Super Admin */}
                                        {item.is_system && (
                                          <button
                                            type="button"
                                            onClick={() => handleOpenOverrideModal(item)}
                                            title="Override Struktural Akun Sistem (Khusus Super Admin)"
                                            className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                                          >
                                            <Sliders className="w-3.5 h-3.5" />
                                          </button>
                                        )}

                                        {/* Tombol Toggle Aktif/Nonaktif */}
                                        <button
                                          type="button"
                                          onClick={() => handleToggleStatus(item, 'transaction_rule')}
                                          title={item.is_active ? 'Nonaktifkan Aturan' : 'Aktifkan Aturan'}
                                          className={`p-1.5 rounded-lg transition ${
                                            item.is_active
                                              ? 'text-amber-600 hover:bg-amber-50 hover:text-amber-700'
                                              : 'text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700'
                                          }`}
                                        >
                                          <Power className="w-3.5 h-3.5" />
                                        </button>

                                        {/* Tombol Audit Log */}
                                        <button
                                          type="button"
                                          onClick={() => openHistoryModal(item, 'transaction_account_mapping', `${item.transaction_code} - ${item.transaction_label}`)}
                                          title="Lihat Riwayat Perubahan & Audit Trail"
                                          className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                                        >
                                          <History className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      );
                    })}

                    {/* Aturan Transaksi Kustom (Jika Ada) */}
                    {(() => {
                      const allSectionCodes = RULE_SECTIONS.flatMap((s) => s.codes);
                      const customRules = filteredRules.filter((r) => !allSectionCodes.includes(r.transaction_code));
                      if (customRules.length === 0) return null;

                      return (
                        <div className="space-y-2.5">
                          <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
                            <div>
                              <h4 className="text-xs font-bold text-slate-900 flex items-center gap-2">
                                <Sliders className="w-3.5 h-3.5 text-emerald-600" />
                                7. Aturan Transaksi Kustom
                              </h4>
                              <p className="text-[11px] text-slate-500 mt-0.5">Aturan transaksi tambahan yang dibuat secara mandiri oleh lembaga.</p>
                            </div>
                            <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                              {customRules.length} Kustom
                            </span>
                          </div>

                          <div className="border border-slate-200/70 rounded-xl overflow-hidden shadow-2xs">
                            <table className="w-full text-left text-xs">
                              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                                <tr>
                                  <th className="px-4 py-2.5">Kode &amp; Nama Aturan</th>
                                  <th className="px-4 py-2.5">Jenis Transaksi</th>
                                  <th className="px-4 py-2.5">Akun Debit</th>
                                  <th className="px-4 py-2.5">Akun Kredit</th>
                                  <th className="px-4 py-2.5">Kas Terkait</th>
                                  <th className="px-4 py-2.5">Pos / Kategori</th>
                                  <th className="px-4 py-2.5">Tipe Aturan</th>
                                  <th className="px-4 py-2.5">Status</th>
                                  <th className="px-4 py-2.5 text-right">Aksi &amp; Riwayat</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {customRules.map((item) => (
                                  <tr key={item.id} className="hover:bg-slate-50/60 transition">
                                    <td className="px-4 py-3">
                                      <div className="font-bold text-slate-800">{item.transaction_label}</div>
                                      <div className="font-mono text-[11px] text-emerald-700 font-semibold">{item.transaction_code}</div>
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap">
                                      {renderTypeBadge(item.transaction_type)}
                                    </td>
                                    <td className="px-4 py-3">
                                      <div className="font-semibold text-slate-800">{item.debit_account_name || '-'}</div>
                                      <div className="font-mono text-[10px] text-slate-400">{item.debit_account_code}</div>
                                    </td>
                                    <td className="px-4 py-3">
                                      <div className="font-semibold text-slate-800">{item.credit_account_name || '-'}</div>
                                      <div className="font-mono text-[10px] text-slate-400">{item.credit_account_code}</div>
                                    </td>
                                    <td className="px-4 py-3 text-slate-600">
                                      {item.transaction_type !== 'non_kas' ? (
                                        item.default_cash_account_name || <span className="text-slate-400 italic text-[11px]">Sesuai Kas Transaksi</span>
                                      ) : (
                                        <span className="text-slate-300 italic text-[11px]">- Non-Kas -</span>
                                      )}
                                    </td>
                                    <td className="px-4 py-3 text-slate-600">
                                      {item.related_fee_type_name ? (
                                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
                                          Pos: {item.related_fee_type_name}
                                        </span>
                                      ) : item.related_category_name ? (
                                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
                                          Kat: {item.related_category_name}
                                        </span>
                                      ) : (
                                        <span className="text-slate-400 italic text-[11px]">-</span>
                                      )}
                                    </td>
                                    <td className="px-4 py-3">
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                        <Sliders className="w-3 h-3" /> Kustom
                                      </span>
                                    </td>
                                    <td className="px-4 py-3">
                                      {item.is_active ? (
                                        <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md text-[10px] font-bold">
                                          <CheckCircle2 className="w-3 h-3" /> Aktif
                                        </span>
                                      ) : (
                                        <span className="inline-flex items-center gap-1 text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md text-[10px] font-bold">
                                          <XCircle className="w-3 h-3" /> Non-aktif
                                        </span>
                                      )}
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                      <div className="flex items-center justify-end gap-1.5">
                                        <button
                                          type="button"
                                          onClick={() => openEditModal(item)}
                                          title="Ubah Aturan Kustom"
                                          className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition"
                                        >
                                          <Edit2 className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleToggleStatus(item, 'transaction_rule')}
                                          title={item.is_active ? 'Nonaktifkan Aturan' : 'Aktifkan Aturan'}
                                          className={`p-1.5 rounded-lg transition ${
                                            item.is_active
                                              ? 'text-amber-600 hover:bg-amber-50 hover:text-amber-700'
                                              : 'text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700'
                                          }`}
                                        >
                                          <Power className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => openHistoryModal(item, 'transaction_account_mapping', `${item.transaction_code} - ${item.transaction_label}`)}
                                          title="Lihat Riwayat Perubahan & Audit Trail"
                                          className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                                        >
                                          <History className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      );
                    })()}
                  </>
                )}
              </div>
            )}

            {/* 4. TAB JENIS BIAYA TAGIHAN */}
            {activeTab === 'fee_types' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3">Nama Jenis Biaya</th>
                      <th className="px-4 py-3">Pola Penagihan</th>
                      <th className="px-4 py-3">Akun Pendapatan</th>
                      <th className="px-4 py-3">Aturan Penagihan (Piutang)</th>
                      <th className="px-4 py-3">Aturan Diskon Penagihan</th>
                      <th className="px-4 py-3">Aturan Pembayaran (Kas Masuk)</th>
                      <th className="px-4 py-3">Aturan Diskon Pembayaran</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Aksi &amp; Riwayat</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredFeeTypes.length === 0 ? (
                      <tr>
                        <td colSpan="9" className="px-4 py-8 text-center text-slate-400">
                          Tidak ada data jenis biaya tagihan yang sesuai.
                        </td>
                      </tr>
                    ) : (
                      filteredFeeTypes.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50/60 transition">
                          <td className="px-4 py-3.5 font-bold text-slate-800 max-w-xs">
                            <div className="flex items-center gap-2">
                              <span>{item.name}</span>
                              {Boolean(item.is_system) && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded shadow-xs shrink-0" title="Variabel default terkunci sistem untuk modul layanan">
                                  <Lock className="w-2.5 h-2.5 text-amber-600" /> Terkunci Sistem
                                </span>
                              )}
                            </div>
                            {item.description && (
                              <div className="text-[11px] font-normal text-slate-500 mt-0.5 leading-snug line-clamp-2">
                                {item.description}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 text-slate-700">
                              {item.billing_pattern === 'monthly' ? 'Bulanan' : item.billing_pattern === 'yearly' ? 'Tahunan' : 'Insidental / Sekali Bayar'}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-slate-600">
                            {item.revenue_account_name ? (
                              <div>
                                <div className="font-semibold text-slate-800">{item.revenue_account_name}</div>
                                <div className="font-mono text-[10px] text-slate-400">{item.revenue_account_code}</div>
                              </div>
                            ) : (
                              <span className="text-slate-400 italic text-[11px]">Default (SPP Siswa)</span>
                            )}
                          </td>
                          <td className="px-4 py-3.5 text-slate-600">
                            {item.billing_mapping_label ? (
                              <div>
                                <div className="font-semibold text-blue-900 flex items-center gap-1">
                                  <RefreshCw className="w-3 h-3 text-blue-600 shrink-0" />
                                  <span>{item.billing_mapping_label}</span>
                                </div>
                                <div className="font-mono text-[10px] text-slate-400">Kode: {item.billing_mapping_code}</div>
                              </div>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-slate-500 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded text-[10px] font-medium">
                                <RefreshCw className="w-2.5 h-2.5 text-slate-400" /> Default (student_bill_issued)
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3.5 text-slate-600">
                            {item.billing_discount_mapping_label ? (
                              <div>
                                <div className="font-semibold text-amber-900 flex items-center gap-1">
                                  <Percent className="w-3 h-3 text-amber-600 shrink-0" />
                                  <span>{item.billing_discount_mapping_label}</span>
                                </div>
                                <div className="font-mono text-[10px] text-slate-400">Kode: {item.billing_discount_mapping_code}</div>
                              </div>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-slate-500 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded text-[10px] font-medium">
                                <Percent className="w-2.5 h-2.5 text-slate-400" /> Default (student_bill_discount)
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3.5 text-slate-600">
                            {item.payment_mapping_label ? (
                              <div>
                                <div className="font-semibold text-emerald-900 flex items-center gap-1">
                                  <ArrowDownLeft className="w-3 h-3 text-emerald-600 shrink-0" />
                                  <span>{item.payment_mapping_label}</span>
                                </div>
                                <div className="font-mono text-[10px] text-slate-400">Kode: {item.payment_mapping_code}</div>
                              </div>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-slate-500 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded text-[10px] font-medium">
                                <ArrowDownLeft className="w-2.5 h-2.5 text-slate-400" /> Default (student_bill_payment)
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3.5 text-slate-600">
                            {item.payment_discount_mapping_label ? (
                              <div>
                                <div className="font-semibold text-teal-900 flex items-center gap-1">
                                  <Percent className="w-3 h-3 text-teal-600 shrink-0" />
                                  <span>{item.payment_discount_mapping_label}</span>
                                </div>
                                <div className="font-mono text-[10px] text-slate-400">Kode: {item.payment_discount_mapping_code}</div>
                              </div>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-slate-500 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded text-[10px] font-medium">
                                <Percent className="w-2.5 h-2.5 text-slate-400" /> Default (Diskon Pelunasan)
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            {item.is_active ? (
                              <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md text-[10px] font-bold">
                                <CheckCircle2 className="w-3 h-3" /> Aktif
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md text-[10px] font-bold">
                                <XCircle className="w-3 h-3" /> Non-aktif
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3.5 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => openEditModal(item)}
                                title="Ubah Jenis Biaya Tagihan"
                                className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleToggleStatus(item, 'fee_type')}
                                title={item.is_active ? 'Nonaktifkan Jenis Biaya' : 'Aktifkan Jenis Biaya'}
                                className={`p-1.5 rounded-lg transition ${
                                  item.is_active
                                    ? 'text-amber-600 hover:bg-amber-50 hover:text-amber-700'
                                    : 'text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700'
                                }`}
                              >
                                <Power className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => openHistoryModal(item, 'fee_type', item.name)}
                                title="Lihat Riwayat Perubahan & Audit Trail"
                                className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                              >
                                <History className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* 4. TAB KATEGORI TRANSAKSI */}
            {activeTab === 'categories' && (
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="px-5 py-3">Nama Kategori</th>
                    <th className="px-5 py-3">Jenis Mutasi</th>
                    <th className="px-5 py-3">Akun Terkait (COA)</th>
                    <th className="px-5 py-3 text-right">Aksi &amp; Riwayat</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredCategories.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="px-5 py-8 text-center text-slate-400">
                        Tidak ada data kategori transaksi yang sesuai.
                      </td>
                    </tr>
                  ) : (
                    filteredCategories.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/60 transition">
                        <td className="px-5 py-3.5 font-bold text-slate-800">{item.name}</td>
                        <td className="px-5 py-3.5">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              item.category_kind === 'special_income'
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-rose-100 text-rose-700'
                            }`}
                          >
                            {item.category_kind === 'special_income' ? 'Pemasukan Khusus' : 'Pengeluaran (Beban)'}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-slate-600">
                          {item.related_account_name ? `${item.related_account_code} - ${item.related_account_name}` : '-'}
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => openEditModal(item)}
                              title="Ubah Kategori"
                              className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => openHistoryModal(item, 'transaction_category', item.name)}
                              title="Lihat Riwayat Perubahan & Audit Trail"
                              className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                            >
                              <History className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}

            {/* 5. TAB KERINGANAN & BEASISWA */}
            {activeTab === 'fee_adjustments' && (
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="px-5 py-3">Nama Siswa</th>
                    <th className="px-5 py-3">Jenis Tagihan</th>
                    <th className="px-5 py-3">Bentuk Keringanan</th>
                    <th className="px-5 py-3">Potongan / Nominal</th>
                    <th className="px-5 py-3">Status Pengajuan</th>
                    <th className="px-5 py-3 text-right">Aksi &amp; Riwayat</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredAdjustments.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="px-5 py-8 text-center text-slate-400">
                        Tidak ada data keringanan &amp; beasiswa yang sesuai.
                      </td>
                    </tr>
                  ) : (
                    filteredAdjustments.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/60 transition">
                        <td className="px-5 py-3.5 font-bold text-slate-800">{item.student_name || `Siswa ID ${item.student_id}`}</td>
                        <td className="px-5 py-3.5 text-slate-700">{item.fee_type_name || 'SPP Bulanan'}</td>
                        <td className="px-5 py-3.5">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-700">
                            {item.waiver_type || item.adjustment_kind}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 font-semibold text-slate-800">
                          {item.waiver_percentage ? `${item.waiver_percentage}% Diskon` : formatCurrency(item.override_amount || item.waiver_amount)}
                        </td>
                        <td className="px-5 py-3.5">
                          {item.status === 'approved' ? (
                            <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 w-fit">
                              <CheckCircle2 className="w-3 h-3" /> Disetujui
                            </span>
                          ) : (
                            <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded text-[10px] font-bold">
                              Menunggu Persetujuan
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {item.status !== 'approved' && (
                              <button
                                type="button"
                                onClick={() => handleApproveAdjustment(item.id)}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-semibold transition"
                              >
                                Setujui
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => openEditModal(item)}
                              title="Ubah Data Keringanan"
                              className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => openHistoryModal(item, 'student_fee_adjustment', item.student_name || `Beasiswa Siswa #${item.student_id}`)}
                              title="Lihat Riwayat Perubahan & Audit Trail"
                              className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                            >
                              <History className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* Modal Form Tambah / Edit (Wajib Catatan Perubahan saat Edit) */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className={`bg-white rounded-2xl shadow-2xl ${activeTab === 'transaction_rules' || activeTab === 'fee_types' ? 'max-w-4xl' : 'max-w-xl'} w-full max-h-[90vh] flex flex-col border border-slate-100 animate-in fade-in zoom-in duration-150 overflow-hidden`}>
            <div className="flex items-center justify-between p-5 border-b border-slate-100 shrink-0 bg-slate-50/50">
              <div>
                <h2 className="text-sm font-bold text-slate-800">
                  {modalMode === 'create' ? 'Tambah Data Baru' : 'Ubah Data Master'} &bull; {activeTab === 'cash_accounts' ? 'Jenis Kas' : activeTab.replace('_', ' ').toUpperCase()}
                </h2>
                <p className="text-[11px] text-slate-400">
                  {modalMode === 'create' ? 'Isi formulir untuk menambahkan data master baru.' : 'Pastikan mencantumkan catatan keterangan perubahan untuk audit trail.'}
                </p>
              </div>
              <button type="button" onClick={() => setModalOpen(false)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col min-h-0 flex-1 overflow-hidden">
              <div className="p-5 overflow-y-auto space-y-4 flex-1">
                {/* Form Input Tab: Jenis Kas */}
              {activeTab === 'cash_accounts' && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Dompet / Akun Kas *</label>
                    <input
                      type="text"
                      required
                      value={formData.name || ''}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Contoh: Kas Operasional Harian / Kas Brankas Utama"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Bentuk Penyimpanan Kas *</label>
                    <SearchableSelect
                      options={[
                        { value: 'cash', label: 'Kas Tunai (Fisik / Brankas / Bendahara)', sublabel: 'Penyimpanan fisik / kas kecil' },
                        { value: 'bank', label: 'Kas Rekening Bank', sublabel: 'Penyimpanan rekening giro / tabungan' }
                      ]}
                      value={formData.account_kind || 'cash'}
                      onChange={(val) => setFormData({ ...formData, account_kind: val })}
                      placeholder="Pilih Bentuk Penyimpanan Kas"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Akun Akuntansi Terkait (Bagan Akun / CoA)
                    </label>
                    <SearchableSelect
                      options={[
                        { value: '', label: '-- Tanpa Akun Tertaut (Default Kas) --', sublabel: 'Gunakan akun kas umum sistem' },
                        ...coaList
                          .filter((c) => c.account_group === 'harta' || String(c.account_code).startsWith('1'))
                          .map((c) => ({
                            value: c.id,
                            label: `[${c.account_code}] ${c.account_name}`,
                            sublabel: `Kelompok: ${(c.account_group || 'Harta').toUpperCase()} • Posisi: ${(c.normal_balance || 'Debit').toUpperCase()}`
                          }))
                      ]}
                      value={formData.account_id || ''}
                      onChange={(val) => setFormData({ ...formData, account_id: val })}
                      placeholder="Pilih Akun Kas / Bank Terkait"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">
                      Akun buku besar aktiva yang otomatis tercatat pada jurnal akuntansi saat mutasi kas/bank ini berlangsung.
                    </p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Saldo Awal Kas (Rp)</label>
                      <input
                        type="number"
                        value={formData.opening_balance ?? 0}
                        onChange={(e) => setFormData({ ...formData, opening_balance: e.target.value })}
                        placeholder="0"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800"
                      />
                    </div>
                    <div>
                      <DatePickerField
                        label="Tanggal Saldo Awal"
                        value={formData.opening_date || ''}
                        onChange={(isoStr) => setFormData({ ...formData, opening_date: isoStr })}
                        placeholder="DD/MM/YYYY"
                      />
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-400">
                    Saldo awal kas saat mulai pencatatan sistem baru (otomatis tercatat ke Saldo Awal Kas / Opening Pool pada tanggal yang dipilih).
                  </p>
                  {formData.account_kind === 'bank' && (
                    <div className="grid grid-cols-2 gap-3 p-3 bg-indigo-50/50 rounded-xl border border-indigo-100">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Bank *</label>
                        <input
                          type="text"
                          required={formData.account_kind === 'bank'}
                          value={formData.bank_name || ''}
                          onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                          placeholder="BSI / BCA / Mandiri"
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Nomor Rekening *</label>
                        <input
                          type="text"
                          required={formData.account_kind === 'bank'}
                          value={formData.bank_account_number || ''}
                          onChange={(e) => setFormData({ ...formData, bank_account_number: e.target.value })}
                          placeholder="1234567890"
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono"
                        />
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Form Input Tab: COA */}
              {activeTab === 'coa' && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Kode Akun (COA) *</label>
                    <input
                      type="text"
                      required
                      value={formData.account_code || ''}
                      onChange={(e) => setFormData({ ...formData, account_code: e.target.value })}
                      placeholder="Contoh: 1-1001"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Akun *</label>
                    <input
                      type="text"
                      required
                      value={formData.account_name || ''}
                      onChange={(e) => setFormData({ ...formData, account_name: e.target.value })}
                      placeholder="Contoh: Kas Utama Operasional"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Kelompok Akun Standar Nirlaba *</label>
                    <SearchableSelect
                      options={[
                        { value: 'harta', label: '1. Harta (Aset Lancar, Kas & Bank)', sublabel: 'Saldo Normal: Debit' },
                        { value: 'piutang', label: '2. Piutang (Piutang Siswa / Santri & Lainnya)', sublabel: 'Saldo Normal: Debit' },
                        { value: 'inventaris', label: '3. Inventaris (Aset Tetap & Fasilitas)', sublabel: 'Saldo Normal: Debit' },
                        { value: 'utang', label: '4. Utang (Kewajiban Jangka Pendek & Panjang)', sublabel: 'Saldo Normal: Kredit' },
                        { value: 'modal', label: '5. Modal (Ekuitas & Saldo Awal Lembaga)', sublabel: 'Saldo Normal: Kredit' },
                        { value: 'pendapatan', label: '6. Pendapatan (SPP, BOS, Donasi & Usaha)', sublabel: 'Saldo Normal: Kredit' },
                        { value: 'biaya', label: '7. Biaya (Beban Operasional & Pemeliharaan)', sublabel: 'Saldo Normal: Debit' }
                      ]}
                      value={formData.account_group || 'harta'}
                      onChange={(val) => {
                        const normal = COA_GROUPS[val]?.normal || 'debit';
                        setFormData({ ...formData, account_group: val, normal_balance: normal });
                      }}
                      placeholder="Pilih Kelompok Akun COA"
                      searchPlaceholder="Cari kelompok akun (Harta, Piutang, dll)..."
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Saldo Normal (Otomatis)</label>
                    <div className="flex items-center gap-3">
                      <span className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono uppercase border ${
                        (formData.normal_balance || COA_GROUPS[formData.account_group]?.normal) === 'credit'
                          ? 'bg-purple-50 text-purple-700 border-purple-200'
                          : 'bg-blue-50 text-blue-700 border-blue-200'
                      }`}>
                        {(formData.normal_balance || COA_GROUPS[formData.account_group]?.normal || 'debit').toUpperCase()}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        Wajib konsisten mengikuti kelompok akuntansi nirlaba
                      </span>
                    </div>
                  </div>
                </>
              )}

              {/* Form Input Tab: Transaction Rules (Aturan Transaksi) */}
              {activeTab === 'transaction_rules' && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Kode Aturan (Unique Code) *</label>
                    <input
                      type="text"
                      required
                      disabled={formData.is_system}
                      value={formData.transaction_code || ''}
                      onChange={(e) => setFormData({ ...formData, transaction_code: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
                      placeholder="Contoh: donasi_kegiatan_tahfidz"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold disabled:bg-slate-100 disabled:text-slate-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Nama / Label Aturan *</label>
                    <input
                      type="text"
                      required
                      value={formData.transaction_label || ''}
                      onChange={(e) => setFormData({ ...formData, transaction_label: e.target.value })}
                      placeholder="Contoh: Penerimaan Donasi Santri Tahfidz"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                    />
                  </div>

                  {/* Selector Jenis Transaksi */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">Jenis Transaksi *</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <label className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition ${
                        (formData.transaction_type || 'non_kas') === 'penambahan_kas'
                          ? 'bg-emerald-50/80 border-emerald-300 ring-1 ring-emerald-400'
                          : 'bg-slate-50 border-slate-200 hover:bg-slate-100/70'
                      }`}>
                        <input
                          type="radio"
                          name="transaction_type"
                          value="penambahan_kas"
                          disabled={formData.is_system}
                          checked={(formData.transaction_type || 'non_kas') === 'penambahan_kas'}
                          onChange={() => setFormData({ ...formData, transaction_type: 'penambahan_kas', related_transaction_category_id: '' })}
                          className="mt-0.5 text-emerald-600 focus:ring-emerald-500"
                        />
                        <div>
                          <div className="text-xs font-bold text-slate-800 flex items-center gap-1">
                            <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-600" /> Penambahan Kas (Cash In)
                          </div>
                          <div className="text-[10px] text-slate-500 mt-0.5">Menambah saldo kas/bank lembaga (pembayaran tagihan, penerimaan donasi, dll.)</div>
                        </div>
                      </label>

                      <label className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition ${
                        (formData.transaction_type || 'non_kas') === 'pengurangan_kas'
                          ? 'bg-rose-50/80 border-rose-300 ring-1 ring-rose-400'
                          : 'bg-slate-50 border-slate-200 hover:bg-slate-100/70'
                      }`}>
                        <input
                          type="radio"
                          name="transaction_type"
                          value="pengurangan_kas"
                          disabled={formData.is_system}
                          checked={(formData.transaction_type || 'non_kas') === 'pengurangan_kas'}
                          onChange={() => setFormData({ ...formData, transaction_type: 'pengurangan_kas' })}
                          className="mt-0.5 text-rose-600 focus:ring-rose-500"
                        />
                        <div>
                          <div className="text-xs font-bold text-slate-800 flex items-center gap-1">
                            <ArrowUpRight className="w-3.5 h-3.5 text-rose-600" /> Pengurangan Kas (Cash Out)
                          </div>
                          <div className="text-[10px] text-slate-500 mt-0.5">Mengurangi saldo kas/bank (pengeluaran operasional, honor/gaji, belanja aset)</div>
                        </div>
                      </label>

                      <label className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition ${
                        (formData.transaction_type || 'non_kas') === 'non_kas'
                          ? 'bg-blue-50/80 border-blue-300 ring-1 ring-blue-400'
                          : 'bg-slate-50 border-slate-200 hover:bg-slate-100/70'
                      }`}>
                        <input
                          type="radio"
                          name="transaction_type"
                          value="non_kas"
                          disabled={formData.is_system}
                          checked={(formData.transaction_type || 'non_kas') === 'non_kas'}
                          onChange={() => setFormData({ ...formData, transaction_type: 'non_kas', default_cash_account_id: '', related_fee_type_id: '', related_transaction_category_id: '' })}
                          className="mt-0.5 text-blue-600 focus:ring-blue-500"
                        />
                        <div>
                          <div className="text-xs font-bold text-slate-800 flex items-center gap-1">
                            <RefreshCw className="w-3.5 h-3.5 text-blue-600" /> Non-Kas (Accrual / Adjustment)
                          </div>
                          <div className="text-[10px] text-slate-500 mt-0.5">Tidak mempengaruhi saldo kas (penerbitan tagihan/piutang, diskon, tutup buku)</div>
                        </div>
                      </label>

                      <label className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition ${
                        (formData.transaction_type || 'non_kas') === 'pemindahan_kas'
                          ? 'bg-purple-50/80 border-purple-300 ring-1 ring-purple-400'
                          : 'bg-slate-50 border-slate-200 hover:bg-slate-100/70'
                      }`}>
                        <input
                          type="radio"
                          name="transaction_type"
                          value="pemindahan_kas"
                          disabled={formData.is_system}
                          checked={(formData.transaction_type || 'non_kas') === 'pemindahan_kas'}
                          onChange={() => setFormData({ ...formData, transaction_type: 'pemindahan_kas', related_fee_type_id: '', related_transaction_category_id: '' })}
                          className="mt-0.5 text-purple-600 focus:ring-purple-500"
                        />
                        <div>
                          <div className="text-xs font-bold text-slate-800 flex items-center gap-1">
                            <ArrowLeftRight className="w-3.5 h-3.5 text-purple-600" /> Pemindahan Kas (Transfer)
                          </div>
                          <div className="text-[10px] text-slate-500 mt-0.5">Pemindahan/mutasi dana dari satu jenis kas/bank ke kas/bank lainnya</div>
                        </div>
                      </label>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Akun Debit *</label>
                      <SearchableSelect
                        options={cleanCoaList.map((a) => ({
                          value: a.id,
                          label: `[${a.account_code}] ${a.account_name}`,
                          sublabel: `Kelompok: ${(a.account_group || '').toUpperCase()} • Saldo: ${(a.normal_balance || 'debit').toUpperCase()}`
                        }))}
                        value={formData.debit_account_id || ''}
                        onChange={(val) => setFormData({ ...formData, debit_account_id: val ? Number(val) : '' })}
                        placeholder="-- Pilih Akun Debit --"
                        searchPlaceholder="Cari kode atau nama akun debit..."
                        menuMinWidth="max(100%, 360px)"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Akun Kredit *</label>
                      <SearchableSelect
                        options={cleanCoaList.map((a) => ({
                          value: a.id,
                          label: `[${a.account_code}] ${a.account_name}`,
                          sublabel: `Kelompok: ${(a.account_group || '').toUpperCase()} • Saldo: ${(a.normal_balance || 'debit').toUpperCase()}`
                        }))}
                        value={formData.credit_account_id || ''}
                        onChange={(val) => setFormData({ ...formData, credit_account_id: val ? Number(val) : '' })}
                        placeholder="-- Pilih Akun Kredit --"
                        searchPlaceholder="Cari kode atau nama akun kredit..."
                        menuMinWidth="max(100%, 360px)"
                      />
                    </div>
                  </div>

                  {/* Conditional Relations: Kas, Pos Biaya, Kategori Belanja */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* Jenis Kas Terkait: hanya jika transaksi melibatkan kas */}
                    {formData.transaction_type !== 'non_kas' ? (
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Kas Terkait {formData.transaction_type === 'pemindahan_kas' ? '(Default Asal)' : '(Default)'}
                        </label>
                        <SearchableSelect
                          options={[
                            { value: '', label: '-- Fleksibel (Sesuai Transaksi) --', sublabel: 'Mengikuti dompet/rekening yang dipilih saat transaksi' },
                            ...cashAccounts.map((c) => ({
                              value: c.id,
                              label: c.name,
                              sublabel: c.account_kind === 'bank' ? `${c.bank_name} (${c.bank_account_number})` : 'Kas Tunai / Fisik'
                            }))
                          ]}
                          value={formData.default_cash_account_id || ''}
                          onChange={(val) => setFormData({ ...formData, default_cash_account_id: val ? Number(val) : '' })}
                          placeholder="-- Fleksibel --"
                          searchPlaceholder="Cari nama kas atau bank..."
                          menuMinWidth="max(100%, 320px)"
                        />
                      </div>
                    ) : (
                      <div className="opacity-50 pointer-events-none">
                        <label className="block text-xs font-semibold text-slate-400 mb-1">Kas Terkait</label>
                        <div className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-400 italic">
                          Tidak berlaku untuk Non-Kas
                        </div>
                      </div>
                    )}

                    {/* Pos Biaya Terkait: hanya jika penambahan_kas atau pengurangan_kas */}
                    {(formData.transaction_type === 'penambahan_kas' || formData.transaction_type === 'pengurangan_kas') ? (
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Pos Biaya Terkait</label>
                        <SearchableSelect
                          options={[
                            { value: '', label: '-- Tidak Terikat Pos Biaya --', sublabel: 'Aturan transaksi bersifat umum' },
                            ...feeTypes.map((f) => ({
                              value: f.id,
                              label: f.name,
                              sublabel: `Pola: ${f.billing_pattern}`
                            }))
                          ]}
                          value={formData.related_fee_type_id || ''}
                          onChange={(val) => setFormData({ ...formData, related_fee_type_id: val ? Number(val) : '' })}
                          placeholder="-- Tidak Ada --"
                          searchPlaceholder="Cari jenis biaya..."
                          menuMinWidth="max(100%, 320px)"
                        />
                      </div>
                    ) : (
                      <div className="opacity-50 pointer-events-none">
                        <label className="block text-xs font-semibold text-slate-400 mb-1">Pos Biaya Terkait</label>
                        <div className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-400 italic">
                          Hanya untuk Kas Masuk / Keluar
                        </div>
                      </div>
                    )}

                    {/* Kategori Belanja Terkait: hanya jika pengurangan_kas */}
                    {formData.transaction_type === 'pengurangan_kas' ? (
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Kategori Belanja Terkait</label>
                        <SearchableSelect
                          options={[
                            { value: '', label: '-- Tidak Terikat Kategori --', sublabel: 'Tanpa keterikatan pos belanja spesifik' },
                            ...categories.map((c) => ({
                              value: c.id,
                              label: c.name,
                              sublabel: `Jenis: ${c.category_kind === 'special_income' ? 'Pemasukan Khusus' : 'Pengeluaran'}`
                            }))
                          ]}
                          value={formData.related_transaction_category_id || ''}
                          onChange={(val) => setFormData({ ...formData, related_transaction_category_id: val ? Number(val) : '' })}
                          placeholder="-- Tidak Ada --"
                          searchPlaceholder="Cari kategori belanja..."
                          menuMinWidth="max(100%, 320px)"
                        />
                      </div>
                    ) : (
                      <div className="opacity-50 pointer-events-none">
                        <label className="block text-xs font-semibold text-slate-400 mb-1">Kategori Belanja</label>
                        <div className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-400 italic">
                          Hanya untuk Pengeluaran Kas
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* Form Input Tab: Fee Types */}
              {activeTab === 'fee_types' && (
                <>
                  {Boolean(formData.is_system) && (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5 text-amber-900 text-xs">
                      <Lock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold">Variabel Default Terkunci Sistem</p>
                        <p className="text-[11px] text-amber-700 mt-0.5">
                          Jenis biaya ini digunakan oleh <strong>Modul Layanan Laundry</strong> untuk perhitungan otomatis tagihan kelebihan laundry santri/siswa. Nama dan pola penagihan dikunci oleh sistem. Anda tetap dapat mengatur Akun Pendapatan (COA) dan Keterangan.
                        </p>
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                      <span>Nama Jenis Biaya *</span>
                      {Boolean(formData.is_system) && (
                        <span className="text-[10px] text-amber-700 font-medium flex items-center gap-1">
                          <Lock className="w-2.5 h-2.5" /> Nama Dikunci Sistem
                        </span>
                      )}
                    </label>
                    <input
                      type="text"
                      required
                      disabled={Boolean(formData.is_system)}
                      value={formData.name || ''}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Contoh: SPP Bulanan 2026/2027"
                      className={`w-full px-3 py-2 border rounded-xl text-xs ${
                        formData.is_system
                          ? 'bg-slate-100 border-slate-200 text-slate-600 cursor-not-allowed font-medium'
                          : 'bg-slate-50 border-slate-200 text-slate-800'
                      }`}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                      <span>Pola Penagihan *</span>
                      {Boolean(formData.is_system) && (
                        <span className="text-[10px] text-amber-700 font-medium flex items-center gap-1">
                          <Lock className="w-2.5 h-2.5" /> Pola Dikunci Sistem
                        </span>
                      )}
                    </label>
                    {formData.is_system ? (
                      <div className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-700 flex items-center justify-between">
                        <span className="font-medium">
                          {formData.billing_pattern === 'monthly'
                            ? 'Bulanan (Monthly)'
                            : formData.billing_pattern === 'yearly'
                            ? 'Tahunan (Yearly)'
                            : 'Insidental / Sekali Bayar (Incidental)'}
                        </span>
                        <Lock className="w-3.5 h-3.5 text-slate-400" />
                      </div>
                    ) : (
                      <SearchableSelect
                        options={[
                          { value: 'monthly', label: 'Bulanan (Monthly)', sublabel: 'Ditagihkan rutin tiap bulan' },
                          { value: 'yearly', label: 'Tahunan (Yearly)', sublabel: 'Ditagihkan 1x per tahun ajaran' },
                          { value: 'incidental', label: 'Insidental / Sekali Bayar (Incidental)', sublabel: 'Ditagihkan fleksibel / per kejadian' }
                        ]}
                        value={formData.billing_pattern || 'monthly'}
                        onChange={(val) => setFormData({ ...formData, billing_pattern: val })}
                        placeholder="Pilih Pola Penagihan"
                      />
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Akun Pendapatan Terkait (COA)</label>
                    <SearchableSelect
                      options={[
                        { value: '', label: '-- Default (SPP Siswa) --', sublabel: 'Gunakan akun pendapatan umum' },
                        ...cleanCoaList
                          .filter((a) => a.account_group === 'pendapatan' || a.account_group === 'revenue' || a.account_code?.startsWith('6'))
                          .map((a) => ({
                            value: a.id,
                            label: `[${a.account_code}] ${a.account_name}`,
                            sublabel: 'Akun Pendapatan'
                          }))
                      ]}
                      value={formData.related_revenue_account_id || ''}
                      onChange={(val) => setFormData({ ...formData, related_revenue_account_id: val ? Number(val) : '' })}
                      placeholder="-- Pilih Akun Pendapatan --"
                      searchPlaceholder="Cari kode atau nama akun pendapatan..."
                    />
                    <p className="text-[10px] text-slate-400 mt-1">
                      Akun pendapatan spesifik yang dikreditkan saat tagihan jenis biaya ini diterbitkan.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Aturan Transaksi Penagihan (Non-Kas / Piutang) */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Aturan Penagihan (Piutang) *</label>
                      <SearchableSelect
                        options={[
                          { value: '', label: '-- Default (student_bill_issued) --', sublabel: 'Non-Kas: Debit Piutang, Kredit Pendapatan' },
                          ...transactionRules
                            .filter((r) => r.is_active && (r.transaction_type === 'non_kas' || r.transaction_code.includes('bill')))
                            .map((r) => ({
                              value: r.id,
                              label: `[${r.transaction_code}] ${r.transaction_label}`,
                              sublabel: `Debit: ${r.debit_account_code || r.debit_account_name || '-'} • Kredit: ${r.credit_account_code || r.credit_account_name || '-'}`
                            }))
                        ]}
                        value={formData.billing_account_mapping_id || ''}
                        onChange={(val) => setFormData({ ...formData, billing_account_mapping_id: val ? Number(val) : '' })}
                        placeholder="-- Pilih Aturan Penagihan --"
                        searchPlaceholder="Cari aturan penagihan..."
                      />
                    </div>

                    {/* Aturan Diskon Penagihan */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Aturan Diskon Penagihan *</label>
                      <SearchableSelect
                        options={[
                          { value: '', label: '-- Default (student_bill_discount) --', sublabel: 'Non-Kas: Debit Beban Diskon, Kredit Piutang' },
                          ...transactionRules
                            .filter((r) => r.is_active && (r.transaction_code.includes('discount') || r.transaction_type === 'non_kas'))
                            .map((r) => ({
                              value: r.id,
                              label: `[${r.transaction_code}] ${r.transaction_label}`,
                              sublabel: `Debit: ${r.debit_account_code || r.debit_account_name || '-'} • Kredit: ${r.credit_account_code || r.credit_account_name || '-'}`
                            }))
                        ]}
                        value={formData.billing_discount_account_mapping_id || ''}
                        onChange={(val) => setFormData({ ...formData, billing_discount_account_mapping_id: val ? Number(val) : '' })}
                        placeholder="-- Pilih Aturan Diskon Penagihan --"
                        searchPlaceholder="Cari aturan diskon penagihan..."
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Aturan Transaksi Pembayaran (Kas Masuk) */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Aturan Pembayaran (Kas Masuk) *</label>
                      <SearchableSelect
                        options={[
                          { value: '', label: '-- Default (student_bill_payment) --', sublabel: 'Kas Masuk: Debit Kas/Bank, Kredit Piutang' },
                          ...transactionRules
                            .filter((r) => r.is_active && (r.transaction_type === 'penambahan_kas' || r.transaction_code.includes('pay')))
                            .map((r) => ({
                              value: r.id,
                              label: `[${r.transaction_code}] ${r.transaction_label}`,
                              sublabel: `Debit: ${r.debit_account_code || r.debit_account_name || '-'} • Kredit: ${r.credit_account_code || r.credit_account_name || '-'}`
                            }))
                        ]}
                        value={formData.payment_account_mapping_id || ''}
                        onChange={(val) => setFormData({ ...formData, payment_account_mapping_id: val ? Number(val) : '' })}
                        placeholder="-- Pilih Aturan Pembayaran --"
                        searchPlaceholder="Cari aturan pembayaran..."
                      />
                    </div>

                    {/* Aturan Diskon Pembayaran */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Aturan Diskon Pembayaran *</label>
                      <SearchableSelect
                        options={[
                          { value: '', label: '-- Default (Diskon Pelunasan) --', sublabel: 'Non-Kas: Debit Beban Diskon, Kredit Piutang' },
                          ...transactionRules
                            .filter((r) => r.is_active && (r.transaction_code.includes('discount') || r.transaction_type === 'non_kas'))
                            .map((r) => ({
                              value: r.id,
                              label: `[${r.transaction_code}] ${r.transaction_label}`,
                              sublabel: `Debit: ${r.debit_account_code || r.debit_account_name || '-'} • Kredit: ${r.credit_account_code || r.credit_account_name || '-'}`
                            }))
                        ]}
                        value={formData.payment_discount_account_mapping_id || ''}
                        onChange={(val) => setFormData({ ...formData, payment_discount_account_mapping_id: val ? Number(val) : '' })}
                        placeholder="-- Pilih Aturan Diskon Pembayaran --"
                        searchPlaceholder="Cari aturan diskon pembayaran..."
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Keterangan / Deskripsi Biaya</label>
                    <textarea
                      rows="2"
                      value={formData.description || ''}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Contoh: Iuran SPP bulanan wajib untuk seluruh siswa reguler..."
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                    />
                  </div>
                </>
              )}

              {/* Form Input Tab: Categories */}
              {activeTab === 'categories' && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Kategori Transaksi *</label>
                    <input
                      type="text"
                      required
                      value={formData.name || ''}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Contoh: Belanja Operasional Kantor"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Jenis Mutasi *</label>
                    <SearchableSelect
                      options={[
                        { value: 'expense', label: 'Pengeluaran (Beban / Belanja)', sublabel: 'Pos Anggaran Belanja' },
                        { value: 'special_income', label: 'Pemasukan Khusus / Non-SPP', sublabel: 'Pos Penerimaan Non-Siswa' }
                      ]}
                      value={formData.category_kind || 'expense'}
                      onChange={(val) => setFormData({ ...formData, category_kind: val })}
                      placeholder="Pilih Jenis Mutasi"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Akun Terkait (COA)</label>
                    <SearchableSelect
                      options={[
                        { value: '', label: '-- Tidak Ada / Otomatis --', sublabel: 'Tanpa pemetaan akun khusus' },
                        ...cleanCoaList.map((a) => ({
                          value: a.id,
                          label: `[${a.account_code}] ${a.account_name}`,
                          sublabel: `Kelompok: ${(a.account_group || '').toUpperCase()}`
                        }))
                      ]}
                      value={formData.related_account_id || ''}
                      onChange={(val) => setFormData({ ...formData, related_account_id: val ? Number(val) : '' })}
                      placeholder="-- Pilih Akun Terkait --"
                      searchPlaceholder="Cari kode atau nama akun COA..."
                    />
                  </div>
                </>
              )}

              {/* Form Input Tab: Adjustments */}
              {activeTab === 'fee_adjustments' && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Bentuk Keringanan *</label>
                    <input
                      type="text"
                      required
                      value={formData.waiver_type || ''}
                      onChange={(e) => setFormData({ ...formData, waiver_type: e.target.value })}
                      placeholder="Contoh: Beasiswa Tahfidz / Anak Guru"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Persentase Potongan (%)</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={formData.waiver_percentage || ''}
                        onChange={(e) => setFormData({ ...formData, waiver_percentage: e.target.value })}
                        placeholder="Contoh: 50"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Nominal Tetap (Rp)</label>
                      <input
                        type="number"
                        value={formData.override_amount || ''}
                        onChange={(e) => setFormData({ ...formData, override_amount: e.target.value })}
                        placeholder="Nominal pengganti"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                      />
                    </div>
                  </div>
                </>
              )}

              {/* FIELD WAJIB KETIKA EDIT: CATATAN KETERANGAN PERUBAHAN */}
              {modalMode === 'edit' && (
                <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl space-y-1.5">
                  <label className="block text-xs font-bold text-amber-900 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-amber-700" />
                    <span>Catatan / Alasan Perubahan Data * (Wajib untuk Audit Trail)</span>
                  </label>
                  <textarea
                    required
                    rows="2"
                    value={formData.edit_reason || ''}
                    onChange={(e) => setFormData({ ...formData, edit_reason: e.target.value })}
                    placeholder="Contoh: Penyesuaian nama rekening bank sesuai buku tabungan baru / koreksi klasifikasi COA..."
                    className="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                  />
                  <p className="text-[10px] text-amber-700">
                    Keterangan ini akan dicatat permanen bersama waktu dan ID akun Anda pada riwayat audit keuangan.
                  </p>
                </div>
              )}
              </div>

              <div className="flex items-center justify-end gap-2 p-4 px-5 border-t border-slate-100 shrink-0 bg-slate-50/70">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-3.5 py-2 border border-slate-200 text-slate-600 text-xs font-semibold rounded-xl hover:bg-slate-50 transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-xs disabled:opacity-50 transition"
                >
                  {submitting ? 'Menyimpan...' : modalMode === 'create' ? 'Tambah Data' : 'Simpan Perubahan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Riwayat Audit Trail / Perubahan Data */}
      {historyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 border border-slate-100 animate-in fade-in zoom-in duration-150 flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold">
                  <History className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-800">
                    Riwayat Perubahan &amp; Audit Trail
                  </h2>
                  <p className="text-[11px] text-slate-500 font-medium truncate max-w-md">
                    Entitas: <span className="font-bold text-slate-700">{historyItem?.titleLabel || historyItem?.name}</span> ({historyItem?.entityType})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setHistoryModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto pr-1 space-y-3 custom-scrollbar">
              {historyLoading ? (
                <div className="flex flex-col items-center justify-center py-12 gap-2">
                  <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
                  <p className="text-xs text-slate-400">Memuat log audit riwayat perubahan...</p>
                </div>
              ) : historyLogs.length === 0 ? (
                <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <History className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs font-semibold text-slate-600">Belum ada riwayat perubahan tercatat</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Seluruh aktivitas pembuatan, pengeditan, atau pengubahan status akan otomatis terekam di sini.
                  </p>
                </div>
              ) : (
                historyLogs.map((log) => {
                  let afterData = null;
                  let beforeData = null;
                  try {
                    afterData = typeof log.data_after === 'string' ? JSON.parse(log.data_after) : log.data_after;
                    beforeData = typeof log.data_before === 'string' ? JSON.parse(log.data_before) : log.data_before;
                  } catch {
                    afterData = log.data_after;
                    beforeData = log.data_before;
                  }

                  const reasonText = afterData?.edit_reason || afterData?.reason || log.notes || '-';

                  return (
                    <div
                      key={log.id}
                      className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl text-xs space-y-2 hover:bg-slate-50/90 transition"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-indigo-100 text-indigo-800 border border-indigo-200">
                            {log.action}
                          </span>
                          <span className="text-[11px] text-slate-500 font-medium">
                            User ID: <span className="font-semibold text-slate-700">#{log.user_id || 'System'}</span>
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-500 text-[11px]">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>{formatDateTime(log.occurred_at)}</span>
                        </div>
                      </div>

                      {/* Catatan / Keterangan Perubahan */}
                      <div className="bg-white p-2.5 rounded-lg border border-slate-200/60 text-slate-700">
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
                          Catatan / Alasan Perubahan:
                        </div>
                        <p className="text-[11px] font-medium text-slate-800 italic">
                          "{reasonText}"
                        </p>
                      </div>

                      {/* Detail Snapshot Data */}
                      {afterData && (
                        <div className="text-[10px] text-slate-500 flex flex-wrap gap-x-4 gap-y-1">
                          {afterData.name && <span>Nama: <strong className="text-slate-700">{afterData.name}</strong></span>}
                          {afterData.account_code && <span>Kode: <strong className="text-slate-700 font-mono">{afterData.account_code}</strong></span>}
                          {afterData.account_kind && <span>Jenis: <strong className="text-slate-700">{afterData.account_kind}</strong></span>}
                          {afterData.bank_name && <span>Bank: <strong className="text-slate-700">{afterData.bank_name} ({afterData.bank_account_number})</strong></span>}
                          {afterData.is_active !== undefined && (
                            <span>Status: <strong className={afterData.is_active ? 'text-emerald-700' : 'text-slate-500'}>{afterData.is_active ? 'Aktif' : 'Non-aktif'}</strong></span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end mt-4 shrink-0">
              <button
                type="button"
                onClick={() => setHistoryModalOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-xl shadow-xs transition"
              >
                Tutup Riwayat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Override Struktural Aturan Sistem (Khusus Super Admin) */}
      {overrideModalOpen && selectedRuleForOverride && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 border border-slate-100 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div>
                <h2 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-indigo-600" />
                  Override Struktural Aturan Sistem
                </h2>
                <p className="text-[11px] text-slate-400">
                  Kode: <strong className="font-mono text-indigo-700">{selectedRuleForOverride.transaction_code}</strong>
                </p>
              </div>
              <button type="button" onClick={() => setOverrideModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleOverrideSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nama / Label Aturan</label>
                <input
                  type="text"
                  required
                  value={overrideFormData.transaction_label || ''}
                  onChange={(e) => setOverrideFormData({ ...overrideFormData, transaction_label: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Akun Debit</label>
                  <SearchableSelect
                    options={[
                      { value: '', label: '-- Akun Dinamis / Default --', sublabel: 'Mengikuti aturan bawaan sistem' },
                      ...cleanCoaList.map((a) => ({
                        value: a.id,
                        label: `[${a.account_code}] ${a.account_name}`,
                        sublabel: `Kelompok: ${(a.account_group || '').toUpperCase()}`
                      }))
                    ]}
                    value={overrideFormData.debit_account_id || ''}
                    onChange={(val) => setOverrideFormData({ ...overrideFormData, debit_account_id: val ? Number(val) : '' })}
                    placeholder="-- Akun Dinamis / Default --"
                    searchPlaceholder="Cari akun debit..."
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Akun Kredit</label>
                  <SearchableSelect
                    options={[
                      { value: '', label: '-- Akun Dinamis / Default --', sublabel: 'Mengikuti aturan bawaan sistem' },
                      ...cleanCoaList.map((a) => ({
                        value: a.id,
                        label: `[${a.account_code}] ${a.account_name}`,
                        sublabel: `Kelompok: ${(a.account_group || '').toUpperCase()}`
                      }))
                    ]}
                    value={overrideFormData.credit_account_id || ''}
                    onChange={(val) => setOverrideFormData({ ...overrideFormData, credit_account_id: val ? Number(val) : '' })}
                    placeholder="-- Akun Dinamis / Default --"
                    searchPlaceholder="Cari akun kredit..."
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Kas Default (Opsional)</label>
                <SearchableSelect
                  options={[
                    { value: '', label: '-- Fleksibel / Mengikuti Transaksi --', sublabel: 'Tanpa penguncian dompet kas' },
                    ...cashAccounts.map((c) => ({
                      value: c.id,
                      label: c.name,
                      sublabel: c.account_kind === 'bank' ? `${c.bank_name} (${c.bank_account_number})` : 'Kas Tunai / Fisik'
                    }))
                  ]}
                  value={overrideFormData.default_cash_account_id || ''}
                  onChange={(val) => setOverrideFormData({ ...overrideFormData, default_cash_account_id: val ? Number(val) : '' })}
                  placeholder="-- Fleksibel / Mengikuti Transaksi --"
                  searchPlaceholder="Cari dompet kas..."
                />
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-1.5">
                <label className="block text-xs font-bold text-amber-900 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-700" />
                  Alasan Override Struktural * (Wajib untuk Audit Log)
                </label>
                <textarea
                  required
                  rows="2"
                  value={overrideFormData.reason || ''}
                  onChange={(e) => setOverrideFormData({ ...overrideFormData, reason: e.target.value })}
                  placeholder="Contoh: Mengalihkan akun debit ke Piutang Khusus berdasarkan arahan rapat yayasan..."
                  className="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-amber-500/30"
                />
                <p className="text-[10px] text-amber-700">
                  Perubahan struktural pada aturan sistem akan dicatat sebagai aksi OVERRIDE_SYSTEM_TRANSACTION_RULE.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 mt-4">
                <button
                  type="button"
                  onClick={() => setOverrideModalOpen(false)}
                  className="px-3.5 py-2 border border-slate-200 text-slate-600 text-xs font-semibold rounded-xl hover:bg-slate-50 transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-xs disabled:opacity-50 transition"
                >
                  {submitting ? 'Menerapkan...' : 'Terapkan Override'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Form Pemindahan Kas (Mutasi Internal Antar Dompet/Rekening) */}
      {transferModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 border border-slate-100 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div>
                <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                    <ArrowRightLeft className="w-4 h-4" />
                  </div>
                  <span>Pemindahan Saldo Antar Kas</span>
                </h2>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Mutasi pergeseran likuiditas internal antar dompet fisik atau rekening bank
                </p>
              </div>
              <button
                type="button"
                onClick={() => setTransferModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Notice Sumber Dana */}
            <div className="bg-indigo-50/70 border border-indigo-200/80 rounded-xl p-3 text-[11px] text-indigo-900 flex items-start gap-2.5 mb-4">
              <Info className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <span className="font-bold text-indigo-950">Integritas Saldo Sumber Dana:</span>
                <p className="leading-relaxed text-indigo-800">
                  Pemindahan ini hanya memindahkan saldo antar dompet kas lembaga dan <strong>TIDAK mempengaruhi total saldo sumber dana</strong>. Jurnal akuntansi berpasangan (Kas Tujuan [Debit] &bull; Kas Asal [Kredit]) akan tercatat secara otomatis.
                </p>
              </div>
            </div>

            <form onSubmit={handleTransferSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Kas Asal */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Kas / Rekening Asal (Dari) *</label>
                  <SearchableSelect
                    options={cashAccounts.map((c) => ({
                      value: c.id,
                      label: c.name,
                      sublabel: `Saldo: ${formatCurrency(c.current_balance ?? c.opening_balance)} • ${c.account_kind === 'bank' ? c.bank_name : 'Tunai'}`
                    }))}
                    value={transferFormData.from_cash_account_id || ''}
                    onChange={(val) => setTransferFormData({ ...transferFormData, from_cash_account_id: val ? Number(val) : '' })}
                    placeholder="-- Pilih Kas Asal --"
                    searchPlaceholder="Cari kas asal..."
                  />
                </div>

                {/* Kas Tujuan */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Kas / Rekening Tujuan (Ke) *</label>
                  <SearchableSelect
                    options={cashAccounts
                      .filter((c) => String(c.id) !== String(transferFormData.from_cash_account_id))
                      .map((c) => ({
                        value: c.id,
                        label: c.name,
                        sublabel: `Saldo: ${formatCurrency(c.current_balance ?? c.opening_balance)} • ${c.account_kind === 'bank' ? c.bank_name : 'Tunai'}`
                      }))}
                    value={transferFormData.to_cash_account_id || ''}
                    onChange={(val) => setTransferFormData({ ...transferFormData, to_cash_account_id: val ? Number(val) : '' })}
                    placeholder="-- Pilih Kas Tujuan --"
                    searchPlaceholder="Cari kas tujuan..."
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Tanggal Pemindahan */}
                <div>
                  <DatePickerField
                    label="Tanggal Pemindahan *"
                    value={transferFormData.transfer_date || ''}
                    onChange={(isoStr) => setTransferFormData({ ...transferFormData, transfer_date: isoStr })}
                    placeholder="DD/MM/YYYY"
                  />
                </div>

                {/* Nominal Pemindahan */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Nominal Pemindahan (Rp) *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={transferFormData.amount || ''}
                    onChange={(e) => setTransferFormData({ ...transferFormData, amount: e.target.value })}
                    placeholder="Contoh: 5000000"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                  />
                  {transferFormData.amount && (
                    <p className="text-[10px] text-emerald-700 font-semibold font-mono mt-1">
                      {formatCurrency(parseFloat(transferFormData.amount) || 0)}
                    </p>
                  )}
                </div>
              </div>

              {/* Nomor Referensi / Slip Bukti */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nomor Referensi / Slip Bukti (Opsional)</label>
                <input
                  type="text"
                  value={transferFormData.reference_number || ''}
                  onChange={(e) => setTransferFormData({ ...transferFormData, reference_number: e.target.value })}
                  placeholder="Contoh: SLIP-TRF-0826 / BUKTI-ATM-991"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              {/* Keterangan / Alasan Pemindahan */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Keterangan / Alasan Pemindahan *</label>
                <textarea
                  required
                  rows="2"
                  value={transferFormData.reason || ''}
                  onChange={(e) => setTransferFormData({ ...transferFormData, reason: e.target.value })}
                  placeholder="Contoh: Pengisian kas kecil bendahara / pemindahan penerimaan SPP ke rekening operasional..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 mt-4">
                <button
                  type="button"
                  onClick={() => setTransferModalOpen(false)}
                  className="px-3.5 py-2 border border-slate-200 text-slate-600 text-xs font-semibold rounded-xl hover:bg-slate-50 transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={transferSubmitting}
                  className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-xs disabled:opacity-50 transition"
                >
                  <ArrowRightLeft className="w-3.5 h-3.5" />
                  <span>{transferSubmitting ? 'Memproses...' : 'Proses Pemindahan Kas'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Riwayat Pemindahan Kas (Mutasi Internal) */}
      {transferHistoryOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[85vh] flex flex-col border border-slate-100 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 shrink-0">
              <div>
                <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                    <History className="w-4 h-4" />
                  </div>
                  <span>Riwayat Pemindahan Saldo Antar Kas</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Daftar seluruh mutasi pergeseran likuiditas internal dan jurnal otomatis terkait
                </p>
              </div>
              <button
                type="button"
                onClick={() => setTransferHistoryOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto flex-1">
              {transfersLoading ? (
                <div className="flex flex-col items-center justify-center py-16 gap-2">
                  <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
                  <p className="text-xs text-slate-400">Memuat riwayat pemindahan kas...</p>
                </div>
              ) : transfersList.length === 0 ? (
                <div className="text-center py-16 text-slate-400 flex flex-col items-center gap-2">
                  <ArrowRightLeft className="w-8 h-8 text-slate-300 stroke-[1.5]" />
                  <p className="text-xs">Belum ada catatan transaksi pemindahan kas internal.</p>
                </div>
              ) : (
                <div className="overflow-x-auto border border-slate-100 rounded-xl">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-3">No. Bukti Mutasi</th>
                        <th className="px-4 py-3">Tanggal</th>
                        <th className="px-4 py-3">Kas Asal (Dari)</th>
                        <th className="px-4 py-3">Kas Tujuan (Ke)</th>
                        <th className="px-4 py-3 text-right">Nominal (Rp)</th>
                        <th className="px-4 py-3">No. Jurnal</th>
                        <th className="px-4 py-3">Keterangan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {transfersList.map((t) => (
                        <tr key={t.id} className="hover:bg-slate-50/60 transition">
                          <td className="px-4 py-3 font-mono font-bold text-indigo-700">
                            {t.transfer_number}
                          </td>
                          <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                            {t.transfer_date}
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-semibold text-slate-800">{t.from_cash_account_name}</div>
                            {t.from_bank_name && (
                              <div className="text-[10px] text-slate-400">{t.from_bank_name} ({t.from_bank_account_number})</div>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-semibold text-emerald-800">{t.to_cash_account_name}</div>
                            {t.to_bank_name && (
                              <div className="text-[10px] text-slate-400">{t.to_bank_name} ({t.to_bank_account_number})</div>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right font-mono font-bold text-slate-800 whitespace-nowrap">
                            {formatCurrency(t.amount)}
                          </td>
                          <td className="px-4 py-3 font-mono text-[11px] text-slate-600">
                            {t.journal_number ? (
                              <span className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded border border-slate-200">
                                {t.journal_number}
                              </span>
                            ) : (
                              <span className="text-slate-400 italic text-[10px]">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-slate-600 max-w-xs">
                            <p className="line-clamp-2">{t.reason}</p>
                            {t.reference_number && (
                              <span className="text-[10px] text-slate-400 font-mono">Ref: {t.reference_number}</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/50">
              <span className="text-xs text-slate-400">Total {transfersList.length} transaksi mutasi kas</span>
              <button
                type="button"
                onClick={() => setTransferHistoryOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-xl shadow-xs transition"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
