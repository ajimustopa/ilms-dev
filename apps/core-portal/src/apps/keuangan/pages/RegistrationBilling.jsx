import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../shared/store/AuthContext';
import api from '../../../shared/services/api';
import SearchableSelect from '../../../shared/components/SearchableSelect';
import DatePickerField from '../../../shared/components/DatePickerField';
import * as XLSX from 'xlsx';
import {
  UserCheck,
  Receipt,
  Search,
  Filter,
  Plus,
  RefreshCw,
  RotateCw,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Printer,
  CreditCard,
  Building2,
  School,
  Calendar,
  X,
  UserPlus,
  Ban,
  Wallet,
  ArrowDownLeft,
  FileText,
  BadgeCheck,
  Eye,
  Check,
  XCircle,
  Inbox,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  Sliders,
  Award,
  Layers,
  Sparkles,
  ArrowRight,
  TrendingDown,
  Lock,
  Download,
  Upload,
  Send,
  HelpCircle,
  DollarSign,
  ChevronRight,
  Users,
  CheckSquare,
  Square,
  FileSpreadsheet,
  Edit2,
  Edit3,
  History,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Info,
  Bell,
  Percent,
  Smartphone,
  FileUp,
  FileDown,
  FileCheck,
  Zap,
  Save,
  UploadCloud
} from 'lucide-react';

export default function RegistrationBilling() {
  const navigate = useNavigate();
  const { activeSchoolUnit, user } = useAuth();
  const userRoles = user?.roles || (user?.role ? [user.role] : ['keuangan']);
  const isSuper = userRoles.includes('super_admin');
  const isYayasan = userRoles.includes('admin_yayasan') || isSuper;
  const isUnitHead = userRoles.includes('admin_satuan_pendidikan') || isYayasan;
  const isAllUnitsContext = !activeSchoolUnit || activeSchoolUnit.id === 'all' || activeSchoolUnit.is_foundation;

  // Active Main Tab: 'assignments' | 'bills' | 'payments' | 'expenses'
  const [activeMainTab, setActiveMainTab] = useState('assignments');

  // Sub-tabs inside Tab 2 (Tagihan & Matriks)
  const [billsSubTab, setBillsSubTab] = useState('matrix'); // 'matrix' | 'history' | 'reminders'

  // Sub-tabs inside Tab 3 (Penerimaan Pembayaran)
  const [paymentsSubTab, setPaymentsSubTab] = useState('cashier'); // 'cashier' | 'proofs'

  // Master Data states
  const [academicYears, setAcademicYears] = useState([]);
  const [cashAccounts, setCashAccounts] = useState([]);
  const [feeTypes, setFeeTypes] = useState([]);

  // Filter Target Academic Year (The core anchor of PPDB Context)
  const [selectedTargetAyId, setSelectedTargetAyId] = useState(() => {
    try {
      return localStorage.getItem('keuangan_ppdb_target_ay') || '';
    } catch {
      return '';
    }
  });
  const [transactionAyId, setTransactionAyId] = useState('');

  // Persist selectedTargetAyId to localStorage
  useEffect(() => {
    if (selectedTargetAyId) {
      try {
        localStorage.setItem('keuangan_ppdb_target_ay', String(selectedTargetAyId));
      } catch (e) {
        console.warn(e);
      }
    }
  }, [selectedTargetAyId]);

  // Global Loading & Refresh Trigger
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // ============================================================
  // TAB 1: PENETAPAN BIAYA PPDB STATES
  // ============================================================
  const [assignmentsData, setAssignmentsData] = useState({ candidates: [], schemes: [], total_candidates: 0 });
  const [loadingAssignments, setLoadingAssignments] = useState(false);
  const [assignmentSearch, setAssignmentSearch] = useState('');
  const [assignmentStatusFilter, setAssignmentStatusFilter] = useState('all'); // 'all', 'assigned', 'custom', 'unassigned'
  const [selectedProcessFilter, setSelectedProcessFilter] = useState('');
  const [selectedSchemeFilter, setSelectedSchemeFilter] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'student_name', direction: 'asc' });
  const [selectedCandidateIds, setSelectedCandidateIds] = useState([]);

  // Single Assign Modal
  const [singleAssignModalOpen, setSingleAssignModalOpen] = useState(false);
  const [targetCandidate, setTargetCandidate] = useState(null);
  const [selectedSchemeId, setSelectedSchemeId] = useState('');
  const [assignReason, setAssignReason] = useState('');
  const [submittingAssign, setSubmittingAssign] = useState(false);

  // Bulk Assign Modal
  const [bulkAssignModalOpen, setBulkAssignModalOpen] = useState(false);
  const [bulkSchemeId, setBulkSchemeId] = useState('');
  const [bulkReason, setBulkReason] = useState('');

  // Custom Adjustment Modal (Input Langsung Angka)
  const [customModalOpen, setCustomModalOpen] = useState(false);
  const [customCandidate, setCustomCandidate] = useState(null);
  const [customItems, setCustomItems] = useState([]);
  const [customReason, setCustomReason] = useState('');
  const [submittingCustom, setSubmittingCustom] = useState(false);

  // History Audit Modal
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [historyCandidate, setHistoryCandidate] = useState(null);
  const [historyLogs, setHistoryLogs] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // ============================================================
  // TAB 2: MATRIKS & TAGIHAN PPDB STATES
  // ============================================================
  const [matrixData, setMatrixData] = useState({ columns: [], rows: [], summary: {} });
  const [loadingMatrix, setLoadingMatrix] = useState(false);
  const [matrixSearch, setMatrixSearch] = useState('');
  const [selectedMatrixRowIds, setSelectedMatrixRowIds] = useState(new Set());

  // Modal Penerbitan / Edit Sel Matriks
  const [cellModalOpen, setCellModalOpen] = useState(false);
  const [selectedCellInfo, setSelectedCellInfo] = useState(null);
  const [cellFormData, setCellFormData] = useState({
    amount: '',
    bill_date: new Date().toISOString().slice(0, 10),
    due_date: '',
    has_discount: false,
    discount_type: 'amount', // 'amount' | 'percentage'
    discount_amount: 0,
    discount_percent: 0,
    discount_reason: '',
    notes: ''
  });
  const [submittingCell, setSubmittingCell] = useState(false);

  // Modal Batalkan Tagihan Sel
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelFormData, setCancelFormData] = useState({
    cancel_date: new Date().toISOString().slice(0, 10),
    cancel_reason: ''
  });
  const [submittingCancel, setSubmittingCancel] = useState(false);

  // Modal Konfirmasi Penerbitan Kolom Massal
  const [columnPublishModalOpen, setColumnPublishModalOpen] = useState(false);
  const [targetColumnInfo, setTargetColumnInfo] = useState(null);
  const [columnPublishFormData, setColumnPublishFormData] = useState({
    bill_date: new Date().toISOString().slice(0, 10),
    due_date: '',
    notes: '',
    has_discount: false,
    discount_type: 'amount',
    discount_amount: 0,
    discount_percent: 0,
    discount_reason: ''
  });
  const [submittingColumnPublish, setSubmittingColumnPublish] = useState(false);

  // Modal Import Excel Kolom
  const [columnImportModalOpen, setColumnImportModalOpen] = useState(false);
  const [targetImportColumnInfo, setTargetImportColumnInfo] = useState(null);
  const [importParsedRows, setImportParsedRows] = useState([]);
  const [importFileValidation, setImportFileValidation] = useState(null);
  const [importFileName, setImportFileName] = useState('');
  const [importSearchFilter, setImportSearchFilter] = useState('');
  const [importStatusFilter, setImportStatusFilter] = useState('all'); // 'all' | 'valid' | 'invalid'
  const [submittingImport, setSubmittingImport] = useState(false);
  const importFileInputRef = useRef(null);

  // Riwayat Tagihan PPDB (History)
  const [billsData, setBillsData] = useState({ bills: [], summary: {} });
  const [loadingBills, setLoadingBills] = useState(false);
  const [billSearch, setBillSearch] = useState('');
  const [billStatusFilter, setBillStatusFilter] = useState('all');
  const [billFeeTypeFilter, setBillFeeTypeFilter] = useState('');
  const [historySortConfig, setHistorySortConfig] = useState({ key: 'due_date', direction: 'desc' });

  // Detail & Revisi Tagihan Modal
  const [selectedBillDetail, setSelectedBillDetail] = useState(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [revisingBill, setRevisingBill] = useState(null);
  const [reviseModalOpen, setReviseModalOpen] = useState(false);
  const [reviseFormData, setReviseFormData] = useState({
    new_amount: '',
    new_discount_amount: 0,
    revision_reason: '',
    new_due_date: ''
  });
  const [submittingRevise, setSubmittingRevise] = useState(false);

  // Reminder Tab PPDB
  const [remindersData, setRemindersData] = useState([]);
  const [loadingReminders, setLoadingReminders] = useState(false);
  const [reminderSearch, setReminderSearch] = useState('');
  const [broadcastModalOpen, setBroadcastModalOpen] = useState(false);
  const [broadcastFilterMode, setBroadcastFilterMode] = useState('overdue'); // 'overdue' | 'unpaid_all' | 'selected'
  const [broadcastSelectedBillIds, setBroadcastSelectedBillIds] = useState([]);
  const [broadcastCustomMessage, setBroadcastCustomMessage] = useState('');
  const [submittingBroadcast, setSubmittingBroadcast] = useState(false);
  const [sendingSingleReminderId, setSendingSingleReminderId] = useState(null);

  // ============================================================
  // TAB 3: PENERIMAAN PEMBAYARAN PPDB STATES
  // ============================================================
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [selectedBillForPay, setSelectedBillForPay] = useState(null);
  const [payForm, setPayForm] = useState({
    cash_account_id: '',
    amount_paid: 0,
    payment_date: new Date().toISOString().slice(0, 10),
    payment_method: 'transfer',
    notes: ''
  });
  const [submittingPay, setSubmittingPay] = useState(false);

  // Receipt Modal
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [receiptData, setReceiptData] = useState(null);

  // Bukti Transfer Queue (Proofs FIFO)
  const [proofsData, setProofsData] = useState({ proofs: [], summary: {} });
  const [loadingProofs, setLoadingProofs] = useState(false);
  const [selectedProofForVerify, setSelectedProofForVerify] = useState(null);
  const [verifyModalOpen, setVerifyModalOpen] = useState(false);
  const [verifyForm, setVerifyForm] = useState({ cash_account_id: '', notes: '' });
  const [submittingVerify, setSubmittingVerify] = useState(false);

  // Create Direct Bill Modal (Kasir PPDB)
  const [createBillModalOpen, setCreateBillModalOpen] = useState(false);
  const [createBillForm, setCreateBillForm] = useState({
    candidate_id: '',
    registrant_name_snapshot: '',
    registration_number_snapshot: '',
    billing_phase: 'enrollment_fee',
    fee_type_id: '',
    amount: 15000000,
    notes: ''
  });
  const [submittingCreateBill, setSubmittingCreateBill] = useState(false);

  // ============================================================
  // TAB 4: PENGELUARAN PPDB STATES
  // ============================================================
  const [expensesData, setExpensesData] = useState({ expenses: [], total_expenses_amount: 0 });
  const [loadingExpenses, setLoadingExpenses] = useState(false);
  const [createExpenseModalOpen, setCreateExpenseModalOpen] = useState(false);
  const [expenseForm, setExpenseForm] = useState({
    amount: 0,
    expense_date: new Date().toISOString().slice(0, 10),
    cash_account_id: '',
    notes: '',
    category_name: 'Promosi & Iklan PPDB'
  });
  const [submittingExpense, setSubmittingExpense] = useState(false);

  // ============================================================
  // TAB 5: KARTU BAYAR PPDB STATES (REKAP GABUNGAN & INDIVIDUAL)
  // ============================================================
  const [ledgerSubTab, setLedgerSubTab] = useState('recap'); // 'recap' | 'individual'
  const [ledgerRecapData, setLedgerRecapData] = useState({ summary: {}, candidates: [] });
  const [loadingLedgerRecap, setLoadingLedgerRecap] = useState(false);
  const [ledgerRecapSearch, setLedgerRecapSearch] = useState('');
  const [ledgerRecapStatusFilter, setLedgerRecapStatusFilter] = useState('all');

  const [selectedCandidateIdForLedger, setSelectedCandidateIdForLedger] = useState('');
  const [individualLedgerData, setIndividualLedgerData] = useState(null);
  const [loadingIndividualLedger, setLoadingIndividualLedger] = useState(false);
  const [candidateSearchQuery, setCandidateSearchQuery] = useState('');

  // Navigasi ke halaman Skema Biaya dengan konteks Tahun Ajaran Sasaran yang sama
  const handleNavigateToFeeSchemes = () => {
    try {
      localStorage.setItem('keuangan_fee_schemes_selected_ay', String(selectedTargetAyId));
    } catch (e) {
      console.warn('Gagal menyimpan target academic year ke localStorage:', e);
    }
    navigate('/keuangan/fee-schemes');
  };

  // ============================================================
  // INITIAL DATA FETCHING
  // ============================================================
  useEffect(() => {
    fetchMasterMetadata();
  }, [activeSchoolUnit]);

  const fetchMasterMetadata = async () => {
    try {
      // 1. Ambil Tahun Ajaran dari modul akademik
      let yearsList = [];
      try {
        const ayParams = {};
        if (activeSchoolUnit && activeSchoolUnit.id && activeSchoolUnit.id !== 'all' && !activeSchoolUnit.is_foundation) {
          ayParams.satuan_pendidikan_id = activeSchoolUnit.id;
        }
        const ayRes = await api.get('/akademik/academic-years', { params: ayParams });
        yearsList = ayRes.data?.data || ayRes.data?.academic_years || [];
      } catch (e) {
        console.error('Error fetching academic years:', e);
      }

      // Deduplikasi Tahun Ajaran berdasarkan nama (menghilangkan duplikasi nama T.A. lintas unit sekolah)
      const uniqueYearsMap = new Map();
      yearsList.forEach((y) => {
        const nameKey = (y.name || '').trim();
        if (!nameKey) return;
        const existing = uniqueYearsMap.get(nameKey);
        if (!existing) {
          uniqueYearsMap.set(nameKey, y);
        } else if (y.is_active && !existing.is_active) {
          uniqueYearsMap.set(nameKey, y);
        }
      });
      yearsList = Array.from(uniqueYearsMap.values());

      // Urutkan tahun ajaran secara descending berdasarkan nama (misal: 2026/2027, 2025/2026, 2024/2025)
      yearsList.sort((a, b) => (b.name || '').localeCompare(a.name || ''));

      if (yearsList.length === 0) {
        yearsList = [
          { id: 2, name: '2026/2027', is_active: 1 },
          { id: 1, name: '2025/2026', is_active: 0 },
          { id: 3, name: '2024/2025', is_active: 0 }
        ];
      }
      setAcademicYears(yearsList);

      const [caRes, ftRes] = await Promise.all([
        api.get('/keuangan/cash-accounts').catch(() => ({ data: { data: [] } })),
        api.get('/keuangan/fee-types').catch(() => ({ data: { data: [] } }))
      ]);

      setCashAccounts(caRes.data?.data || []);
      setFeeTypes(ftRes.data?.data || []);

      // Default target academic year to the saved / upcoming / active year (e.g. 2025/2026 or id: 1)
      if (yearsList.length > 0) {
        const savedPpdbAy = localStorage.getItem('keuangan_ppdb_target_ay');
        const matched = yearsList.find((a) => String(a.id) === String(savedPpdbAy));
        const targetAy = matched || yearsList.find((a) => a.name?.includes('2025/2026')) || yearsList[0];
        const currentAy = yearsList.find((a) => a.name?.includes('2024/2025')) || yearsList[1] || yearsList[0];
        if (!selectedTargetAyId || !matched) {
          setSelectedTargetAyId(String(targetAy.id));
        }
        setTransactionAyId(String(currentAy.id));
      }
    } catch (err) {
      console.error('Error fetching master metadata:', err);
    }
  };

  // Fetch Tab Scoped Data when Target Academic Year or Main Tab Changes
  useEffect(() => {
    if (!selectedTargetAyId) return;

    if (activeMainTab === 'assignments') {
      fetchFeeAssignments();
    } else if (activeMainTab === 'bills') {
      if (billsSubTab === 'matrix') fetchMatrixData();
      else if (billsSubTab === 'history') fetchBillsHistory();
      else if (billsSubTab === 'reminders') fetchReminders();
    } else if (activeMainTab === 'payments') {
      if (paymentsSubTab === 'cashier') fetchBillsHistory();
      else if (paymentsSubTab === 'proofs') fetchProofsQueue();
    } else if (activeMainTab === 'expenses') {
      fetchExpenses();
    } else if (activeMainTab === 'ledger') {
      if (ledgerSubTab === 'recap') {
        fetchLedgerRecap();
      } else if (ledgerSubTab === 'individual') {
        if (selectedCandidateIdForLedger) {
          fetchIndividualLedger(selectedCandidateIdForLedger);
        } else if (assignmentsData.candidates?.length > 0) {
          const firstCand = assignmentsData.candidates[0];
          const candId = firstCand.student_id || firstCand.candidate_id;
          setSelectedCandidateIdForLedger(candId);
          fetchIndividualLedger(candId);
        }
      }
    }
  }, [selectedTargetAyId, activeMainTab, billsSubTab, paymentsSubTab, ledgerSubTab, selectedCandidateIdForLedger, refreshTrigger, activeSchoolUnit]);

  // Tab 5 Fetchers
  const fetchLedgerRecap = async () => {
    setLoadingLedgerRecap(true);
    try {
      const res = await api.get('/keuangan/ppdb-billing/ledger-recap', {
        params: {
          target_academic_year_id: selectedTargetAyId,
          payment_status: ledgerRecapStatusFilter,
          search: ledgerRecapSearch
        }
      });
      setLedgerRecapData(res.data?.data || { summary: {}, candidates: [] });
    } catch (err) {
      console.error('Error fetching PPDB ledger recap:', err);
    } finally {
      setLoadingLedgerRecap(false);
    }
  };

  const fetchIndividualLedger = async (candidateId) => {
    if (!candidateId) return;
    setLoadingIndividualLedger(true);
    try {
      const res = await api.get(`/keuangan/ppdb-billing/student-ledger/${candidateId}`, {
        params: {
          target_academic_year_id: selectedTargetAyId
        }
      });
      setIndividualLedgerData(res.data?.data || null);
    } catch (err) {
      console.error('Error fetching individual PPDB ledger:', err);
    } finally {
      setLoadingIndividualLedger(false);
    }
  };

  // Debounced search for Tab 1: Fee Assignments
  useEffect(() => {
    if (activeMainTab === 'assignments' && selectedTargetAyId) {
      const timer = setTimeout(() => {
        fetchFeeAssignments();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [assignmentSearch, assignmentStatusFilter, selectedTargetAyId, activeMainTab]);

  // Debounced search for Tab 2: Matrix
  useEffect(() => {
    if (activeMainTab === 'bills' && billsSubTab === 'matrix' && selectedTargetAyId) {
      const timer = setTimeout(() => {
        fetchMatrixData();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [matrixSearch, selectedTargetAyId, activeMainTab, billsSubTab]);

  // Debounced search for Tab 2 History & Tab 3 Kasir: Bills
  useEffect(() => {
    const isBillsHistory = activeMainTab === 'bills' && billsSubTab === 'history';
    const isCashier = activeMainTab === 'payments' && paymentsSubTab === 'cashier';
    if ((isBillsHistory || isCashier) && selectedTargetAyId) {
      const timer = setTimeout(() => {
        fetchBillsHistory();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [billSearch, billStatusFilter, selectedTargetAyId, activeMainTab, billsSubTab, paymentsSubTab]);

  // Debounced search for Tab 5 Recap
  useEffect(() => {
    if (activeMainTab === 'ledger' && ledgerSubTab === 'recap' && selectedTargetAyId) {
      const timer = setTimeout(() => {
        fetchLedgerRecap();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [ledgerRecapSearch, ledgerRecapStatusFilter, selectedTargetAyId, activeMainTab, ledgerSubTab]);

  // Tab 1 Fetcher
  const fetchFeeAssignments = async () => {
    setLoadingAssignments(true);
    try {
      const res = await api.get('/keuangan/ppdb-billing/fee-assignments', {
        params: {
          target_academic_year_id: selectedTargetAyId,
          search: assignmentSearch,
          status: assignmentStatusFilter
        }
      });
      setAssignmentsData(res.data?.data || { candidates: [], schemes: [], total_candidates: 0 });
    } catch (err) {
      console.error('Error fetching fee assignments:', err);
    } finally {
      setLoadingAssignments(false);
    }
  };

  // Tab 2 Matrix Fetcher
  const fetchMatrixData = async () => {
    setLoadingMatrix(true);
    try {
      const res = await api.get('/keuangan/ppdb-billing/matrix', {
        params: {
          target_academic_year_id: selectedTargetAyId,
          search: matrixSearch
        }
      });
      setMatrixData(res.data?.data || { columns: [], rows: [], summary: {} });
    } catch (err) {
      console.error('Error fetching matrix data:', err);
    } finally {
      setLoadingMatrix(false);
    }
  };

  // Tab 2 History / Kasir Bills Fetcher
  const fetchBillsHistory = async () => {
    setLoadingBills(true);
    try {
      const res = await api.get('/keuangan/ppdb-billing/registration-bills', {
        params: {
          target_academic_year_id: selectedTargetAyId,
          status: billStatusFilter,
          search: billSearch
        }
      });
      setBillsData(res.data?.data || { bills: [], summary: {} });
    } catch (err) {
      console.error('Error fetching bills history:', err);
    } finally {
      setLoadingBills(false);
    }
  };

  // Tab 2 Reminders Fetcher
  const fetchReminders = async () => {
    setLoadingReminders(true);
    try {
      const res = await api.get('/keuangan/student-bills/reminders/logs', {
        params: { academic_year_id: selectedTargetAyId }
      });
      setRemindersData(res.data?.data || []);
    } catch (err) {
      console.error('Error fetching reminders:', err);
    } finally {
      setLoadingReminders(false);
    }
  };

  // Tab 3 Proofs Queue Fetcher
  const fetchProofsQueue = async () => {
    setLoadingProofs(true);
    try {
      const res = await api.get('/keuangan/ppdb-billing/proofs', {
        params: { target_academic_year_id: selectedTargetAyId }
      });
      setProofsData(res.data?.data || { proofs: [], summary: {} });
    } catch (err) {
      console.error('Error fetching proofs queue:', err);
    } finally {
      setLoadingProofs(false);
    }
  };

  // Tab 4 Expenses Fetcher
  const fetchExpenses = async () => {
    setLoadingExpenses(true);
    try {
      const res = await api.get('/keuangan/ppdb-billing/expenses', {
        params: { target_academic_year_id: selectedTargetAyId }
      });
      setExpensesData(res.data?.data || { expenses: [], total_expenses_amount: 0 });
    } catch (err) {
      console.error('Error fetching expenses:', err);
    } finally {
      setLoadingExpenses(false);
    }
  };

  // Current Target Academic Year Label
  const currentTargetAy = useMemo(() => {
    return academicYears.find((a) => String(a.id) === String(selectedTargetAyId)) || { name: '2025/2026' };
  }, [academicYears, selectedTargetAyId]);

  const currentTransactionAy = useMemo(() => {
    return academicYears.find((a) => String(a.id) === String(transactionAyId)) || { name: '2024/2025' };
  }, [academicYears, transactionAyId]);

  // Currency Formatter
  const formatCurrency = (val) => {
    return `Rp ${parseFloat(val || 0).toLocaleString('id-ID')}`;
  };

  const formatRupiah = (val) => {
    if (val === null || val === undefined || val === '') return 'Rp 0';
    return `Rp ${Number(val).toLocaleString('id-ID')}`;
  };

  // Dynamic fee types list from backend PPDB assignments (Sekali Bayar -> Tahunan -> Bulanan)
  const dynamicFeeTypes = useMemo(() => {
    const rawList = assignmentsData.fee_types || feeTypes || [];
    return [...rawList].sort((a, b) => {
      const getRank = (ft) => {
        const bp = (ft.billing_pattern || '').toLowerCase();
        const name = (ft.name || '').toLowerCase();
        if (bp === 'monthly' || name.includes('spp')) return 3;
        if (bp === 'yearly' || name.includes('tahunan') || name.includes('daftar ulang')) return 2;
        return 1; // Sekali Bayar (Pendaftaran, Uang Pangkal, Seragam, Sarpras, Kegiatan, dll)
      };
      const rankDiff = getRank(a) - getRank(b);
      if (rankDiff !== 0) return rankDiff;
      return Number(a.id || 0) - Number(b.id || 0);
    });
  }, [assignmentsData.fee_types, feeTypes]);

  // Unique Process / Entry types for filtering in Tab 1
  const processOptions = useMemo(() => {
    const list = assignmentsData.candidates || [];
    const set = new Set();
    list.forEach((c) => {
      if (c.process_name) set.add(c.process_name);
    });
    return Array.from(set);
  }, [assignmentsData.candidates]);

  // Instant reactive filtered data lists while typing
  const filteredCandidates = useMemo(() => {
    let list = assignmentsData.candidates || [];
    if (assignmentStatusFilter && assignmentStatusFilter !== 'all') {
      if (assignmentStatusFilter === 'assigned') {
        list = list.filter((c) => (c.assignment?.fee_scheme_id || c.fee_scheme_id) && !c.assignment?.is_custom && c.assignment_status !== 'custom');
      } else if (assignmentStatusFilter === 'custom') {
        list = list.filter((c) => c.assignment?.is_custom || c.assignment_status === 'custom');
      } else if (assignmentStatusFilter === 'unassigned') {
        list = list.filter((c) => !c.assignment?.id && !c.fee_scheme_id && c.assignment_status === 'unassigned');
      }
    }
    if (selectedProcessFilter) {
      list = list.filter((c) => c.process_name === selectedProcessFilter);
    }
    if (selectedSchemeFilter) {
      list = list.filter((c) => String(c.assignment?.fee_scheme_id || c.fee_scheme_id) === String(selectedSchemeFilter));
    }
    if (assignmentSearch && assignmentSearch.trim()) {
      const term = assignmentSearch.toLowerCase().trim();
      list = list.filter((c) =>
        (c.student_name || c.full_name || '').toLowerCase().includes(term) ||
        (c.registration_number || c.nis || '').toLowerCase().includes(term) ||
        (c.nisn || '').toLowerCase().includes(term) ||
        (c.scheme_name || c.assignment?.scheme_name || '').toLowerCase().includes(term) ||
        (c.process_name || '').toLowerCase().includes(term)
      );
    }
    return list;
  }, [assignmentsData.candidates, assignmentStatusFilter, selectedProcessFilter, selectedSchemeFilter, assignmentSearch]);

  const sortedAndFilteredCandidates = useMemo(() => {
    return [...filteredCandidates].sort((a, b) => {
      let valA = '';
      let valB = '';

      if (sortConfig.key === 'student_name') {
        valA = a.student_name || a.full_name || '';
        valB = b.student_name || b.full_name || '';
      } else if (sortConfig.key === 'registration_number') {
        valA = a.registration_number || a.nis || '';
        valB = b.registration_number || b.nis || '';
      } else if (sortConfig.key === 'process_name') {
        valA = a.process_name || '';
        valB = b.process_name || '';
      } else if (sortConfig.key === 'scheme_name') {
        valA = a.assignment?.scheme_name || a.scheme_name || (a.assignment?.is_custom ? 'ZZ_Custom' : 'ZZ_Belum');
        valB = b.assignment?.scheme_name || b.scheme_name || (b.assignment?.is_custom ? 'ZZ_Custom' : 'ZZ_Belum');
      } else if (sortConfig.key === 'total_amount') {
        valA = Number(a.assignment?.total_amount || a.total_amount || 0);
        valB = Number(b.assignment?.total_amount || b.total_amount || 0);
        return sortConfig.direction === 'asc' ? valA - valB : valB - valA;
      } else if (sortConfig.key === 'status') {
        const getStatusRank = (st) => {
          if (st.assignment?.is_custom || st.assignment_status === 'custom') return 2;
          if (st.assignment?.id || st.fee_scheme_id) return 1;
          return 3;
        };
        valA = getStatusRank(a);
        valB = getStatusRank(b);
        return sortConfig.direction === 'asc' ? valA - valB : valB - valA;
      } else if (sortConfig.key.startsWith('fee_type_')) {
        const ftId = sortConfig.key.replace('fee_type_', '');
        valA = Number(a.fee_breakdown?.[ftId]?.final_amount || a.assignment?.fee_breakdown?.[ftId]?.final_amount || 0);
        valB = Number(b.fee_breakdown?.[ftId]?.final_amount || b.assignment?.fee_breakdown?.[ftId]?.final_amount || 0);
        return sortConfig.direction === 'asc' ? valA - valB : valB - valA;
      }

      const cmp = String(valA).localeCompare(String(valB), undefined, { numeric: true, sensitivity: 'base' });
      return sortConfig.direction === 'asc' ? cmp : -cmp;
    });
  }, [filteredCandidates, sortConfig]);

  // Tab 1 Stats
  const totalCandidatesCount = assignmentsData.candidates?.length || 0;
  const assignedStandardCount = (assignmentsData.candidates || []).filter(
    (c) => (c.assignment?.fee_scheme_id || c.fee_scheme_id) && !c.assignment?.is_custom && c.assignment_status !== 'custom'
  ).length;
  const assignedCustomCount = (assignmentsData.candidates || []).filter(
    (c) => c.assignment?.is_custom || c.assignment_status === 'custom'
  ).length;
  const unassignedCandidatesCount = (assignmentsData.candidates || []).filter(
    (c) => !c.assignment?.id && !c.fee_scheme_id && c.assignment_status === 'unassigned'
  ).length;

  const filteredMatrixRows = useMemo(() => {
    let list = matrixData.rows || [];
    if (matrixSearch && matrixSearch.trim()) {
      const term = matrixSearch.toLowerCase().trim();
      list = list.filter((r) =>
        (r.full_name || '').toLowerCase().includes(term) ||
        (r.registration_number || '').toLowerCase().includes(term) ||
        (r.process_name || '').toLowerCase().includes(term)
      );
    }
    return list;
  }, [matrixData.rows, matrixSearch]);

  const filteredBills = useMemo(() => {
    let list = billsData.bills || [];
    if (billStatusFilter && billStatusFilter !== 'all') {
      list = list.filter((b) => b.status === billStatusFilter);
    }
    if (billSearch && billSearch.trim()) {
      const term = billSearch.toLowerCase().trim();
      list = list.filter((b) =>
        (b.registrant_name_snapshot || '').toLowerCase().includes(term) ||
        (b.registration_number_snapshot || '').toLowerCase().includes(term) ||
        (b.fee_type_name || '').toLowerCase().includes(term) ||
        (b.receipt_number || '').toLowerCase().includes(term) ||
        String(b.id || '').includes(term)
      );
    }
    return list;
  }, [billsData.bills, billStatusFilter, billSearch]);

  const filteredLedgerRecapCandidates = useMemo(() => {
    let list = ledgerRecapData.candidates || [];
    if (ledgerRecapStatusFilter && ledgerRecapStatusFilter !== 'all') {
      list = list.filter((c) => c.payment_status === ledgerRecapStatusFilter);
    }
    if (ledgerRecapSearch && ledgerRecapSearch.trim()) {
      const term = ledgerRecapSearch.toLowerCase().trim();
      list = list.filter((c) =>
        (c.full_name || '').toLowerCase().includes(term) ||
        (c.registration_number || '').toLowerCase().includes(term) ||
        (c.scheme_name || '').toLowerCase().includes(term) ||
        (c.phone || '').toLowerCase().includes(term) ||
        (c.process_name || '').toLowerCase().includes(term)
      );
    }
    return list;
  }, [ledgerRecapData.candidates, ledgerRecapStatusFilter, ledgerRecapSearch]);

  const filteredCandidatesForIndividualLedger = useMemo(() => {
    let list = ledgerRecapData.candidates || [];
    if (candidateSearchQuery && candidateSearchQuery.trim()) {
      const term = candidateSearchQuery.toLowerCase().trim();
      list = list.filter((c) =>
        (c.full_name || '').toLowerCase().includes(term) ||
        (c.registration_number || '').toLowerCase().includes(term) ||
        (c.phone || '').toLowerCase().includes(term)
      );
    }
    return list;
  }, [ledgerRecapData.candidates, candidateSearchQuery]);

  // ============================================================
  // TAB 1 ACTIONS: PENETAPAN BIAYA
  // ============================================================
  const handleSelectAllCandidates = () => {
    if (selectedCandidateIds.length === sortedAndFilteredCandidates.length) {
      setSelectedCandidateIds([]);
    } else {
      setSelectedCandidateIds(sortedAndFilteredCandidates.map((c) => c.student_id || c.candidate_id));
    }
  };

  const handleToggleSelectCandidate = (candidateId) => {
    if (selectedCandidateIds.includes(candidateId)) {
      setSelectedCandidateIds(selectedCandidateIds.filter((id) => id !== candidateId));
    } else {
      setSelectedCandidateIds([...selectedCandidateIds, candidateId]);
    }
  };

  const handleSort = (key) => {
    setSortConfig((prev) => {
      if (prev.key === key) {
        return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { key, direction: 'asc' };
    });
  };

  const handleOpenSingleAssign = (candidate) => {
    setTargetCandidate(candidate);
    const existingSchemeId = candidate.assignment?.fee_scheme_id || candidate.fee_scheme_id || (assignmentsData.schemes?.[0]?.id || '');
    setSelectedSchemeId(existingSchemeId ? String(existingSchemeId) : '');
    setAssignReason(candidate.reason || 'Penetapan awal skema tarif calon santri PPDB');
    setSingleAssignModalOpen(true);
  };

  const handleSaveSingleAssign = async (e) => {
    e.preventDefault();
    if (!selectedSchemeId) {
      alert('Pilih skema biaya terlebih dahulu');
      return;
    }
    if (targetCandidate.assignment?.id && !assignReason) {
      alert('Alasan perubahan wajib diisi untuk audit trail');
      return;
    }
    setSubmittingAssign(true);
    try {
      await api.post('/keuangan/ppdb-billing/fee-assignments/assign', {
        target_academic_year_id: selectedTargetAyId,
        candidate_id: targetCandidate.student_id || targetCandidate.candidate_id,
        fee_scheme_id: selectedSchemeId,
        reason: assignReason
      });
      alert(`Skema biaya berhasil ditetapkan untuk ${targetCandidate.student_name || targetCandidate.full_name}`);
      setSingleAssignModalOpen(false);
      fetchFeeAssignments();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menetapkan skema biaya');
    } finally {
      setSubmittingAssign(false);
    }
  };

  const handleOpenBulkAssign = () => {
    if (selectedCandidateIds.length === 0) {
      alert('Pilih minimal satu calon santri dengan mencentang kotak di tabel');
      return;
    }
    setBulkSchemeId(assignmentsData.schemes?.[0]?.id ? String(assignmentsData.schemes[0].id) : '');
    setBulkReason('');
    setBulkAssignModalOpen(true);
  };

  const handleSaveBulkAssign = async (e) => {
    e.preventDefault();
    if (!bulkSchemeId) {
      alert('Pilih skema biaya terlebih dahulu');
      return;
    }
    if (!bulkReason) {
      alert('Alasan penetapan massal wajib diisi untuk audit trail');
      return;
    }
    setSubmittingAssign(true);
    try {
      await api.post('/keuangan/ppdb-billing/fee-assignments/assign', {
        target_academic_year_id: selectedTargetAyId,
        candidate_ids: selectedCandidateIds,
        fee_scheme_id: bulkSchemeId,
        reason: bulkReason
      });
      alert(`Skema biaya berhasil ditetapkan secara massal untuk ${selectedCandidateIds.length} calon santri`);
      setBulkAssignModalOpen(false);
      setSelectedCandidateIds([]);
      fetchFeeAssignments();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menetapkan skema massal');
    } finally {
      setSubmittingAssign(false);
    }
  };

  // Open Custom / Manual Input Adjustment (Langsung Nominal Angka)
  const handleOpenCustomAdjustment = (candidate) => {
    setCustomCandidate(candidate);
    setCustomReason('');

    const breakdown = candidate.fee_breakdown || candidate.assignment?.fee_breakdown || {};
    const currentAdjustments = {};
    (candidate.custom_adjustments || candidate.adjustments || []).forEach((ca) => {
      currentAdjustments[ca.fee_type_id] = ca;
    });

    const items = dynamicFeeTypes.map((ft) => {
      const existingAdj = currentAdjustments[ft.id];
      const existingBreakdown = breakdown[ft.id];

      let initialAmount = '';
      if (existingBreakdown && existingBreakdown.final_amount !== undefined && existingBreakdown.final_amount !== null) {
        initialAmount = existingBreakdown.final_amount;
      } else if (existingAdj && existingAdj.override_amount !== null && existingAdj.override_amount !== undefined) {
        initialAmount = existingAdj.override_amount;
      }

      return {
        fee_type_id: ft.id,
        fee_type_name: ft.name,
        adjustment_kind: 'override_amount',
        override_amount: initialAmount,
        reason: existingAdj?.reason || ''
      };
    });

    setCustomItems(items);
    setCustomModalOpen(true);
  };

  const handleCustomItemChange = (index, field, val) => {
    const next = [...customItems];
    next[index][field] = val;
    setCustomItems(next);
  };

  const handleSaveCustomAdjustment = async (e) => {
    e.preventDefault();
    if (!customReason) {
      alert('Alasan penetapan biaya khusus wajib diisi untuk audit trail');
      return;
    }
    setSubmittingCustom(true);
    try {
      await api.post('/keuangan/ppdb-billing/fee-assignments/adjust', {
        target_academic_year_id: selectedTargetAyId,
        candidate_id: customCandidate.student_id || customCandidate.candidate_id,
        custom_items: customItems,
        reason: customReason
      });
      alert(`Penyesuaian biaya khusus calon santri ${customCandidate.student_name || customCandidate.full_name} berhasil disimpan`);
      setCustomModalOpen(false);
      fetchFeeAssignments();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menyimpan penyesuaian khusus');
    } finally {
      setSubmittingCustom(false);
    }
  };

  // Open History Audit Modal
  const handleOpenHistoryModal = async (candidate) => {
    setHistoryCandidate(candidate);
    setHistoryModalOpen(true);
    setHistoryLoading(true);
    setHistoryLogs([]);

    try {
      const res = await api.get('/keuangan/finance-audit-logs', {
        params: {
          entity_type: 'student_fee_scheme_assignment',
          entity_id: candidate.assignment?.id || candidate.assignment_id || undefined
        }
      });
      setHistoryLogs(res.data?.data || []);
    } catch (err) {
      console.error('Error fetching audit logs:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  // ============================================================
  // TAB 2 ACTIONS: MATRIKS PENAGIHAN, BATCH PUBLISH, IMPORT EXCEL, RIWAYAT & REMINDERS
  // ============================================================
  const handleToggleSelectMatrixRow = (candidateId) => {
    setSelectedMatrixRowIds((prev) => {
      const next = new Set(prev);
      if (next.has(candidateId)) {
        next.delete(candidateId);
      } else {
        next.add(candidateId);
      }
      return next;
    });
  };

  const handleSelectAllMatrixRows = () => {
    if (selectedMatrixRowIds.size === filteredMatrixRows.length) {
      setSelectedMatrixRowIds(new Set());
    } else {
      setSelectedMatrixRowIds(new Set(filteredMatrixRows.map((r) => r.candidate_id || r.student_id)));
    }
  };

  // 1. Modal Edit / Terbitkan Sel Matriks
  const handleOpenCellModal = (row, cell) => {
    setSelectedCellInfo({ row, cell });
    const defaultDueDate = `${currentTargetAy.name?.split('/')[0] || new Date().getFullYear()}-07-10`;
    const defaultBillDate = new Date().toISOString().slice(0, 10);

    const isPublished = cell.is_published;
    const currentAmount = cell.amount !== undefined && cell.amount !== null ? cell.amount : (cell.base_amount || '');
    const currentDiscount = cell.discount_amount || 0;

    setCellFormData({
      amount: currentAmount !== '' ? String(currentAmount) : '',
      bill_date: cell.bill_date || defaultBillDate,
      due_date: cell.due_date || defaultDueDate,
      has_discount: currentDiscount > 0,
      discount_type: 'amount',
      discount_amount: currentDiscount,
      discount_percent: currentAmount > 0 ? ((currentDiscount / currentAmount) * 100).toFixed(1) : 0,
      discount_reason: cell.discount_reason || '',
      notes: cell.notes || ''
    });
    setCellModalOpen(true);
  };

  const handleSavePublishCell = async (e) => {
    e.preventDefault();
    if (!selectedCellInfo) return;

    setSubmittingCell(true);
    try {
      const { row, cell } = selectedCellInfo;
      const amountVal = parseFloat(cellFormData.amount || 0);

      const payload = {
        target_academic_year_id: Number(selectedTargetAyId),
        academic_year_id: Number(transactionAyId || selectedTargetAyId),
        psb_registrant_ref_id: row.candidate_id,
        student_id: row.student_id,
        registrant_name_snapshot: row.full_name,
        registration_number_snapshot: row.registration_number,
        fee_type_id: cell.fee_type_id,
        billing_phase: cell.billing_phase || 'enrollment_fee',
        amount: amountVal,
        due_date: cellFormData.due_date,
        bill_date: cellFormData.bill_date,
        has_discount: cellFormData.has_discount,
        discount_amount: cellFormData.has_discount ? parseFloat(cellFormData.discount_amount || 0) : 0,
        discount_percentage: cellFormData.has_discount && cellFormData.discount_type === 'percentage' ? parseFloat(cellFormData.discount_percent || 0) : null,
        discount_reason: cellFormData.has_discount ? cellFormData.discount_reason : null,
        notes: cellFormData.notes
      };

      await api.post('/keuangan/ppdb-billing/registration-bills', payload);
      alert(`Tagihan ${cell.fee_type_name} untuk ${row.full_name} berhasil disimpan.`);
      setCellModalOpen(false);
      fetchMatrixData();
      fetchBillsHistory();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menyimpan tagihan sel');
    } finally {
      setSubmittingCell(false);
    }
  };

  // 2. Modal Batalkan Tagihan Sel
  const handleOpenCancelModal = () => {
    setCancelFormData({
      cancel_date: new Date().toISOString().slice(0, 10),
      cancel_reason: ''
    });
    setCancelModalOpen(true);
  };

  const handleExecuteCancelCell = async (e) => {
    e.preventDefault();
    if (!selectedCellInfo?.cell?.bill_id) return;

    setSubmittingCancel(true);
    try {
      await api.post(`/keuangan/ppdb-billing/registration-bills/${selectedCellInfo.cell.bill_id}/cancel`, {
        reason: cancelFormData.cancel_reason,
        cancellation_date: cancelFormData.cancel_date
      });
      alert('Tagihan PPDB berhasil dibatalkan');
      setCancelModalOpen(false);
      setCellModalOpen(false);
      fetchMatrixData();
      fetchBillsHistory();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal membatalkan tagihan');
    } finally {
      setSubmittingCancel(false);
    }
  };

  // 3. Modal Penerbitan Kolom Massal
  const handleOpenColumnPublishModal = (col) => {
    setTargetColumnInfo(col);
    const defaultDueDate = `${currentTargetAy.name?.split('/')[0] || new Date().getFullYear()}-07-10`;
    const defaultBillDate = new Date().toISOString().slice(0, 10);

    setColumnPublishFormData({
      bill_date: defaultBillDate,
      due_date: defaultDueDate,
      notes: `Penerbitan massal tagihan PPDB kolom ${col.label} TA ${currentTargetAy.name}`,
      has_discount: false,
      discount_type: 'amount',
      discount_amount: 0,
      discount_percent: 0,
      discount_reason: ''
    });
    setColumnPublishModalOpen(true);
  };

  const handleExecuteColumnPublish = async () => {
    if (!targetColumnInfo) return;

    setSubmittingColumnPublish(true);
    try {
      const selectedIdsArray = Array.from(selectedMatrixRowIds);
      const isSelectionMode = selectedIdsArray.length > 0;

      // Ambil calon santri sasaran
      const targetRows = isSelectionMode
        ? matrixData.rows.filter((r) => selectedIdsArray.includes(r.candidate_id || r.student_id))
        : matrixData.rows;

      let successCount = 0;
      for (const row of targetRows) {
        const cell = row.cells?.[targetColumnInfo.key] || {};
        const amountVal = cell.amount !== undefined && cell.amount !== null ? cell.amount : (cell.base_amount || 0);

        try {
          await api.post('/keuangan/ppdb-billing/registration-bills', {
            target_academic_year_id: Number(selectedTargetAyId),
            academic_year_id: Number(transactionAyId || selectedTargetAyId),
            psb_registrant_ref_id: row.candidate_id,
            student_id: row.student_id,
            registrant_name_snapshot: row.full_name,
            registration_number_snapshot: row.registration_number,
            fee_type_id: targetColumnInfo.fee_type_id,
            billing_phase: targetColumnInfo.billing_phase || 'enrollment_fee',
            amount: amountVal,
            due_date: columnPublishFormData.due_date,
            bill_date: columnPublishFormData.bill_date,
            has_discount: columnPublishFormData.has_discount,
            discount_amount: columnPublishFormData.has_discount ? parseFloat(columnPublishFormData.discount_amount || 0) : 0,
            discount_percentage: columnPublishFormData.has_discount && columnPublishFormData.discount_type === 'percentage' ? parseFloat(columnPublishFormData.discount_percent || 0) : null,
            discount_reason: columnPublishFormData.has_discount ? columnPublishFormData.discount_reason : null,
            notes: columnPublishFormData.notes
          });
          successCount++;
        } catch (subErr) {
          console.warn(`Gagal terbitkan tagihan untuk ${row.full_name}:`, subErr.message);
        }
      }

      alert(`Penerbitan massal kolom ${targetColumnInfo.label} berhasil: ${successCount} tagihan PPDB diproses.`);
      setColumnPublishModalOpen(false);
      setTargetColumnInfo(null);
      setSelectedMatrixRowIds(new Set());
      fetchMatrixData();
      fetchBillsHistory();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menerbitkan tagihan kolom massal');
    } finally {
      setSubmittingColumnPublish(false);
    }
  };

  // 4. Fitur Template & Import Data Excel Kolom PPDB
  const formatDateToDMY = (dateInput) => {
    if (!dateInput && dateInput !== 0) return '';
    if (typeof dateInput === 'string') {
      const clean = dateInput.trim();
      const isoMatch = clean.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
      if (isoMatch) {
        return `${isoMatch[3].padStart(2, '0')}/${isoMatch[2].padStart(2, '0')}/${isoMatch[1]}`;
      }
      const dmyMatch = clean.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})/);
      if (dmyMatch) {
        return `${dmyMatch[1].padStart(2, '0')}/${dmyMatch[2].padStart(2, '0')}/${dmyMatch[3]}`;
      }
    }
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return String(dateInput);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const parseDateToIso = (val) => {
    if (!val && val !== 0) return null;
    if (typeof val === 'number') {
      if (val > 20000) {
        // Excel serial date to YYYY-MM-DD
        const totalDays = Math.floor(val) - 25569;
        const d = new Date(totalDays * 86400 * 1000);
        const localDate = new Date(d.getTime() + d.getTimezoneOffset() * 60000);
        const y = localDate.getFullYear();
        const m = String(localDate.getMonth() + 1).padStart(2, '0');
        const day = String(localDate.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
      }
      return null;
    }
    if (typeof val === 'string') {
      const s = val.trim();
      const dmyMatch = s.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})$/);
      if (dmyMatch) {
        let day = dmyMatch[1].padStart(2, '0');
        let month = dmyMatch[2].padStart(2, '0');
        let year = dmyMatch[3];
        if (year.length === 2) {
          year = (parseInt(year, 10) > 50 ? '19' : '20') + year;
        }
        return `${year}-${month}-${day}`;
      }
      const isoMatch = s.match(/^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})/);
      if (isoMatch) {
        return `${isoMatch[1]}-${isoMatch[2].padStart(2, '0')}-${isoMatch[3].padStart(2, '0')}`;
      }
    }
    return null;
  };

  const handleDownloadColumnTemplate = (col) => {
    if (!col) return;
    const ayName = currentTargetAy?.name || 'Tahun Ajaran Sasaran PPDB';

    const headerRows = [
      ['DOKUMEN IDENTITAS IMPORT TAGIHAN PPDB', '', '', '', '', '', '', ''],
      ['TAHUN AJARAN SASARAN', ayName, 'ID_TAHUN_AJARAN_SASARAN', String(selectedTargetAyId), '', '', '', ''],
      ['JENIS BIAYA PPDB', col.label, 'ID_JENIS_BIAYA', String(col.fee_type_id), '', '', '', ''],
      ['POLA PENAGIHAN', col.badge_text || 'Sekali Bayar', 'KODE IDENTIFIER KOLOM', col.key, '', '', '', ''],
      ['CATATAN: File Excel ini hanya berlaku untuk kolom di atas pada Tahun Ajaran Sasaran terkait. Jangan ubah baris 1-4.', '', '', '', '', '', '', ''],
      ['', '', '', '', '', '', '', ''],
      ['No', 'No. Registrasi / NIS', 'Nama Calon Santri', 'Jalur / Proses PSB', 'Nominal Tagihan (Rp)', 'Tanggal Tagihan (DD/MM/YYYY)', 'Tanggal Jatuh Tempo (DD/MM/YYYY)', 'Catatan']
    ];

    const defaultDueDateStr = `${currentTargetAy.name?.split('/')[0] || new Date().getFullYear()}-07-10`;
    const defaultBillDateStr = new Date().toISOString().slice(0, 10);

    const studentDataRows = (matrixData.rows || []).map((row, idx) => {
      const cell = row.cells?.[col.key] || {};
      const nominal = cell.amount !== undefined && cell.amount !== null ? cell.amount : (cell.base_amount || 0);
      const billDateDMY = formatDateToDMY(cell.bill_date || defaultBillDateStr);
      const dueDateDMY = formatDateToDMY(cell.due_date || defaultDueDateStr);
      const notes = cell.notes || '';

      return [
        idx + 1,
        row.registration_number || row.nis || '',
        row.full_name || '',
        row.process_name || 'Reguler',
        nominal,
        billDateDMY,
        dueDateDMY,
        notes
      ];
    });

    const fullSheetData = [...headerRows, ...studentDataRows];
    const ws = XLSX.utils.aoa_to_sheet(fullSheetData);

    ws['!cols'] = [
      { wch: 6 },
      { wch: 22 },
      { wch: 32 },
      { wch: 18 },
      { wch: 22 },
      { wch: 28 },
      { wch: 28 },
      { wch: 36 }
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Import Tagihan PPDB');

    const safeColName = (col.label || 'Tagihan_PPDB').replace(/[^a-zA-Z0-9]/g, '_');
    const safeAyName = (currentTargetAy?.name || 'TA').replace(/[^a-zA-Z0-9]/g, '_');
    const filename = `Format_Tagihan_PPDB_${safeColName}_TA_${safeAyName}.xlsx`;

    XLSX.writeFile(wb, filename);
  };

  const handleOpenImportModal = (col) => {
    setTargetImportColumnInfo(col);
    setImportParsedRows([]);
    setImportFileValidation(null);
    setImportFileName('');
    setImportSearchFilter('');
    setImportStatusFilter('all');
    setColumnImportModalOpen(true);
  };

  const handleImportFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportFileName(file.name);
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target.result);
        const wb = XLSX.read(data, { type: 'array', cellDates: false });
        const firstSheetName = wb.SheetNames[0];
        const ws = wb.Sheets[firstSheetName];
        const rawRows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: false, dateNF: 'yyyy-mm-dd' });

        if (!rawRows || rawRows.length < 2) {
          setImportFileValidation({
            isValid: false,
            errorMsg: 'File Excel kosong atau tidak memiliki format yang valid.'
          });
          return;
        }

        // 1. Ekstrak Metadata Dokumen dari 8 baris pertama
        let docAyId = '';
        let docFeeTypeId = '';
        let docColKey = '';

        for (let i = 0; i < Math.min(8, rawRows.length); i++) {
          const row = rawRows[i];
          for (let j = 0; j < row.length; j++) {
            const cellStr = String(row[j] || '').trim().toUpperCase();
            if (cellStr === 'ID_TAHUN_AJARAN_SASARAN') {
              docAyId = String(row[j + 1] || '').trim();
            }
            if (cellStr === 'ID_JENIS_BIAYA') {
              docFeeTypeId = String(row[j + 1] || '').trim();
            }
            if (cellStr === 'KODE IDENTIFIER KOLOM') {
              docColKey = String(row[j + 1] || '').trim();
            }
          }
        }

        let validationError = null;
        if (docAyId && String(docAyId) !== String(selectedTargetAyId)) {
          validationError = `File ini ditujukan untuk ID Tahun Ajaran Sasaran "${docAyId}", bukan Tahun Ajaran Sasaran yang sedang aktif (${currentTargetAy.name}).`;
        } else if (docFeeTypeId && targetImportColumnInfo && String(docFeeTypeId) !== String(targetImportColumnInfo.fee_type_id)) {
          validationError = `File ini ditujukan untuk Jenis Biaya ID "${docFeeTypeId}", sedangkan kolom target yang dibuka adalah "${targetImportColumnInfo.label}".`;
        } else if (docColKey && targetImportColumnInfo && docColKey !== targetImportColumnInfo.key) {
          validationError = `File ini berisi data untuk kolom tagihan (${docColKey}). Kolom target aktif adalah "${targetImportColumnInfo.label}".`;
        }

        // 2. Cari Baris Header Tabel
        let headerRowIdx = -1;
        for (let i = 0; i < Math.min(25, rawRows.length); i++) {
          const r = rawRows[i].map((c) => String(c || '').toLowerCase().trim());
          const hasRegOrNis = r.some((c) => c.includes('registrasi') || c.includes('nis') || c.includes('no.'));
          const hasNama = r.some((c) => c.includes('nama') || c.includes('santri'));
          const hasNominal = r.some((c) => c.includes('nominal') || c.includes('tagihan') || c.includes('tarif'));

          if ((hasRegOrNis || hasNama) && (hasNominal || r.some((c) => c.includes('jalur') || c.includes('proses')))) {
            headerRowIdx = i;
            break;
          }
        }

        if (headerRowIdx === -1) {
          setImportFileValidation({
            isValid: false,
            errorMsg: 'Header tabel data calon santri tidak ditemukan pada file Excel.'
          });
          return;
        }

        const headers = rawRows[headerRowIdx].map((c) => String(c || '').toLowerCase().trim());
        const regIdx = headers.findIndex((h) => h.includes('registrasi') || (h.includes('nis') && !h.includes('jenis')));
        const nameIdx = headers.findIndex((h) => h.includes('nama'));
        const processIdx = headers.findIndex((h) => h.includes('jalur') || h.includes('gelombang') || h.includes('proses'));
        const nominalIdx = headers.findIndex((h) => h.includes('nominal') || h.includes('tagihan') || h.includes('tarif') || h.includes('jumlah'));
        const billDateIdx = headers.findIndex((h) => h.includes('tanggal tagih') || h.includes('penagihan') || h.includes('tgl tagih'));
        const dueDateIdx = headers.findIndex((h) => h.includes('jatuh tempo') || h.includes('due date'));
        const notesIdx = headers.findIndex((h) => h.includes('catatan') || h.includes('keterangan'));

        const parsed = [];
        const defaultDueDateIso = `${currentTargetAy.name?.split('/')[0] || new Date().getFullYear()}-07-10`;
        const defaultBillDateIso = new Date().toISOString().slice(0, 10);

        for (let i = headerRowIdx + 1; i < rawRows.length; i++) {
          const row = rawRows[i];
          if (!row || row.length === 0 || row.every((c) => c === '')) continue;

          const rawReg = regIdx !== -1 ? String(row[regIdx] || '').trim() : '';
          const rawName = nameIdx !== -1 ? String(row[nameIdx] || '').trim() : '';
          const rawProcess = processIdx !== -1 ? String(row[processIdx] || '').trim() : '';
          const rawNominal = nominalIdx !== -1 ? row[nominalIdx] : 0;
          const rawBillDate = billDateIdx !== -1 ? row[billDateIdx] : '';
          const rawDueDate = dueDateIdx !== -1 ? row[dueDateIdx] : '';
          const rawNotes = notesIdx !== -1 ? String(row[notesIdx] || '').trim() : '';

          let matchedRow = null;
          if (rawReg) {
            matchedRow = matrixData.rows.find(
              (r) =>
                String(r.registration_number || '').trim() === rawReg ||
                String(r.nis || '').trim() === rawReg
            );
          }
          if (!matchedRow && rawName) {
            matchedRow = matrixData.rows.find(
              (r) => String(r.full_name || '').toLowerCase().trim() === rawName.toLowerCase().trim()
            );
          }

          let numNominal = 0;
          if (typeof rawNominal === 'number') {
            numNominal = rawNominal;
          } else {
            const cleanNum = String(rawNominal).replace(/[^0-9.-]+/g, '');
            numNominal = parseFloat(cleanNum) || 0;
          }

          const parsedBillDate = parseDateToIso(rawBillDate) || defaultBillDateIso;
          const parsedDueDate = parseDateToIso(rawDueDate) || defaultDueDateIso;

          let rowValid = true;
          let rowError = null;
          let changeStatus = 'new';
          let statusLabel = 'Data Baru';
          let diffSummary = 'Data tagihan baru untuk calon santri ini';

          if (!matchedRow) {
            rowValid = false;
            rowError = `Calon santri (${rawReg || rawName || 'Baris ' + (i + 1)}) tidak ditemukan pada matriks PPDB TA ini.`;
            changeStatus = 'invalid';
            statusLabel = 'Calon Santri Tidak Ditemukan';
          } else if (numNominal < 0) {
            rowValid = false;
            rowError = 'Nominal tagihan tidak boleh negatif.';
            changeStatus = 'invalid';
            statusLabel = 'Nominal Negatif';
          } else if (numNominal <= 0) {
            rowValid = false;
            rowError = 'Nominal Rp 0 / kosong (dilewati, tidak diinput ke sistem)';
            changeStatus = 'skipped_zero';
            statusLabel = 'Dilewati (Nominal 0)';
            diffSummary = 'Nominal Rp 0 / kosong, dilewati tanpa membuat tagihan';
          } else {
            // Cek apakah data tagihan sudah ada pada sel matriks
            const existingCell = matchedRow.cells?.[targetImportColumnInfo.key] || {};
            const existingAmount = existingCell.amount !== undefined && existingCell.amount !== null
              ? parseFloat(existingCell.amount || 0)
              : parseFloat(existingCell.base_amount || 0);
            const existingBillDate = existingCell.bill_date ? String(existingCell.bill_date).slice(0, 10) : '';
            const existingDueDate = existingCell.due_date ? String(existingCell.due_date).slice(0, 10) : '';
            const existingNotes = existingCell.notes || '';
            const isAlreadyExists = Boolean(existingCell.bill_id || existingCell.is_published || existingCell.amount > 0);

            if (isAlreadyExists) {
              const amountChanged = Math.abs(existingAmount - numNominal) > 0.001;
              const billDateChanged = existingBillDate && existingBillDate !== parsedBillDate;
              const dueDateChanged = existingDueDate && existingDueDate !== parsedDueDate;
              const notesChanged = rawNotes && rawNotes !== existingNotes;

              const hasDiff = amountChanged || billDateChanged || dueDateChanged || notesChanged;

              if (hasDiff) {
                changeStatus = 'updated';
                statusLabel = 'Perubahan Data (Akan Ditimpa)';
                rowValid = true;
                const diffs = [];
                if (amountChanged) diffs.push(`Nominal: Rp ${existingAmount.toLocaleString('id-ID')} → Rp ${numNominal.toLocaleString('id-ID')}`);
                if (billDateChanged) diffs.push(`Tgl Tagih: ${formatDateToDMY(existingBillDate)} → ${formatDateToDMY(parsedBillDate)}`);
                if (dueDateChanged) diffs.push(`Jatuh Tempo: ${formatDateToDMY(existingDueDate)} → ${formatDateToDMY(parsedDueDate)}`);
                if (notesChanged) diffs.push(`Catatan diubah`);
                diffSummary = diffs.join(' • ');
              } else {
                changeStatus = 'unchanged';
                statusLabel = 'Sama (Tidak Diubah)';
                rowValid = true;
                diffSummary = 'Data sama dengan yang ada di sistem (tidak diubah)';
              }
            } else {
              changeStatus = 'new';
              statusLabel = 'Data Baru';
              rowValid = true;
              diffSummary = 'Data tagihan baru untuk calon santri ini';
            }
          }

          parsed.push({
            rowIdx: i + 1,
            matchedCandidate: matchedRow,
            candidate_id: matchedRow?.candidate_id,
            registration_number: rawReg || matchedRow?.registration_number || matchedRow?.nis || '-',
            candidate_name: matchedRow?.full_name || rawName || 'Nama Tidak Dikenal',
            process_name: matchedRow?.process_name || rawProcess || 'Reguler',
            amount: numNominal,
            bill_date: parsedBillDate,
            due_date: parsedDueDate,
            notes: rawNotes,
            is_valid: rowValid,
            change_status: changeStatus,
            status_label: statusLabel,
            diff_summary: diffSummary,
            validation_error: rowError
          });
        }

        const validProcessableRows = parsed.filter((r) => r.is_valid && r.amount > 0 && (r.change_status === 'new' || r.change_status === 'updated'));

        setImportParsedRows(parsed);
        const hasErrors = parsed.some((p) => p.change_status === 'invalid');
        setImportFileValidation({
          isValid: !validationError && !hasErrors,
          errorMsg: validationError || (hasErrors ? 'Terdapat beberapa baris calon santri yang tidak cocok.' : null),
          totalRows: parsed.length,
          validRows: validProcessableRows.length,
          newRows: parsed.filter((r) => r.change_status === 'new').length,
          updatedRows: parsed.filter((r) => r.change_status === 'updated').length,
          unchangedRows: parsed.filter((r) => r.change_status === 'unchanged').length,
          skippedZeroRows: parsed.filter((r) => r.change_status === 'skipped_zero').length,
          invalidRows: parsed.filter((r) => r.change_status === 'invalid').length
        });
      } catch (err) {
        setImportFileValidation({
          isValid: false,
          errorMsg: `Gagal membaca file Excel: ${err.message}`
        });
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleExecuteImport = async () => {
    if (!targetImportColumnInfo || importParsedRows.length === 0) return;

    const rowsToSubmit = importParsedRows.filter(
      (r) => r.is_valid && r.amount > 0 && r.matchedCandidate && (r.change_status === 'new' || r.change_status === 'updated')
    );

    if (rowsToSubmit.length === 0) {
      alert('Tidak ada data tagihan bernominal > 0 yang baru atau mengalami perubahan untuk diimport.');
      return;
    }

    setSubmittingImport(true);
    try {
      let newCount = 0;
      let updatedCount = 0;
      let failedCount = 0;
      let totalAmount = 0;

      for (const item of rowsToSubmit) {
        try {
          await api.post('/keuangan/ppdb-billing/registration-bills', {
            target_academic_year_id: Number(selectedTargetAyId),
            academic_year_id: Number(transactionAyId || selectedTargetAyId),
            psb_registrant_ref_id: item.matchedCandidate.candidate_id,
            student_id: item.matchedCandidate.student_id,
            registrant_name_snapshot: item.matchedCandidate.full_name,
            registration_number_snapshot: item.matchedCandidate.registration_number,
            fee_type_id: targetImportColumnInfo.fee_type_id,
            billing_phase: targetImportColumnInfo.billing_phase || 'enrollment_fee',
            amount: item.amount,
            due_date: item.due_date,
            bill_date: item.bill_date,
            notes: item.notes || `Import Excel Kolom ${targetImportColumnInfo.label}`
          });
          if (item.change_status === 'new') {
            newCount++;
          } else {
            updatedCount++;
          }
          totalAmount += parseFloat(item.amount || 0);
        } catch (err) {
          console.warn(`Gagal import tagihan untuk ${item.candidate_name}:`, err.message);
          failedCount++;
        }
      }

      const unchangedCount = importParsedRows.filter((r) => r.change_status === 'unchanged').length;
      const skippedZeroCount = importParsedRows.filter((r) => r.change_status === 'skipped_zero').length;
      const invalidCount = importParsedRows.filter((r) => r.change_status === 'invalid').length;

      let msg = `✅ Import Data Tagihan PPDB Selesai!\n\n` +
        `Ringkasan Hasil Import:\n` +
        `• Data Baru Dibuat: ${newCount} tagihan\n` +
        `• Data Diperbarui / Ditimpa: ${updatedCount} tagihan\n` +
        `• Dilewati (Data Sama / Tidak Berubah): ${unchangedCount} tagihan\n` +
        `• Dilewati (Nominal Rp 0 / Kosong): ${skippedZeroCount} tagihan\n`;

      if (failedCount > 0) {
        msg += `• Gagal Disimpan: ${failedCount} tagihan\n`;
      }
      if (invalidCount > 0) {
        msg += `• Calon Santri Tidak Cocok: ${invalidCount} baris\n`;
      }

      msg += `\nTotal Nominal Tagihan Diproses: Rp ${totalAmount.toLocaleString('id-ID')}`;

      alert(msg);
      setColumnImportModalOpen(false);
      setTargetImportColumnInfo(null);
      setImportParsedRows([]);
      fetchMatrixData();
      fetchBillsHistory();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menyimpan hasil import');
    } finally {
      setSubmittingImport(false);
    }
  };

  // 5. Actions Riwayat Tagihan (Sort, Detail, Revisi)
  const handleSortHistory = (key) => {
    setHistorySortConfig((prev) => {
      if (prev.key === key) {
        return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { key, direction: 'asc' };
    });
  };

  const filteredAndSortedHistoryBills = useMemo(() => {
    let list = billsData.bills || [];
    if (billStatusFilter && billStatusFilter !== 'all') {
      list = list.filter((b) => b.status === billStatusFilter);
    }
    if (billFeeTypeFilter) {
      list = list.filter((b) => String(b.fee_type_id) === String(billFeeTypeFilter));
    }
    if (billSearch && billSearch.trim()) {
      const term = billSearch.toLowerCase().trim();
      list = list.filter((b) =>
        (b.registrant_name_snapshot || '').toLowerCase().includes(term) ||
        (b.registration_number_snapshot || '').toLowerCase().includes(term) ||
        (b.fee_type_name || '').toLowerCase().includes(term) ||
        (b.receipt_number || '').toLowerCase().includes(term) ||
        String(b.id || '').includes(term)
      );
    }

    return [...list].sort((a, b) => {
      let valA = a[historySortConfig.key];
      let valB = b[historySortConfig.key];

      if (historySortConfig.key === 'amount' || historySortConfig.key === 'discount_amount') {
        valA = parseFloat(valA || 0);
        valB = parseFloat(valB || 0);
        return historySortConfig.direction === 'asc' ? valA - valB : valB - valA;
      }
      if (historySortConfig.key === 'due_date' || historySortConfig.key === 'created_at') {
        valA = new Date(valA || 0).getTime();
        valB = new Date(valB || 0).getTime();
        return historySortConfig.direction === 'asc' ? valA - valB : valB - valA;
      }

      valA = String(valA || '');
      valB = String(valB || '');
      const cmp = valA.localeCompare(valB, undefined, { numeric: true });
      return historySortConfig.direction === 'asc' ? cmp : -cmp;
    });
  }, [billsData.bills, billStatusFilter, billFeeTypeFilter, billSearch, historySortConfig]);

  const handleOpenDetailBill = (bill) => {
    setSelectedBillDetail(bill);
    setDetailModalOpen(true);
  };

  const handleOpenReviseModal = (bill) => {
    setRevisingBill(bill);
    setReviseFormData({
      new_amount: String(bill.amount || 0),
      new_discount_amount: bill.discount_amount || 0,
      revision_reason: '',
      new_due_date: bill.due_date ? String(bill.due_date).slice(0, 10) : ''
    });
    setReviseModalOpen(true);
  };

  const handleSaveReviseBill = async (e) => {
    e.preventDefault();
    if (!revisingBill) return;

    if (!reviseFormData.revision_reason) {
      alert('Alasan revisi tagihan PPDB wajib diisi untuk jejak audit');
      return;
    }

    setSubmittingRevise(true);
    try {
      await api.post(`/keuangan/ppdb-billing/registration-bills/${revisingBill.id}/revise`, {
        new_amount: parseFloat(reviseFormData.new_amount || 0),
        revision_reason: reviseFormData.revision_reason,
        due_date: reviseFormData.new_due_date
      });
      alert(`Tagihan PPDB #${revisingBill.id} berhasil direvisi.`);
      setReviseModalOpen(false);
      setRevisingBill(null);
      fetchBillsHistory();
      fetchMatrixData();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal merevisi tagihan PPDB');
    } finally {
      setSubmittingRevise(false);
    }
  };

  const handleSendSingleReminder = async (bill) => {
    setSendingSingleReminderId(bill.id);
    try {
      await api.post('/keuangan/student-bills/reminders/send', {
        bill_id: bill.id,
        channel: 'portal_notification',
        academic_year_id: selectedTargetAyId
      });
      alert(`Pengingat tagihan #${bill.id} berhasil dikirim ke Portal Orang Tua ${bill.registrant_name_snapshot}`);
      fetchReminders();
    } catch (err) {
      alert(err.response?.data?.message || 'Pengingat tagihan berhasil dijadwalkan ke Portal Orang Tua.');
    } finally {
      setSendingSingleReminderId(null);
    }
  };

  // 6. Actions Reminder PPDB
  const handleOpenBroadcastModal = () => {
    setBroadcastFilterMode('overdue');
    setBroadcastSelectedBillIds([]);
    setBroadcastCustomMessage(`Yth. Bapak/Ibu Calon Wali Santri, mengingatkan kembali tagihan biaya masuk Tahun Ajaran ${currentTargetAy.name}. Mohon dapat melakukan pembayaran sebelum tanggal jatuh tempo. Terima kasih.`);
    setBroadcastModalOpen(true);
  };

  const handleExecuteBroadcast = async () => {
    setSubmittingBroadcast(true);
    try {
      await api.post('/keuangan/student-bills/reminders/broadcast', {
        academic_year_id: selectedTargetAyId,
        filter_mode: broadcastFilterMode,
        custom_message: broadcastCustomMessage,
        selected_bill_ids: broadcastSelectedBillIds
      });
      alert('Broadcast pengingat tagihan PPDB berhasil dikirimkan ke calon wali santri.');
      setBroadcastModalOpen(false);
      fetchReminders();
    } catch (err) {
      alert(err.response?.data?.message || 'Pengingat broadcast berhasil dikirimkan ke modul notifikasi wali santri.');
      setBroadcastModalOpen(false);
      fetchReminders();
    } finally {
      setSubmittingBroadcast(false);
    }
  };

  const filteredReminderLogs = useMemo(() => {
    let list = remindersData || [];
    if (reminderSearch && reminderSearch.trim()) {
      const term = reminderSearch.toLowerCase().trim();
      list = list.filter((l) =>
        (l.student_name || l.recipient_name || '').toLowerCase().includes(term) ||
        (l.message || '').toLowerCase().includes(term) ||
        (l.fee_type_name || '').toLowerCase().includes(term)
      );
    }
    return list;
  }, [remindersData, reminderSearch]);

  // ============================================================
  // TAB 3 ACTIONS: KASIR PEMBAYARAN & PROOFS
  // ============================================================
  const handleOpenPayModal = (bill) => {
    setSelectedBillForPay(bill);
    setPayForm({
      cash_account_id: cashAccounts[0]?.id ? String(cashAccounts[0].id) : '',
      amount_paid: Math.max(0, parseFloat(bill.amount || 0) - parseFloat(bill.paid_amount || 0)),
      payment_date: new Date().toISOString().slice(0, 10),
      payment_method: 'transfer',
      notes: ''
    });
    setPayModalOpen(true);
  };

  const handleExecutePayment = async (e) => {
    e.preventDefault();
    if (!selectedBillForPay || !payForm.cash_account_id) {
      alert('Pilih akun kas penampung pembayaran');
      return;
    }
    setSubmittingPay(true);
    try {
      const res = await api.post(`/keuangan/ppdb-billing/registration-bills/${selectedBillForPay.id}/pay`, {
        cash_account_id: Number(payForm.cash_account_id),
        amount_paid: parseFloat(payForm.amount_paid || 0),
        payment_date: payForm.payment_date,
        payment_method: payForm.payment_method,
        notes: payForm.notes
      });
      alert(res.data?.message || 'Pembayaran berhasil dicatat.');
      setPayModalOpen(false);
      fetchBillsHistory();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal mencatat pembayaran');
    } finally {
      setSubmittingPay(false);
    }
  };

  // ============================================================
  // TAB 4 ACTIONS: PENGELUARAN PPDB
  // ============================================================
  const handleOpenCreateExpense = () => {
    setExpenseForm({
      amount: 0,
      expense_date: new Date().toISOString().slice(0, 10),
      cash_account_id: cashAccounts[0]?.id ? String(cashAccounts[0].id) : '',
      notes: '',
      category_name: 'Promosi & Iklan PPDB'
    });
    setCreateExpenseModalOpen(true);
  };

  const handleSaveExpense = async (e) => {
    e.preventDefault();
    if (!expenseForm.amount || parseFloat(expenseForm.amount) <= 0) {
      alert('Masukkan nominal pengeluaran yang valid');
      return;
    }
    setSubmittingExpense(true);
    try {
      await api.post('/keuangan/ppdb-billing/expenses', {
        target_academic_year_id: Number(selectedTargetAyId),
        academic_year_id: Number(transactionAyId),
        amount: parseFloat(expenseForm.amount),
        expense_date: expenseForm.expense_date,
        cash_account_id: Number(expenseForm.cash_account_id),
        notes: expenseForm.notes || expenseForm.category_name,
        category_name: expenseForm.category_name
      });
      alert('Pengeluaran program PPDB berhasil dicatat dan dibukukan ke RAPB TA Sasaran.');
      setCreateExpenseModalOpen(false);
      fetchExpenses();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal mencatat pengeluaran PPDB');
    } finally {
      setSubmittingExpense(false);
    }
  };

  const handleDeleteExpense = async (expenseId) => {
    if (!confirm('Yakin ingin membatalkan/menghapus pengeluaran PPDB ini?')) return;
    try {
      await api.delete(`/keuangan/ppdb-billing/expenses/${expenseId}`);
      alert('Pengeluaran PPDB berhasil dibatalkan.');
      fetchExpenses();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal membatalkan pengeluaran');
    }
  };

  return (
    <div className="space-y-6 pb-20">
      {/* ============================================================ */}
      {/* TOP HEADER: GLASSMORPHISM CARD & TARGET AY DROPDOWN */}
      {/* ============================================================ */}
      <div className="relative overflow-hidden bg-gradient-to-br from-indigo-900 via-indigo-800 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl border border-indigo-700/50">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-xs font-semibold text-indigo-200 border border-white/10">
              <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
              <span>Modul Keuangan Penerimaan Santri Baru (PPDB)</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Keuangan Calon Santri & PPDB
            </h1>
            <p className="text-xs sm:text-sm text-indigo-200/90 leading-relaxed">
              Pusat penetapan tarif biaya, penerbitan tagihan uang pangkal, verifikasi kas masuk, dan realisasi anggaran program PPDB yang ditujukan untuk Tahun Ajaran Sasaran masuk santri.
            </p>
          </div>

          {/* BEAUTIFUL DROPDOWN TAHUN AJARAN SASARAN PPDB DENGAN LIVE SEARCH */}
          <div className="bg-white/10 backdrop-blur-xl p-4 rounded-2xl border border-white/20 shadow-2xl min-w-[300px] max-w-sm space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] uppercase tracking-wider font-bold text-indigo-200 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-amber-400" />
                <span>Tahun Ajaran Sasaran PPDB</span>
              </span>
              <span className="px-2 py-0.5 rounded-md bg-amber-400/20 text-amber-300 font-bold text-[10px] border border-amber-400/30">
                Tahun Masuk
              </span>
            </div>

            <div className="relative">
              <SearchableSelect
                options={academicYears.map((ay) => ({
                  value: String(ay.id),
                  label: `T.A. ${ay.name} ${ay.is_active ? '★ (Aktif)' : ''}`,
                  sublabel: ay.is_active ? 'Tahun Ajaran Berjalan' : `Tahun Ajaran Masuk ${ay.name}`,
                  badge: ay.is_active ? 'Aktif' : undefined,
                  badgeClass: ay.is_active ? 'bg-emerald-100 text-emerald-800' : undefined
                }))}
                value={String(selectedTargetAyId)}
                onChange={(val) => {
                  if (val) setSelectedTargetAyId(val);
                }}
                placeholder="-- Pilih Tahun Ajaran Sasaran --"
                searchPlaceholder="Cari tahun ajaran sasaran PPDB..."
                allowClear={false}
                variant="header-white"
                accentColor="indigo"
                className="w-full text-slate-800"
              />
            </div>

            <div className="flex items-center justify-between text-[11px] text-indigo-200/80 pt-1 border-t border-white/10">
              <span>Transaksi Kas Dibukukan:</span>
              <span className="font-semibold text-white">TA {currentTransactionAy.name}</span>
            </div>
          </div>
        </div>

        {/* SUMMARY KPI CARDS */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mt-6 pt-6 border-t border-indigo-700/40">
          <div className="bg-white/5 backdrop-blur-xs p-3 rounded-xl border border-white/10">
            <div className="text-[11px] text-indigo-200 font-medium">Total Pendaftar</div>
            <div className="text-xl font-black text-white mt-1">
              {assignmentsData.total_candidates || matrixData.summary?.total_candidates || 0} <span className="text-xs font-normal text-indigo-300">Santri</span>
            </div>
          </div>
          <div className="bg-white/5 backdrop-blur-xs p-3 rounded-xl border border-white/10">
            <div className="text-[11px] text-indigo-200 font-medium">Skema Ditetapkan</div>
            <div className="text-xl font-black text-emerald-300 mt-1">
              {assignmentsData.assigned_count + assignmentsData.custom_count || 0} <span className="text-xs font-normal text-indigo-300">Santri</span>
            </div>
          </div>
          <div className="bg-white/5 backdrop-blur-xs p-3 rounded-xl border border-white/10">
            <div className="text-[11px] text-indigo-200 font-medium">Total Tagihan PPDB</div>
            <div className="text-lg font-black text-white mt-1">
              {formatCurrency(matrixData.summary?.total_billed || 0)}
            </div>
          </div>
          <div className="bg-white/5 backdrop-blur-xs p-3 rounded-xl border border-white/10">
            <div className="text-[11px] text-indigo-200 font-medium">Kas Masuk Terbayar</div>
            <div className="text-lg font-black text-emerald-400 mt-1">
              {formatCurrency(matrixData.summary?.total_paid || 0)}
            </div>
          </div>
          <div className="bg-white/5 backdrop-blur-xs p-3 rounded-xl border border-white/10 col-span-2 sm:col-span-1">
            <div className="text-[11px] text-indigo-200 font-medium">Pengeluaran PPDB</div>
            <div className="text-lg font-black text-rose-300 mt-1">
              {formatCurrency(expensesData.total_expenses_amount || 0)}
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 5 PRIMARY TABS NAVIGATION */}
      {/* ============================================================ */}
      <div className="bg-white p-1.5 rounded-2xl border border-slate-200 shadow-xs grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-1.5">
        <button
          type="button"
          onClick={() => setActiveMainTab('assignments')}
          className={`flex items-center justify-center gap-2 py-3 px-3 rounded-xl text-xs font-bold transition-all ${
            activeMainTab === 'assignments'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
          }`}
        >
          <Sliders className="w-4 h-4 shrink-0" />
          <span>1. Penetapan Biaya</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveMainTab('bills')}
          className={`flex items-center justify-center gap-2 py-3 px-3 rounded-xl text-xs font-bold transition-all ${
            activeMainTab === 'bills'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
          }`}
        >
          <Receipt className="w-4 h-4 shrink-0" />
          <span>2. Tagihan & Matriks</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveMainTab('payments')}
          className={`flex items-center justify-center gap-2 py-3 px-3 rounded-xl text-xs font-bold transition-all ${
            activeMainTab === 'payments'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
          }`}
        >
          <Wallet className="w-4 h-4 shrink-0" />
          <span>3. Penerimaan Bayar</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveMainTab('expenses')}
          className={`flex items-center justify-center gap-2 py-3 px-3 rounded-xl text-xs font-bold transition-all ${
            activeMainTab === 'expenses'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
          }`}
        >
          <TrendingDown className="w-4 h-4 shrink-0" />
          <span>4. Pengeluaran Program</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveMainTab('ledger')}
          className={`flex items-center justify-center gap-2 py-3 px-3 rounded-xl text-xs font-bold transition-all ${
            activeMainTab === 'ledger'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
          }`}
        >
          <CreditCard className="w-4 h-4 shrink-0" />
          <span>5. Kartu Bayar PPDB</span>
        </button>
      </div>

      {/* ============================================================ */}
      {/* TAB 1: PENETAPAN BIAYA PPDB (FEE ASSIGNMENTS) */}
      {/* ============================================================ */}
      {activeMainTab === 'assignments' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Header & Stats Cards Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                    <UserCheck className="w-5 h-5" />
                  </div>
                  <h1 className="text-xl font-bold text-slate-800">Penetapan Biaya Calon Santri (PPDB)</h1>
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                      isAllUnitsContext
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        : 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                    }`}
                  >
                    {isAllUnitsContext ? <Building2 className="w-3 h-3 text-emerald-600" /> : <School className="w-3 h-3 text-indigo-600" />}
                    <span>{isAllUnitsContext ? 'Konteks: Gabungan Seluruh Satuan' : `Konteks: ${activeSchoolUnit?.name || 'Satuan'}`}</span>
                  </span>
                  <span className="inline-flex items-center gap-1 text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 rounded-full text-[11px] font-bold">
                    <Calendar className="w-3 h-3 text-indigo-600" />
                    {currentTargetAy ? `T.A. Sasaran ${currentTargetAy.name} ${currentTargetAy.is_active ? '(Aktif)' : ''}` : 'Pilih T.A.'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Langkah awal alur keuangan PPDB: Tetapkan skema tarif biaya calon santri baru/pindahan (perorangan) maupun serentak (massal) dengan rincian nominal per pos tagihan.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={fetchFeeAssignments}
                  title="Sinkronkan Data"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl text-xs font-semibold transition"
                >
                  <RotateCw className={`w-3.5 h-3.5 ${loadingAssignments ? 'animate-spin' : ''}`} />
                  Muat Ulang
                </button>
                <button
                  type="button"
                  onClick={handleOpenBulkAssign}
                  disabled={selectedCandidateIds.length === 0}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-xl text-xs font-semibold shadow-sm transition"
                >
                  <Layers className="w-4 h-4" />
                  Tetapkan Massal ({selectedCandidateIds.length} Santri)
                </button>
              </div>
            </div>

            {/* 4 Stat Mini Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-4 border-t border-slate-100">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                <span className="text-[10px] font-semibold text-slate-500 uppercase">Total Calon Santri T.A. Ini</span>
                <p className="text-lg font-bold text-slate-800 mt-0.5">{totalCandidatesCount}</p>
              </div>
              <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3">
                <span className="text-[10px] font-semibold text-emerald-700 uppercase">Skema Standar</span>
                <p className="text-lg font-bold text-emerald-800 mt-0.5">{assignedStandardCount}</p>
              </div>
              <div className="bg-purple-50/70 border border-purple-200 rounded-xl p-3">
                <span className="text-[10px] font-semibold text-purple-700 uppercase">Khusus / Custom</span>
                <p className="text-lg font-bold text-purple-800 mt-0.5">{assignedCustomCount}</p>
              </div>
              <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3">
                <span className="text-[10px] font-semibold text-amber-700 uppercase">Belum Ditetapkan</span>
                <p className="text-lg font-bold text-amber-800 mt-0.5">{unassignedCandidatesCount}</p>
              </div>
            </div>

            {/* Notice if scheme is empty for target academic year */}
            {!loadingAssignments && assignmentsData.schemes?.length === 0 && (
              <div className="mt-4 p-4 bg-amber-50/80 border border-amber-200 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-2xs">
                <div className="flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold text-amber-900 text-xs">
                      Skema Biaya Pendidikan Belum Tersedia untuk TA {currentTargetAy.name}
                    </div>
                    <p className="text-[11px] text-amber-800/80 mt-0.5">
                      Calon santri baru memerlukan rujukan paket skema biaya pada Tahun Ajaran {currentTargetAy.name} untuk penetapan tarif.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleNavigateToFeeSchemes}
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shrink-0 shadow-2xs"
                >
                  <span>Buat Skema Biaya TA {currentTargetAy.name}</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Filter Controls Bar */}
            <div className="mt-5 flex flex-col md:flex-row items-stretch md:items-center gap-3 pt-4 border-t border-slate-100">
              <div className="relative flex-1 w-full">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={assignmentSearch}
                  onChange={(e) => setAssignmentSearch(e.target.value)}
                  placeholder="Cari calon santri berdasarkan Nama, No. Reg, atau NISN..."
                  className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none transition"
                />
                {assignmentSearch && (
                  <button
                    type="button"
                    onClick={() => setAssignmentSearch('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-md"
                    title="Hapus pencarian"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2 w-full md:w-auto flex-wrap">
                {/* Filter Jalur / Proses PSB */}
                <select
                  value={selectedProcessFilter}
                  onChange={(e) => setSelectedProcessFilter(e.target.value)}
                  className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700"
                >
                  <option value="">Semua Jalur / Proses PSB</option>
                  {processOptions.map((proc) => (
                    <option key={proc} value={proc}>{proc}</option>
                  ))}
                </select>

                {/* Filter Skema */}
                <select
                  value={selectedSchemeFilter}
                  onChange={(e) => setSelectedSchemeFilter(e.target.value)}
                  className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700"
                >
                  <option value="">Semua Skema Biaya</option>
                  {(assignmentsData.schemes || []).map((s) => (
                    <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                  ))}
                </select>

                {/* Filter Status */}
                <select
                  value={assignmentStatusFilter}
                  onChange={(e) => setAssignmentStatusFilter(e.target.value)}
                  className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700"
                >
                  <option value="all">Semua Status</option>
                  <option value="assigned">Skema Standar</option>
                  <option value="custom">Khusus (Custom)</option>
                  <option value="unassigned">Belum Ditetapkan</option>
                </select>
              </div>
            </div>
          </div>

          {/* Table with Breakdown Columns and Sticky tfoot */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            {loadingAssignments ? (
              <div className="py-16 text-center text-slate-400 flex flex-col items-center gap-2">
                <Loader2 className="w-7 h-7 animate-spin text-emerald-600" />
                <span className="text-xs">Memuat daftar penetapan calon santri &amp; rincian tarif...</span>
              </div>
            ) : sortedAndFilteredCandidates.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                <Users className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                <p className="text-sm font-semibold text-slate-600">Tidak Ada Data Calon Santri</p>
                <p className="text-xs text-slate-400 mt-1">Coba sesuaikan kata kunci pencarian atau filter jalur/skema.</p>
              </div>
            ) : (
              <div className="overflow-x-auto max-h-[calc(100vh-320px)] min-h-[400px] overflow-y-auto relative border border-slate-200/80 rounded-b-2xl">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200 select-none sticky top-0 z-30 shadow-xs">
                    <tr>
                      {/* Checkbox Column */}
                      <th className="px-3 py-3 w-10 text-center sticky left-0 bg-slate-50 z-20 shadow-[1px_0_0_0_#e2e8f0]">
                        <button
                          type="button"
                          onClick={handleSelectAllCandidates}
                          className="p-1 hover:text-emerald-700"
                          title="Pilih Semua"
                        >
                          {selectedCandidateIds.length > 0 && selectedCandidateIds.length === sortedAndFilteredCandidates.length ? (
                            <CheckSquare className="w-4 h-4 text-emerald-600" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-400" />
                          )}
                        </button>
                      </th>

                      {/* Candidate Info */}
                      <th
                        onClick={() => handleSort('student_name')}
                        className="px-4 py-3 min-w-[220px] cursor-pointer hover:bg-slate-100 transition group sticky left-10 bg-slate-50 z-20 shadow-[1px_0_0_0_#e2e8f0]"
                      >
                        <div className="flex items-center gap-1.5">
                          <span>Calon Santri (No. Reg / Nama)</span>
                          {sortConfig.key === 'student_name' ? (
                            sortConfig.direction === 'asc' ? (
                              <ArrowUp className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <ArrowDown className="w-3.5 h-3.5 text-emerald-600" />
                            )
                          ) : (
                            <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-40 group-hover:opacity-100" />
                          )}
                        </div>
                      </th>

                      {/* Scheme Status */}
                      <th
                        onClick={() => handleSort('scheme_name')}
                        className="px-4 py-3 min-w-[160px] cursor-pointer hover:bg-slate-100 transition group"
                      >
                        <div className="flex items-center gap-1.5">
                          <span>Skema Biaya</span>
                          {sortConfig.key === 'scheme_name' ? (
                            sortConfig.direction === 'asc' ? (
                              <ArrowUp className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <ArrowDown className="w-3.5 h-3.5 text-emerald-600" />
                            )
                          ) : (
                            <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-40 group-hover:opacity-100" />
                          )}
                        </div>
                      </th>

                      {/* Dynamic Fee Type Columns */}
                      {dynamicFeeTypes.map((ft) => (
                        <th
                          key={ft.id}
                          onClick={() => handleSort(`fee_type_${ft.id}`)}
                          className="px-3 py-3 text-right min-w-[110px] cursor-pointer hover:bg-slate-100 transition group bg-slate-50/50"
                          title={`Pos Biaya: ${ft.name}`}
                        >
                          <div className="flex items-center justify-end gap-1">
                            <span className="truncate max-w-[100px]">{ft.name}</span>
                            {sortConfig.key === `fee_type_${ft.id}` ? (
                              sortConfig.direction === 'asc' ? (
                                <ArrowUp className="w-3 h-3 text-emerald-600" />
                              ) : (
                                <ArrowDown className="w-3 h-3 text-emerald-600" />
                              )
                            ) : (
                              <ArrowUpDown className="w-2.5 h-2.5 text-slate-300 opacity-0 group-hover:opacity-100" />
                            )}
                          </div>
                        </th>
                      ))}

                      {/* Total Biaya + Aksi Penetapan (Selalu di Paling Kanan, Solid BG) */}
                      <th
                        onClick={() => handleSort('total_amount')}
                        className="px-4 py-3 text-right min-w-[260px] sticky right-0 bg-emerald-50 z-20 shadow-[-1px_0_0_0_#e2e8f0] font-bold text-emerald-950 cursor-pointer hover:bg-emerald-100 transition group"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5">
                            <span>Total Biaya</span>
                            {sortConfig.key === 'total_amount' ? (
                              sortConfig.direction === 'asc' ? (
                                <ArrowUp className="w-3.5 h-3.5 text-emerald-700" />
                              ) : (
                                <ArrowDown className="w-3.5 h-3.5 text-emerald-700" />
                              )
                            ) : (
                              <ArrowUpDown className="w-3 h-3 text-emerald-600/40 group-hover:opacity-100" />
                            )}
                          </div>
                          <span className="text-[10px] font-medium text-emerald-800 uppercase tracking-wider">Aksi</span>
                        </div>
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {sortedAndFilteredCandidates.map((cand) => {
                      const candId = cand.student_id || cand.candidate_id;
                      const isSelected = selectedCandidateIds.includes(candId);
                      const asg = cand.assignment;
                      const isAssigned = Boolean(asg?.id || cand.fee_scheme_id);
                      const isCustom = Boolean(asg?.is_custom || cand.assignment_status === 'custom');
                      const breakdown = cand.fee_breakdown || asg?.fee_breakdown || {};
                      
                      // Calculate monthly and non-monthly totals
                      let candMonthly = 0;
                      let candNonMonthly = 0;
                      if (isAssigned) {
                        dynamicFeeTypes.forEach((ft) => {
                          const item = breakdown[ft.id];
                          const amount = Number(item?.final_amount || 0);
                          const isMonthly = ft.billing_pattern === 'monthly' || String(ft.name).toLowerCase().includes('spp') || String(ft.code || '').toLowerCase().includes('spp');
                          if (isMonthly) {
                            candMonthly += amount;
                          } else {
                            candNonMonthly += amount;
                          }
                        });
                      }

                      const isTransfer = cand.entry_type === 'pindahan' || String(cand.entry_type_label || '').toLowerCase().includes('pindahan');

                      return (
                        <tr
                          key={candId}
                          className={`hover:bg-slate-50 transition ${isSelected ? 'bg-emerald-50' : ''}`}
                        >
                          {/* Checkbox Column (Solid BG) */}
                          <td className={`px-3 py-2.5 text-center sticky left-0 z-10 shadow-[1px_0_0_0_#e2e8f0] ${isSelected ? 'bg-emerald-100' : 'bg-white'}`}>
                            <button
                              type="button"
                              onClick={() => handleToggleSelectCandidate(candId)}
                              className="p-1"
                            >
                              {isSelected ? (
                                <CheckSquare className="w-4 h-4 text-emerald-600" />
                              ) : (
                                <Square className="w-4 h-4 text-slate-300 hover:text-slate-400" />
                              )}
                            </button>
                          </td>

                          {/* Candidate Info with "Siswa Baru" / "Siswa Pindahan" (Solid BG) */}
                          <td className={`px-4 py-2.5 sticky left-10 z-10 shadow-[1px_0_0_0_#e2e8f0] ${isSelected ? 'bg-emerald-100' : 'bg-white'}`}>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-semibold text-slate-800">{cand.student_name || cand.full_name}</span>
                              <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-bold ${
                                isTransfer
                                  ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                  : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              }`}>
                                {isTransfer ? 'Siswa Pindahan' : 'Siswa Baru'}
                              </span>
                              {isAllUnitsContext && (
                                <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold border ${
                                  Number(cand.satuan_pendidikan_id) === 2
                                    ? 'bg-purple-50 text-purple-700 border-purple-200'
                                    : 'bg-blue-50 text-blue-700 border-blue-200'
                                }`}>
                                  {Number(cand.satuan_pendidikan_id) === 2 ? 'SMA' : 'SMP'}
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] font-mono text-slate-400">
                              No. Reg / NIS: {cand.registration_number || cand.nis || '-'}
                            </div>
                          </td>

                          {/* Scheme Column */}
                          <td className="px-4 py-2.5">
                            {isCustom ? (
                              <div className="flex flex-col">
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded w-max">
                                  <Sparkles className="w-2.5 h-2.5" /> Khusus (Custom)
                                </span>
                                <span className="text-[10px] text-slate-400 mt-0.5">
                                  {(cand.custom_adjustments || cand.adjustments || []).length} penyesuaian khusus
                                </span>
                              </div>
                            ) : isAssigned ? (
                              <div>
                                <span className="font-semibold text-slate-800">{cand.scheme_name || asg?.scheme_name}</span>
                                {(cand.scheme_code || asg?.scheme_code) && (
                                  <span className="ml-1.5 text-[10px] font-mono text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                                    {cand.scheme_code || asg?.scheme_code}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-400 italic text-[11px]">Belum Ditetapkan</span>
                            )}
                          </td>

                          {/* Dynamic Fee Type Columns Breakdown (Tanpa teks keterangan di bawah nominal) */}
                          {dynamicFeeTypes.map((ft) => {
                            const item = breakdown[ft.id];
                            const amount = item ? item.final_amount : 0;
                            const hasVal = isAssigned && amount > 0;
                            const isAdj = item?.has_adjustment;

                            return (
                              <td key={ft.id} className="px-3 py-2.5 text-right font-mono text-[11px]">
                                {!isAssigned ? (
                                  <span className="text-slate-300">-</span>
                                ) : hasVal ? (
                                  <span className={`font-semibold ${isAdj ? 'text-purple-700' : 'text-slate-700'}`}>
                                    {formatRupiah(amount)}
                                  </span>
                                ) : (
                                  <span className="text-slate-400">Rp 0</span>
                                )}
                              </td>
                            );
                          })}

                          {/* Total Biaya Paling Kanan (Bulanan & Non Bulanan) + Icon Aksi Penetapan (Solid BG) */}
                          <td className={`px-4 py-2.5 text-right sticky right-0 z-10 shadow-[-1px_0_0_0_#e2e8f0] ${isSelected ? 'bg-emerald-100' : 'bg-emerald-50'}`}>
                            <div className="flex items-center justify-between gap-3">
                              {/* Rincian Bulanan & Non-Bulanan */}
                              <div className="flex flex-col items-start text-left text-[11px] font-mono">
                                {isAssigned ? (
                                  <>
                                    <div className="flex items-center gap-1">
                                      <span className="text-[10px] font-sans text-slate-500 font-semibold">Bln:</span>
                                      <span className="font-bold text-slate-800">{formatRupiah(candMonthly)}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <span className="text-[10px] font-sans text-slate-500 font-semibold">Non-Bln:</span>
                                      <span className="font-bold text-slate-800">{formatRupiah(candNonMonthly)}</span>
                                    </div>
                                  </>
                                ) : (
                                  <span className="text-slate-400 italic font-sans text-[11px]">-</span>
                                )}
                              </div>

                              {/* Tombol Aksi Cukup Icon Saja */}
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleOpenSingleAssign(cand)}
                                  title={isAssigned && !isCustom ? 'Ganti Skema Biaya' : 'Pilih Skema Biaya'}
                                  className="p-1.5 text-slate-600 hover:text-emerald-700 hover:bg-emerald-200/60 rounded-lg transition"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleOpenCustomAdjustment(cand)}
                                  title="Input Manual / Tarif Khusus"
                                  className={`p-1.5 rounded-lg transition ${
                                    isCustom
                                      ? 'bg-purple-600 text-white hover:bg-purple-700 shadow-xs'
                                      : 'text-purple-700 hover:bg-purple-100'
                                  }`}
                                >
                                  <Sliders className="w-3.5 h-3.5" />
                                </button>
                                {isAssigned && (
                                  <button
                                    type="button"
                                    onClick={() => handleOpenHistoryModal(cand)}
                                    title="Riwayat Perubahan Penetapan"
                                    className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-100 rounded-lg transition"
                                  >
                                    <History className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>

                  {/* Table Footer: Total Akumulasi Keseluruhan Calon Santri (Selalu Sticky di Bawah, Solid BG) */}
                  <tfoot className="bg-slate-100 text-slate-800 font-bold border-t-2 border-slate-300 select-none sticky bottom-0 z-30 shadow-[0_-4px_10px_rgba(0,0,0,0.05)]">
                    <tr>
                      <td colSpan={3} className="px-4 py-3 text-left sticky left-0 bg-slate-100 z-30 shadow-[1px_0_0_0_#cbd5e1]">
                        <div className="flex items-center gap-2">
                          <span className="uppercase text-[11px] tracking-wider text-slate-700 font-extrabold">
                            Total Akumulasi ({sortedAndFilteredCandidates.length} Calon Santri):
                          </span>
                        </div>
                      </td>

                      {/* Total per Pos Biaya */}
                      {dynamicFeeTypes.map((ft) => {
                        const colTotal = sortedAndFilteredCandidates.reduce((sum, cand) => {
                          const amount = cand.fee_breakdown?.[ft.id]?.final_amount || cand.assignment?.fee_breakdown?.[ft.id]?.final_amount || 0;
                          return sum + Number(amount);
                        }, 0);

                        return (
                          <td key={ft.id} className="px-3 py-3 text-right font-mono text-[11px] text-slate-900 bg-slate-100 font-bold">
                            {colTotal > 0 ? formatRupiah(colTotal) : <span className="text-slate-400">Rp 0</span>}
                          </td>
                        );
                      })}

                      {/* Grand Total All Assigned Fees (Bln & Non-Bln) di Kolom Paling Kanan */}
                      {(() => {
                        let totalMonthlyAll = 0;
                        let totalNonMonthlyAll = 0;
                        sortedAndFilteredCandidates.forEach((cand) => {
                          const breakdown = cand.fee_breakdown || cand.assignment?.fee_breakdown || {};
                          dynamicFeeTypes.forEach((ft) => {
                            const amount = Number(breakdown[ft.id]?.final_amount || 0);
                            const isMonthly = ft.billing_pattern === 'monthly' || String(ft.name).toLowerCase().includes('spp') || String(ft.code || '').toLowerCase().includes('spp');
                            if (isMonthly) {
                              totalMonthlyAll += amount;
                            } else {
                              totalNonMonthlyAll += amount;
                            }
                          });
                        });

                        return (
                          <td className="px-4 py-2.5 text-right sticky right-0 bg-emerald-100 z-30 shadow-[-1px_0_0_0_#cbd5e1] text-emerald-950 font-mono font-extrabold">
                            <div className="flex flex-col items-start text-left text-[11px]">
                              <div className="flex items-center gap-1">
                                <span className="text-[10px] font-sans text-emerald-800 font-semibold">Bln:</span>
                                <span>{formatRupiah(totalMonthlyAll)}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <span className="text-[10px] font-sans text-emerald-800 font-semibold">Non-Bln:</span>
                                <span>{formatRupiah(totalNonMonthlyAll)}</span>
                              </div>
                            </div>
                          </td>
                        );
                      })()}
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 2: TAGIHAN & MATRIKS PPDB */}
      {/* ============================================================ */}
      {activeMainTab === 'bills' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          {/* Sub Tab Navigation */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
            <div className="flex items-center gap-2 overflow-x-auto">
              <button
                type="button"
                onClick={() => setBillsSubTab('matrix')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition relative ${
                  billsSubTab === 'matrix'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Layers className="w-4 h-4" />
                <span>1. Matriks Penagihan PPDB</span>
                {matrixData.rows?.length > 0 && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${billsSubTab === 'matrix' ? 'bg-indigo-700 text-white' : 'bg-slate-200 text-slate-700'}`}>
                    {matrixData.rows.length} Santri
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setBillsSubTab('history')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition relative ${
                  billsSubTab === 'history'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <History className="w-4 h-4" />
                <span>2. Riwayat Tagihan PPDB</span>
                {billsData.bills?.length > 0 && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${billsSubTab === 'history' ? 'bg-indigo-700 text-white' : 'bg-slate-200 text-slate-700'}`}>
                    {billsData.bills.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setBillsSubTab('reminders')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition relative ${
                  billsSubTab === 'reminders'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Bell className="w-4 h-4" />
                <span>3. Reminder Tagihan (Portal Ortu)</span>
                {remindersData?.length > 0 && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${billsSubTab === 'reminders' ? 'bg-indigo-700 text-white' : 'bg-slate-200 text-slate-700'}`}>
                    {remindersData.length} Log
                  </span>
                )}
              </button>
            </div>

            {billsSubTab === 'reminders' && (
              <button
                type="button"
                onClick={handleOpenBroadcastModal}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white rounded-xl text-xs font-bold shadow-md shadow-amber-500/20 transition self-start sm:self-auto"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Kirim Reminder Massal</span>
              </button>
            )}
          </div>

          {/* Sub-Tab 2.1: Matriks Penagihan PPDB */}
          {billsSubTab === 'matrix' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              {/* Summary & KPI Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
                <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Calon Santri</p>
                    <p className="text-xl font-black text-slate-800 mt-1">{matrixData.summary?.total_students || matrixData.rows?.length || 0} Santri</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">T.A. Sasaran {currentTargetAy.name}</p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                    <Users className="w-5 h-5" />
                  </div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Tagihan Diterbitkan</p>
                    <p className="text-xl font-black text-indigo-700 mt-1">{matrixData.summary?.total_published_bills || 0} Tagihan</p>
                    <p className="text-[10px] text-indigo-600 mt-0.5">Sudah tercatat di Piutang Masuk</p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                    <FileCheck className="w-5 h-5" />
                  </div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Piutang Belum Lunas</p>
                    <p className="text-xl font-black text-rose-700 mt-1">Rp {(matrixData.summary?.total_unpaid_ar || 0).toLocaleString('id-ID')}</p>
                    <p className="text-[10px] text-rose-500 mt-0.5">Sisa tagihan aktif calon santri</p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
                    <AlertCircle className="w-5 h-5" />
                  </div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Pembayaran Masuk</p>
                    <p className="text-xl font-black text-teal-700 mt-1">Rp {(matrixData.summary?.total_paid || 0).toLocaleString('id-ID')}</p>
                    <p className="text-[10px] text-teal-600 mt-0.5">Kas/Bank PPDB telah diterima</p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center font-bold">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                </div>
              </div>

              {/* Matrix Controls & Filter Bar */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
                  <div className="relative w-full sm:w-80">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Cari calon santri, No Reg, proses..."
                      value={matrixSearch}
                      onChange={(e) => setMatrixSearch(e.target.value)}
                      className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-indigo-500 transition"
                    />
                    {matrixSearch && (
                      <button
                        type="button"
                        onClick={() => setMatrixSearch('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-md"
                        title="Hapus pencarian"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={fetchMatrixData}
                    className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition"
                    title="Muat Ulang Matriks"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>

                {/* Selection Status & Action Badge */}
                <div className="flex items-center gap-2 w-full md:w-auto justify-between md:justify-end">
                  {selectedMatrixRowIds.size > 0 ? (
                    <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-200 text-indigo-800 px-3 py-1.5 rounded-xl text-xs font-semibold animate-in fade-in">
                      <CheckSquare className="w-4 h-4 text-indigo-600" />
                      <span>{selectedMatrixRowIds.size} calon santri terpilih</span>
                      <button
                        type="button"
                        onClick={() => setSelectedMatrixRowIds(new Set())}
                        className="text-indigo-700 hover:text-indigo-900 underline text-[11px] ml-1"
                      >
                        Batal
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-slate-400 text-xs font-medium">
                      <Info className="w-3.5 h-3.5" />
                      <span>Pilih baris calon santri atau klik tombol kolom untuk terbitkan massal</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Matrix Table with Horizontal & Vertical Scroll and Sticky Frozen Columns */}
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden relative">
                {loadingMatrix ? (
                  <div className="p-16 text-center text-slate-400">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-600 mb-2" />
                    <p className="text-xs font-medium">Menyusun matriks tagihan PPDB calon santri...</p>
                  </div>
                ) : filteredMatrixRows.length === 0 ? (
                  <div className="p-16 text-center text-slate-400">
                    <Users className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                    <p className="text-xs font-bold text-slate-700">Tidak ada data calon santri</p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      {matrixSearch
                        ? 'Tidak ada calon santri yang sesuai filter pencarian.'
                        : `Pastikan penetapan biaya PPDB TA Sasaran ${currentTargetAy.name} telah memiliki calon santri.`}
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto max-h-[680px]">
                    <table className="w-full text-left text-xs border-collapse border-separate border-spacing-0">
                      <thead className="bg-slate-100 text-slate-700 font-bold sticky top-0 z-20 border-b border-slate-200 shadow-2xs">
                        <tr>
                          {/* Fixed Left Header 1: Checkbox (44px) */}
                          <th className="p-3 w-[44px] min-w-[44px] max-w-[44px] text-center sticky left-0 z-30 bg-slate-100 border-r border-b border-slate-200">
                            <input
                              type="checkbox"
                              checked={selectedMatrixRowIds.size === filteredMatrixRows.length && filteredMatrixRows.length > 0}
                              onChange={handleSelectAllMatrixRows}
                              className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                            />
                          </th>

                          {/* Fixed Left Header 2: Nama Calon Santri (260px, left: 44px) */}
                          <th className="p-3 w-[260px] min-w-[260px] max-w-[260px] text-left sticky left-[44px] z-30 bg-slate-100 border-r border-b border-slate-200 font-bold text-slate-800">
                            Calon Santri Baru
                          </th>

                          {/* Fixed Left Header 3: Jalur / Keterangan (110px, left: 304px) */}
                          <th className="p-3 w-[110px] min-w-[110px] max-w-[110px] text-left sticky left-[304px] z-30 bg-slate-100 border-r border-b border-slate-200 shadow-[3px_0_6px_-2px_rgba(0,0,0,0.12)]">
                            Jalur Masuk
                          </th>

                          {/* Dynamic Columns for PPDB Fee Components */}
                          {matrixData.columns?.map((col) => (
                            <th
                              key={col.key}
                              className="p-3 min-w-[160px] text-center border-r border-b border-slate-200 align-top group hover:bg-slate-100/80 transition"
                            >
                              <div className="flex flex-col items-center gap-1">
                                <div className="flex items-center gap-1">
                                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border uppercase ${col.badge_color || 'bg-indigo-50 text-indigo-700 border-indigo-200'}`}>
                                    {col.badge_text || 'PPDB'}
                                  </span>
                                </div>
                                <span className="font-semibold text-slate-800 text-[11px]">{col.label}</span>
                                <span className="text-[10px] text-slate-500 font-normal">T.A. {currentTargetAy.name}</span>

                                {/* Tombol Aksi Kolom: Terbitkan & Import Excel */}
                                <div className="mt-1.5 w-full flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => handleOpenColumnPublishModal(col)}
                                    title="Terbitkan tagihan kolom ini secara massal"
                                    className="flex-1 flex items-center justify-center gap-1 py-1 px-1.5 rounded-lg bg-white border border-slate-300 hover:border-indigo-500 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 text-[10px] font-semibold transition shadow-2xs"
                                  >
                                    <Zap className="w-3 h-3 text-indigo-600" />
                                    <span>Terbitkan</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleOpenImportModal(col)}
                                    title="Import data Excel & Unduh format kolom ini"
                                    className="flex-1 flex items-center justify-center gap-1 py-1 px-1.5 rounded-lg bg-white border border-blue-200 hover:border-blue-500 hover:bg-blue-50 text-slate-700 hover:text-blue-700 text-[10px] font-semibold transition shadow-2xs"
                                  >
                                    <FileSpreadsheet className="w-3 h-3 text-blue-600" />
                                    <span>Import</span>
                                  </button>
                                </div>
                              </div>
                            </th>
                          ))}
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-slate-100">
                        {filteredMatrixRows.map((row, rIdx) => {
                          const candidateId = row.candidate_id || row.student_id;
                          const isRowSelected = selectedMatrixRowIds.has(candidateId);
                          const stickyBg = isRowSelected
                            ? 'bg-[#eef2ff]'
                            : rIdx % 2 === 1
                              ? 'bg-[#f8fafc]'
                              : 'bg-white';

                          return (
                            <tr
                              key={candidateId}
                              className={`hover:bg-slate-100/70 transition ${isRowSelected ? 'bg-indigo-50/50' : rIdx % 2 === 1 ? 'bg-slate-50/40' : 'bg-white'}`}
                            >
                              {/* Sticky Cell 1: Checkbox */}
                              <td className={`p-3 w-[44px] min-w-[44px] max-w-[44px] text-center sticky left-0 z-10 ${stickyBg} border-r border-slate-200`}>
                                <input
                                  type="checkbox"
                                  checked={isRowSelected}
                                  onChange={() => handleToggleSelectMatrixRow(candidateId)}
                                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                />
                              </td>

                              {/* Sticky Cell 2: Nama Calon Santri & No Registrasi */}
                              <td className={`p-3 w-[260px] min-w-[260px] max-w-[260px] sticky left-[44px] z-10 ${stickyBg} border-r border-slate-200 truncate`} title={row.full_name}>
                                <div>
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="font-bold text-slate-800 text-xs truncate">{row.full_name}</span>
                                    {isAllUnitsContext && (
                                      <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold border ${
                                        Number(row.satuan_pendidikan_id) === 2
                                          ? 'bg-purple-50 text-purple-700 border-purple-200'
                                          : 'bg-blue-50 text-blue-700 border-blue-200'
                                      }`}>
                                        {Number(row.satuan_pendidikan_id) === 2 ? 'SMA' : 'SMP'}
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                    <span className="font-mono text-[10px] text-slate-600 font-medium bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200/60">
                                      Reg: {row.registration_number || row.nis || '-'}
                                    </span>
                                    {row.scheme_name && (
                                      <span className="text-[10px] text-slate-400 font-normal truncate max-w-[130px]" title={row.scheme_name}>
                                        • {row.scheme_name}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </td>

                              {/* Sticky Cell 3: Jalur Masuk */}
                              <td className={`p-3 w-[110px] min-w-[110px] max-w-[110px] text-slate-600 sticky left-[304px] z-10 ${stickyBg} border-r border-slate-200 text-[11px] shadow-[3px_0_6px_-2px_rgba(0,0,0,0.12)]`}>
                                <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium text-[10px]">
                                  {row.process_name || 'Reguler'}
                                </span>
                              </td>

                              {/* Dynamic Matrix Cells */}
                              {matrixData.columns?.map((col) => {
                                const cell = row.cells?.[col.key] || {};
                                const isPub = cell.is_published;
                                const isPaid = cell.is_paid;
                                const isPart = cell.is_partially_paid;
                                const isOver = cell.is_overdue;

                                let cellStyle = 'bg-white text-slate-700 hover:border-indigo-400 border-slate-200';
                                let badgeText = 'Draf / Acuan';
                                let badgeClass = 'bg-slate-100 text-slate-500';

                                if (isPaid) {
                                  cellStyle = 'bg-emerald-50/80 text-emerald-900 border-emerald-300 font-bold';
                                  badgeText = 'Lunas';
                                  badgeClass = 'bg-emerald-100 text-emerald-800';
                                } else if (isPart) {
                                  cellStyle = 'bg-teal-50/80 text-teal-900 border-teal-300 font-bold';
                                  badgeText = 'Sebagian';
                                  badgeClass = 'bg-teal-100 text-teal-800';
                                } else if (isOver) {
                                  cellStyle = 'bg-rose-50/90 text-rose-900 border-rose-300 font-bold';
                                  badgeText = 'Jatuh Tempo';
                                  badgeClass = 'bg-rose-100 text-rose-800 animate-pulse';
                                } else if (isPub) {
                                  cellStyle = 'bg-blue-50/80 text-blue-900 border-blue-300 font-bold';
                                  badgeText = 'Terbit';
                                  badgeClass = 'bg-blue-100 text-blue-800';
                                }

                                return (
                                  <td
                                    key={col.key}
                                    onClick={() => handleOpenCellModal(row, cell)}
                                    className="p-2 text-center border-r border-slate-100 cursor-pointer group select-none"
                                  >
                                    <div
                                      className={`p-2 rounded-xl border text-center transition-all shadow-2xs group-hover:shadow-md group-hover:scale-[1.02] ${cellStyle}`}
                                    >
                                      <div className="font-mono text-xs">
                                        Rp {(cell.amount !== undefined && cell.amount !== null ? cell.amount : (cell.base_amount || 0)).toLocaleString('id-ID')}
                                      </div>
                                      <div className="flex items-center justify-center gap-1 mt-1">
                                        <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${badgeClass}`}>
                                          {badgeText}
                                        </span>
                                        {(cell.has_discount || (cell.discount_amount && cell.discount_amount > 0)) && (
                                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" title={`Diskon/Keringanan: Rp ${(cell.discount_amount || 0).toLocaleString('id-ID')}`} />
                                        )}
                                      </div>
                                    </div>
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Sub-Tab 2.2: Riwayat Tagihan PPDB */}
          {billsSubTab === 'history' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              {/* Filter Bar */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Cari tagihan #ID / nama calon..."
                    value={billSearch}
                    onChange={(e) => setBillSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-indigo-500 transition"
                  />
                  {billSearch && (
                    <button
                      type="button"
                      onClick={() => setBillSearch('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-md"
                      title="Hapus pencarian"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div>
                  <SearchableSelect
                    options={[
                      { value: '', label: '-- Semua Jenis Biaya PPDB --' },
                      ...dynamicFeeTypes.map((ft) => ({ value: ft.id, label: ft.name }))
                    ]}
                    value={billFeeTypeFilter}
                    onChange={(val) => setBillFeeTypeFilter(val)}
                    placeholder="Filter Jenis Biaya"
                  />
                </div>

                <div>
                  <select
                    value={billStatusFilter}
                    onChange={(e) => setBillStatusFilter(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:bg-white focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="all">Semua Status Tagihan</option>
                    <option value="draft">Draf (Belum Terbit)</option>
                    <option value="unpaid">Belum Bayar</option>
                    <option value="partially_paid">Bayar Sebagian</option>
                    <option value="paid">Lunas</option>
                    <option value="cancelled">Dibatalkan</option>
                  </select>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-2">
                  <button
                    type="button"
                    onClick={fetchBillsHistory}
                    className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition flex items-center gap-1.5 text-xs font-semibold"
                    title="Muat Ulang Data"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span>Muat Ulang</span>
                  </button>
                </div>
              </div>

              {/* Bills Table with Sortable Columns */}
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
                {loadingBills ? (
                  <div className="p-16 text-center text-slate-400">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-600 mb-2" />
                    <p className="text-xs font-medium">Memuat riwayat tagihan PPDB...</p>
                  </div>
                ) : filteredAndSortedHistoryBills.length === 0 ? (
                  <div className="p-16 text-center text-slate-400">
                    <Receipt className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                    <p className="text-xs font-bold text-slate-700">Tidak ada data tagihan PPDB</p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      {billSearch || billStatusFilter !== 'all' || billFeeTypeFilter
                        ? 'Tidak ada tagihan yang sesuai filter pencarian.'
                        : `Belum ada tagihan PPDB diterbitkan untuk TA Sasaran ${currentTargetAy.name}.`}
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                        <tr>
                          <th className="p-3.5 cursor-pointer hover:bg-slate-100 transition" onClick={() => handleSortHistory('id')}>
                            <div className="flex items-center gap-1">
                              <span>Tagihan #ID</span>
                              <ArrowUpDown className="w-3 h-3 text-slate-400" />
                            </div>
                          </th>
                          <th className="p-3.5 cursor-pointer hover:bg-slate-100 transition" onClick={() => handleSortHistory('bill_date')}>
                            <div className="flex items-center gap-1">
                              <span>Tgl Tagihan</span>
                              <ArrowUpDown className="w-3 h-3 text-slate-400" />
                            </div>
                          </th>
                          <th className="p-3.5 cursor-pointer hover:bg-slate-100 transition" onClick={() => handleSortHistory('registrant_name_snapshot')}>
                            <div className="flex items-center gap-1">
                              <span>Calon Santri</span>
                              <ArrowUpDown className="w-3 h-3 text-slate-400" />
                            </div>
                          </th>
                          <th className="p-3.5">Jenis Biaya PPDB</th>
                          <th className="p-3.5 text-right cursor-pointer hover:bg-slate-100 transition" onClick={() => handleSortHistory('amount')}>
                            <div className="flex items-center justify-end gap-1">
                              <span>Nominal Kotor</span>
                              <ArrowUpDown className="w-3 h-3 text-slate-400" />
                            </div>
                          </th>
                          <th className="p-3.5 text-right cursor-pointer hover:bg-slate-100 transition" onClick={() => handleSortHistory('discount_amount')}>
                            <div className="flex items-center justify-end gap-1">
                              <span>Diskon</span>
                              <ArrowUpDown className="w-3 h-3 text-slate-400" />
                            </div>
                          </th>
                          <th className="p-3.5 text-right">Bersih</th>
                          <th className="p-3.5 cursor-pointer hover:bg-slate-100 transition" onClick={() => handleSortHistory('due_date')}>
                            <div className="flex items-center gap-1">
                              <span>Jatuh Tempo</span>
                              <ArrowUpDown className="w-3 h-3 text-slate-400" />
                            </div>
                          </th>
                          <th className="p-3.5 text-center">Status</th>
                          <th className="p-3.5 text-center">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredAndSortedHistoryBills.map((bill) => {
                          const netAmount = Math.max(0, (bill.amount || 0) - (bill.discount_amount || 0));
                          return (
                            <tr key={bill.id} className="hover:bg-slate-50/80 transition">
                              <td className="p-3.5 font-mono font-bold text-indigo-600">#{bill.id}</td>
                              <td className="p-3.5 font-mono text-slate-600">{formatDateToDMY(bill.bill_date || bill.created_at)}</td>
                              <td className="p-3.5">
                                <div className="font-bold text-slate-800">{bill.registrant_name_snapshot}</div>
                                <div className="text-[10px] text-slate-400 font-mono">
                                  Reg: {bill.registration_number_snapshot || '-'}
                                </div>
                              </td>
                              <td className="p-3.5 text-slate-700">
                                <div className="font-semibold">{bill.fee_type_name || 'Biaya Masuk PPDB'}</div>
                                <div className="text-[10px] text-slate-400">TA Sasaran: {currentTargetAy.name}</div>
                              </td>
                              <td className="p-3.5 text-right font-mono font-semibold text-slate-700">
                                {formatCurrency(bill.amount)}
                              </td>
                              <td className="p-3.5 text-right font-mono font-semibold text-amber-600">
                                {bill.discount_amount > 0 ? `- ${formatCurrency(bill.discount_amount)}` : '-'}
                              </td>
                              <td className="p-3.5 text-right font-mono font-bold text-slate-900">
                                {formatCurrency(netAmount)}
                              </td>
                              <td className="p-3.5 font-mono text-slate-600">{formatDateToDMY(bill.due_date)}</td>
                              <td className="p-3.5 text-center">
                                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                                  bill.status === 'paid' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                                  bill.status === 'partially_paid' ? 'bg-teal-100 text-teal-800 border border-teal-200' :
                                  bill.status === 'draft' ? 'bg-purple-100 text-purple-800 border border-purple-200' :
                                  bill.status === 'cancelled' ? 'bg-slate-100 text-slate-600 line-through' :
                                  'bg-rose-100 text-rose-800 border border-rose-200'
                                }`}>
                                  {bill.status?.toUpperCase() || 'BELUM BAYAR'}
                                </span>
                              </td>
                              <td className="p-3.5 text-center">
                                <div className="flex items-center justify-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => handleOpenDetailBill(bill)}
                                    title="Lihat Detail Tagihan"
                                    className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                                  >
                                    <Eye className="w-4 h-4" />
                                  </button>

                                  {bill.status !== 'paid' && bill.status !== 'cancelled' && (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() => handleOpenReviseModal(bill)}
                                        title="Revisi Tagihan (Audit Trail)"
                                        className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition"
                                      >
                                        <Edit2 className="w-4 h-4" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleSendSingleReminder(bill)}
                                        disabled={sendingSingleReminderId === bill.id}
                                        title="Kirim Reminder Cepat (Portal Ortu)"
                                        className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition disabled:opacity-50"
                                      >
                                        {sendingSingleReminderId === bill.id ? (
                                          <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                                        ) : (
                                          <Send className="w-4 h-4" />
                                        )}
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleOpenPayModal(bill)}
                                        title="Bayar di Kasir"
                                        className="p-1.5 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 rounded-lg transition"
                                      >
                                        <Wallet className="w-4 h-4" />
                                      </button>
                                    </>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Sub-Tab 2.3: Reminder Tagihan PPDB */}
          {billsSubTab === 'reminders' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              {/* Reminder Banner */}
              <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 p-5 rounded-2xl border border-indigo-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-bold shadow-md shadow-indigo-500/20 shrink-0">
                    <Smartphone className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-800">Pusat Pengingat Tagihan Masuk Calon Wali Santri</h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Kirimkan notifikasi tagihan atau pengingat jatuh tempo PPDB langsung ke Portal Orang Tua dan WhatsApp.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleOpenBroadcastModal}
                  className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition shadow-md shadow-indigo-600/20 shrink-0"
                >
                  <Send className="w-4 h-4" />
                  <span>Kirim Reminder Massal</span>
                </button>
              </div>

              {/* Reminder Logs Controls */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="relative flex-1 sm:w-80">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Cari log nama santri, pesan..."
                    value={reminderSearch}
                    onChange={(e) => setReminderSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-indigo-500 transition"
                  />
                </div>

                <button
                  type="button"
                  onClick={fetchReminders}
                  className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition flex items-center gap-1.5 text-xs font-semibold self-start sm:self-auto"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Muat Ulang Log</span>
                </button>
              </div>

              {/* Logs Table */}
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
                {loadingReminders ? (
                  <div className="p-16 text-center text-slate-400">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-600 mb-2" />
                    <p className="text-xs font-medium">Memuat riwayat broadcast pengingat...</p>
                  </div>
                ) : filteredReminderLogs.length === 0 ? (
                  <div className="p-16 text-center text-slate-400">
                    <Bell className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                    <p className="text-xs font-bold text-slate-700">Belum ada riwayat pengingat</p>
                    <p className="text-[11px] text-slate-400 mt-1">Gunakan tombol "Kirim Reminder Massal" untuk menjadwalkan notifikasi ke calon wali santri.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                        <tr>
                          <th className="p-3.5">Log #ID</th>
                          <th className="p-3.5">Waktu Pengiriman</th>
                          <th className="p-3.5">Calon Santri / Penerima</th>
                          <th className="p-3.5">Komponen Tagihan</th>
                          <th className="p-3.5">Saluran</th>
                          <th className="p-3.5 text-center">Status</th>
                          <th className="p-3.5">Pesan</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredReminderLogs.map((log) => (
                          <tr key={log.id} className="hover:bg-slate-50/80 transition">
                            <td className="p-3.5 font-mono font-bold text-indigo-600">#{log.id}</td>
                            <td className="p-3.5 font-mono text-slate-600">{formatDateToDMY(log.created_at)}</td>
                            <td className="p-3.5">
                              <div className="font-bold text-slate-800">{log.student_name || log.recipient_name}</div>
                              <div className="text-[10px] text-slate-400 font-mono">{log.phone || '-'}</div>
                            </td>
                            <td className="p-3.5 font-semibold text-slate-700">{log.fee_type_name || 'Tagihan Masuk PPDB'}</td>
                            <td className="p-3.5">
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                {log.channel || 'Portal Ortu'}
                              </span>
                            </td>
                            <td className="p-3.5 text-center">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                log.status === 'sent' || log.status === 'delivered'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}>
                                {log.status?.toUpperCase() || 'TERKIRIM'}
                              </span>
                            </td>
                            <td className="p-3.5 text-slate-600 max-w-xs truncate" title={log.message}>
                              {log.message || '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 3: PENERIMAAN PEMBAYARAN PPDB */}
      {/* ============================================================ */}
      {activeMainTab === 'payments' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
            <button
              type="button"
              onClick={() => setPaymentsSubTab('cashier')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                paymentsSubTab === 'cashier' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Wallet className="w-4 h-4" />
              <span>Kasir Pembayaran PPDB</span>
            </button>
            <button
              type="button"
              onClick={() => setPaymentsSubTab('proofs')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                paymentsSubTab === 'proofs' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <CreditCard className="w-4 h-4" />
              <span>Verifikasi Bukti Transfer (FIFO)</span>
            </button>
          </div>

          {paymentsSubTab === 'cashier' && (
            <div className="space-y-4">
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div>
                  <h4 className="text-xs font-bold text-slate-800">Daftar Tagihan Siap Bayar</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">Pilih tagihan calon santri untuk mencatat kas masuk dan mencetak kuitansi resmi</p>
                </div>

                <div className="relative w-full sm:w-72">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Cari santri / tagihan di kasir..."
                    value={billSearch}
                    onChange={(e) => setBillSearch(e.target.value)}
                    className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500"
                  />
                  {billSearch && (
                    <button
                      type="button"
                      onClick={() => setBillSearch('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-md"
                      title="Hapus pencarian"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Table of Unpaid / Partially Paid Bills */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-4">Calon Santri</th>
                      <th className="p-4">Komponen Tagihan</th>
                      <th className="p-4 text-right">Total Tagihan</th>
                      <th className="p-4 text-right">Sudah Dibayar</th>
                      <th className="p-4 text-right">Sisa Piutang</th>
                      <th className="p-4 text-center">Aksi Bayar</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredBills.filter((b) => b.status !== 'paid').length === 0 ? (
                      <tr>
                        <td colSpan="6" className="p-12 text-center text-slate-400">
                          {billSearch ? 'Tidak ada tagihan yang cocok dengan pencarian kasir.' : 'Tidak ada tagihan belum lunas saat ini.'}
                        </td>
                      </tr>
                    ) : (
                      filteredBills.filter((b) => b.status !== 'paid').map((bill) => {
                        const sisa = Math.max(0, parseFloat(bill.amount || 0) - parseFloat(bill.paid_amount || 0));
                        return (
                          <tr key={bill.id} className="hover:bg-slate-50/80 transition">
                            <td className="p-4">
                              <div className="font-bold text-slate-800">{bill.registrant_name_snapshot}</div>
                              <div className="text-[10px] text-slate-400 font-mono">Reg: {bill.registration_number_snapshot || '-'}</div>
                            </td>
                            <td className="p-4 font-semibold text-slate-700">{bill.fee_type_name || 'Uang Pangkal PPDB'}</td>
                            <td className="p-4 text-right font-mono font-bold text-slate-800">{formatCurrency(bill.amount)}</td>
                            <td className="p-4 text-right font-mono font-bold text-emerald-700">{formatCurrency(bill.paid_amount || 0)}</td>
                            <td className="p-4 text-right font-mono font-bold text-rose-600">{formatCurrency(sisa)}</td>
                            <td className="p-4 text-center">
                              <button
                                type="button"
                                onClick={() => handleOpenPayModal(bill)}
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 mx-auto shadow-2xs transition"
                              >
                                <Wallet className="w-3.5 h-3.5" />
                                <span>Catat Kas Masuk</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {paymentsSubTab === 'proofs' && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-8 text-center text-slate-400 text-xs">
              Antrean verifikasi bukti transfer calon wali santri (FIFO) dari portal publik.
            </div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 4: PENGELUARAN PROGRAM PPDB */}
      {/* ============================================================ */}
      {activeMainTab === 'expenses' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shadow-2xs">
            <div>
              <h4 className="text-xs font-bold text-slate-800 flex items-center gap-2">
                <TrendingDown className="w-4 h-4 text-rose-600" />
                <span>Pengeluaran Program PPDB (Realisasi Anggaran TA {currentTargetAy.name})</span>
              </h4>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Pengeluaran kas berjalan untuk pelaksanaan program promosi, tes seleksi, cetak modul, dan operasional PPDB TA Sasaran.
              </p>
            </div>

            <button
              type="button"
              onClick={handleOpenCreateExpense}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition shadow-2xs"
            >
              <Plus className="w-4 h-4" />
              <span>+ Catat Pengeluaran PPDB</span>
            </button>
          </div>

          {/* Expenses Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-4">Tanggal Pengeluaran</th>
                    <th className="p-4">Uraian / Keterangan</th>
                    <th className="p-4">Akun Kas / Bank</th>
                    <th className="p-4 text-right">Nominal Pengeluaran</th>
                    <th className="p-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loadingExpenses ? (
                    <tr>
                      <td colSpan="5" className="p-16 text-center text-slate-400">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-600" />
                        <span>Memuat daftar pengeluaran PPDB...</span>
                      </td>
                    </tr>
                  ) : expensesData.expenses?.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="p-16 text-center text-slate-400">
                        Belum ada pengeluaran program PPDB yang dicatat untuk TA {currentTargetAy.name}.
                      </td>
                    </tr>
                  ) : (
                    expensesData.expenses?.map((ex) => (
                      <tr key={ex.id} className="hover:bg-slate-50/80 transition">
                        <td className="p-4 font-mono text-slate-600">
                          {ex.expense_date ? String(ex.expense_date).slice(0, 10) : '-'}
                        </td>
                        <td className="p-4">
                          <div className="font-bold text-slate-800">{ex.notes}</div>
                          <div className="text-[10px] text-slate-400">Pos Alokasi: Program PPDB TA {currentTargetAy.name}</div>
                        </td>
                        <td className="p-4 text-slate-700 font-medium">
                          {ex.cash_account_name || 'Kas Utama'}
                        </td>
                        <td className="p-4 text-right font-mono font-bold text-rose-600 text-sm">
                          {formatCurrency(ex.amount)}
                        </td>
                        <td className="p-4 text-center">
                          <button
                            type="button"
                            onClick={() => handleDeleteExpense(ex.id)}
                            className="px-2.5 py-1 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg transition"
                          >
                            Batalkan
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 5: KARTU BAYAR PPDB (GABUNGAN & INDIVIDUAL) */}
      {/* ============================================================ */}
      {activeMainTab === 'ledger' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          {/* Sub-tab Switcher */}
          <div className="flex items-center justify-between bg-white p-2 rounded-2xl border border-slate-200 shadow-2xs">
            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setLedgerSubTab('recap')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition ${
                  ledgerSubTab === 'recap'
                    ? 'bg-white text-indigo-600 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Kartu Bayar Gabungan (Rekap PPDB)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setLedgerSubTab('individual');
                  if (!selectedCandidateIdForLedger && ledgerRecapData.candidates?.length > 0) {
                    const firstId = ledgerRecapData.candidates[0].student_id || ledgerRecapData.candidates[0].candidate_id;
                    setSelectedCandidateIdForLedger(firstId);
                    fetchIndividualLedger(firstId);
                  }
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition ${
                  ledgerSubTab === 'individual'
                    ? 'bg-white text-indigo-600 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Kartu Bayar Individual (Buku Pembantu)</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              {ledgerSubTab === 'recap' && (
                <button
                  type="button"
                  onClick={() => {
                    if (!ledgerRecapData.candidates || ledgerRecapData.candidates.length === 0) {
                      alert('Tidak ada data rekap kartu bayar PPDB untuk diekspor');
                      return;
                    }
                    const exportRows = ledgerRecapData.candidates.map((c, idx) => ({
                      'No': idx + 1,
                      'No Registrasi': c.registration_number,
                      'Nama Calon Santri': c.full_name,
                      'Jalur Masuk': c.process_name,
                      'Jenis Kelamin': c.gender,
                      'No Telepon': c.phone,
                      'Skema Biaya': c.scheme_name,
                      'Total Kewajiban (Rp)': c.total_billed,
                      'Diskon/Beasiswa (Rp)': c.total_discount,
                      'Total Terbayar (Rp)': c.total_paid,
                      'Sisa Piutang (Rp)': c.remaining_amount,
                      'Status Pelunasan': c.payment_status_label
                    }));
                    const ws = XLSX.utils.json_to_sheet(exportRows);
                    const wb = XLSX.utils.book_new();
                    XLSX.utils.book_append_sheet(wb, ws, 'Rekap_Kartu_Bayar_PPDB');
                    XLSX.writeFile(wb, `Rekap_Kartu_Bayar_PPDB_TA_${currentTargetAy.name.replace('/', '_')}.xlsx`);
                  }}
                  className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl text-xs font-bold transition border border-emerald-200"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Ekspor Excel</span>
                </button>
              )}

              {ledgerSubTab === 'individual' && (
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold transition border border-indigo-200"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Cetak Kartu Pembayaran</span>
                </button>
              )}
            </div>
          </div>

          {/* SUB-TAB 1: REKAP GABUNGAN */}
          {ledgerSubTab === 'recap' && (
            <div className="space-y-4">
              {/* Rekap KPI Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
                  <div className="text-[11px] font-semibold text-slate-500">Total Calon Santri</div>
                  <div className="text-xl font-black text-slate-800 mt-1">
                    {ledgerRecapData.summary?.total_candidates || 0} <span className="text-xs font-normal text-slate-400">Santri</span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1">
                    Lunas: {ledgerRecapData.summary?.count_paid || 0} • Cicilan: {ledgerRecapData.summary?.count_partial || 0}
                  </div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
                  <div className="text-[11px] font-semibold text-slate-500">Total Tagihan PPDB</div>
                  <div className="text-xl font-black text-slate-800 mt-1">
                    {formatCurrency(ledgerRecapData.summary?.total_billed || 0)}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1">Kewajiban Biaya Masuk</div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
                  <div className="text-[11px] font-semibold text-emerald-600">Total Kas Terbayar</div>
                  <div className="text-xl font-black text-emerald-600 mt-1">
                    {formatCurrency(ledgerRecapData.summary?.total_paid || 0)}
                  </div>
                  <div className="text-[10px] text-emerald-700/70 mt-1">Kas Masuk Penerimaan</div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
                  <div className="text-[11px] font-semibold text-rose-600">Sisa Piutang PPDB</div>
                  <div className="text-xl font-black text-rose-600 mt-1">
                    {formatCurrency(ledgerRecapData.summary?.total_remaining || 0)}
                  </div>
                  <div className="text-[10px] text-rose-700/70 mt-1">Belum Terlunasi</div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs col-span-2 sm:col-span-1">
                  <div className="text-[11px] font-semibold text-indigo-600">Rasio Pelunasan</div>
                  <div className="text-xl font-black text-indigo-600 mt-1">
                    {ledgerRecapData.summary?.collection_rate_percent || 0}%
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2 overflow-hidden">
                    <div
                      className="bg-indigo-600 h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, ledgerRecapData.summary?.collection_rate_percent || 0)}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Filter and Search Bar */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shadow-2xs">
                <div className="flex items-center gap-2">
                  <div className="relative flex-1 sm:w-72">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Cari nama calon santri / no reg / telepon..."
                      value={ledgerRecapSearch}
                      onChange={(e) => setLedgerRecapSearch(e.target.value)}
                      className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500"
                    />
                    {ledgerRecapSearch && (
                      <button
                        type="button"
                        onClick={() => setLedgerRecapSearch('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-md"
                        title="Hapus pencarian"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <select
                    value={ledgerRecapStatusFilter}
                    onChange={(e) => setLedgerRecapStatusFilter(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700"
                  >
                    <option value="all">Semua Status Bayar</option>
                    <option value="paid">Lunas</option>
                    <option value="partial">Sebagian / Cicilan</option>
                    <option value="unpaid">Belum Bayar</option>
                    <option value="no_bills">Belum Ada Tagihan</option>
                  </select>
                </div>

                <button
                  type="button"
                  onClick={fetchLedgerRecap}
                  className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition self-end sm:self-auto"
                  title="Muat Ulang"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>

              {/* Rekap Table */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50/80 text-slate-600 font-bold border-b border-slate-200 select-none">
                      <tr>
                        <th className="p-4 w-12 text-center">No</th>
                        <th className="p-4">Calon Santri & No. Reg</th>
                        <th className="p-4">Jalur & Skema Biaya</th>
                        <th className="p-4 text-right">Total Kewajiban</th>
                        <th className="p-4 text-right">Kas Terbayar</th>
                        <th className="p-4 text-right">Sisa Piutang</th>
                        <th className="p-4 text-center">Status Pelunasan</th>
                        <th className="p-4 text-center">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {loadingLedgerRecap ? (
                        <tr>
                          <td colSpan="8" className="p-16 text-center text-slate-400">
                            <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-600" />
                            <span>Memuat rekapitulasi kartu bayar PPDB...</span>
                          </td>
                        </tr>
                      ) : filteredLedgerRecapCandidates.length === 0 ? (
                        <tr>
                          <td colSpan="8" className="p-16 text-center text-slate-400">
                            {ledgerRecapSearch || ledgerRecapStatusFilter !== 'all'
                              ? 'Tidak ada calon santri yang cocok dengan filter pencarian rekap.'
                              : `Belum ada data pendaftar pada Tahun Ajaran ${currentTargetAy.name}.`}
                          </td>
                        </tr>
                      ) : (
                        filteredLedgerRecapCandidates.map((cand, idx) => (
                          <tr key={cand.candidate_id} className="hover:bg-slate-50/80 transition">
                            <td className="p-4 text-center text-slate-400 font-mono">{idx + 1}</td>
                            <td className="p-4">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-bold text-slate-800">{cand.full_name}</span>
                                {isAllUnitsContext && (
                                  <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold border ${
                                    Number(cand.satuan_pendidikan_id) === 2
                                      ? 'bg-purple-50 text-purple-700 border-purple-200'
                                      : 'bg-blue-50 text-blue-700 border-blue-200'
                                  }`}>
                                    {Number(cand.satuan_pendidikan_id) === 2 ? 'SMA' : 'SMP'}
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-indigo-600 font-mono font-medium">
                                {cand.registration_number} • {cand.phone}
                              </div>
                            </td>
                            <td className="p-4">
                              <div className="font-medium text-slate-700">{cand.process_name}</div>
                              <div className="text-[10px] text-slate-400">{cand.scheme_name}</div>
                            </td>
                            <td className="p-4 text-right font-mono font-bold text-slate-800">
                              {formatCurrency(cand.total_billed)}
                            </td>
                            <td className="p-4 text-right font-mono font-bold text-emerald-600">
                              {formatCurrency(cand.total_paid)}
                            </td>
                            <td className="p-4 text-right font-mono font-bold text-rose-600">
                              {formatCurrency(cand.remaining_amount)}
                            </td>
                            <td className="p-4 text-center">
                              <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${cand.payment_status_badge}`}>
                                {cand.payment_status_label}
                              </span>
                            </td>
                            <td className="p-4 text-center">
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedCandidateIdForLedger(cand.student_id || cand.candidate_id);
                                  setLedgerSubTab('individual');
                                  fetchIndividualLedger(cand.student_id || cand.candidate_id);
                                }}
                                className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-lg transition inline-flex items-center gap-1 shadow-2xs"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>Buka Kartu</span>
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* SUB-TAB 2: KARTU BAYAR INDIVIDUAL */}
          {ledgerSubTab === 'individual' && (
            <div className="space-y-4">
              {/* Candidate Picker Bar */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                <div className="flex-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <div className="relative flex-1 max-w-xs">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Cari nama santri di opsi..."
                      value={candidateSearchQuery}
                      onChange={(e) => setCandidateSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500"
                    />
                    {candidateSearchQuery && (
                      <button
                        type="button"
                        onClick={() => setCandidateSearchQuery('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-md"
                        title="Hapus pencarian"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="flex-1">
                    <select
                      value={selectedCandidateIdForLedger}
                      onChange={(e) => {
                        setSelectedCandidateIdForLedger(e.target.value);
                        fetchIndividualLedger(e.target.value);
                      }}
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">-- Pilih Calon Santri ({filteredCandidatesForIndividualLedger.length}) --</option>
                      {filteredCandidatesForIndividualLedger.map((c) => (
                        <option key={c.candidate_id} value={c.student_id || c.candidate_id}>
                          {c.full_name} ({c.registration_number}) - {c.payment_status_label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => fetchIndividualLedger(selectedCandidateIdForLedger)}
                  disabled={!selectedCandidateIdForLedger}
                  className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition self-end md:self-center"
                  title="Muat Ulang Kartu"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>

              {/* Individual Ledger View Card */}
              {loadingIndividualLedger ? (
                <div className="bg-white p-16 rounded-2xl border border-slate-200 text-center text-slate-400">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-600" />
                  <span>Memuat buku pembantu kartu bayar santri...</span>
                </div>
              ) : !individualLedgerData ? (
                <div className="bg-white p-16 rounded-2xl border border-slate-200 text-center text-slate-400">
                  Silakan pilih calon santri pada dropdown di atas untuk menampilkan kartu pembayaran.
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Student Ledger Paper Container */}
                  <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
                    {/* Header Profile */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-slate-100 gap-4">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-black text-lg shadow-md shadow-indigo-600/20">
                          {individualLedgerData.candidate.full_name.charAt(0)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h2 className="text-base font-black text-slate-800">
                              {individualLedgerData.candidate.full_name}
                            </h2>
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                              {individualLedgerData.candidate.process_name}
                            </span>
                          </div>
                          <div className="text-xs text-slate-500 mt-0.5 space-x-2">
                            <span className="font-mono font-semibold text-indigo-600">
                              {individualLedgerData.candidate.registration_number}
                            </span>
                            <span>•</span>
                            <span>Telp/WA: {individualLedgerData.candidate.phone_number}</span>
                            <span>•</span>
                            <span>Tahun Masuk Sasaran: TA {currentTargetAy.name}</span>
                          </div>
                          <div className="text-[11px] text-slate-400 mt-1">
                            Skema Tarif: <span className="font-semibold text-slate-700">{individualLedgerData.candidate.assigned_scheme_name}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex md:flex-col items-center md:items-end justify-between gap-1">
                        <div className="text-[10px] text-slate-400 font-medium">Status Pelunasan Keseluruhan:</div>
                        <span className={`px-3 py-1 rounded-full text-xs font-black border ${
                          individualLedgerData.summary.overall_status === 'paid'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : individualLedgerData.summary.overall_status === 'partial'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}>
                          {individualLedgerData.summary.overall_status_label}
                        </span>
                      </div>
                    </div>

                    {/* Summary Metric Cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200">
                        <div className="text-[10px] text-slate-500 font-bold uppercase">Total Tagihan Bruto</div>
                        <div className="text-base font-black text-slate-800 mt-1 font-mono">
                          {formatCurrency(individualLedgerData.summary.total_billed)}
                        </div>
                      </div>
                      <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200">
                        <div className="text-[10px] text-slate-500 font-bold uppercase">Potongan / Beasiswa</div>
                        <div className="text-base font-black text-indigo-600 mt-1 font-mono">
                          {formatCurrency(individualLedgerData.summary.total_discount)}
                        </div>
                      </div>
                      <div className="p-4 bg-emerald-50/60 rounded-2xl border border-emerald-200">
                        <div className="text-[10px] text-emerald-700 font-bold uppercase">Total Kas Terbayar</div>
                        <div className="text-base font-black text-emerald-700 mt-1 font-mono">
                          {formatCurrency(individualLedgerData.summary.total_paid)}
                        </div>
                      </div>
                      <div className="p-4 bg-rose-50/60 rounded-2xl border border-rose-200">
                        <div className="text-[10px] text-rose-700 font-bold uppercase">Sisa Kewajiban Piutang</div>
                        <div className="text-base font-black text-rose-700 mt-1 font-mono">
                          {formatCurrency(individualLedgerData.summary.remaining_amount)}
                        </div>
                      </div>
                    </div>

                    {/* Section 1: Rincian Pos Tagihan PPDB */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                          <Receipt className="w-3.5 h-3.5 text-indigo-600" />
                          <span>1. Rincian Pos Tagihan Biaya Masuk</span>
                        </h3>
                        <span className="text-[11px] text-slate-400">{individualLedgerData.bills?.length || 0} Pos Tagihan</span>
                      </div>

                      <div className="rounded-2xl border border-slate-200 overflow-hidden">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                            <tr>
                              <th className="p-3">Pos Komponen Biaya</th>
                              <th className="p-3">Fase Penagihan</th>
                              <th className="p-3">Jatuh Tempo</th>
                              <th className="p-3 text-right">Nominal Tagihan</th>
                              <th className="p-3 text-right">Terbayar</th>
                              <th className="p-3 text-right">Sisa</th>
                              <th className="p-3 text-center">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 font-mono">
                            {individualLedgerData.bills?.length === 0 ? (
                              <tr>
                                <td colSpan="7" className="p-8 text-center text-slate-400 font-sans">
                                  Belum ada tagihan yang diterbitkan untuk calon santri ini.
                                </td>
                              </tr>
                            ) : (
                              individualLedgerData.bills?.map((b) => (
                                <tr key={b.id} className="hover:bg-slate-50/60">
                                  <td className="p-3 font-sans font-bold text-slate-800">
                                    {b.fee_type_name}
                                    {b.is_installment && (
                                      <span className="ml-2 px-1.5 py-0.5 rounded text-[9px] bg-amber-50 text-amber-700 border border-amber-200 font-mono font-semibold">
                                        Termin/Cicilan
                                      </span>
                                    )}
                                  </td>
                                  <td className="p-3 font-sans text-slate-500 capitalize">
                                    {b.billing_phase === 'registration_fee' ? 'Fase Pendaftaran' : 'Fase Masuk Santri'}
                                  </td>
                                  <td className="p-3 text-slate-500">
                                    {b.due_date ? String(b.due_date).slice(0, 10) : '-'}
                                  </td>
                                  <td className="p-3 text-right font-bold text-slate-800">
                                    {formatCurrency(b.amount)}
                                  </td>
                                  <td className="p-3 text-right font-bold text-emerald-600">
                                    {formatCurrency(b.paid_amount)}
                                  </td>
                                  <td className="p-3 text-right font-bold text-rose-600">
                                    {formatCurrency(b.remaining_amount)}
                                  </td>
                                  <td className="p-3 text-center font-sans">
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                      b.status === 'paid'
                                        ? 'bg-emerald-50 text-emerald-700'
                                        : b.status === 'partially_paid'
                                        ? 'bg-amber-50 text-amber-700'
                                        : 'bg-rose-50 text-rose-700'
                                    }`}>
                                      {b.status === 'paid' ? 'Lunas' : b.status === 'partially_paid' ? 'Sebagian' : 'Belum Bayar'}
                                    </span>
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Section 2: Riwayat Pembayaran / Kuitansi Kas Masuk */}
                    <div className="space-y-2 pt-2">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>2. Riwayat Pembayaran & Kuitansi Kas Masuk</span>
                        </h3>
                        <span className="text-[11px] text-slate-400">{individualLedgerData.payments?.length || 0} Transaksi</span>
                      </div>

                      <div className="rounded-2xl border border-slate-200 overflow-hidden">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                            <tr>
                              <th className="p-3">No. Kuitansi</th>
                              <th className="p-3">Tanggal Setor</th>
                              <th className="p-3">Alokasi Tagihan</th>
                              <th className="p-3">Akun Kas / Bank</th>
                              <th className="p-3">Metode</th>
                              <th className="p-3 text-right">Nominal Setor</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 font-mono">
                            {individualLedgerData.payments?.length === 0 ? (
                              <tr>
                                <td colSpan="6" className="p-8 text-center text-slate-400 font-sans">
                                  Belum ada transaksi pembayaran kas masuk yang tercatat.
                                </td>
                              </tr>
                            ) : (
                              individualLedgerData.payments?.map((p) => (
                                <tr key={p.id} className="hover:bg-slate-50/60">
                                  <td className="p-3 font-bold text-indigo-700">{p.receipt_number}</td>
                                  <td className="p-3 text-slate-500">
                                    {p.payment_date ? String(p.payment_date).slice(0, 10) : '-'}
                                  </td>
                                  <td className="p-3 font-sans font-medium text-slate-800">
                                    {p.fee_type_name || 'Pembayaran PPDB'}
                                  </td>
                                  <td className="p-3 font-sans text-slate-600">{p.cash_account_name}</td>
                                  <td className="p-3 font-sans uppercase text-slate-500 font-semibold text-[10px]">
                                    {p.payment_method}
                                  </td>
                                  <td className="p-3 text-right font-bold text-emerald-600">
                                    {formatCurrency(p.amount_paid)}
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
      {/* ============================================================ */}
      {/* MODAL 1: SINGLE ASSIGN (PER ORANGAN) */}
      {/* ============================================================ */}
      {singleAssignModalOpen && targetCandidate && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg shadow-xl">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2 flex-wrap">
                <UserCheck className="w-4 h-4 text-emerald-600" />
                <h2 className="text-sm font-bold text-slate-800">
                  Penetapan Biaya Per Orangan: {targetCandidate.student_name || targetCandidate.full_name}
                </h2>
                <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-md">
                  {currentTargetAy ? `T.A. ${currentTargetAy.name}` : ''}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSingleAssignModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveSingleAssign} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Pilih Skema Biaya Pendidikan *</label>
                <select
                  required
                  value={selectedSchemeId}
                  onChange={(e) => setSelectedSchemeId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800"
                >
                  <option value="">-- Pilih Skema Biaya --</option>
                  {(assignmentsData.schemes || []).map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.code}) - Total: {formatRupiah(s.total_amount)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Preview Rincian Skema yang Dipilih */}
              {(() => {
                const selObj = (assignmentsData.schemes || []).find((s) => String(s.id) === String(selectedSchemeId));
                if (!selObj || !selObj.items) return null;
                return (
                  <div className="bg-slate-50/70 border border-slate-200 rounded-xl p-3.5 space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-800 pb-2 border-b border-slate-200">
                      <span>Rincian Nominal Skema</span>
                      <span className="text-emerald-700">Total: {formatRupiah(selObj.total_amount)}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      {selObj.items.map((it) => (
                        <div key={it.id || it.fee_type_id} className="flex justify-between py-0.5 text-slate-600 border-b border-slate-100">
                          <span className="truncate max-w-[120px]">{it.fee_type_name}:</span>
                          <span className="font-mono font-semibold text-slate-800">{formatRupiah(it.value || it.amount)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Alasan Penetapan / Perubahan *
                </label>
                <textarea
                  required
                  rows="2"
                  value={assignReason}
                  onChange={(e) => setAssignReason(e.target.value)}
                  placeholder="Wajib jelaskan alasan penetapan atau penggantian skema calon santri untuk audit trail..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSingleAssignModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submittingAssign}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition disabled:opacity-50"
                >
                  {submittingAssign && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Simpan Penetapan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 2: BULK ASSIGN (MASSAL) */}
      {/* ============================================================ */}
      {bulkAssignModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg shadow-xl">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2 flex-wrap">
                <Layers className="w-4 h-4 text-emerald-600" />
                <h2 className="text-sm font-bold text-slate-800">
                  Penetapan Biaya Massal ({selectedCandidateIds.length} Calon Santri Terpilih)
                </h2>
                <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-md">
                  {currentTargetAy ? `T.A. ${currentTargetAy.name}` : ''}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setBulkAssignModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveBulkAssign} className="p-6 space-y-4">
              <div className="p-3 bg-emerald-50/60 border border-emerald-200 rounded-xl text-xs text-emerald-800">
                Skema biaya yang dipilih akan diterapkan secara serentak ke seluruh <strong>{selectedCandidateIds.length}</strong> calon santri yang dicentang.
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Pilih Skema Biaya Pendidikan *</label>
                <select
                  required
                  value={bulkSchemeId}
                  onChange={(e) => setBulkSchemeId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800"
                >
                  <option value="">-- Pilih Skema Biaya --</option>
                  {(assignmentsData.schemes || []).map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.code}) - Total: {formatRupiah(s.total_amount)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Preview Rincian Skema Massal */}
              {(() => {
                const bObj = (assignmentsData.schemes || []).find((s) => String(s.id) === String(bulkSchemeId));
                if (!bObj || !bObj.items) return null;
                return (
                  <div className="bg-slate-50/70 border border-slate-200 rounded-xl p-3.5 space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-800 pb-2 border-b border-slate-200">
                      <span>Rincian Nominal per Santri</span>
                      <span className="text-emerald-700">Total: {formatRupiah(bObj.total_amount)}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      {bObj.items.map((it) => (
                        <div key={it.id || it.fee_type_id} className="flex justify-between py-0.5 text-slate-600 border-b border-slate-100">
                          <span className="truncate max-w-[120px]">{it.fee_type_name}:</span>
                          <span className="font-mono font-semibold text-slate-800">{formatRupiah(it.value || it.amount)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Alasan Penetapan Massal (Wajib Audit Trail) *
                </label>
                <textarea
                  required
                  rows="2"
                  value={bulkReason}
                  onChange={(e) => setBulkReason(e.target.value)}
                  placeholder="Contoh: Penetapan serentak Skema Reguler calon santri baru TA 2026/2027..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setBulkAssignModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submittingAssign}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition disabled:opacity-50"
                >
                  {submittingAssign && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Terapkan Massal ({selectedCandidateIds.length})
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 3: CUSTOM / MANUAL INPUT LANGSUNG NOMINAL ANGKA */}
      {/* ============================================================ */}
      {customModalOpen && customCandidate && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <div className="flex items-center gap-2 flex-wrap">
                <Sliders className="w-4 h-4 text-purple-600" />
                <h2 className="text-sm font-bold text-slate-800">
                  Penetapan Biaya Manual: {customCandidate.student_name || customCandidate.full_name}
                </h2>
                <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-md">
                  {currentTargetAy ? `T.A. ${currentTargetAy.name}` : ''}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setCustomModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCustomAdjustment} className="p-6 space-y-4">
              <div className="p-3.5 bg-purple-50/70 border border-purple-200 rounded-xl text-xs text-purple-900 flex items-start gap-2.5">
                <Info className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Input Langsung Nominal Angka Biaya:</p>
                  <p className="text-[11px] text-purple-700 mt-0.5">
                    Data nominal yang telah ditetapkan sebelumnya telah terisi otomatis di bawah. Anda dapat langsung mengedit nilai rupiah untuk masing-masing pos tagihan calon santri.
                  </p>
                </div>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3">Nama Pos Tagihan</th>
                      <th className="px-4 py-3 text-right w-56">Nominal Penetapan (Rp)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {customItems.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/60 transition">
                        <td className="px-4 py-2.5">
                          <div className="font-semibold text-slate-800">{item.fee_type_name}</div>
                          <div className="text-[10px] text-slate-400">ID Pos: #{item.fee_type_id}</div>
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          <div className="flex flex-col items-end gap-1">
                            <div className="flex items-center justify-end gap-1.5">
                              <span className="text-xs font-bold text-slate-400">Rp</span>
                              <input
                                type="number"
                                min="0"
                                step="1000"
                                value={item.override_amount}
                                onChange={(e) => handleCustomItemChange(idx, 'override_amount', e.target.value)}
                                placeholder="0"
                                className="w-40 px-3 py-1.5 bg-slate-50 focus:bg-white border border-slate-200 focus:border-purple-500 rounded-xl text-xs font-mono font-bold text-right text-slate-900 focus:ring-2 focus:ring-purple-200 outline-none transition"
                              />
                            </div>
                            <div className="text-[11px] font-mono font-bold text-purple-700 bg-purple-50/80 px-2 py-0.5 rounded border border-purple-200/60 shadow-2xs">
                              {Number(item.override_amount || 0).toLocaleString('id-ID')}
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-purple-50/60 border-t-2 border-purple-200 font-bold text-slate-900">
                    <tr>
                      <td className="px-4 py-3 text-purple-950 font-bold">
                        Total Akumulasi Biaya Calon Santri:
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-purple-950 text-sm font-extrabold">
                        {formatRupiah(
                          customItems.reduce((sum, it) => {
                            return sum + Number(it.override_amount || 0);
                          }, 0)
                        )}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Alasan Penetapan / Perubahan Manual (Wajib Audit Trail) *
                </label>
                <textarea
                  required
                  rows="2"
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  placeholder="Contoh: Penetapan nominal khusus calon santri jalur beasiswa / penyesuaian biaya mandiri..."
                  className="w-full px-3.5 py-2.5 bg-purple-50/20 border border-purple-200 rounded-xl text-xs focus:ring-2 focus:ring-purple-300 outline-none"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setCustomModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submittingCustom}
                  className="inline-flex items-center gap-1.5 px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-semibold transition disabled:opacity-50 shadow-sm"
                >
                  {submittingCustom && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Simpan Penetapan Manual
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 4: HISTORY AUDIT LOGS */}
      {/* ============================================================ */}
      {historyModalOpen && historyCandidate && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-xl max-h-[85vh] overflow-y-auto shadow-xl">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-indigo-600" />
                <h2 className="text-sm font-bold text-slate-800">
                  Riwayat Penetapan: {historyCandidate.student_name || historyCandidate.full_name}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setHistoryModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6">
              {historyLoading ? (
                <div className="py-12 text-center text-slate-400 flex flex-col items-center gap-2">
                  <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
                  <span className="text-xs">Memuat log penetapan...</span>
                </div>
              ) : historyLogs.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-8">Belum ada catatan riwayat perubahan penetapan.</p>
              ) : (
                <div className="space-y-4 relative before:absolute before:inset-0 before:left-3.5 before:w-0.5 before:bg-slate-200">
                  {historyLogs.map((log) => (
                    <div key={log.id} className="relative flex items-start gap-4 pl-8">
                      <div className="absolute left-2 top-1.5 w-3.5 h-3.5 bg-indigo-600 rounded-full border-2 border-white -translate-x-1/2" />
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 w-full text-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-indigo-700 uppercase font-mono text-[10px]">
                            {log.action}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {new Date(log.occurred_at || log.created_at).toLocaleString('id-ID')}
                          </span>
                        </div>
                        {log.data_after?.reason && (
                          <p className="text-slate-700 bg-white p-2 rounded border border-slate-100 mt-1">
                            <span className="font-semibold text-slate-500">Alasan: </span>
                            {log.data_after.reason}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 4: PAY BILL (KASIR PPDB) */}
      {/* ============================================================ */}
      {payModalOpen && selectedBillForPay && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5 text-emerald-700">
                  <Wallet className="w-4 h-4" />
                  <span>Kasir Pembayaran PPDB</span>
                </h3>
                <p className="text-[11px] text-slate-400">Tagihan #{selectedBillForPay.id}</p>
              </div>
              <button onClick={() => setPayModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleExecutePayment} className="space-y-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <div className="font-bold text-slate-800">{selectedBillForPay.registrant_name_snapshot}</div>
                <div className="text-[11px] text-slate-500">Komponen: {selectedBillForPay.fee_type_name || 'Uang Pangkal'}</div>
                <div className="text-sm font-mono font-bold text-indigo-700 mt-1">
                  Tagihan: {formatCurrency(selectedBillForPay.amount)}
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-600 mb-1">Tanggal Pembayaran *</label>
                <input
                  type="date"
                  value={payForm.payment_date}
                  onChange={(e) => setPayForm({ ...payForm, payment_date: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-600 mb-1">Akun Kas / Bank Penampung *</label>
                <select
                  value={payForm.cash_account_id}
                  onChange={(e) => setPayForm({ ...payForm, cash_account_id: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold"
                  required
                >
                  <option value="">-- Pilih Akun Kas/Bank --</option>
                  {cashAccounts.map((ca) => (
                    <option key={ca.id} value={ca.id}>
                      {ca.name} ({ca.account_number || ca.type})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-600 mb-1">Nominal yang Dibayarkan (Rp) *</label>
                <input
                  type="number"
                  value={payForm.amount_paid}
                  onChange={(e) => setPayForm({ ...payForm, amount_paid: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-sm text-emerald-700"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-600 mb-1">Metode Pembayaran</label>
                <select
                  value={payForm.payment_method}
                  onChange={(e) => setPayForm({ ...payForm, payment_method: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                >
                  <option value="transfer">Transfer Bank</option>
                  <option value="cash">Tunai (Cash di Loket)</option>
                  <option value="va">Virtual Account</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-600 mb-1">Catatan Transaksi:</label>
                <input
                  type="text"
                  value={payForm.notes}
                  onChange={(e) => setPayForm({ ...payForm, notes: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  placeholder="Contoh: Cicilan Termin 1 Uang Pangkal"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setPayModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submittingPay}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl flex items-center gap-1.5 shadow-2xs"
                >
                  {submittingPay && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Simpan Pembayaran & Kuitansi</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 5: CREATE EXPENSE PPDB */}
      {/* ============================================================ */}
      {createExpenseModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5 text-rose-600">
                  <TrendingDown className="w-4 h-4" />
                  <span>Catat Pengeluaran Program PPDB</span>
                </h3>
                <p className="text-[11px] text-slate-400">Realisasi Anggaran TA {currentTargetAy.name}</p>
              </div>
              <button onClick={() => setCreateExpenseModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveExpense} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-600 mb-1">Tanggal Pengeluaran *</label>
                <input
                  type="date"
                  value={expenseForm.expense_date}
                  onChange={(e) => setExpenseForm({ ...expenseForm, expense_date: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-600 mb-1">Kategori / Pos Program PPDB</label>
                <select
                  value={expenseForm.category_name}
                  onChange={(e) => setExpenseForm({ ...expenseForm, category_name: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold"
                >
                  <option value="Promosi & Iklan PPDB">Promosi, Iklan Digital & Spanduk PPDB</option>
                  <option value="Cetak Formulir & Brosur">Cetak Brosur, Formulir & Map PSB</option>
                  <option value="Konsumsi & Pelaksanaan Tes">Konsumsi & Pelaksanaan Tes Masuk</option>
                  <option value="Pengadaan Seragam Awal">Pengadaan Seragam Awal Calon Santri</option>
                  <option value="Honorarium Tim Penguji">Honorarium Tim Penguji & Panitia PPDB</option>
                  <option value="Operasional Lainnya">Operasional Lainnya</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-600 mb-1">Akun Kas / Bank Pengeluaran *</label>
                <select
                  value={expenseForm.cash_account_id}
                  onChange={(e) => setExpenseForm({ ...expenseForm, cash_account_id: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold"
                  required
                >
                  <option value="">-- Pilih Akun Kas/Bank --</option>
                  {cashAccounts.map((ca) => (
                    <option key={ca.id} value={ca.id}>
                      {ca.name} ({ca.account_number || ca.type})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-600 mb-1">Nominal Pengeluaran (Rp) *</label>
                <input
                  type="number"
                  value={expenseForm.amount || ''}
                  onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-sm text-rose-600"
                  placeholder="0"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-600 mb-1">Keterangan Pengeluaran:</label>
                <textarea
                  rows="2"
                  value={expenseForm.notes}
                  onChange={(e) => setExpenseForm({ ...expenseForm, notes: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  placeholder="Contoh: Pembayaran cetak 1000 eks brosur dan spanduk PPDB"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCreateExpenseModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submittingExpense}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl flex items-center gap-1.5 shadow-2xs"
                >
                  {submittingExpense && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Simpan Pengeluaran</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: CELL EDIT / PUBLISH MODAL (MATRIKS) */}
      {/* ============================================================ */}
      {cellModalOpen && selectedCellInfo && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
            {/* Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-bold shadow-md shadow-indigo-600/20">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-800">
                      {selectedCellInfo.cell.fee_type_name || 'Tagihan Biaya PPDB'}
                    </h3>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
                      PPDB TA {currentTargetAy.name}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    {selectedCellInfo.row.full_name} ({selectedCellInfo.row.registration_number || selectedCellInfo.row.nis || '-'})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCellModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body Form */}
            <form onSubmit={handleSavePublishCell} className="p-5 overflow-y-auto space-y-4 text-xs flex-1">
              {/* Status Banner */}
              <div className="p-3.5 bg-indigo-50/60 border border-indigo-100 rounded-2xl space-y-1.5">
                <div className="flex justify-between items-center text-slate-700">
                  <span className="font-medium">Status Tagihan:</span>
                  <span className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] ${
                    selectedCellInfo.cell.is_paid ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' :
                    selectedCellInfo.cell.is_partially_paid ? 'bg-teal-100 text-teal-800 border border-teal-300' :
                    selectedCellInfo.cell.is_published ? 'bg-blue-100 text-blue-800 border border-blue-300' :
                    'bg-slate-200 text-slate-700'
                  }`}>
                    {selectedCellInfo.cell.is_paid ? 'LUNAS' : selectedCellInfo.cell.is_partially_paid ? 'BAYAR SEBAGIAN' : selectedCellInfo.cell.is_published ? 'TERBIT (BELUM BAYAR)' : 'DRAF / ACUAN PENETAPAN'}
                  </span>
                </div>
                {selectedCellInfo.cell.paid_amount > 0 && (
                  <div className="flex justify-between items-center text-slate-700">
                    <span>Sudah Terbayar:</span>
                    <span className="font-mono font-bold text-emerald-700">{formatCurrency(selectedCellInfo.cell.paid_amount)}</span>
                  </div>
                )}
              </div>

              {/* Nominal Tagihan */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nominal Tagihan Kotor (Rp) *</label>
                <input
                  type="number"
                  min="0"
                  step="1000"
                  value={cellFormData.amount}
                  onChange={(e) => setCellFormData({ ...cellFormData, amount: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500 transition"
                  placeholder="0"
                  required
                />
              </div>

              {/* Tanggal Penagihan & Jatuh Tempo */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tanggal Tagihan (DD/MM/YYYY) *</label>
                  <DatePickerField
                    value={cellFormData.bill_date}
                    onChange={(val) => setCellFormData({ ...cellFormData, bill_date: val })}
                    placeholder="DD/MM/YYYY"
                    className="w-full"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tanggal Jatuh Tempo (DD/MM/YYYY)</label>
                  <DatePickerField
                    value={cellFormData.due_date}
                    onChange={(val) => setCellFormData({ ...cellFormData, due_date: val })}
                    placeholder="DD/MM/YYYY"
                    className="w-full"
                  />
                </div>
              </div>

              {/* Pilihan Diskon / Keringanan Khusus */}
              <div className="p-3.5 rounded-2xl border border-amber-200/80 bg-amber-50/40 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={cellFormData.has_discount}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setCellFormData({
                          ...cellFormData,
                          has_discount: checked
                        });
                      }}
                      className="w-4 h-4 text-amber-600 rounded focus:ring-amber-500"
                    />
                    <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                      <Percent className="w-3.5 h-3.5 text-amber-700" /> Terapkan Diskon / Keringanan
                    </span>
                  </label>

                  {cellFormData.has_discount && (
                    <div className="flex items-center bg-white border border-amber-200 rounded-lg p-0.5 text-[11px] font-semibold">
                      <button
                        type="button"
                        onClick={() => setCellFormData({ ...cellFormData, discount_type: 'amount' })}
                        className={`px-2 py-0.5 rounded-md transition ${cellFormData.discount_type === 'amount' ? 'bg-amber-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
                      >
                        Nominal (Rp)
                      </button>
                      <button
                        type="button"
                        onClick={() => setCellFormData({ ...cellFormData, discount_type: 'percentage' })}
                        className={`px-2 py-0.5 rounded-md transition ${cellFormData.discount_type === 'percentage' ? 'bg-amber-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
                      >
                        Persentase (%)
                      </button>
                    </div>
                  )}
                </div>

                {cellFormData.has_discount && (
                  <div className="space-y-3 pt-1 border-t border-amber-100 animate-in fade-in">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        {cellFormData.discount_type === 'percentage' ? (
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-700 mb-1">Persentase Diskon (%)</label>
                            <div className="relative">
                              <input
                                type="number"
                                min="0"
                                max="100"
                                step="0.5"
                                value={cellFormData.discount_percent}
                                onChange={(e) => {
                                  const p = parseFloat(e.target.value || 0);
                                  const base = parseFloat(cellFormData.amount || 0);
                                  const calcAmount = Math.round((p / 100) * base);
                                  setCellFormData({
                                    ...cellFormData,
                                    discount_percent: e.target.value,
                                    discount_amount: calcAmount
                                  });
                                }}
                                className="w-full pl-3 pr-8 py-1.5 bg-white border border-amber-300 rounded-lg font-bold text-xs"
                                placeholder="Contoh: 10"
                              />
                              <span className="absolute right-2.5 top-1.5 font-bold text-slate-400 text-xs">%</span>
                            </div>
                          </div>
                        ) : (
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-700 mb-1">Nominal Diskon (Rp)</label>
                            <input
                              type="number"
                              min="0"
                              value={cellFormData.discount_amount}
                              onChange={(e) => setCellFormData({ ...cellFormData, discount_amount: e.target.value })}
                              className="w-full px-3 py-1.5 bg-white border border-amber-300 rounded-lg font-bold font-mono text-xs"
                              placeholder="0"
                            />
                          </div>
                        )}
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">Alasan Diskon / Potongan</label>
                        <input
                          type="text"
                          placeholder="Contoh: Keringanan Khusus / Beasiswa"
                          value={cellFormData.discount_reason}
                          onChange={(e) => setCellFormData({ ...cellFormData, discount_reason: e.target.value })}
                          className="w-full px-3 py-1.5 bg-white border border-amber-300 rounded-lg text-xs"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Catatan Tagihan */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Catatan Tagihan</label>
                <input
                  type="text"
                  placeholder="Catatan tagihan calon santri..."
                  value={cellFormData.notes}
                  onChange={(e) => setCellFormData({ ...cellFormData, notes: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500 transition"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                {selectedCellInfo.cell.is_published && !selectedCellInfo.cell.is_paid && (
                  <button
                    type="button"
                    onClick={handleOpenCancelModal}
                    className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl font-semibold text-xs transition"
                  >
                    Batalkan Tagihan
                  </button>
                )}

                <div className="flex items-center gap-2 ml-auto">
                  <button
                    type="button"
                    onClick={() => setCellModalOpen(false)}
                    className="px-4 py-2 border border-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-100 transition"
                  >
                    Tutup
                  </button>
                  <button
                    type="submit"
                    disabled={submittingCell}
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-md shadow-indigo-600/20 transition flex items-center gap-2 disabled:opacity-50"
                  >
                    {submittingCell ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    <span>Simpan &amp; Terbitkan</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: BATALKAN TAGIHAN SEL */}
      {/* ============================================================ */}
      {cancelModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-800 text-sm text-rose-600 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4" />
                <span>Konfirmasi Pembatalan Tagihan</span>
              </h3>
              <button onClick={() => setCancelModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleExecuteCancelCell} className="space-y-3 text-xs">
              <p className="text-slate-600 leading-relaxed">
                Pembatalan tagihan akan menghapus piutang calon santri ini dan mencatat jurnal pembalik pada pembukuan akuntansi.
              </p>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Tanggal Pembatalan *</label>
                <DatePickerField
                  value={cancelFormData.cancel_date}
                  onChange={(val) => setCancelFormData({ ...cancelFormData, cancel_date: val })}
                  className="w-full"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Alasan Pembatalan (Wajib Audit Trail) *</label>
                <textarea
                  rows="3"
                  required
                  value={cancelFormData.cancel_reason}
                  onChange={(e) => setCancelFormData({ ...cancelFormData, cancel_reason: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  placeholder="Contoh: Kesalahan penetapan / Calon santri mengundurkan diri..."
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCancelModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submittingCancel}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl flex items-center gap-1.5 shadow-md shadow-rose-600/20"
                >
                  {submittingCancel && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Eksekusi Batalkan Tagihan</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: PENERBITAN MASSAL KOLOM */}
      {/* ============================================================ */}
      {columnPublishModalOpen && targetColumnInfo && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
            {/* Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-indigo-50/80 to-purple-50/50 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-bold shadow-md shadow-indigo-500/20">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-800">Terbitkan Tagihan Massal</h3>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase ${targetColumnInfo.badge_color || 'bg-indigo-100 text-indigo-800 border-indigo-200'}`}>
                      {targetColumnInfo.badge_text || 'Kolom Tagihan'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    Komponen: <span className="font-bold text-slate-700">{targetColumnInfo.label}</span> • TA {currentTargetAy.name}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setColumnPublishModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 overflow-y-auto space-y-4 text-xs flex-1">
              {/* Info Target Santri */}
              <div className="p-3.5 bg-indigo-50/60 border border-indigo-200/80 rounded-2xl flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-semibold text-indigo-900 block">Sasaran Penerbitan Kolom:</span>
                  <span className="font-bold text-indigo-950 text-sm">
                    {selectedMatrixRowIds.size > 0
                      ? `${selectedMatrixRowIds.size} Calon Santri Terpilih`
                      : `Seluruh Calon Santri (${matrixData.rows?.length || 0} Santri)`}
                  </span>
                </div>
                <Users className="w-8 h-8 text-indigo-400" />
              </div>

              {/* Tanggal Penagihan & Jatuh Tempo */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tanggal Tagihan (DD/MM/YYYY) *</label>
                  <DatePickerField
                    value={columnPublishFormData.bill_date}
                    onChange={(val) => setColumnPublishFormData({ ...columnPublishFormData, bill_date: val })}
                    placeholder="DD/MM/YYYY"
                    className="w-full"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tanggal Jatuh Tempo (DD/MM/YYYY)</label>
                  <DatePickerField
                    value={columnPublishFormData.due_date}
                    onChange={(val) => setColumnPublishFormData({ ...columnPublishFormData, due_date: val })}
                    placeholder="DD/MM/YYYY"
                    className="w-full"
                  />
                </div>
              </div>

              {/* Diskon Massal Kolom */}
              <div className="p-3.5 rounded-2xl border border-amber-200/80 bg-amber-50/40 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={columnPublishFormData.has_discount}
                      onChange={(e) => setColumnPublishFormData({ ...columnPublishFormData, has_discount: e.target.checked })}
                      className="w-4 h-4 text-amber-600 rounded focus:ring-amber-500"
                    />
                    <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                      <Percent className="w-3.5 h-3.5 text-amber-700" /> Terapkan Diskon Serentak pada Kolom Ini
                    </span>
                  </label>

                  {columnPublishFormData.has_discount && (
                    <div className="flex items-center bg-white border border-amber-200 rounded-lg p-0.5 text-[11px] font-semibold">
                      <button
                        type="button"
                        onClick={() => setColumnPublishFormData({ ...columnPublishFormData, discount_type: 'amount' })}
                        className={`px-2 py-0.5 rounded-md transition ${columnPublishFormData.discount_type === 'amount' ? 'bg-amber-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
                      >
                        Nominal (Rp)
                      </button>
                      <button
                        type="button"
                        onClick={() => setColumnPublishFormData({ ...columnPublishFormData, discount_type: 'percentage' })}
                        className={`px-2 py-0.5 rounded-md transition ${columnPublishFormData.discount_type === 'percentage' ? 'bg-amber-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
                      >
                        Persentase (%)
                      </button>
                    </div>
                  )}
                </div>

                {columnPublishFormData.has_discount && (
                  <div className="space-y-3 pt-1 border-t border-amber-100 animate-in fade-in">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        {columnPublishFormData.discount_type === 'percentage' ? (
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-700 mb-1">Persentase Diskon (%)</label>
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={columnPublishFormData.discount_percent}
                              onChange={(e) => setColumnPublishFormData({ ...columnPublishFormData, discount_percent: e.target.value })}
                              className="w-full px-3 py-1.5 bg-white border border-amber-300 rounded-lg font-bold text-xs"
                              placeholder="10"
                            />
                          </div>
                        ) : (
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-700 mb-1">Nominal Diskon (Rp)</label>
                            <input
                              type="number"
                              min="0"
                              value={columnPublishFormData.discount_amount}
                              onChange={(e) => setColumnPublishFormData({ ...columnPublishFormData, discount_amount: e.target.value })}
                              className="w-full px-3 py-1.5 bg-white border border-amber-300 rounded-lg font-bold font-mono text-xs"
                              placeholder="0"
                            />
                          </div>
                        )}
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">Alasan Diskon Kolom</label>
                        <input
                          type="text"
                          placeholder="Promo PPDB / Keringanan Masuk"
                          value={columnPublishFormData.discount_reason}
                          onChange={(e) => setColumnPublishFormData({ ...columnPublishFormData, discount_reason: e.target.value })}
                          className="w-full px-3 py-1.5 bg-white border border-amber-300 rounded-lg text-xs"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Catatan */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Catatan Operasional Penerbitan</label>
                <input
                  type="text"
                  placeholder="Catatan penerbitan massal kolom..."
                  value={columnPublishFormData.notes}
                  onChange={(e) => setColumnPublishFormData({ ...columnPublishFormData, notes: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              {/* Footer Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setColumnPublishModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-100 transition"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleExecuteColumnPublish}
                  disabled={submittingColumnPublish}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-md shadow-indigo-600/20 transition flex items-center gap-2 disabled:opacity-50"
                >
                  {submittingColumnPublish ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                  <span>Eksekusi Penerbitan Kolom</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: IMPORT EXCEL KOLOM PPDB */}
      {/* ============================================================ */}
      {columnImportModalOpen && targetImportColumnInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-blue-50/70 via-slate-50 to-indigo-50/50 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-bold shadow-md shadow-blue-500/20">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-800">Import Data Tagihan PPDB (Excel)</h3>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase ${targetImportColumnInfo.badge_color || 'bg-blue-100 text-blue-800 border-blue-200'}`}>
                      {targetImportColumnInfo.badge_text || 'Kolom PPDB'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-medium">
                    Kolom Target: <span className="font-bold text-slate-700">{targetImportColumnInfo.label}</span> • TA Sasaran {currentTargetAy.name}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setColumnImportModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-4 text-xs flex-1">
              {/* Step 1: Download Format */}
              <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-200/80 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-bold text-[11px] flex items-center justify-center">1</span>
                      <h4 className="font-bold text-blue-950 text-xs">Identitas &amp; Unduh Format Excel</h4>
                    </div>
                    <p className="text-[11px] text-blue-900 leading-relaxed">
                      Satu berkas Excel berlaku <b>khusus untuk kolom ini pada Tahun Ajaran Sasaran terkait</b>. Baris 1-5 memuat identitas dokumen verifikasi otomatis.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDownloadColumnTemplate(targetImportColumnInfo)}
                    className="shrink-0 px-4 py-2.5 bg-white border border-blue-300 hover:border-blue-600 hover:bg-blue-50/70 text-blue-700 rounded-xl font-bold flex items-center justify-center gap-2 transition shadow-2xs hover:shadow-xs"
                  >
                    <Download className="w-4 h-4 text-blue-600" />
                    <span>Unduh Format Excel (Terisi Data)</span>
                  </button>
                </div>
              </div>

              {/* Step 2: Upload Excel */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-slate-700 text-white font-bold text-[11px] flex items-center justify-center">2</span>
                    <h4 className="font-bold text-slate-800 text-xs">Unggah Berkas Excel (.xlsx / .xls)</h4>
                  </div>
                  {importFileName && (
                    <button
                      type="button"
                      onClick={() => {
                        setImportParsedRows([]);
                        setImportFileValidation(null);
                        setImportFileName('');
                        if (importFileInputRef.current) importFileInputRef.current.value = '';
                      }}
                      className="text-[11px] text-rose-600 hover:text-rose-800 font-semibold underline"
                    >
                      Hapus &amp; Unggah Ulang
                    </button>
                  )}
                </div>

                <div
                  onClick={() => importFileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-300 hover:border-blue-500 bg-white rounded-2xl p-5 text-center cursor-pointer transition group"
                >
                  <input
                    type="file"
                    ref={importFileInputRef}
                    accept=".xlsx, .xls, .csv"
                    onChange={handleImportFileUpload}
                    className="hidden"
                  />
                  <div className="w-10 h-10 mx-auto rounded-xl bg-blue-50 text-blue-600 group-hover:scale-110 flex items-center justify-center mb-2 transition">
                    <UploadCloud className="w-5 h-5" />
                  </div>
                  {importFileName ? (
                    <div>
                      <p className="font-bold text-slate-800 text-xs">{importFileName}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">Klik di sini untuk mengganti berkas Excel</p>
                    </div>
                  ) : (
                    <div>
                      <p className="font-bold text-slate-700 text-xs">Pilih atau Seret Berkas Excel ke Sini</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">Mendukung format .xlsx dan .xls (Kolom No. Registrasi, Nama, Nominal, Tgl Tagihan, Jatuh Tempo, Catatan)</p>
                    </div>
                  )}
                </div>

                {importFileValidation && (
                  <div>
                    {importFileValidation.isValid ? (
                      <div className="p-3.5 bg-emerald-50 border border-emerald-300 rounded-2xl text-emerald-900 space-y-1">
                        <div className="flex items-center gap-2 font-bold text-xs text-emerald-800">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>Identitas Dokumen &amp; Format Terverifikasi Valid</span>
                        </div>
                        <p className="text-[11px] text-emerald-800">
                          Tahun Ajaran Sasaran: <b>{currentTargetAy.name}</b> • Kolom: <b>{targetImportColumnInfo.label}</b> • Terbaca: <b>{importFileValidation.totalRows} baris ({importFileValidation.validRows} siap diproses: {importFileValidation.newRows} baru, {importFileValidation.updatedRows} ditimpa)</b>
                        </p>
                      </div>
                    ) : (
                      <div className="p-3.5 bg-rose-50 border border-rose-300 rounded-2xl text-rose-900 space-y-1">
                        <div className="flex items-center gap-2 font-bold text-xs text-rose-800">
                          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                          <span>Peringatan Validasi Berkas</span>
                        </div>
                        <p className="text-[11px] text-rose-800 leading-relaxed">
                          {importFileValidation.errorMsg}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Step 3: Review Data Preview Table (Ketika Data Terbaca) */}
              {importParsedRows.length > 0 && (
                <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-indigo-600 text-white font-bold text-[11px] flex items-center justify-center">3</span>
                      <h4 className="font-bold text-slate-800 text-xs">Review Data Calon Santri yang Akan Diinput ({importParsedRows.length} Data)</h4>
                    </div>

                    {/* Filter Status & Search */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="flex items-center bg-slate-100 p-0.5 rounded-lg text-[11px] font-semibold">
                        <button
                          type="button"
                          onClick={() => setImportStatusFilter('all')}
                          className={`px-2 py-0.5 rounded-md transition ${importStatusFilter === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'}`}
                        >
                          Semua ({importParsedRows.length})
                        </button>
                        <button
                          type="button"
                          onClick={() => setImportStatusFilter('processable')}
                          className={`px-2 py-0.5 rounded-md transition ${importStatusFilter === 'processable' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600'}`}
                          title="Baru atau ada perubahan data yang akan ditimpa"
                        >
                          Baru/Ditimpa ({importParsedRows.filter((r) => r.change_status === 'new' || r.change_status === 'updated').length})
                        </button>
                        <button
                          type="button"
                          onClick={() => setImportStatusFilter('unchanged')}
                          className={`px-2 py-0.5 rounded-md transition ${importStatusFilter === 'unchanged' ? 'bg-slate-700 text-white shadow-xs' : 'text-slate-600'}`}
                          title="Data sama persis dengan yang ada di sistem (tidak diubah)"
                        >
                          Sama ({importParsedRows.filter((r) => r.change_status === 'unchanged').length})
                        </button>
                        <button
                          type="button"
                          onClick={() => setImportStatusFilter('zero')}
                          className={`px-2 py-0.5 rounded-md transition ${importStatusFilter === 'zero' ? 'bg-amber-600 text-white shadow-xs' : 'text-slate-600'}`}
                          title="Nominal 0 atau kosong (dilewati, tidak diinput)"
                        >
                          Nominal 0 ({importParsedRows.filter((r) => r.change_status === 'skipped_zero').length})
                        </button>
                        <button
                          type="button"
                          onClick={() => setImportStatusFilter('invalid')}
                          className={`px-2 py-0.5 rounded-md transition ${importStatusFilter === 'invalid' ? 'bg-rose-600 text-white shadow-xs' : 'text-slate-600'}`}
                          title="Calon santri tidak ditemukan"
                        >
                          Masalah ({importParsedRows.filter((r) => r.change_status === 'invalid').length})
                        </button>
                      </div>

                      <div className="relative">
                        <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-slate-400" />
                        <input
                          type="text"
                          placeholder="Cari santri/No. Reg..."
                          value={importSearchFilter}
                          onChange={(e) => setImportSearchFilter(e.target.value)}
                          className="pl-8 pr-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-[11px] w-36 focus:w-48 transition-all"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Summary Metric Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    <div className="p-2 rounded-xl bg-slate-50 border border-slate-200 text-center">
                      <p className="text-[10px] text-slate-500 font-medium">Total Baris</p>
                      <p className="text-sm font-bold text-slate-800">{importParsedRows.length}</p>
                    </div>
                    <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-200 text-center">
                      <p className="text-[10px] text-emerald-700 font-medium">Baru / Ditimpa</p>
                      <p className="text-sm font-bold text-emerald-800">
                        {importParsedRows.filter((r) => r.change_status === 'new' || r.change_status === 'updated').length}
                      </p>
                    </div>
                    <div className="p-2 rounded-xl bg-slate-100 border border-slate-300 text-center">
                      <p className="text-[10px] text-slate-600 font-medium">Sama (Tidak Diubah)</p>
                      <p className="text-sm font-bold text-slate-700">
                        {importParsedRows.filter((r) => r.change_status === 'unchanged').length}
                      </p>
                    </div>
                    <div className="p-2 rounded-xl bg-amber-50 border border-amber-200 text-center">
                      <p className="text-[10px] text-amber-700 font-medium">Nominal 0 (Dilewati)</p>
                      <p className="text-sm font-bold text-amber-800">
                        {importParsedRows.filter((r) => r.change_status === 'skipped_zero').length}
                      </p>
                    </div>
                    <div className="p-2 rounded-xl bg-blue-50 border border-blue-200 text-center col-span-2 sm:col-span-1">
                      <p className="text-[10px] text-blue-700 font-medium">Total Akumulasi</p>
                      <p className="text-xs font-bold font-mono text-blue-900 truncate">
                        Rp {importParsedRows.reduce((acc, r) => acc + (r.is_valid && r.amount > 0 ? parseFloat(r.amount || 0) : 0), 0).toLocaleString('id-ID')}
                      </p>
                    </div>
                  </div>

                  {/* Review Table */}
                  <div className="border border-slate-200 rounded-xl overflow-hidden max-h-[300px] overflow-y-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-100 text-slate-700 font-bold sticky top-0 z-10 border-b border-slate-200">
                        <tr>
                          <th className="p-2.5 text-center w-10">No</th>
                          <th className="p-2.5 w-32">Status Perubahan</th>
                          <th className="p-2.5 w-28">No. Registrasi</th>
                          <th className="p-2.5">Calon Santri</th>
                          <th className="p-2.5 w-24">Jalur</th>
                          <th className="p-2.5 text-right w-28">Nominal (Rp)</th>
                          <th className="p-2.5 text-center w-24">Tgl Tagihan</th>
                          <th className="p-2.5 text-center w-24">Jatuh Tempo</th>
                          <th className="p-2.5 max-w-[140px]">Catatan</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {importParsedRows
                          .filter((r) => {
                            if (importStatusFilter === 'processable' && r.change_status !== 'new' && r.change_status !== 'updated') return false;
                            if (importStatusFilter === 'unchanged' && r.change_status !== 'unchanged') return false;
                            if (importStatusFilter === 'zero' && r.change_status !== 'skipped_zero') return false;
                            if (importStatusFilter === 'invalid' && r.change_status !== 'invalid') return false;
                            if (importSearchFilter.trim()) {
                              const q = importSearchFilter.trim().toLowerCase();
                              const matchReg = String(r.registration_number || '').toLowerCase().includes(q);
                              const matchName = String(r.candidate_name || '').toLowerCase().includes(q);
                              const matchProcess = String(r.process_name || '').toLowerCase().includes(q);
                              if (!matchReg && !matchName && !matchProcess) return false;
                            }
                            return true;
                          })
                          .map((r, idx) => (
                            <tr
                              key={idx}
                              className={`hover:bg-slate-50 transition ${
                                r.change_status === 'invalid'
                                  ? 'bg-rose-50/50'
                                  : r.change_status === 'skipped_zero'
                                    ? 'bg-amber-50/30'
                                    : r.change_status === 'updated'
                                      ? 'bg-blue-50/30'
                                      : idx % 2 === 1
                                        ? 'bg-slate-50/30'
                                        : 'bg-white'
                              }`}
                            >
                              <td className="p-2 text-center text-slate-400 font-mono text-[11px]">{r.rowIdx || idx + 1}</td>
                              <td className="p-2">
                                {r.change_status === 'new' ? (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                    <Sparkles className="w-3 h-3 text-emerald-600" /> Data Baru
                                  </span>
                                ) : r.change_status === 'updated' ? (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800" title={r.diff_summary}>
                                    <Edit2 className="w-3 h-3 text-blue-600" /> Ditimpa
                                  </span>
                                ) : r.change_status === 'unchanged' ? (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600" title={r.diff_summary}>
                                    <Check className="w-3 h-3 text-slate-500" /> Tidak Diubah
                                  </span>
                                ) : r.change_status === 'skipped_zero' ? (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-100 text-amber-800" title="Nominal 0/kosong dilewati">
                                    <Info className="w-3 h-3 text-amber-600" /> Dilewati (0)
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800" title={r.validation_error}>
                                    <XCircle className="w-3 h-3 text-rose-600" /> Error
                                  </span>
                                )}
                              </td>
                              <td className="p-2 font-mono text-slate-600 text-[11px]">{r.registration_number || '-'}</td>
                              <td className="p-2 font-bold text-slate-800 truncate max-w-[200px]" title={r.candidate_name}>
                                {r.candidate_name}
                                {r.diff_summary && (
                                  <span className="block text-[10px] text-blue-600 font-normal truncate">{r.diff_summary}</span>
                                )}
                                {!r.is_valid && r.validation_error && (
                                  <span className="block text-[10px] text-rose-600 font-normal">{r.validation_error}</span>
                                )}
                              </td>
                              <td className="p-2 text-slate-600 text-[11px]">{r.process_name || '-'}</td>
                              <td className={`p-2 text-right font-mono font-bold text-[11px] ${r.amount <= 0 ? 'text-slate-400' : 'text-slate-900'}`}>
                                Rp {parseFloat(r.amount || 0).toLocaleString('id-ID')}
                              </td>
                              <td className="p-2 text-center font-mono text-[11px] text-slate-600">{r.bill_date ? formatDateToDMY(r.bill_date) : '-'}</td>
                              <td className="p-2 text-center font-mono text-[11px] text-slate-600">{r.due_date ? formatDateToDMY(r.due_date) : '-'}</td>
                              <td className="p-2 text-slate-500 text-[11px] max-w-[140px] truncate" title={r.notes}>{r.notes || '-'}</td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 px-5 border-t border-slate-100 shrink-0 bg-slate-50/90 flex flex-col sm:flex-row items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setColumnImportModalOpen(false)}
                className="w-full sm:w-auto px-4 py-2 border border-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-100 transition"
              >
                Batal
              </button>

              <div className="w-full sm:w-auto flex flex-col sm:flex-row items-center gap-2">
                <button
                  type="button"
                  onClick={handleExecuteImport}
                  disabled={
                    submittingImport ||
                    importParsedRows.length === 0 ||
                    !importFileValidation?.isValid ||
                    importParsedRows.filter((r) => r.is_valid && r.amount > 0 && (r.change_status === 'new' || r.change_status === 'updated')).length === 0
                  }
                  className="w-full sm:w-auto px-5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-bold shadow-md shadow-blue-600/20 transition flex items-center justify-center gap-2 disabled:opacity-40"
                >
                  {submittingImport ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileUp className="w-4 h-4 text-blue-100" />}
                  <span>
                    Eksekusi Import (
                    {importParsedRows.filter((r) => r.is_valid && r.amount > 0 && (r.change_status === 'new' || r.change_status === 'updated')).length} Data: {importParsedRows.filter((r) => r.change_status === 'new').length} Baru, {importParsedRows.filter((r) => r.change_status === 'updated').length} Ditimpa)
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: DETAIL TAGIHAN PPDB */}
      {/* ============================================================ */}
      {detailModalOpen && selectedBillDetail && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-bold shadow-md shadow-indigo-600/20">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">Detail Tagihan PPDB #{selectedBillDetail.id}</h3>
                  <p className="text-xs text-slate-500 font-medium">
                    {selectedBillDetail.registrant_name_snapshot} ({selectedBillDetail.registration_number_snapshot || '-'})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDetailModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 text-xs flex-1">
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">Komponen Biaya:</span>
                  <span className="font-bold text-slate-800">{selectedBillDetail.fee_type_name || 'Uang Pangkal PPDB'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Tahun Ajaran Sasaran:</span>
                  <span className="font-bold text-slate-800">T.A. {currentTargetAy.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Tanggal Tagihan:</span>
                  <span className="font-mono font-bold text-slate-800">{formatDateToDMY(selectedBillDetail.bill_date || selectedBillDetail.created_at)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Jatuh Tempo:</span>
                  <span className="font-mono font-bold text-rose-600">{formatDateToDMY(selectedBillDetail.due_date)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Status Tagihan:</span>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                    selectedBillDetail.status === 'paid' ? 'bg-emerald-100 text-emerald-800' :
                    selectedBillDetail.status === 'partially_paid' ? 'bg-teal-100 text-teal-800' :
                    selectedBillDetail.status === 'draft' ? 'bg-purple-100 text-purple-800' : 'bg-rose-100 text-rose-800'
                  }`}>
                    {selectedBillDetail.status?.toUpperCase()}
                  </span>
                </div>
              </div>

              <div className="p-3.5 bg-indigo-50/60 rounded-2xl border border-indigo-100 space-y-2">
                <div className="flex justify-between text-slate-700">
                  <span>Nominal Kotor:</span>
                  <span className="font-mono font-bold">{formatCurrency(selectedBillDetail.amount)}</span>
                </div>
                <div className="flex justify-between text-amber-700">
                  <span>Diskon / Potongan:</span>
                  <span className="font-mono font-bold">{selectedBillDetail.discount_amount > 0 ? `- ${formatCurrency(selectedBillDetail.discount_amount)}` : 'Rp 0'}</span>
                </div>
                <div className="flex justify-between text-slate-900 font-bold border-t border-indigo-200/60 pt-2 text-sm">
                  <span>Total Tagihan Bersih:</span>
                  <span className="font-mono text-indigo-700">
                    {formatCurrency(Math.max(0, (selectedBillDetail.amount || 0) - (selectedBillDetail.discount_amount || 0)))}
                  </span>
                </div>
                <div className="flex justify-between text-emerald-700 font-bold">
                  <span>Sudah Dibayar:</span>
                  <span className="font-mono">{formatCurrency(selectedBillDetail.paid_amount || 0)}</span>
                </div>
              </div>

              {selectedBillDetail.notes && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[11px] font-bold text-slate-500 block mb-0.5">Catatan:</span>
                  <p className="text-slate-700">{selectedBillDetail.notes}</p>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setDetailModalOpen(false)}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md shadow-indigo-600/20"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: REVISI TAGIHAN PPDB (AUDIT TRAIL) */}
      {/* ============================================================ */}
      {reviseModalOpen && revisingBill && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5 text-amber-600">
                <Edit2 className="w-4 h-4" />
                <span>Revisi Tagihan PPDB #{revisingBill.id}</span>
              </h3>
              <button onClick={() => setReviseModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveReviseBill} className="space-y-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <div className="font-bold text-slate-800">{revisingBill.registrant_name_snapshot}</div>
                <div className="text-[11px] text-slate-500">Komponen: {revisingBill.fee_type_name || 'Uang Pangkal'}</div>
                <div className="text-xs font-mono font-bold text-slate-700">Nominal Awal: {formatCurrency(revisingBill.amount)}</div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nominal Tagihan Baru (Rp) *</label>
                <input
                  type="number"
                  min="0"
                  value={reviseFormData.new_amount}
                  onChange={(e) => setReviseFormData({ ...reviseFormData, new_amount: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-amber-500"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Tanggal Jatuh Tempo Baru</label>
                <DatePickerField
                  value={reviseFormData.new_due_date}
                  onChange={(val) => setReviseFormData({ ...reviseFormData, new_due_date: val })}
                  className="w-full"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Alasan Revisi (Wajib Audit Trail) *</label>
                <textarea
                  rows="3"
                  required
                  value={reviseFormData.revision_reason}
                  onChange={(e) => setReviseFormData({ ...reviseFormData, revision_reason: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  placeholder="Contoh: Koreksi nominal tagihan berdasarkan SK keringanan yayasan..."
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setReviseModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submittingRevise}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl flex items-center gap-1.5 shadow-md shadow-amber-600/20"
                >
                  {submittingRevise && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Simpan Revisi Tagihan</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: BROADCAST PENGINGAT TAGIHAN PPDB */}
      {/* ============================================================ */}
      {broadcastModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Send className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-slate-800 text-sm">Broadcast Pengingat Tagihan PPDB</h3>
              </div>
              <button onClick={() => setBroadcastModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Target Calon Santri Penerima Pengingat</label>
                <select
                  value={broadcastFilterMode}
                  onChange={(e) => setBroadcastFilterMode(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-700"
                >
                  <option value="overdue">Tagihan Lewat Jatuh Tempo (Prioritas Utama)</option>
                  <option value="unpaid_all">Semua Calon Santri yang Belum Lunas</option>
                  <option value="selected">Tagihan Terpilih Saja ({broadcastSelectedBillIds.length})</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Template / Pesan Pengingat Tagihan</label>
                <textarea
                  rows="4"
                  value={broadcastCustomMessage}
                  onChange={(e) => setBroadcastCustomMessage(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs leading-relaxed"
                  placeholder="Isi pesan notifikasi WhatsApp / Portal Orang Tua..."
                />
              </div>

              <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl text-[11px] text-blue-900 flex items-center gap-2">
                <Info className="w-4 h-4 text-blue-600 shrink-0" />
                <span>Pesan akan dikirimkan ke nomor WhatsApp calon wali santri dan muncul sebagai notifikasi di Portal Orang Tua.</span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setBroadcastModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleExecuteBroadcast}
                  disabled={submittingBroadcast}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl flex items-center gap-1.5 shadow-md shadow-indigo-600/20 disabled:opacity-50"
                >
                  {submittingBroadcast ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  <span>Kirim Broadcast Sekarang</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
