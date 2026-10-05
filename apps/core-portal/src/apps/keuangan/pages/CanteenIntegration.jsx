import React, { useState, useEffect, useMemo } from 'react';
import api from '../../../shared/services/api';
import StatusPill from '../../../shared/components/StatusPill';
import SearchableSelect from '../../../shared/components/SearchableSelect';
import DatePickerField from '../../../shared/components/DatePickerField';
import StatementMatchIndicator from '../../../shared/components/StatementMatchIndicator';
import StudentWalletHistoryModal from '../../../shared/components/StudentWalletHistoryModal';
import { formatCurrency, formatDate } from '../../../shared/utils/formatters';
import { useAuth } from '../../../shared/store/AuthContext';
import {
  Store,
  Wallet,
  Coins,
  Receipt,
  CreditCard,
  Building2,
  Users,
  BadgeCheck,
  AlertCircle,
  RotateCcw,
  Sparkles,
  BookOpen,
  ArrowUpCircle,
  ArrowDownCircle,
  ArrowRightLeft,
  DollarSign,
  TrendingUp,
  FileText,
  CheckCircle2,
  Loader2,
  Calendar,
  Layers,
  ChevronRight,
  ExternalLink,
  Edit3,
  History,
  Clock,
  Search,
  Filter,
  X
} from 'lucide-react';

export default function CanteenIntegration() {
  const { activeSchoolUnit } = useAuth();
  const schoolUnitId = activeSchoolUnit?.id;

  // Active Tab
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'wallet' | 'canteen_share' | 'vendor_share' | 'transfers'

  // Loading States
  const [loadingOverview, setLoadingOverview] = useState(false);
  const [overviewData, setOverviewData] = useState(null);
  const [students, setStudents] = useState([]);
  const [cashAccounts, setCashAccounts] = useState([]);
  const [bankStatements, setBankStatements] = useState([]);
  const [loadingBankStatements, setLoadingBankStatements] = useState(false);
  const [walletHistory, setWalletHistory] = useState([]);
  const [loadingWalletHistory, setLoadingWalletHistory] = useState(false);
  const [canteenPayments, setCanteenPayments] = useState([]);
  const [loadingCanteenPayments, setLoadingCanteenPayments] = useState(false);
  const [vendorPayments, setVendorPayments] = useState([]);
  const [loadingVendorPayments, setLoadingVendorPayments] = useState(false);

  // Sub Tab Kelola Dompet Santri
  const [walletSubTab, setWalletSubTab] = useState('students'); // 'students' | 'form'
  const [historyModalStudent, setHistoryModalStudent] = useState(null);
  const [studentFilterSearch, setStudentFilterSearch] = useState('');
  const [studentFilterClass, setStudentFilterClass] = useState('all');
  const [walletHistorySearch, setWalletHistorySearch] = useState('');
  const [walletHistoryTypeFilter, setWalletHistoryTypeFilter] = useState('all'); // 'all' | 'top_up' | 'withdrawal'

  // Form States - Wallet Top Up / Withdraw
  const [walletAction, setWalletAction] = useState('top_up'); // 'top_up' | 'withdrawal'
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [amount, setAmount] = useState('');
  const [walletDate, setWalletDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [walletTime, setWalletTime] = useState(() => new Date().toTimeString().slice(0, 5));
  const [selectedCashAccountId, setSelectedCashAccountId] = useState('');
  const [selectedBankStatementId, setSelectedBankStatementId] = useState('');
  const [isChangingBankStatement, setIsChangingBankStatement] = useState(false);
  const [walletNotes, setWalletNotes] = useState('');
  const [walletSubmitting, setWalletSubmitting] = useState(false);
  const [walletError, setWalletError] = useState(null);
  const [walletSuccess, setWalletSuccess] = useState(null);

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

  // Form States - Canteen Fee Payment
  const [canteenFeePeriodStart, setCanteenFeePeriodStart] = useState('');
  const [canteenFeePeriodEnd, setCanteenFeePeriodEnd] = useState('');
  const [canteenFeeAmount, setCanteenFeeAmount] = useState('');
  const [canteenFeeCashAccountId, setCanteenFeeCashAccountId] = useState('');
  const [canteenFeeNotes, setCanteenFeeNotes] = useState('');
  const [canteenFeeSubmitting, setCanteenFeeSubmitting] = useState(false);
  const [canteenFeeError, setCanteenFeeError] = useState(null);
  const [canteenFeeSuccess, setCanteenFeeSuccess] = useState(null);

  // Form States - Vendor Fee Payment
  const [selectedVendorId, setSelectedVendorId] = useState('');
  const [vendorFeePeriodStart, setVendorFeePeriodStart] = useState('');
  const [vendorFeePeriodEnd, setVendorFeePeriodEnd] = useState('');
  const [vendorFeeAmount, setVendorFeeAmount] = useState('');
  const [vendorFeeCashAccountId, setVendorFeeCashAccountId] = useState('');
  const [vendorFeeBankStatementId, setVendorFeeBankStatementId] = useState('');
  const [vendorFeeNotes, setVendorFeeNotes] = useState('');
  const [vendorFeeSubmitting, setVendorFeeSubmitting] = useState(false);
  const [vendorFeeError, setVendorFeeError] = useState(null);
  const [vendorFeeSuccess, setVendorFeeSuccess] = useState(null);

  // Form States - Cash Transfer
  const [transferFromAccountId, setTransferFromAccountId] = useState('');
  const [transferToAccountId, setTransferToAccountId] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [transferDate, setTransferDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [transferNotes, setTransferNotes] = useState('');
  const [transferSubmitting, setTransferSubmitting] = useState(false);
  const [transferError, setTransferError] = useState(null);
  const [transferSuccess, setTransferSuccess] = useState(null);

  // Fetch Core Overview
  const fetchOverview = async () => {
    setLoadingOverview(true);
    try {
      const res = await api.get('/keuangan/canteen/overview');
      setOverviewData(res.data?.data || null);
    } catch (err) {
      console.error('Error fetching canteen overview:', err);
    } finally {
      setLoadingOverview(false);
    }
  };

  // Fetch Students
  const fetchStudents = async () => {
    try {
      const res = await api.get('/keuangan/canteen/students?status=active');
      const list = res.data?.data || [];
      setStudents(list);
      if (list.length > 0 && !selectedStudentId) {
        setSelectedStudentId(list[0].student_id);
      }
    } catch (err) {
      console.error('Error fetching students:', err);
    }
  };

  // Fetch Cash Accounts
  const fetchCashAccounts = async () => {
    try {
      const res = await api.get('/keuangan/canteen/cash-accounts');
      const list = res.data?.data || [];
      setCashAccounts(list);
      if (list.length > 0 && !selectedCashAccountId) {
        const cashDef = list.find(c => c.account_kind === 'cash') || list[0];
        setSelectedCashAccountId(String(cashDef.id));
        setCanteenFeeCashAccountId(String(cashDef.id));
        setVendorFeeCashAccountId(String(cashDef.id));
        if (list.length > 1) {
          setTransferFromAccountId(String(list[0].id));
          setTransferToAccountId(String(list[1].id));
        }
      }
    } catch (err) {
      console.error('Error fetching cash accounts:', err);
    }
  };

  // Fetch Bank Statements
  const fetchBankStatements = async (cashAccId = null, includeId = null) => {
    setLoadingBankStatements(true);
    try {
      const params = { dc_type: 'credit', is_reconciled: 0 };
      if (cashAccId) params.cash_account_id = cashAccId;
      if (includeId) params.include_id = includeId;
      const res = await api.get('/keuangan/canteen/bank-statements', { params });
      let list = res.data?.data || [];

      if (list.length === 0 && cashAccId) {
        try {
          const fallbackParams = { dc_type: 'credit', is_reconciled: 0 };
          if (includeId) fallbackParams.include_id = includeId;
          const fallbackRes = await api.get('/keuangan/canteen/bank-statements', {
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

  // Fetch Wallet Transactions History
  const fetchWalletHistory = async () => {
    setLoadingWalletHistory(true);
    try {
      const res = await api.get('/keuangan/canteen/wallet-transactions');
      setWalletHistory(res.data?.data || []);
    } catch (err) {
      console.error('Error fetching wallet transactions:', err);
    } finally {
      setLoadingWalletHistory(false);
    }
  };

  // Fetch Canteen Fee Payments History
  const fetchCanteenPayments = async () => {
    setLoadingCanteenPayments(true);
    try {
      const res = await api.get('/keuangan/canteen/canteen-fee-payments');
      setCanteenPayments(res.data?.data || []);
    } catch (err) {
      console.error('Error fetching canteen fee payments:', err);
    } finally {
      setLoadingCanteenPayments(false);
    }
  };

  // Fetch Vendor Fee Payments History
  const fetchVendorPayments = async () => {
    setLoadingVendorPayments(true);
    try {
      const res = await api.get('/keuangan/canteen/vendor-fee-payments');
      setVendorPayments(res.data?.data || []);
    } catch (err) {
      console.error('Error fetching vendor fee payments:', err);
    } finally {
      setLoadingVendorPayments(false);
    }
  };

  useEffect(() => {
    fetchOverview();
    fetchStudents();
    fetchCashAccounts();
    fetchBankStatements();
    fetchWalletHistory();
    fetchCanteenPayments();
    fetchVendorPayments();
  }, [schoolUnitId]);

  // Handlers
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
      setIsChangingBankStatement(false);
      return;
    }
    const stmt = bankStatements.find(b => String(b.id) === String(bsId));
    if (stmt) {
      setSelectedBankStatementId(String(stmt.id));
      setIsChangingBankStatement(false);
      const allocAmt = stmt.remaining_amount !== undefined ? stmt.remaining_amount : stmt.amount;
      setAmount(String(allocAmt || stmt.amount));
      if (stmt.cash_account_id) {
        setSelectedCashAccountId(String(stmt.cash_account_id));
      }
      if (stmt.transaction_date) {
        const d = new Date(stmt.transaction_date);
        if (!isNaN(d.getTime())) {
          setWalletDate(d.toISOString().slice(0, 10));
          setWalletTime(d.toTimeString().slice(0, 5));
        }
      }
      const refDetail = stmt.reference_number ? `Ref: ${stmt.reference_number}` : '';
      const descDetail = stmt.description || 'Setoran transfer bank';
      setWalletNotes(`Mutasi Bank (${stmt.bank_name || 'Bank'}): ${descDetail} ${refDetail}`.trim());
    }
  };

  const handleClearBankStatement = () => {
    setSelectedBankStatementId('');
    setIsChangingBankStatement(false);
  };

  // Memoized Standard Bank Statements Options (Kaya Pencarian & Komprehensif)
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

  // Selected Entities
  const selectedStudent = students.find(s => String(s.student_id) === String(selectedStudentId));
  const selectedCashAccount = cashAccounts.find(c => String(c.id) === String(selectedCashAccountId));
  const selectedBankStatement = bankStatements.find(b => String(b.id) === String(selectedBankStatementId));

  // Submit Wallet Top Up / Withdraw
  const handleWalletSubmit = async (e) => {
    e.preventDefault();
    setWalletError(null);
    setWalletSuccess(null);
    setWalletSubmitting(true);

    try {
      const endpoint = walletAction === 'top_up'
        ? '/keuangan/canteen/wallet-transactions/top-up'
        : '/keuangan/canteen/wallet-transactions/withdrawal';

      const formattedTime = walletTime ? (walletTime.length === 5 ? `${walletTime}:00` : walletTime) : '12:00:00';
      const combinedDateTime = walletDate ? `${walletDate}T${formattedTime}` : undefined;

      const payload = {
        student_id: Number(selectedStudentId),
        amount: parseFloat(amount),
        occurred_at: combinedDateTime ? new Date(combinedDateTime).toISOString() : undefined,
        payment_method: selectedCashAccount?.account_kind === 'bank' ? 'transfer' : 'cash',
        cash_account_id: selectedCashAccountId ? Number(selectedCashAccountId) : null,
        bank_statement_id: walletAction === 'top_up' && selectedBankStatementId ? Number(selectedBankStatementId) : null,
        notes: walletNotes.trim() || null
      };

      const res = await api.post(endpoint, payload);
      const resData = res.data?.data;
      const jrn = resData?.journal_number ? ` [Jurnal #${resData.journal_number}]` : '';

      setWalletSuccess(
        walletAction === 'top_up'
          ? `Top up sebesar Rp${parseFloat(amount).toLocaleString('id-ID')} berhasil! Saldo baru: Rp${resData.balance_after.toLocaleString('id-ID')}${jrn}`
          : `Penarikan saldo sebesar Rp${parseFloat(amount).toLocaleString('id-ID')} berhasil! Sisa saldo: Rp${resData.balance_after.toLocaleString('id-ID')}${jrn}`
      );

      setAmount('');
      setWalletNotes('');
      setSelectedBankStatementId('');
      fetchStudents();
      fetchOverview();
      fetchWalletHistory();
      fetchBankStatements();
    } catch (err) {
      setWalletError(err.response?.data?.message || err.message || 'Gagal memproses transaksi dompet');
    } finally {
      setWalletSubmitting(false);
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

      await api.put(`/keuangan/canteen/wallet-transactions/${editingTx.id}`, {
        amount: parseFloat(editForm.amount),
        occurred_at: combinedDateTime ? new Date(combinedDateTime).toISOString() : undefined,
        payment_method: editForm.payment_method,
        cash_account_id: editForm.cash_account_id ? Number(editForm.cash_account_id) : null,
        bank_statement_id: editForm.bank_statement_id ? Number(editForm.bank_statement_id) : null,
        notes: editForm.notes.trim() || null,
        revision_reason: editForm.revision_reason.trim()
      });
      setEditingTx(null);
      setWalletSuccess(`Transaksi #${editingTx.id} berhasil direvisi dan disinkronkan ke Keuangan!`);
      fetchOverview();
      fetchWalletHistory();
      fetchStudents();
      fetchBankStatements();
    } catch (err) {
      setEditError(err.response?.data?.message || err.message || 'Gagal merevisi transaksi dompet');
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleOpenRevisions = async (tx) => {
    setViewingRevisionsTx(tx);
    setLoadingRevisions(true);
    try {
      const res = await api.get(`/keuangan/canteen/wallet-transactions/${tx.id}/revisions`);
      setRevisionsList(res.data?.data || []);
    } catch (err) {
      console.error('Error loading revisions:', err);
      setRevisionsList([]);
    } finally {
      setLoadingRevisions(false);
    }
  };

  // Submit Canteen Fee Settlement
  const handleCanteenFeeSubmit = async (e) => {
    e.preventDefault();
    setCanteenFeeError(null);
    setCanteenFeeSuccess(null);
    setCanteenFeeSubmitting(true);

    try {
      const payload = {
        period_start: canteenFeePeriodStart || new Date().toISOString().slice(0, 10),
        period_end: canteenFeePeriodEnd || new Date().toISOString().slice(0, 10),
        amount: parseFloat(canteenFeeAmount),
        cash_account_id: canteenFeeCashAccountId ? Number(canteenFeeCashAccountId) : null,
        notes: canteenFeeNotes.trim() || null
      };

      const res = await api.post('/keuangan/canteen/canteen-fee-payments', payload);
      const resData = res.data?.data;
      const rcpt = resData?.finance_receipt_number ? ` [Kwitansi #${resData.finance_receipt_number}]` : '';

      setCanteenFeeSuccess(`Penyerahan hak kantin sebesar ${formatCurrency(parseFloat(canteenFeeAmount))} berhasil diposting!${rcpt}`);
      setCanteenFeeAmount('');
      setCanteenFeeNotes('');
      fetchOverview();
      fetchCanteenPayments();
    } catch (err) {
      setCanteenFeeError(err.response?.data?.message || err.message || 'Gagal mencatat penyerahan hak kantin');
    } finally {
      setCanteenFeeSubmitting(false);
    }
  };

  // Submit Vendor Fee Settlement
  const handleVendorFeeSubmit = async (e) => {
    e.preventDefault();
    setVendorFeeError(null);
    setVendorFeeSuccess(null);
    setVendorFeeSubmitting(true);

    try {
      const payload = {
        vendor_id: Number(selectedVendorId),
        period_start: vendorFeePeriodStart || new Date().toISOString().slice(0, 10),
        period_end: vendorFeePeriodEnd || new Date().toISOString().slice(0, 10),
        amount: parseFloat(vendorFeeAmount),
        cash_account_id: vendorFeeCashAccountId ? Number(vendorFeeCashAccountId) : null,
        bank_statement_id: vendorFeeBankStatementId ? Number(vendorFeeBankStatementId) : null,
        notes: vendorFeeNotes.trim() || null
      };

      const res = await api.post('/keuangan/canteen/vendor-fee-payments', payload);
      const resData = res.data?.data;
      const bkk = resData?.expense_proof_number ? ` [BKK #${resData.expense_proof_number}]` : '';

      setVendorFeeSuccess(`Pembayaran hak vendor sebesar ${formatCurrency(parseFloat(vendorFeeAmount))} berhasil dibukukan!${bkk}`);
      setVendorFeeAmount('');
      setVendorFeeNotes('');
      fetchOverview();
      fetchVendorPayments();
    } catch (err) {
      setVendorFeeError(err.response?.data?.message || err.message || 'Gagal memproses pembayaran vendor');
    } finally {
      setVendorFeeSubmitting(false);
    }
  };

  // Submit Cash Transfer
  const handleCashTransferSubmit = async (e) => {
    e.preventDefault();
    setTransferError(null);
    setTransferSuccess(null);
    setTransferSubmitting(true);

    try {
      const payload = {
        from_cash_account_id: Number(transferFromAccountId),
        to_cash_account_id: Number(transferToAccountId),
        amount: parseFloat(transferAmount),
        transfer_date: transferDate,
        notes: transferNotes.trim() || null
      };

      const res = await api.post('/keuangan/canteen/cash-transfers', payload);
      const resData = res.data?.data;
      const tfNo = resData?.transfer_number ? ` [Bukti #${resData.transfer_number}]` : '';

      setTransferSuccess(`Mutasi kas penampung kantin sebesar ${formatCurrency(parseFloat(transferAmount))} berhasil dibukukan!${tfNo}`);
      setTransferAmount('');
      setTransferNotes('');
      fetchOverview();
    } catch (err) {
      setTransferError(err.response?.data?.message || err.message || 'Gagal memproses mutasi kas');
    } finally {
      setTransferSubmitting(false);
    }
  };


  // Santri yang difilter di Sub-Tab Daftar Santri & Saldo Dompet
  const filteredCanteenStudents = useMemo(() => {
    return students.filter(s => {
      const sName = (s.student_name || '').toLowerCase();
      const sNis = (s.nis || '').toLowerCase();
      const sClass = (s.class_group_name || '').toLowerCase();
      const q = studentFilterSearch.toLowerCase().trim();
      const matchSearch = !q || sName.includes(q) || sNis.includes(q) || sClass.includes(q);
      const matchClass = studentFilterClass === 'all' || s.class_group_name === studentFilterClass;
      return matchSearch && matchClass;
    });
  }, [students, studentFilterSearch, studentFilterClass]);

  // Daftar unik rombel/kelas untuk dropdown filter
  const uniqueClassGroups = useMemo(() => {
    const set = new Set();
    students.forEach(s => {
      if (s.class_group_name) set.add(s.class_group_name);
    });
    return Array.from(set).sort();
  }, [students]);

  // Total akumulasi saldo dompet yang sedang difilter
  const totalFilteredWalletBalance = useMemo(() => {
    return filteredCanteenStudents.reduce((sum, s) => sum + parseFloat(s.wallet_balance || 0), 0);
  }, [filteredCanteenStudents]);

  // Filter Riwayat Transaksi Dompet
  const filteredWalletHistory = useMemo(() => {
    return walletHistory.filter(tx => {
      const q = walletHistorySearch.toLowerCase().trim();
      const matchType = walletHistoryTypeFilter === 'all' || tx.transaction_type === walletHistoryTypeFilter;
      if (!q) return matchType;

      const sName = (tx.student_name || '').toLowerCase();
      const sId = String(tx.student_id || '');
      const jrn = (tx.journal_number || '').toLowerCase();
      const noteText = (tx.notes || '').toLowerCase();
      const cashAcc = (tx.cash_account_name || '').toLowerCase();
      const amt = String(tx.amount || '');
      const classGroup = (tx.class_group_name || '').toLowerCase();

      const matchSearch = sName.includes(q) ||
        sId.includes(q) ||
        jrn.includes(q) ||
        noteText.includes(q) ||
        cashAcc.includes(q) ||
        amt.includes(q) ||
        classGroup.includes(q);

      return matchType && matchSearch;
    });
  }, [walletHistory, walletHistorySearch, walletHistoryTypeFilter]);

  // Derived Overview Data
  const recon = overviewData?.reconciliation || {};
  const canteenShare = overviewData?.canteen_share || {};
  const vendorSummary = overviewData?.vendor_shares || {};

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800 tracking-tight flex items-center gap-2.5">
            <Store className="w-5 h-5 text-emerald-600" />
            <span>Integrasi Kantin &amp; Dompet Digital</span>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-300 text-emerald-800 font-semibold text-xs">
              <BookOpen className="w-3 h-3 text-emerald-600" />
              <span>Buku Besar &amp; Pos Dana Terintegrasi</span>
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Pusat monitoring rekonsiliasi triangulasi saldo kartu santri, pengelolaan dana titipan dompet, penyerahan hak kantin, dan pembayaran hak vendor konsinyasi.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            fetchOverview();
            fetchStudents();
            fetchCashAccounts();
            fetchWalletHistory();
            fetchCanteenPayments();
            fetchVendorPayments();
          }}
          disabled={loadingOverview}
          className="px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold shadow-xs flex items-center gap-2 transition cursor-pointer self-start md:self-auto disabled:opacity-50"
        >
          <RotateCcw className={`w-3.5 h-3.5 ${loadingOverview ? 'animate-spin text-emerald-600' : 'text-slate-500'}`} />
          <span>Sinkronisasi Data Real-Time</span>
        </button>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-1.5 p-1 bg-slate-200/70 rounded-2xl overflow-x-auto text-xs font-semibold">
        <button
          type="button"
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 rounded-xl transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'overview' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
          <span>1. Monitoring &amp; Rekonsiliasi</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('wallet')}
          className={`px-4 py-2 rounded-xl transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'wallet' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Wallet className="w-3.5 h-3.5 text-blue-600" />
          <span>2. Kelola Dompet Santri</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('canteen_share')}
          className={`px-4 py-2 rounded-xl transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'canteen_share' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5 text-amber-600" />
          <span>3. Penyerahan Hak Kantin</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('vendor_share')}
          className={`px-4 py-2 rounded-xl transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'vendor_share' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Users className="w-3.5 h-3.5 text-purple-600" />
          <span>4. Pembayaran Hak Vendor</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('transfers')}
          className={`px-4 py-2 rounded-xl transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'transfers' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <ArrowRightLeft className="w-3.5 h-3.5 text-indigo-600" />
          <span>5. Mutasi Kas Dompet</span>
        </button>
      </div>

      {/* ========================================================= */}
      {/* TAB 1: MONITORING & REKONSILIASI TRIANGULASI */}
      {/* ========================================================= */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Banner Rekonsiliasi Triangulasi Saldo */}
          <div className="bg-gradient-to-br from-slate-900 via-slate-850 to-slate-900 border border-slate-700/80 rounded-2xl p-5 text-white shadow-md">
            <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-slate-700/60 gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400 font-bold">
                  <Sparkles className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                    <span>Audit &amp; Rekonsiliasi Triangulasi Saldo Dompet Santri</span>
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Penyandingan 3 titik: Saldo Kartu (DB Kantin) vs Pos Dana `canteen_wallet` vs Buku Besar Akun Titipan COA 404 (DB Keuangan)
                  </p>
                </div>
              </div>

              <div>
                {loadingOverview ? (
                  <span className="px-3 py-1 bg-slate-800 border border-slate-600 rounded-full text-[11px] text-slate-300 flex items-center gap-1.5">
                    <Loader2 className="w-3 h-3 animate-spin text-emerald-400" />
                    <span>Memeriksa saldo...</span>
                  </span>
                ) : recon?.is_balanced ? (
                  <span className="px-3 py-1 bg-emerald-500/15 border border-emerald-400/40 rounded-full text-[11px] text-emerald-300 font-bold flex items-center gap-1.5">
                    <BadgeCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>100% SINKRON &amp; BALANCE</span>
                  </span>
                ) : (
                  <span className="px-3 py-1 bg-amber-500/20 border border-amber-400/40 rounded-full text-[11px] text-amber-300 font-bold flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                    <span>SELISIH: Rp {Math.abs(recon?.diff_card_fund || 0).toLocaleString('id-ID')}</span>
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
              {/* Box 1: Saldo Seluruh Kartu Santri */}
              <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl p-3.5">
                <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400 flex items-center justify-between">
                  <span>Saldo Seluruh Kartu Santri</span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-700 text-slate-300 font-normal">DB Kantin</span>
                </div>
                <div className="text-lg font-black text-amber-400 mt-1 font-mono">
                  {formatCurrency(recon?.total_card_balance || 0)}
                </div>
                <div className="text-[10px] text-slate-400 mt-1">
                  {recon?.total_active_students || 0} Santri Terdaftar
                </div>
              </div>

              {/* Box 2: Saldo Pos Dana Dompet */}
              <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl p-3.5">
                <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400 flex items-center justify-between">
                  <span>Saldo Pos Dana Titipan</span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-900/60 text-emerald-300 font-normal">canteen_wallet</span>
                </div>
                <div className="text-lg font-black text-emerald-400 mt-1 font-mono">
                  {formatCurrency(recon?.total_fund_balance || 0)}
                </div>
                <div className="text-[10px] text-slate-400 mt-1">
                  DB Keuangan (Fund Balances)
                </div>
              </div>

              {/* Box 3: Buku Besar Akun 404 */}
              <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl p-3.5">
                <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400 flex items-center justify-between">
                  <span>Buku Besar Akun Titipan</span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-900/60 text-blue-300 font-normal font-mono">COA {recon?.wallet_coa_code || '404'}</span>
                </div>
                <div className="text-lg font-black text-blue-400 mt-1 font-mono">
                  {formatCurrency(recon?.total_ledger_balance || 0)}
                </div>
                <div className="text-[10px] text-slate-400 mt-1 truncate" title={recon?.wallet_coa_name}>
                  {recon?.wallet_coa_name || 'Dana Titipan Dompet Santri'}
                </div>
              </div>

              {/* Box 4: Pos Dana Pendapatan Kantin */}
              <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl p-3.5">
                <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400 flex items-center justify-between">
                  <span>Pos Dana Realisasi Hak Kantin</span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-900/60 text-purple-300 font-normal">canteen_income</span>
                </div>
                <div className="text-lg font-black text-purple-300 mt-1 font-mono">
                  {formatCurrency(recon?.total_canteen_income_fund || 0)}
                </div>
                <div className="text-[10px] text-slate-400 mt-1">
                  Akumulasi Penyerahan ke Keuangan
                </div>
              </div>
            </div>
          </div>

          {/* Rangkuman Piutang Belanja, Hak Kantin & Hak Vendor */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Kartu Hak Kantin */}
            <div className="p-5 bg-white border border-slate-200/90 rounded-2xl shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 text-xs">Realisasi &amp; Piutang Hak Kantin</h4>
                    <p className="text-[11px] text-slate-500">Margin laba kotor belanja dompet santri</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('canteen_share')}
                  className="text-[11px] font-bold text-amber-700 hover:text-amber-800 flex items-center gap-1 cursor-pointer"
                >
                  <span>Proses Penyerahan</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2.5 text-center">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Total Margin</span>
                  <span className="text-xs font-black text-slate-700 font-mono mt-0.5 block">
                    {formatCurrency(canteenShare?.canteen_gross_share || 0)}
                  </span>
                </div>
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                  <span className="text-[10px] font-bold text-emerald-700 uppercase block">Sudah Diserahkan</span>
                  <span className="text-xs font-black text-emerald-700 font-mono mt-0.5 block">
                    {formatCurrency(canteenShare?.canteen_paid || 0)}
                  </span>
                </div>
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200">
                  <span className="text-[10px] font-bold text-amber-800 uppercase block">Sisa Belum Diterima</span>
                  <span className="text-xs font-black text-amber-900 font-mono mt-0.5 block">
                    {formatCurrency(canteenShare?.canteen_receivable || 0)}
                  </span>
                </div>
              </div>
            </div>

            {/* Kartu Hak Vendor Titipan */}
            <div className="p-5 bg-white border border-slate-200/90 rounded-2xl shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-purple-50 border border-purple-200 text-purple-700 flex items-center justify-center">
                    <Users className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 text-xs">Realisasi &amp; Utang Hak Vendor Titipan</h4>
                    <p className="text-[11px] text-slate-500">Porsi modal HPP konsinyasi barang mitra</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('vendor_share')}
                  className="text-[11px] font-bold text-purple-700 hover:text-purple-800 flex items-center gap-1 cursor-pointer"
                >
                  <span>Proses Pembayaran</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2.5 text-center">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Total Modal HPP</span>
                  <span className="text-xs font-black text-slate-700 font-mono mt-0.5 block">
                    {formatCurrency(vendorSummary?.total_vendor_gross || 0)}
                  </span>
                </div>
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                  <span className="text-[10px] font-bold text-emerald-700 uppercase block">Sudah Dibayar</span>
                  <span className="text-xs font-black text-emerald-700 font-mono mt-0.5 block">
                    {formatCurrency(vendorSummary?.total_vendor_paid || 0)}
                  </span>
                </div>
                <div className="p-3 bg-rose-50 rounded-xl border border-rose-200">
                  <span className="text-[10px] font-bold text-rose-800 uppercase block">Sisa Utang Vendor</span>
                  <span className="text-xs font-black text-rose-900 font-mono mt-0.5 block">
                    {formatCurrency(vendorSummary?.total_vendor_payable || 0)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Tabel Vendor Mitra Konsinyasi & Status Sisa Tagihan */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h4 className="font-bold text-slate-800 text-xs">Rincian Bagi Hasil &amp; Sisa Tagihan per Vendor Mitra</h4>
                <p className="text-[11px] text-slate-500">Pelacakan akumulasi omset dan sisa pembayaran hak barang titipan</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 border-y border-slate-200/80 font-bold">
                    <th className="py-2.5 px-3">Nama Vendor</th>
                    <th className="py-2.5 px-3 text-center">Item Terjual</th>
                    <th className="py-2.5 px-3 text-right">Total Omset Belanja</th>
                    <th className="py-2.5 px-3 text-right">Hak Kotor Vendor</th>
                    <th className="py-2.5 px-3 text-right">Sudah Dibayar</th>
                    <th className="py-2.5 px-3 text-right">Sisa Tagihan (Utang)</th>
                    <th className="py-2.5 px-3 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {vendorSummary?.vendors && vendorSummary.vendors.length > 0 ? (
                    vendorSummary.vendors.map((v) => (
                      <tr key={v.vendor_id} className="hover:bg-slate-50/60 transition">
                        <td className="py-2.5 px-3 font-semibold text-slate-800">{v.vendor_name}</td>
                        <td className="py-2.5 px-3 text-center font-mono">{v.total_items_sold} pcs</td>
                        <td className="py-2.5 px-3 text-right font-mono">{formatCurrency(v.total_sales_amount)}</td>
                        <td className="py-2.5 px-3 text-right font-mono text-purple-700 font-bold">{formatCurrency(v.vendor_gross_share)}</td>
                        <td className="py-2.5 px-3 text-right font-mono text-emerald-600">{formatCurrency(v.vendor_paid)}</td>
                        <td className="py-2.5 px-3 text-right font-mono text-rose-700 font-extrabold">{formatCurrency(v.vendor_payable)}</td>
                        <td className="py-2.5 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedVendorId(String(v.vendor_id));
                              setVendorFeeAmount(String(v.vendor_payable));
                              setActiveTab('vendor_share');
                            }}
                            className="px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-lg text-[10px] font-bold transition cursor-pointer"
                          >
                            Bayar Hak
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="text-center py-6 text-slate-400">
                        Belum ada data penjualan produk vendor konsinyasi
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2: KELOLA DOMPET SANTRI (SUB-TAB SISWA & TRANSAKSI) */}
      {/* ========================================================= */}
      {activeTab === 'wallet' && (
        <div className="space-y-6">
          {/* Sub-Tabs Navigation Header */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-2.5 shadow-2xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
              <button
                type="button"
                onClick={() => setWalletSubTab('students')}
                className={`px-3.5 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                  walletSubTab === 'students'
                    ? 'bg-white text-emerald-800 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Users className="w-3.5 h-3.5 text-emerald-600" />
                <span>Daftar Santri &amp; Saldo Dompet</span>
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono font-extrabold bg-emerald-100 text-emerald-800">
                  {students.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setWalletSubTab('form')}
                className={`px-3.5 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                  walletSubTab === 'form'
                    ? 'bg-white text-blue-800 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <ArrowRightLeft className="w-3.5 h-3.5 text-blue-600" />
                <span>Transaksi Top Up &amp; Tarik Tunai</span>
              </button>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-center">
              {walletSubTab === 'students' && (
                <button
                  type="button"
                  onClick={() => {
                    setWalletSubTab('form');
                    setWalletAction('top_up');
                  }}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-2xs cursor-pointer"
                >
                  <ArrowDownCircle className="w-3.5 h-3.5 text-emerald-200" />
                  <span>+ Top Up Cepat</span>
                </button>
              )}
            </div>
          </div>

          {/* SUB-TAB 1: DAFTAR SANTRI & SALDO DOMPET */}
          {walletSubTab === 'students' && (
            <div className="space-y-4">
              {/* Metric Cards Banner */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Total Santri Aktif</p>
                    <h4 className="text-xl font-black text-slate-800 font-mono mt-0.5">{filteredCanteenStudents.length} Santri</h4>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-900 to-slate-900 border border-emerald-800 text-white shadow-2xs flex items-center justify-between">
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/30 text-emerald-400 flex items-center justify-center shrink-0">
                      <Wallet className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-bold text-emerald-300 tracking-wider">Total Saldo Dompet Beredar</p>
                      <h4 className="text-xl font-black text-emerald-400 font-mono mt-0.5">
                        {formatCurrency(totalFilteredWalletBalance)}
                      </h4>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Status Sinkronisasi</p>
                    <h4 className="text-xs font-bold text-emerald-700 flex items-center gap-1 mt-1">
                      <BadgeCheck className="w-4 h-4 text-emerald-600" />
                      <span>Terhubung Modul Kantin &amp; Keuangan</span>
                    </h4>
                  </div>
                </div>
              </div>

              {/* Filter & Table Container */}
              <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
                {/* Filter Bar */}
                <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-slate-50/50">
                  <div className="flex flex-1 flex-col sm:flex-row items-center gap-2">
                    <div className="relative w-full sm:w-72">
                      <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        value={studentFilterSearch}
                        onChange={(e) => setStudentFilterSearch(e.target.value)}
                        placeholder="Cari santri, NIS, atau kelas..."
                        className="w-full pl-9 pr-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:border-emerald-500 transition shadow-2xs"
                      />
                      {studentFilterSearch && (
                        <button
                          type="button"
                          onClick={() => setStudentFilterSearch('')}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <div className="w-full sm:w-56">
                      <select
                        value={studentFilterClass}
                        onChange={(e) => setStudentFilterClass(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-hidden focus:border-emerald-500 shadow-2xs"
                      >
                        <option value="all">Semua Rombel / Kelas ({uniqueClassGroups.length})</option>
                        {uniqueClassGroups.map(cls => (
                          <option key={cls} value={cls}>{cls}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="text-xs text-slate-400 font-medium shrink-0">
                    Menampilkan <strong className="text-slate-700 font-bold">{filteredCanteenStudents.length}</strong> santri
                  </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200/80">
                      <tr>
                        <th className="px-4 py-3">Nama Santri &amp; NIS</th>
                        <th className="px-4 py-3">Rombel / Kelas</th>
                        <th className="px-4 py-3">Saldo Dompet</th>
                        <th className="px-4 py-3">Limit Harian</th>
                        <th className="px-4 py-3">Status Kasir</th>
                        <th className="px-4 py-3 text-right">Aksi Dompet</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {filteredCanteenStudents.map((s) => (
                        <tr key={s.student_id || s.id} className="hover:bg-slate-50/70 transition">
                          {/* Nama Santri & NIS */}
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full bg-emerald-100/70 text-emerald-800 font-bold flex items-center justify-center text-[11px] shrink-0 border border-emerald-200">
                                {(s.student_name || 'S').charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p className="font-bold text-slate-800 text-[13px]">{s.student_name}</p>
                                <div className="flex items-center gap-1.5 flex-wrap text-[10px] text-slate-400 font-mono">
                                  <span>NIS: {s.nis || '-'}</span>
                                  {s.cohort_name && (
                                    <span className="text-slate-400">• {s.cohort_name}</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Kelas */}
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center gap-1 font-bold text-emerald-800 bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded-md text-[11px]">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                              <span>{s.class_group_name || '-'}</span>
                            </span>
                          </td>

                          {/* Saldo Dompet */}
                          <td className="px-4 py-3">
                            <div className="flex flex-col items-start gap-1">
                              <span className="font-mono font-black text-emerald-700 text-[13px]">
                                {formatCurrency(s.wallet_balance || 0)}
                              </span>
                              <button
                                type="button"
                                onClick={() => setHistoryModalStudent(s)}
                                className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded border border-emerald-200 transition cursor-pointer"
                                title="Lihat seluruh mutasi dompet santri"
                              >
                                <History className="w-3 h-3 text-emerald-600" />
                                <span>Mutasi Dompet</span>
                              </button>
                            </div>
                          </td>

                          {/* Limit Harian */}
                          <td className="px-4 py-3 font-mono text-slate-600 text-[11px]">
                            {s.custom_daily_limit ? formatCurrency(s.custom_daily_limit) : (
                              <span className="text-slate-400 italic">Standar Unit</span>
                            )}
                          </td>

                          {/* Status */}
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${
                              s.status === 'active'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-slate-100 text-slate-600 border border-slate-200'
                            }`}>
                              {s.status === 'active' ? 'Aktif' : 'Non-Aktif'}
                            </span>
                          </td>

                          {/* Aksi */}
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => setHistoryModalStudent(s)}
                                className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-[11px] font-bold transition flex items-center gap-1 cursor-pointer"
                                title="Lihat seluruh riwayat top up, tarik tunai & jajan"
                              >
                                <History className="w-3 h-3 text-emerald-600" />
                                <span>Mutasi</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedStudentId(String(s.student_id));
                                  setWalletSubTab('form');
                                  setWalletAction('top_up');
                                }}
                                className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 rounded-lg text-[11px] font-bold transition flex items-center gap-1 cursor-pointer"
                                title="Top Up atau Tarik Tunai Saldo Santri Ini"
                              >
                                <ArrowDownCircle className="w-3.5 h-3.5 text-blue-600" />
                                <span>Top Up</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}

                      {filteredCanteenStudents.length === 0 && (
                        <tr>
                          <td colSpan={6} className="py-12 text-center text-slate-400 italic">
                            Tidak ada santri yang cocok dengan filter pencarian
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* SUB-TAB 2: TRANSAKSI TOP UP & TARIK TUNAI */}
          {walletSubTab === 'form' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Form Top Up & Tarik Tunai */}
              <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-bold">
              <button
                type="button"
                onClick={() => {
                  setWalletAction('top_up');
                  setWalletError(null);
                  setWalletSuccess(null);
                }}
                className={`flex-1 py-2 rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  walletAction === 'top_up' ? 'bg-white text-emerald-800 shadow-2xs' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <ArrowDownCircle className="w-3.5 h-3.5 text-emerald-600" />
                <span>Top Up Saldo</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setWalletAction('withdrawal');
                  setWalletError(null);
                  setWalletSuccess(null);
                }}
                className={`flex-1 py-2 rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  walletAction === 'withdrawal' ? 'bg-white text-amber-800 shadow-2xs' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <ArrowUpCircle className="w-3.5 h-3.5 text-amber-600" />
                <span>Tarik Tunai</span>
              </button>
            </div>

            {walletError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{walletError}</span>
              </div>
            )}

            {walletSuccess && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
                <span>{walletSuccess}</span>
              </div>
            )}

            <form onSubmit={handleWalletSubmit} className="space-y-4">
              {/* Pilih Santri */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Pilih Santri</label>
                <SearchableSelect
                  options={students.map(s => ({
                    value: String(s.student_id),
                    label: s.student_name,
                    sublabel: `${s.class_group_name || ''} • Saldo: Rp${(s.wallet_balance || 0).toLocaleString('id-ID')}`
                  }))}
                  value={String(selectedStudentId)}
                  onChange={(val) => setSelectedStudentId(val)}
                  placeholder="-- Cari & Pilih Santri --"
                  searchPlaceholder="Ketik nama santri atau kelas..."
                  emptyText="Santri tidak ditemukan"
                />
              </div>

              {/* Info Card Saldo Santri Terpilih */}
              {selectedStudent && (
                <div className="p-3.5 rounded-xl bg-gradient-to-r from-slate-900 to-slate-800 text-white flex items-center justify-between shadow-2xs">
                  <div>
                    <p className="text-[9px] uppercase font-bold tracking-wider text-slate-400">Saldo Dompet Saat Ini</p>
                    <h3 className="text-lg font-black text-amber-400 mt-0.5 font-mono">
                      {formatCurrency(selectedStudent.wallet_balance || 0)}
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
                <label className="block text-xs font-bold text-slate-700 mb-1">Nominal Transaksi (Rp)</label>
                <input
                  type="number"
                  required
                  min={1000}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Contoh: 50000"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold font-mono focus:outline-hidden focus:border-emerald-500 focus:bg-white transition"
                />
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

              {/* Tanggal & Waktu Transaksi (Otomatis Terisi jika Mutasi Dipilih) */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                <div className="sm:col-span-8">
                  <DatePickerField
                    label="Tanggal Transaksi *"
                    value={walletDate}
                    onChange={(isoStr) => setWalletDate(isoStr)}
                    onTimeExtracted={(timeStr) => {
                      if (timeStr) setWalletTime(timeStr.slice(0, 5));
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
                    value={walletTime}
                    onChange={(e) => setWalletTime(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs focus:outline-hidden focus:border-emerald-500 focus:bg-white transition"
                  />
                </div>
              </div>

              {/* Pilihan Rekening Kas / Bank Penerima (Live Search Dropdown) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    {walletAction === 'top_up' ? 'Rekening Kas / Bank Penerima' : 'Kas / Bank Sumber Penarikan'}
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

              {/* Single Unified Component: Referensi Mutasi Rekening Koran */}
              {walletAction === 'top_up' && (
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
                        <span>Terkait Bank Statement</span>
                      </span>
                    )}
                  </div>

                  <SearchableSelect
                    options={bankStatementsOptions}
                    value={String(selectedBankStatementId)}
                    onChange={(val) => handleSelectBankStatement(val)}
                    placeholder="-- Cari & Pilih Mutasi Rekening Koran (Ref, Nominal, Tgl) --"
                    searchPlaceholder="Ketik nomor referensi, nominal transfer, nama bank..."
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

              {/* Catatan */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Catatan Transaksi <span className="text-slate-400 font-normal">(Opsional)</span>
                </label>
                <input
                  type="text"
                  value={walletNotes}
                  onChange={(e) => setWalletNotes(e.target.value)}
                  placeholder="Contoh: Top up setoran transfer BSI an. Ibu Rahma"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:border-emerald-500 focus:bg-white transition"
                />
              </div>

              <button
                type="submit"
                disabled={walletSubmitting || !amount || parseFloat(amount) <= 0}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-xs transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {walletSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                <span>{walletAction === 'top_up' ? 'Proses Top Up Saldo' : 'Proses Tarik Tunai'}</span>
              </button>
            </form>
          </div>

          {/* Tabel Riwayat Transaksi Dompet */}
          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
              <div>
                <h4 className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                  <Receipt className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Riwayat Transaksi Dompet Santri</span>
                </h4>
                <p className="text-[11px] text-slate-500">Histori mutasi saldo kartu &amp; nomor jurnal buku besar</p>
              </div>
              <button
                type="button"
                onClick={fetchWalletHistory}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer self-end sm:self-center"
                title="Perbarui riwayat"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Search Bar & Type Filter */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={walletHistorySearch}
                  onChange={(e) => setWalletHistorySearch(e.target.value)}
                  placeholder="Cari santri, jurnal, kas, catatan, nominal..."
                  className="w-full pl-8 pr-7 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:border-emerald-500 focus:bg-white transition"
                />
                {walletHistorySearch && (
                  <button
                    type="button"
                    onClick={() => setWalletHistorySearch('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-[11px] font-semibold shrink-0">
                <button
                  type="button"
                  onClick={() => setWalletHistoryTypeFilter('all')}
                  className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
                    walletHistoryTypeFilter === 'all'
                      ? 'bg-white text-slate-800 shadow-2xs font-bold'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Semua ({walletHistory.length})
                </button>
                <button
                  type="button"
                  onClick={() => setWalletHistoryTypeFilter('top_up')}
                  className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
                    walletHistoryTypeFilter === 'top_up'
                      ? 'bg-white text-emerald-800 shadow-2xs font-bold'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Top Up
                </button>
                <button
                  type="button"
                  onClick={() => setWalletHistoryTypeFilter('withdrawal')}
                  className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
                    walletHistoryTypeFilter === 'withdrawal'
                      ? 'bg-white text-amber-800 shadow-2xs font-bold'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Tarik Tunai
                </button>
              </div>
            </div>

            <div className="overflow-x-auto max-h-[500px]">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 border-y border-slate-200/80 font-bold sticky top-0 z-10">
                    <th className="py-2.5 px-3">Santri</th>
                    <th className="py-2.5 px-3">Jenis</th>
                    <th className="py-2.5 px-3 text-right">Nominal</th>
                    <th className="py-2.5 px-3 text-right">Saldo Akhir</th>
                    <th className="py-2.5 px-3">Jurnal Keuangan</th>
                    <th className="py-2.5 px-3 text-center">Waktu</th>
                    <th className="py-2.5 px-3 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {loadingWalletHistory ? (
                    <tr>
                      <td colSpan={7} className="text-center py-6 text-slate-400">
                        <Loader2 className="w-4 h-4 animate-spin mx-auto text-emerald-600 mb-1" />
                        <span>Memuat riwayat transaksi...</span>
                      </td>
                    </tr>
                  ) : filteredWalletHistory.length > 0 ? (
                    filteredWalletHistory.map((tx) => (
                      <tr key={tx.id} className="hover:bg-slate-50/60 transition">
                        <td className="py-2.5 px-3">
                          <span className="font-bold text-slate-800 block text-[11px]">{tx.student_name}</span>
                          <span className="text-[10px] text-slate-400 font-mono">#{tx.student_id}</span>
                          {tx.notes && (
                            <span className="text-[10px] text-slate-500 italic block mt-0.5 max-w-[200px] truncate">
                              "{tx.notes}"
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
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                              tx.transaction_type === 'top_up'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-amber-50 text-amber-800 border border-amber-200'
                            }`}
                          >
                            {tx.transaction_type === 'top_up' ? 'Top Up' : 'Tarik Tunai'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold">
                          {formatCurrency(tx.amount || 0)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-500">
                          {formatCurrency(tx.balance_after || 0)}
                        </td>
                        <td className="py-2.5 px-3">
                          {tx.journal_number ? (
                            <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-700 font-semibold">
                              {tx.journal_number}
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400">-</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center text-[10px] text-slate-400 whitespace-nowrap">
                          {tx.occurred_at ? formatDate(tx.occurred_at) : '-'}
                        </td>
                        <td className="py-2.5 px-3 text-center">
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
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="text-center py-6 text-slate-400">
                        {walletHistory.length === 0 ? 'Belum ada riwayat transaksi dompet' : 'Tidak ada transaksi yang cocok dengan filter pencarian'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )}

      {/* ========================================================= */}
      {/* TAB 3: PENYERAHAN HAK KANTIN (DISBURSEMENT) */}
      {/* ========================================================= */}
      {activeTab === 'canteen_share' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-amber-600" />
                <span>Form Penyerahan Hak Margin Kantin</span>
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Mencairkan dana bagi hasil kotor kantin dari dompet titipan ke akun kas/bank operasional kantin sekolah
              </p>
            </div>

            {/* Info Box Piutang Hak Kantin Tersedia */}
            <div className="p-4 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 text-white shadow-2xs space-y-1">
              <span className="text-[10px] uppercase font-bold tracking-wider text-amber-100 block">Sisa Hak Kantin Siap Diserahkan</span>
              <h2 className="text-xl font-black font-mono">
                {formatCurrency(canteenShare?.canteen_receivable || 0)}
              </h2>
              <p className="text-[10px] text-amber-100">
                Total Margin: {formatCurrency(canteenShare?.canteen_gross_share || 0)} • Sudah Diserahkan: {formatCurrency(canteenShare?.canteen_paid || 0)}
              </p>
            </div>

            {canteenFeeError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{canteenFeeError}</span>
              </div>
            )}

            {canteenFeeSuccess && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
                <span>{canteenFeeSuccess}</span>
              </div>
            )}

            <form onSubmit={handleCanteenFeeSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Periode Awal</label>
                  <input
                    type="date"
                    value={canteenFeePeriodStart}
                    onChange={(e) => setCanteenFeePeriodStart(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Periode Akhir</label>
                  <input
                    type="date"
                    value={canteenFeePeriodEnd}
                    onChange={(e) => setCanteenFeePeriodEnd(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nominal Penyerahan (Rp)</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    required
                    min={1000}
                    value={canteenFeeAmount}
                    onChange={(e) => setCanteenFeeAmount(e.target.value)}
                    placeholder="Contoh: 150000"
                    className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold font-mono"
                  />
                  {canteenShare?.canteen_receivable > 0 && (
                    <button
                      type="button"
                      onClick={() => setCanteenFeeAmount(String(canteenShare.canteen_receivable))}
                      className="px-3 py-2 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-xl text-xs font-bold transition cursor-pointer shrink-0"
                    >
                      Penuh
                    </button>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Rekening Kas/Bank Penerima</label>
                <select
                  value={canteenFeeCashAccountId}
                  onChange={(e) => setCanteenFeeCashAccountId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                >
                  {cashAccounts.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.bank_account_number ? `(${c.bank_name || 'Bank'} - ${c.bank_account_number})` : '(Kas Tunai)'}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Catatan</label>
                <input
                  type="text"
                  value={canteenFeeNotes}
                  onChange={(e) => setCanteenFeeNotes(e.target.value)}
                  placeholder="Keterangan penyerahan hak kantin"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <button
                type="submit"
                disabled={canteenFeeSubmitting || !canteenFeeAmount || parseFloat(canteenFeeAmount) <= 0}
                className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs shadow-xs transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {canteenFeeSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <TrendingUp className="w-4 h-4" />}
                <span>Posting Penyerahan Hak Kantin</span>
              </button>
            </form>
          </div>

          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h4 className="font-bold text-slate-800 text-xs">Histori Penyerahan Hak Kantin</h4>
                <p className="text-[11px] text-slate-500">Bukti penyerahan hak kantin yang telah dibukukan ke Keuangan</p>
              </div>
            </div>

            <div className="overflow-x-auto max-h-[500px]">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 border-y border-slate-200/80 font-bold sticky top-0 z-10">
                    <th className="py-2.5 px-3">ID Bayar</th>
                    <th className="py-2.5 px-3">Periode</th>
                    <th className="py-2.5 px-3 text-right">Nominal</th>
                    <th className="py-2.5 px-3">Bukti Kas Masuk (BKM)</th>
                    <th className="py-2.5 px-3 text-center">Waktu Posting</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {loadingCanteenPayments ? (
                    <tr>
                      <td colSpan={5} className="text-center py-6 text-slate-400">
                        <Loader2 className="w-4 h-4 animate-spin mx-auto text-amber-600 mb-1" />
                        <span>Memuat data penyerahan...</span>
                      </td>
                    </tr>
                  ) : canteenPayments.length > 0 ? (
                    canteenPayments.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50/60 transition">
                        <td className="py-2.5 px-3 font-mono font-semibold">#CFP-{p.id}</td>
                        <td className="py-2.5 px-3 text-[11px] text-slate-600">
                          {p.period_start ? formatDate(p.period_start) : '-'} s/d {p.period_end ? formatDate(p.period_end) : '-'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-amber-700">
                          {formatCurrency(p.amount || 0)}
                        </td>
                        <td className="py-2.5 px-3">
                          {p.finance_receipt_number ? (
                            <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold">
                              Kwitansi #{p.finance_receipt_number}
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400">Tercatat Internal</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center text-[10px] text-slate-400">
                          {p.paid_at ? formatDate(p.paid_at) : '-'}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="text-center py-6 text-slate-400">
                        Belum ada histori penyerahan hak kantin
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 4: PEMBAYARAN HAK VENDOR TITIPAN (PAYOUTS) */}
      {/* ========================================================= */}
      {activeTab === 'vendor_share' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Users className="w-4 h-4 text-purple-600" />
                <span>Form Pembayaran Hak Vendor Titipan</span>
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Mencatat pembayaran modal HPP konsinyasi barang titipan kepada vendor mitra via kas/bank
              </p>
            </div>

            {vendorFeeError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{vendorFeeError}</span>
              </div>
            )}

            {vendorFeeSuccess && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
                <span>{vendorFeeSuccess}</span>
              </div>
            )}

            <form onSubmit={handleVendorFeeSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Pilih Vendor Mitra</label>
                <select
                  required
                  value={selectedVendorId}
                  onChange={(e) => {
                    setSelectedVendorId(e.target.value);
                    const v = vendorSummary?.vendors?.find(item => String(item.vendor_id) === String(e.target.value));
                    if (v) setVendorFeeAmount(String(v.vendor_payable || ''));
                  }}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                >
                  <option value="">-- Pilih Vendor Mitra --</option>
                  {vendorSummary?.vendors?.map(v => (
                    <option key={v.vendor_id} value={v.vendor_id}>
                      {v.vendor_name} (Sisa Tagihan: {formatCurrency(v.vendor_payable)})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Periode Awal</label>
                  <input
                    type="date"
                    value={vendorFeePeriodStart}
                    onChange={(e) => setVendorFeePeriodStart(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Periode Akhir</label>
                  <input
                    type="date"
                    value={vendorFeePeriodEnd}
                    onChange={(e) => setVendorFeePeriodEnd(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nominal Pembayaran (Rp)</label>
                <input
                  type="number"
                  required
                  min={1000}
                  value={vendorFeeAmount}
                  onChange={(e) => setVendorFeeAmount(e.target.value)}
                  placeholder="Contoh: 200000"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Kas / Bank Sumber Pengeluaran</label>
                <select
                  value={vendorFeeCashAccountId}
                  onChange={(e) => setVendorFeeCashAccountId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                >
                  {cashAccounts.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.bank_account_number ? `(${c.bank_name || 'Bank'} - ${c.bank_account_number})` : '(Kas Tunai)'}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Catatan Pembayaran</label>
                <input
                  type="text"
                  value={vendorFeeNotes}
                  onChange={(e) => setVendorFeeNotes(e.target.value)}
                  placeholder="Keterangan pembayaran vendor"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <button
                type="submit"
                disabled={vendorFeeSubmitting || !selectedVendorId || !vendorFeeAmount || parseFloat(vendorFeeAmount) <= 0}
                className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-xs shadow-xs transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {vendorFeeSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Users className="w-4 h-4" />}
                <span>Proses Pembayaran Hak Vendor</span>
              </button>
            </form>
          </div>

          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h4 className="font-bold text-slate-800 text-xs">Histori Pembayaran Hak Vendor</h4>
                <p className="text-[11px] text-slate-500">Daftar pelunasan hak barang titipan vendor mitra</p>
              </div>
            </div>

            <div className="overflow-x-auto max-h-[500px]">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 border-y border-slate-200/80 font-bold sticky top-0 z-10">
                    <th className="py-2.5 px-3">Vendor</th>
                    <th className="py-2.5 px-3">Periode</th>
                    <th className="py-2.5 px-3 text-right">Nominal</th>
                    <th className="py-2.5 px-3">Keterangan / BKK</th>
                    <th className="py-2.5 px-3 text-center">Waktu Bayar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {loadingVendorPayments ? (
                    <tr>
                      <td colSpan={5} className="text-center py-6 text-slate-400">
                        <Loader2 className="w-4 h-4 animate-spin mx-auto text-purple-600 mb-1" />
                        <span>Memuat data pembayaran...</span>
                      </td>
                    </tr>
                  ) : vendorPayments.length > 0 ? (
                    vendorPayments.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50/60 transition">
                        <td className="py-2.5 px-3 font-bold text-slate-800">{p.vendor}</td>
                        <td className="py-2.5 px-3 text-[11px] text-slate-600">
                          {p.period_start ? formatDate(p.period_start) : '-'} s/d {p.period_end ? formatDate(p.period_end) : '-'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-purple-700">
                          {formatCurrency(p.amount || 0)}
                        </td>
                        <td className="py-2.5 px-3 text-[11px] text-slate-600">
                          {p.notes || '-'}
                        </td>
                        <td className="py-2.5 px-3 text-center text-[10px] text-slate-400">
                          {p.paid_at ? formatDate(p.paid_at) : '-'}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="text-center py-6 text-slate-400">
                        Belum ada histori pembayaran hak vendor
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 5: MUTASI KAS DOMPET KANTIN (CASH TRANSFERS) */}
      {/* ========================================================= */}
      {activeTab === 'transfers' && (
        <div className="max-w-2xl mx-auto bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-5">
          <div className="border-b border-slate-100 pb-4">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <ArrowRightLeft className="w-4.5 h-4.5 text-indigo-600" />
              <span>Mutasi Kas Operasional Dompet Kantin</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Pemindahan fisik saldo kas penampungan dompet santri antar-rekening (contoh: Penarikan uang dari Kas Bank Penampung Dompet BSI ke Kas Fisik Kasir Kantin).
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-indigo-50/70 border border-indigo-200/80 text-indigo-950 text-xs flex items-start gap-2.5">
            <Sparkles className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <strong>Catatan Akuntansi:</strong> Pemindahan saldo kas antar rekening ini merupakan mutasi likuiditas internal. Transaksi ini <strong>tidak mengubah</strong> saldo kewajiban santri (`fund_balances.canteen_wallet` dan saldo kartu santri tetap sama), hanya lokasi fisik/rekening uang kas yang berpindah.
            </p>
          </div>

          {transferError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{transferError}</span>
            </div>
          )}

          {transferSuccess && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
              <span>{transferSuccess}</span>
            </div>
          )}

          <form onSubmit={handleCashTransferSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Rekening Kas Asal (Pengirim)</label>
                <select
                  required
                  value={transferFromAccountId}
                  onChange={(e) => setTransferFromAccountId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                >
                  {cashAccounts.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.bank_account_number ? `(${c.bank_name || 'Bank'} - ${c.bank_account_number})` : '(Kas Tunai)'}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Rekening Kas Tujuan (Penerima)</label>
                <select
                  required
                  value={transferToAccountId}
                  onChange={(e) => setTransferToAccountId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                >
                  {cashAccounts.map(c => (
                    <option key={c.id} value={c.id} disabled={String(c.id) === String(transferFromAccountId)}>
                      {c.name} {c.bank_account_number ? `(${c.bank_name || 'Bank'} - ${c.bank_account_number})` : '(Kas Tunai)'}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nominal Mutasi (Rp)</label>
                <input
                  type="number"
                  required
                  min={1000}
                  value={transferAmount}
                  onChange={(e) => setTransferAmount(e.target.value)}
                  placeholder="Contoh: 500000"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Tanggal Transaksi</label>
                <input
                  type="date"
                  required
                  value={transferDate}
                  onChange={(e) => setTransferDate(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Catatan / Keterangan Mutasi</label>
              <input
                type="text"
                value={transferNotes}
                onChange={(e) => setTransferNotes(e.target.value)}
                placeholder="Contoh: Penarikan tunai saldo dompet dari Bank BSI untuk modal kasir kantin"
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
              />
            </div>

            <button
              type="submit"
              disabled={transferSubmitting || !transferAmount || parseFloat(transferAmount) <= 0 || transferFromAccountId === transferToAccountId}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs shadow-xs transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {transferSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRightLeft className="w-4 h-4" />}
              <span>Eksekusi Mutasi Kas Dompet</span>
            </button>
          </form>
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
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-medium">
                {editError}
              </div>
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

              {/* Tanggal Transaksi (DatePickerField dengan dukungan format DD/MM/YYYY) & Jam */}
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

              {/* Rekening Kas / Bank Penerima */}
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

              {/* Referensi Mutasi Rekening Koran (Jika Bank / Ada Mutasi) */}
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

                  <span className="text-[10px] text-slate-500 block mt-1">
                    <strong className="text-amber-700">Info:</strong> Jika referensi rekening koran diganti atau dihapus, alokasi yang sebelumnya terpakai pada mutasi rekening koran lama akan otomatis dibatalkan dan kuota mutasi lama dikembalikan.
                  </span>
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
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  Catatan ini akan tersimpan permanen di riwayat jejak audit (audit log).
                </span>
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

      {/* Modal Riwayat Mutasi Dompet Santri Lengkap (Top Up, Tarik Tunai, Jajan POS) */}
      <StudentWalletHistoryModal
        isOpen={!!historyModalStudent}
        onClose={() => setHistoryModalStudent(null)}
        student={historyModalStudent}
        apiEndpoint="/keuangan/canteen/wallet-transactions"
        onTopUpClick={(st) => {
          setSelectedStudentId(String(st?.student_id || st?.id));
          setWalletSubTab('form');
          setWalletAction('top_up');
        }}
      />
    </div>
  );
}
