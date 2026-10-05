import React, { useState, useEffect, useMemo } from 'react';
import api from '../../../shared/services/api';
import StatusPill from '../../../shared/components/StatusPill';
import FlatAlertBanner from '../../../shared/components/FlatAlertBanner';
import SearchableSelect from '../../../shared/components/SearchableSelect';
import DatePickerField from '../../../shared/components/DatePickerField';
import StatementMatchIndicator from '../../../shared/components/StatementMatchIndicator';
import { formatCurrency, formatDate } from '../../../shared/utils/formatters';
import {
  Wallet,
  ArrowDownCircle,
  ArrowUpCircle,
  Search,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Receipt,
  User,
  Building2,
  CreditCard,
  FileText,
  BadgeCheck,
  RotateCcw,
  Sparkles,
  BookOpen,
  Edit3,
  History,
  Clock,
  Settings,
  Sliders,
  Layers,
  Tag,
  Info,
  ChevronDown,
  ChevronUp,
  X
} from 'lucide-react';

export default function TopUpTarikTunai() {
  const [activeTab, setActiveTab] = useState('top_up'); // 'top_up' | 'withdrawal' | 'opening_balance'
  const [students, setStudents] = useState([]);
  const [cashAccounts, setCashAccounts] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [reconData, setReconData] = useState(null);
  const [reconLoading, setReconLoading] = useState(false);
  const [bankStatements, setBankStatements] = useState([]);
  const [loadingBankStatements, setLoadingBankStatements] = useState(false);

  // Accounting Config State
  const [accountingConfig, setAccountingConfig] = useState(null);
  const [loadingConfig, setLoadingConfig] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);
  const [configForm, setConfigForm] = useState({
    cash_account_id_tunai: '',
    cash_account_name_tunai: '',
    cash_account_id_bank: '',
    cash_account_name_bank: '',
    wallet_liability_coa_id: '',
    wallet_liability_coa_code: '',
    wallet_liability_coa_name: '',
    cash_coa_id: '',
    cash_coa_code: '',
    cash_coa_name: '',
    bank_coa_id: '',
    bank_coa_code: '',
    bank_coa_name: '',
    fund_source_name: 'Pos Dana Titipan Dompet Santri / SBU Kantin',
    auto_journal: true
  });
  const [configSuccessMsg, setConfigSuccessMsg] = useState(null);
  const [configErrorMsg, setConfigErrorMsg] = useState(null);

  // Form State
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [amount, setAmount] = useState('');
  const [occurredDate, setOccurredDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [occurredTime, setOccurredTime] = useState(() => new Date().toTimeString().slice(0, 5));
  const [selectedCashAccountId, setSelectedCashAccountId] = useState('');
  const [selectedBankStatementId, setSelectedBankStatementId] = useState('');
  const [fundSourceName, setFundSourceName] = useState('Pos Dana Titipan Dompet Santri / SBU Kantin');
  const [notes, setNotes] = useState('');
  const [historySearch, setHistorySearch] = useState('');
  const [historyTypeFilter, setHistoryTypeFilter] = useState('all'); // 'all' | 'top_up' | 'withdrawal' | 'opening_balance'
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Modal Edit & Revision History
  const [editingTx, setEditingTx] = useState(null);
  const [editForm, setEditForm] = useState({
    amount: '',
    occurred_date: '',
    occurred_time: '12:00',
    payment_method: 'cash',
    cash_account_id: '',
    bank_statement_id: '',
    notes: '',
    revision_reason: ''
  });
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState(null);

  const [viewingRevisionsTx, setViewingRevisionsTx] = useState(null);
  const [revisionsList, setRevisionsList] = useState([]);
  const [loadingRevisions, setLoadingRevisions] = useState(false);

  const fetchStudents = async () => {
    try {
      const res = await api.get('/kantin/canteen-students?status=active');
      const list = res.data?.data || [];
      setStudents(list);
      if (list.length > 0 && !selectedStudentId) {
        setSelectedStudentId(list[0].student_id);
      }
    } catch (err) {
      console.error('Error fetching students:', err);
    }
  };

  const fetchCashAccounts = async () => {
    try {
      const res = await api.get('/kantin/wallet-transactions/cash-accounts');
      const list = res.data?.data || [];
      setCashAccounts(list);
      if (list.length > 0 && !selectedCashAccountId) {
        const cashDefault = list.find(c => c.account_kind === 'cash') || list[0];
        setSelectedCashAccountId(String(cashDefault.id));
      }
    } catch (err) {
      console.error('Error fetching cash accounts:', err);
    }
  };

  const fetchAccountingConfig = async () => {
    setLoadingConfig(true);
    try {
      const res = await api.get('/kantin/wallet-transactions/accounting-config');
      const data = res.data?.data;
      if (data) {
        setAccountingConfig(data);
        if (data.settings) {
          setConfigForm({
            cash_account_id_tunai: data.settings.cash_account_id_tunai ? String(data.settings.cash_account_id_tunai) : '',
            cash_account_name_tunai: data.settings.cash_account_name_tunai || '',
            cash_account_id_bank: data.settings.cash_account_id_bank ? String(data.settings.cash_account_id_bank) : '',
            cash_account_name_bank: data.settings.cash_account_name_bank || '',
            wallet_liability_coa_id: data.settings.wallet_liability_coa_id ? String(data.settings.wallet_liability_coa_id) : '',
            wallet_liability_coa_code: data.settings.wallet_liability_coa_code || '',
            wallet_liability_coa_name: data.settings.wallet_liability_coa_name || '',
            cash_coa_id: data.settings.cash_coa_id ? String(data.settings.cash_coa_id) : '',
            cash_coa_code: data.settings.cash_coa_code || '',
            cash_coa_name: data.settings.cash_coa_name || '',
            bank_coa_id: data.settings.bank_coa_id ? String(data.settings.bank_coa_id) : '',
            bank_coa_code: data.settings.bank_coa_code || '',
            bank_coa_name: data.settings.bank_coa_name || '',
            fund_source_name: data.settings.fund_source_name || 'Pos Dana Titipan Dompet Santri / SBU Kantin',
            auto_journal: data.settings.auto_journal !== undefined ? data.settings.auto_journal : true
          });
          if (data.settings.fund_source_name) {
            setFundSourceName(data.settings.fund_source_name);
          }
          if (data.settings.cash_account_id_tunai && !selectedCashAccountId) {
            setSelectedCashAccountId(String(data.settings.cash_account_id_tunai));
          }
        }
      }
    } catch (err) {
      console.warn('Gagal memuat konfigurasi akuntansi dompet:', err.message);
    } finally {
      setLoadingConfig(false);
    }
  };

  const handleSaveAccountingConfig = async (e) => {
    if (e) e.preventDefault();
    setSavingConfig(true);
    setConfigErrorMsg(null);
    setConfigSuccessMsg(null);
    try {
      const res = await api.put('/kantin/wallet-transactions/accounting-config', configForm);
      const data = res.data?.data;
      if (data) {
        setAccountingConfig(data);
      }
      setConfigSuccessMsg('✅ Konfigurasi default akuntansi dompet berhasil disimpan!');
      setTimeout(() => {
        setShowConfigModal(false);
        setConfigSuccessMsg(null);
      }, 1500);
      fetchCashAccounts();
    } catch (err) {
      setConfigErrorMsg(err.response?.data?.message || err.message || 'Gagal menyimpan konfigurasi akuntansi');
    } finally {
      setSavingConfig(false);
    }
  };

  const fetchBankStatements = async (cashAccId = null, includeId = null) => {
    setLoadingBankStatements(true);
    try {
      const params = {
        dc_type: 'credit',
        is_reconciled: 0
      };
      if (cashAccId) {
        params.cash_account_id = cashAccId;
      }
      if (includeId) {
        params.include_id = includeId;
      }
      const res = await api.get('/kantin/wallet-transactions/bank-statements', { params });
      let list = res.data?.data || [];

      if (list.length === 0 && cashAccId) {
        try {
          const fallbackParams = { dc_type: 'credit', is_reconciled: 0 };
          if (includeId) fallbackParams.include_id = includeId;
          const fallbackRes = await api.get('/kantin/wallet-transactions/bank-statements', {
            params: fallbackParams
          });
          list = fallbackRes.data?.data || [];
        } catch (_) {}
      }

      setBankStatements(list);
    } catch (err) {
      console.error('Error fetching bank statements:', err);
    } finally {
      setLoadingBankStatements(false);
    }
  };

  const fetchReconData = async () => {
    setReconLoading(true);
    try {
      const res = await api.get('/kantin/wallet-transactions/reconciliation');
      setReconData(res.data?.data || null);
    } catch (err) {
      console.error('Error fetching reconciliation summary:', err);
    } finally {
      setReconLoading(false);
    }
  };

  const fetchHistory = async () => {
    setHistoryLoading(true);
    try {
      const res = await api.get('/kantin/wallet-transactions');
      setHistory(res.data?.data || []);
    } catch (err) {
      console.error('Error fetching wallet transactions:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
    fetchCashAccounts();
    fetchAccountingConfig();
    fetchHistory();
    fetchReconData();
    fetchBankStatements();
  }, []);

  // Saat rekening kas dipilih berubah, muat mutasi bank yang relevan jika bank
  const handleCashAccountChange = (accId) => {
    setSelectedCashAccountId(accId);
    const acc = cashAccounts.find(c => String(c.id) === String(accId));
    if (acc?.account_kind === 'bank') {
      fetchBankStatements(accId);
    } else {
      fetchBankStatements();
    }
  };

  const handleSelectBankStatement = (bsId) => {
    if (!bsId) {
      setSelectedBankStatementId('');
      return;
    }
    const stmt = bankStatements.find(b => String(b.id) === String(bsId));
    if (stmt) {
      setSelectedBankStatementId(String(stmt.id));
      const allocAvailable = stmt.remaining_amount !== undefined ? stmt.remaining_amount : stmt.amount;
      setAmount(String(allocAvailable || stmt.amount));
      if (stmt.cash_account_id) {
        setSelectedCashAccountId(String(stmt.cash_account_id));
      }
      if (stmt.transaction_date) {
        const d = new Date(stmt.transaction_date);
        if (!isNaN(d.getTime())) {
          setOccurredDate(d.toISOString().slice(0, 10));
          setOccurredTime(d.toTimeString().slice(0, 5));
        }
      }
      const refDetail = stmt.reference_number ? `Ref: ${stmt.reference_number}` : '';
      const descDetail = stmt.description || 'Setoran transfer rekening bank';
      setNotes(`Mutasi Bank (${stmt.bank_name || 'Bank'}): ${descDetail} ${refDetail}`.trim());
    }
  };

  // Filter Riwayat Transaksi Dompet
  const filteredHistory = useMemo(() => {
    return history.filter(tx => {
      const q = historySearch.toLowerCase().trim();
      const matchType = historyTypeFilter === 'all' || tx.transaction_type === historyTypeFilter;
      if (!q) return matchType;

      const sName = (tx.student_name || '').toLowerCase();
      const sId = String(tx.student_id || '');
      const jrn = (tx.journal_number || '').toLowerCase();
      const noteText = (tx.notes || '').toLowerCase();
      const cashAcc = (tx.cash_account_name || '').toLowerCase();
      const amt = String(tx.amount || '');
      const classGroup = (tx.class_group_name || '').toLowerCase();
      const debCoa = (tx.debit_coa_code || '').toLowerCase() + ' ' + (tx.debit_coa_name || '').toLowerCase();
      const creCoa = (tx.credit_coa_code || '').toLowerCase() + ' ' + (tx.credit_coa_name || '').toLowerCase();
      const fund = (tx.fund_source_name || '').toLowerCase();

      const matchSearch = sName.includes(q) ||
        sId.includes(q) ||
        jrn.includes(q) ||
        noteText.includes(q) ||
        cashAcc.includes(q) ||
        amt.includes(q) ||
        classGroup.includes(q) ||
        debCoa.includes(q) ||
        creCoa.includes(q) ||
        fund.includes(q);

      return matchType && matchSearch;
    });
  }, [history, historySearch, historyTypeFilter]);

  const bankStatementsOptions = useMemo(() => {
    return bankStatements.map(b => {
      const refNo = b.reference_number || b.journal_number || b.import_batch_id || '';
      const amtTotal = parseFloat(b.amount || 0);
      const amtAlloc = parseFloat(b.allocated_amount || 0);
      const amtRemaining = b.remaining_amount !== undefined ? parseFloat(b.remaining_amount) : Math.max(0, amtTotal - amtAlloc);
      const isFullyAllocated = amtRemaining <= 0.01 && amtTotal > 0;
      const amtFmt = formatCurrency(amtTotal);
      const remFmt = formatCurrency(amtRemaining);
      const allocFmt = formatCurrency(amtAlloc);
      const rawDate = b.transaction_date ? formatDate(b.transaction_date) : '';

      const searchTerms = [
        refNo,
        b.journal_number,
        b.import_batch_id,
        b.description,
        b.bank_name,
        b.bank_account_number,
        b.cash_account_name,
        String(amtTotal),
        amtFmt,
        String(amtRemaining),
        remFmt,
        rawDate,
        `#${b.id}`
      ].filter(Boolean);

      return {
        value: String(b.id),
        disabled: isFullyAllocated,
        label: `${b.bank_name || b.cash_account_name || 'Bank'} • Total: ${amtFmt} | Sisa Plafon: ${remFmt} (${rawDate || '-'})`,
        sublabel: `${isFullyAllocated ? '[TERALOKASI PENUH] ' : ''}${refNo ? `[Ref: ${refNo}] ` : ''}${b.description || 'Mutasi Bank'}${amtAlloc > 0 ? ` (Teralokasi: ${allocFmt})` : ''}`,
        badge: isFullyAllocated ? 'Penuh' : `Sisa ${remFmt}`,
        amount: amtTotal,
        allocated_amount: amtAlloc,
        remaining_amount: amtRemaining,
        rawDate,
        refNo,
        desc: b.description || `${b.bank_name || 'Bank'} - ${refNo || amtFmt}`,
        bank_name: b.bank_name,
        cash_account_id: b.cash_account_id,
        transaction_date: b.transaction_date,
        searchTerms
      };
    });
  }, [bankStatements]);

  const editBankStatementsOptions = useMemo(() => {
    return bankStatements.map(b => {
      const isCurrentSelected = String(b.id) === String(editingTx?.bank_statement_id);
      const amtTotal = parseFloat(b.amount || 0);
      const amtAlloc = parseFloat(b.allocated_amount || 0);
      const effectiveAlloc = isCurrentSelected ? Math.max(0, amtAlloc - (parseFloat(editingTx?.amount) || 0)) : amtAlloc;
      const amtRemaining = Math.max(0, amtTotal - effectiveAlloc);
      const isFullyAllocated = !isCurrentSelected && amtRemaining <= 0.01 && amtTotal > 0;
      const refNo = b.reference_number || b.journal_number || b.import_batch_id || '';
      const rawDate = b.transaction_date ? formatDate(b.transaction_date) : '';
      const amtFmt = formatCurrency(amtTotal);
      const remFmt = formatCurrency(amtRemaining);
      const allocFmt = formatCurrency(amtAlloc);

      return {
        value: String(b.id),
        disabled: isFullyAllocated,
        label: `${b.bank_name || b.cash_account_name || 'Bank'} • Total: ${amtFmt} | Sisa Plafon: ${remFmt} (${rawDate || '-'})`,
        sublabel: `${isCurrentSelected ? '[ALOKASI TRANSAKSI SAAT INI] ' : isFullyAllocated ? '[TERALOKASI PENUH] ' : ''}${refNo ? `[Ref: ${refNo}] ` : ''}${b.description || 'Mutasi Bank'}${amtAlloc > 0 ? ` (Teralokasi: ${allocFmt})` : ''}`,
        badge: isCurrentSelected ? 'Alokasi Saat Ini' : isFullyAllocated ? 'Penuh' : `Sisa ${remFmt}`,
        amount: amtTotal,
        allocated_amount: effectiveAlloc,
        remaining_amount: amtRemaining,
        rawDate,
        refNo,
        desc: b.description || `${b.bank_name || 'Bank'} - ${refNo || amtFmt}`,
        bank_name: b.bank_name,
        cash_account_id: b.cash_account_id,
        transaction_date: b.transaction_date,
        searchTerms: [
          refNo,
          b.journal_number,
          b.import_batch_id,
          b.description,
          b.bank_name,
          b.bank_account_number,
          b.cash_account_name,
          String(amtTotal),
          amtFmt,
          String(amtRemaining),
          remFmt,
          rawDate,
          `#${b.id}`
        ].filter(Boolean)
      };
    });
  }, [bankStatements, editingTx]);

  const selectedStudent = students.find(s => String(s.student_id) === String(selectedStudentId));
  const selectedCashAccount = cashAccounts.find(c => String(c.id) === String(selectedCashAccountId));
  const selectedBankStatement = bankStatements.find(b => String(b.id) === String(selectedBankStatementId));

  // Resolved Dynamic Accounting Double Entry Info for Live Preview
  const activeDebitCoa = useMemo(() => {
    const isBank = selectedCashAccount?.account_kind === 'bank';
    if (activeTab === 'top_up') {
      return {
        code: isBank ? (accountingConfig?.settings?.bank_coa_code || '10102') : (accountingConfig?.settings?.cash_coa_code || '10101'),
        name: isBank ? (accountingConfig?.settings?.bank_coa_name || 'Kas Bank Penampung') : (accountingConfig?.settings?.cash_coa_name || 'Kas Tunai Kasir')
      };
    } else if (activeTab === 'withdrawal') {
      return {
        code: accountingConfig?.settings?.wallet_liability_coa_code || '20101',
        name: accountingConfig?.settings?.wallet_liability_coa_name || 'Simpanan Dompet Santri'
      };
    }
    return { code: '10102', name: 'Kas Bank Penampung' };
  }, [activeTab, selectedCashAccount, accountingConfig]);

  const activeCreditCoa = useMemo(() => {
    const isBank = selectedCashAccount?.account_kind === 'bank';
    if (activeTab === 'top_up') {
      return {
        code: accountingConfig?.settings?.wallet_liability_coa_code || '20101',
        name: accountingConfig?.settings?.wallet_liability_coa_name || 'Simpanan Dompet Santri'
      };
    } else if (activeTab === 'withdrawal') {
      return {
        code: isBank ? (accountingConfig?.settings?.bank_coa_code || '10102') : (accountingConfig?.settings?.cash_coa_code || '10101'),
        name: isBank ? (accountingConfig?.settings?.bank_coa_name || 'Kas Bank Penampung') : (accountingConfig?.settings?.cash_coa_name || 'Kas Tunai Kasir')
      };
    }
    return { code: '20101', name: 'Simpanan Dompet Santri' };
  }, [activeTab, selectedCashAccount, accountingConfig]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setSubmitting(true);

    try {
      let endpoint = '/kantin/wallet-transactions/top-up';
      if (activeTab === 'withdrawal') {
        endpoint = '/kantin/wallet-transactions/withdrawal';
      } else if (activeTab === 'opening_balance') {
        endpoint = '/kantin/wallet-transactions/opening-balance';
      }

      const formattedTime = occurredTime ? (occurredTime.length === 5 ? `${occurredTime}:00` : occurredTime) : '12:00:00';
      const combinedDateTime = occurredDate ? `${occurredDate}T${formattedTime}` : undefined;

      const payload = {
        student_id: Number(selectedStudentId),
        amount: parseFloat(amount),
        occurred_at: combinedDateTime ? new Date(combinedDateTime).toISOString() : undefined,
        payment_method: selectedCashAccount?.account_kind === 'bank' ? 'transfer' : 'cash',
        cash_account_id: selectedCashAccountId ? Number(selectedCashAccountId) : null,
        bank_statement_id: (activeTab === 'top_up' || activeTab === 'opening_balance') && selectedBankStatementId ? Number(selectedBankStatementId) : null,
        notes: notes.trim() || (activeTab === 'opening_balance' ? 'Saldo Awal Migrasi Sistem Lama (Cutover)' : null)
      };

      const res = await api.post(endpoint, payload);
      const resData = res.data?.data;

      const jrnInfo = resData?.journal_number ? ` [Jurnal: ${resData.journal_number}]` : '';

      if (activeTab === 'opening_balance') {
        setSuccessMsg(`Saldo awal migrasi sebesar Rp${parseFloat(amount).toLocaleString('id-ID')} berhasil dicatat! Saldo dompet: Rp${resData.balance_after.toLocaleString('id-ID')}${jrnInfo}`);
      } else if (activeTab === 'top_up') {
        setSuccessMsg(`Top up sebesar Rp${parseFloat(amount).toLocaleString('id-ID')} berhasil! Saldo baru: Rp${resData.balance_after.toLocaleString('id-ID')}${jrnInfo}`);
      } else {
        setSuccessMsg(`Penarikan saldo sebesar Rp${parseFloat(amount).toLocaleString('id-ID')} berhasil! Sisa saldo: Rp${resData.balance_after.toLocaleString('id-ID')}${jrnInfo}`);
      }

      setAmount('');
      setNotes('');
      setSelectedBankStatementId('');
      fetchStudents();
      fetchHistory();
      fetchReconData();
      fetchBankStatements();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Gagal memproses transaksi dompet');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenEdit = (tx) => {
    setEditingTx(tx);
    setEditError(null);
    let datePart = '';
    let timePart = '12:00';
    if (tx.occurred_at) {
      const d = new Date(tx.occurred_at);
      if (!isNaN(d.getTime())) {
        datePart = d.toISOString().slice(0, 10);
        timePart = d.toTimeString().slice(0, 5);
      }
    }
    setEditForm({
      amount: String(tx.amount || ''),
      occurred_date: datePart || new Date().toISOString().slice(0, 10),
      occurred_time: timePart,
      payment_method: tx.payment_method || 'cash',
      cash_account_id: tx.cash_account_id ? String(tx.cash_account_id) : '',
      bank_statement_id: tx.bank_statement_id ? String(tx.bank_statement_id) : '',
      notes: tx.notes || '',
      revision_reason: ''
    });

    fetchBankStatements(tx.cash_account_id || null, tx.bank_statement_id || null);
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingTx) return;
    if (!editForm.revision_reason || editForm.revision_reason.trim().length < 3) {
      setEditError('Catatan alasan revisi wajib diisi (minimal 3 karakter)');
      return;
    }
    setEditSubmitting(true);
    setEditError(null);
    try {
      const formattedTime = editForm.occurred_time ? (editForm.occurred_time.length === 5 ? `${editForm.occurred_time}:00` : editForm.occurred_time) : '12:00:00';
      const combinedDateTime = editForm.occurred_date
        ? `${editForm.occurred_date}T${formattedTime}`
        : undefined;

      await api.put(`/kantin/wallet-transactions/${editingTx.id}`, {
        amount: parseFloat(editForm.amount),
        occurred_at: combinedDateTime ? new Date(combinedDateTime).toISOString() : undefined,
        payment_method: editForm.payment_method,
        cash_account_id: editForm.cash_account_id ? Number(editForm.cash_account_id) : null,
        bank_statement_id: editForm.bank_statement_id ? Number(editForm.bank_statement_id) : null,
        notes: editForm.notes.trim() || null,
        revision_reason: editForm.revision_reason.trim()
      });
      setEditingTx(null);
      setSuccessMsg(`Transaksi #${editingTx.id} berhasil direvisi! Catatan revisi telah disimpan di log audit.`);
      fetchHistory();
      fetchReconData();
      fetchStudents();
    } catch (err) {
      setEditError(err.response?.data?.message || err.message || 'Gagal menyimpan revisi transaksi');
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleOpenRevisions = async (tx) => {
    setViewingRevisionsTx(tx);
    setLoadingRevisions(true);
    try {
      const res = await api.get(`/kantin/wallet-transactions/${tx.id}/revisions`);
      setRevisionsList(res.data?.data || []);
    } catch (err) {
      console.error('Error loading revisions:', err);
      setRevisionsList([]);
    } finally {
      setLoadingRevisions(false);
    }
  };

  const quickAmounts = [10000, 20000, 50000, 100000, 200000, 500000];

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800 tracking-tight flex items-center gap-2.5">
            <span>Manajemen Saldo Dompet Santri</span>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-300 text-emerald-800 font-semibold text-xs">
              <BookOpen className="w-3 h-3 text-emerald-600" />
              <span>Terintegrasi Buku Besar &amp; Jurnal Keuangan</span>
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Layanan setoran top-up saldo cashless santri dan penarikan tunai dengan auto-journaling ganda (SBU Kantin &amp; Keuangan)
          </p>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto flex-wrap">
          {/* Tombol Setelan Akuntansi Dompet */}
          <button
            type="button"
            onClick={() => setShowConfigModal(true)}
            className="px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold shadow-xs flex items-center gap-1.5 transition cursor-pointer"
          >
            <Settings className="w-3.5 h-3.5 text-emerald-600" />
            <span>Setelan Akuntansi Dompet</span>
            {accountingConfig?.settings?.auto_journal && (
              <span className="w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-emerald-100" title="Auto-Journal Aktif" />
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              fetchReconData();
              fetchHistory();
              fetchAccountingConfig();
            }}
            disabled={reconLoading}
            className="px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold shadow-xs flex items-center gap-2 transition cursor-pointer disabled:opacity-50"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${reconLoading ? 'animate-spin text-emerald-600' : 'text-slate-500'}`} />
            <span>Audit &amp; Sinkronisasi Ulang</span>
          </button>
        </div>
      </div>

      {/* Widget Monitoring & Rekonsiliasi Saldo Agregat Antar-Modul */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-850 to-slate-900 border border-slate-700/80 rounded-2xl p-5 text-white shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-slate-700/60 gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400 font-bold">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <span>Monitoring &amp; Rekonsiliasi Real-Time Dompet Santri</span>
              </h3>
              <p className="text-[11px] text-slate-400">
                Penyandingan otomatis saldo kartu di Database Kantin vs Pos Dana &amp; Buku Besar di Database Keuangan
              </p>
            </div>
          </div>

          <div>
            {reconLoading ? (
              <span className="px-3 py-1 bg-slate-800 border border-slate-600 rounded-full text-[11px] text-slate-300 flex items-center gap-1.5">
                <Loader2 className="w-3 h-3 animate-spin text-emerald-400" />
                <span>Memeriksa saldo...</span>
              </span>
            ) : reconData?.reconciliation?.is_balanced ? (
              <span className="px-3 py-1 bg-emerald-500/15 border border-emerald-400/40 rounded-full text-[11px] text-emerald-300 font-bold flex items-center gap-1.5">
                <BadgeCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>100% SINKRON &amp; BALANCE</span>
              </span>
            ) : (
              <span className="px-3 py-1 bg-amber-500/20 border border-amber-400/40 rounded-full text-[11px] text-amber-300 font-bold flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                <span>SELISIH: Rp {Math.abs(reconData?.reconciliation?.difference_fund || 0).toLocaleString('id-ID')}</span>
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
          {/* Box 1: Total Saldo Kartu Santri (Kantin) */}
          <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl p-3.5">
            <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400 flex items-center justify-between">
              <span>Saldo Seluruh Kartu Santri</span>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-700 text-slate-300 font-normal">DB Kantin</span>
            </div>
            <div className="text-lg font-black text-amber-400 mt-1 font-mono">
              Rp {reconData ? (reconData.canteen?.total_balance || 0).toLocaleString('id-ID') : '-'}
            </div>
            <div className="text-[10px] text-slate-400 mt-1 flex items-center justify-between">
              <span>{reconData?.canteen?.active_wallets_count || 0} Santri Saldo Aktif</span>
              <span>Total: {reconData?.canteen?.total_students || 0} Santri</span>
            </div>
          </div>

          {/* Box 2: Saldo Pos Dana Keuangan */}
          <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl p-3.5">
            <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400 flex items-center justify-between">
              <span>Saldo Pos Sumber Dana</span>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-950 border border-emerald-800 text-emerald-300 font-normal">
                {accountingConfig?.settings?.fund_source_name ? 'Terkonfigurasi' : 'canteen_wallet'}
              </span>
            </div>
            <div className="text-lg font-black text-emerald-400 mt-1 font-mono">
              Rp {reconData ? (reconData.keuangan?.fund_balance || 0).toLocaleString('id-ID') : '-'}
            </div>
            <div className="text-[10px] text-slate-400 mt-1 truncate">
              {accountingConfig?.settings?.fund_source_name || 'Alokasi Hak Dana Titipan di DB Keuangan'}
            </div>
          </div>

          {/* Box 3: Saldo Liabilitas Buku Besar COA */}
          <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl p-3.5">
            <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400 flex items-center justify-between">
              <span>Buku Besar Akun Titipan</span>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-950 border border-cyan-800 text-cyan-300 font-normal">
                COA {accountingConfig?.settings?.wallet_liability_coa_code || reconData?.keuangan?.coa_code || '20101'}
              </span>
            </div>
            <div className="text-lg font-black text-cyan-400 mt-1 font-mono">
              Rp {reconData ? (reconData.keuangan?.coa_net_balance || 0).toLocaleString('id-ID') : '-'}
            </div>
            <div className="text-[10px] text-slate-400 mt-1">
              {reconData?.keuangan?.journal_lines_count || 0} Baris Jurnal Diposting
            </div>
          </div>

          {/* Box 4: Aktivitas Hari Ini */}
          <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl p-3.5">
            <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400 flex items-center justify-between">
              <span>Transaksi Hari Ini</span>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-700 text-slate-300 font-normal">Real-Time</span>
            </div>
            <div className="mt-1 space-y-0.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 text-[10px]">Top Up:</span>
                <span className="font-bold text-emerald-400 font-mono text-[11px]">
                  +{reconData?.canteen?.today_topup_count || 0} (Rp {(reconData?.canteen?.today_topup_amount || 0).toLocaleString('id-ID')})
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 text-[10px]">Tarik:</span>
                <span className="font-bold text-amber-400 font-mono text-[11px]">
                  -{reconData?.canteen?.today_withdrawal_count || 0} (Rp {(reconData?.canteen?.today_withdrawal_amount || 0).toLocaleString('id-ID')})
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Form Transaksi Dompet (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-4">
          <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 rounded-xl text-xs font-bold">
            <button
              type="button"
              onClick={() => {
                setActiveTab('top_up');
                setError(null);
                setSuccessMsg(null);
              }}
              className={`py-2 rounded-xl transition flex items-center justify-center gap-1 cursor-pointer ${
                activeTab === 'top_up'
                  ? 'bg-white text-emerald-800 shadow-xs'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <ArrowDownCircle className="w-3.5 h-3.5 text-emerald-600" />
              <span>Top Up</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('withdrawal');
                setError(null);
                setSuccessMsg(null);
              }}
              className={`py-2 rounded-xl transition flex items-center justify-center gap-1 cursor-pointer ${
                activeTab === 'withdrawal'
                  ? 'bg-white text-amber-800 shadow-xs'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <ArrowUpCircle className="w-3.5 h-3.5 text-amber-600" />
              <span>Tarik Tunai</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('opening_balance');
                setError(null);
                setSuccessMsg(null);
              }}
              className={`py-2 rounded-xl transition flex items-center justify-center gap-1 cursor-pointer ${
                activeTab === 'opening_balance'
                  ? 'bg-white text-indigo-800 shadow-xs'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              <span>Saldo Awal</span>
            </button>
          </div>

          {activeTab === 'opening_balance' && (
            <div className="p-3.5 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-950 text-xs flex items-start gap-2.5 shadow-2xs">
              <Sparkles className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <p className="font-bold text-indigo-900">Mode Pencatatan Saldo Awal (Cutover Migrasi)</p>
                <p className="text-[11px] text-indigo-800 leading-relaxed">
                  Pencatatan ini murni mengisi saldo kartu digital santri dari data lama tanpa mendebit ulang kas/bank. Uang fisik/rekening sudah tersimpan pada Saldo Awal Kas BNI (Modul Keuangan), sehingga saldo kas Anda tetap aman dan tidak mengalami duplikasi.
                </p>
              </div>
            </div>
          )}

          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Pilih Santri */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Pilih Santri</label>
              <SearchableSelect
                options={students.map(s => ({
                  value: String(s.student_id),
                  label: s.student_name,
                  sublabel: `${s.class_group_name || ''} • Saldo: Rp${(s.wallet_balance || 0).toLocaleString('id-ID')}`,
                }))}
                value={String(selectedStudentId)}
                onChange={(val) => setSelectedStudentId(val)}
                placeholder="-- Cari & Pilih Santri --"
                searchPlaceholder="Ketik nama atau kelas santri..."
                emptyText="Santri tidak ditemukan"
              />
            </div>

            {/* Info Card Saldo Santri */}
            {selectedStudent && (
              <div className="p-4 rounded-xl bg-gradient-to-r from-slate-900 to-slate-800 text-white flex items-center justify-between shadow-xs">
                <div>
                  <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Saldo Dompet Saat Ini</p>
                  <h3 className="text-xl font-extrabold text-amber-400 mt-0.5 font-mono">
                    Rp{selectedStudent.wallet_balance.toLocaleString('id-ID')}
                  </h3>
                </div>
                <div className="text-right text-[11px] text-slate-300">
                  <p className="font-bold text-white text-xs">{selectedStudent.student_name}</p>
                  <p className="text-slate-400 text-[10px]">{selectedStudent.class_group_name}</p>
                </div>
              </div>
            )}

            {/* Input Nominal */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Nominal (Rp)</label>
              <input
                type="number"
                required
                min={1000}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Contoh: 50000"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold font-mono focus:outline-hidden focus:border-emerald-500 focus:bg-white transition"
              />
              {/* Quick buttons */}
              <div className="grid grid-cols-6 gap-1.5 mt-2">
                {quickAmounts.map(q => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => setAmount(q)}
                    className="py-1 text-[10px] font-bold bg-slate-100 hover:bg-emerald-100 hover:text-emerald-900 rounded-lg text-slate-600 transition cursor-pointer"
                  >
                    {q >= 1000000 ? `${q / 1000000}M` : `${q / 1000}k`}
                  </button>
                ))}
              </div>
            </div>

            {/* Tanggal & Waktu Transaksi */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
              <div className="sm:col-span-8">
                <DatePickerField
                  label="Tanggal Transaksi *"
                  value={occurredDate}
                  onChange={(isoStr) => setOccurredDate(isoStr)}
                  onTimeExtracted={(timeStr) => {
                    if (timeStr) setOccurredTime(timeStr.slice(0, 5));
                  }}
                  placeholder="DD/MM/YYYY"
                  required
                  align="auto"
                />
              </div>
              <div className="sm:col-span-4">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Jam / Waktu
                </label>
                <input
                  type="time"
                  value={occurredTime}
                  onChange={(e) => setOccurredTime(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs focus:outline-hidden focus:border-emerald-500 focus:bg-white transition"
                />
              </div>
            </div>

            {/* Pilihan Rekening Kas / Bank Penerima */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  {activeTab === 'top_up' ? 'Rekening Kas / Bank Penerima' : 'Kas / Bank Sumber Penarikan'}
                </label>
                <span className="text-[10px] text-slate-400 font-medium">
                  {selectedCashAccount?.account_kind === 'bank' ? 'Transfer Bank' : 'Kas Tunai'}
                </span>
              </div>

              <SearchableSelect
                options={cashAccounts.map(c => ({
                  value: String(c.id),
                  label: c.account_kind === 'bank' && c.bank_account_number
                    ? `${c.name} (${c.bank_name || 'Bank'} - ${c.bank_account_number})`
                    : `${c.name} (Kas Tunai)`,
                  sublabel: `${c.account_kind === 'bank' ? 'Transfer Bank' : 'Kas Tunai Langsung'}${c.coa_code ? ` • COA ${c.coa_code}` : ''}`,
                  badge: c.coa_code ? `COA ${c.coa_code}` : (c.account_kind === 'bank' ? 'Bank' : 'Tunai')
                }))}
                value={String(selectedCashAccountId)}
                onChange={(val) => handleCashAccountChange(val)}
                placeholder="-- Cari & Pilih Rekening Kas / Bank --"
                searchPlaceholder="Ketik nama akun, bank, atau no rekening..."
                emptyText="Rekening kas/bank tidak ditemukan"
                allowClear={false}
              />
            </div>

            {/* Referensi Mutasi Rekening Koran */}
            {activeTab === 'top_up' && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-bold text-slate-600 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <CreditCard className="w-3.5 h-3.5 text-blue-600" />
                      <span>Referensi Mutasi Rekening Koran</span>
                    </span>
                    <span className="text-[10px] text-slate-400 font-normal">(Multi-Transaksi / Parsial OK)</span>
                  </label>
                  {selectedBankStatementId && (
                    <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                      <BadgeCheck className="w-3 h-3" />
                      <span>Terkait Rekening Koran</span>
                    </span>
                  )}
                </div>

                <SearchableSelect
                  options={bankStatementsOptions}
                  value={String(selectedBankStatementId)}
                  onChange={(val) => handleSelectBankStatement(val)}
                  placeholder="-- Cari & Pilih Mutasi Rekening Koran (Ref, Nominal, Tgl) --"
                  searchPlaceholder="Ketik no referensi, nominal transfer, bank, atau berita transfer..."
                  accentColor="emerald"
                  allowClear={true}
                  isLoading={loadingBankStatements}
                  emptyText={loadingBankStatements ? 'Memuat mutasi...' : 'Tidak ada mutasi rekening koran yang tersedia'}
                />

                {(() => {
                  const selectedOpt = bankStatementsOptions.find(o => String(o.value) === String(selectedBankStatementId));
                  if (!selectedOpt) return null;
                  return (
                    <div className="p-2.5 bg-emerald-50/80 border border-emerald-200/80 rounded-xl text-[10.5px] space-y-2 text-slate-700 animate-in fade-in duration-150">
                      <div className="flex items-center justify-between font-semibold gap-2">
                        <span className="text-emerald-900 font-bold flex items-center gap-1 min-w-0">
                          <span>🔗 RK Terpilih:</span>
                          <span className="truncate">{selectedOpt.desc}</span>
                        </span>
                        <span className="tnum text-emerald-800 font-bold shrink-0">
                          Plafon: {formatCurrency(selectedOpt.amount)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-slate-500 text-[10px] gap-2">
                        <span>
                          Tgl Mutasi Bank: <b className="text-slate-800 tnum">{selectedOpt.rawDate || '-'}</b> {selectedOpt.refNo ? `• Ref: ${selectedOpt.refNo}` : ''} • Teralokasi: <b>{formatCurrency(selectedOpt.allocated_amount || 0)}</b>
                        </span>
                        <span className="text-emerald-700 font-bold tnum shrink-0">
                          Sisa Plafon: {formatCurrency(selectedOpt.remaining_amount !== undefined ? selectedOpt.remaining_amount : selectedOpt.amount)}
                        </span>
                      </div>
                      <StatementMatchIndicator
                        inputAmount={amount}
                        statement={selectedOpt}
                        onSyncAmount={(amt) => setAmount(String(amt))}
                        isCompact={false}
                      />
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Catatan / Keterangan Transfer */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Catatan / Ref Transfer <span className="text-slate-400 font-normal">(Opsional)</span>
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Contoh: Transfer BSI an. Ibu Siti / Titipan Kasir"
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:border-emerald-500 focus:bg-white transition placeholder:text-slate-400"
              />
            </div>

            {/* Preview Akuntansi Dinamis / Sub-Ledger Preview */}
            {activeTab === 'opening_balance' ? (
              <div className="p-3.5 bg-gradient-to-br from-indigo-50/70 via-slate-50 to-indigo-50/40 border border-indigo-200/80 rounded-xl space-y-2 text-[11px] shadow-xs">
                <div className="flex items-center justify-between font-bold text-indigo-900 border-b border-indigo-200/60 pb-1.5">
                  <div className="flex items-center gap-1.5">
                    <BadgeCheck className="w-4 h-4 text-indigo-600" />
                    <span>Pencatatan Sub-Ledger Saldo Awal (Cutover)</span>
                  </div>
                  <span className="text-[10px] px-1.5 py-0.5 bg-indigo-100 text-indigo-800 rounded font-mono font-bold">
                    TANPA MUTASI KAS GANDA
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-slate-600 text-[10px]">
                  <div className="p-2 rounded-lg bg-white/80 border border-slate-200/80">
                    <span className="text-indigo-700 font-bold block uppercase text-[9px] tracking-wider mb-0.5">
                      [Sub-Ledger] Kartu Santri:
                    </span>
                    <span className="font-bold text-slate-900 block text-[11px]">
                      {selectedStudent?.student_name || 'Kartu Santri'}
                    </span>
                    <span className="text-[10px] text-indigo-700 font-mono font-bold block mt-0.5">
                      +Rp {amount ? parseFloat(amount || 0).toLocaleString('id-ID') : '0'}
                    </span>
                  </div>

                  <div className="p-2 rounded-lg bg-white/80 border border-slate-200/80">
                    <span className="text-slate-600 font-bold block uppercase text-[9px] tracking-wider mb-0.5">
                      [Kas/Bank] Rekening Sumber:
                    </span>
                    <span className="font-bold text-slate-900 block text-[11px]">
                      {selectedCashAccount?.name || 'Kas/Bank BNI Kantin'}
                    </span>
                    <span className="text-[10px] text-slate-500 block mt-0.5">
                      Saldo sudah tercatat di Keuangan (tidak didebit ulang)
                    </span>
                  </div>
                </div>

                <div className="text-[10px] text-indigo-800 font-medium pt-1 flex items-center justify-between border-t border-indigo-200/60">
                  <span>Keterangan Cutover:</span>
                  <span className="font-semibold text-indigo-900">
                    Murni aktivasi saldo kartu santri untuk POS Kantin
                  </span>
                </div>
              </div>
            ) : (
              <div className="p-3.5 bg-gradient-to-br from-emerald-50/70 via-slate-50 to-emerald-50/40 border border-emerald-200/80 rounded-xl space-y-2 text-[11px] shadow-xs">
                <div className="flex items-center justify-between font-bold text-emerald-900 border-b border-emerald-200/60 pb-1.5">
                  <div className="flex items-center gap-1.5">
                    <BadgeCheck className="w-4 h-4 text-emerald-600" />
                    <span>Catatan Akuntansi Otomatis (Double-Entry)</span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full font-mono font-bold">
                    {accountingConfig?.settings?.auto_journal ? 'Auto-Journal Aktif' : 'Pencatatan Manual'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-slate-600 text-[10px]">
                  {/* Kolom Debet */}
                  <div className="p-2.5 rounded-lg bg-white/90 border border-emerald-200/70 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-emerald-700 font-bold uppercase text-[9px] tracking-wider">
                        [Dr] Akun Debet:
                      </span>
                      <span className="font-mono text-[9px] bg-emerald-100/70 text-emerald-800 px-1 py-0.2 rounded font-bold">
                        COA {activeDebitCoa.code}
                      </span>
                    </div>
                    <span className="font-bold text-slate-900 block text-[11px] leading-tight">
                      {activeDebitCoa.name}
                    </span>
                    <span className="text-[10px] text-slate-500 block truncate">
                      {activeTab === 'top_up' ? (selectedCashAccount?.name || 'Kas Tunai') : 'Simpanan Santri'}
                    </span>
                  </div>

                  {/* Kolom Kredit */}
                  <div className="p-2.5 rounded-lg bg-white/90 border border-rose-200/70 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-rose-700 font-bold uppercase text-[9px] tracking-wider">
                        [Cr] Akun Kredit:
                      </span>
                      <span className="font-mono text-[9px] bg-rose-100/70 text-rose-800 px-1 py-0.2 rounded font-bold">
                        COA {activeCreditCoa.code}
                      </span>
                    </div>
                    <span className="font-bold text-slate-900 block text-[11px] leading-tight">
                      {activeCreditCoa.name}
                    </span>
                    <span className="text-[10px] text-slate-500 block truncate">
                      {activeTab === 'top_up' ? 'Simpanan Santri' : (selectedCashAccount?.name || 'Kas Tunai')}
                    </span>
                  </div>
                </div>

                <div className="text-[10px] text-emerald-900 font-medium pt-1 flex items-center justify-between border-t border-emerald-200/60">
                  <span>Pos Sumber Dana:</span>
                  <span className="font-bold bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded truncate max-w-[200px]">
                    {fundSourceName || 'Pos Dana Titipan Dompet Santri'}
                  </span>
                </div>
              </div>
            )}

            {/* Tombol Submit */}
            <button
              type="submit"
              disabled={submitting || !amount}
              className={`w-full py-3 text-white font-bold text-xs rounded-xl shadow-xs transition disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer ${
                activeTab === 'opening_balance'
                  ? 'bg-indigo-600 hover:bg-indigo-700'
                  : activeTab === 'top_up'
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : 'bg-amber-600 hover:bg-amber-700'
              }`}
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : activeTab === 'opening_balance' ? (
                <>
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>Simpan Saldo Awal Migrasi</span>
                </>
              ) : activeTab === 'top_up' ? (
                <>
                  <ArrowDownCircle className="w-4 h-4" />
                  <span>Proses &amp; Catat Jurnal Top Up</span>
                </>
              ) : (
                <>
                  <ArrowUpCircle className="w-4 h-4" />
                  <span>Proses &amp; Catat Jurnal Penarikan</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Right: History Log (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
            <div>
              <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Receipt className="w-4 h-4 text-emerald-600" />
                <span>Riwayat Mutasi &amp; Jurnal Akuntansi Dompet</span>
              </h2>
              <p className="text-[11px] text-slate-400">Pencatatan mutasi saldo dompet lengkap dengan nomor jurnal &amp; akun COA</p>
            </div>
            <button
              type="button"
              onClick={fetchHistory}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer self-end sm:self-center"
              title="Perbarui riwayat"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Search & Filter Controls */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                placeholder="Cari santri, jurnal, akun COA, kas, catatan, nominal..."
                className="w-full pl-8 pr-7 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:border-emerald-500 focus:bg-white transition"
              />
              {historySearch && (
                <button
                  type="button"
                  onClick={() => setHistorySearch('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-[11px] font-semibold shrink-0">
              <button
                type="button"
                onClick={() => setHistoryTypeFilter('all')}
                className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
                  historyTypeFilter === 'all'
                    ? 'bg-white text-slate-800 shadow-2xs font-bold'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Semua ({history.length})
              </button>
              <button
                type="button"
                onClick={() => setHistoryTypeFilter('top_up')}
                className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
                  historyTypeFilter === 'top_up'
                    ? 'bg-white text-emerald-800 shadow-2xs font-bold'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Top Up
              </button>
              <button
                type="button"
                onClick={() => setHistoryTypeFilter('withdrawal')}
                className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
                  historyTypeFilter === 'withdrawal'
                    ? 'bg-white text-amber-800 shadow-2xs font-bold'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Tarik
              </button>
              <button
                type="button"
                onClick={() => setHistoryTypeFilter('opening_balance')}
                className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
                  historyTypeFilter === 'opening_balance'
                    ? 'bg-white text-indigo-800 shadow-2xs font-bold'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Saldo Awal
              </button>
            </div>
          </div>

          {historyLoading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-2">
              <Loader2 className="w-6 h-6 text-emerald-600 animate-spin" />
              <p className="text-xs text-slate-400">Memuat riwayat transaksi...</p>
            </div>
          ) : (
            <div className="border border-slate-200 rounded-xl overflow-hidden max-h-[520px] overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="px-3 py-2.5">Waktu &amp; Jurnal</th>
                    <th className="px-3 py-2.5">Santri</th>
                    <th className="px-3 py-2.5">Kas &amp; Akun Akuntansi</th>
                    <th className="px-3 py-2.5">Nominal</th>
                    <th className="px-3 py-2.5 text-right">Saldo Akhir</th>
                    <th className="px-3 py-2.5 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredHistory.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-50/60 transition">
                      {/* Waktu & No Jurnal */}
                      <td className="px-3 py-2.5">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[11px] text-slate-600 font-mono">
                            {tx.occurred_at ? new Date(tx.occurred_at).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' }) : '-'}
                          </span>
                          {tx.journal_number ? (
                            <span className="font-mono text-[9px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded w-fit">
                              {tx.journal_number}
                            </span>
                          ) : (
                            <span className="text-[9px] text-slate-400 italic">No Jurnal -</span>
                          )}
                          {tx.bank_statement_id && (
                            <span className="font-mono text-[9px] font-semibold text-blue-800 bg-blue-50 border border-blue-200 px-1.5 py-0.2 rounded w-fit">
                              Rek. Koran #{tx.bank_statement_id}
                            </span>
                          )}
                          {Boolean(tx.is_revised || (tx.revision_count && tx.revision_count > 0)) && (
                            <button
                              type="button"
                              onClick={() => handleOpenRevisions(tx)}
                              className="inline-flex items-center gap-1 font-mono text-[9px] font-bold text-amber-800 bg-amber-50 border border-amber-300 px-1.5 py-0.2 rounded hover:bg-amber-100 transition cursor-pointer w-fit mt-0.5"
                              title="Lihat riwayat catatan revisi"
                            >
                              <History className="w-2.5 h-2.5 text-amber-600" />
                              <span>Revisi ({tx.revision_count || 1}x)</span>
                            </button>
                          )}
                        </div>
                      </td>

                      {/* Santri */}
                      <td className="px-3 py-2.5 font-semibold text-slate-800">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[12px] font-bold text-slate-900">
                            {tx.student_name || `Santri #${tx.student_id}`}
                          </span>
                          {tx.class_group_name && (
                            <span className="text-[10px] text-slate-400">
                              {tx.class_group_name}
                            </span>
                          )}
                          {tx.notes && (
                            <span className="text-[10px] text-slate-500 italic bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100 w-fit">
                              "{tx.notes}"
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Rekening Kas & Akun Akuntansi */}
                      <td className="px-3 py-2.5">
                        <div className="flex flex-col gap-1">
                          <span className="font-semibold text-slate-800 text-[11px]">
                            {tx.cash_account_name || 'Kas Tunai'}
                          </span>
                          {(tx.debit_coa_code || tx.credit_coa_code) ? (
                            <div className="flex items-center gap-1 text-[9px] font-mono">
                              <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-1 py-0.2 rounded">
                                Dr: {tx.debit_coa_code || '-'}
                              </span>
                              <span>→</span>
                              <span className="bg-rose-50 text-rose-800 border border-rose-200 px-1 py-0.2 rounded">
                                Cr: {tx.credit_coa_code || '-'}
                              </span>
                            </div>
                          ) : tx.cash_account_details ? (
                            <span className="text-[9px] text-slate-400 font-mono">
                              {tx.cash_account_details}
                            </span>
                          ) : null}
                          {tx.fund_source_name && (
                            <span className="text-[9px] text-emerald-700 bg-emerald-50 px-1 py-0.2 rounded w-fit truncate max-w-[160px]">
                              {tx.fund_source_name}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Nominal */}
                      <td className="px-3 py-2.5 font-mono font-bold">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[9px] uppercase font-bold ${
                              tx.transaction_type === 'opening_balance'
                                ? 'bg-indigo-100 text-indigo-800'
                                : tx.transaction_type === 'top_up'
                                ? 'bg-emerald-100 text-emerald-800'
                                : tx.transaction_type === 'withdrawal'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}
                          >
                            {tx.transaction_type === 'opening_balance' ? 'Saldo Awal' : tx.transaction_type === 'top_up' ? 'Top Up' : 'Tarik'}
                          </span>
                          <span
                            className={
                              tx.transaction_type === 'opening_balance'
                                ? 'text-indigo-700'
                                : tx.transaction_type === 'top_up'
                                ? 'text-emerald-700'
                                : 'text-rose-700'
                            }
                          >
                            {tx.transaction_type === 'withdrawal' ? '-' : '+'}Rp{parseFloat(tx.amount).toLocaleString('id-ID')}
                          </span>
                        </div>
                      </td>

                      {/* Saldo Akhir */}
                      <td className="px-3 py-2.5 font-mono text-slate-800 font-bold text-right text-[12px]">
                        Rp{parseFloat(tx.balance_after).toLocaleString('id-ID')}
                      </td>

                      {/* Aksi */}
                      <td className="px-3 py-2.5 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(tx)}
                            className="p-1.5 rounded-lg text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition cursor-pointer"
                            title="Koreksi / Revisi Transaksi"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          {Boolean(tx.is_revised || (tx.revision_count && tx.revision_count > 0)) && (
                            <button
                              type="button"
                              onClick={() => handleOpenRevisions(tx)}
                              className="p-1.5 rounded-lg text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 transition cursor-pointer"
                              title="Lihat Catatan Riwayat Revisi"
                            >
                              <History className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}

                  {filteredHistory.length === 0 && (
                    <tr>
                      <td colSpan="6" className="py-12 text-center text-slate-400 italic">
                        {history.length === 0 ? 'Belum ada riwayat mutasi dompet' : 'Tidak ada transaksi yang cocok dengan filter pencarian'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================= */}
      {/* MODAL SETELAN AKUNTANSI DOMPET */}
      {/* ========================================================= */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 my-8 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                  <Settings className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-800">Setelan Akuntansi Dompet Santri</h3>
                  <p className="text-[11px] text-slate-500">
                    Konfigurasi akun kas/bank default, kode akun COA debet kredit, dan pos dana terkait
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowConfigModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {configErrorMsg && <FlatAlertBanner type="danger" message={configErrorMsg} />}
            {configSuccessMsg && <FlatAlertBanner type="success" message={configSuccessMsg} />}

            <form onSubmit={handleSaveAccountingConfig} className="space-y-4 text-xs">
              {/* Seksi 1: Kas & Bank Default */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-3">
                <h4 className="font-bold text-slate-800 flex items-center gap-1.5 text-xs">
                  <Building2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Rekening Kas &amp; Bank Default</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Kas Tunai Default</label>
                    <SearchableSelect
                      options={accountingConfig?.cash_accounts?.map(c => ({
                        value: String(c.id),
                        label: c.display_label || c.name,
                        sublabel: c.account_kind === 'bank' ? 'Rekening Bank' : 'Kas Tunai'
                      })) || []}
                      value={String(configForm.cash_account_id_tunai)}
                      onChange={(val) => {
                        const acc = accountingConfig?.cash_accounts?.find(c => String(c.id) === String(val));
                        setConfigForm(prev => ({
                          ...prev,
                          cash_account_id_tunai: val,
                          cash_account_name_tunai: acc?.display_label || acc?.name || ''
                        }));
                      }}
                      placeholder="-- Pilih Kas Tunai --"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Rekening Bank Penampung Default</label>
                    <SearchableSelect
                      options={accountingConfig?.cash_accounts?.map(c => ({
                        value: String(c.id),
                        label: c.display_label || c.name,
                        sublabel: c.bank_account_number ? `No: ${c.bank_account_number}` : 'Kas'
                      })) || []}
                      value={String(configForm.cash_account_id_bank)}
                      onChange={(val) => {
                        const acc = accountingConfig?.cash_accounts?.find(c => String(c.id) === String(val));
                        setConfigForm(prev => ({
                          ...prev,
                          cash_account_id_bank: val,
                          cash_account_name_bank: acc?.display_label || acc?.name || ''
                        }));
                      }}
                      placeholder="-- Pilih Rekening Bank --"
                    />
                  </div>
                </div>
              </div>

              {/* Seksi 2: Bagan Akun (Chart of Accounts / COA) */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-3">
                <h4 className="font-bold text-slate-800 flex items-center gap-1.5 text-xs">
                  <BookOpen className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Akun Akuntansi Terkait (COA SBU Kantin &amp; Keuangan)</span>
                </h4>

                <div className="space-y-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Akun Simpanan / Titipan Dompet Santri (Liabilitas)
                    </label>
                    <SearchableSelect
                      options={accountingConfig?.coas?.wallet_liability?.map(c => ({
                        value: String(c.id),
                        label: `[${c.account_code}] ${c.account_name}`,
                        sublabel: `Grup: ${c.account_group || 'Liabilitas'}`
                      })) || []}
                      value={String(configForm.wallet_liability_coa_id)}
                      onChange={(val) => {
                        const coa = accountingConfig?.coas?.all?.find(c => String(c.id) === String(val));
                        setConfigForm(prev => ({
                          ...prev,
                          wallet_liability_coa_id: val,
                          wallet_liability_coa_code: coa?.account_code || '',
                          wallet_liability_coa_name: coa?.account_name || ''
                        }));
                      }}
                      placeholder="-- Pilih Akun Titipan Santri (COA 20101/404) --"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Akun COA Kas Tunai</label>
                      <SearchableSelect
                        options={accountingConfig?.coas?.cash?.map(c => ({
                          value: String(c.id),
                          label: `[${c.account_code}] ${c.account_name}`,
                          sublabel: `Grup: ${c.account_group || 'Aset'}`
                        })) || []}
                        value={String(configForm.cash_coa_id)}
                        onChange={(val) => {
                          const coa = accountingConfig?.coas?.all?.find(c => String(c.id) === String(val));
                          setConfigForm(prev => ({
                            ...prev,
                            cash_coa_id: val,
                            cash_coa_code: coa?.account_code || '',
                            cash_coa_name: coa?.account_name || ''
                          }));
                        }}
                        placeholder="-- Pilih COA Kas (10101) --"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Akun COA Kas Bank</label>
                      <SearchableSelect
                        options={accountingConfig?.coas?.bank?.map(c => ({
                          value: String(c.id),
                          label: `[${c.account_code}] ${c.account_name}`,
                          sublabel: `Grup: ${c.account_group || 'Aset'}`
                        })) || []}
                        value={String(configForm.bank_coa_id)}
                        onChange={(val) => {
                          const coa = accountingConfig?.coas?.all?.find(c => String(c.id) === String(val));
                          setConfigForm(prev => ({
                            ...prev,
                            bank_coa_id: val,
                            bank_coa_code: coa?.account_code || '',
                            bank_coa_name: coa?.account_name || ''
                          }));
                        }}
                        placeholder="-- Pilih COA Bank (10102) --"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Seksi 3: Pos Dana & Saklar Auto-Journal */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-3">
                <h4 className="font-bold text-slate-800 flex items-center gap-1.5 text-xs">
                  <Tag className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Pos Dana &amp; Otomatisasi Jurnal</span>
                </h4>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Nama Pos Dana Terkait</label>
                  <input
                    type="text"
                    required
                    value={configForm.fund_source_name}
                    onChange={(e) => setConfigForm(prev => ({ ...prev, fund_source_name: e.target.value }))}
                    placeholder="Contoh: Pos Dana Titipan Dompet Santri / SBU Kantin"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-medium focus:outline-hidden focus:border-emerald-500 transition"
                  />
                </div>

                <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-slate-800 block text-xs">Posting Otomatis Jurnal (Auto-Journal)</span>
                    <span className="text-[11px] text-slate-500">
                      Otomatis catat jurnal umum ganda ke database SBU Kantin dan Modul Keuangan saat top up &amp; tarik tunai
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={configForm.auto_journal}
                    onChange={(e) => setConfigForm(prev => ({ ...prev, auto_journal: e.target.checked }))}
                    className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowConfigModal(false)}
                  disabled={savingConfig}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={savingConfig}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {savingConfig ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  <span>Simpan Konfigurasi Akuntansi</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL EDIT / REVISI TRANSAKSI DOMPET */}
      {/* ========================================================= */}
      {editingTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 my-8 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                  <Edit3 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-800">Koreksi / Revisi Transaksi Dompet</h3>
                  <p className="text-[11px] text-slate-500">
                    Santri: <strong className="text-slate-700">{editingTx.student_name}</strong> (Tx #{editingTx.id})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingTx(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {editError && (
              <FlatAlertBanner type="danger" message={editError} />
            )}

            <form onSubmit={handleSaveEdit} className="space-y-3.5 text-xs">
              {/* Nominal Transaksi */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Nominal Transaksi (Rp) *
                </label>
                <input
                  type="number"
                  min="1000"
                  step="500"
                  required
                  value={editForm.amount}
                  onChange={(e) => setEditForm(prev => ({ ...prev, amount: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold focus:outline-hidden focus:border-emerald-500 focus:bg-white transition"
                />
              </div>

              {/* Tanggal & Waktu */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                <div className="sm:col-span-8">
                  <DatePickerField
                    label="Tanggal Transaksi *"
                    value={editForm.occurred_date}
                    onChange={(isoStr) => {
                      setEditForm(prev => ({ ...prev, occurred_date: isoStr }));
                    }}
                    onTimeExtracted={(timeStr) => {
                      if (timeStr) {
                        setEditForm(prev => ({ ...prev, occurred_time: timeStr.slice(0, 5) }));
                      }
                    }}
                    placeholder="DD/MM/YYYY"
                    required
                    align="auto"
                  />
                </div>

                <div className="sm:col-span-4">
                  <label className="block font-bold text-slate-700 mb-1">
                    Jam / Waktu
                  </label>
                  <input
                    type="time"
                    value={editForm.occurred_time}
                    onChange={(e) => setEditForm(prev => ({ ...prev, occurred_time: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs focus:outline-hidden focus:border-emerald-500 focus:bg-white transition"
                  />
                </div>
              </div>

              {/* Rekening Kas / Bank */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Rekening Kas / Bank
                </label>
                <SearchableSelect
                  options={cashAccounts.map(c => ({
                    value: String(c.id),
                    label: c.account_kind === 'bank' && c.bank_account_number
                      ? `${c.name} (${c.bank_name || 'Bank'} - ${c.bank_account_number})`
                      : `${c.name} (Kas Tunai)`,
                    sublabel: `${c.account_kind === 'bank' ? 'Transfer Bank' : 'Kas Tunai Langsung'}${c.coa_code ? ` • COA ${c.coa_code}` : ''}`,
                    badge: c.coa_code ? `COA ${c.coa_code}` : (c.account_kind === 'bank' ? 'Bank' : 'Tunai')
                  }))}
                  value={String(editForm.cash_account_id)}
                  onChange={(val) => {
                    setEditForm(prev => ({ ...prev, cash_account_id: val }));
                    fetchBankStatements(val || null, editingTx?.bank_statement_id || null);
                  }}
                  placeholder="-- Pilih Rekening Kas / Bank --"
                  searchPlaceholder="Ketik nama kas/bank..."
                  emptyText="Rekening kas tidak ditemukan"
                  allowClear={true}
                />
              </div>

              {/* Referensi Mutasi Rekening Koran */}
              {(bankStatements.length > 0 || editForm.bank_statement_id || cashAccounts.find(c => String(c.id) === String(editForm.cash_account_id))?.account_kind === 'bank') && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-bold text-slate-700 text-xs flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <CreditCard className="w-3.5 h-3.5 text-blue-600" />
                        <span>Referensi Mutasi Rekening Koran (Opsional)</span>
                      </span>
                      <span className="text-[10px] text-slate-400 font-normal">(Multi-Transaksi / Parsial OK)</span>
                    </label>
                    {loadingBankStatements && (
                      <span className="text-[10px] text-slate-400 flex items-center gap-1">
                        <Loader2 className="w-3 h-3 animate-spin" /> Memuat mutasi...
                      </span>
                    )}
                  </div>
                  <SearchableSelect
                    options={editBankStatementsOptions}
                    value={String(editForm.bank_statement_id)}
                    onChange={(val) => {
                      if (!val) {
                        setEditForm(prev => ({ ...prev, bank_statement_id: '' }));
                        return;
                      }
                      const stmt = bankStatements.find(b => String(b.id) === String(val));
                      if (stmt) {
                        let dPart = editForm.occurred_date;
                        let tPart = editForm.occurred_time;
                        if (stmt.transaction_date) {
                          const d = new Date(stmt.transaction_date);
                          if (!isNaN(d.getTime())) {
                            dPart = d.toISOString().slice(0, 10);
                            tPart = d.toTimeString().slice(0, 5);
                          }
                        }
                        const isCurrentSelected = String(stmt.id) === String(editingTx?.bank_statement_id);
                        const allocAmt = isCurrentSelected
                          ? (editingTx?.amount || stmt.amount)
                          : (stmt.remaining_amount !== undefined ? stmt.remaining_amount : stmt.amount);

                        setEditForm(prev => ({
                          ...prev,
                          bank_statement_id: val,
                          amount: String(allocAmt || prev.amount),
                          occurred_date: dPart,
                          occurred_time: tPart,
                          cash_account_id: stmt.cash_account_id ? String(stmt.cash_account_id) : prev.cash_account_id,
                          notes: prev.notes || `Mutasi Bank (${stmt.bank_name || 'Bank'}): ${stmt.description || ''} ${stmt.reference_number ? `Ref: ${stmt.reference_number}` : ''}`.trim()
                        }));
                      } else {
                        setEditForm(prev => ({ ...prev, bank_statement_id: val }));
                      }
                    }}
                    placeholder="-- Cari & Pilih Mutasi Rekening Koran (Ref, Nominal, Tgl) --"
                    searchPlaceholder="Ketik nomor referensi, nominal transfer, nama bank..."
                    accentColor="emerald"
                    emptyText="Tidak ada mutasi rekening koran yang tersedia"
                    allowClear={true}
                  />

                  {(() => {
                    const selectedOpt = editBankStatementsOptions.find(o => String(o.value) === String(editForm.bank_statement_id));
                    if (!selectedOpt) return null;
                    return (
                      <div className="p-2.5 bg-emerald-50/80 border border-emerald-200/80 rounded-xl text-[10.5px] space-y-2 text-slate-700 animate-in fade-in duration-150">
                        <div className="flex items-center justify-between font-semibold gap-2">
                          <span className="text-emerald-900 font-bold flex items-center gap-1 min-w-0">
                            <span>🔗 RK Terpilih:</span>
                            <span className="truncate">{selectedOpt.desc}</span>
                          </span>
                          <span className="tnum text-emerald-800 font-bold shrink-0">
                            Plafon: {formatCurrency(selectedOpt.amount)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-slate-500 text-[10px] gap-2">
                          <span>
                            Tgl Mutasi Bank: <b className="text-slate-800 tnum">{selectedOpt.rawDate || '-'}</b> {selectedOpt.refNo ? `• Ref: ${selectedOpt.refNo}` : ''} • Teralokasi: <b>{formatCurrency(selectedOpt.allocated_amount || 0)}</b>
                          </span>
                          <span className="text-emerald-700 font-bold tnum shrink-0">
                            Sisa Plafon: {formatCurrency(selectedOpt.remaining_amount !== undefined ? selectedOpt.remaining_amount : selectedOpt.amount)}
                          </span>
                        </div>
                        <StatementMatchIndicator
                          inputAmount={editForm.amount}
                          statement={selectedOpt}
                          onSyncAmount={(amt) => setEditForm(prev => ({ ...prev, amount: String(amt) }))}
                          isCompact={false}
                        />
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Catatan / Keterangan */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Catatan / Keterangan Transaksi
                </label>
                <input
                  type="text"
                  value={editForm.notes}
                  onChange={(e) => setEditForm(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Contoh: Top up setoran tunai / transfer BSI"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-emerald-500 focus:bg-white transition"
                />
              </div>

              {/* Alasan Revisi (Wajib) */}
              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  Catatan Alasan Revisi <span className="text-rose-600 font-bold">*</span>
                </label>
                <textarea
                  rows={2}
                  required
                  value={editForm.revision_reason}
                  onChange={(e) => setEditForm(prev => ({ ...prev, revision_reason: e.target.value }))}
                  placeholder="Wajib diisi: Jelaskan alasan koreksi/perubahan data transaksi ini..."
                  className="w-full px-3 py-2 bg-amber-50/50 border border-amber-200 rounded-xl text-xs focus:outline-hidden focus:border-amber-500 focus:bg-white transition placeholder:text-slate-400"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingTx(null)}
                  disabled={editSubmitting}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={editSubmitting || !editForm.revision_reason}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {editSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  <span>Simpan Catatan Revisi</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL RIWAYAT CATATAN REVISI (AUDIT TRAIL) */}
      {/* ========================================================= */}
      {viewingRevisionsTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 my-8 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
                  <History className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-800">Catatan Riwayat Revisi Transaksi</h3>
                  <p className="text-[11px] text-slate-500">
                    Jejak audit perubahan Tx #{viewingRevisionsTx.id} • {viewingRevisionsTx.student_name}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewingRevisionsTx(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {loadingRevisions ? (
              <div className="py-12 flex flex-col items-center justify-center gap-2">
                <Loader2 className="w-6 h-6 text-amber-600 animate-spin" />
                <p className="text-xs text-slate-400">Memuat riwayat revisi...</p>
              </div>
            ) : revisionsList.length === 0 ? (
              <div className="py-10 text-center text-slate-400 italic text-xs">
                Belum ada catatan riwayat revisi untuk transaksi ini.
              </div>
            ) : (
              <div className="space-y-4 max-h-[420px] overflow-y-auto pr-1">
                {revisionsList.map((rev, idx) => (
                  <div key={rev.id} className="p-4 rounded-xl border border-amber-200/80 bg-amber-50/30 space-y-2.5 text-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 font-bold text-[10px]">
                          Revisi #{revisionsList.length - idx}
                        </span>
                        <span className="text-slate-700 font-bold text-[11px]">
                          Oleh: {rev.revised_by_name || `User #${rev.revised_by}`}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(rev.created_at).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
                      </span>
                    </div>

                    {/* Alasan Revisi */}
                    <div className="p-2.5 rounded-lg bg-white border border-amber-200/60">
                      <span className="text-[10px] font-bold text-amber-900 block mb-0.5">Alasan Revisi:</span>
                      <p className="text-slate-800 italic text-xs font-medium">"{rev.revision_reason}"</p>
                    </div>

                    {/* Rincian Perubahan Data */}
                    <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                      <div className="p-2 rounded-lg bg-rose-50/60 border border-rose-100 space-y-1">
                        <span className="text-[9px] font-bold text-rose-700 uppercase block">Data Sebelumnya:</span>
                        <div className="text-slate-600 space-y-0.5">
                          <p>Nominal: <strong className="font-mono">Rp{parseFloat(rev.previous_data?.amount || 0).toLocaleString('id-ID')}</strong></p>
                          {rev.previous_data?.notes && <p className="truncate">Catatan: {rev.previous_data.notes}</p>}
                        </div>
                      </div>

                      <div className="p-2 rounded-lg bg-emerald-50/60 border border-emerald-100 space-y-1">
                        <span className="text-[9px] font-bold text-emerald-700 uppercase block">Data Setelah Revisi:</span>
                        <div className="text-slate-800 space-y-0.5">
                          <p>Nominal: <strong className="font-mono text-emerald-800">Rp{parseFloat(rev.new_data?.amount || 0).toLocaleString('id-ID')}</strong></p>
                          {rev.new_data?.notes && <p className="truncate text-emerald-900">Catatan: {rev.new_data.notes}</p>}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setViewingRevisionsTx(null)}
                className="px-4 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
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
