import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useAuth } from '../../../shared/store/AuthContext';
import api from '../../../shared/services/api';
import * as XLSX from 'xlsx';
import SearchableSelect from '../../../shared/components/SearchableSelect';
import DatePickerField from '../../../shared/components/DatePickerField';
import {
  Landmark,
  Calendar,
  Search,
  Filter,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Clock,
  CalendarDays,
  FileSpreadsheet,
  Download,
  Upload,
  Plus,
  Trash2,
  Edit3,
  Link as LinkIcon,
  Unlink,
  RefreshCw,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Building2,
  Layers,
  HelpCircle,
  Eye,
  Check,
  X,
  CreditCard,
  Hash,
  FileText,
  Sparkles
} from 'lucide-react';

const MONTH_OPTIONS = [
  { value: '', label: 'Semua Bulan' },
  { value: '1', label: '01 - Januari' },
  { value: '2', label: '02 - Februari' },
  { value: '3', label: '03 - Maret' },
  { value: '4', label: '04 - April' },
  { value: '5', label: '05 - Mei' },
  { value: '6', label: '06 - Juni' },
  { value: '7', label: '07 - Juli' },
  { value: '8', label: '08 - Agustus' },
  { value: '9', label: '09 - September' },
  { value: '10', label: '10 - Oktober' },
  { value: '11', label: '11 - November' },
  { value: '12', label: '12 - Desember' }
];

const MONTH_NAMES_FULL = [
  '', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

const cleanAccountName = (name) => {
  if (!name) return 'Bank';
  return String(name).replace(/\s*\(.*?\)/g, '').trim() || 'Bank';
};

export default function BankStatements() {
  const { activeSchoolUnit, schoolUnits } = useAuth();
  const fileInputRef = useRef(null);

  // Filter States
  const [bankAccounts, setBankAccounts] = useState([]);
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [academicYears, setAcademicYears] = useState([]);
  const [selectedAcademicYearId, setSelectedAcademicYearId] = useState('');
  
  // Year & Month Filter States
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [availableYears, setAvailableYears] = useState([2026, 2025, 2024, 2023]);
  const [showCustomDateRange, setShowCustomDateRange] = useState(false);

  // Specific Date Range
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // all, reconciled, unreconciled
  const [dcFilter, setDcFilter] = useState(''); // all, credit, debit
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Debounce search input for instant live search
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 350);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  // Sorting States
  const [sortBy, setSortBy] = useState('transaction_date');
  const [sortDir, setSortDir] = useState('desc');

  // Data States
  const [loading, setLoading] = useState(false);
  const [statements, setStatements] = useState([]);
  const [summary, setSummary] = useState({
    total_rows: 0,
    total_credit: 0,
    total_debit: 0,
    net_mutation: 0,
    opening_balance: 0,
    final_balance: 0,
    reconciled_count: 0,
    unreconciled_count: 0,
    reconciliation_rate: 0
  });
  const [pagination, setPagination] = useState({
    current_page: 1,
    per_page: 25,
    total_pages: 1,
    total_records: 0
  });

  // Modal Manual States
  const [showManualModal, setShowManualModal] = useState(false);
  const [manualForm, setManualForm] = useState({
    cash_account_id: '',
    transaction_date: new Date().toISOString().slice(0, 16),
    journal_number: '',
    description: '',
    amount: '',
    dc_type: 'credit',
    running_balance: ''
  });
  const [savingManual, setSavingManual] = useState(false);

  // Modal Edit States
  const [showEditModal, setShowEditModal] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [editForm, setEditForm] = useState({
    cash_account_id: '',
    transaction_date: '',
    journal_number: '',
    description: '',
    amount: '',
    dc_type: 'credit',
    running_balance: ''
  });
  const [savingEdit, setSavingEdit] = useState(false);

  // Modal Reconcile States
  const [showReconcileModal, setShowReconcileModal] = useState(false);
  const [reconcileTarget, setReconcileTarget] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [customReconcileForm, setCustomReconcileForm] = useState({
    reference_type: 'student_bill_payment',
    reference_id: '',
    notes: ''
  });
  const [reconciling, setReconciling] = useState(false);

  // Modal Import States
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [parsedRows, setParsedRows] = useState([]);
  const [columnHeaders, setColumnHeaders] = useState([]);
  const [columnMapping, setColumnMapping] = useState({
    date_key: '',
    desc_key: '',
    ref_key: '',
    debit_key: '',
    credit_key: '',
    amount_key: '',
    dc_key: '',
    balance_key: ''
  });
  const [importAccountId, setImportAccountId] = useState('');
  const [importing, setImporting] = useState(false);

  // Multiselect & Bulk Delete States
  const [selectedIds, setSelectedIds] = useState([]);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [deletingBulk, setDeletingBulk] = useState(false);

  // Selected statistics
  const selectedStatements = useMemo(() => {
    return statements.filter(s => selectedIds.includes(s.id));
  }, [statements, selectedIds]);

  const selectedReconciledCount = useMemo(() => {
    return selectedStatements.filter(s => s.is_reconciled).length;
  }, [selectedStatements]);

  const selectedUnreconciledCount = useMemo(() => {
    return selectedStatements.length - selectedReconciledCount;
  }, [selectedStatements, selectedReconciledCount]);

  const handleSelectAll = () => {
    if (selectedIds.length === statements.length && statements.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(statements.map(s => s.id));
    }
  };

  const handleSelectRow = (id) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  // Academic Year options
  const academicYearFilterOptions = useMemo(() => {
    const map = new Map();
    academicYears.forEach(ay => {
      const key = (ay.name || '').trim();
      if (!key) return;
      const existing = map.get(key);
      if (!existing || (ay.is_active && !existing.is_active)) {
        map.set(key, ay);
      }
    });
    const list = Array.from(map.values());
    list.sort((a, b) => (b.name || '').localeCompare(a.name || ''));

    return [
      { value: '', label: 'Semua Periode (Bebas)', sublabel: 'Filter berdasarkan kalender umum atau rentang tanggal' },
      ...list.map(ay => ({
        value: String(ay.id),
        label: `T.A. ${ay.name} ${ay.is_active ? '(Aktif)' : ''}`,
        sublabel: `1 Tahun Ajaran: 1 Juli ${ay.name?.split('/')[0] || ''} - 30 Juni ${ay.name?.split('/')[1] || ''}`,
        badge: ay.is_active ? 'AKTIF' : undefined,
        badgeClass: 'bg-emerald-100 text-emerald-800 font-bold'
      }))
    ];
  }, [academicYears]);

  const selectedAyObj = useMemo(() => {
    return academicYears.find(ay => String(ay.id) === String(selectedAcademicYearId)) || null;
  }, [academicYears, selectedAcademicYearId]);

  // Year & Month options
  const yearOptions = useMemo(() => {
    const list = new Set([...availableYears, 2026, 2025, 2024, 2023]);
    return Array.from(list).sort((a, b) => b - a);
  }, [availableYears]);

  const yearFilterOptions = useMemo(() => {
    return [
      { value: '', label: 'Semua Tahun' },
      ...yearOptions.map(y => ({ value: String(y), label: `Tahun ${y}` }))
    ];
  }, [yearOptions]);

  const effectiveMonthOptions = useMemo(() => {
    if (selectedAcademicYearId) {
      return [
        { value: '', label: 'Semua Bulan (1 Tahun Ajaran Penuh)' },
        { value: '7', label: '07 - Juli (Awal T.A.)' },
        { value: '8', label: '08 - Agustus' },
        { value: '9', label: '09 - September' },
        { value: '10', label: '10 - Oktober' },
        { value: '11', label: '11 - November' },
        { value: '12', label: '12 - Desember' },
        { value: '1', label: '01 - Januari' },
        { value: '2', label: '02 - Februari' },
        { value: '3', label: '03 - Maret' },
        { value: '4', label: '04 - April' },
        { value: '5', label: '05 - Mei' },
        { value: '6', label: '06 - Juni (Akhir T.A.)' }
      ];
    }
    return MONTH_OPTIONS;
  }, [selectedAcademicYearId]);

  // Handle Column Header Sort
  const handleSort = (columnKey) => {
    if (sortBy === columnKey) {
      setSortDir(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(columnKey);
      setSortDir(columnKey === 'description' || columnKey === 'journal_number' ? 'asc' : 'desc');
    }
    setPagination(p => ({ ...p, current_page: 1 }));
  };

  // Monthly Quick Navigation Handlers
  const handlePrevMonth = () => {
    const currentM = parseInt(selectedMonth, 10) || new Date().getMonth() + 1;
    const currentY = parseInt(selectedYear, 10) || new Date().getFullYear();

    if (currentM === 1) {
      setSelectedMonth('12');
      setSelectedYear(String(currentY - 1));
    } else {
      setSelectedMonth(String(currentM - 1));
      setSelectedYear(String(currentY));
    }
    setPagination(p => ({ ...p, current_page: 1 }));
  };

  const handleNextMonth = () => {
    const currentM = parseInt(selectedMonth, 10) || new Date().getMonth() + 1;
    const currentY = parseInt(selectedYear, 10) || new Date().getFullYear();

    if (currentM === 12) {
      setSelectedMonth('1');
      setSelectedYear(String(currentY + 1));
    } else {
      setSelectedMonth(String(currentM + 1));
      setSelectedYear(String(currentY));
    }
    setPagination(p => ({ ...p, current_page: 1 }));
  };

  const handleShowAllPeriods = () => {
    setSelectedAcademicYearId('');
    setSelectedYear('');
    setSelectedMonth('');
    setStartDate('');
    setEndDate('');
    setPagination(p => ({ ...p, current_page: 1 }));
  };

  const handleSelectFullAcademicYear = (ayId) => {
    setSelectedAcademicYearId(String(ayId));
    setSelectedYear('');
    setSelectedMonth('');
    setStartDate('');
    setEndDate('');
    setShowCustomDateRange(false);
    setPagination(p => ({ ...p, current_page: 1 }));
  };

  // Clear selection on filter/page change
  useEffect(() => {
    setSelectedIds([]);
  }, [
    pagination.current_page,
    pagination.per_page,
    activeSchoolUnit,
    selectedAccountId,
    selectedAcademicYearId,
    selectedYear,
    selectedMonth,
    startDate,
    endDate,
    statusFilter,
    dcFilter,
    sortBy,
    sortDir
  ]);

  // Notifications
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  const showNotification = (type, message) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback({ type: '', message: '' }), 5000);
  };

  // Memoized SearchableSelect Options (Sederhana: Nama Kas & Nomor Rekening tanpa teks di dalam kurung)
  const bankAccountOptions = useMemo(() => {
    return bankAccounts.map(acc => {
      const cleanName = cleanAccountName(acc.name);
      return {
        value: String(acc.id),
        label: acc.bank_account_number ? `${cleanName} - ${acc.bank_account_number}` : cleanName
      };
    });
  }, [bankAccounts]);

  const bankAccountFilterOptions = useMemo(() => {
    return [
      { value: '', label: 'Semua Rekening Bank' },
      ...bankAccountOptions
    ];
  }, [bankAccountOptions]);

  const statusOptions = [
    { value: 'all', label: 'Semua Status' },
    { value: 'unreconciled', label: 'Belum Tertaut / Bersisa Plafon (🟡)', badge: 'Sisa/Belum', badgeClass: 'bg-amber-100 text-amber-800 font-semibold' },
    { value: 'partial', label: 'Terpakai Sebagian (⚡)', badge: 'Sebagian', badgeClass: 'bg-blue-100 text-blue-800 font-semibold' },
    { value: 'reconciled', label: 'Habis / Cocok Penuh (🟢)', badge: 'Habis', badgeClass: 'bg-emerald-100 text-emerald-800 font-semibold' }
  ];

  const dcOptions = [
    { value: '', label: 'Semua Mutasi (D/C)' },
    { value: 'credit', label: 'Kredit (CR) - Uang Masuk', badge: '+ CR', badgeClass: 'bg-emerald-100 text-emerald-800 font-bold' },
    { value: 'debit', label: 'Debit (DB) - Uang Keluar', badge: '- DB', badgeClass: 'bg-rose-100 text-rose-800 font-bold' }
  ];

  // Load Bank Accounts & Master Data
  useEffect(() => {
    fetchMasterData();
  }, [activeSchoolUnit?.id]);

  // Load Statements on filter changes
  useEffect(() => {
    fetchStatements();
  }, [
    activeSchoolUnit?.id,
    selectedAccountId,
    selectedAcademicYearId,
    selectedYear,
    selectedMonth,
    startDate,
    endDate,
    statusFilter,
    dcFilter,
    debouncedSearch,
    sortBy,
    sortDir,
    pagination.current_page,
    pagination.per_page
  ]);

  const fetchMasterData = async () => {
    try {
      // 1. Fetch Cash Accounts & filter for account_kind = 'bank'
      const accRes = await api.get('/keuangan/cash-accounts');
      if (accRes.data?.success) {
        const banks = (accRes.data.data || []).filter(acc => acc.account_kind === 'bank' && acc.is_active);
        setBankAccounts(banks);
        if (banks.length > 0 && !importAccountId) {
          setImportAccountId(String(banks[0].id));
        }
      }

      // 2. Fetch Academic Years (fallback graceful jika belum dibuat)
      let ayList = [];
      try {
        const ayRes = await api.get('/akademik/academic-years');
        ayList = ayRes.data?.data || ayRes.data?.academic_years || (Array.isArray(ayRes.data) ? ayRes.data : []);
      } catch (e) {
        try {
          const fallbackRes = await api.get('/keuangan/academic-years').catch(() => api.get('/keuangan/master-data/academic-years'));
          ayList = fallbackRes?.data?.data || [];
        } catch (_) {}
      }
      setAcademicYears(ayList);
    } catch (err) {
      console.error('Error fetching master data:', err);
    }
  };

  const fetchStatements = async () => {
    try {
      setLoading(true);
      const params = {
        page: pagination.current_page,
        per_page: pagination.per_page,
        sort_by: sortBy,
        sort_dir: sortDir
      };

      if (selectedYear) params.year = selectedYear;
      if (selectedMonth) params.month = selectedMonth;
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;
      if (selectedAccountId) params.cash_account_id = selectedAccountId;
      if (selectedAcademicYearId) params.academic_year_id = selectedAcademicYearId;
      if (statusFilter === 'reconciled') params.is_reconciled = true;
      else if (statusFilter === 'unreconciled') params.is_reconciled = false;
      else if (statusFilter === 'partial') params.is_reconciled = 'partial';
      if (dcFilter) params.dc_type = dcFilter;
      if (debouncedSearch) params.search = debouncedSearch;

      const res = await api.get('/keuangan/bank-statements', { params });
      if (res.data?.success) {
        setStatements(res.data.data.statements || []);
        setSummary(res.data.data.summary || {});
        if (res.data.data.summary?.available_years?.length > 0) {
          const newYears = res.data.data.summary.available_years;
          setAvailableYears(prev => {
            const isSame = prev.length === newYears.length && prev.every((y, idx) => y === newYears[idx]);
            return isSame ? prev : newYears;
          });
        }
        if (res.data.data.pagination) {
          const pg = res.data.data.pagination;
          setPagination(prev => {
            if (prev.total_pages === pg.total_pages && prev.total_records === pg.total_records && prev.current_page === pg.current_page) {
              return prev;
            }
            return {
              ...prev,
              total_pages: pg.total_pages,
              total_records: pg.total_records
            };
          });
        }
      }
    } catch (err) {
      console.error('Error fetching bank statements:', err);
      showNotification('error', 'Gagal memuat data mutasi rekening koran');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    if (e) e.preventDefault();
    setDebouncedSearch(searchTerm);
    setPagination(p => ({ ...p, current_page: 1 }));
  };

  // Open Reconcile Modal & Fetch candidates
  const openReconcileModal = async (statement) => {
    setReconcileTarget(statement);
    setCandidates([]);
    const defaultRemAmt = statement.remaining_amount !== undefined ? statement.remaining_amount : statement.amount;
    setCustomReconcileForm({
      reference_type: statement.dc_type === 'credit' ? 'student_bill_payment' : 'expense',
      reference_id: '',
      amount: String(defaultRemAmt || ''),
      notes: ''
    });
    setShowReconcileModal(true);

    try {
      setLoadingCandidates(true);
      const res = await api.get(`/keuangan/bank-statements/${statement.id}/reconcile-candidates`);
      if (res.data?.success) {
        setCandidates(res.data.data.candidates || []);
      }
    } catch (err) {
      console.error('Error fetching candidates:', err);
    } finally {
      setLoadingCandidates(false);
    }
  };

  // Perform Reconcile
  const handleReconcile = async (refType, refId, notes, amount = null) => {
    if (!reconcileTarget) return;
    try {
      setReconciling(true);
      const payload = {
        reference_type: refType,
        reference_id: refId,
        notes: notes || null
      };
      if (amount) payload.amount = parseFloat(amount);
      const res = await api.post(`/keuangan/bank-statements/${reconcileTarget.id}/reconcile`, payload);

      if (res.data?.success) {
        showNotification('success', 'Rujukan transaksi internal berhasil ditautkan ke rekening koran!');
        setShowReconcileModal(false);
        fetchStatements();
      }
    } catch (err) {
      showNotification('error', err.response?.data?.message || 'Gagal menautkan rekonsiliasi');
    } finally {
      setReconciling(false);
    }
  };

  // Perform Unreconcile
  const handleUnreconcile = async (statementId, referenceRecordId = null) => {
    const confirmMsg = referenceRecordId
      ? 'Lepas rujukan transaksi ini dari mutasi rekening koran?'
      : 'Lepas seluruh rujukan rekonsiliasi untuk baris rekening koran ini?';
    if (!window.confirm(confirmMsg)) return;
    try {
      const payload = referenceRecordId ? { reference_record_id: referenceRecordId } : {};
      const res = await api.post(`/keuangan/bank-statements/${statementId}/unreconcile`, payload);
      if (res.data?.success) {
        showNotification('success', referenceRecordId ? '1 Rujukan rekonsiliasi berhasil dilepas' : 'Seluruh rujukan rekonsiliasi berhasil dilepas');
        fetchStatements();
        if (showReconcileModal && reconcileTarget && reconcileTarget.id === statementId) {
          const refreshed = await api.get(`/keuangan/bank-statements/${statementId}`);
          if (refreshed.data?.data) setReconcileTarget(refreshed.data.data);
        }
      }
    } catch (err) {
      showNotification('error', err.response?.data?.message || 'Gagal melepas rujukan');
    }
  };

  // Delete Statement
  const handleDeleteStatement = async (statementId) => {
    if (!window.confirm('Yakin ingin menghapus baris rekening koran ini?')) return;
    try {
      const res = await api.delete(`/keuangan/bank-statements/${statementId}`);
      if (res.data?.success) {
        showNotification('success', 'Baris rekening koran berhasil dihapus');
        setSelectedIds(prev => prev.filter(id => id !== statementId));
        fetchStatements();
      }
    } catch (err) {
      showNotification('error', err.response?.data?.message || 'Gagal menghapus baris rekening koran');
    }
  };

  // Bulk Delete Statements
  const handleExecuteBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    try {
      setDeletingBulk(true);
      const res = await api.post('/keuangan/bank-statements/bulk-delete', {
        ids: selectedIds
      });
      if (res.data?.success) {
        showNotification('success', res.data.message || `${selectedIds.length} baris rekening koran berhasil dihapus`);
        setShowBulkDeleteModal(false);
        setSelectedIds([]);
        fetchStatements();
      }
    } catch (err) {
      showNotification('error', err.response?.data?.message || 'Gagal menghapus mutasi rekening koran terpilih');
    } finally {
      setDeletingBulk(false);
    }
  };

  // Save Manual Form
  const handleSaveManual = async (e) => {
    e.preventDefault();
    try {
      setSavingManual(true);
      const savedAccountId = manualForm.cash_account_id || selectedAccountId;
      const res = await api.post('/keuangan/bank-statements', {
        ...manualForm,
        cash_account_id: savedAccountId,
        academic_year_id: selectedAcademicYearId || null
      });

      if (res.data?.success) {
        showNotification('success', 'Mutasi rekening koran berhasil dicatat');
        setShowManualModal(false);
        setManualForm({
          cash_account_id: savedAccountId || '',
          transaction_date: new Date().toISOString().slice(0, 16),
          journal_number: '',
          description: '',
          amount: '',
          dc_type: 'credit',
          running_balance: ''
        });

        // Pastikan filter tidak menyembunyikan data baru
        let shouldFetch = true;
        if (startDate || endDate) {
          setStartDate('');
          setEndDate('');
          shouldFetch = false; // useEffect will trigger fetchStatements
        }
        if (selectedAccountId && selectedAccountId !== String(savedAccountId)) {
          setSelectedAccountId(String(savedAccountId));
          shouldFetch = false; // useEffect will trigger fetchStatements
        }
        
        if (shouldFetch) {
          fetchStatements();
        }
      }
    } catch (err) {
      showNotification('error', err.response?.data?.message || 'Gagal mencatat mutasi rekening koran');
    } finally {
      setSavingManual(false);
    }
  };

  // Open Edit Modal
  const openEditModal = (statement) => {
    setEditTarget(statement);
    let txDate = '';
    if (statement.transaction_date) {
      const d = new Date(statement.transaction_date);
      if (!isNaN(d.getTime())) {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const hours = String(d.getHours()).padStart(2, '0');
        const minutes = String(d.getMinutes()).padStart(2, '0');
        const seconds = String(d.getSeconds()).padStart(2, '0');
        txDate = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
      }
    }
    setEditForm({
      cash_account_id: statement.cash_account_id ? String(statement.cash_account_id) : '',
      transaction_date: txDate || new Date().toISOString().slice(0, 19),
      journal_number: statement.journal_number || '',
      description: statement.description || '',
      amount: statement.amount !== undefined && statement.amount !== null ? String(statement.amount) : '',
      dc_type: statement.dc_type || 'credit',
      running_balance: statement.running_balance !== null && statement.running_balance !== undefined ? String(statement.running_balance) : ''
    });
    setShowEditModal(true);
  };

  // Handle Save Edit Form
  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editTarget) return;
    try {
      setSavingEdit(true);
      const res = await api.put(`/keuangan/bank-statements/${editTarget.id}`, {
        cash_account_id: editForm.cash_account_id || editTarget.cash_account_id,
        transaction_date: editForm.transaction_date,
        journal_number: editForm.journal_number || null,
        description: editForm.description,
        amount: editForm.amount,
        dc_type: editForm.dc_type,
        running_balance: editForm.running_balance !== '' ? editForm.running_balance : null
      });

      if (res.data?.success) {
        showNotification('success', 'Mutasi rekening koran berhasil diperbarui');
        setShowEditModal(false);
        setEditTarget(null);
        fetchStatements();
      }
    } catch (err) {
      showNotification('error', err.response?.data?.message || 'Gagal memperbarui mutasi rekening koran');
    } finally {
      setSavingEdit(false);
    }
  };

  // Export to Excel
  const handleExportExcel = async () => {
    try {
      const params = new URLSearchParams({
        start_date: startDate,
        end_date: endDate
      });
      if (selectedAccountId) params.append('cash_account_id', selectedAccountId);
      if (statusFilter !== 'all') params.append('is_reconciled', statusFilter === 'reconciled');
      if (dcFilter) params.append('dc_type', dcFilter);

      const response = await api.get(`/keuangan/bank-statements/export?${params.toString()}`, {
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `rekening-koran-${startDate}-sd-${endDate}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      showNotification('success', 'Laporan rekening koran berhasil diekspor');
    } catch (err) {
      showNotification('error', 'Gagal mengekspor file Excel');
    }
  };

  // Download Template Excel
  const handleDownloadTemplate = async () => {
    try {
      const response = await api.get('/keuangan/bank-statements/template', {
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'template-rekening-koran.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      showNotification('error', 'Gagal mengunduh template Excel');
    }
  };

  // Handle Excel File Selection for Import
  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportFile(file);
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws, { defval: '' });

        if (!data || data.length === 0) {
          showNotification('error', 'File Excel kosong atau tidak memiliki data');
          return;
        }

        setParsedRows(data);
        const headers = Object.keys(data[0] || {});
        setColumnHeaders(headers);

        // Smart auto-detect column mapping
        const autoMap = {
          date_key: headers.find(h => /tgl|tanggal|date|waktu/i.test(h)) || '',
          desc_key: headers.find(h => /uraian|keterangan|deskripsi|desc|narasi/i.test(h)) || '',
          ref_key: headers.find(h => /ref|jurnal|nomor/i.test(h) && !/rekening/i.test(h)) || '',
          debit_key: headers.find(h => /^debit|^db|^keluar/i.test(h) && !/kredit|uraian/i.test(h)) || '',
          credit_key: headers.find(h => /^kredit|^cr|^masuk/i.test(h) && !/debit|uraian/i.test(h)) || '',
          amount_key: headers.find(h => /^nominal|^amount|^jumlah|nominal\s*mutasi/i.test(h) && !/uraian|keterangan|deskripsi/i.test(h)) || headers.find(h => /nominal/i.test(h) && !/uraian|keterangan/i.test(h)) || '',
          dc_key: headers.find(h => /arus|tipe|dc|d\/c/i.test(h)) || '',
          balance_key: headers.find(h => /saldo|balance/i.test(h)) || ''
        };
        setColumnMapping(autoMap);
      } catch (err) {
        showNotification('error', 'Format file Excel tidak dapat dibaca');
      }
    };
    reader.readAsBinaryString(file);
  };

  // Submit Import
  const handleExecuteImport = async () => {
    if (!importAccountId) {
      showNotification('error', 'Pilih rekening bank tujuan import');
      return;
    }
    if (parsedRows.length === 0) {
      showNotification('error', 'Tidak ada data untuk diimpor');
      return;
    }

    try {
      setImporting(true);
      const res = await api.post('/keuangan/bank-statements/import', {
        cash_account_id: importAccountId,
        academic_year_id: selectedAcademicYearId || null,
        rows: parsedRows,
        column_mapping: columnMapping
      });

      if (res.data?.success) {
        showNotification('success', res.data.message || 'Import berhasil');
        setShowImportModal(false);
        setParsedRows([]);
        setImportFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
        fetchStatements();
      }
    } catch (err) {
      const errMsg = err.response?.data?.message || 'Gagal mengimpor file rekening koran';
      showNotification('error', errMsg);
    } finally {
      setImporting(false);
    }
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(val || 0);
  };

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6">
      {/* Toast Feedback */}
      {feedback.message && (
        <div
          className={`p-4 rounded-xl flex items-center justify-between shadow-lg border transition-all animate-fadeIn ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <div className="flex items-center space-x-3">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            )}
            <span className="font-medium text-sm">{feedback.message}</span>
          </div>
          <button
            onClick={() => setFeedback({ type: '', message: '' })}
            className="p-1 rounded-lg hover:bg-black/5"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header Section */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
        <div>
          <div className="flex items-center space-x-3 mb-1">
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
              <Landmark className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800">
                Rekening Koran & Rekonsiliasi Bank
              </h1>
              <p className="text-xs text-slate-500">
                Pencatatan shadow statement bank untuk referensi pencocokan transaksi internal (non-impact jurnal & saldo kas)
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2 text-xs text-slate-500 mt-2">
            <span className="px-2.5 py-1 bg-slate-100 rounded-md font-medium text-slate-700 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-slate-500" />
              {activeSchoolUnit?.name || 'Seluruh Satuan'}
            </span>
            <span className="px-2.5 py-1 bg-blue-50 text-blue-700 rounded-md font-medium flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
              Instrumen Referensi Satu Arah
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleDownloadTemplate}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
            title="Unduh format baku Excel"
          >
            <Download className="w-3.5 h-3.5" />
            Template
          </button>

          <button
            onClick={handleExportExcel}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            Ekspor Excel
          </button>

          <button
            onClick={() => {
              setImportAccountId(selectedAccountId || bankAccounts[0]?.id || '');
              setShowImportModal(true);
            }}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm shadow-emerald-600/20 transition-all"
          >
            <Upload className="w-4 h-4" />
            Import Excel
          </button>

          <button
            onClick={() => {
              setManualForm(prev => ({
                ...prev,
                cash_account_id: selectedAccountId || bankAccounts[0]?.id || ''
              }));
              setShowManualModal(true);
            }}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm shadow-blue-600/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            Catat Manual
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* Saldo Awal Bank */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Saldo Awal Bank
            </span>
            <div className="p-1.5 bg-blue-50 text-blue-600 rounded-xl">
              <Landmark className="w-4 h-4" />
            </div>
          </div>
          <p className="text-lg font-bold text-slate-800 font-mono">
            {formatCurrency(summary.opening_balance || 0)}
          </p>
          <p className="text-[10px] text-slate-400 mt-1 truncate">
            {selectedAccountId ? 'Saldo awal akun bank terpilih' : 'Total saldo awal seluruh bank'}
          </p>
        </div>

        {/* Total Mutasi Masuk (Kredit) */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Total Masuk (CR)
            </span>
            <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-xl">
              <ArrowDownLeft className="w-4 h-4" />
            </div>
          </div>
          <p className="text-lg font-bold text-emerald-700 font-mono">
            +{formatCurrency(summary.total_credit || 0)}
          </p>
          <p className="text-[10px] text-slate-400 mt-1 truncate">
            Uang masuk mutasi bank
          </p>
        </div>

        {/* Total Mutasi Keluar (Debit) */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Total Keluar (DB)
            </span>
            <div className="p-1.5 bg-rose-50 text-rose-600 rounded-xl">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <p className="text-lg font-bold text-rose-700 font-mono">
            -{formatCurrency(summary.total_debit || 0)}
          </p>
          <p className="text-[10px] text-slate-400 mt-1 truncate">
            Uang keluar mutasi bank
          </p>
        </div>

        {/* Saldo Kas Berjalan (Saldo Awal + Net Mutasi) */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white p-4 rounded-2xl border border-slate-800 shadow-md relative overflow-hidden">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-bold text-blue-200 uppercase tracking-wider">
              Saldo Kas Berjalan
            </span>
            <div className="p-1.5 bg-blue-500/20 text-blue-300 rounded-xl border border-blue-500/30">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <p className="text-lg font-extrabold text-white font-mono">
            {formatCurrency(summary.final_balance !== undefined ? summary.final_balance : (summary.opening_balance || 0) + summary.net_mutation)}
          </p>
          <div className="flex items-center gap-1.5 text-[10px] text-slate-300 mt-1 font-medium">
            <span>Saldo Awal</span>
            <span className={summary.net_mutation >= 0 ? 'text-emerald-400 font-mono' : 'text-rose-400 font-mono'}>
              {summary.net_mutation >= 0 ? `+${formatCurrency(summary.net_mutation)}` : formatCurrency(summary.net_mutation)}
            </span>
          </div>
        </div>

        {/* Progress Rekonsiliasi */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Rekonsiliasi
            </span>
            <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded-lg text-[10px] font-bold">
              {summary.reconciliation_rate}%
            </span>
          </div>
          <div className="flex items-baseline space-x-1.5">
            <p className="text-lg font-bold text-slate-800 font-mono">
              {summary.reconciled_count}
            </p>
            <span className="text-[11px] text-slate-400">/ {summary.total_rows} cocok</span>
          </div>
          {/* Progress Bar */}
          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
            <div
              className="bg-blue-600 h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, summary.reconciliation_rate)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
          {/* Rekening Bank (SearchableSelect) */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Rekening Bank
            </label>
            <SearchableSelect
              options={bankAccountFilterOptions}
              value={selectedAccountId}
              onChange={(val) => {
                setSelectedAccountId(val || '');
                setPagination(p => ({ ...p, current_page: 1 }));
              }}
              placeholder="Semua Rekening Bank"
              searchPlaceholder="Cari rekening bank..."
              accentColor="blue"
              allowClear={true}
            />
          </div>

          {/* Filter Tahun Ajaran */}
          <div>
            <label className="block text-xs font-semibold text-indigo-700 flex items-center justify-between mb-1">
              <span>Tahun Ajaran</span>
              {selectedAcademicYearId && (
                <span className="text-[10px] px-1.5 py-0.2 bg-indigo-100 text-indigo-700 font-bold rounded">
                  Aktif
                </span>
              )}
            </label>
            <SearchableSelect
              options={academicYearFilterOptions}
              value={selectedAcademicYearId}
              onChange={(val) => {
                setSelectedAcademicYearId(val || '');
                if (val) {
                  // Default to full academic year (all months)
                  setSelectedMonth('all');
                  setSelectedYear('');
                }
                setPagination(p => ({ ...p, current_page: 1 }));
              }}
              placeholder="Semua Tahun Ajaran"
              searchPlaceholder="Pilih Tahun Ajaran..."
              accentColor="indigo"
              allowClear={true}
            />
          </div>

          {/* Filter Bulan */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Bulan Transaksi
            </label>
            <SearchableSelect
              options={effectiveMonthOptions}
              value={selectedMonth}
              onChange={(val) => {
                setSelectedMonth(val || '');
                if (val && val !== 'all' && !selectedAcademicYearId && !selectedYear) {
                  setSelectedYear(String(new Date().getFullYear()));
                }
                setPagination(p => ({ ...p, current_page: 1 }));
              }}
              placeholder={selectedAcademicYearId ? "Semua Bulan (1 T.A. Penuh)" : "Semua Bulan"}
              searchPlaceholder="Pilih bulan..."
              accentColor={selectedAcademicYearId ? "indigo" : "blue"}
              allowClear={true}
            />
          </div>

          {/* Filter Tahun Kalender */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Tahun Kalender
            </label>
            <SearchableSelect
              options={yearFilterOptions}
              value={selectedYear}
              onChange={(val) => {
                setSelectedYear(val || '');
                setPagination(p => ({ ...p, current_page: 1 }));
              }}
              placeholder="Semua Tahun"
              searchPlaceholder="Pilih / cari tahun..."
              accentColor="blue"
              allowClear={true}
            />
          </div>

          {/* Status Rekonsiliasi (SearchableSelect) */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Status Rekonsiliasi
            </label>
            <SearchableSelect
              options={statusOptions}
              value={statusFilter}
              onChange={(val) => {
                setStatusFilter(val || 'all');
                setPagination(p => ({ ...p, current_page: 1 }));
              }}
              placeholder="Semua Status"
              searchPlaceholder="Cari status..."
              accentColor="blue"
              allowClear={false}
            />
          </div>

          {/* Tipe D/C (SearchableSelect) */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Arus Mutasi (D/C)
            </label>
            <SearchableSelect
              options={dcOptions}
              value={dcFilter}
              onChange={(val) => {
                setDcFilter(val || '');
                setPagination(p => ({ ...p, current_page: 1 }));
              }}
              placeholder="Semua Mutasi"
              searchPlaceholder="Cari tipe mutasi..."
              accentColor="blue"
              allowClear={true}
            />
          </div>
        </div>

        {/* Academic Year Active Banner / Quick View Toggle */}
        {selectedAcademicYearId && selectedAyObj && (
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-gradient-to-r from-indigo-50 via-blue-50 to-indigo-50/50 border border-indigo-200/80 rounded-xl text-xs">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold shadow-sm shadow-indigo-200 flex-shrink-0">
                <Calendar className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center flex-wrap gap-2">
                  <span className="font-bold text-indigo-950 text-sm">
                    T.A. {selectedAyObj.name}
                  </span>
                  {selectedAyObj.is_active ? (
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold rounded-md text-[10px]">
                      Tahun Ajaran Aktif
                    </span>
                  ) : null}
                  <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 font-medium rounded-md text-[10px]">
                    {(!selectedMonth || selectedMonth === 'all')
                      ? '📅 1 Tahun Ajaran Penuh (Semua Bulan)'
                      : `📅 Bulan: ${MONTH_OPTIONS.find(m => m.value === selectedMonth)?.label || selectedMonth}`}
                  </span>
                  {selectedAccountId && (
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-800 font-bold rounded-md text-[10px] flex items-center gap-1 border border-blue-200/60">
                      <Landmark className="w-3 h-3 text-blue-600" />
                      {cleanAccountName(bankAccounts.find(b => String(b.id) === String(selectedAccountId))?.name) || 'Rekening Terpilih'}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-indigo-700/80 mt-0.5">
                  Menampilkan mutasi rekening koran untuk periode tahun ajaran ({selectedAyObj.name})
                  {selectedAccountId
                    ? ` • Filter Akun: ${bankAccounts.find(b => String(b.id) === String(selectedAccountId))?.name}`
                    : ' • Seluruh Rekening Bank'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {selectedMonth && selectedMonth !== 'all' ? (
                <button
                  type="button"
                  onClick={() => handleSelectFullAcademicYear(selectedAcademicYearId)}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-sm transition-all duration-150 flex items-center gap-1.5 text-xs cursor-pointer active:scale-95"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Tampilkan 1 Tahun Ajaran Penuh (Semua Bulan)</span>
                </button>
              ) : (
                <div className="flex items-center gap-1.5 text-indigo-800 font-semibold bg-white/80 px-3 py-1.5 rounded-lg border border-indigo-200">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Mode 1 Tahun Ajaran Penuh Aktif</span>
                </div>
              )}
              <button
                type="button"
                onClick={() => {
                  setSelectedAcademicYearId('');
                  setSelectedMonth('');
                  setPagination(p => ({ ...p, current_page: 1 }));
                }}
                className="px-2.5 py-1.5 text-slate-500 hover:text-slate-800 hover:bg-white rounded-lg transition-colors font-medium text-xs"
              >
                Reset T.A.
              </button>
            </div>
          </div>
        )}

        {/* Optional Custom Date Range Toggle & Inputs */}
        {showCustomDateRange && (
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl grid grid-cols-1 sm:grid-cols-2 gap-3 animate-in fade-in duration-150">
            <div>
              <DatePickerField
                label="Rentang Tanggal Mulai"
                value={startDate}
                onChange={(isoStr) => {
                  setStartDate(isoStr || '');
                  setPagination(p => ({ ...p, current_page: 1 }));
                }}
                placeholder="DD/MM/YYYY"
                align="auto"
              />
            </div>
            <div>
              <DatePickerField
                label="Rentang Tanggal Selesai"
                value={endDate}
                onChange={(isoStr) => {
                  setEndDate(isoStr || '');
                  setPagination(p => ({ ...p, current_page: 1 }));
                }}
                placeholder="DD/MM/YYYY"
                align="auto"
              />
            </div>
          </div>
        )}

        {/* Search Box & Quick Controls */}
        <form onSubmit={handleSearchSubmit} className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari uraian transaksi, nomor referensi/jurnal, rekening, catatan, atau nominal..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPagination(p => (p.current_page === 1 ? p : { ...p, current_page: 1 }));
              }}
              className="w-full pl-9 pr-9 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  setDebouncedSearch('');
                  setPagination(p => ({ ...p, current_page: 1 }));
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-200/60 transition-colors cursor-pointer"
                title="Hapus pencarian"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => setShowCustomDateRange(prev => !prev)}
            className={`px-3 py-2 border rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
              showCustomDateRange || startDate || endDate
                ? 'bg-blue-50 border-blue-200 text-blue-700'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Rentang Tanggal {startDate || endDate ? '(Aktif)' : ''}</span>
          </button>

          <button
            type="submit"
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer"
          >
            Terapkan
          </button>

          <button
            type="button"
            onClick={() => {
              setSearchTerm('');
              setDebouncedSearch('');
              setSelectedAccountId('');
              setSelectedAcademicYearId('');
              setSelectedYear('');
              setSelectedMonth('');
              setStartDate('');
              setEndDate('');
              setStatusFilter('all');
              setDcFilter('');
              setPagination(p => ({ ...p, current_page: 1 }));
            }}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            title="Reset semua filter"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </form>
      </div>

      {/* Bulk Action Bar (When rows selected) */}
      {selectedIds.length > 0 && (
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white px-5 py-3.5 rounded-2xl shadow-xl flex flex-wrap items-center justify-between gap-4 border border-slate-700/80 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-xs border border-blue-500/30">
              {selectedIds.length}
            </div>
            <div>
              <p className="text-xs font-bold text-white">
                {selectedIds.length} Baris Mutasi Rekening Koran Terpilih
              </p>
              <div className="flex items-center gap-2 mt-0.5 text-[11px]">
                <span className="text-emerald-400 flex items-center gap-1 font-medium">
                  <CheckCircle2 className="w-3 h-3" />
                  {selectedReconciledCount} Sudah Tertaut (Cocok)
                </span>
                <span className="text-slate-500">•</span>
                <span className="text-amber-400 flex items-center gap-1 font-medium">
                  <Clock className="w-3 h-3" />
                  {selectedUnreconciledCount} Belum Tertaut
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setSelectedIds([])}
              className="px-3.5 py-1.5 bg-slate-700/80 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium transition-colors cursor-pointer"
            >
              Batalkan Pilihan
            </button>
            <button
              type="button"
              onClick={() => setShowBulkDeleteModal(true)}
              className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-rose-600/30 transition-all cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Hapus Terpilih ({selectedIds.length})
            </button>
          </div>
        </div>
      )}

      {/* Main Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold select-none">
                <th className="py-3.5 px-3 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={statements.length > 0 && selectedIds.length === statements.length}
                    onChange={handleSelectAll}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer"
                    title="Pilih Semua di Halaman Ini"
                  />
                </th>
                <th className="py-3.5 px-3 w-12 text-center text-slate-400">No</th>

                {/* Sortable: Tanggal */}
                <th
                  onClick={() => handleSort('transaction_date')}
                  className="py-3.5 px-4 w-32 cursor-pointer hover:bg-slate-100 transition-colors group"
                  title="Klik untuk sortir berdasarkan tanggal"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Tanggal</span>
                    {sortBy === 'transaction_date' ? (
                      sortDir === 'asc' ? (
                        <ArrowUp className="w-3.5 h-3.5 text-blue-600 font-bold" />
                      ) : (
                        <ArrowDown className="w-3.5 h-3.5 text-blue-600 font-bold" />
                      )
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-40 group-hover:opacity-100" />
                    )}
                  </div>
                </th>

                {/* Sortable: Rekening Bank */}
                <th
                  onClick={() => handleSort('cash_account_name')}
                  className="py-3.5 px-4 w-44 cursor-pointer hover:bg-slate-100 transition-colors group"
                  title="Klik untuk sortir berdasarkan rekening bank"
                >
                  <div className="flex items-center gap-1.5">
                    <Landmark className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600" />
                    <span>Rekening Bank</span>
                    {sortBy === 'cash_account_name' ? (
                      sortDir === 'asc' ? (
                        <ArrowUp className="w-3.5 h-3.5 text-blue-600 font-bold" />
                      ) : (
                        <ArrowDown className="w-3.5 h-3.5 text-blue-600 font-bold" />
                      )
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-40 group-hover:opacity-100" />
                    )}
                  </div>
                </th>

                {/* Sortable: No Referensi */}
                <th
                  onClick={() => handleSort('journal_number')}
                  className="py-3.5 px-4 w-32 cursor-pointer hover:bg-slate-100 transition-colors group"
                  title="Klik untuk sortir berdasarkan nomor referensi"
                >
                  <div className="flex items-center gap-1.5">
                    <span>No. Referensi</span>
                    {sortBy === 'journal_number' ? (
                      sortDir === 'asc' ? (
                        <ArrowUp className="w-3.5 h-3.5 text-blue-600 font-bold" />
                      ) : (
                        <ArrowDown className="w-3.5 h-3.5 text-blue-600 font-bold" />
                      )
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-40 group-hover:opacity-100" />
                    )}
                  </div>
                </th>

                {/* Sortable: Uraian Mutasi */}
                <th
                  onClick={() => handleSort('description')}
                  className="py-3.5 px-4 min-w-[220px] cursor-pointer hover:bg-slate-100 transition-colors group"
                  title="Klik untuk sortir berdasarkan uraian"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Uraian Mutasi Bank</span>
                    {sortBy === 'description' ? (
                      sortDir === 'asc' ? (
                        <ArrowUp className="w-3.5 h-3.5 text-blue-600 font-bold" />
                      ) : (
                        <ArrowDown className="w-3.5 h-3.5 text-blue-600 font-bold" />
                      )
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-40 group-hover:opacity-100" />
                    )}
                  </div>
                </th>

                {/* Sortable: Tipe D/C */}
                <th
                  onClick={() => handleSort('dc_type')}
                  className="py-3.5 px-4 w-24 text-center cursor-pointer hover:bg-slate-100 transition-colors group"
                  title="Klik untuk sortir berdasarkan tipe mutasi"
                >
                  <div className="flex items-center justify-center gap-1.5">
                    <span>Tipe</span>
                    {sortBy === 'dc_type' ? (
                      sortDir === 'asc' ? (
                        <ArrowUp className="w-3.5 h-3.5 text-blue-600 font-bold" />
                      ) : (
                        <ArrowDown className="w-3.5 h-3.5 text-blue-600 font-bold" />
                      )
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-40 group-hover:opacity-100" />
                    )}
                  </div>
                </th>

                {/* Sortable: Nominal */}
                <th
                  onClick={() => handleSort('amount')}
                  className="py-3.5 px-4 w-32 text-right cursor-pointer hover:bg-slate-100 transition-colors group"
                  title="Klik untuk sortir berdasarkan nominal"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>Nominal</span>
                    {sortBy === 'amount' ? (
                      sortDir === 'asc' ? (
                        <ArrowUp className="w-3.5 h-3.5 text-blue-600 font-bold" />
                      ) : (
                        <ArrowDown className="w-3.5 h-3.5 text-blue-600 font-bold" />
                      )
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-40 group-hover:opacity-100" />
                    )}
                  </div>
                </th>

                {/* Sortable: Saldo Berjalan */}
                <th
                  onClick={() => handleSort('running_balance')}
                  className="py-3.5 px-4 w-32 text-right cursor-pointer hover:bg-slate-100 transition-colors group"
                  title="Klik untuk sortir berdasarkan saldo berjalan"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>Saldo Berjalan</span>
                    {sortBy === 'running_balance' ? (
                      sortDir === 'asc' ? (
                        <ArrowUp className="w-3.5 h-3.5 text-blue-600 font-bold" />
                      ) : (
                        <ArrowDown className="w-3.5 h-3.5 text-blue-600 font-bold" />
                      )
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-40 group-hover:opacity-100" />
                    )}
                  </div>
                </th>

                <th className="py-3.5 px-4 min-w-[220px]">Rujukan Transaksi Sistem</th>
                <th className="py-3.5 px-4 w-28 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <RefreshCw className="w-6 h-6 animate-spin text-blue-500" />
                      <span className="text-xs font-medium">Memuat data rekening koran...</span>
                    </div>
                  </td>
                </tr>
              ) : statements.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <FileSpreadsheet className="w-8 h-8 text-slate-300" />
                      <p className="font-medium text-slate-600 text-sm">Belum Ada Baris Rekening Koran</p>
                      <p className="text-xs text-slate-400 max-w-sm">
                        Silakan import berkas mutasi rekening koran dari bank Anda atau catat mutasi secara manual.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                statements.map((row, idx) => {
                  const rowNumber = (pagination.current_page - 1) * pagination.per_page + idx + 1;
                  const isSelected = selectedIds.includes(row.id);
                  return (
                    <tr
                      key={row.id}
                      className={`transition-colors ${
                        isSelected
                          ? 'bg-blue-50/80 font-medium'
                          : (row.is_reconciled ? 'bg-emerald-50/10 hover:bg-slate-50/60' : 'hover:bg-slate-50/60')
                      }`}
                    >
                      <td className="py-3 px-3 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleSelectRow(row.id)}
                          className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer"
                        />
                      </td>
                      <td className="py-3 px-3 text-center text-slate-400 font-mono text-[11px]">
                        {rowNumber}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-700 whitespace-nowrap">
                        <div className="font-semibold text-slate-800">
                          {row.transaction_date_formatted || '-'}
                        </div>
                        {row.transaction_time_formatted && (
                          <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1 mt-0.5">
                            <Clock className="w-3 h-3 text-slate-400" />
                            {row.transaction_time_formatted}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-semibold text-slate-800 text-xs flex items-center gap-1.5">
                          <Landmark className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                          <span>{cleanAccountName(row.cash_account_name)}</span>
                        </div>
                        {row.bank_account_number && (
                          <div className="text-[10px] text-slate-400 font-mono pl-5">
                            No. {row.bank_account_number}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-600 font-mono text-[11px]">
                        {row.journal_number || '-'}
                      </td>
                      <td className="py-3 px-4 text-slate-800 font-medium leading-relaxed">
                        {row.description}
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        {row.dc_type === 'credit' ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800">
                            CR (Masuk)
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-100 text-rose-800">
                            DB (Keluar)
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className={`font-semibold ${row.dc_type === 'credit' ? 'text-emerald-700' : 'text-rose-700'}`}>
                          {row.dc_type === 'credit' ? '+' : '-'} {formatCurrency(row.amount)}
                        </div>
                        {row.allocated_amount > 0 && (
                          <div className="mt-1 space-y-0.5 text-[10px]">
                            <div className="flex items-center justify-between gap-1 text-slate-500">
                              <span>Sisa:</span>
                              <span className={`font-mono font-bold ${row.remaining_amount > 0.01 ? 'text-emerald-700' : 'text-slate-400'}`}>
                                {formatCurrency(row.remaining_amount)}
                              </span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                              <div
                                className={`h-full ${row.remaining_amount <= 0.01 ? 'bg-emerald-500' : 'bg-amber-500'}`}
                                style={{ width: `${Math.min(100, Math.round(((row.allocated_amount || 0) / (row.amount || 1)) * 100))}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right text-slate-600 font-mono text-[11px] whitespace-nowrap">
                        {row.running_balance !== null ? formatCurrency(row.running_balance) : '-'}
                      </td>
                      <td className="py-3 px-4 min-w-[240px]">
                        {row.references && row.references.length > 0 ? (
                          <div className="space-y-1.5">
                            {/* Status Badge */}
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {row.remaining_amount <= 0.01 ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                  Cocok Penuh ({row.references.length} Transaksi)
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-900 border border-amber-300">
                                  <Clock className="w-3 h-3 text-amber-600" />
                                  Terpakai Sebagian ({row.references.length} Transaksi • Sisa {formatCurrency(row.remaining_amount)})
                                </span>
                              )}
                            </div>

                            {/* References List Cards */}
                            <div className="space-y-1">
                              {row.references.map((refItem) => (
                                <div
                                  key={refItem.id}
                                  className="p-1.5 bg-slate-50 border border-slate-200/80 rounded-lg text-[10px] flex items-center justify-between gap-2 hover:bg-slate-100/70 transition"
                                >
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-1">
                                      <span className="px-1 py-0.2 bg-blue-100 text-blue-800 rounded font-bold uppercase text-[9px] shrink-0">
                                        {refItem.reference_type === 'student_bill_payment' ? 'SPP/Tagihan' : refItem.reference_type}
                                      </span>
                                      <span className="font-semibold text-slate-800 truncate" title={refItem.label}>
                                        {refItem.label}
                                      </span>
                                    </div>
                                    {refItem.notes && (
                                      <p className="text-[9px] text-slate-400 italic truncate pl-0.5">
                                        "{refItem.notes}"
                                      </p>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-1.5 shrink-0">
                                    <span className="font-mono font-bold text-slate-700">
                                      {formatCurrency(refItem.amount)}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => handleUnreconcile(row.id, refItem.id)}
                                      className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition cursor-pointer"
                                      title="Lepas rujukan ini saja"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-amber-50 text-amber-800 border border-amber-200/80">
                              <Clock className="w-3 h-3 text-amber-600" />
                              Belum Ditautkan
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center space-x-1">
                          {/* Tombol Tautkan muncul jika masih ada sisa saldo mutasi (remaining_amount > 0.01) */}
                          {row.remaining_amount > 0.01 && (
                            <button
                              onClick={() => openReconcileModal(row)}
                              className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg font-bold text-[11px] flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
                              title={`Tautkan Transaksi Internal (Sisa Tersedia: ${formatCurrency(row.remaining_amount)})`}
                            >
                              <LinkIcon className="w-3 h-3 text-blue-600" />
                              <span>{row.allocated_amount > 0 ? '+ Tautkan' : 'Tautkan'}</span>
                            </button>
                          )}

                          {/* Tombol Lepas Semua Rujukan jika ada rujukan */}
                          {row.references && row.references.length > 0 && (
                            <button
                              onClick={() => handleUnreconcile(row.id)}
                              className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title={`Lepas Semua (${row.references.length}) Rujukan Rekonsiliasi`}
                            >
                              <Unlink className="w-4 h-4" />
                            </button>
                          )}

                          {/* Tombol Edit & Hapus hanya jika belum memiliki rujukan sama sekali */}
                          {(!row.references || row.references.length === 0) && (
                            <>
                              <button
                                onClick={() => openEditModal(row)}
                                className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                                title="Edit Mutasi Rekening Koran"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteStatement(row.id)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                title="Hapus"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Bottom Monthly Navigation & Pagination Bar */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col lg:flex-row items-center justify-between gap-3 text-xs text-slate-600">
          {/* Left: Summary Info */}
          <div className="flex flex-wrap items-center gap-2">
            <span>
              Menampilkan <b>{statements.length > 0 ? (pagination.current_page - 1) * pagination.per_page + 1 : 0}</b> -{' '}
              <b>{Math.min(pagination.current_page * pagination.per_page, pagination.total_records)}</b> dari{' '}
              <b>{pagination.total_records}</b> total baris mutasi
            </span>
            {(selectedMonth || selectedYear) && (
              <span className="px-2.5 py-0.5 bg-blue-100 text-blue-800 rounded-lg font-bold text-[11px] flex items-center gap-1.5 shadow-sm">
                <CalendarDays className="w-3.5 h-3.5 text-blue-600" />
                Periode: {selectedMonth ? MONTH_NAMES_FULL[parseInt(selectedMonth, 10)] : 'Semua Bulan'} {selectedYear ? selectedYear : ''}
              </span>
            )}
          </div>

          {/* Center: Monthly Paginator / Quick Monthly Navigator */}
          <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-2xl border border-slate-200 shadow-sm">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="px-2 py-1 hover:bg-slate-100 text-slate-700 hover:text-blue-700 rounded-lg transition-colors flex items-center gap-1 font-semibold text-xs cursor-pointer"
              title="Pindah ke Bulan Sebelumnya"
            >
              <ChevronLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Bulan Lalu</span>
            </button>

            <div className="h-4 w-px bg-slate-200 mx-1" />

            {/* Quick Month & Year Dropdown */}
            <div className="flex items-center gap-1.5">
              <select
                value={selectedMonth}
                onChange={(e) => {
                  setSelectedMonth(e.target.value);
                  if (e.target.value && !selectedYear) {
                    setSelectedYear(String(new Date().getFullYear()));
                  }
                  setPagination(p => ({ ...p, current_page: 1 }));
                }}
                className="px-2 py-1 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">Semua Bulan</option>
                {MONTH_OPTIONS.filter(o => o.value).map(m => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>

              <select
                value={selectedYear}
                onChange={(e) => {
                  setSelectedYear(e.target.value);
                  setPagination(p => ({ ...p, current_page: 1 }));
                }}
                className="px-2 py-1 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">Semua Thn</option>
                {yearOptions.map(y => (
                  <option key={y} value={String(y)}>{y}</option>
                ))}
              </select>
            </div>

            <div className="h-4 w-px bg-slate-200 mx-1" />

            <button
              type="button"
              onClick={handleNextMonth}
              className="px-2 py-1 hover:bg-slate-100 text-slate-700 hover:text-blue-700 rounded-lg transition-colors flex items-center gap-1 font-semibold text-xs cursor-pointer"
              title="Pindah ke Bulan Berikutnya"
            >
              <span className="hidden sm:inline">Bulan Depan</span>
              <ChevronRight className="w-4 h-4" />
            </button>

            {(selectedMonth || selectedYear) && (
              <>
                <div className="h-4 w-px bg-slate-200 mx-1" />
                <button
                  type="button"
                  onClick={handleShowAllPeriods}
                  className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-md text-[11px] font-medium transition-colors cursor-pointer"
                  title="Tampilkan Semua Periode Bulan"
                >
                  Semua
                </button>
              </>
            )}
          </div>

          {/* Right: Per Page & Page Numbers */}
          <div className="flex items-center gap-2">
            <select
              value={pagination.per_page}
              onChange={(e) => setPagination(p => ({ ...p, per_page: Number(e.target.value), current_page: 1 }))}
              className="px-2.5 py-1 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-700 cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value={10}>10 / hal</option>
              <option value={25}>25 / hal</option>
              <option value={50}>50 / hal</option>
              <option value={100}>100 / hal</option>
            </select>

            <div className="flex items-center space-x-1">
              <button
                disabled={pagination.current_page <= 1}
                onClick={() => setPagination(p => ({ ...p, current_page: p.current_page - 1 }))}
                className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-100 font-medium transition-colors cursor-pointer"
                title="Halaman Sebelumnya"
              >
                &lt;
              </button>
              <span className="px-2.5 py-1 font-bold text-slate-800">
                {pagination.current_page} / {pagination.total_pages || 1}
              </span>
              <button
                disabled={pagination.current_page >= pagination.total_pages}
                onClick={() => setPagination(p => ({ ...p, current_page: p.current_page + 1 }))}
                className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-100 font-medium transition-colors cursor-pointer"
                title="Halaman Selanjutnya"
              >
                &gt;
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL 1: Tautkan Rekonsiliasi */}
      {showReconcileModal && reconcileTarget && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-100">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <div>
                <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
                  <LinkIcon className="w-4 h-4 text-blue-600" />
                  Tautkan Rekonsiliasi Transaksi
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Cocokkan baris rekening koran dengan catatan penerimaan/pengeluaran sistem
                </p>
              </div>
              <button
                onClick={() => setShowReconcileModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Target Statement Details Card */}
            <div className="p-5 bg-slate-50/80 border-b border-slate-100 space-y-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Mutasi Rekening Koran Bank Target
              </span>
              <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200/80">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-mono font-bold text-slate-700">
                      {reconcileTarget.transaction_date_formatted}
                    </span>
                    {reconcileTarget.journal_number && (
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-mono">
                        {reconcileTarget.journal_number}
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-semibold text-slate-800 mt-1">
                    {reconcileTarget.description}
                  </p>
                </div>
                <div className="text-right">
                  <span className={`text-base font-bold ${
                    reconcileTarget.dc_type === 'credit' ? 'text-emerald-700' : 'text-rose-700'
                  }`}>
                    {reconcileTarget.dc_type === 'credit' ? '+' : '-'} {formatCurrency(reconcileTarget.amount)}
                  </span>
                  <p className="text-[10px] font-semibold text-slate-400 uppercase">
                    {reconcileTarget.dc_type === 'credit' ? 'Uang Masuk (Kredit)' : 'Uang Keluar (Debit)'}
                  </p>
                </div>
              </div>

              {/* Plafon vs Allocated vs Remaining KPI Badges */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div className="p-2.5 bg-white rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Plafon Mutasi:</span>
                  <div className="font-mono font-black text-slate-800 text-xs mt-0.5">
                    {formatCurrency(reconcileTarget.amount)}
                  </div>
                </div>
                <div className="p-2.5 bg-blue-50/70 rounded-xl border border-blue-200/70">
                  <span className="text-[10px] text-blue-700 font-bold uppercase">Sudah Teralokasi:</span>
                  <div className="font-mono font-black text-blue-800 text-xs mt-0.5">
                    {formatCurrency(reconcileTarget.allocated_amount || 0)}
                  </div>
                  <span className="text-[9px] text-blue-600">
                    ({reconcileTarget.references?.length || 0} rujukan aktif)
                  </span>
                </div>
                <div className="p-2.5 bg-emerald-50/70 rounded-xl border border-emerald-200/70">
                  <span className="text-[10px] text-emerald-700 font-bold uppercase">Sisa Plafon Tersedia:</span>
                  <div className="font-mono font-black text-emerald-800 text-xs mt-0.5">
                    {formatCurrency(reconcileTarget.remaining_amount !== undefined ? reconcileTarget.remaining_amount : reconcileTarget.amount)}
                  </div>
                </div>
              </div>
            </div>

            <div className="p-5 space-y-5">
              {/* Existing References Section if any */}
              {reconcileTarget.references && reconcileTarget.references.length > 0 && (
                <div className="space-y-2 p-3.5 bg-slate-50 border border-slate-200 rounded-2xl">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <Layers className="w-4 h-4 text-blue-600" />
                      Rujukan Transaksi yang Sudah Tertaut ({reconcileTarget.references.length}):
                    </span>
                    <button
                      type="button"
                      onClick={() => handleUnreconcile(reconcileTarget.id)}
                      className="text-[10px] font-bold text-rose-600 hover:text-rose-700 underline cursor-pointer"
                    >
                      Lepas Semua Rujukan
                    </button>
                  </div>
                  <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                    {reconcileTarget.references.map(refItem => (
                      <div
                        key={refItem.id}
                        className="p-2 bg-white border border-slate-200 rounded-xl text-xs flex items-center justify-between gap-2 shadow-2xs"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="px-1.5 py-0.2 bg-blue-100 text-blue-800 rounded font-bold uppercase text-[9px]">
                              {refItem.reference_type === 'student_bill_payment' ? 'SPP/Tagihan' : refItem.reference_type}
                            </span>
                            <span className="font-bold text-slate-800 text-[11px] truncate">
                              {refItem.label || `Ref #${refItem.reference_id}`}
                            </span>
                          </div>
                          {refItem.notes && (
                            <p className="text-[10px] text-slate-400 italic truncate pl-1">
                              "{refItem.notes}"
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="font-mono font-bold text-slate-800">
                            {formatCurrency(refItem.amount)}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleUnreconcile(reconcileTarget.id, refItem.id)}
                            className="p-1 text-rose-500 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                            title="Lepas rujukan ini"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Intelligent Candidates Section */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-2 flex items-center justify-between">
                  <span>Rekomendasi Transaksi Internal yang Cocok</span>
                  {loadingCandidates && <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-600" />}
                </h4>

                {loadingCandidates ? (
                  <div className="py-6 text-center text-xs text-slate-400">
                    Mencari transaksi dengan nominal dan tanggal berdekatan...
                  </div>
                ) : candidates.length === 0 ? (
                  <div className="p-4 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-center text-xs text-slate-400">
                    Tidak ditemukan rekomendasi otomatis yang memiliki nominal persis dalam $\pm 7$ hari.
                    Silakan gunakan form input manual di bawah.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {candidates.map((cand, cIdx) => {
                      const maxPossible = reconcileTarget.remaining_amount !== undefined ? reconcileTarget.remaining_amount : reconcileTarget.amount;
                      const allocAmt = Math.min(cand.amount, maxPossible);
                      return (
                        <div
                          key={cIdx}
                          className="p-3 bg-white hover:bg-blue-50/50 border border-slate-200 hover:border-blue-300 rounded-xl flex items-center justify-between transition-all gap-2"
                        >
                          <div className="space-y-1 min-w-0">
                            <div className="flex items-center space-x-2">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                cand.confidence === 'high' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                              }`}>
                                Akurasi: {cand.confidence}
                              </span>
                              <span className="text-xs text-slate-500 font-mono">
                                {cand.date} (selisih {cand.diff_days} hari)
                              </span>
                            </div>
                            <p className="text-xs font-semibold text-slate-800 truncate">
                              {cand.title}
                            </p>
                          </div>
                          <div className="flex items-center space-x-2.5 shrink-0">
                            <span className="text-xs font-bold text-slate-800 font-mono">
                              {formatCurrency(cand.amount)}
                            </span>
                            <button
                              onClick={() => handleReconcile(cand.reference_type, cand.reference_id, `Cocok otomatis (${cand.confidence})`, allocAmt)}
                              disabled={reconciling || maxPossible <= 0.01}
                              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow-sm transition-all cursor-pointer"
                            >
                              Pilih ({formatCurrency(allocAmt)})
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Manual Input Link Option */}
              <div className="pt-4 border-t border-slate-100 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  Atau Tautkan Manual dengan ID Transaksi
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Kategori Transaksi
                    </label>
                    <select
                      value={customReconcileForm.reference_type}
                      onChange={(e) => setCustomReconcileForm(p => ({ ...p, reference_type: e.target.value }))}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
                    >
                      <option value="student_bill_payment">Pembayaran Siswa (bill_payments)</option>
                      <option value="other_income">Penerimaan Non-SPP (other_incomes)</option>
                      <option value="expense">Pengeluaran (expenses)</option>
                      <option value="cash_transfer">Transfer Kas (cash_transfers)</option>
                      <option value="payroll">Gaji (payroll_disbursements)</option>
                      <option value="other">Lainnya (Bunga/Pajak)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      ID Transaksi Sistem *
                    </label>
                    <input
                      type="number"
                      placeholder="Contoh: 154"
                      value={customReconcileForm.reference_id}
                      onChange={(e) => setCustomReconcileForm(p => ({ ...p, reference_id: e.target.value }))}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Nominal Alokasi (Rp) *
                    </label>
                    <input
                      type="number"
                      placeholder="Nominal alokasi"
                      value={customReconcileForm.amount}
                      onChange={(e) => setCustomReconcileForm(p => ({ ...p, amount: e.target.value }))}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-emerald-800 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Catatan Rekonsiliasi (Opsional)
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Diterima transfer kliring dari wali santri"
                    value={customReconcileForm.notes}
                    onChange={(e) => setCustomReconcileForm(p => ({ ...p, notes: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
                  />
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    onClick={() => handleReconcile(
                      customReconcileForm.reference_type,
                      customReconcileForm.reference_id,
                      customReconcileForm.notes,
                      customReconcileForm.amount
                    )}
                    disabled={reconciling || !customReconcileForm.reference_id || (reconcileTarget.remaining_amount !== undefined && reconcileTarget.remaining_amount <= 0.01)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-900 disabled:opacity-40 text-white rounded-xl text-xs font-semibold cursor-pointer"
                  >
                    {reconciling ? 'Menyimpan...' : 'Tautkan Sekarang'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Import File Excel Rekening Koran */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-3xl w-full my-auto min-h-[460px] shadow-2xl border border-slate-100 p-6 space-y-5 flex flex-col justify-between">
            <div className="space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
                    <Upload className="w-5 h-5 text-emerald-600" />
                    Import Rekening Koran dari Excel (.xlsx)
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Unggah berkas mutasi dari internet banking, lakukan pemetaan kolom, dan simpan sebagai referensi rekonsiliasi.
                  </p>
                </div>
                <button
                  onClick={() => setShowImportModal(false)}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Target Bank Account */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200/80 relative z-30">
                <div className="relative z-40">
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Rekening Bank Tujuan Import <span className="text-rose-500">*</span>
                  </label>
                  <SearchableSelect
                    options={bankAccountOptions}
                    value={importAccountId}
                    onChange={(val) => setImportAccountId(val)}
                    placeholder="-- Pilih Rekening Bank --"
                    searchPlaceholder="Cari nama bank atau nomor rekening..."
                    accentColor="emerald"
                    allowClear={false}
                    dropdownPosition="auto"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Pilih Berkas Excel (.xlsx, .xls) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx, .xls, .csv"
                    onChange={handleFileSelect}
                    className="w-full text-xs text-slate-600 file:mr-3 file:py-2 file:px-3.5 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-emerald-600 file:text-white hover:file:bg-emerald-700 cursor-pointer transition-all"
                  />
                </div>
              </div>

            {/* Row Count & File Info Alert (When file is selected/parsed) */}
            {parsedRows.length > 0 ? (
              <div className="flex items-center justify-between p-4 bg-emerald-50 border border-emerald-200 rounded-2xl animate-in fade-in duration-200">
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-emerald-600/20">
                    <FileSpreadsheet className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-emerald-950">
                        Berkas Mutasi Terbaca:
                      </span>
                      <span className="px-3 py-1 bg-emerald-600 text-white rounded-full text-xs font-black font-mono shadow-sm">
                        {parsedRows.length} Baris Data Siap Diimpor
                      </span>
                    </div>
                    <p className="text-[11px] text-emerald-800 mt-0.5">
                      Nama berkas: <span className="font-semibold">{importFile?.name}</span> • Silakan pastikan pemetaan kolom di bawah sudah tepat.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-500">
                <AlertCircle className="w-4 h-4 text-slate-400 shrink-0" />
                <span>Pilih berkas Excel mutasi bank di atas untuk membaca jumlah baris transaksi dan memulai pemetaan kolom.</span>
              </div>
            )}

            {/* Column Mapping (If file selected) */}
            {columnHeaders.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                    <span>Pemetaan Kolom Excel</span>
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded-lg text-[11px] font-bold font-mono">
                      {parsedRows.length} Baris
                    </span>
                  </h4>
                  <span className="text-[11px] text-slate-400">
                    Sistem akan memproses {parsedRows.length} baris data
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl text-xs">
                  <div>
                    <label className="block font-medium text-slate-600 mb-1">Kolom Tanggal & Waktu *</label>
                    <select
                      value={columnMapping.date_key}
                      onChange={(e) => setColumnMapping(p => ({ ...p, date_key: e.target.value }))}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                    >
                      <option value="">Pilih Kolom...</option>
                      {columnHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block font-medium text-slate-600 mb-1">Kolom Uraian *</label>
                    <select
                      value={columnMapping.desc_key}
                      onChange={(e) => setColumnMapping(p => ({ ...p, desc_key: e.target.value }))}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                    >
                      <option value="">Pilih Kolom...</option>
                      {columnHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block font-medium text-slate-600 mb-1">Kolom Nominal Mutasi</label>
                    <select
                      value={columnMapping.amount_key}
                      onChange={(e) => setColumnMapping(p => ({ ...p, amount_key: e.target.value }))}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                    >
                      <option value="">Pilih Kolom...</option>
                      {columnHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block font-medium text-slate-600 mb-1">Kolom Arus Mutasi (DB/CR)</label>
                    <select
                      value={columnMapping.dc_key}
                      onChange={(e) => setColumnMapping(p => ({ ...p, dc_key: e.target.value }))}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                    >
                      <option value="">Pilih Kolom...</option>
                      {columnHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block font-medium text-slate-600 mb-1">Kolom Kredit (Masuk)</label>
                    <select
                      value={columnMapping.credit_key}
                      onChange={(e) => setColumnMapping(p => ({ ...p, credit_key: e.target.value }))}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                    >
                      <option value="">Pilih Kolom...</option>
                      {columnHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block font-medium text-slate-600 mb-1">Kolom Debit (Keluar)</label>
                    <select
                      value={columnMapping.debit_key}
                      onChange={(e) => setColumnMapping(p => ({ ...p, debit_key: e.target.value }))}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                    >
                      <option value="">Pilih Kolom...</option>
                      {columnHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block font-medium text-slate-600 mb-1">No. Referensi (Opsional)</label>
                    <select
                      value={columnMapping.ref_key}
                      onChange={(e) => setColumnMapping(p => ({ ...p, ref_key: e.target.value }))}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                    >
                      <option value="">Pilih Kolom...</option>
                      {columnHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block font-medium text-slate-600 mb-1">Saldo Berjalan (Opsional)</label>
                    <select
                      value={columnMapping.balance_key}
                      onChange={(e) => setColumnMapping(p => ({ ...p, balance_key: e.target.value }))}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                    >
                      <option value="">Pilih Kolom...</option>
                      {columnHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>
                </div>

                {/* Preview 3 Rows */}
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <div className="p-2.5 bg-slate-100 text-[11px] font-bold text-slate-700">
                    Pratinjau 3 Baris Pertama (dari total {parsedRows.length} baris)
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-[11px] divide-y divide-slate-100">
                      <thead className="bg-slate-50 text-slate-600 font-semibold">
                        <tr>
                          {columnHeaders.slice(0, 6).map(h => (
                            <th key={h} className="py-2 px-3 text-left">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {parsedRows.slice(0, 3).map((r, i) => (
                          <tr key={i}>
                            {columnHeaders.slice(0, 6).map(h => (
                              <td key={h} className="py-2 px-3 text-slate-700">{String(r[h] || '-')}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <div className="text-xs text-slate-500 font-medium">
                {parsedRows.length > 0 && (
                  <span>Total yang akan diimpor: <strong className="text-slate-800">{parsedRows.length} baris mutasi</strong></span>
                )}
              </div>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setShowImportModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleExecuteImport}
                  disabled={importing || parsedRows.length === 0}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  {importing ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Mengimpor {parsedRows.length} Baris...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-3.5 h-3.5" />
                      <span>Mulai Import ({parsedRows.length} Baris Data)</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Catat Manual Mutasi */}
      {showManualModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-slate-100 p-6 space-y-5">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-50 text-blue-600 rounded-2xl">
                  <Landmark className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-base">
                    Catat Mutasi Rekening Koran Manual
                  </h3>
                  <p className="text-xs text-slate-500">
                    Tambahkan baris mutasi bank tunggal untuk referensi pencocokan rekonsiliasi
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowManualModal(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveManual} className="space-y-4 text-xs">
              {/* Rekening Bank Dropdown (Live Search) */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Rekening Bank Target <span className="text-rose-500">*</span>
                </label>
                <SearchableSelect
                  options={bankAccountOptions}
                  value={manualForm.cash_account_id}
                  onChange={(val) => setManualForm(p => ({ ...p, cash_account_id: val }))}
                  placeholder="-- Pilih Rekening Bank --"
                  searchPlaceholder="Cari nama bank atau nomor rekening..."
                  accentColor="blue"
                  allowClear={false}
                  required
                />
              </div>

              {/* Quick Smart Paste Bar untuk Tanggal & Waktu Lengkap */}
              <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-2xl space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-blue-900 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                    Tempel / Ketik Teks Tanggal & Waktu Sekaligus
                  </label>
                  <span className="text-[10px] font-semibold text-blue-600 bg-blue-100/70 px-2 py-0.5 rounded-full">
                    Auto-Detect
                  </span>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Contoh: 29/07/2024 17.49.54 atau 01/07/2024 6:01:48"
                    onChange={(e) => {
                      const text = e.target.value;
                      if (!text.trim()) return;
                      const iso = dmyToIso(text);
                      const timeStr = extractTimeFromInput(text);
                      if (iso) {
                        const formattedTime = timeStr ? (timeStr.length === 5 ? `${timeStr}:00` : timeStr) : (manualForm.transaction_date && manualForm.transaction_date.includes('T') ? manualForm.transaction_date.split('T')[1] : '12:00:00');
                        setManualForm(p => ({
                          ...p,
                          transaction_date: `${iso}T${formattedTime}`
                        }));
                      }
                    }}
                    className="w-full pl-3 pr-8 py-2 bg-white border border-blue-200 rounded-xl text-xs font-mono font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                  />
                  <Clock className="w-3.5 h-3.5 text-blue-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
                <p className="text-[10px] text-blue-700/80 leading-tight">
                  Teks tanggal dan jam otomatis diurai dan mengisi kolom di bawah secara serentak.
                </p>
              </div>

              {/* Tanggal Transaksi (DatePickerField) & Waktu & No Referensi */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <DatePickerField
                    label="Tanggal Transaksi"
                    value={manualForm.transaction_date ? manualForm.transaction_date.slice(0, 10) : ''}
                    onChange={(isoStr) => {
                      const currentTime = manualForm.transaction_date && manualForm.transaction_date.includes('T')
                        ? manualForm.transaction_date.split('T')[1]
                        : '12:00:00';
                      setManualForm(p => ({
                        ...p,
                        transaction_date: isoStr ? `${isoStr}T${currentTime}` : ''
                      }));
                    }}
                    onTimeExtracted={(timeStr) => {
                      const datePart = manualForm.transaction_date ? manualForm.transaction_date.slice(0, 10) : new Date().toISOString().slice(0, 10);
                      const formattedTime = timeStr.length === 5 ? `${timeStr}:00` : timeStr;
                      setManualForm(p => ({
                        ...p,
                        transaction_date: `${datePart}T${formattedTime}`
                      }));
                    }}
                    placeholder="DD/MM/YYYY atau DD/MM/YYYY HH:mm:ss"
                    required
                    align="auto"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Waktu (WIB) & No. Referensi
                  </label>
                  <div className="grid grid-cols-5 gap-2">
                    <input
                      type="time"
                      step="1"
                      value={manualForm.transaction_date && manualForm.transaction_date.includes('T') ? manualForm.transaction_date.split('T')[1].slice(0, 8) : '12:00:00'}
                      onChange={(e) => {
                        const datePart = manualForm.transaction_date ? manualForm.transaction_date.slice(0, 10) : new Date().toISOString().slice(0, 10);
                        setManualForm(p => ({
                          ...p,
                          transaction_date: `${datePart}T${e.target.value}`
                        }));
                      }}
                      className="col-span-2 px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                    <input
                      type="text"
                      placeholder="Ref/Jurnal (Opsional)"
                      value={manualForm.journal_number}
                      onChange={(e) => setManualForm(p => ({ ...p, journal_number: e.target.value }))}
                      className="col-span-3 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Uraian Mutasi */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Uraian Mutasi Rekening Koran <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={2}
                  placeholder="Contoh: Setoran tunai loket / BI-FAST Transfer dari Wali Santri"
                  value={manualForm.description}
                  onChange={(e) => setManualForm(p => ({ ...p, description: e.target.value }))}
                  required
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 leading-relaxed font-medium"
                />
              </div>

              {/* Arus Mutasi (D/C) dan Nominal */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Arus Mutasi Bank <span className="text-rose-500">*</span>
                  </label>
                  <SearchableSelect
                    options={[
                      {
                        value: 'credit',
                        label: 'Kredit (CR) - Uang Masuk',
                        sublabel: 'Setoran, transfer masuk, bunga giro',
                        badge: '+ CR',
                        badgeClass: 'px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800'
                      },
                      {
                        value: 'debit',
                        label: 'Debit (DB) - Uang Keluar',
                        sublabel: 'Penarikan, transfer keluar, biaya admin, pajak',
                        badge: '- DB',
                        badgeClass: 'px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800'
                      }
                    ]}
                    value={manualForm.dc_type}
                    onChange={(val) => setManualForm(p => ({ ...p, dc_type: val }))}
                    placeholder="Pilih Arus Mutasi"
                    accentColor={manualForm.dc_type === 'credit' ? 'emerald' : 'blue'}
                    allowClear={false}
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Nominal Mutasi (Rp) <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-xs">
                      Rp
                    </span>
                    <input
                      type="number"
                      min="1"
                      placeholder="0"
                      value={manualForm.amount}
                      onChange={(e) => setManualForm(p => ({ ...p, amount: e.target.value }))}
                      required
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Saldo Berjalan Bank (Opsional) */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Saldo Berjalan Bank / Running Balance <span className="text-slate-400 font-normal">(Opsional)</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-xs">
                    Rp
                  </span>
                  <input
                    type="number"
                    placeholder="Contoh: 54500000"
                    value={manualForm.running_balance}
                    onChange={(e) => setManualForm(p => ({ ...p, running_balance: e.target.value }))}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end space-x-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowManualModal(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={savingManual || !manualForm.amount || !manualForm.description}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-sm shadow-blue-600/20 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  {savingManual ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Simpan Mutasi</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: Konfirmasi Hapus Masal Rekening Koran */}
      {showBulkDeleteModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-100 p-6 space-y-5 animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-start gap-3.5">
              <div className="p-3 bg-rose-100 text-rose-600 rounded-2xl shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Konfirmasi Hapus Masal Rekening Koran
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Harap tinjau ringkasan data yang akan dihapus secara permanen di bawah ini.
                </p>
              </div>
            </div>

            {/* Breakdown & Warning Content */}
            <div className="p-4 bg-rose-50/70 border border-rose-200/80 rounded-2xl space-y-3 text-xs">
              <div className="flex items-center justify-between text-xs font-bold text-rose-950 pb-2.5 border-b border-rose-200/80">
                <span>Total Baris Mutasi yang Dipilih:</span>
                <span className="text-sm font-black text-rose-700 font-mono bg-white px-2.5 py-0.5 rounded-lg border border-rose-200">
                  {selectedIds.length} Baris
                </span>
              </div>

              {/* Counts Breakdown */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                <div className="bg-white/90 p-3 rounded-xl border border-amber-200/80 space-y-1">
                  <div className="flex items-center gap-1.5 text-amber-800 font-semibold text-xs">
                    <Clock className="w-3.5 h-3.5 text-amber-500" />
                    Belum Tertaut:
                  </div>
                  <div className="text-lg font-bold text-amber-700 font-mono">
                    {selectedUnreconciledCount} <span className="text-xs font-normal text-slate-500">baris</span>
                  </div>
                  <p className="text-[10px] text-slate-500">
                    Mutasi murni, belum direkonsiliasi.
                  </p>
                </div>

                <div className="bg-white/90 p-3 rounded-xl border border-emerald-200/80 space-y-1">
                  <div className="flex items-center gap-1.5 text-emerald-800 font-semibold text-xs">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    Sudah Tertaut (Cocok):
                  </div>
                  <div className="text-lg font-bold text-emerald-700 font-mono">
                    {selectedReconciledCount} <span className="text-xs font-normal text-slate-500">baris</span>
                  </div>
                  <p className="text-[10px] text-slate-500">
                    Sudah cocok dengan transaksi sistem.
                  </p>
                </div>
              </div>

              {/* Special Warning if Reconciled statements exist */}
              {selectedReconciledCount > 0 && (
                <div className="p-2.5 bg-amber-100/80 border border-amber-300/80 rounded-xl text-[11px] text-amber-950 leading-relaxed">
                  <span className="font-bold">⚠️ Catatan Rekonsiliasi:</span> Terdapat <strong>{selectedReconciledCount} baris</strong> yang sudah berstatus cocok. Jika dihapus, tautan referensi rekonsiliasi akan dilepas secara otomatis tanpa menghapus transaksi asli di modul operasional (SPP/Kas/Pengeluaran).
                </div>
              )}

              <p className="text-[11px] text-rose-700 font-medium">
                ⚠️ Tindakan ini bersifat permanen. Data mutasi rekening koran yang telah dihapus tidak dapat dipulihkan kembali.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowBulkDeleteModal(false)}
                disabled={deletingBulk}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleExecuteBulkDelete}
                disabled={deletingBulk}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-rose-600/30 transition-all cursor-pointer disabled:opacity-50"
              >
                {deletingBulk ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Menghapus Data...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Ya, Hapus {selectedIds.length} Data Terpilih</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: Edit Mutasi Rekening Koran */}
      {showEditModal && editTarget && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-slate-100 p-6 space-y-5">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-50 text-blue-600 rounded-2xl">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-base">
                    Edit Mutasi Rekening Koran
                  </h3>
                  <p className="text-xs text-slate-500">
                    Perbarui data mutasi bank untuk referensi rekonsiliasi
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowEditModal(false);
                  setEditTarget(null);
                }}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
              {/* Rekening Bank Dropdown (Live Search) */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Rekening Bank Target <span className="text-rose-500">*</span>
                </label>
                <SearchableSelect
                  options={bankAccountOptions}
                  value={editForm.cash_account_id}
                  onChange={(val) => setEditForm(p => ({ ...p, cash_account_id: val }))}
                  placeholder="-- Pilih Rekening Bank --"
                  searchPlaceholder="Cari nama bank atau nomor rekening..."
                  accentColor="blue"
                  allowClear={false}
                  required
                />
              </div>

              {/* Quick Smart Paste Bar untuk Tanggal & Waktu Lengkap */}
              <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-2xl space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-blue-900 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                    Tempel / Ketik Teks Tanggal & Waktu Sekaligus
                  </label>
                  <span className="text-[10px] font-semibold text-blue-600 bg-blue-100/70 px-2 py-0.5 rounded-full">
                    Auto-Detect
                  </span>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Contoh: 29/07/2024 17.49.54 atau 01/07/2024 6:01:48"
                    onChange={(e) => {
                      const text = e.target.value;
                      if (!text.trim()) return;
                      const iso = dmyToIso(text);
                      const timeStr = extractTimeFromInput(text);
                      if (iso) {
                        const formattedTime = timeStr ? (timeStr.length === 5 ? `${timeStr}:00` : timeStr) : (editForm.transaction_date && editForm.transaction_date.includes('T') ? editForm.transaction_date.split('T')[1] : '12:00:00');
                        setEditForm(p => ({
                          ...p,
                          transaction_date: `${iso}T${formattedTime}`
                        }));
                      }
                    }}
                    className="w-full pl-3 pr-8 py-2 bg-white border border-blue-200 rounded-xl text-xs font-mono font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                  />
                  <Clock className="w-3.5 h-3.5 text-blue-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
                <p className="text-[10px] text-blue-700/80 leading-tight">
                  Teks tanggal dan jam otomatis diurai dan mengisi kolom di bawah secara serentak.
                </p>
              </div>

              {/* Tanggal Transaksi (DatePickerField) & Waktu & No Referensi */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <DatePickerField
                    label="Tanggal Transaksi"
                    value={editForm.transaction_date ? editForm.transaction_date.slice(0, 10) : ''}
                    onChange={(isoStr) => {
                      const currentTime = editForm.transaction_date && editForm.transaction_date.includes('T')
                        ? editForm.transaction_date.split('T')[1]
                        : '12:00:00';
                      setEditForm(p => ({
                        ...p,
                        transaction_date: isoStr ? `${isoStr}T${currentTime}` : ''
                      }));
                    }}
                    onTimeExtracted={(timeStr) => {
                      const datePart = editForm.transaction_date ? editForm.transaction_date.slice(0, 10) : new Date().toISOString().slice(0, 10);
                      const formattedTime = timeStr.length === 5 ? `${timeStr}:00` : timeStr;
                      setEditForm(p => ({
                        ...p,
                        transaction_date: `${datePart}T${formattedTime}`
                      }));
                    }}
                    placeholder="DD/MM/YYYY atau DD/MM/YYYY HH:mm:ss"
                    required
                    align="auto"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Waktu (WIB) & No. Referensi
                  </label>
                  <div className="grid grid-cols-5 gap-2">
                    <input
                      type="time"
                      step="1"
                      value={editForm.transaction_date && editForm.transaction_date.includes('T') ? editForm.transaction_date.split('T')[1].slice(0, 8) : '12:00:00'}
                      onChange={(e) => {
                        const datePart = editForm.transaction_date ? editForm.transaction_date.slice(0, 10) : new Date().toISOString().slice(0, 10);
                        setEditForm(p => ({
                          ...p,
                          transaction_date: `${datePart}T${e.target.value}`
                        }));
                      }}
                      className="col-span-2 px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                    <input
                      type="text"
                      placeholder="Ref/Jurnal (Opsional)"
                      value={editForm.journal_number}
                      onChange={(e) => setEditForm(p => ({ ...p, journal_number: e.target.value }))}
                      className="col-span-3 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Uraian Mutasi */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Uraian Mutasi Rekening Koran <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={2}
                  placeholder="Contoh: Setoran tunai loket / BI-FAST Transfer dari Wali Santri"
                  value={editForm.description}
                  onChange={(e) => setEditForm(p => ({ ...p, description: e.target.value }))}
                  required
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 leading-relaxed font-medium"
                />
              </div>

              {/* Arus Mutasi (D/C) dan Nominal */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Arus Mutasi Bank <span className="text-rose-500">*</span>
                  </label>
                  <SearchableSelect
                    options={[
                      {
                        value: 'credit',
                        label: 'Kredit (CR) - Uang Masuk',
                        sublabel: 'Setoran, transfer masuk, bunga giro',
                        badge: '+ CR',
                        badgeClass: 'px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800'
                      },
                      {
                        value: 'debit',
                        label: 'Debit (DB) - Uang Keluar',
                        sublabel: 'Penarikan, transfer keluar, biaya admin, pajak',
                        badge: '- DB',
                        badgeClass: 'px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800'
                      }
                    ]}
                    value={editForm.dc_type}
                    onChange={(val) => setEditForm(p => ({ ...p, dc_type: val }))}
                    placeholder="Pilih Arus Mutasi"
                    accentColor={editForm.dc_type === 'credit' ? 'emerald' : 'blue'}
                    allowClear={false}
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Nominal Mutasi (Rp) <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-xs">
                      Rp
                    </span>
                    <input
                      type="number"
                      min="1"
                      placeholder="0"
                      value={editForm.amount}
                      onChange={(e) => setEditForm(p => ({ ...p, amount: e.target.value }))}
                      required
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Saldo Berjalan Bank (Opsional) */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Saldo Berjalan Bank / Running Balance <span className="text-slate-400 font-normal">(Opsional)</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-xs">
                    Rp
                  </span>
                  <input
                    type="number"
                    placeholder="Contoh: 54500000"
                    value={editForm.running_balance}
                    onChange={(e) => setEditForm(p => ({ ...p, running_balance: e.target.value }))}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end space-x-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditTarget(null);
                  }}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={savingEdit || !editForm.amount || !editForm.description}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-sm shadow-blue-600/20 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  {savingEdit ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Menyimpan Perubahan...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Simpan Perubahan</span>
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
