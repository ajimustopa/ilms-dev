import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { useAuth } from '../../../shared/store/AuthContext';
import api from '../../../shared/services/api';
import SearchableSelect from '../../../shared/components/SearchableSelect';
import DatePickerField from '../../../shared/components/DatePickerField';
import StatusPill from '../../../shared/components/StatusPill';
import FlatAlertBanner from '../../../shared/components/FlatAlertBanner';
import { formatCurrency, formatNumber, formatPercentage } from '../../../shared/utils/formatters';
import {
  Receipt,
  Calendar,
  Building2,
  Filter,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  Bell,
  Loader2,
  Eye,
  X,
  Send,
  MessageSquare,
  History,
  RotateCw,
  Edit2,
  FileCheck,
  Tag,
  AlertCircle,
  CheckSquare,
  Square,
  ShieldCheck,
  Layers,
  Percent,
  FileText,
  Users,
  Check,
  Lock,
  Zap,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Download,
  Printer,
  Sparkles,
  ChevronRight,
  UserCheck,
  Info,
  CalendarDays,
  Smartphone,
  ExternalLink,
  BookOpen,
  Sliders,
  RefreshCw,
  FileSpreadsheet,
  UploadCloud,
  Upload,
  Save,
  FileUp,
  FileDown,
  HelpCircle,
  GraduationCap,
  CreditCard,
  Plus,
  Phone,
  Share2,
  Wallet,
  UserX
} from 'lucide-react';

export default function StudentBills() {
  const navigate = useNavigate();
  const { activeSchoolUnit } = useAuth();

  // ------------------------------------------------------------
  // 1. GLOBAL CONTEXT & TABS
  // ------------------------------------------------------------
  const [activeTab, setActiveTab] = useState('matrix'); // 'matrix' | 'alumni' | 'history' | 'reminders'
  const [academicYears, setAcademicYears] = useState([]);
  const [selectedAcademicYearId, setSelectedAcademicYearId] = useState(() => {
    try {
      return localStorage.getItem('keuangan_bills_selected_ay_id') ||
        localStorage.getItem('keuangan_payments_selected_ay') ||
        localStorage.getItem('keuangan_fee_schemes_selected_ay') ||
        '';
    } catch {
      return '';
    }
  });

  const [classGroups, setClassGroups] = useState([]);
  const [feeTypes, setFeeTypes] = useState([]);
  const [coasList, setCoasList] = useState([]);
  const [cashAccounts, setCashAccounts] = useState([]);
  const [transactionRules, setTransactionRules] = useState([]);

  // ------------------------------------------------------------
  // 2. TAB 1: MATRIX PENETAPAN & PENAGIHAN STATE
  // ------------------------------------------------------------
  const [matrixData, setMatrixData] = useState({ columns: [], rows: [], summary: {}, academic_year: {} });
  const [matrixLoading, setMatrixLoading] = useState(false);
  const [matrixFilterClassId, setMatrixFilterClassId] = useState('');
  const [matrixSearch, setMatrixSearch] = useState('');
  const [selectedRowStudentIds, setSelectedRowStudentIds] = useState(new Set());
  const [matrixSortConfig, setMatrixSortConfig] = useState({ key: 'name', direction: 'asc' });

  // ------------------------------------------------------------
  // 2.5 TAB 2: TAGIHAN PEMBAYARAN ALUMNI STATE
  // ------------------------------------------------------------
  const [alumniData, setAlumniData] = useState({ summary: {}, cohorts: [], alumni: [] });
  const [alumniLoading, setAlumniLoading] = useState(false);
  const [alumniSearch, setAlumniSearch] = useState('');
  const [alumniFilterCohortId, setAlumniFilterCohortId] = useState('');
  const [alumniFilterStatus, setAlumniFilterStatus] = useState('with_arrears'); // 'with_arrears' | 'all' | 'unpaid' | 'partially_paid' | 'paid'
  const [alumniSortConfig, setAlumniSortConfig] = useState({ key: 'total_remaining', direction: 'desc' });

  // Modal Rincian Tagihan Alumni
  const [selectedAlumnusDetail, setSelectedAlumnusDetail] = useState(null);
  const [alumniDetailModalOpen, setAlumniDetailModalOpen] = useState(false);

  // Modal Catat Tunggakan Manual Alumni
  const [manualArrearModalOpen, setManualArrearModalOpen] = useState(false);
  const [manualArrearForm, setManualArrearForm] = useState({
    student_id: '',
    fee_type_id: '',
    academic_year_id: '',
    period_year: new Date().getFullYear(),
    amount: '',
    bill_date: new Date().toISOString().slice(0, 10),
    due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    notes: ''
  });
  const [submittingManualArrear, setSubmittingManualArrear] = useState(false);

  // Modal Bayar Tagihan Santri Alumni
  const [payAlumniModalOpen, setPayAlumniModalOpen] = useState(false);
  const [payingAlumnus, setPayingAlumnus] = useState(null);
  const [alumniPaymentForm, setAlumniPaymentForm] = useState({
    paid_at: new Date().toISOString().slice(0, 10),
    payment_method: 'cash',
    cash_account_id: '',
    notes: '',
    allocations: {}
  });
  const [submittingAlumniPayment, setSubmittingAlumniPayment] = useState(false);

  // Modal Penerbitan / Edit Sel Matrix
  const [cellModalOpen, setCellModalOpen] = useState(false);
  const [selectedCellInfo, setSelectedCellInfo] = useState(null);
  const [cellFormData, setCellFormData] = useState({
    amount: '',
    bill_date: new Date().toISOString().slice(0, 10),
    due_date: '',
    is_not_billed: false,
    apply_to_subsequent_months: false,
    unbilled_reason: 'Siswa belum aktif (Santri Pindahan)',
    has_discount: false,
    discount_amount: 0,
    discount_reason: '',
    notes: '',
    mapping_id: '',
    custom_rule_mode: false
  });
  const [submittingCell, setSubmittingCell] = useState(false);

  // Modal Batalkan Tagihan Sel
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelFormData, setCancelFormData] = useState({
    cancel_date: new Date().toISOString().slice(0, 10),
    cancel_reason: ''
  });
  const [submittingCancel, setSubmittingCancel] = useState(false);

  // Modal Konfirmasi Penerbitan Kolom
  const [columnPublishModalOpen, setColumnPublishModalOpen] = useState(false);
  const [targetColumnInfo, setTargetColumnInfo] = useState(null);
  const [columnPublishFormData, setColumnPublishFormData] = useState({
    bill_date: new Date().toISOString().slice(0, 10),
    due_date: '',
    notes: '',
    mapping_id: '',
    discount_mapping_id: '',
    has_discount: false,
    discount_type: 'amount',
    discount_amount: 0,
    discount_percent: 0,
    discount_reason: '',
    custom_rule_mode: false,
    custom_discount_rule_mode: false
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
  const [importAccountingRuleId, setImportAccountingRuleId] = useState('');
  const [submittingImport, setSubmittingImport] = useState(false);
  const importFileInputRef = useRef(null);

  // ------------------------------------------------------------
  // 3. TAB 2: RIWAYAT PENAGIHAN (HISTORY) STATE
  // ------------------------------------------------------------
  const [historyBills, setHistoryBills] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historySearch, setHistorySearch] = useState('');
  const [historyFilterClassId, setHistoryFilterClassId] = useState('');
  const [historyFilterFeeTypeId, setHistoryFilterFeeTypeId] = useState('');
  const [historyFilterStatus, setHistoryFilterStatus] = useState('');
  const [historySortConfig, setHistorySortConfig] = useState({ key: 'due_date', direction: 'desc' });

  // Detail & Revisi Bill Modal
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

  // ------------------------------------------------------------
  // 4. TAB 3: REMINDER TAGIHAN STATE
  // ------------------------------------------------------------
  const [reminderLogs, setReminderLogs] = useState([]);
  const [reminderLogsLoading, setReminderLogsLoading] = useState(false);
  const [reminderSearch, setReminderSearch] = useState('');
  const [reminderSortConfig, setReminderSortConfig] = useState({ key: 'sent_at', direction: 'desc' });
  const [broadcastModalOpen, setBroadcastModalOpen] = useState(false);
  const [broadcastFilterMode, setBroadcastFilterMode] = useState('overdue'); // 'overdue' | 'unpaid_all' | 'selected'
  const [broadcastSelectedBillIds, setBroadcastSelectedBillIds] = useState([]);
  const [broadcastCustomMessage, setBroadcastCustomMessage] = useState('');
  const [submittingBroadcast, setSubmittingBroadcast] = useState(false);

  // Quick single reminder
  const [sendingSingleReminderId, setSendingSingleReminderId] = useState(null);

  // ============================================================
  // LOAD MASTER CONTEXT (Academic Years, Classes, Fee Types, Cash Accounts)
  // ============================================================
  useEffect(() => {
    const fetchMasterContext = async () => {
      try {
        let ayParams = {};
        if (activeSchoolUnit && activeSchoolUnit.id && activeSchoolUnit.id !== 'all' && !activeSchoolUnit.is_foundation) {
          ayParams.satuan_pendidikan_id = activeSchoolUnit.id;
        }

        let clsParams = {};
        if (activeSchoolUnit && activeSchoolUnit.id && activeSchoolUnit.id !== 'all' && !activeSchoolUnit.is_foundation) {
          clsParams.satuan_pendidikan_id = activeSchoolUnit.id;
        }

        const [ayRes, clsRes, ftRes, coaRes, trRes, cashRes] = await Promise.allSettled([
          api.get('/akademik/academic-years', { params: ayParams }),
          api.get('/akademik/class-groups', { params: clsParams }),
          api.get('/keuangan/fee-types'),
          api.get('/keuangan/chart-of-accounts'),
          api.get('/keuangan/transaction-account-mappings'),
          api.get('/keuangan/cash-accounts')
        ]);

        let yearsList = [];
        if (ayRes.status === 'fulfilled' && ayRes.value?.data) {
          yearsList = ayRes.value.data?.data || ayRes.value.data?.academic_years || (Array.isArray(ayRes.value.data) ? ayRes.value.data : []);
        }

        // Robust multi-tier fallback jika query dengan satuan_pendidikan_id kosong / gagal
        if (yearsList.length === 0) {
          try {
            const fallback1 = await api.get('/akademik/academic-years').catch(() => null);
            const fallback2 = fallback1 || await api.get('/keuangan/master-data/academic-years').catch(() => null);
            const fallback3 = fallback2 || await api.get('/akademik/internal/academic-years').catch(() => null);
            if (fallback3?.data) {
              yearsList = fallback3.data?.data || fallback3.data?.academic_years || (Array.isArray(fallback3.data) ? fallback3.data : []);
            } else if (fallback2?.data) {
              yearsList = fallback2.data?.data || fallback2.data?.academic_years || (Array.isArray(fallback2.data) ? fallback2.data : []);
            } else if (fallback1?.data) {
              yearsList = fallback1.data?.data || fallback1.data?.academic_years || (Array.isArray(fallback1.data) ? fallback1.data : []);
            }
          } catch (e) {
            console.warn('Fallback academic years error:', e);
          }
        }

        // Deduplikasi dan sorting nama descending
        const uniqueMap = new Map();
        yearsList.forEach((y) => {
          const nameKey = (y.name || '').trim();
          if (!nameKey) return;
          const existing = uniqueMap.get(nameKey);
          if (!existing) {
            uniqueMap.set(nameKey, y);
          } else if (y.is_active && !existing.is_active) {
            uniqueMap.set(nameKey, y);
          }
        });
        const finalYears = Array.from(uniqueMap.values());
        finalYears.sort((a, b) => (b.name || '').localeCompare(a.name || ''));

        setAcademicYears(finalYears);

        // Jika belum ada pilihan atau pilihan tidak valid, pilih tahun ajaran aktif atau pertama
        if (finalYears.length > 0) {
          const stored = (() => {
            try {
              return localStorage.getItem('keuangan_bills_selected_ay_id') ||
                localStorage.getItem('keuangan_payments_selected_ay') ||
                localStorage.getItem('keuangan_fee_schemes_selected_ay') ||
                '';
            } catch {
              return '';
            }
          })();
          const preferredId = selectedAcademicYearId || stored;
          const found = finalYears.find((y) => String(y.id) === String(preferredId));
          if (found) {
            setSelectedAcademicYearId(String(found.id));
          } else {
            const activeYear = finalYears.find((y) => y.is_active) || finalYears[0];
            setSelectedAcademicYearId(String(activeYear.id));
          }
        }

        if (clsRes.status === 'fulfilled' && clsRes.value.data?.data) {
          setClassGroups(clsRes.value.data.data);
        }
        if (ftRes.status === 'fulfilled' && ftRes.value.data?.data) {
          setFeeTypes(ftRes.value.data.data);
        }
        if (coaRes.status === 'fulfilled' && coaRes.value.data?.data) {
          setCoasList(coaRes.value.data.data);
        }
        if (trRes.status === 'fulfilled' && trRes.value.data?.data) {
          setTransactionRules(trRes.value.data.data);
        }
        if (cashRes.status === 'fulfilled' && cashRes.value.data?.data) {
          setCashAccounts(cashRes.value.data.data);
        }
      } catch (err) {
        console.error('Error fetching master context in StudentBills:', err);
      }
    };

    fetchMasterContext();
  }, [activeSchoolUnit]);

  // Save selected AY ID to local storage & sync across modules
  useEffect(() => {
    if (selectedAcademicYearId) {
      try {
        localStorage.setItem('keuangan_bills_selected_ay_id', String(selectedAcademicYearId));
        localStorage.setItem('keuangan_payments_selected_ay', String(selectedAcademicYearId));
        localStorage.setItem('keuangan_fee_schemes_selected_ay', String(selectedAcademicYearId));
      } catch (e) {
        console.warn('Storage warning:', e);
      }
    }
  }, [selectedAcademicYearId]);

  // ============================================================
  // FETCH TAB DATA ON TAB / FILTER CHANGE
  // ============================================================
  const fetchMatrixData = async () => {
    if (!selectedAcademicYearId) return;
    setMatrixLoading(true);
    try {
      const res = await api.get('/keuangan/student-bills/matrix', {
        params: {
          academic_year_id: selectedAcademicYearId,
          class_id: matrixFilterClassId || undefined,
          search: matrixSearch || undefined
        }
      });
      if (res.data?.data) {
        setMatrixData(res.data.data);
      }
    } catch (err) {
      console.error('Error loading bills matrix:', err);
    } finally {
      setMatrixLoading(false);
    }
  };

  const fetchAlumniData = async () => {
    setAlumniLoading(true);
    try {
      const params = {};
      if (selectedAcademicYearId) params.academic_year_id = selectedAcademicYearId;
      if (alumniFilterCohortId) params.cohort_id = alumniFilterCohortId;
      if (alumniFilterStatus) params.status = alumniFilterStatus;
      if (alumniSearch.trim()) params.search = alumniSearch.trim();

      const res = await api.get('/keuangan/student-bills/alumni', { params });
      setAlumniData(res.data?.data || { summary: {}, cohorts: [], alumni: [] });
    } catch (err) {
      console.error('Error loading alumni bills:', err);
    } finally {
      setAlumniLoading(false);
    }
  };

  const fetchHistoryBills = async () => {
    setHistoryLoading(true);
    try {
      const res = await api.get('/keuangan/student-bills', {
        params: {
          academic_year_id: selectedAcademicYearId || undefined,
          class_id: historyFilterClassId || undefined,
          fee_type_id: historyFilterFeeTypeId || undefined,
          status: historyFilterStatus || undefined
        }
      });
      setHistoryBills(res.data?.data || []);
    } catch (err) {
      console.error('Error loading history bills:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const fetchReminderLogs = async () => {
    setReminderLogsLoading(true);
    try {
      const res = await api.get('/keuangan/student-bills/reminders/logs');
      setReminderLogs(res.data?.data || []);
    } catch (err) {
      console.error('Error loading reminder logs:', err);
    } finally {
      setReminderLogsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'matrix') {
      fetchMatrixData();
    } else if (activeTab === 'alumni') {
      fetchAlumniData();
    } else if (activeTab === 'history') {
      fetchHistoryBills();
    } else if (activeTab === 'reminders') {
      fetchReminderLogs();
    }
  }, [activeTab, selectedAcademicYearId, matrixFilterClassId, alumniFilterCohortId, alumniFilterStatus, historyFilterClassId, historyFilterFeeTypeId, historyFilterStatus, activeSchoolUnit]);

  // Debounced search for matrix
  useEffect(() => {
    if (activeTab !== 'matrix') return;
    const timer = setTimeout(() => {
      fetchMatrixData();
    }, 350);
    return () => clearTimeout(timer);
  }, [matrixSearch]);

  // Debounced search for alumni
  useEffect(() => {
    if (activeTab !== 'alumni') return;
    const timer = setTimeout(() => {
      fetchAlumniData();
    }, 350);
    return () => clearTimeout(timer);
  }, [alumniSearch]);

  // ============================================================
  // TAB 2: ALUMNI ACTIONS & HANDLERS
  // ============================================================
  const handleSortAlumni = (key) => {
    setAlumniSortConfig((prev) => {
      if (prev.key === key) {
        return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { key, direction: 'asc' };
    });
  };

  const sortedAlumniList = useMemo(() => {
    let list = [...(alumniData.alumni || [])];
    if (alumniSortConfig.key) {
      list.sort((a, b) => {
        let aVal = a[alumniSortConfig.key];
        let bVal = b[alumniSortConfig.key];

        if (['total_remaining', 'total_paid', 'total_bills', 'unpaid_bills_count'].includes(alumniSortConfig.key)) {
          aVal = parseFloat(aVal || 0);
          bVal = parseFloat(bVal || 0);
        } else if (typeof aVal === 'string') {
          return alumniSortConfig.direction === 'asc'
            ? aVal.localeCompare(bVal || '')
            : (bVal || '').localeCompare(aVal);
        }

        if (aVal < bVal) return alumniSortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return alumniSortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return list;
  }, [alumniData.alumni, alumniSortConfig]);

  // Open Detail Rincian Tagihan Modal
  const handleOpenAlumniDetailModal = (alumnus) => {
    setSelectedAlumnusDetail(alumnus);
    setAlumniDetailModalOpen(true);
  };

  // Open Catat Tunggakan Manual Modal
  const handleOpenManualArrearModal = (alumnus = null) => {
    // Cari fee type Tunggakan Tahun Ajaran Sebelumnya atau buat default
    const defaultArrearsFt = feeTypes.find(
      (ft) => ft.code === 'arrears_previous_year' || ft.name?.toLowerCase().includes('tunggakan tahun ajaran sebelumnya')
    );
    const resolvedFtId = defaultArrearsFt ? String(defaultArrearsFt.id) : (feeTypes[0] ? String(feeTypes[0].id) : '11');

    const targetAY = alumnus?.graduation_academic_year_id ? String(alumnus.graduation_academic_year_id) : (selectedAcademicYearId || '');
    const defaultDates = computeDefaultBillAndDueDates({ fee_type_id: resolvedFtId }, targetAY);

    setManualArrearForm({
      student_id: alumnus ? String(alumnus.id) : '',
      fee_type_id: resolvedFtId,
      academic_year_id: targetAY,
      period_year: new Date().getFullYear(),
      amount: '',
      bill_date: defaultDates.billDate,
      due_date: defaultDates.dueDate,
      notes: alumnus ? `Pencatatan tunggakan manual alumni: ${alumnus.full_name}` : 'Pencatatan tunggakan manual alumni'
    });
    setManualArrearModalOpen(true);
  };

  const handleSaveManualArrear = async (e) => {
    e.preventDefault();
    if (!manualArrearForm.student_id) {
      alert('Pilih santri alumni terlebih dahulu');
      return;
    }
    const amt = parseFloat(manualArrearForm.amount || 0);
    if (isNaN(amt) || amt <= 0) {
      alert('Nominal tunggakan harus berupa angka valid lebih dari 0');
      return;
    }

    setSubmittingManualArrear(true);
    try {
      await api.post('/keuangan/student-bills/alumni/manual-arrear', {
        student_id: Number(manualArrearForm.student_id),
        fee_type_id: manualArrearForm.fee_type_id ? Number(manualArrearForm.fee_type_id) : null,
        academic_year_id: manualArrearForm.academic_year_id ? Number(manualArrearForm.academic_year_id) : null,
        period_year: manualArrearForm.period_year ? Number(manualArrearForm.period_year) : new Date().getFullYear(),
        amount: amt,
        bill_date: manualArrearForm.bill_date,
        due_date: manualArrearForm.due_date,
        notes: manualArrearForm.notes.trim() || undefined
      });

      alert('Tunggakan manual alumni berhasil dicatat dan diterbitkan.');
      setManualArrearModalOpen(false);
      fetchAlumniData();
      if (activeTab === 'history') fetchHistoryBills();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal mencatat tunggakan manual alumni');
    } finally {
      setSubmittingManualArrear(false);
    }
  };

  // Open Bayar Tagihan Santri Alumni Modal
  const handleOpenPayAlumniModal = (alumnus) => {
    setPayingAlumnus(alumnus);

    // Siapkan default alokasi untuk seluruh tagihan yang belum lunas
    const initialAllocations = {};
    if (alumnus.bills && alumnus.bills.length > 0) {
      alumnus.bills.forEach((b) => {
        if (b.remaining_amount > 0) {
          initialAllocations[b.id] = b.remaining_amount;
        }
      });
    }

    const defaultCashAcc = cashAccounts[0]?.id ? String(cashAccounts[0].id) : '1';

    setAlumniPaymentForm({
      paid_at: new Date().toISOString().slice(0, 10),
      payment_method: 'cash',
      cash_account_id: defaultCashAcc,
      notes: `Pelunasan tagihan santri alumni: ${alumnus.full_name}`,
      allocations: initialAllocations
    });
    setPayAlumniModalOpen(true);
  };

  const handleAlumniAllocationChange = (billId, val) => {
    setAlumniPaymentForm((prev) => ({
      ...prev,
      allocations: {
        ...prev.allocations,
        [billId]: val === '' ? '' : parseFloat(val || 0)
      }
    }));
  };

  const handleExecuteAlumniPayment = async (e) => {
    e.preventDefault();
    if (!payingAlumnus) return;

    const allocations = Object.entries(alumniPaymentForm.allocations)
      .map(([billId, amount]) => ({
        student_bill_id: Number(billId),
        amount: parseFloat(amount || 0)
      }))
      .filter((a) => a.amount > 0);

    if (allocations.length === 0) {
      alert('Isi minimal 1 nominal pembayaran tagihan alumni');
      return;
    }

    setSubmittingAlumniPayment(true);
    try {
      const res = await api.post('/keuangan/payments/bill-payments', {
        allocations,
        paid_at: alumniPaymentForm.paid_at,
        payment_method: alumniPaymentForm.payment_method,
        cash_account_id: alumniPaymentForm.cash_account_id ? Number(alumniPaymentForm.cash_account_id) : undefined,
        notes: alumniPaymentForm.notes.trim() || undefined
      });

      const receipt = res.data?.data?.receipt || res.data?.data;
      alert(`Pembayaran tunggakan alumni sebesar Rp ${allocations.reduce((a, c) => a + c.amount, 0).toLocaleString('id-ID')} berhasil dicatat & masuk ke Buku Kas.`);

      setPayAlumniModalOpen(false);
      setPayingAlumnus(null);
      fetchAlumniData();
      if (activeTab === 'history') fetchHistoryBills();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal memproses pembayaran tunggakan alumni');
    } finally {
      setSubmittingAlumniPayment(false);
    }
  };

  // Cetak Surat Tagihan / Keterangan Tunggakan Santri Alumni
  const handlePrintAlumniStatement = (alumnus) => {
    if (!alumnus) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Pop-up terblokir oleh browser. Izinkan pop-up untuk mencetak surat tagihan.');
      return;
    }

    const todayStr = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    const bills = alumnus.bills || [];
    const unitName = activeSchoolUnit?.name || 'Satuan Pendidikan Aldepos';

    const html = `
      <!DOCTYPE html>
      <html lang="id">
      <head>
        <meta charset="UTF-8" />
        <title>Surat Rincian Tunggakan Alumni - ${alumnus.full_name}</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f8fafc; color: #1e293b; padding: 24px; }
          .container { max-width: 800px; margin: 0 auto; background: #fff; padding: 36px; border: 1px solid #e2e8f0; border-radius: 16px; }
          .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0f172a; padding-bottom: 16px; margin-bottom: 20px; }
          .brand h1 { font-size: 18px; font-weight: 800; color: #0f172a; text-transform: uppercase; }
          .brand p { font-size: 11px; color: #64748b; margin-top: 2px; }
          .badge-title { font-size: 14px; font-weight: 800; color: #b91c1c; text-align: right; }
          .badge-date { font-size: 11px; color: #64748b; text-align: right; margin-top: 2px; }
          
          .meta-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px 18px; margin-bottom: 20px; font-size: 12px; }
          .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
          .meta-row { display: flex; }
          .meta-label { width: 120px; color: #64748b; font-weight: 600; }
          .meta-val { font-weight: 700; color: #0f172a; }

          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 11.5px; }
          th { background: #f1f5f9; color: #334155; font-weight: 700; padding: 8px 10px; text-align: left; border-bottom: 2px solid #cbd5e1; }
          td { padding: 8px 10px; border-bottom: 1px solid #e2e8f0; }
          .text-right { text-align: right; }
          .total-row td { font-weight: 800; font-size: 12.5px; background: #fef2f2; color: #991b1b; border-top: 2px solid #f87171; }

          .note-box { background: #eff6ff; border: 1px dashed #93c5fd; border-radius: 10px; padding: 12px 16px; font-size: 11px; color: #1e40af; margin-bottom: 24px; line-height: 1.5; }
          
          .signature-section { display: flex; justify-content: space-between; margin-top: 30px; font-size: 11.5px; }
          .sign-box { text-align: center; width: 220px; }
          .sign-line { border-bottom: 1px solid #0f172a; margin-top: 55px; }

          .print-btn-bar { margin-top: 24px; text-align: center; }
          .btn { padding: 8px 16px; border-radius: 8px; font-size: 12px; font-weight: 700; cursor: pointer; border: none; }
          .btn-primary { background: #0284c7; color: #fff; margin-right: 8px; }
          .btn-secondary { background: #e2e8f0; color: #334155; }
          @media print { .print-btn-bar { display: none; } body { padding: 0; background: #fff; } .container { border: none; padding: 0; } }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="brand">
              <h1>ALDEPOS ISLAMIC SCHOOL</h1>
              <p>${unitName} - Divisi Keuangan & Administrasi Santri</p>
            </div>
            <div>
              <div class="badge-title">SURAT RINCIAN TUNGGAKAN ALUMNI</div>
              <div class="badge-date">Bogor, ${todayStr}</div>
            </div>
          </div>

          <div class="meta-box">
            <div class="meta-grid">
              <div class="meta-row"><span class="meta-label">Nama Santri:</span><span class="meta-val">${alumnus.full_name}</span></div>
              <div class="meta-row"><span class="meta-label">NIS / NISN:</span><span class="meta-val">${alumnus.nis || '-'} / ${alumnus.nisn || '-'}</span></div>
              <div class="meta-row"><span class="meta-label">Status Akademik:</span><span class="meta-val">ALUMNI / LULUS</span></div>
              <div class="meta-row"><span class="meta-label">Kelas Terakhir:</span><span class="meta-val">${alumnus.last_class_name || '-'} (T.A. ${alumnus.graduation_academic_year_name || '-'})</span></div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 30px;">No</th>
                <th>Komponen Biaya</th>
                <th>Periode / T.A.</th>
                <th>Jatuh Tempo</th>
                <th class="text-right">Tagihan</th>
                <th class="text-right">Terbayar</th>
                <th class="text-right">Sisa Tunggakan</th>
              </tr>
            </thead>
            <tbody>
              ${bills.map((b, idx) => `
                <tr>
                  <td>${idx + 1}</td>
                  <td style="font-weight: 600;">${b.fee_type_name}</td>
                  <td>${b.period_month ? `Bulan ${b.period_month}/${b.period_year}` : (b.academic_year_name || `T.A. ${b.period_year}`)}</td>
                  <td>${b.due_date ? String(b.due_date).slice(0, 10) : '-'}</td>
                  <td class="text-right font-mono">Rp ${b.amount.toLocaleString('id-ID')}</td>
                  <td class="text-right font-mono">Rp ${b.paid_amount.toLocaleString('id-ID')}</td>
                  <td class="text-right font-mono" style="font-weight: 700; color: ${b.remaining_amount > 0 ? '#b91c1c' : '#047857'};">
                    Rp ${b.remaining_amount.toLocaleString('id-ID')}
                  </td>
                </tr>
              `).join('')}
              <tr class="total-row">
                <td colspan="6" style="text-align: right; text-transform: uppercase;">Total Sisa Tunggakan yang Harus Dilunasi:</td>
                <td class="text-right font-mono">Rp ${alumnus.total_remaining.toLocaleString('id-ID')}</td>
              </tr>
            </tbody>
          </table>

          <div class="note-box">
            <b>Informasi Pembayaran & Rekening Resmi:</b><br/>
            Pembayaran dapat dilakukan melalui transfer rekening resmi Bank Syariah Indonesia (BSI) atas nama <b>Yayasan Aldepos</b> atau datang langsung ke Kasir Keuangan Sekolah. Mohon konfirmasi bukti transfer ke Admin Keuangan setelah melakukan pembayaran.
          </div>

          <div class="signature-section">
            <div class="sign-box">
              <div>Mengetahui,</div>
              <div style="font-weight: 700; margin-top: 4px;">Orang Tua / Wali Santri</div>
              <div class="sign-line"></div>
              <div style="margin-top: 4px; font-size: 10px; color: #64748b;">(Nama Terang & Tanda Tangan)</div>
            </div>
            <div class="sign-box">
              <div>Bogor, ${todayStr}</div>
              <div style="font-weight: 700; margin-top: 4px;">Bendahara / Bagian Keuangan</div>
              <div class="sign-line"></div>
              <div style="margin-top: 4px; font-weight: 700;">${activeSchoolUnit?.name || 'Satuan Pendidikan Aldepos'}</div>
            </div>
          </div>

          <div class="print-btn-bar">
            <button class="btn btn-primary" onclick="window.print()">&#128424; Cetak / Simpan PDF</button>
            <button class="btn btn-secondary" onclick="window.close()">Tutup Jendela</button>
          </div>
        </div>
        <script>
          window.onload = function() {
            setTimeout(function() { window.print(); }, 500);
          };
        </script>
      </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
  };

  // WhatsApp Pengingat Tagihan Alumni
  const handleSendWhatsAppAlumni = (alumnus) => {
    if (!alumnus) return;

    const unitName = activeSchoolUnit?.name || 'Aldepos Islamic School';
    let msg = `*PEMBERITAHUAN TUNGGAKAN ALUMNI - ${unitName.toUpperCase()}*\n\n`;
    msg += `Assalamu'alaikum Wr. Wb.\n`;
    msg += `Yth. Orang Tua / Wali dari Santri Alumni:\n`;
    msg += `Nama: *${alumnus.full_name}*\n`;
    msg += `NIS: ${alumnus.nis || '-'}\n`;
    msg += `Lulusan: ${alumnus.last_class_name || 'Kelas Akhir'} (T.A. ${alumnus.graduation_academic_year_name || '-'})\n\n`;
    msg += `Kami menginformasikan bahwa santri yang bersangkutan masih memiliki catatan administrasi tunggakan alumni sebagai berikut:\n`;

    const unpaidBills = (alumnus.bills || []).filter((b) => b.remaining_amount > 0);
    unpaidBills.forEach((b, idx) => {
      const periodLabel = b.period_month ? `Bulan ${b.period_month}/${b.period_year}` : (b.academic_year_name || `T.A. ${b.period_year}`);
      msg += `${idx + 1}. ${b.fee_type_name} (${periodLabel}): Rp ${b.remaining_amount.toLocaleString('id-ID')}\n`;
    });

    msg += `\n*TOTAL SISA TUNGGAKAN: Rp ${alumnus.total_remaining.toLocaleString('id-ID')}*\n\n`;
    msg += `Pembayaran dapat diselesaikan melalui transfer atau datang langsung ke Kasir Keuangan Sekolah.\n`;
    msg += `Terima kasih atas perhatian dan kerja samanya.\nWassalamu'alaikum Wr. Wb.\n\n`;
    msg += `_Divisi Keuangan ${unitName}_`;

    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`, '_blank');
  };

  // Ekspor Excel Tagihan Alumni
  const handleExportAlumniExcel = () => {
    if (!alumniData.alumni || alumniData.alumni.length === 0) {
      alert('Tidak ada data alumni untuk diekspor');
      return;
    }

    const rows = sortedAlumniList.map((a, idx) => ({
      No: idx + 1,
      'Nama Santri Alumni': a.full_name,
      NIS: a.nis,
      NISN: a.nisn,
      'Kelas Kelulusan': a.last_class_name || '-',
      'Tahun Ajaran Kelulusan': a.graduation_academic_year_name || '-',
      Angkatan: a.cohort_name || '-',
      'Total Tagihan (Rp)': a.total_bills,
      'Total Terbayar (Rp)': a.total_paid,
      'Sisa Tunggakan (Rp)': a.total_remaining,
      'Pos Tunggakan': (a.arrears_fee_types || []).join(', ') || '-',
      'Jumlah Tagihan Belum Lunas': a.unpaid_bills_count,
      'Status Tagihan': a.status === 'paid' ? 'Lunas' : a.status === 'partially_paid' ? 'Sebagian' : a.status === 'unpaid' ? 'Belum Lunas' : 'Tidak Ada Tagihan'
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Tunggakan_Alumni');
    const dateStr = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `Daftar_Tunggakan_Alumni_${activeSchoolUnit?.name || 'Aldepos'}_${dateStr}.xlsx`);
  };

  // ============================================================
  // TAB 1: MATRIX ACTIONS & HANDLERS
  // ============================================================

  // Multi-select rows
  const handleToggleSelectAllRows = () => {
    if (selectedRowStudentIds.size === matrixData.rows.length) {
      setSelectedRowStudentIds(new Set());
    } else {
      setSelectedRowStudentIds(new Set(matrixData.rows.map((r) => r.student_id)));
    }
  };

  const handleToggleSelectRow = (studentId) => {
    setSelectedRowStudentIds((prev) => {
      const next = new Set(prev);
      if (next.has(studentId)) next.delete(studentId);
      else next.add(studentId);
      return next;
    });
  };

  // Helper: Menghitung Tanggal Tagihan dan Tanggal Jatuh Tempo default sesuai aturan bisnis
  // 1. Tagihan SPP (Bulanan): Tanggal 01 di bulan tersebut & Jatuh tempo akhir bulan tersebut
  // 2. Tagihan Laundry (Bulanan): Tanggal 01 di bulan selanjutnya & Jatuh tempo akhir bulan selanjutnya
  // 3. Tagihan Non-Bulanan: Tanggal 01 bulan Juni tahun ajaran sebelumnya & Jatuh tempo 31 Agustus tahun ajaran tersebut
  const computeDefaultBillAndDueDates = (target, ayId = selectedAcademicYearId) => {
    const ayObj = academicYears.find((a) => String(a.id) === String(ayId));
    let startYear = 2024;
    let endYear = 2025;

    if (ayObj?.name && ayObj.name.includes('/')) {
      const parts = ayObj.name.split('/');
      startYear = parseInt(parts[0], 10) || 2024;
      endYear = parseInt(parts[1], 10) || startYear + 1;
    } else if (ayObj?.start_date) {
      const dt = new Date(ayObj.start_date);
      startYear = dt.getFullYear();
      endYear = startYear + 1;
    }

    const ftId = target.fee_type_id;
    const ft = feeTypes.find((f) => f.id === ftId);
    const targetName = String(target.fee_type_name || target.label || ft?.name || '').toLowerCase();
    const isLaundry = targetName.includes('laundry');
    const isMonthly = Boolean(target.period_month || target.is_monthly || ft?.fee_type === 'monthly');

    // 1. Tagihan Non-Bulanan (Sekali bayar / tahunan / pendaftaran / tunggakan TP sebelumnya)
    if (!isMonthly) {
      const billDate = `${startYear}-06-01`;
      const dueDate = `${startYear}-08-31`;
      return { billDate, dueDate };
    }

    // 2. Tagihan Bulanan (SPP & Laundry)
    const month = parseInt(target.period_month, 10) || 7;
    let year = target.period_year ? parseInt(target.period_year, 10) : (month >= 7 ? startYear : endYear);

    if (isLaundry) {
      // Khusus Laundry: Tanggal 01 di bulan selanjutnya & Jatuh tempo akhir bulan selanjutnya
      let nextMonth = month + 1;
      let nextYear = year;
      if (nextMonth > 12) {
        nextMonth = 1;
        nextYear = year + 1;
      }
      const mStr = String(nextMonth).padStart(2, '0');
      const lastDay = new Date(nextYear, nextMonth, 0).getDate();
      const billDate = `${nextYear}-${mStr}-01`;
      const dueDate = `${nextYear}-${mStr}-${String(lastDay).padStart(2, '0')}`;
      return { billDate, dueDate };
    } else {
      // Khusus SPP / Bulanan Biasa: Tanggal 01 di bulan tersebut & Jatuh tempo akhir bulan tersebut
      const mStr = String(month).padStart(2, '0');
      const lastDay = new Date(year, month, 0).getDate();
      const billDate = `${year}-${mStr}-01`;
      const dueDate = `${year}-${mStr}-${String(lastDay).padStart(2, '0')}`;
      return { billDate, dueDate };
    }
  };

  // Open Cell Modal
  const handleOpenCellModal = (row, cell) => {
    setSelectedCellInfo({ row, cell });
    const isAlreadyPublished = cell.is_published;
    const isCurrentlyUnbilled = Boolean(cell.is_unbilled || cell.status === 'cancelled');
    const ft = feeTypes.find((f) => f.id === cell.fee_type_id);
    const defaultRuleId = ft?.billing_account_mapping_id ? String(ft.billing_account_mapping_id) : '';
    const defaultDiscountRuleId = ft?.billing_discount_account_mapping_id ? String(ft.billing_discount_account_mapping_id) : '';
    const defaultPaymentDiscountRuleId = ft?.payment_discount_account_mapping_id ? String(ft.payment_discount_account_mapping_id) : '';

    const baseNominal = isCurrentlyUnbilled ? 0 : (cell.amount !== undefined && cell.amount !== null ? cell.amount : cell.base_amount);
    const currentDiscount = isCurrentlyUnbilled ? 0 : (cell.discount_amount || 0);
    const computedPct = baseNominal > 0 && currentDiscount > 0 ? ((currentDiscount / baseNominal) * 100).toFixed(1) : 0;

    const defaultDates = computeDefaultBillAndDueDates(cell, selectedAcademicYearId);

    setCellFormData({
      amount: baseNominal,
      bill_date: cell.bill_date ? String(cell.bill_date).slice(0, 10) : defaultDates.billDate,
      due_date: cell.due_date ? String(cell.due_date).slice(0, 10) : defaultDates.dueDate,
      is_not_billed: isCurrentlyUnbilled,
      apply_to_subsequent_months: false,
      unbilled_reason: cell.cancel_reason || (isCurrentlyUnbilled ? 'Tidak ditagihkan' : 'Siswa belum aktif (Santri Pindahan)'),
      has_discount: Boolean(currentDiscount > 0),
      discount_type: 'amount',
      discount_amount: currentDiscount,
      discount_percent: computedPct,
      discount_reason: cell.discount_reason || (cell.is_custom ? cell.custom_note : ''),
      notes: cell.notes || '',
      mapping_id: defaultRuleId,
      discount_mapping_id: defaultDiscountRuleId,
      payment_discount_mapping_id: defaultPaymentDiscountRuleId,
      custom_rule_mode: false,
      custom_discount_rule_mode: false,
      custom_payment_discount_rule_mode: false
    });
    setCellModalOpen(true);
  };

  // Helper: Mendapatkan tanggal akhir bulan dari format YYYY-MM-DD
  const getEndOfMonthForDate = (dateStr) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length < 2) return dateStr;
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    if (isNaN(y) || isNaN(m) || m < 1 || m > 12) return dateStr;
    const lastDay = new Date(y, m, 0).getDate();
    return `${parts[0]}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  };

  const handleCellBillDateChange = (val) => {
    setCellFormData((prev) => {
      const cell = selectedCellInfo?.cell;
      const ft = feeTypes.find((f) => f.id === cell?.fee_type_id);
      const isMonthly = Boolean(cell?.period_month || cell?.is_monthly || ft?.fee_type === 'monthly');

      let updatedDueDate = prev.due_date;
      if (isMonthly && val) {
        // Tagihan bulanan (SPP & Laundry): otomatis di akhir bulan dari Tanggal Tagihan
        updatedDueDate = getEndOfMonthForDate(val);
      } else if (val && (!updatedDueDate || updatedDueDate < val)) {
        updatedDueDate = val;
      }
      return {
        ...prev,
        bill_date: val,
        due_date: updatedDueDate
      };
    });
  };

  const handleCellDueDateChange = (val) => {
    setCellFormData((prev) => {
      let finalDueDate = val;
      // Jika due_date diisi lebih awal dari bill_date, sesuaikan minimal sama dengan bill_date
      if (val && prev.bill_date && val < prev.bill_date) {
        finalDueDate = prev.bill_date;
      }
      return {
        ...prev,
        due_date: finalDueDate
      };
    });
  };

  const handleSavePublishCell = async (e) => {
    e.preventDefault();
    if (!selectedCellInfo) return;
    const { row, cell } = selectedCellInfo;

    setSubmittingCell(true);
    try {
      const isUnbilled = Boolean(cellFormData.is_not_billed);
      const payload = {
        student_id: row.student_id,
        fee_type_id: cell.fee_type_id,
        period_month: cell.period_month,
        period_year: cell.period_year,
        academic_year_id: selectedAcademicYearId ? Number(selectedAcademicYearId) : 1,
        is_not_billed: isUnbilled,
        apply_to_subsequent_months: isUnbilled ? Boolean(cellFormData.apply_to_subsequent_months) : false,
        unbilled_reason: isUnbilled ? (cellFormData.unbilled_reason?.trim() || 'Tidak ditagihkan') : null,
        amount: isUnbilled ? 0 : parseFloat(cellFormData.amount || 0),
        bill_date: cellFormData.bill_date,
        due_date: cellFormData.due_date,
        discount_amount: (!isUnbilled && cellFormData.has_discount) ? parseFloat(cellFormData.discount_amount || 0) : 0,
        discount_reason: (!isUnbilled && cellFormData.has_discount) ? cellFormData.discount_reason : null,
        notes: isUnbilled ? (cellFormData.unbilled_reason || 'Tidak ditagihkan') : (cellFormData.notes || null),
        mapping_id: isUnbilled ? null : (cellFormData.mapping_id ? Number(cellFormData.mapping_id) : null),
        discount_mapping_id: isUnbilled ? null : (cellFormData.discount_mapping_id ? Number(cellFormData.discount_mapping_id) : null),
        payment_discount_mapping_id: isUnbilled ? null : (cellFormData.payment_discount_mapping_id ? Number(cellFormData.payment_discount_mapping_id) : null)
      };

      await api.post('/keuangan/student-bills/publish-cell', payload);
      setCellModalOpen(false);
      setSelectedCellInfo(null);
      fetchMatrixData();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menyimpan tagihan sel');
    } finally {
      setSubmittingCell(false);
    }
  };

  const handleExecuteCancelCellBill = async (e) => {
    e.preventDefault();
    if (!selectedCellInfo?.cell?.bill_id) return;
    if (!cancelFormData.cancel_reason.trim()) {
      alert('Alasan pembatalan tagihan wajib diisi');
      return;
    }

    setSubmittingCancel(true);
    try {
      await api.patch(`/keuangan/student-bills/${selectedCellInfo.cell.bill_id}/cancel`, {
        cancel_reason: cancelFormData.cancel_reason.trim(),
        cancelled_at: cancelFormData.cancel_date
      });
      alert(`Tagihan #${selectedCellInfo.cell.bill_id} berhasil dibatalkan.`);
      setCancelModalOpen(false);
      setCellModalOpen(false);
      setSelectedCellInfo(null);
      fetchMatrixData();
      if (activeTab === 'history') fetchHistoryBills();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal membatalkan tagihan');
    } finally {
      setSubmittingCancel(false);
    }
  };

  // Open Column Publish Modal
  const handleOpenColumnPublishModal = (col) => {
    setTargetColumnInfo(col);
    const ft = feeTypes.find((f) => f.id === col.fee_type_id);
    const defaultRuleId = ft?.billing_account_mapping_id ? String(ft.billing_account_mapping_id) : '';
    const defaultDiscountRuleId = ft?.billing_discount_account_mapping_id ? String(ft.billing_discount_account_mapping_id) : '';

    const defaultDates = computeDefaultBillAndDueDates(col, selectedAcademicYearId);

    setColumnPublishFormData({
      bill_date: defaultDates.billDate,
      due_date: defaultDates.dueDate,
      notes: `Penerbitan massal tagihan kolom ${col.label}`,
      has_discount: false,
      discount_type: 'amount',
      discount_amount: 0,
      discount_percent: 0,
      discount_reason: '',
      mapping_id: defaultRuleId,
      discount_mapping_id: defaultDiscountRuleId,
      custom_rule_mode: false,
      custom_discount_rule_mode: false
    });
    setColumnPublishModalOpen(true);
  };

  // Open Arrears Column Publish Modal
  const handleOpenArrearsColumnPublish = () => {
    const ft = feeTypes.find(
      (f) => f.code === 'arrears_previous_year' || f.id === 11 || (f.name && f.name.toLowerCase().includes('tunggakan'))
    );
    const resolvedFeeTypeId = ft?.id || 11;
    const resolvedFeeTypeName = ft?.name || 'Tunggakan TP Sebelumnya';
    const resolvedFeeTypeCode = ft?.code || 'arrears_previous_year';

    const selectedAY = academicYears.find((ay) => String(ay.id) === String(selectedAcademicYearId));
    let periodYear = new Date().getFullYear();
    if (selectedAY?.name) {
      const parts = selectedAY.name.split('/');
      periodYear = parseInt(parts[0], 10) || periodYear;
    }

    const arrearsCol = {
      key: `arrears_${resolvedFeeTypeId}`,
      fee_type_id: resolvedFeeTypeId,
      fee_type_name: resolvedFeeTypeName,
      fee_type_code: resolvedFeeTypeCode,
      billing_pattern: 'one_time',
      period_month: null,
      period_year: periodYear,
      month_label: null,
      label: 'Tunggakan TP Sebelumnya',
      badge_type: 'arrears',
      badge_text: 'Tunggakan',
      badge_color: 'bg-purple-50 text-purple-700 border-purple-200'
    };

    handleOpenColumnPublishModal(arrearsCol);
  };

  // Open Arrears Cell Modal (Per Siswa)
  const handleOpenArrearsCellModal = (row) => {
    const ft = feeTypes.find(
      (f) => f.code === 'arrears_previous_year' || f.id === 11 || (f.name && f.name.toLowerCase().includes('tunggakan'))
    );
    const resolvedFeeTypeId = ft?.id || 11;
    const resolvedFeeTypeName = ft?.name || 'Tunggakan TP Sebelumnya';
    const resolvedFeeTypeCode = ft?.code || 'arrears_previous_year';

    const selectedAY = academicYears.find((ay) => String(ay.id) === String(selectedAcademicYearId));
    let periodYear = new Date().getFullYear();
    if (selectedAY?.name) {
      const parts = selectedAY.name.split('/');
      periodYear = parseInt(parts[0], 10) || periodYear;
    }

    const existingArrearBill = (row.previous_arrears_items || []).find(
      (it) => it.fee_type_id === resolvedFeeTypeId || it.id
    );

    const isPublished = Boolean(
      existingArrearBill?.id &&
      existingArrearBill?.status !== 'draft' &&
      existingArrearBill?.status !== 'cancelled'
    );

    const arrearsCell = {
      id: existingArrearBill?.id || null,
      bill_id: existingArrearBill?.id || null,
      fee_type_id: resolvedFeeTypeId,
      fee_type_name: resolvedFeeTypeName,
      fee_type_code: resolvedFeeTypeCode,
      period_month: null,
      period_year: periodYear,
      amount: row.previous_arrears || 0,
      base_amount: row.previous_arrears || 0,
      paid_amount: existingArrearBill?.paid || 0,
      discount_amount: 0,
      discount_reason: null,
      status: existingArrearBill?.status || (row.previous_arrears > 0 ? (isPublished ? 'unpaid' : 'not_published') : 'paid'),
      is_published: isPublished,
      is_paid: Boolean(row.previous_arrears <= 0),
      is_partially_paid: Boolean(existingArrearBill?.paid > 0 && row.previous_arrears > 0),
      is_overdue: Boolean(existingArrearBill?.status === 'overdue'),
      is_unbilled: false,
      notes: (row.previous_arrears_items || []).map((it) => it.notes || it.fee_type_name).filter(Boolean).join(', ') || 'Tunggakan TP Sebelumnya'
    };

    handleOpenCellModal(row, arrearsCell);
  };

  const handleColumnBillDateChange = (val) => {
    setColumnPublishFormData((prev) => {
      const col = targetColumnInfo;
      const ft = feeTypes.find((f) => f.id === col?.fee_type_id);
      const isMonthly = Boolean(col?.period_month || col?.is_monthly || ft?.fee_type === 'monthly');

      let updatedDueDate = prev.due_date;
      if (isMonthly && val) {
        // Tagihan bulanan (SPP & Laundry): otomatis di akhir bulan dari Tanggal Tagihan
        updatedDueDate = getEndOfMonthForDate(val);
      } else if (val && (!updatedDueDate || updatedDueDate < val)) {
        updatedDueDate = val;
      }
      return {
        ...prev,
        bill_date: val,
        due_date: updatedDueDate
      };
    });
  };

  const handleColumnDueDateChange = (val) => {
    setColumnPublishFormData((prev) => {
      let finalDueDate = val;
      if (val && prev.bill_date && val < prev.bill_date) {
        finalDueDate = prev.bill_date;
      }
      return {
        ...prev,
        due_date: finalDueDate
      };
    });
  };

  const handleExecuteColumnPublish = async () => {
    if (!targetColumnInfo) return;

    setSubmittingColumnPublish(true);
    try {
      const selectedIdsArray = Array.from(selectedRowStudentIds);
      const isSelectionMode = selectedIdsArray.length > 0;

      const payload = {
        fee_type_id: targetColumnInfo.fee_type_id,
        period_month: targetColumnInfo.period_month,
        period_year: targetColumnInfo.period_year,
        academic_year_id: selectedAcademicYearId ? Number(selectedAcademicYearId) : 1,
        student_ids: isSelectionMode ? selectedIdsArray : undefined,
        class_id: matrixFilterClassId ? Number(matrixFilterClassId) : null,
        bill_date: columnPublishFormData.bill_date,
        due_date: columnPublishFormData.due_date,
        notes: columnPublishFormData.notes || `Penerbitan massal kolom ${targetColumnInfo.label}`,
        has_discount: columnPublishFormData.has_discount,
        discount_amount: columnPublishFormData.has_discount ? parseFloat(columnPublishFormData.discount_amount || 0) : 0,
        discount_percent: columnPublishFormData.has_discount ? parseFloat(columnPublishFormData.discount_percent || 0) : 0,
        discount_reason: columnPublishFormData.has_discount ? columnPublishFormData.discount_reason : null,
        mapping_id: columnPublishFormData.mapping_id ? Number(columnPublishFormData.mapping_id) : null,
        discount_mapping_id: columnPublishFormData.discount_mapping_id ? Number(columnPublishFormData.discount_mapping_id) : null
      };

      const res = await api.post('/keuangan/student-bills/publish-batch', payload);
      alert(`Penerbitan kolom berhasil: ${res.data?.data?.count || 0} tagihan baru diterbitkan & dicatat ke piutang.`);
      setColumnPublishModalOpen(false);
      setTargetColumnInfo(null);
      setSelectedRowStudentIds(new Set());
      fetchMatrixData();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menerbitkan tagihan kolom');
    } finally {
      setSubmittingColumnPublish(false);
    }
  };

  // ============================================================
  // FITUR IMPORT DATA EXCEL PER KOLOM & UNDUH FORMAT (Fitur Baru)
  // ============================================================
  const formatDateToDMY = (dateInput) => {
    if (!dateInput) return '';
    if (typeof dateInput === 'string') {
      const clean = dateInput.trim();
      const match = clean.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (match) {
        return `${match[3]}/${match[2]}/${match[1]}`;
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
    // Jika angka serial Excel (misal 45123)
    if (typeof val === 'number') {
      if (val > 20000) {
        const d = new Date(Math.round((val - 25569) * 86400 * 1000));
        if (!isNaN(d.getTime())) {
          return d.toISOString().slice(0, 10);
        }
      }
      return null;
    }
    if (typeof val === 'string') {
      const s = val.trim();
      // Format DD/MM/YYYY atau DD-MM-YYYY atau DD.MM.YYYY atau DD/MM/YY
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
      // Format YYYY-MM-DD
      const isoMatch = s.match(/^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})/);
      if (isoMatch) {
        return `${isoMatch[1]}-${isoMatch[2].padStart(2, '0')}-${isoMatch[3].padStart(2, '0')}`;
      }
      const parsed = new Date(s);
      if (!isNaN(parsed.getTime())) {
        const year = parsed.getFullYear();
        const month = String(parsed.getMonth() + 1).padStart(2, '0');
        const day = String(parsed.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      }
    }
    return null;
  };

  const handleDownloadColumnTemplate = (col) => {
    if (!col) return;
    const currentAY = academicYears.find((y) => String(y.id) === String(selectedAcademicYearId));
    const ayName = currentAY?.name || 'Tahun Ajaran Terpilih';

    const headerRows = [
      ['DOKUMEN IDENTITAS IMPORT TAGIHAN SISWA', '', '', '', '', '', '', ''],
      ['TAHUN AJARAN', ayName, 'ID_TAHUN_AJARAN', selectedAcademicYearId, '', '', '', ''],
      ['JENIS BIAYA', col.fee_type_name, 'ID_JENIS_BIAYA', col.fee_type_id, '', '', '', ''],
      ['PERIODE TAGIHAN', col.month_label || col.label || 'Tahunan', 'BULAN', col.period_month !== null && col.period_month !== undefined ? String(col.period_month) : '-', 'TAHUN', String(col.period_year), '', ''],
      ['KODE IDENTIFIER KOLOM', col.key, '', '', '', '', '', ''],
      ['CATATAN PENTING: File Excel ini hanya berlaku untuk kolom di atas pada Tahun Ajaran terkait. Jangan ubah baris identitas 1-5 di atas.', '', '', '', '', '', '', ''],
      ['', '', '', '', '', '', '', ''],
      ['No', 'NIS / NIPD', 'Nama Siswa', 'Kelas / Rombel', 'Nominal Tagihan (Rp)', 'Tanggal Penagihan (DD/MM/YYYY)', 'Tanggal Jatuh Tempo (DD/MM/YYYY)', 'Catatan']
    ];

    const defaultDates = computeDefaultBillAndDueDates(col, selectedAcademicYearId);
    const defaultDueDateStr = defaultDates.dueDate;
    const defaultBillDateStr = defaultDates.billDate;

    const studentDataRows = (matrixData.rows || []).map((row, idx) => {
      const cell = row.cells?.[col.key] || {};
      const nominal = cell.amount !== undefined && cell.amount !== null ? cell.amount : (cell.base_amount || 0);
      const billDateDMY = formatDateToDMY(cell.bill_date || defaultBillDateStr);
      const dueDateDMY = formatDateToDMY(cell.due_date || defaultDueDateStr);
      const notes = cell.notes || cell.edit_reason || '';

      return [
        idx + 1,
        row.nipd || row.nis || '',
        row.name || '',
        row.class_name || '',
        nominal,
        billDateDMY,
        dueDateDMY,
        notes
      ];
    });

    const fullSheetData = [...headerRows, ...studentDataRows];
    const ws = XLSX.utils.aoa_to_sheet(fullSheetData);

    ws['!cols'] = [
      { wch: 6 },   // No
      { wch: 18 },  // NIS
      { wch: 32 },  // Nama
      { wch: 16 },  // Rombel
      { wch: 22 },  // Nominal
      { wch: 28 },  // Tgl Tagihan
      { wch: 28 },  // Tgl Jatuh Tempo
      { wch: 36 }   // Catatan
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Import Tagihan');

    const safeColName = (col.fee_type_name || 'Tagihan').replace(/[^a-zA-Z0-9]/g, '_');
    const periodTag = col.period_month ? `_Bln_${col.period_month}` : '';
    const filename = `Format_Tagihan_${safeColName}${periodTag}_TA_${col.period_year}.xlsx`;

    XLSX.writeFile(wb, filename);
  };

  const handleOpenImportModal = (col) => {
    setTargetImportColumnInfo(col);
    setImportParsedRows([]);
    setImportFileValidation(null);
    setImportFileName('');
    setImportSearchFilter('');
    setImportStatusFilter('all');

    const ft = feeTypes.find((f) => f.id === col.fee_type_id);
    const defaultRuleId = ft?.billing_account_mapping_id ? String(ft.billing_account_mapping_id) : '';
    setImportAccountingRuleId(defaultRuleId);

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
        const wb = XLSX.read(data, { type: 'array' });
        const firstSheetName = wb.SheetNames[0];
        const ws = wb.Sheets[firstSheetName];
        const rawRows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

        if (!rawRows || rawRows.length < 2) {
          setImportFileValidation({
            isValid: false,
            errorMsg: 'File Excel kosong atau tidak memiliki format yang valid.'
          });
          return;
        }

        // 1. Ekstrak Metadata Dokumen dari 8 baris pertama
        let docAyId = '';
        let docAyName = '';
        let docFeeTypeId = '';
        let docFeeTypeName = '';
        let docColKey = '';

        for (let i = 0; i < Math.min(8, rawRows.length); i++) {
          const row = rawRows[i];
          for (let j = 0; j < row.length; j++) {
            const cellStr = String(row[j] || '').trim().toUpperCase();
            if (cellStr === 'ID_TAHUN_AJARAN') {
              docAyId = String(row[j + 1] || '').trim();
            }
            if (cellStr === 'TAHUN AJARAN') {
              docAyName = String(row[j + 1] || '').trim();
            }
            if (cellStr === 'ID_JENIS_BIAYA') {
              docFeeTypeId = String(row[j + 1] || '').trim();
            }
            if (cellStr === 'JENIS BIAYA') {
              docFeeTypeName = String(row[j + 1] || '').trim();
            }
            if (cellStr === 'KODE IDENTIFIER KOLOM') {
              docColKey = String(row[j + 1] || '').trim();
            }
          }
        }

        // Validasi identitas dokumen
        const currentAY = academicYears.find((y) => String(y.id) === String(selectedAcademicYearId));
        const currentAyName = currentAY?.name || `ID ${selectedAcademicYearId}`;
        let validationError = null;

        if (docAyId && String(docAyId) !== String(selectedAcademicYearId)) {
          validationError = `File ini ditujukan untuk Tahun Ajaran "${docAyName || docAyId}", bukan Tahun Ajaran yang sedang aktif (${currentAyName}). File ini tidak dapat digunakan.`;
        } else if (docFeeTypeId && targetImportColumnInfo && String(docFeeTypeId) !== String(targetImportColumnInfo.fee_type_id)) {
          validationError = `File ini ditujukan untuk Jenis Biaya "${docFeeTypeName || docFeeTypeId}", sedangkan kolom target yang Anda buka adalah "${targetImportColumnInfo.fee_type_name}".`;
        } else if (docColKey && targetImportColumnInfo && docColKey !== targetImportColumnInfo.key) {
          validationError = `File ini berisi data untuk kolom tagihan yang berbeda (${docColKey}). Kolom target aktif adalah "${targetImportColumnInfo.label}".`;
        }

        // 2. Cari Baris Header Tabel Data Santri
        let headerRowIdx = -1;
        for (let i = 0; i < Math.min(25, rawRows.length); i++) {
          const r = rawRows[i].map((c) => String(c || '').toLowerCase().trim());
          const hasNisOrNipd = r.some((c) => (/\bnis\b|\bnipd\b|nis\s*\/\s*nipd/i.test(c)) && !c.includes('jenis') && !c.includes('identitas'));
          const hasNama = r.some((c) => c.includes('nama siswa') || (c.includes('nama') && !c.includes('jenis') && !c.includes('tahun')));
          const hasNominal = r.some((c) => c.includes('nominal') || c.includes('tagihan') || c.includes('tarif'));

          if ((hasNisOrNipd || hasNama) && (hasNominal || r.some((c) => c.includes('rombel') || c.includes('kelas')))) {
            headerRowIdx = i;
            break;
          }
        }

        if (headerRowIdx === -1) {
          setImportFileValidation({
            isValid: false,
            errorMsg: 'Header tabel data santri tidak ditemukan pada file Excel. Pastikan tidak mengubah atau menghapus format tabel data santri.'
          });
          return;
        }

        const headers = rawRows[headerRowIdx].map((c) => String(c || '').toLowerCase().trim());
        const nisIdx = headers.findIndex((h) => (/\bnis\b|\bnipd\b|nis\s*\/\s*nipd/i.test(h)) && !h.includes('jenis'));
        const nameIdx = headers.findIndex((h) => h.includes('nama') && !h.includes('jenis') && !h.includes('tahun'));
        const classIdx = headers.findIndex((h) => h.includes('kelas') || h.includes('rombel'));
        const nominalIdx = headers.findIndex((h) => (h.includes('nominal') || h.includes('tagihan') || h.includes('tarif') || h.includes('jumlah')) && !h.includes('periode'));
        const billDateIdx = headers.findIndex((h) => (h.includes('penagihan') || h.includes('tgl tagih') || h.includes('tanggal tagih') || h.includes('tanggal penagihan')) && !h.includes('dokumen'));
        const dueDateIdx = headers.findIndex((h) => h.includes('jatuh tempo') || h.includes('due date'));
        const notesIdx = headers.findIndex((h) => (h.includes('catatan') || h.includes('keterangan') || h.includes('notes')) && !h.includes('penting'));

        // 3. Parsing Baris Siswa
        const parsed = [];
        const defaultDueDateIso = `${targetImportColumnInfo.period_year}-${targetImportColumnInfo.period_month ? String(targetImportColumnInfo.period_month).padStart(2, '0') : '10'}-10`;
        const defaultBillDateIso = new Date().toISOString().slice(0, 10);

        for (let i = headerRowIdx + 1; i < rawRows.length; i++) {
          const row = rawRows[i];
          if (!row || row.length === 0 || row.every((c) => c === '')) continue;

          const rawNis = nisIdx !== -1 ? String(row[nisIdx] || '').trim() : '';
          const rawName = nameIdx !== -1 ? String(row[nameIdx] || '').trim() : '';
          const rawClass = classIdx !== -1 ? String(row[classIdx] || '').trim() : '';
          const rawNominal = nominalIdx !== -1 ? row[nominalIdx] : 0;
          const rawBillDate = billDateIdx !== -1 ? row[billDateIdx] : '';
          const rawDueDate = dueDateIdx !== -1 ? row[dueDateIdx] : '';
          const rawNotes = notesIdx !== -1 ? String(row[notesIdx] || '').trim() : '';

          // Match student with matrixData.rows
          let matchedRow = null;
          if (rawNis) {
            matchedRow = matrixData.rows.find(
              (r) =>
                String(r.nipd || '').trim() === rawNis ||
                String(r.nis || '').trim() === rawNis ||
                String(r.nipd || '').replace(/\D/g, '') === rawNis.replace(/\D/g, '')
            );
          }
          if (!matchedRow && rawName) {
            matchedRow = matrixData.rows.find(
              (r) => (r.name || '').trim().toLowerCase() === rawName.toLowerCase()
            );
          }

          // Parse nominal
          let parsedNominal = 0;
          if (typeof rawNominal === 'number') {
            parsedNominal = Math.max(0, rawNominal);
          } else if (typeof rawNominal === 'string') {
            const cleanNum = rawNominal.replace(/[^\d.,]/g, '').replace(/,/g, '.');
            parsedNominal = Math.max(0, parseFloat(cleanNum) || 0);
          }

          // Parse dates
          const parsedBillDate = parseDateToIso(rawBillDate) || defaultBillDateIso;
          const parsedDueDate = parseDateToIso(rawDueDate) || defaultDueDateIso;

          let rowValid = true;
          let rowError = null;
          let changeStatus = 'new'; // 'new' | 'updated' | 'unchanged' | 'skipped_zero' | 'invalid'
          let statusLabel = 'Data Baru';
          let diffSummary = '';

          if (!matchedRow) {
            rowValid = false;
            rowError = 'Santri tidak ditemukan pada daftar rombel Tahun Ajaran ini';
            changeStatus = 'invalid';
            statusLabel = 'Siswa Tidak Ditemukan';
          } else if (parsedNominal <= 0) {
            // Data dengan nominal 0 atau kosong sama sekali tidak diinput ke sistem
            rowValid = false;
            rowError = 'Nominal 0 / kosong (dilewati, tidak diinput ke sistem)';
            changeStatus = 'skipped_zero';
            statusLabel = 'Dilewati (Nominal 0)';
          } else {
            // Cek apakah data sudah pernah ada / terisi sebelumnya
            const existingCell = matchedRow.cells?.[targetImportColumnInfo.key] || {};
            const existingAmount = existingCell.amount !== undefined && existingCell.amount !== null
              ? parseFloat(existingCell.amount || 0)
              : (existingCell.base_amount || 0);
            const existingBillDate = existingCell.bill_date ? String(existingCell.bill_date).slice(0, 10) : '';
            const existingDueDate = existingCell.due_date ? String(existingCell.due_date).slice(0, 10) : '';
            const existingNotes = existingCell.notes || existingCell.edit_reason || '';
            const isAlreadyExists = Boolean(existingCell.bill_id || existingCell.is_published || existingCell.amount > 0);

            if (isAlreadyExists) {
              const amountChanged = Math.abs(existingAmount - parsedNominal) > 0.001;
              const billDateChanged = existingBillDate && existingBillDate !== parsedBillDate;
              const dueDateChanged = existingDueDate && existingDueDate !== parsedDueDate;
              const notesChanged = rawNotes && rawNotes !== existingNotes;

              const hasDiff = amountChanged || billDateChanged || dueDateChanged || notesChanged;

              if (hasDiff) {
                // Ada perbedaan data di Excel -> ditimpa dengan data baru
                changeStatus = 'updated';
                statusLabel = 'Perubahan Data (Akan Ditimpa)';
                rowValid = true;
                const diffs = [];
                if (amountChanged) diffs.push(`Nominal: Rp ${existingAmount.toLocaleString('id-ID')} → Rp ${parsedNominal.toLocaleString('id-ID')}`);
                if (billDateChanged) diffs.push(`Tgl Tagih: ${formatDateToDMY(existingBillDate)} → ${formatDateToDMY(parsedBillDate)}`);
                if (dueDateChanged) diffs.push(`Jatuh Tempo: ${formatDateToDMY(existingDueDate)} → ${formatDateToDMY(parsedDueDate)}`);
                if (notesChanged) diffs.push(`Catatan diubah`);
                diffSummary = diffs.join(' • ');
              } else {
                // Tidak ada perbedaan -> tidak perlu ditimpa / diubah
                changeStatus = 'unchanged';
                statusLabel = 'Sama (Tidak Diubah)';
                rowValid = true;
                diffSummary = 'Data sama dengan yang ada di sistem (tidak diubah)';
              }
            } else {
              changeStatus = 'new';
              statusLabel = 'Data Baru';
              rowValid = true;
              diffSummary = 'Data tagihan baru untuk santri ini';
            }
          }

          parsed.push({
            row_index: i + 1,
            student_id: matchedRow?.student_id || null,
            nis: rawNis || matchedRow?.nipd || matchedRow?.nis || '-',
            name: matchedRow?.name || rawName || 'Nama Santri Tidak Dikenal',
            class_name: matchedRow?.class_name || rawClass || '-',
            amount: parsedNominal,
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

        const validProcessableRows = parsed.filter((r) => r.is_valid && r.amount > 0 && r.change_status !== 'skipped_zero' && r.change_status !== 'invalid');

        setImportParsedRows(parsed);
        setImportFileValidation({
          isValid: !validationError && parsed.length > 0,
          errorMsg: validationError || (parsed.length === 0 ? 'Tidak ada baris data santri yang terbaca dari file Excel.' : null),
          docAyName: docAyName || currentAyName,
          docFeeTypeName: docFeeTypeName || targetImportColumnInfo?.fee_type_name,
          docPeriod: targetImportColumnInfo?.label,
          totalRows: parsed.length,
          validRows: validProcessableRows.length,
          updatedRows: parsed.filter((r) => r.change_status === 'updated').length,
          newRows: parsed.filter((r) => r.change_status === 'new').length,
          unchangedRows: parsed.filter((r) => r.change_status === 'unchanged').length,
          skippedZeroRows: parsed.filter((r) => r.change_status === 'skipped_zero').length
        });
      } catch (err) {
        console.error('Error parsing excel file:', err);
        setImportFileValidation({
          isValid: false,
          errorMsg: `Gagal membaca file Excel: ${err.message}`
        });
      }
    };

    reader.readAsArrayBuffer(file);
  };

  const handleExecuteImport = async (publishMode) => {
    if (!targetImportColumnInfo || importParsedRows.length === 0) return;

    // Filter baris yang valid dan memiliki nominal > 0
    const rowsToSubmit = importParsedRows.filter(
      (r) => r.is_valid && r.amount > 0 && r.student_id && r.change_status !== 'skipped_zero' && r.change_status !== 'invalid'
    );

    if (rowsToSubmit.length === 0) {
      alert('Tidak ada data tagihan bernominal > 0 yang perlu disimpan atau diubah.');
      return;
    }

    setSubmittingImport(true);
    try {
      const payload = {
        fee_type_id: targetImportColumnInfo.fee_type_id,
        period_month: targetImportColumnInfo.period_month,
        period_year: targetImportColumnInfo.period_year,
        academic_year_id: selectedAcademicYearId ? Number(selectedAcademicYearId) : 1,
        publish_mode: publishMode, // 'draft' or 'publish'
        mapping_id: importAccountingRuleId ? Number(importAccountingRuleId) : null,
        rows: rowsToSubmit.map((r) => ({
          student_id: r.student_id,
          nis: r.nis,
          amount: r.amount,
          bill_date: r.bill_date,
          due_date: r.due_date,
          notes: r.notes
        }))
      };

      const res = await api.post('/keuangan/student-bills/import-column', payload);
      alert(res.data?.message || 'Data tagihan berhasil diproses.');
      setColumnImportModalOpen(false);
      fetchMatrixData();
      if (activeTab === 'history') fetchHistoryBills();
    } catch (err) {
      console.error('Import error:', err);
      alert(err.response?.data?.message || 'Gagal melakukan import data tagihan');
    } finally {
      setSubmittingImport(false);
    }
  };

  // ============================================================
  // TAB 1: MATRIX SORTING & FILTERING
  // ============================================================
  const handleSortMatrix = (key) => {
    setMatrixSortConfig((prev) => {
      if (prev.key === key) {
        return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { key, direction: 'asc' };
    });
  };

  const filteredAndSortedMatrixRows = useMemo(() => {
    let list = Array.isArray(matrixData.rows) ? [...matrixData.rows] : [];

    // Filter pencarian
    if (matrixSearch.trim()) {
      const q = matrixSearch.toLowerCase();
      list = list.filter((r) => {
        const name = (r.name || '').toLowerCase();
        const nipd = (r.nipd || '').toLowerCase();
        const nis = (r.nis || '').toLowerCase();
        const rombel = (r.class_name || '').toLowerCase();
        const scheme = (r.scheme_name || '').toLowerCase();
        return name.includes(q) || nipd.includes(q) || nis.includes(q) || rombel.includes(q) || scheme.includes(q);
      });
    }

    // Filter rombel/kelas
    if (matrixFilterClassId) {
      list = list.filter((r) => String(r.class_id || r.class_group_id) === String(matrixFilterClassId));
    }

    // Sorting
    if (matrixSortConfig.key) {
      list.sort((a, b) => {
        let aVal = a[matrixSortConfig.key];
        let bVal = b[matrixSortConfig.key];

        // Jika sort berdasarkan kolom matrix dinamis (misal 'col_...')
        if (matrixSortConfig.key.startsWith('col_') || matrixData.columns.some((c) => c.key === matrixSortConfig.key)) {
          const colKey = matrixSortConfig.key;
          const aCell = a.cells?.[colKey];
          const bCell = b.cells?.[colKey];
          aVal = parseFloat(aCell?.amount || 0);
          bVal = parseFloat(bCell?.amount || 0);
          if (aVal === bVal) {
            const statusOrder = { paid: 3, partially_paid: 2, unpaid: 1, draft: 0 };
            const aStat = statusOrder[aCell?.status] || 0;
            const bStat = statusOrder[bCell?.status] || 0;
            return matrixSortConfig.direction === 'asc' ? aStat - bStat : bStat - aStat;
          }
        } else if (typeof aVal === 'string') {
          return matrixSortConfig.direction === 'asc'
            ? aVal.localeCompare(bVal || '')
            : (bVal || '').localeCompare(aVal);
        }

        aVal = parseFloat(aVal || 0);
        bVal = parseFloat(bVal || 0);
        if (aVal < bVal) return matrixSortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return matrixSortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return list;
  }, [matrixData.rows, matrixSearch, matrixFilterClassId, matrixSortConfig, matrixData.columns]);

  // ============================================================
  // TAB 2: RIWAYAT PENAGIHAN (HISTORY) HANDLERS & SORTING
  // ============================================================
  const handleSortHistory = (key) => {
    setHistorySortConfig((prev) => {
      if (prev.key === key) {
        return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { key, direction: 'asc' };
    });
  };

  const filteredAndSortedHistoryBills = useMemo(() => {
    let result = [...historyBills];

    if (historySearch.trim()) {
      const q = historySearch.toLowerCase();
      result = result.filter(
        (b) =>
          b.student_name?.toLowerCase().includes(q) ||
          String(b.student_id).includes(q) ||
          b.nis?.toLowerCase().includes(q) ||
          b.class_name?.toLowerCase().includes(q) ||
          b.fee_type_name?.toLowerCase().includes(q) ||
          b.academic_year_name?.toLowerCase().includes(q) ||
          b.component_display?.toLowerCase().includes(q) ||
          String(b.id).includes(q) ||
          b.notes?.toLowerCase().includes(q) ||
          b.discount_reason?.toLowerCase().includes(q) ||
          b.edit_reason?.toLowerCase().includes(q)
      );
    }

    if (historyFilterClassId) {
      result = result.filter((b) => String(b.class_id) === String(historyFilterClassId));
    }
    if (historyFilterFeeTypeId) {
      result = result.filter((b) => String(b.fee_type_id) === String(historyFilterFeeTypeId));
    }
    if (historyFilterStatus) {
      result = result.filter((b) => b.status === historyFilterStatus);
    }

    result.sort((a, b) => {
      let aVal = a[historySortConfig.key];
      let bVal = b[historySortConfig.key];

      if (historySortConfig.key === 'gross_amount') {
        aVal = parseFloat(a.amount || 0) + parseFloat(a.discount_amount || 0);
        bVal = parseFloat(b.amount || 0) + parseFloat(b.discount_amount || 0);
      } else if (historySortConfig.key === 'amount' || historySortConfig.key === 'discount_amount' || historySortConfig.key === 'paid_amount') {
        aVal = parseFloat(aVal || 0);
        bVal = parseFloat(bVal || 0);
      } else if (historySortConfig.key === 'created_at' || historySortConfig.key === 'bill_date' || historySortConfig.key === 'due_date') {
        aVal = new Date(aVal || 0).getTime();
        bVal = new Date(bVal || 0).getTime();
      } else if (typeof aVal === 'string') {
        return historySortConfig.direction === 'asc'
          ? aVal.localeCompare(bVal || '')
          : (bVal || '').localeCompare(aVal);
      }

      if (aVal < bVal) return historySortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return historySortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [historyBills, historySearch, historyFilterClassId, historyFilterFeeTypeId, historyFilterStatus, historySortConfig]);

  // History Tab Summary metrics
  const historySummary = useMemo(() => {
    let pubCount = 0;
    let pubAmount = 0;
    let draftCount = 0;
    let draftAmount = 0;
    let paidAmount = 0;
    let remainingAmount = 0;

    for (const b of filteredAndSortedHistoryBills) {
      const amt = parseFloat(b.amount || 0);
      const paid = parseFloat(b.paid_amount || 0);
      const rem = parseFloat(b.remaining_amount !== undefined ? b.remaining_amount : Math.max(0, amt - paid));

      if (b.status === 'draft') {
        draftCount++;
        draftAmount += amt;
      } else {
        pubCount++;
        pubAmount += amt;
        paidAmount += paid;
        remainingAmount += rem;
      }
    }

    return {
      publishedCount: pubCount,
      publishedAmount: pubAmount,
      draftCount: draftCount,
      draftAmount: draftAmount,
      totalPaid: paidAmount,
      totalRemaining: remainingAmount
    };
  }, [filteredAndSortedHistoryBills]);

  // Open Detail Bill Modal
  const handleOpenDetailModal = async (bill) => {
    try {
      const res = await api.get(`/keuangan/student-bills/${bill.id}`);
      setSelectedBillDetail(res.data?.data || bill);
      setDetailModalOpen(true);
    } catch (e) {
      setSelectedBillDetail(bill);
      setDetailModalOpen(true);
    }
  };

  // Open Revise Modal
  const handleOpenReviseModal = (bill) => {
    setRevisingBill(bill);
    setReviseFormData({
      new_amount: bill.amount || 0,
      new_discount_amount: bill.discount_amount || 0,
      revision_reason: '',
      new_due_date: bill.due_date || ''
    });
    setReviseModalOpen(true);
  };

  const handleSaveReviseBill = async (e) => {
    e.preventDefault();
    if (!revisingBill) return;

    if (!reviseFormData.revision_reason.trim()) {
      alert('Alasan revisi tagihan wajib diisi');
      return;
    }

    setSubmittingRevise(true);
    try {
      await api.post(`/keuangan/student-bills/${revisingBill.id}/revise`, {
        new_amount: parseFloat(reviseFormData.new_amount || 0),
        new_discount_amount: parseFloat(reviseFormData.new_discount_amount || 0),
        revision_reason: reviseFormData.revision_reason.trim(),
        new_due_date: reviseFormData.new_due_date || null
      });

      alert(`Tagihan #${revisingBill.id} berhasil direvisi.`);
      setReviseModalOpen(false);
      setRevisingBill(null);
      fetchHistoryBills();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal merevisi tagihan');
    } finally {
      setSubmittingRevise(false);
    }
  };

  // Send single reminder from history
  const handleSendSingleReminder = async (bill) => {
    setSendingSingleReminderId(bill.id);
    try {
      await api.post(`/keuangan/student-bills/${bill.id}/reminders`, {
        channel: 'portal_notification'
      });
      alert(`Pengingat tagihan #${bill.id} (${bill.student_name}) berhasil dikirimkan ke Portal Orang Tua.`);
      if (activeTab === 'reminders') fetchReminderLogs();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal mengirimkan pengingat');
    } finally {
      setSendingSingleReminderId(null);
    }
  };

  // ============================================================
  // TAB 3: REMINDER BROADCAST HANDLERS
  // ============================================================
  const handleOpenBroadcastModal = () => {
    // Collect candidate bills based on broadcastFilterMode
    const overdueBills = historyBills.filter((b) => b.status === 'unpaid' && b.due_date && new Date(b.due_date) < new Date());
    const unpaidBills = historyBills.filter((b) => b.status === 'unpaid' || b.status === 'partially_paid');

    const targetList = broadcastFilterMode === 'overdue' ? overdueBills : unpaidBills;
    setBroadcastSelectedBillIds(targetList.map((b) => b.id));
    setBroadcastCustomMessage('');
    setBroadcastModalOpen(true);
  };

  const handleExecuteBroadcastReminders = async () => {
    if (broadcastSelectedBillIds.length === 0) {
      alert('Pilih minimal 1 tagihan untuk broadcast reminder');
      return;
    }

    setSubmittingBroadcast(true);
    try {
      const res = await api.post('/keuangan/student-bills/reminders/broadcast', {
        bill_ids: broadcastSelectedBillIds,
        channel: 'portal_notification',
        custom_message: broadcastCustomMessage.trim() || undefined
      });

      alert(res.data?.message || 'Broadcast reminder berhasil dikirim');
      setBroadcastModalOpen(false);
      fetchReminderLogs();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal mengirimkan broadcast reminder');
    } finally {
      setSubmittingBroadcast(false);
    }
  };

  // ============================================================
  // TAB 3: REMINDER LOGS SORTING & FILTERING
  // ============================================================
  const handleSortReminders = (key) => {
    setReminderSortConfig((prev) => {
      if (prev.key === key) {
        return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { key, direction: 'asc' };
    });
  };

  const filteredAndSortedReminderLogs = useMemo(() => {
    let list = [...reminderLogs];
    if (reminderSearch.trim()) {
      const q = reminderSearch.toLowerCase();
      list = list.filter(
        (l) =>
          l.student_name?.toLowerCase().includes(q) ||
          l.recipient_name?.toLowerCase().includes(q) ||
          l.fee_type_name?.toLowerCase().includes(q) ||
          l.message?.toLowerCase().includes(q) ||
          l.class_name?.toLowerCase().includes(q) ||
          l.nis?.toLowerCase().includes(q)
      );
    }

    if (reminderSortConfig.key) {
      list.sort((a, b) => {
        let aVal = a[reminderSortConfig.key];
        let bVal = b[reminderSortConfig.key];

        if (reminderSortConfig.key === 'sent_at' || reminderSortConfig.key === 'created_at') {
          aVal = new Date(aVal || 0).getTime();
          bVal = new Date(bVal || 0).getTime();
        } else if (reminderSortConfig.key === 'bill_amount') {
          aVal = parseFloat(aVal || 0);
          bVal = parseFloat(bVal || 0);
        } else if (typeof aVal === 'string') {
          return reminderSortConfig.direction === 'asc'
            ? aVal.localeCompare(bVal || '')
            : (bVal || '').localeCompare(aVal);
        }

        if (aVal < bVal) return reminderSortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return reminderSortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return list;
  }, [reminderLogs, reminderSearch, reminderSortConfig]);

  // Current active AY object
  const activeAY = academicYears.find((a) => String(a.id) === String(selectedAcademicYearId)) || academicYears[0];

  return (
    <div className="p-4 sm:p-5 max-w-[1600px] mx-auto space-y-4 pb-20">
      {/* ------------------------------------------------------------ */}
      {/* HEADER UTAMA & KONTROL TAHUN AJARAN */}
      {/* ------------------------------------------------------------ */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 bg-white p-3.5 rounded-lg border border-slate-200/80 shadow-xs relative z-40">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-xs shrink-0">
            <Receipt className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-slate-800 tracking-tight">Penagihan Siswa</h1>
              <StatusPill variant="info" size="sm">
                {activeSchoolUnit?.name || 'Semua Unit'}
              </StatusPill>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Matriks penetapan biaya 12 bulan (Juli-Juni), penerbitan piutang santri, audit riwayat &amp; reminder portal orang tua.
            </p>
          </div>
        </div>

        {/* Global Academic Year Switcher */}
        <div className="flex items-center gap-2 self-stretch sm:self-auto bg-slate-50 p-1 rounded-lg border border-slate-200 relative z-40">
          <Calendar className="w-4 h-4 text-slate-400 ml-1.5 shrink-0" />
          <div className="min-w-[220px] relative z-40">
            <SearchableSelect
              options={academicYears.map((ay) => ({
                value: String(ay.id),
                label: `T.A. ${ay.name} ${ay.is_active ? '★ Aktif' : ''}`,
                sublabel: ay.is_active ? 'Tahun Ajaran Berjalan' : 'Tahun Ajaran Arsip'
              }))}
              value={String(selectedAcademicYearId || '')}
              onChange={(val) => {
                const sVal = String(val || '');
                setSelectedAcademicYearId(sVal);
                try {
                  localStorage.setItem('keuangan_bills_selected_ay_id', sVal);
                  localStorage.setItem('keuangan_payments_selected_ay', sVal);
                } catch (e) {
                  // ignore
                }
              }}
              placeholder="Pilih Tahun Ajaran"
              allowClear={false}
              menuMinWidth="260px"
              dropdownPosition="down"
              dropdownAlign="right"
            />
          </div>
          <button
            type="button"
            onClick={() => {
              if (activeTab === 'matrix') fetchMatrixData();
              else if (activeTab === 'alumni') fetchAlumniData();
              else if (activeTab === 'history') fetchHistoryBills();
              else if (activeTab === 'reminders') fetchReminderLogs();
            }}
            title="Muat ulang data"
            className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-white rounded-md transition border border-transparent hover:border-slate-200"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------ */}
      {/* 4 TAB NAVIGATION */}
      {/* ------------------------------------------------------------ */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-200 pb-0">
        <div className="flex flex-wrap items-center gap-1">
          <button
            type="button"
            onClick={() => setActiveTab('matrix')}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-t-lg transition border-b-2 ${
              activeTab === 'matrix'
                ? 'border-emerald-600 text-emerald-700 font-bold bg-emerald-50/50'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>1. Tagihan &amp; Matriks Biaya</span>
            {matrixData.rows.length > 0 && (
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${activeTab === 'matrix' ? 'bg-emerald-100 text-emerald-800 font-bold' : 'bg-slate-100 text-slate-600'}`}>
                {matrixData.rows.length} Santri
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('alumni')}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-t-lg transition border-b-2 ${
              activeTab === 'alumni'
                ? 'border-emerald-600 text-emerald-700 font-bold bg-emerald-50/50'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <GraduationCap className="w-3.5 h-3.5" />
            <span>2. Tagihan Santri Alumni</span>
            {(alumniData.summary?.total_alumni_with_arrears !== undefined || alumniData.alumni?.length > 0) && (
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${activeTab === 'alumni' ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-600'}`}>
                {alumniData.summary?.total_alumni_with_arrears || alumniData.alumni?.length || 0} Alumni
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-t-lg transition border-b-2 ${
              activeTab === 'history'
                ? 'border-emerald-600 text-emerald-700 font-bold bg-emerald-50/50'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>3. Riwayat Tagihan</span>
            {historyBills.length > 0 && (
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${activeTab === 'history' ? 'bg-emerald-100 text-emerald-800 font-bold' : 'bg-slate-100 text-slate-600'}`}>
                {historyBills.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('reminders')}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-t-lg transition border-b-2 ${
              activeTab === 'reminders'
                ? 'border-emerald-600 text-emerald-700 font-bold bg-emerald-50/50'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Bell className="w-3.5 h-3.5" />
            <span>4. Reminder Tagihan (Portal Ortu)</span>
            {reminderLogs.length > 0 && (
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${activeTab === 'reminders' ? 'bg-emerald-100 text-emerald-800 font-bold' : 'bg-slate-100 text-slate-600'}`}>
                {reminderLogs.length} Log
              </span>
            )}
          </button>
        </div>

        {/* Tab-specific top right actions */}
        <div className="flex items-center gap-2 self-end sm:self-auto mb-1">
          {activeTab === 'reminders' && (
            <button
              type="button"
              onClick={handleOpenBroadcastModal}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold shadow-xs transition"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Kirim Reminder Massal</span>
            </button>
          )}
        </div>
      </div>

      {/* ============================================================ */}
      {/* TAB 1: TAGIHAN (MATRIKS PENETAPAN & PENERBITAN BULANAN) */}
      {/* ============================================================ */}
      {activeTab === 'matrix' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          {/* Summary & KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5">
            {/* Card 1: Total Tagihan Terbit */}
            <div className="p-3.5 rounded-2xl bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-900 text-white border border-indigo-700/60 shadow-md relative overflow-hidden group hover:shadow-xl hover:scale-[1.02] transition-all duration-200">
              <div className="absolute -right-6 -bottom-6 w-20 h-20 bg-indigo-500/20 rounded-full blur-xl group-hover:bg-indigo-500/30 transition-all pointer-events-none" />
              <div className="flex items-center justify-between gap-2 relative z-10">
                <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-300">Tagihan Terbit</div>
                <div className="w-7 h-7 rounded-lg bg-white/10 border border-white/15 flex items-center justify-center text-indigo-200 shadow-inner shrink-0 group-hover:scale-110 transition-transform">
                  <FileCheck className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="mt-2 text-lg lg:text-xl font-black text-white tracking-tight relative z-10 truncate" title={formatCurrency(matrixData.summary?.total_published_amount || 0)}>
                {formatCurrency(matrixData.summary?.total_published_amount || 0)}
              </div>
              <div className="mt-1 relative z-10 flex items-center justify-between text-[11px] text-indigo-200">
                <span>{formatNumber(matrixData.summary?.total_published_bills || 0)} tagihan resmi</span>
              </div>
            </div>

            {/* Card 2: Total Belum Terbit */}
            <div className="p-3.5 rounded-2xl bg-gradient-to-br from-amber-500/20 via-amber-50 to-orange-100/70 border border-amber-300 text-amber-950 shadow-sm relative overflow-hidden group hover:shadow-md hover:scale-[1.02] transition-all duration-200">
              <div className="absolute -right-6 -bottom-6 w-20 h-20 bg-amber-500/20 rounded-full blur-xl group-hover:bg-amber-500/30 transition-all pointer-events-none" />
              <div className="flex items-center justify-between gap-2 relative z-10">
                <div className="text-[10px] font-bold uppercase tracking-wider text-amber-900">Belum Terbit</div>
                <div className="w-7 h-7 rounded-lg bg-amber-500 text-white flex items-center justify-center shadow-md shadow-amber-500/30 shrink-0 group-hover:scale-110 transition-transform">
                  <Clock className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="mt-2 text-lg lg:text-xl font-black text-amber-950 tracking-tight relative z-10 truncate" title={formatCurrency(matrixData.summary?.total_unpublished_amount || 0)}>
                {formatCurrency(matrixData.summary?.total_unpublished_amount || 0)}
              </div>
              <div className="mt-1 relative z-10 flex items-center justify-between text-[11px] text-amber-800 font-medium">
                <span>{formatNumber(matrixData.summary?.total_unpublished_bills || 0)} pos draf acuan</span>
              </div>
            </div>

            {/* Card 3: Pembayaran Masuk */}
            <div className="p-3.5 rounded-2xl bg-gradient-to-br from-emerald-500/20 via-emerald-50 to-teal-100/70 border border-emerald-300 text-emerald-950 shadow-sm relative overflow-hidden group hover:shadow-md hover:scale-[1.02] transition-all duration-200">
              <div className="absolute -right-6 -bottom-6 w-20 h-20 bg-emerald-500/20 rounded-full blur-xl group-hover:bg-emerald-500/30 transition-all pointer-events-none" />
              <div className="flex items-center justify-between gap-2 relative z-10">
                <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-900">Kas Diterima</div>
                <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/30 shrink-0 group-hover:scale-110 transition-transform">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="mt-2 text-lg lg:text-xl font-black text-emerald-950 tracking-tight relative z-10 truncate" title={formatCurrency(matrixData.summary?.total_paid || 0)}>
                {formatCurrency(matrixData.summary?.total_paid || 0)}
              </div>
              <div className="mt-1 relative z-10 flex items-center justify-between text-[11px] text-emerald-800 font-medium">
                <span>Kas/Bank lunas</span>
              </div>
            </div>

            {/* Card 4: Sisa Piutang T.A. Ini */}
            <div className="p-3.5 rounded-2xl bg-gradient-to-br from-rose-500/20 via-rose-50 to-red-100/70 border border-rose-300 text-rose-950 shadow-sm relative overflow-hidden group hover:shadow-md hover:scale-[1.02] transition-all duration-200">
              <div className="absolute -right-6 -bottom-6 w-20 h-20 bg-rose-500/20 rounded-full blur-xl group-hover:bg-rose-500/30 transition-all pointer-events-none" />
              <div className="flex items-center justify-between gap-2 relative z-10">
                <div className="text-[10px] font-bold uppercase tracking-wider text-rose-900">Sisa Piutang</div>
                <div className="w-7 h-7 rounded-lg bg-rose-600 text-white flex items-center justify-center shadow-md shadow-rose-600/30 shrink-0 group-hover:scale-110 transition-transform">
                  <AlertCircle className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="mt-2 text-lg lg:text-xl font-black text-rose-950 tracking-tight relative z-10 truncate" title={formatCurrency(matrixData.summary?.total_unpaid_ar || 0)}>
                {formatCurrency(matrixData.summary?.total_unpaid_ar || 0)}
              </div>
              <div className="mt-1 relative z-10 flex items-center justify-between text-[11px] text-rose-800 font-medium">
                <span>Tagihan belum bayar</span>
              </div>
            </div>

            {/* Card 5: Tunggakan TP Lalu */}
            <div className="p-3.5 rounded-2xl bg-gradient-to-br from-purple-500/20 via-purple-50 to-indigo-100/70 border border-purple-300 text-purple-950 shadow-sm relative overflow-hidden group hover:shadow-md hover:scale-[1.02] transition-all duration-200">
              <div className="absolute -right-6 -bottom-6 w-20 h-20 bg-purple-500/20 rounded-full blur-xl group-hover:bg-purple-500/30 transition-all pointer-events-none" />
              <div className="flex items-center justify-between gap-2 relative z-10">
                <div className="text-[10px] font-bold uppercase tracking-wider text-purple-900">Tunggakan Lalu</div>
                <div className="w-7 h-7 rounded-lg bg-purple-600 text-white flex items-center justify-center shadow-md shadow-purple-600/30 shrink-0 group-hover:scale-110 transition-transform">
                  <History className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="mt-2 text-lg lg:text-xl font-black text-purple-950 tracking-tight relative z-10 truncate" title={formatCurrency(matrixData.summary?.total_previous_arrears || 0)}>
                {formatCurrency(matrixData.summary?.total_previous_arrears || 0)}
              </div>
              <div className="mt-1 relative z-10 flex items-center justify-between text-[11px] text-purple-800 font-medium">
                <span>Akumulasi sisa T.P. lalu</span>
              </div>
            </div>

            {/* Card 6: Total Siswa */}
            <div className="p-3.5 rounded-2xl bg-gradient-to-br from-sky-500/20 via-sky-50 to-cyan-100/70 border border-sky-300 text-sky-950 shadow-sm relative overflow-hidden group hover:shadow-md hover:scale-[1.02] transition-all duration-200">
              <div className="absolute -right-6 -bottom-6 w-20 h-20 bg-sky-500/20 rounded-full blur-xl group-hover:bg-sky-500/30 transition-all pointer-events-none" />
              <div className="flex items-center justify-between gap-2 relative z-10">
                <div className="text-[10px] font-bold uppercase tracking-wider text-sky-900">Total Santri</div>
                <div className="w-7 h-7 rounded-lg bg-sky-600 text-white flex items-center justify-center shadow-md shadow-sky-600/30 shrink-0 group-hover:scale-110 transition-transform">
                  <Users className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="mt-2 text-lg lg:text-xl font-black text-sky-950 tracking-tight relative z-10">
                {formatNumber(matrixData.summary?.total_students || 0)} <span className="text-xs font-semibold text-sky-700">Santri</span>
              </div>
              <div className="mt-1 relative z-10 flex items-center justify-between text-[11px] text-sky-800 font-medium">
                <span>T.A. {activeAY?.name || '-'}</span>
              </div>
            </div>
          </div>

          {/* Matrix Controls & Filter Bar */}
          <div className="bg-white p-3 rounded-lg border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-3 relative z-20">
            <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Cari santri, NIS, NIPD..."
                  value={matrixSearch}
                  onChange={(e) => setMatrixSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-emerald-500 transition"
                />
              </div>

              <div className="w-full sm:w-56">
                <SearchableSelect
                  options={[
                    { value: '', label: '-- Semua Rombel / Kelas --' },
                    ...classGroups.map((c) => ({ value: c.id, label: c.name, sublabel: `Rombel ID ${c.id}` }))
                  ]}
                  value={matrixFilterClassId}
                  onChange={(val) => setMatrixFilterClassId(val)}
                  placeholder="Filter Rombel"
                  searchPlaceholder="Cari kelas..."
                />
              </div>
            </div>

            {/* Selection Status & Action Badge */}
            <div className="flex items-center gap-2 w-full md:w-auto justify-between md:justify-end">
              {selectedRowStudentIds.size > 0 ? (
                <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-800 px-3 py-1 rounded-lg text-xs font-semibold animate-in fade-in">
                  <CheckSquare className="w-4 h-4 text-emerald-600" />
                  <span>{selectedRowStudentIds.size} santri terpilih</span>
                  <button
                    type="button"
                    onClick={() => setSelectedRowStudentIds(new Set())}
                    className="text-emerald-700 hover:text-emerald-900 underline text-[11px] ml-1"
                  >
                    Batal
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-slate-400 text-xs font-medium">
                  <Info className="w-3.5 h-3.5" />
                  <span>Pilih baris santri atau klik tombol kolom untuk terbitkan massal</span>
                </div>
              )}
            </div>
          </div>

          {/* Matrix Table with Horizontal & Vertical Scroll and Sticky Frozen Columns */}
          <div className="bg-white rounded-lg border border-slate-200/80 shadow-xs overflow-hidden relative">
            {/* Status Legend Bar */}
            <div className="px-3.5 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-2 flex-wrap text-[11px] text-slate-600">
              <div className="flex items-center gap-1.5 font-semibold text-slate-700">
                <span>🎨 Status Sel:</span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <StatusPill variant="success" size="sm" dot>Lunas</StatusPill>
                <StatusPill variant="info" size="sm" dot>Terbit</StatusPill>
                <StatusPill variant="info" size="sm" dot>Sebagian</StatusPill>
                <StatusPill variant="danger" size="sm" dot>Jatuh Tempo</StatusPill>
                <StatusPill variant="warning" size="sm" dot>Belum Ditagihkan (&gt; Rp 0)</StatusPill>
                <StatusPill variant="neutral" size="sm" dot>Rp 0</StatusPill>
              </div>
            </div>

            {matrixLoading ? (
              <div className="p-16 text-center text-slate-400">
                <Loader2 className="w-8 h-8 animate-spin mx-auto text-emerald-600 mb-2" />
                <p className="text-xs font-medium">Menyusun matriks tagihan santri 12 bulan...</p>
              </div>
            ) : matrixData.rows.length === 0 ? (
              <div className="p-16 text-center text-slate-400">
                <Users className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                <p className="text-xs font-bold text-slate-700">Tidak ada data santri</p>
                <p className="text-[11px] text-slate-400 mt-1">Pastikan Tahun Ajaran dan Satuan Pendidikan telah memiliki daftar santri aktif.</p>
              </div>
            ) : (
              <div className="table-container max-h-[680px]">
                <table className="w-full text-left text-xs border-collapse border-separate border-spacing-0">
                  <thead className="bg-slate-100 text-slate-700 font-bold sticky top-0 z-20 border-b border-slate-200 shadow-2xs">
                    <tr>
                      {/* Fixed Left Header 1: Checkbox (44px) */}
                      <th className="px-3 py-2.5 w-[44px] min-w-[44px] max-w-[44px] text-center sticky left-0 z-30 bg-slate-100 border-r border-b border-slate-200">
                        <input
                          type="checkbox"
                          checked={selectedRowStudentIds.size === matrixData.rows.length && matrixData.rows.length > 0}
                          onChange={handleToggleSelectAllRows}
                          className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                        />
                      </th>

                      {/* Fixed Left Header 2: Nama Siswa (260px, left: 44px) */}
                      <th
                        onClick={() => handleSortMatrix('name')}
                        className="px-3 py-2.5 w-[260px] min-w-[260px] max-w-[260px] text-left sticky left-[44px] z-30 bg-slate-100 border-r border-b border-slate-200 font-bold text-slate-800 cursor-pointer hover:bg-slate-200/90 transition select-none group"
                        title="Klik untuk mengurutkan berdasarkan nama santri"
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span>Nama Santri</span>
                          {matrixSortConfig.key === 'name' ? (
                            matrixSortConfig.direction === 'asc' ? (
                              <ArrowUp className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            ) : (
                              <ArrowDown className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            )
                          ) : (
                            <ArrowUpDown className="w-3 h-3 text-slate-400 group-hover:text-slate-600 shrink-0" />
                          )}
                        </div>
                      </th>

                      {/* Fixed Left Header 3: Rombel (100px, left: 304px) */}
                      <th
                        onClick={() => handleSortMatrix('class_name')}
                        className="px-3 py-2.5 w-[100px] min-w-[100px] max-w-[100px] text-left sticky left-[304px] z-30 bg-slate-100 border-r border-b border-slate-200 cursor-pointer hover:bg-slate-200/90 transition select-none group"
                        title="Klik untuk mengurutkan berdasarkan rombel"
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span>Rombel</span>
                          {matrixSortConfig.key === 'class_name' ? (
                            matrixSortConfig.direction === 'asc' ? (
                              <ArrowUp className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            ) : (
                              <ArrowDown className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            )
                          ) : (
                            <ArrowUpDown className="w-3 h-3 text-slate-400 group-hover:text-slate-600 shrink-0" />
                          )}
                        </div>
                      </th>

                      {/* Fixed Left Header 4: Tunggakan TP Sebelumnya (145px, left: 404px) */}
                      <th
                        className="px-3 py-2.5 w-[145px] min-w-[145px] max-w-[145px] text-right sticky left-[404px] z-30 bg-slate-100 border-r border-b border-slate-200 shadow-[3px_0_6px_-2px_rgba(0,0,0,0.12)] align-top group hover:bg-slate-200/90 transition"
                      >
                        <div className="flex flex-col items-center gap-1">
                          <div
                            onClick={() => handleSortMatrix('previous_arrears')}
                            className="w-full flex items-center justify-between gap-1 cursor-pointer select-none rounded-lg p-1 hover:bg-slate-200/60 transition group/sort"
                            title="Klik untuk mengurutkan berdasarkan sisa tunggakan tahun pelajaran sebelumnya"
                          >
                            <div className="flex flex-col text-left">
                              <span className="text-[11px] font-bold text-slate-800 leading-tight">Tunggakan TP</span>
                              <span className="text-[10px] text-slate-500 font-normal">Sebelumnya</span>
                            </div>
                            {matrixSortConfig.key === 'previous_arrears' ? (
                              matrixSortConfig.direction === 'asc' ? (
                                <ArrowUp className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              ) : (
                                <ArrowDown className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              )
                            ) : (
                              <ArrowUpDown className="w-3 h-3 text-slate-400 group-hover/sort:text-slate-600 shrink-0" />
                            )}
                          </div>

                          {/* Tombol Aksi Kolom Tunggakan TP Sebelumnya: Terbitkan */}
                          <div className="mt-1.5 w-full flex items-center gap-1">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenArrearsColumnPublish();
                              }}
                              title="Terbitkan tagihan tunggakan TP sebelumnya ke piutang siswa"
                              className="w-full flex items-center justify-center gap-1 py-1 px-1.5 rounded-md bg-white border border-purple-300 hover:border-purple-600 hover:bg-purple-50 text-slate-700 hover:text-purple-700 text-[10px] font-semibold transition shadow-xs"
                            >
                              <Zap className="w-3 h-3 text-purple-600" />
                              <span>Terbitkan</span>
                            </button>
                          </div>
                        </div>
                      </th>

                      {/* Dynamic Columns: Sekali Bayar, Tahunan, Bulanan (Juli-Juni) */}
                      {matrixData.columns.map((col) => (
                        <th
                          key={col.key}
                          className="px-3 py-2.5 min-w-[155px] text-center border-r border-b border-slate-200 align-top group hover:bg-slate-100/90 transition"
                        >
                          <div className="flex flex-col items-center gap-1">
                            <div
                              onClick={() => handleSortMatrix(col.key)}
                              className="w-full flex flex-col items-center cursor-pointer select-none rounded-lg p-1 hover:bg-slate-200/60 transition group/sort"
                              title={`Klik untuk mengurutkan santri berdasarkan kolom ${col.fee_type_name}`}
                            >
                              <div className="flex items-center gap-1">
                                <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border uppercase ${col.badge_color}`}>
                                  {col.badge_text}
                                </span>
                                {col.semester && (
                                  <span className="text-[9px] text-slate-400 font-medium">({col.semester})</span>
                                )}
                                {matrixSortConfig.key === col.key ? (
                                  matrixSortConfig.direction === 'asc' ? (
                                    <ArrowUp className="w-3 h-3 text-emerald-600 ml-0.5" />
                                  ) : (
                                    <ArrowDown className="w-3 h-3 text-emerald-600 ml-0.5" />
                                  )
                                ) : (
                                  <ArrowUpDown className="w-2.5 h-2.5 text-slate-300 group-hover/sort:text-slate-600 ml-0.5" />
                                )}
                              </div>
                              <span className="font-semibold text-slate-800 text-[11px] mt-0.5 text-center line-clamp-1">{col.fee_type_name}</span>
                              <span className="text-[10px] text-slate-500 font-normal">T.A. {col.period_year}</span>
                            </div>

                            {/* Tombol Aksi Kolom: Terbitkan & Import Excel */}
                            <div className="mt-1.5 w-full flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleOpenColumnPublishModal(col)}
                                title="Terbitkan tagihan kolom ini"
                                className="flex-1 flex items-center justify-center gap-1 py-1 px-1.5 rounded-md bg-white border border-slate-300 hover:border-emerald-500 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 text-[10px] font-semibold transition shadow-xs"
                              >
                                <Zap className="w-3 h-3 text-emerald-600" />
                                <span>Terbitkan</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenImportModal(col)}
                                title="Import data Excel & Unduh format kolom ini"
                                className="flex-1 flex items-center justify-center gap-1 py-1 px-1.5 rounded-md bg-white border border-indigo-200 hover:border-indigo-500 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 text-[10px] font-semibold transition shadow-xs"
                              >
                                <FileSpreadsheet className="w-3 h-3 text-indigo-600" />
                                <span>Import</span>
                              </button>
                            </div>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {filteredAndSortedMatrixRows.map((row, rIdx) => {
                      const isRowSelected = selectedRowStudentIds.has(row.student_id);
                      const stickyBg = isRowSelected
                        ? 'bg-[#ecfdf5]'
                        : rIdx % 2 === 1
                          ? 'bg-[#f8fafc]'
                          : 'bg-white';

                      return (
                        <tr
                          key={row.student_id}
                          className={`hover:bg-slate-100/70 transition ${isRowSelected ? 'bg-emerald-50/50' : rIdx % 2 === 1 ? 'bg-slate-50/40' : 'bg-white'}`}
                        >
                          {/* Sticky Cell 1: Checkbox */}
                          <td className={`px-3 py-2.5 w-[44px] min-w-[44px] max-w-[44px] text-center sticky left-0 z-10 ${stickyBg} border-r border-slate-200`}>
                            <input
                              type="checkbox"
                              checked={isRowSelected}
                              onChange={() => handleToggleSelectRow(row.student_id)}
                              className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                            />
                          </td>

                          {/* Sticky Cell 2: Nama Siswa & NIS */}
                          <td className={`px-3 py-2.5 w-[260px] min-w-[260px] max-w-[260px] sticky left-[44px] z-10 ${stickyBg} border-r border-slate-200 truncate`} title={row.name}>
                            <div>
                              <span className="font-bold text-slate-800 text-xs block truncate">{row.name}</span>
                              <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                {row.nipd && (
                                  <span className="font-mono text-[10px] text-slate-600 font-medium bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200/60">
                                    NIS: {row.nipd}
                                  </span>
                                )}
                                {row.scheme_name && (
                                  <span className="text-[10px] text-slate-400 font-normal truncate max-w-[130px]" title={row.scheme_name}>
                                    • {row.scheme_name}
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Sticky Cell 3: Rombel */}
                          <td className={`px-3 py-2.5 w-[100px] min-w-[100px] max-w-[100px] text-slate-600 sticky left-[304px] z-10 ${stickyBg} border-r border-slate-200 text-[11px]`}>
                            <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium">
                              {row.class_name}
                            </span>
                          </td>

                          {/* Sticky Cell 4: Tunggakan TP Sebelumnya */}
                          <td
                            onClick={() => handleOpenArrearsCellModal(row)}
                            className={`p-1.5 w-[145px] min-w-[145px] max-w-[145px] sticky left-[404px] z-10 ${stickyBg} border-r border-slate-200 text-center shadow-[3px_0_6px_-2px_rgba(0,0,0,0.12)] cursor-pointer group select-none`}
                            title={
                              row.previous_arrears > 0
                                ? `Klik untuk menerbitkan / menyesuaikan tagihan tunggakan santri ${row.name}\nTotal: ${formatCurrency(row.previous_arrears || 0)} (${row.previous_arrears_count || 0} tagihan)\n${(row.previous_arrears_items || []).map(it => `• ${it.fee_type_name || (it.is_ppdb ? 'PPDB' : 'Tagihan')}: ${formatCurrency(it.remaining || 0)} (${it.notes || (it.is_manual ? 'Manual' : it.status) || ''})`).join('\n')}`
                                : (row.previous_arrears_items?.length > 0
                                    ? `Tunggakan TP sebelumnya telah lunas untuk santri ${row.name}\n${row.previous_arrears_items.map(it => `• ${it.fee_type_name || 'Tunggakan'}: ${formatCurrency(it.paid || it.amount || 0)} (Lunas)`).join('\n')}\nKlik untuk melihat detail atau mencatat penyesuaian baru.`
                                    : `Tidak ada tunggakan TP sebelumnya untuk santri ${row.name} (Lunas). Klik untuk mencatat/menyesuaikan.`)
                            }
                          >
                            <div
                              className={`p-1.5 rounded-lg border text-center transition-all shadow-xs group-hover:shadow-sm group-hover:scale-[1.02] ${
                                row.previous_arrears > 0
                                  ? (row.previous_arrears_items?.some(it => it.id && it.status !== 'draft' && it.status !== 'cancelled')
                                      ? 'bg-rose-50/90 text-rose-950 border-rose-300 font-bold hover:bg-rose-100/90'
                                      : 'bg-amber-50/80 text-amber-950 border-amber-200/90 hover:border-amber-400 hover:bg-amber-100/70 font-semibold')
                                  : 'bg-emerald-50/90 text-emerald-950 border-emerald-300 hover:bg-emerald-100 font-bold'
                              }`}
                            >
                              {row.previous_arrears > 0 ? (
                                <>
                                  <div className="font-mono tnum text-xs">
                                    {formatCurrency(row.previous_arrears || 0)}
                                  </div>
                                  <div className="flex items-center justify-center gap-1 mt-0.5">
                                    <span
                                      className={`px-1.5 py-0.2 rounded text-[9px] ${
                                        row.previous_arrears_items?.some(it => it.id && it.status !== 'draft' && it.status !== 'cancelled')
                                          ? 'bg-rose-100 text-rose-800 font-bold'
                                          : 'bg-amber-100 text-amber-900 border border-amber-200/70 font-semibold'
                                      }`}
                                    >
                                      {row.previous_arrears_items?.some(it => it.id && it.status !== 'draft' && it.status !== 'cancelled')
                                        ? 'Terbit'
                                        : 'Belum Terbit'}
                                    </span>
                                    <span className="text-[9px] text-slate-500 font-medium">
                                      ({row.previous_arrears_count || 1})
                                    </span>
                                  </div>
                                </>
                              ) : (
                                <>
                                  <div className="font-bold text-emerald-800 text-xs flex items-center justify-center gap-1">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                    <span>Lunas</span>
                                  </div>
                                  <div className="flex items-center justify-center mt-0.5">
                                    <span className="px-1.5 py-0.2 rounded text-[9px] bg-emerald-100 text-emerald-800 font-semibold border border-emerald-200/60 font-mono tnum">
                                      Rp 0
                                    </span>
                                  </div>
                                </>
                              )}
                            </div>
                          </td>

                          {/* Dynamic Matrix Cells */}
                          {matrixData.columns.map((col) => {
                            const cell = row.cells[col.key] || {};
                            const isUnbilled = Boolean(cell.is_unbilled || cell.status === 'cancelled');
                            const isPub = cell.is_published;
                            const isPaid = cell.is_paid;
                            const isPart = cell.is_partially_paid;
                            const isOver = cell.is_overdue;
                            const cellNominal = isUnbilled ? 0 : (cell.amount !== undefined && cell.amount !== null ? Number(cell.amount) : Number(cell.base_amount || 0));

                            let cellStyle = 'bg-white text-slate-700 hover:border-emerald-400 border-slate-200';
                            let badgeText = 'Draf / Acuan';
                            let badgeClass = 'bg-slate-100 text-slate-500';

                            if (isUnbilled) {
                              cellStyle = 'bg-indigo-50/60 text-indigo-900 border-indigo-200/80 hover:border-indigo-400 hover:bg-indigo-100/50';
                              const rTxt = String(cell.unbilled_reason || cell.cancel_reason || cell.notes || '').toLowerCase();
                              badgeText = rTxt.includes('keluar') || rTxt.includes('berhenti')
                                ? 'Bebas / Keluar'
                                : (rTxt.includes('pindah') ? 'Bebas / Pindahan' : 'Tidak Ditagihkan');
                              badgeClass = 'bg-indigo-100 text-indigo-800 font-semibold border border-indigo-200/60';
                            } else if (isPaid) {
                              cellStyle = 'bg-emerald-50/90 text-emerald-950 border-emerald-300 font-bold';
                              badgeText = 'Lunas';
                              badgeClass = 'bg-emerald-100 text-emerald-800 font-bold';
                            } else if (isPart) {
                              cellStyle = 'bg-indigo-50/90 text-indigo-950 border-indigo-300 font-bold';
                              badgeText = 'Sebagian';
                              badgeClass = 'bg-indigo-100 text-indigo-800 font-bold';
                            } else if (isOver) {
                              cellStyle = 'bg-rose-50/90 text-rose-950 border-rose-300 font-bold';
                              badgeText = 'Jatuh Tempo';
                              badgeClass = 'bg-rose-100 text-rose-800 font-bold animate-pulse';
                            } else if (isPub) {
                              cellStyle = 'bg-indigo-50/80 text-indigo-950 border-indigo-300 font-bold';
                              badgeText = 'Terbit';
                              badgeClass = 'bg-indigo-100 text-indigo-800 font-bold';
                            } else {
                              // Belum ditagihkan / belum diterbitkan (Draf Acuan)
                              if (cellNominal > 0) {
                                // Memiliki nominal > 0: Diberi warna lembut (soft amber tint)
                                cellStyle = 'bg-amber-50/80 text-amber-950 border-amber-200/90 hover:border-amber-400 hover:bg-amber-100/70 font-semibold';
                                badgeText = 'Belum Terbit';
                                badgeClass = 'bg-amber-100 text-amber-900 border border-amber-200/70 font-semibold';
                              } else {
                                // Nominal 0: Netral redup
                                cellStyle = 'bg-slate-50/50 text-slate-400 border-slate-200/60 hover:border-slate-300 opacity-60';
                                badgeText = 'Rp 0';
                                badgeClass = 'bg-slate-100 text-slate-400 font-normal';
                              }
                            }

                            return (
                              <td
                                key={col.key}
                                onClick={() => handleOpenCellModal(row, cell)}
                                className="p-1.5 text-center border-r border-slate-100 cursor-pointer group select-none"
                              >
                                <div
                                  className={`p-1.5 rounded-lg border text-center transition-all shadow-xs group-hover:shadow-sm group-hover:scale-[1.02] ${cellStyle}`}
                                >
                                  <div className="font-mono tnum text-xs">
                                    {formatCurrency(cellNominal)}
                                  </div>
                                  <div className="flex items-center justify-center gap-1 mt-0.5">
                                    <span className={`px-1.5 py-0.2 rounded text-[9px] ${badgeClass}`}>
                                      {badgeText}
                                    </span>
                                    {cell.is_custom && (
                                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500" title={`Keringanan/Khusus: ${cell.custom_note}`} />
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

      {/* ============================================================ */}
      {/* TAB 2: TAGIHAN SANTRI ALUMNI (READ-ONLY / DISPLAY ONLY) */}
      {/* ============================================================ */}
      {activeTab === 'alumni' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          {/* Header & Status Banner */}
          <FlatAlertBanner
            variant="warning"
            icon={GraduationCap}
            title="Data Piutang & Sisa Tunggakan Alumni — Mode Pemantauan (Display Only)"
            message="Menampilkan saldo tunggakan historis santri yang telah lulus. Tidak ada proses penagihan baru karena sudah ditagihkan saat santri masih aktif."
          />

          {/* KPI Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {/* Card 1: Alumni Menunggak */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-500/20 via-amber-50 to-orange-100/70 border border-amber-300 text-amber-950 shadow-sm relative overflow-hidden group hover:shadow-md hover:scale-[1.02] transition-all duration-200">
              <div className="absolute -right-6 -bottom-6 w-20 h-20 bg-amber-500/20 rounded-full blur-xl group-hover:bg-amber-500/30 transition-all pointer-events-none" />
              <div className="flex items-center justify-between gap-2 relative z-10">
                <div className="text-[11px] font-bold uppercase tracking-wider text-amber-900">Alumni Menunggak</div>
                <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-md shadow-amber-500/30 shrink-0 group-hover:scale-110 transition-transform">
                  <Users className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2 text-2xl font-black text-amber-950 tracking-tight relative z-10">
                {alumniData.summary?.total_alumni_with_arrears || 0} <span className="text-xs font-semibold text-amber-700">orang</span>
              </div>
              <p className="text-[11px] text-amber-800 mt-1 font-medium relative z-10">Santri lulus dengan sisa kewajiban</p>
            </div>

            {/* Card 2: Sisa Tunggakan Alumni */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-rose-500/20 via-rose-50 to-red-100/70 border border-rose-300 text-rose-950 shadow-sm relative overflow-hidden group hover:shadow-md hover:scale-[1.02] transition-all duration-200">
              <div className="absolute -right-6 -bottom-6 w-20 h-20 bg-rose-500/20 rounded-full blur-xl group-hover:bg-rose-500/30 transition-all pointer-events-none" />
              <div className="flex items-center justify-between gap-2 relative z-10">
                <div className="text-[11px] font-bold uppercase tracking-wider text-rose-900">Sisa Tunggakan Alumni</div>
                <div className="w-8 h-8 rounded-xl bg-rose-600 text-white flex items-center justify-center shadow-md shadow-rose-600/30 shrink-0 group-hover:scale-110 transition-transform">
                  <AlertCircle className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2 text-2xl font-black text-rose-950 tracking-tight relative z-10 truncate" title={formatCurrency(alumniData.summary?.total_arrears_amount || 0)}>
                {formatCurrency(alumniData.summary?.total_arrears_amount || 0)}
              </div>
              <p className="text-[11px] text-rose-800 mt-1 font-medium relative z-10">Total piutang tak tertagih berjalan</p>
            </div>

            {/* Card 3: Total Tagihan Dilunasi */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-500/20 via-emerald-50 to-teal-100/70 border border-emerald-300 text-emerald-950 shadow-sm relative overflow-hidden group hover:shadow-md hover:scale-[1.02] transition-all duration-200">
              <div className="absolute -right-6 -bottom-6 w-20 h-20 bg-emerald-500/20 rounded-full blur-xl group-hover:bg-emerald-500/30 transition-all pointer-events-none" />
              <div className="flex items-center justify-between gap-2 relative z-10">
                <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-900">Tagihan Dilunasi</div>
                <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/30 shrink-0 group-hover:scale-110 transition-transform">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2 text-2xl font-black text-emerald-950 tracking-tight relative z-10 truncate" title={formatCurrency(alumniData.summary?.total_paid_amount || 0)}>
                {formatCurrency(alumniData.summary?.total_paid_amount || 0)}
              </div>
              <p className="text-[11px] text-emerald-800 mt-1 font-medium relative z-10">Penerimaan kas dari alumni</p>
            </div>

            {/* Card 4: Total Keseluruhan Piutang */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-white border border-slate-700/80 shadow-md relative overflow-hidden group hover:shadow-xl hover:scale-[1.02] transition-all duration-200">
              <div className="absolute -right-6 -bottom-6 w-20 h-20 bg-indigo-500/20 rounded-full blur-xl group-hover:bg-indigo-500/30 transition-all pointer-events-none" />
              <div className="flex items-center justify-between gap-2 relative z-10">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-300">Total Keseluruhan Piutang</div>
                <div className="w-8 h-8 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center text-indigo-300 shadow-inner shrink-0 group-hover:scale-110 transition-transform">
                  <Receipt className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2 text-2xl font-black text-white tracking-tight relative z-10 truncate" title={formatCurrency(alumniData.summary?.total_bills_amount || 0)}>
                {formatCurrency(alumniData.summary?.total_bills_amount || 0)}
              </div>
              <p className="text-[11px] text-slate-300 mt-1 relative z-10">Akumulasi seluruh tagihan alumni</p>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="bg-white p-3 rounded-lg border border-slate-200/80 shadow-xs grid grid-cols-1 sm:grid-cols-3 gap-3 relative z-20">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari nama alumni, NIS, NIPD..."
                value={alumniSearch}
                onChange={(e) => setAlumniSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-emerald-500 transition"
              />
            </div>

            <div>
              <SearchableSelect
                options={[
                  { value: '', label: '-- Semua Angkatan / Cohort --' },
                  ...(alumniData.cohorts || []).map((co) => ({
                    value: String(co.id),
                    label: co.name || `Angkatan ${co.id}`
                  }))
                ]}
                value={alumniFilterCohortId}
                onChange={(val) => setAlumniFilterCohortId(val)}
                placeholder="Filter Angkatan"
              />
            </div>

            <div>
              <SearchableSelect
                options={[
                  { value: 'with_arrears', label: 'Hanya yang Menunggak', sublabel: 'Memiliki sisa tagihan > 0' },
                  { value: 'all', label: 'Semua Status Alumni', sublabel: 'Tampilkan semua data' },
                  { value: 'unpaid', label: 'Belum Bayar Sama Sekali', sublabel: 'Belum ada pembayaran' },
                  { value: 'partially_paid', label: 'Sebagian Terbayar', sublabel: 'Sudah mencicil sebagian' },
                  { value: 'paid', label: 'Lunas', sublabel: 'Telah selesai seluruhnya' }
                ]}
                value={alumniFilterStatus}
                onChange={(val) => setAlumniFilterStatus(val)}
                placeholder="Filter Status Tunggakan"
              />
            </div>
          </div>

          {/* Table Data Tagihan Alumni */}
          <div className="bg-white rounded-lg border border-slate-200/80 shadow-xs overflow-hidden">
            {alumniLoading ? (
              <div className="p-16 text-center text-slate-400">
                <Loader2 className="w-8 h-8 animate-spin mx-auto text-emerald-600 mb-2" />
                <p className="text-xs font-medium">Memuat data tagihan alumni...</p>
              </div>
            ) : sortedAlumniList.length === 0 ? (
              <div className="p-16 text-center text-slate-400">
                <GraduationCap className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                <p className="text-xs font-bold text-slate-700">Tidak ada data tagihan alumni</p>
                <p className="text-[11px] text-slate-400 mt-1">
                  {alumniFilterStatus === 'with_arrears'
                    ? 'Alhamdulillah, tidak ada santri alumni yang memiliki sisa tunggakan untuk kriteria filter ini.'
                    : 'Tidak ada data alumni ditemukan dengan filter yang dipilih.'}
                </p>
              </div>
            ) : (
              <div className="table-container max-h-[700px]">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50/95 backdrop-blur text-slate-700 font-bold sticky top-0 z-10 border-b border-slate-200 shadow-2xs select-none">
                    <tr>
                      <th className="px-3 py-2.5 w-12 text-center">No</th>
                      <th
                        onClick={() => handleSortAlumni('full_name')}
                        className="px-3 py-2.5 cursor-pointer hover:bg-slate-100 transition group min-w-[220px]"
                        title="Klik untuk mengurutkan nama"
                      >
                        <div className="flex items-center gap-1.5">
                          <span>Identitas Santri Alumni</span>
                          <ArrowUpDown className="w-3 h-3 text-slate-400 group-hover:text-slate-600" />
                        </div>
                      </th>
                      <th className="px-3 py-2.5 min-w-[150px]">Tahun Lulus / Rombel</th>
                      <th className="px-3 py-2.5 min-w-[180px]">Pos Biaya Menunggak</th>
                      <th
                        onClick={() => handleSortAlumni('total_bills')}
                        className="px-3 py-2.5 text-right cursor-pointer hover:bg-slate-100 transition group min-w-[120px]"
                      >
                        <div className="flex items-center justify-end gap-1.5">
                          <span>Total Tagihan</span>
                          <ArrowUpDown className="w-3 h-3 text-slate-400 group-hover:text-slate-600" />
                        </div>
                      </th>
                      <th
                        onClick={() => handleSortAlumni('total_paid')}
                        className="px-3 py-2.5 text-right cursor-pointer hover:bg-slate-100 transition group min-w-[120px]"
                      >
                        <div className="flex items-center justify-end gap-1.5">
                          <span>Terbayar</span>
                          <ArrowUpDown className="w-3 h-3 text-slate-400 group-hover:text-slate-600" />
                        </div>
                      </th>
                      <th
                        onClick={() => handleSortAlumni('total_remaining')}
                        className="px-3 py-2.5 text-right cursor-pointer hover:bg-slate-100 transition group min-w-[130px]"
                      >
                        <div className="flex items-center justify-end gap-1.5">
                          <span>Sisa Tunggakan</span>
                          <ArrowUpDown className="w-3 h-3 text-slate-400 group-hover:text-slate-600" />
                        </div>
                      </th>
                      <th className="px-3 py-2.5 text-center min-w-[110px]">Status</th>
                      <th className="px-3 py-2.5 text-center w-24">Rincian</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {sortedAlumniList.map((alumnus, idx) => {
                      const hasArrears = alumnus.total_remaining > 0;
                      return (
                        <tr key={alumnus.id} className="hover:bg-slate-50/80 transition">
                          <td className="px-3 py-2.5 text-center text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                          <td className="px-3 py-2.5">
                            <div className="font-bold text-slate-800">{alumnus.full_name}</div>
                            <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-slate-500">
                              <span className="font-mono bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200">
                                NIS: {alumnus.nis || alumnus.nipd || '-'}
                              </span>
                              {alumnus.cohort_name && alumnus.cohort_name !== '-' && (
                                <span className="text-slate-400">• Angkatan {alumnus.cohort_name}</span>
                              )}
                            </div>
                          </td>
                          <td className="px-3 py-2.5 text-slate-600">
                            <div className="font-semibold text-slate-700 text-xs">
                              {alumnus.graduation_academic_year_name !== '-' ? `Lulus ${alumnus.graduation_academic_year_name}` : 'Alumni'}
                            </div>
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              {alumnus.last_class_name || 'Alumni'}
                            </div>
                          </td>
                          <td className="px-3 py-2.5">
                            {alumnus.arrears_fee_types && alumnus.arrears_fee_types.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {alumnus.arrears_fee_types.map((ftName, fIdx) => (
                                  <span
                                    key={fIdx}
                                    className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200"
                                  >
                                    {ftName}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-[11px] text-emerald-600 font-medium">Tidak ada tunggakan</span>
                            )}
                          </td>
                          <td className="px-3 py-2.5 text-right font-mono tnum num-cell text-slate-700">
                            {formatCurrency(alumnus.total_bills || 0)}
                          </td>
                          <td className="px-3 py-2.5 text-right font-mono tnum num-cell text-emerald-700 font-medium">
                            {formatCurrency(alumnus.total_paid || 0)}
                          </td>
                          <td className="px-3 py-2.5 text-right font-mono tnum num-cell font-bold">
                            {hasArrears ? (
                              <span className="text-rose-700">
                                {formatCurrency(alumnus.total_remaining || 0)}
                              </span>
                            ) : (
                              <span className="text-slate-400">Rp 0</span>
                            )}
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            {alumnus.status === 'paid' || (!hasArrears && alumnus.total_bills > 0) ? (
                              <StatusPill variant="success" size="sm">
                                Lunas
                              </StatusPill>
                            ) : alumnus.status === 'partially_paid' ? (
                              <StatusPill variant="info" size="sm">
                                Sebagian ({alumnus.unpaid_bills_count} sisa)
                              </StatusPill>
                            ) : hasArrears ? (
                              <StatusPill variant="danger" size="sm">
                                Menunggak ({alumnus.unpaid_bills_count} item)
                              </StatusPill>
                            ) : (
                              <StatusPill variant="neutral" size="sm">
                                Tanpa Tagihan
                              </StatusPill>
                            )}
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            <button
                              type="button"
                              onClick={() => handleOpenAlumniDetailModal(alumnus)}
                              title="Lihat rincian riwayat tagihan & tunggakan alumni"
                              className="p-1.5 rounded-md bg-slate-100 hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 border border-slate-200 hover:border-emerald-300 transition"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="bg-slate-50 font-bold border-t border-slate-200 text-xs">
                    <tr>
                      <td colSpan={4} className="px-3 py-2.5 text-right text-slate-600">
                        Total ({sortedAlumniList.length} alumni)
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono tnum num-cell text-slate-800">
                        {formatCurrency(sortedAlumniList.reduce((acc, a) => acc + (a.total_bills || 0), 0))}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono tnum num-cell text-emerald-800">
                        {formatCurrency(sortedAlumniList.reduce((acc, a) => acc + (a.total_paid || 0), 0))}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono tnum num-cell text-rose-800">
                        {formatCurrency(sortedAlumniList.reduce((acc, a) => acc + (a.total_remaining || 0), 0))}
                      </td>
                      <td colSpan={2}></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 3: RIWAYAT PENAGIHAN (AUDIT TRAIL & LIST) */}
      {/* ============================================================ */}
      {activeTab === 'history' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          {/* Summary & KPI Cards for History Tab */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {/* Card 1: Tagihan Terbit */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-900 text-white border border-indigo-700/60 shadow-md relative overflow-hidden group hover:shadow-xl hover:scale-[1.02] transition-all duration-200">
              <div className="absolute -right-6 -bottom-6 w-20 h-20 bg-indigo-500/20 rounded-full blur-xl group-hover:bg-indigo-500/30 transition-all pointer-events-none" />
              <div className="flex items-center justify-between gap-2 relative z-10">
                <div className="text-[11px] font-bold uppercase tracking-wider text-indigo-300">Total Tagihan Terbit</div>
                <div className="w-8 h-8 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center text-indigo-200 shadow-inner shrink-0 group-hover:scale-110 transition-transform">
                  <FileCheck className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2 text-2xl font-black text-white tracking-tight relative z-10 truncate" title={formatCurrency(historySummary.publishedAmount)}>
                {formatCurrency(historySummary.publishedAmount)}
              </div>
              <p className="text-[11px] text-indigo-200 mt-1 relative z-10">{formatNumber(historySummary.publishedCount)} tagihan resmi</p>
            </div>

            {/* Card 2: Belum Terbit (Draf) */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-500/20 via-amber-50 to-orange-100/70 border border-amber-300 text-amber-950 shadow-sm relative overflow-hidden group hover:shadow-md hover:scale-[1.02] transition-all duration-200">
              <div className="absolute -right-6 -bottom-6 w-20 h-20 bg-amber-500/20 rounded-full blur-xl group-hover:bg-amber-500/30 transition-all pointer-events-none" />
              <div className="flex items-center justify-between gap-2 relative z-10">
                <div className="text-[11px] font-bold uppercase tracking-wider text-amber-900">Belum Terbit (Draf)</div>
                <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-md shadow-amber-500/30 shrink-0 group-hover:scale-110 transition-transform">
                  <Clock className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2 text-2xl font-black text-amber-950 tracking-tight relative z-10 truncate" title={formatCurrency(historySummary.draftAmount)}>
                {formatCurrency(historySummary.draftAmount)}
              </div>
              <p className="text-[11px] text-amber-800 mt-1 font-medium relative z-10">{formatNumber(historySummary.draftCount)} tagihan draf</p>
            </div>

            {/* Card 3: Pembayaran Masuk */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-500/20 via-emerald-50 to-teal-100/70 border border-emerald-300 text-emerald-950 shadow-sm relative overflow-hidden group hover:shadow-md hover:scale-[1.02] transition-all duration-200">
              <div className="absolute -right-6 -bottom-6 w-20 h-20 bg-emerald-500/20 rounded-full blur-xl group-hover:bg-emerald-500/30 transition-all pointer-events-none" />
              <div className="flex items-center justify-between gap-2 relative z-10">
                <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-900">Pembayaran Masuk</div>
                <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/30 shrink-0 group-hover:scale-110 transition-transform">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2 text-2xl font-black text-emerald-950 tracking-tight relative z-10 truncate" title={formatCurrency(historySummary.totalPaid)}>
                {formatCurrency(historySummary.totalPaid)}
              </div>
              <p className="text-[11px] text-emerald-800 mt-1 font-medium relative z-10">Kas/Bank terbayar</p>
            </div>

            {/* Card 4: Sisa Piutang Berjalan */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-rose-500/20 via-rose-50 to-red-100/70 border border-rose-300 text-rose-950 shadow-sm relative overflow-hidden group hover:shadow-md hover:scale-[1.02] transition-all duration-200">
              <div className="absolute -right-6 -bottom-6 w-20 h-20 bg-rose-500/20 rounded-full blur-xl group-hover:bg-rose-500/30 transition-all pointer-events-none" />
              <div className="flex items-center justify-between gap-2 relative z-10">
                <div className="text-[11px] font-bold uppercase tracking-wider text-rose-900">Sisa Piutang Berjalan</div>
                <div className="w-8 h-8 rounded-xl bg-rose-600 text-white flex items-center justify-center shadow-md shadow-rose-600/30 shrink-0 group-hover:scale-110 transition-transform">
                  <AlertCircle className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2 text-2xl font-black text-rose-950 tracking-tight relative z-10 truncate" title={formatCurrency(historySummary.totalRemaining)}>
                {formatCurrency(historySummary.totalRemaining)}
              </div>
              <p className="text-[11px] text-rose-800 mt-1 font-medium relative z-10">Sisa tagihan terbit belum lunas</p>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="bg-white p-3 rounded-lg border border-slate-200/80 shadow-xs grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 relative z-20">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari santri, tagihan #ID..."
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-emerald-500 transition"
              />
            </div>

            <div>
              <SearchableSelect
                options={[
                  { value: '', label: '-- Semua Rombel / Kelas --' },
                  ...classGroups.map((c) => ({ value: c.id, label: c.name }))
                ]}
                value={historyFilterClassId}
                onChange={(val) => setHistoryFilterClassId(val)}
                placeholder="Filter Rombel"
              />
            </div>

            <div>
              <SearchableSelect
                options={[
                  { value: '', label: '-- Semua Jenis Biaya --' },
                  ...feeTypes.map((ft) => ({ value: ft.id, label: ft.name, sublabel: ft.billing_pattern }))
                ]}
                value={historyFilterFeeTypeId}
                onChange={(val) => setHistoryFilterFeeTypeId(val)}
                placeholder="Filter Jenis Biaya"
              />
            </div>

            <div>
              <SearchableSelect
                options={[
                  { value: '', label: '-- Semua Status Pembayaran --' },
                  { value: 'unpaid', label: 'Belum Bayar (Unpaid)', sublabel: 'Tagihan aktif piutang' },
                  { value: 'paid', label: 'Lunas (Paid)', sublabel: 'Telah terbayar penuh' },
                  { value: 'partially_paid', label: 'Sebagian (Partially Paid)', sublabel: 'Terbayar cicilan' },
                  { value: 'draft', label: 'Draf (Draft)', sublabel: 'Belum diterbitkan resmi' }
                ]}
                value={historyFilterStatus}
                onChange={(val) => setHistoryFilterStatus(val)}
                placeholder="Filter Status"
              />
            </div>
          </div>

          {/* Table Riwayat with Sticky Header & Sortable Columns */}
          <div className="bg-white rounded-lg border border-slate-200/80 shadow-xs overflow-hidden">
            {historyLoading ? (
              <div className="p-16 text-center text-slate-400">
                <Loader2 className="w-8 h-8 animate-spin mx-auto text-emerald-600 mb-2" />
                <p className="text-xs font-medium">Memuat riwayat tagihan santri...</p>
              </div>
            ) : filteredAndSortedHistoryBills.length === 0 ? (
              <div className="p-16 text-center text-slate-400">
                <History className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                <p className="text-xs font-bold text-slate-700">Tidak ada riwayat tagihan</p>
                <p className="text-[11px] text-slate-400 mt-1">Coba sesuaikan filter pencarian di atas.</p>
              </div>
            ) : (
              <div className="table-container max-h-[700px]">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50/95 backdrop-blur text-slate-700 font-bold sticky top-0 z-10 border-b border-slate-200 shadow-2xs select-none">
                    <tr>
                      <th
                        onClick={() => handleSortHistory('created_at')}
                        className="px-3 py-2.5 cursor-pointer hover:bg-slate-100 transition group"
                        title="Klik untuk mengurutkan tanggal terbit"
                      >
                        <div className="flex items-center gap-1.5">
                          <span>Tanggal Terbit</span>
                          {historySortConfig.key === 'created_at' ? (
                            historySortConfig.direction === 'asc' ? (
                              <ArrowUp className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <ArrowDown className="w-3.5 h-3.5 text-emerald-600" />
                            )
                          ) : (
                            <ArrowUpDown className="w-3 h-3 text-slate-400 group-hover:text-slate-600" />
                          )}
                        </div>
                      </th>
                      <th
                        onClick={() => handleSortHistory('student_name')}
                        className="px-3 py-2.5 cursor-pointer hover:bg-slate-100 transition group"
                        title="Klik untuk mengurutkan nama santri"
                      >
                        <div className="flex items-center gap-1.5">
                          <span>Santri (Nama / ID)</span>
                          {historySortConfig.key === 'student_name' ? (
                            historySortConfig.direction === 'asc' ? (
                              <ArrowUp className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <ArrowDown className="w-3.5 h-3.5 text-emerald-600" />
                            )
                          ) : (
                            <ArrowUpDown className="w-3 h-3 text-slate-400 group-hover:text-slate-600" />
                          )}
                        </div>
                      </th>
                      <th
                        onClick={() => handleSortHistory('class_name')}
                        className="px-3 py-2.5 cursor-pointer hover:bg-slate-100 transition group"
                        title="Klik untuk mengurutkan rombel / kelas"
                      >
                        <div className="flex items-center gap-1.5">
                          <span>Rombel</span>
                          {historySortConfig.key === 'class_name' ? (
                            historySortConfig.direction === 'asc' ? (
                              <ArrowUp className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <ArrowDown className="w-3.5 h-3.5 text-emerald-600" />
                            )
                          ) : (
                            <ArrowUpDown className="w-3 h-3 text-slate-400 group-hover:text-slate-600" />
                          )}
                        </div>
                      </th>
                      <th
                        onClick={() => handleSortHistory('fee_type_name')}
                        className="px-3 py-2.5 cursor-pointer hover:bg-slate-100 transition group"
                        title="Klik untuk mengurutkan jenis biaya"
                      >
                        <div className="flex items-center gap-1.5">
                          <span>Jenis Biaya &amp; Periode</span>
                          {historySortConfig.key === 'fee_type_name' ? (
                            historySortConfig.direction === 'asc' ? (
                              <ArrowUp className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <ArrowDown className="w-3.5 h-3.5 text-emerald-600" />
                            )
                          ) : (
                            <ArrowUpDown className="w-3 h-3 text-slate-400 group-hover:text-slate-600" />
                          )}
                        </div>
                      </th>
                      <th
                        onClick={() => handleSortHistory('gross_amount')}
                        className="px-3 py-2.5 text-right cursor-pointer hover:bg-slate-100 transition group"
                        title="Klik untuk mengurutkan nominal kotor"
                      >
                        <div className="flex items-center justify-end gap-1.5">
                          <span>Nominal Kotor</span>
                          {historySortConfig.key === 'gross_amount' ? (
                            historySortConfig.direction === 'asc' ? (
                              <ArrowUp className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <ArrowDown className="w-3.5 h-3.5 text-emerald-600" />
                            )
                          ) : (
                            <ArrowUpDown className="w-3 h-3 text-slate-400 group-hover:text-slate-600" />
                          )}
                        </div>
                      </th>
                      <th
                        onClick={() => handleSortHistory('discount_amount')}
                        className="px-3 py-2.5 text-right cursor-pointer hover:bg-slate-100 transition group"
                        title="Klik untuk mengurutkan diskon"
                      >
                        <div className="flex items-center justify-end gap-1.5">
                          <span>Diskon</span>
                          {historySortConfig.key === 'discount_amount' ? (
                            historySortConfig.direction === 'asc' ? (
                              <ArrowUp className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <ArrowDown className="w-3.5 h-3.5 text-emerald-600" />
                            )
                          ) : (
                            <ArrowUpDown className="w-3 h-3 text-slate-400 group-hover:text-slate-600" />
                          )}
                        </div>
                      </th>
                      <th
                        onClick={() => handleSortHistory('amount')}
                        className="px-3 py-2.5 text-right cursor-pointer hover:bg-slate-100 transition group"
                        title="Klik untuk mengurutkan nominal bersih"
                      >
                        <div className="flex items-center justify-end gap-1.5">
                          <span>Nominal Bersih</span>
                          {historySortConfig.key === 'amount' ? (
                            historySortConfig.direction === 'asc' ? (
                              <ArrowUp className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <ArrowDown className="w-3.5 h-3.5 text-emerald-600" />
                            )
                          ) : (
                            <ArrowUpDown className="w-3 h-3 text-slate-400 group-hover:text-slate-600" />
                          )}
                        </div>
                      </th>
                      <th
                        onClick={() => handleSortHistory('notes')}
                        className="px-3 py-2.5 max-w-xs cursor-pointer hover:bg-slate-100 transition group"
                        title="Klik untuk mengurutkan catatan"
                      >
                        <div className="flex items-center gap-1.5">
                          <span>Catatan</span>
                          {historySortConfig.key === 'notes' ? (
                            historySortConfig.direction === 'asc' ? (
                              <ArrowUp className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <ArrowDown className="w-3.5 h-3.5 text-emerald-600" />
                            )
                          ) : (
                            <ArrowUpDown className="w-3 h-3 text-slate-400 group-hover:text-slate-600" />
                          )}
                        </div>
                      </th>
                      <th
                        onClick={() => handleSortHistory('due_date')}
                        className="px-3 py-2.5 cursor-pointer hover:bg-slate-100 transition group"
                        title="Klik untuk mengurutkan tanggal jatuh tempo"
                      >
                        <div className="flex items-center gap-1.5">
                          <span>Jatuh Tempo</span>
                          {historySortConfig.key === 'due_date' ? (
                            historySortConfig.direction === 'asc' ? (
                              <ArrowUp className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <ArrowDown className="w-3.5 h-3.5 text-emerald-600" />
                            )
                          ) : (
                            <ArrowUpDown className="w-3 h-3 text-slate-400 group-hover:text-slate-600" />
                          )}
                        </div>
                      </th>
                      <th
                        onClick={() => handleSortHistory('status')}
                        className="px-3 py-2.5 cursor-pointer hover:bg-slate-100 transition group"
                        title="Klik untuk mengurutkan status"
                      >
                        <div className="flex items-center gap-1.5">
                          <span>Status</span>
                          {historySortConfig.key === 'status' ? (
                            historySortConfig.direction === 'asc' ? (
                              <ArrowUp className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <ArrowDown className="w-3.5 h-3.5 text-emerald-600" />
                            )
                          ) : (
                            <ArrowUpDown className="w-3 h-3 text-slate-400 group-hover:text-slate-600" />
                          )}
                        </div>
                      </th>
                      <th className="px-3 py-2.5 text-right">Aksi</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {filteredAndSortedHistoryBills.map((b) => {
                      const isOverdue = b.status === 'unpaid' && b.due_date && new Date(b.due_date) < new Date();
                      const grossAmount = parseFloat(b.amount || 0) + parseFloat(b.discount_amount || 0);
                      const netAmount = parseFloat(b.amount || 0);

                      return (
                        <tr
                          key={b.id}
                          className={`hover:bg-slate-50/80 transition ${
                            isOverdue ? 'bg-rose-50/40 border-l-4 border-l-rose-500' : ''
                          }`}
                        >
                          <td className="px-3 py-2.5 font-mono text-[11px] text-slate-600">
                            <div>{b.bill_date ? String(b.bill_date).slice(0, 10) : String(b.created_at || '').slice(0, 10)}</div>
                            <div className="text-[10px] text-slate-400">#{b.id}</div>
                          </td>

                          <td className="px-3 py-2.5 font-bold text-slate-800">
                            <div>{b.student_name}</div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              NIS: {b.nis || '-'} • ID: {b.student_id}
                            </div>
                          </td>

                          <td className="px-3 py-2.5">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                              {b.class_name || '-'}
                            </span>
                          </td>

                          <td className="px-3 py-2.5">
                            <div className="font-semibold text-slate-800">{b.fee_type_name}</div>
                            <div className="text-[10px] text-slate-500 font-medium">
                              {b.period_month ? `Bulan ke-${b.period_month} • ` : ''}
                              {b.academic_year_name
                                ? `T.A. ${b.academic_year_name}`
                                : (b.period_year
                                    ? (b.period_month
                                        ? (b.period_month >= 7 ? `T.A. ${b.period_year}/${b.period_year + 1}` : `T.A. ${b.period_year - 1}/${b.period_year}`)
                                        : `T.A. ${b.period_year}/${b.period_year + 1}`)
                                    : '-')}
                            </div>
                          </td>

                          <td className="px-3 py-2.5 text-right font-mono tnum num-cell text-slate-500">
                            {formatCurrency(grossAmount)}
                          </td>

                          <td className="px-3 py-2.5 text-right font-mono tnum num-cell text-amber-600 font-semibold">
                            {parseFloat(b.discount_amount || 0) > 0 ? (
                              <span>- {formatCurrency(b.discount_amount)}</span>
                            ) : (
                              <span className="text-slate-300">-</span>
                            )}
                          </td>

                          <td className="px-3 py-2.5 text-right font-mono tnum num-cell font-bold text-slate-900">
                            {formatCurrency(netAmount)}
                          </td>

                          <td className="px-3 py-2.5 text-slate-600 max-w-xs truncate text-[11px]" title={b.discount_reason || b.edit_reason}>
                            {b.discount_reason || b.edit_reason || <span className="text-slate-300 italic">-</span>}
                          </td>

                          <td className="px-3 py-2.5 font-mono text-[11px]">
                            {b.due_date ? (
                              <span className={isOverdue ? 'text-rose-700 font-bold flex items-center gap-1' : 'text-slate-700'}>
                                {isOverdue && <AlertCircle className="w-3 h-3 text-rose-600" />}
                                {String(b.due_date).slice(0, 10)}
                              </span>
                            ) : (
                              <span className="text-slate-300">-</span>
                            )}
                          </td>

                          <td className="px-3 py-2.5">
                            {b.status === 'paid' ? (
                              <StatusPill variant="success" size="sm">
                                Lunas
                              </StatusPill>
                            ) : b.status === 'partially_paid' ? (
                              <StatusPill variant="info" size="sm">
                                Sebagian
                              </StatusPill>
                            ) : isOverdue ? (
                              <StatusPill variant="danger" size="sm">
                                Jatuh Tempo
                              </StatusPill>
                            ) : (
                              <StatusPill variant="info" size="sm">
                                Belum Bayar
                              </StatusPill>
                            )}
                          </td>

                          <td className="px-3 py-2.5 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                type="button"
                                onClick={() => handleOpenDetailModal(b)}
                                title="Lihat Detail & Jurnal Piutang"
                                className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-md transition"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>

                              {b.status !== 'paid' && (
                                <button
                                  type="button"
                                  onClick={() => handleOpenReviseModal(b)}
                                  title="Revisi Tagihan (Catat Riwayat)"
                                  className="p-1.5 text-slate-500 hover:text-amber-700 hover:bg-amber-50 rounded-md transition"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                              )}

                              {b.status !== 'paid' && (
                                <button
                                  type="button"
                                  onClick={() => handleSendSingleReminder(b)}
                                  disabled={sendingSingleReminderId === b.id}
                                  title="Kirimkan Pengingat ke Portal Orang Tua"
                                  className="p-1.5 text-slate-500 hover:text-orange-700 hover:bg-orange-50 rounded-md transition disabled:opacity-50"
                                >
                                  {sendingSingleReminderId === b.id ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin text-orange-600" />
                                  ) : (
                                    <Send className="w-3.5 h-3.5" />
                                  )}
                                </button>
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

      {/* ============================================================ */}
      {/* TAB 4: REMINDER TAGIHAN (PORTAL ORANG TUA NOTIFIKASI) */}
      {/* ============================================================ */}
      {activeTab === 'reminders' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          {/* Quick KPI & Broadcast Banner */}
          <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 rounded-lg p-4 text-white shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5" />
                <h2 className="text-base font-bold tracking-tight">Pusat Pengingat Tagihan (Portal Orang Tua)</h2>
              </div>
              <p className="text-xs text-amber-100 mt-0.5 max-w-2xl">
                Kirim pesan tagihan otomatis atau pesan khusus langsung ke modul notifikasi wali murid di Portal Orang Tua santri, lengkap dengan log audit pengiriman.
              </p>
            </div>
            <button
              type="button"
              onClick={handleOpenBroadcastModal}
              className="px-4 py-2 bg-white text-orange-700 font-bold text-xs rounded-lg shadow-xs hover:bg-amber-50 transition shrink-0 flex items-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5 text-orange-600" />
              <span>Broadcast Pengingat Sekarang</span>
            </button>
          </div>

          {/* Filter Logs */}
          <div className="bg-white p-3 rounded-lg border border-slate-200/80 shadow-xs flex items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari log nama santri, penerima, pesan..."
                value={reminderSearch}
                onChange={(e) => setReminderSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-amber-500 transition"
              />
            </div>
            <div className="text-xs text-slate-500 font-medium">
              Total {filteredAndSortedReminderLogs.length} pengiriman tercatat
            </div>
          </div>

          {/* Table Log Riwayat Reminder */}
          <div className="bg-white rounded-lg border border-slate-200/80 shadow-xs overflow-hidden">
            {reminderLogsLoading ? (
              <div className="p-16 text-center text-slate-400">
                <Loader2 className="w-8 h-8 animate-spin mx-auto text-amber-600 mb-2" />
                <p className="text-xs font-medium">Memuat riwayat pengiriman reminder...</p>
              </div>
            ) : filteredAndSortedReminderLogs.length === 0 ? (
              <div className="p-16 text-center text-slate-400">
                <Bell className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                <p className="text-xs font-bold text-slate-700">Belum ada pengiriman reminder</p>
                <p className="text-[11px] text-slate-400 mt-1">Gunakan tombol "Broadcast Pengingat" di atas untuk mengirimkan pesan pertama.</p>
              </div>
            ) : (
              <div className="table-container max-h-[650px]">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50/95 backdrop-blur text-slate-700 font-bold sticky top-0 z-10 border-b border-slate-200 shadow-2xs select-none">
                    <tr>
                      <th
                        onClick={() => handleSortReminders('sent_at')}
                        className="px-3 py-2.5 cursor-pointer hover:bg-slate-100 transition group"
                        title="Klik untuk mengurutkan waktu kirim"
                      >
                        <div className="flex items-center gap-1.5">
                          <span>Waktu Kirim</span>
                          {reminderSortConfig.key === 'sent_at' ? (
                            reminderSortConfig.direction === 'asc' ? (
                              <ArrowUp className="w-3.5 h-3.5 text-orange-600" />
                            ) : (
                              <ArrowDown className="w-3.5 h-3.5 text-orange-600" />
                            )
                          ) : (
                            <ArrowUpDown className="w-3 h-3 text-slate-400 group-hover:text-slate-600" />
                          )}
                        </div>
                      </th>
                      <th
                        onClick={() => handleSortReminders('student_name')}
                        className="px-3 py-2.5 cursor-pointer hover:bg-slate-100 transition group"
                        title="Klik untuk mengurutkan nama santri"
                      >
                        <div className="flex items-center gap-1.5">
                          <span>Santri &amp; Rombel</span>
                          {reminderSortConfig.key === 'student_name' ? (
                            reminderSortConfig.direction === 'asc' ? (
                              <ArrowUp className="w-3.5 h-3.5 text-orange-600" />
                            ) : (
                              <ArrowDown className="w-3.5 h-3.5 text-orange-600" />
                            )
                          ) : (
                            <ArrowUpDown className="w-3 h-3 text-slate-400 group-hover:text-slate-600" />
                          )}
                        </div>
                      </th>
                      <th
                        onClick={() => handleSortReminders('recipient_name')}
                        className="px-3 py-2.5 cursor-pointer hover:bg-slate-100 transition group"
                        title="Klik untuk mengurutkan penerima"
                      >
                        <div className="flex items-center gap-1.5">
                          <span>Penerima (Wali Murid)</span>
                          {reminderSortConfig.key === 'recipient_name' ? (
                            reminderSortConfig.direction === 'asc' ? (
                              <ArrowUp className="w-3.5 h-3.5 text-orange-600" />
                            ) : (
                              <ArrowDown className="w-3.5 h-3.5 text-orange-600" />
                            )
                          ) : (
                            <ArrowUpDown className="w-3 h-3 text-slate-400 group-hover:text-slate-600" />
                          )}
                        </div>
                      </th>
                      <th
                        onClick={() => handleSortReminders('fee_type_name')}
                        className="px-3 py-2.5 cursor-pointer hover:bg-slate-100 transition group"
                        title="Klik untuk mengurutkan tagihan terkait"
                      >
                        <div className="flex items-center gap-1.5">
                          <span>Tagihan Terkait</span>
                          {reminderSortConfig.key === 'fee_type_name' ? (
                            reminderSortConfig.direction === 'asc' ? (
                              <ArrowUp className="w-3.5 h-3.5 text-orange-600" />
                            ) : (
                              <ArrowDown className="w-3.5 h-3.5 text-orange-600" />
                            )
                          ) : (
                            <ArrowUpDown className="w-3 h-3 text-slate-400 group-hover:text-slate-600" />
                          )}
                        </div>
                      </th>
                      <th
                        onClick={() => handleSortReminders('message')}
                        className="px-3 py-2.5 max-w-md cursor-pointer hover:bg-slate-100 transition group"
                        title="Klik untuk mengurutkan isi notifikasi"
                      >
                        <div className="flex items-center gap-1.5">
                          <span>Isi Pesan Notifikasi</span>
                          {reminderSortConfig.key === 'message' ? (
                            reminderSortConfig.direction === 'asc' ? (
                              <ArrowUp className="w-3.5 h-3.5 text-orange-600" />
                            ) : (
                              <ArrowDown className="w-3.5 h-3.5 text-orange-600" />
                            )
                          ) : (
                            <ArrowUpDown className="w-3 h-3 text-slate-400 group-hover:text-slate-600" />
                          )}
                        </div>
                      </th>
                      <th
                        onClick={() => handleSortReminders('channel')}
                        className="px-3 py-2.5 cursor-pointer hover:bg-slate-100 transition group"
                        title="Klik untuk mengurutkan kanal"
                      >
                        <div className="flex items-center gap-1.5">
                          <span>Kanal Media</span>
                          {reminderSortConfig.key === 'channel' ? (
                            reminderSortConfig.direction === 'asc' ? (
                              <ArrowUp className="w-3.5 h-3.5 text-orange-600" />
                            ) : (
                              <ArrowDown className="w-3.5 h-3.5 text-orange-600" />
                            )
                          ) : (
                            <ArrowUpDown className="w-3 h-3 text-slate-400 group-hover:text-slate-600" />
                          )}
                        </div>
                      </th>
                      <th
                        onClick={() => handleSortReminders('status')}
                        className="px-3 py-2.5 cursor-pointer hover:bg-slate-100 transition group"
                        title="Klik untuk mengurutkan status pengiriman"
                      >
                        <div className="flex items-center gap-1.5">
                          <span>Status Pengiriman</span>
                          {reminderSortConfig.key === 'status' ? (
                            reminderSortConfig.direction === 'asc' ? (
                              <ArrowUp className="w-3.5 h-3.5 text-orange-600" />
                            ) : (
                              <ArrowDown className="w-3.5 h-3.5 text-orange-600" />
                            )
                          ) : (
                            <ArrowUpDown className="w-3 h-3 text-slate-400 group-hover:text-slate-600" />
                          )}
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredAndSortedReminderLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/70 transition">
                        <td className="px-3 py-2.5 font-mono text-[11px] text-slate-600">
                          {new Date(log.sent_at || log.created_at).toLocaleString('id-ID')}
                        </td>
                        <td className="px-3 py-2.5 font-bold text-slate-800">
                          <div>{log.student_name}</div>
                          <div className="text-[10px] text-slate-400 font-medium">{log.class_name} • NIS: {log.nis}</div>
                        </td>
                        <td className="px-3 py-2.5 text-slate-700">
                          <div className="font-semibold">{log.recipient_name || 'Wali Santri'}</div>
                          {log.phone_or_email && <div className="text-[10px] text-slate-400 font-mono">{log.phone_or_email}</div>}
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="font-semibold text-slate-800">{log.fee_type_name}</div>
                          <div className="text-[10px] text-slate-500 font-mono tnum num-cell">
                            {formatCurrency(log.bill_amount || 0)} • JT: {String(log.bill_due_date || '-').slice(0, 10)}
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-slate-600 max-w-md text-[11px] bg-slate-50/40 rounded">
                          <p className="line-clamp-2" title={log.message}>
                            {log.message || 'Pengingat tagihan reguler via Portal'}
                          </p>
                        </td>
                        <td className="px-3 py-2.5">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                            <Smartphone className="w-3 h-3" /> {log.channel === 'portal_notification' ? 'Portal Ortu' : log.channel}
                          </span>
                        </td>
                        <td className="px-3 py-2.5">
                          <StatusPill variant="success" size="sm">
                            Terkirim
                          </StatusPill>
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

      {/* ============================================================ */}
      {/* MODAL: EDIT & PENERBITAN SEL MATRIX */}
      {/* ============================================================ */}
      {cellModalOpen && selectedCellInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-xl border border-slate-200 overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold">
                  <Receipt className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">
                    {selectedCellInfo.cell.is_published ? 'Ubah / Perbarui Tagihan Sel' : 'Penerbitan Tagihan Santri'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {selectedCellInfo.row.name} ({selectedCellInfo.row.nipd})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCellModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSavePublishCell} className="flex flex-col min-h-0 flex-1 overflow-hidden">
              <div className="p-4 sm:p-5 overflow-y-auto space-y-3.5 text-xs flex-1">
                {/* Info Fee Type & Periode */}
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Jenis Biaya Tagihan:</span>
                    <span className="font-bold text-slate-800">{selectedCellInfo.cell.fee_type_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Pola &amp; Periode:</span>
                    <span className="font-semibold text-slate-700">
                      {selectedCellInfo.cell.month_label ? `Bulan ${selectedCellInfo.cell.month_label} - ` : ''}T.A. {selectedCellInfo.cell.period_year}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Status Saat Ini:</span>
                    <span className="font-bold uppercase text-[10px] text-emerald-700">
                      {selectedCellInfo.cell.is_unbilled || selectedCellInfo.cell.status === 'cancelled'
                        ? 'Tidak Ditagihkan (Bebas / Pindahan)'
                        : (selectedCellInfo.cell.is_published ? selectedCellInfo.cell.status : 'Belum Diterbitkan (Draf Acuan)')}
                    </span>
                  </div>
                </div>

                {/* Opsi Ceklist: Tidak Ditagihkan (Siswa Belum Aktif / Santri Pindahan) */}
                <div className={`p-3 rounded-lg border transition-all ${cellFormData.is_not_billed ? 'bg-indigo-50/80 border-indigo-300 ring-2 ring-indigo-500/20 shadow-xs' : 'bg-slate-50/80 border-slate-200'}`}>
                  <label className="flex items-start gap-2.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={cellFormData.is_not_billed}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        const baseNominal = selectedCellInfo?.cell?.amount !== undefined && selectedCellInfo?.cell?.amount !== null
                          ? selectedCellInfo.cell.amount
                          : (selectedCellInfo?.cell?.base_amount || 0);

                        setCellFormData((prev) => ({
                          ...prev,
                          is_not_billed: checked,
                          amount: checked ? 0 : (baseNominal || 0),
                          has_discount: checked ? false : prev.has_discount,
                          unbilled_reason: checked ? (prev.unbilled_reason || 'Siswa belum aktif (Santri Pindahan)') : prev.unbilled_reason
                        }));
                      }}
                      className="mt-0.5 w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 border-slate-300 cursor-pointer"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-1.5 font-bold text-slate-800 text-xs">
                        <UserX className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Tidak Ditagihkan (Siswa Belum Aktif / Santri Pindahan / Siswa Keluar)</span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                        Centang opsi ini jika santri belum aktif belajar atau telah keluar/berhenti di bulan ini. Sistem otomatis membebaskan tagihan sel ini (Rp 0), tidak mencatat piutang, dan menghapus catatan piutang/jurnal di akuntansi.
                      </p>
                    </div>
                  </label>

                  {cellFormData.is_not_billed && (
                    <div className="mt-3 pt-3 border-t border-indigo-200/80 space-y-2.5 animate-in fade-in">
                      <label className="block text-[11px] font-semibold text-indigo-950">
                        Pilih / Isi Keterangan Alasan Tidak Ditagihkan:
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {[
                          'Siswa keluar / berhenti di bulan ini',
                          'Siswa keluar di bulan sebelumnya (Tidak Ditagihkan)',
                          'Siswa belum aktif (Santri Pindahan)',
                          'Santri baru masuk pertengahan semester',
                          'Cuti / Izin Khusus Belum Aktif',
                          'Pembebasan Khusus Santri'
                        ].map((preset) => (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => setCellFormData({ ...cellFormData, unbilled_reason: preset })}
                            className={`px-2.5 py-1.5 rounded-lg text-[11px] text-left border transition ${
                              cellFormData.unbilled_reason === preset
                                ? 'bg-indigo-600 text-white border-indigo-600 font-bold shadow-xs'
                                : 'bg-white text-slate-700 border-indigo-200 hover:bg-indigo-100/60'
                            }`}
                          >
                            {preset}
                          </button>
                        ))}
                      </div>
                      <input
                        type="text"
                        value={cellFormData.unbilled_reason}
                        onChange={(e) => setCellFormData({ ...cellFormData, unbilled_reason: e.target.value })}
                        placeholder="Ketik keterangan alasan spesifik..."
                        className="w-full px-3 py-1.5 bg-white border border-indigo-300 rounded-lg text-xs font-semibold text-indigo-950 focus:ring-2 focus:ring-indigo-500"
                      />

                      {/* Opsi Terapkan ke Seluruh Bulan Berikutnya untuk Siswa yang Keluar / Berhenti */}
                      {selectedCellInfo?.cell?.period_month && (
                        <div className="p-2.5 bg-white/95 border border-indigo-200 rounded-lg space-y-1">
                          <label className="flex items-start gap-2 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={cellFormData.apply_to_subsequent_months}
                              onChange={(e) => setCellFormData({ ...cellFormData, apply_to_subsequent_months: e.target.checked })}
                              className="mt-0.5 w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 border-slate-300 cursor-pointer"
                            />
                            <div>
                              <span className="text-xs font-bold text-indigo-950 block">
                                Terapkan juga "Tidak Ditagihkan" ke seluruh bulan berikutnya di Tahun Ajaran ini
                              </span>
                              <span className="text-[10.5px] text-indigo-700 leading-snug block mt-0.5">
                                Otomatis membebaskan (Rp 0) tagihan bulan-bulan berikutnya setelah bulan <strong>{selectedCellInfo?.cell?.month_label || 'ini'}</strong> untuk santri ini.
                              </span>
                            </div>
                          </label>
                        </div>
                      )}

                      <div className="p-2.5 bg-indigo-100/70 border border-indigo-200/80 rounded-lg flex items-start gap-2 text-[11px] text-indigo-950 font-medium">
                        <Info className="w-3.5 h-3.5 text-indigo-700 shrink-0 mt-0.5" />
                        <span>Tagihan sel ini akan diset <strong>Rp 0 (Bebas / Pindahan / Keluar)</strong>. Seluruh entri jurnal piutang di buku besar &amp; neraca akuntansi akan otomatis dihapus bersih.</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Nominal Input */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Nominal Tagihan (Rp) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="any"
                    disabled={cellFormData.is_not_billed}
                    value={cellFormData.is_not_billed ? 0 : cellFormData.amount}
                    onChange={(e) => setCellFormData({ ...cellFormData, amount: e.target.value })}
                    placeholder="0"
                    className={`w-full px-3 py-2 border rounded-lg font-mono font-bold text-xs ${
                      cellFormData.is_not_billed
                        ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                        : 'bg-slate-50 border-slate-200 text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500'
                    }`}
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    {cellFormData.is_not_billed
                      ? 'Terkunci Rp 0 karena opsi Tidak Ditagihkan (Siswa Belum Aktif / Santri Pindahan) aktif.'
                      : 'Dapat diisi 0 atau nominal berapa pun (tidak ada batas minimal).'}
                  </p>
                </div>

                {/* Date Pickers */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Tanggal Tagihan</label>
                    <DatePickerField
                      value={cellFormData.bill_date}
                      onChange={handleCellBillDateChange}
                      placeholder="DD/MM/YYYY"
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Jatuh Tempo <span className="text-red-500">*</span></label>
                    <DatePickerField
                      value={cellFormData.due_date}
                      onChange={handleCellDueDateChange}
                      placeholder="DD/MM/YYYY"
                      align="right"
                      className="w-full"
                    />
                  </div>
                </div>

                {/* Diskon Toggle & Input (Nominal vs Persentase) */}
                {!cellFormData.is_not_billed && (
                  <div className="p-3 rounded-lg border border-amber-200/80 bg-amber-50/40 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={cellFormData.has_discount}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            setCellFormData({
                              ...cellFormData,
                              has_discount: checked,
                              discount_amount: checked ? (cellFormData.discount_amount || 0) : 0
                            });
                          }}
                          className="w-4 h-4 text-amber-600 rounded focus:ring-amber-500"
                        />
                        <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                          <Percent className="w-3.5 h-3.5 text-amber-700" /> Berikan Potongan / Diskon Khusus
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
                            onClick={() => {
                              const baseNominal = parseFloat(cellFormData.amount || 0);
                              const currentDisc = parseFloat(cellFormData.discount_amount || 0);
                              const pct = baseNominal > 0 ? ((currentDisc / baseNominal) * 100).toFixed(1) : 0;
                              setCellFormData({ ...cellFormData, discount_type: 'percentage', discount_percent: pct });
                            }}
                            className={`px-2 py-0.5 rounded-md transition ${cellFormData.discount_type === 'percentage' ? 'bg-amber-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
                          >
                            Persentase (%)
                          </button>
                        </div>
                      )}
                    </div>

                    {cellFormData.has_discount && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-amber-100 animate-in fade-in">
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
                                    const pct = e.target.value;
                                    const base = parseFloat(cellFormData.amount || 0);
                                    const nominal = base > 0 ? ((base * parseFloat(pct || 0)) / 100) : 0;
                                    setCellFormData({
                                      ...cellFormData,
                                      discount_percent: pct,
                                      discount_amount: nominal
                                    });
                                  }}
                                  className="w-full pl-3 pr-8 py-1.5 bg-white border border-amber-300 rounded-lg font-bold text-xs"
                                  placeholder="0"
                                />
                                <span className="absolute right-2.5 top-1.5 font-bold text-slate-400 text-xs">%</span>
                              </div>
                              <p className="text-[10px] text-amber-800 font-semibold mt-1">
                                Setara: {formatCurrency(cellFormData.discount_amount || 0)}
                              </p>
                            </div>
                          ) : (
                            <div>
                              <label className="block text-[11px] font-semibold text-slate-700 mb-1">Nominal Diskon (Rp)</label>
                              <input
                                type="number"
                                min="0"
                                value={cellFormData.discount_amount}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  const base = parseFloat(cellFormData.amount || 0);
                                  const pct = base > 0 ? ((parseFloat(val || 0) / base) * 100).toFixed(1) : 0;
                                  setCellFormData({
                                    ...cellFormData,
                                    discount_amount: val,
                                    discount_percent: pct
                                  });
                                }}
                                className="w-full px-3 py-1.5 bg-white border border-amber-300 rounded-lg font-bold font-mono text-xs"
                                placeholder="0"
                              />
                              <p className="text-[10px] text-amber-800 font-semibold mt-1">
                                Setara: {cellFormData.discount_percent || 0}% dari nominal tagihan
                              </p>
                            </div>
                          )}
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 mb-1">Alasan Diskon / Beasiswa</label>
                          <input
                            type="text"
                            placeholder="Contoh: Beasiswa Tahfidz 50% / Keringanan"
                            value={cellFormData.discount_reason}
                            onChange={(e) => setCellFormData({ ...cellFormData, discount_reason: e.target.value })}
                            className="w-full px-3 py-1.5 bg-white border border-amber-300 rounded-lg text-xs"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Catatan */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Catatan Operasional</label>
                  <textarea
                    rows="2"
                    value={cellFormData.notes}
                    onChange={(e) => setCellFormData({ ...cellFormData, notes: e.target.value })}
                    placeholder="Keterangan tambahan..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                {/* Aturan Transaksi Penagihan & Penjurnalan (Transparansi Akuntansi) */}
                {!cellFormData.is_not_billed ? (
                  <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-lg space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <BookOpen className="w-4 h-4 text-indigo-700" />
                        <span className="font-bold text-indigo-900 text-xs">Aturan Transaksi Penagihan (Piutang)</span>
                      </div>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-300">
                        <RefreshCw className="w-3 h-3 text-indigo-600" /> Non-Kas (Akrual Piutang)
                      </span>
                    </div>

                    {(() => {
                      const activeRule = (cellFormData.mapping_id
                        ? transactionRules.find((r) => r.id === Number(cellFormData.mapping_id))
                        : null)
                        || transactionRules.find((r) => r.related_fee_type_id === selectedCellInfo?.cell?.fee_type_id && r.transaction_type === 'non_kas')
                        || transactionRules.find((r) => r.transaction_code === 'student_bill_issued')
                        || {
                            transaction_code: 'student_bill_issued',
                            transaction_label: 'Penerbitan Tagihan Siswa',
                            debit_account_code: '201',
                            debit_account_name: 'Piutang Siswa',
                            credit_account_code: '601',
                            credit_account_name: 'Pendapatan Pendidikan'
                          };

                      return (
                        <div className="bg-white p-2.5 rounded-lg border border-indigo-100 space-y-1.5 text-[11px]">
                          <div className="flex justify-between items-center text-slate-700">
                            <span>Aturan Terpilih:</span>
                            <span className="font-bold text-slate-900">{activeRule?.transaction_label || 'Penerbitan Tagihan Siswa'}</span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100">
                            <div className="p-1.5 bg-slate-50 rounded-md border border-slate-200/60">
                              <div className="text-[10px] font-bold text-slate-500 uppercase">Debit (Posisi Aktiva/Piutang)</div>
                              <div className="font-semibold text-slate-800 mt-0.5">{activeRule?.debit_account_name || 'Piutang Siswa'}</div>
                              <div className="font-mono text-[10px] text-slate-400">{activeRule?.debit_account_code || '201'}</div>
                            </div>
                            <div className="p-1.5 bg-slate-50 rounded-md border border-slate-200/60">
                              <div className="text-[10px] font-bold text-slate-500 uppercase">Kredit (Pendapatan)</div>
                              <div className="font-semibold text-slate-800 mt-0.5">{activeRule?.credit_account_name || 'Pendapatan Pendidikan'}</div>
                              <div className="font-mono text-[10px] text-slate-400">{activeRule?.credit_account_code || '601'}</div>
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Opsi Penyesuaian Aturan Penagihan oleh Pengguna */}
                    <div>
                      <button
                        type="button"
                        onClick={() => setCellFormData({ ...cellFormData, custom_rule_mode: !cellFormData.custom_rule_mode })}
                        className="text-[11px] text-indigo-700 hover:text-indigo-800 font-semibold flex items-center gap-1"
                      >
                        <Sliders className="w-3 h-3" />
                        <span>{cellFormData.custom_rule_mode ? 'Tutup Pilihan Aturan Penagihan' : 'Sesuaikan / Ganti Aturan Penagihan'}</span>
                      </button>

                      {cellFormData.custom_rule_mode && (
                        <div className="mt-2 pt-2 border-t border-indigo-200 animate-in fade-in">
                          <label className="block text-[11px] font-semibold text-slate-700 mb-1">Pilih Aturan Transaksi Penagihan:</label>
                          <SearchableSelect
                            options={transactionRules
                              .filter((r) => r.is_active && (r.transaction_type === 'non_kas' || r.transaction_code.includes('bill')))
                              .map((r) => ({
                                value: r.id,
                                label: `[${r.transaction_code}] ${r.transaction_label}`,
                                sublabel: `Debit: ${r.debit_account_name || '-'} • Kredit: ${r.credit_account_name || '-'}`
                              }))}
                            value={cellFormData.mapping_id || ''}
                            onChange={(val) => setCellFormData({ ...cellFormData, mapping_id: val })}
                            placeholder="-- Pilih Aturan Penagihan --"
                            searchPlaceholder="Cari aturan transaksi..."
                          />
                        </div>
                      )}
                    </div>
                  </div>
                ) : null}

                {/* Aturan Transaksi Diskon / Potongan (Hanya Tampil Jika Diskon Diberikan) */}
                {!cellFormData.is_not_billed && cellFormData.has_discount && parseFloat(cellFormData.discount_amount || 0) > 0 && (
                  <div className="space-y-3 animate-in fade-in">
                    {/* 1. Aturan Diskon Penagihan (Non-Kas) */}
                    <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-lg space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <Percent className="w-4 h-4 text-amber-700" />
                          <span className="font-bold text-amber-900 text-xs">Aturan Diskon Penagihan</span>
                        </div>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                          <RefreshCw className="w-3 h-3 text-amber-600" /> Non-Kas (Beban Diskon)
                        </span>
                      </div>

                      {(() => {
                        const activeDiscountRule = (cellFormData.discount_mapping_id
                          ? transactionRules.find((r) => r.id === Number(cellFormData.discount_mapping_id))
                          : null)
                          || transactionRules.find((r) => r.related_fee_type_id === selectedCellInfo?.cell?.fee_type_id && r.transaction_code.startsWith('bill_discount'))
                          || transactionRules.find((r) => r.transaction_code === 'student_bill_discount')
                          || {
                            transaction_code: 'student_bill_discount',
                            transaction_label: 'Diskon Tagihan Siswa',
                            debit_account_code: '69001',
                            debit_account_name: 'Diskon / Potongan Beasiswa',
                            credit_account_code: '201',
                            credit_account_name: 'Piutang Siswa'
                          };

                        return (
                          <div className="bg-white p-2.5 rounded-lg border border-amber-100 space-y-1.5 text-[11px]">
                            <div className="flex justify-between items-center text-slate-700">
                              <span>Aturan Diskon Penagihan:</span>
                              <span className="font-bold text-slate-900">{activeDiscountRule?.transaction_label || 'Diskon Tagihan Siswa'}</span>
                            </div>
                            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100">
                              <div className="p-1.5 bg-slate-50 rounded-md border border-slate-200/60">
                                <div className="text-[10px] font-bold text-slate-500 uppercase">Debit (Beban Diskon)</div>
                                <div className="font-semibold text-slate-800 mt-0.5">{activeDiscountRule?.debit_account_name || 'Beban Diskon'}</div>
                                <div className="font-mono text-[10px] text-slate-400">{activeDiscountRule?.debit_account_code || '69001'}</div>
                              </div>
                              <div className="p-1.5 bg-slate-50 rounded-md border border-slate-200/60">
                                <div className="text-[10px] font-bold text-slate-500 uppercase">Kredit (Piutang Terkait)</div>
                                <div className="font-semibold text-slate-800 mt-0.5">{activeDiscountRule?.credit_account_name || 'Piutang Terkait'}</div>
                                <div className="font-mono text-[10px] text-slate-400">{activeDiscountRule?.credit_account_code || '201'}</div>
                              </div>
                            </div>
                          </div>
                        );
                      })()}

                      {/* Opsi Penyesuaian Aturan Diskon Penagihan */}
                      <div>
                        <button
                          type="button"
                          onClick={() => setCellFormData({ ...cellFormData, custom_discount_rule_mode: !cellFormData.custom_discount_rule_mode })}
                          className="text-[11px] text-amber-800 hover:text-amber-900 font-semibold flex items-center gap-1"
                        >
                          <Sliders className="w-3 h-3" />
                          <span>{cellFormData.custom_discount_rule_mode ? 'Tutup Pilihan Aturan Diskon Penagihan' : 'Sesuaikan / Ganti Aturan Diskon Penagihan'}</span>
                        </button>

                        {cellFormData.custom_discount_rule_mode && (
                          <div className="mt-2 pt-2 border-t border-amber-200 animate-in fade-in">
                            <label className="block text-[11px] font-semibold text-slate-700 mb-1">Pilih Aturan Diskon Penagihan:</label>
                            <SearchableSelect
                              options={transactionRules
                                .filter((r) => r.is_active && (r.transaction_code.includes('discount') || r.transaction_type === 'non_kas'))
                                .map((r) => ({
                                  value: r.id,
                                  label: `[${r.transaction_code}] ${r.transaction_label}`,
                                  sublabel: `Debit: ${r.debit_account_name || '-'} • Kredit: ${r.credit_account_name || '-'}`
                                }))}
                              value={cellFormData.discount_mapping_id || ''}
                              onChange={(val) => setCellFormData({ ...cellFormData, discount_mapping_id: val })}
                              placeholder="-- Pilih Aturan Diskon Penagihan --"
                              searchPlaceholder="Cari aturan diskon penagihan..."
                            />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 2. Aturan Diskon Pembayaran (Pelunasan) */}
                    <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-lg space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <Percent className="w-4 h-4 text-indigo-700" />
                          <span className="font-bold text-indigo-900 text-xs">Aturan Diskon Pembayaran</span>
                        </div>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-300">
                          <RefreshCw className="w-3 h-3 text-indigo-600" /> Non-Kas (Pelunasan Diskon)
                        </span>
                      </div>

                      {(() => {
                        const activePaymentDiscountRule = (cellFormData.payment_discount_mapping_id
                          ? transactionRules.find((r) => r.id === Number(cellFormData.payment_discount_mapping_id))
                          : null)
                          || transactionRules.find((r) => r.related_fee_type_id === selectedCellInfo?.cell?.fee_type_id && r.transaction_code.startsWith('pay_discount'))
                          || transactionRules.find((r) => r.transaction_code.includes('discount'))
                          || {
                            transaction_code: 'pay_discount_default',
                            transaction_label: 'Diskon Pembayaran Tagihan',
                            debit_account_code: '69001',
                            debit_account_name: 'Beban Diskon Pelunasan',
                            credit_account_code: '201',
                            credit_account_name: 'Piutang Siswa'
                          };

                        return (
                          <div className="bg-white p-2.5 rounded-lg border border-indigo-100 space-y-1.5 text-[11px]">
                            <div className="flex justify-between items-center text-slate-700">
                              <span>Aturan Diskon Pembayaran:</span>
                              <span className="font-bold text-slate-900">{activePaymentDiscountRule?.transaction_label || 'Diskon Pembayaran Tagihan'}</span>
                            </div>
                            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100">
                              <div className="p-1.5 bg-slate-50 rounded-md border border-slate-200/60">
                                <div className="text-[10px] font-bold text-slate-500 uppercase">Debit (Beban Diskon)</div>
                                <div className="font-semibold text-slate-800 mt-0.5">{activePaymentDiscountRule?.debit_account_name || 'Beban Diskon'}</div>
                                <div className="font-mono text-[10px] text-slate-400">{activePaymentDiscountRule?.debit_account_code || '69001'}</div>
                              </div>
                              <div className="p-1.5 bg-slate-50 rounded-md border border-slate-200/60">
                                <div className="text-[10px] font-bold text-slate-500 uppercase">Kredit (Piutang Terkait)</div>
                                <div className="font-semibold text-slate-800 mt-0.5">{activePaymentDiscountRule?.credit_account_name || 'Piutang Terkait'}</div>
                                <div className="font-mono text-[10px] text-slate-400">{activePaymentDiscountRule?.credit_account_code || '201'}</div>
                              </div>
                            </div>
                          </div>
                        );
                      })()}

                      {/* Opsi Penyesuaian Aturan Diskon Pembayaran */}
                      <div>
                        <button
                          type="button"
                          onClick={() => setCellFormData({ ...cellFormData, custom_payment_discount_rule_mode: !cellFormData.custom_payment_discount_rule_mode })}
                          className="text-[11px] text-indigo-700 hover:text-indigo-800 font-semibold flex items-center gap-1"
                        >
                          <Sliders className="w-3 h-3" />
                          <span>{cellFormData.custom_payment_discount_rule_mode ? 'Tutup Pilihan Aturan Diskon Pembayaran' : 'Sesuaikan / Ganti Aturan Diskon Pembayaran'}</span>
                        </button>

                        {cellFormData.custom_payment_discount_rule_mode && (
                          <div className="mt-2 pt-2 border-t border-indigo-200 animate-in fade-in">
                            <label className="block text-[11px] font-semibold text-slate-700 mb-1">Pilih Aturan Diskon Pembayaran:</label>
                            <SearchableSelect
                              options={transactionRules
                                .filter((r) => r.is_active && (r.transaction_code.includes('discount') || r.transaction_type === 'non_kas'))
                                .map((r) => ({
                                  value: r.id,
                                  label: `[${r.transaction_code}] ${r.transaction_label}`,
                                  sublabel: `Debit: ${r.debit_account_name || '-'} • Kredit: ${r.credit_account_name || '-'}`
                                }))}
                              value={cellFormData.payment_discount_mapping_id || ''}
                              onChange={(val) => setCellFormData({ ...cellFormData, payment_discount_mapping_id: val })}
                              placeholder="-- Pilih Aturan Diskon Pembayaran --"
                              searchPlaceholder="Cari aturan diskon pembayaran..."
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="p-3.5 sm:p-4 px-4 sm:px-5 border-t border-slate-100 shrink-0 bg-slate-50/70 flex items-center justify-between gap-2">
                <div>
                  {selectedCellInfo.cell.is_published && selectedCellInfo.cell.bill_id && (
                    <button
                      type="button"
                      onClick={() => {
                        setCancelFormData({
                          cancel_date: new Date().toISOString().slice(0, 10),
                          cancel_reason: ''
                        });
                        setCancelModalOpen(true);
                      }}
                      className="px-3 py-1.5 border border-rose-200 text-rose-700 bg-rose-50 hover:bg-rose-100 hover:border-rose-300 rounded-lg font-bold flex items-center gap-1.5 transition text-xs shadow-2xs"
                    >
                      <XCircle className="w-3.5 h-3.5 text-rose-600" />
                      <span>Batalkan Tagihan</span>
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setCellModalOpen(false)}
                    className="px-4 py-2 border border-slate-200 text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-100 transition"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={submittingCell}
                    className={`px-4 py-2 text-white rounded-lg text-xs font-bold shadow-xs transition flex items-center gap-2 disabled:opacity-50 ${
                      cellFormData.is_not_billed
                        ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/20'
                        : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
                    }`}
                  >
                    {submittingCell ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : cellFormData.is_not_billed ? (
                      <UserX className="w-3.5 h-3.5" />
                    ) : (
                      <FileCheck className="w-3.5 h-3.5" />
                    )}
                    <span>
                      {cellFormData.is_not_billed
                        ? 'Simpan Status Bebas / Pindahan'
                        : (selectedCellInfo.cell.is_published ? 'Simpan Perubahan' : 'Terbitkan & Catat Piutang')}
                    </span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: BATALKAN TAGIHAN SEL DENGAN VALIDASI & ALASAN */}
      {/* ============================================================ */}
      {cancelModalOpen && selectedCellInfo && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-xl max-w-md w-full shadow-xl border border-rose-200 overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-rose-100 flex items-center justify-between bg-rose-50/70">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-rose-600 text-white flex items-center justify-center font-bold">
                  <XCircle className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-rose-950">Batalkan Tagihan Santri</h3>
                  <p className="text-[11px] text-rose-700 font-medium">{selectedCellInfo.row.name} ({selectedCellInfo.row.nipd})</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCancelModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {(() => {
              const hasPayment = parseFloat(selectedCellInfo.cell.paid_amount || 0) > 0 || selectedCellInfo.cell.is_paid || selectedCellInfo.cell.is_partially_paid;

              return (
                <form onSubmit={handleExecuteCancelCellBill} className="p-4 sm:p-5 space-y-3.5 text-xs">
                  {hasPayment ? (
                    <div className="p-3 bg-amber-50 border border-amber-300 rounded-lg space-y-2 text-amber-900">
                      <div className="flex items-center gap-2 font-bold text-xs text-amber-800">
                        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>Peringatan: Tagihan Sudah Memiliki Pembayaran!</span>
                      </div>
                      <p className="text-[11px] text-amber-800 leading-relaxed">
                        Tagihan santri <b>{selectedCellInfo.row.name}</b> untuk <b>{selectedCellInfo.cell.fee_type_name}</b> telah tercatat pembayaran oleh orang tua sebesar <b>{formatCurrency(selectedCellInfo.cell.paid_amount || 0)}</b>.
                      </p>
                      <p className="text-[11px] text-amber-700 font-semibold">
                        Tagihan yang sudah memiliki transaksi penerimaan pembayaran tidak dapat dibatalkan untuk menjaga integritas pembukuan kas &amp; audit trail keuangan.
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="p-3 bg-rose-50/80 border border-rose-200 rounded-lg text-rose-900 space-y-1">
                        <p className="font-bold flex items-center gap-1.5 text-xs text-rose-800">
                          <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                          <span>Konfirmasi Pembatalan Tagihan</span>
                        </p>
                        <p className="text-[11px] text-rose-800">
                          Tagihan <b>#{selectedCellInfo.cell.bill_id}</b> ({selectedCellInfo.cell.fee_type_name}) untuk santri <b>{selectedCellInfo.row.name}</b> sebesar <b>{formatCurrency(selectedCellInfo.cell.amount || selectedCellInfo.cell.base_amount || 0)}</b> akan dibatalkan secara permanen.
                        </p>
                      </div>

                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">
                          Tanggal Pembatalan <span className="text-rose-500">*</span>
                        </label>
                        <DatePickerField
                          value={cancelFormData.cancel_date}
                          onChange={(val) => setCancelFormData({ ...cancelFormData, cancel_date: val })}
                          placeholder="DD/MM/YYYY"
                          className="w-full"
                        />
                      </div>

                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">
                          Alasan Pembatalan Tagihan <span className="text-rose-500">*</span>
                        </label>
                        <textarea
                          required
                          rows={3}
                          placeholder="Contoh: Salah penetapan pos biaya / siswa telah mutasi / keringanan disetujui..."
                          value={cancelFormData.cancel_reason}
                          onChange={(e) => setCancelFormData({ ...cancelFormData, cancel_reason: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-rose-500 transition placeholder:text-slate-400"
                        />
                      </div>
                    </>
                  )}

                  <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setCancelModalOpen(false)}
                      className="px-4 py-2 border border-slate-200 text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-100 transition"
                    >
                      Tutup
                    </button>
                    {!hasPayment && (
                      <button
                        type="submit"
                        disabled={submittingCancel}
                        className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold shadow-xs shadow-rose-600/20 transition flex items-center gap-2 disabled:opacity-50"
                      >
                        {submittingCancel ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
                        <span>Konfirmasi Batalkan Tagihan</span>
                      </button>
                    )}
                  </div>
                </form>
              );
            })()}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: KONFIRMASI PENERBITAN KOLOM MASSAL */}
      {/* ============================================================ */}
      {columnPublishModalOpen && targetColumnInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-xl max-w-md w-full max-h-[90vh] flex flex-col shadow-xl border border-slate-200 overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold">
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Penerbitan Tagihan Kolom</h3>
                  <p className="text-[11px] text-slate-500">{targetColumnInfo.label}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setColumnPublishModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 sm:p-5 overflow-y-auto space-y-3.5 text-xs flex-1">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 space-y-1">
                <p className="font-bold flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                  Konfirmasi Penerbitan Massal
                </p>
                <p className="text-[11px] text-amber-800">
                  {selectedRowStudentIds.size > 0 ? (
                    <>Menerbitkan tagihan kolom <b>{targetColumnInfo.label}</b> khusus untuk <b>{selectedRowStudentIds.size} santri terpilih</b>.</>
                  ) : (
                    <>Menerbitkan tagihan kolom <b>{targetColumnInfo.label}</b> untuk <b>SEMUA ({matrixData.rows.length}) santri</b> pada tabel matriks ini.</>
                  )}
                </p>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1 text-slate-600 text-[11px]">
                <div className="flex justify-between">
                  <span>Jenis Biaya:</span>
                  <span className="font-bold text-slate-800">{targetColumnInfo.fee_type_name}</span>
                </div>
                <div className="flex justify-between">
                  <span>Periode:</span>
                  <span className="font-semibold text-slate-700">
                    {targetColumnInfo.month_label ? `Bulan ${targetColumnInfo.month_label} - ` : ''}T.A. {targetColumnInfo.period_year}
                  </span>
                </div>
              </div>

              {/* Tanggal Tagihan & Jatuh Tempo Kolom */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tanggal Tagihan</label>
                  <DatePickerField
                    value={columnPublishFormData.bill_date}
                    onChange={handleColumnBillDateChange}
                    placeholder="DD/MM/YYYY"
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Jatuh Tempo <span className="text-red-500">*</span></label>
                  <DatePickerField
                    value={columnPublishFormData.due_date}
                    onChange={handleColumnDueDateChange}
                    placeholder="DD/MM/YYYY"
                    align="right"
                    className="w-full"
                  />
                </div>
              </div>

              {/* Catatan Operasional Penerbitan */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Catatan Operasional Penerbitan</label>
                <input
                  type="text"
                  placeholder="Contoh: Penerbitan massal tagihan kolom..."
                  value={columnPublishFormData.notes}
                  onChange={(e) => setColumnPublishFormData({ ...columnPublishFormData, notes: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500 transition"
                />
              </div>

              {/* Aturan Transaksi Penagihan Kolom Massal */}
              <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <BookOpen className="w-4 h-4 text-indigo-700" />
                    <span className="font-bold text-indigo-900 text-xs">Aturan Transaksi Penagihan Kolom</span>
                  </div>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-300">
                    <RefreshCw className="w-3 h-3 text-indigo-600" /> Non-Kas (Piutang)
                  </span>
                </div>

                {(() => {
                  const activeRule = (columnPublishFormData.mapping_id
                    ? transactionRules.find((r) => r.id === Number(columnPublishFormData.mapping_id))
                    : null)
                    || transactionRules.find((r) => r.related_fee_type_id === targetColumnInfo?.fee_type_id && r.transaction_type === 'non_kas')
                    || transactionRules.find((r) => r.transaction_code === 'student_bill_issued')
                    || {
                        transaction_code: 'student_bill_issued',
                        transaction_label: 'Penerbitan Tagihan Siswa',
                        debit_account_name: 'Piutang Siswa',
                        debit_account_code: '201',
                        credit_account_name: 'Pendapatan Pendidikan',
                        credit_account_code: '601'
                      };

                  return (
                    <div className="bg-white p-2.5 rounded-lg border border-indigo-100 space-y-1.5 text-[11px]">
                      <div className="flex justify-between items-center text-slate-700">
                        <span>Aturan Diterapkan:</span>
                        <span className="font-bold text-slate-900">{activeRule?.transaction_label || 'Penerbitan Tagihan Siswa'}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100">
                        <div className="p-1.5 bg-slate-50 rounded-md border border-slate-200/60">
                          <div className="text-[10px] font-bold text-slate-500 uppercase">Debit (Piutang)</div>
                          <div className="font-semibold text-slate-800 mt-0.5">{activeRule?.debit_account_name || 'Piutang'}</div>
                          <div className="font-mono text-[10px] text-slate-400">{activeRule?.debit_account_code}</div>
                        </div>
                        <div className="p-1.5 bg-slate-50 rounded-md border border-slate-200/60">
                          <div className="text-[10px] font-bold text-slate-500 uppercase">Kredit (Pendapatan)</div>
                          <div className="font-semibold text-slate-800 mt-0.5">{activeRule?.credit_account_name || 'Pendapatan'}</div>
                          <div className="font-mono text-[10px] text-slate-400">{activeRule?.credit_account_code}</div>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Opsi Penyesuaian Aturan Kolom */}
                <div>
                  <button
                    type="button"
                    onClick={() => setColumnPublishFormData({ ...columnPublishFormData, custom_rule_mode: !columnPublishFormData.custom_rule_mode })}
                    className="text-[11px] text-indigo-700 hover:text-indigo-800 font-semibold flex items-center gap-1"
                  >
                    <Sliders className="w-3 h-3" />
                    <span>{columnPublishFormData.custom_rule_mode ? 'Tutup Pilihan Aturan' : 'Sesuaikan / Ganti Aturan Penagihan'}</span>
                  </button>

                  {columnPublishFormData.custom_rule_mode && (
                    <div className="mt-2 pt-2 border-t border-indigo-200 animate-in fade-in">
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">Pilih Aturan Transaksi Penagihan:</label>
                      <SearchableSelect
                        options={transactionRules
                          .filter((r) => r.is_active && (r.transaction_type === 'non_kas' || r.transaction_code.includes('bill')))
                          .map((r) => ({
                            value: r.id,
                            label: `[${r.transaction_code}] ${r.transaction_label}`,
                            sublabel: `Debit: ${r.debit_account_name || '-'} • Kredit: ${r.credit_account_name || '-'}`
                          }))}
                        value={columnPublishFormData.mapping_id || ''}
                        onChange={(val) => setColumnPublishFormData({ ...columnPublishFormData, mapping_id: val })}
                        placeholder="-- Pilih Aturan Penagihan --"
                        searchPlaceholder="Cari aturan transaksi..."
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Pilihan Diskon Massal Kolom */}
              <div className="p-3 rounded-lg border border-amber-200/80 bg-amber-50/40 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={columnPublishFormData.has_discount}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setColumnPublishFormData({
                          ...columnPublishFormData,
                          has_discount: checked
                        });
                      }}
                      className="w-4 h-4 text-amber-600 rounded focus:ring-amber-500"
                    />
                    <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                      <Percent className="w-3.5 h-3.5 text-amber-700" /> Terapkan Diskon / Potongan Serentak pada Kolom Ini
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
                            <label className="block text-[11px] font-semibold text-slate-700 mb-1">Persentase Diskon Kolom (%)</label>
                            <div className="relative">
                              <input
                                type="number"
                                min="0"
                                max="100"
                                step="0.5"
                                value={columnPublishFormData.discount_percent}
                                onChange={(e) => setColumnPublishFormData({ ...columnPublishFormData, discount_percent: e.target.value })}
                                className="w-full pl-3 pr-8 py-1.5 bg-white border border-amber-300 rounded-lg font-bold text-xs"
                                placeholder="Contoh: 10"
                              />
                              <span className="absolute right-2.5 top-1.5 font-bold text-slate-400 text-xs">%</span>
                            </div>
                          </div>
                        ) : (
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-700 mb-1">Nominal Diskon Kolom (Rp)</label>
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
                          placeholder="Contoh: Promo Awal Tahun / Keringanan Serentak"
                          value={columnPublishFormData.discount_reason}
                          onChange={(e) => setColumnPublishFormData({ ...columnPublishFormData, discount_reason: e.target.value })}
                          className="w-full px-3 py-1.5 bg-white border border-amber-300 rounded-lg text-xs"
                        />
                      </div>
                    </div>

                    {/* Aturan Transaksi Diskon Kolom Massal */}
                    <div className="p-3 bg-white rounded-lg border border-amber-200 space-y-2 text-[11px]">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-amber-900">Aturan Transaksi Diskon Kolom:</span>
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                          <RefreshCw className="w-3 h-3" /> Non-Kas
                        </span>
                      </div>

                      {(() => {
                        const activeColDiscountRule = (columnPublishFormData.discount_mapping_id
                          ? transactionRules.find((r) => r.id === Number(columnPublishFormData.discount_mapping_id))
                          : null)
                          || transactionRules.find((r) => r.related_fee_type_id === targetColumnInfo?.fee_type_id && r.transaction_code.includes('discount'))
                          || transactionRules.find((r) => r.transaction_code === 'student_bill_discount')
                          || {
                              transaction_code: 'student_bill_discount',
                              transaction_label: 'Diskon Tagihan Siswa',
                              debit_account_name: 'Beban Diskon',
                              debit_account_code: '69001',
                              credit_account_name: 'Piutang Siswa',
                              credit_account_code: '201'
                            };

                        return (
                          <div className="space-y-1.5">
                            <div className="flex justify-between">
                              <span>Aturan Diterapkan:</span>
                              <span className="font-bold text-slate-800">{activeColDiscountRule?.transaction_label || 'Diskon Tagihan Siswa'}</span>
                            </div>
                            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100">
                              <div className="p-1.5 bg-slate-50 rounded-md border border-slate-200/60">
                                <div className="text-[10px] font-bold text-slate-500 uppercase">Debit (Beban Diskon)</div>
                                <div className="font-semibold text-slate-800 mt-0.5">{activeColDiscountRule?.debit_account_name || 'Beban Diskon'}</div>
                                <div className="font-mono text-[10px] text-slate-400">{activeColDiscountRule?.debit_account_code}</div>
                              </div>
                              <div className="p-1.5 bg-slate-50 rounded-md border border-slate-200/60">
                                <div className="text-[10px] font-bold text-slate-500 uppercase">Kredit (Piutang)</div>
                                <div className="font-semibold text-slate-800 mt-0.5">{activeColDiscountRule?.credit_account_name || 'Piutang Terkait'}</div>
                                <div className="font-mono text-[10px] text-slate-400">{activeColDiscountRule?.credit_account_code}</div>
                              </div>
                            </div>
                          </div>
                        );
                      })()}

                      {/* Penyesuaian Aturan Diskon Kolom */}
                      <div>
                        <button
                          type="button"
                          onClick={() => setColumnPublishFormData({ ...columnPublishFormData, custom_discount_rule_mode: !columnPublishFormData.custom_discount_rule_mode })}
                          className="text-[11px] text-amber-800 hover:text-amber-900 font-semibold flex items-center gap-1"
                        >
                          <Sliders className="w-3 h-3" />
                          <span>{columnPublishFormData.custom_discount_rule_mode ? 'Tutup Pilihan Aturan Diskon' : 'Sesuaikan / Ganti Aturan Diskon'}</span>
                        </button>

                        {columnPublishFormData.custom_discount_rule_mode && (
                          <div className="mt-2 pt-2 border-t border-amber-100 animate-in fade-in">
                            <SearchableSelect
                              options={transactionRules
                                .filter((r) => r.is_active && (r.transaction_code.includes('discount') || r.transaction_type === 'non_kas'))
                                .map((r) => ({
                                  value: r.id,
                                  label: `[${r.transaction_code}] ${r.transaction_label}`,
                                  sublabel: `Debit: ${r.debit_account_name || '-'} • Kredit: ${r.credit_account_name || '-'}`
                                }))}
                              value={columnPublishFormData.discount_mapping_id || ''}
                              onChange={(val) => setColumnPublishFormData({ ...columnPublishFormData, discount_mapping_id: val })}
                              placeholder="-- Pilih Aturan Diskon --"
                              searchPlaceholder="Cari aturan diskon..."
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="p-3.5 sm:p-4 px-4 sm:px-5 border-t border-slate-100 shrink-0 bg-slate-50/70 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setColumnPublishModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-100 transition"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleExecuteColumnPublish}
                  disabled={submittingColumnPublish}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs shadow-emerald-600/20 transition flex items-center gap-2 disabled:opacity-50"
                >
                  {submittingColumnPublish ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                  <span>Eksekusi Penerbitan Kolom</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: IMPORT DATA EXCEL PER KOLOM & REVIEW DATA (Fitur Baru) */}
      {/* ============================================================ */}
      {columnImportModalOpen && targetImportColumnInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-xl border border-slate-200 overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-indigo-50/70 via-slate-50 to-emerald-50/50 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-indigo-600 to-emerald-600 text-white flex items-center justify-center font-bold shadow-xs shadow-indigo-500/20">
                  <FileSpreadsheet className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm sm:text-base font-bold text-slate-800">Import Data Tagihan (Excel)</h3>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase ${targetImportColumnInfo.badge_color || 'bg-indigo-100 text-indigo-800 border-indigo-200'}`}>
                      {targetImportColumnInfo.badge_text || 'Kolom Tagihan'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-medium">
                    Kolom Target: <span className="font-bold text-slate-700">{targetImportColumnInfo.fee_type_name}</span> ({targetImportColumnInfo.label}) • T.A. {targetImportColumnInfo.period_year}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setColumnImportModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body (Scrollable) */}
            <div className="p-4 sm:p-5 overflow-y-auto space-y-3.5 text-xs flex-1">
              {/* Bagian 1: Identitas Dokumen & Unduh Format */}
              <div className="p-3.5 rounded-lg bg-indigo-50/60 border border-indigo-200/80 space-y-2.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="w-4 h-4 rounded-full bg-indigo-600 text-white font-bold text-[10px] flex items-center justify-center">1</span>
                      <h4 className="font-bold text-indigo-950 text-xs">Identitas &amp; Unduh Format Excel</h4>
                    </div>
                    <p className="text-[11px] text-indigo-900 leading-relaxed">
                      Satu berkas Excel berlaku <b>khusus untuk kolom ini pada Tahun Ajaran terkait</b>. Baris 1-5 di file Excel memuat identitas dokumen verifikasi otomatis.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDownloadColumnTemplate(targetImportColumnInfo)}
                    className="shrink-0 px-3.5 py-2 bg-white border border-indigo-300 hover:border-indigo-600 hover:bg-indigo-50/70 text-indigo-700 rounded-lg font-bold flex items-center justify-center gap-2 transition shadow-2xs hover:shadow-xs text-xs"
                  >
                    <Download className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Unduh Format Excel (Terisi Data)</span>
                  </button>
                </div>

                <div className="bg-white/80 p-2.5 rounded-lg border border-indigo-100 flex items-center gap-2 text-[11px] text-indigo-800">
                  <Info className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                  <span>
                    Format yang diunduh sudah berisi seluruh daftar santri aktif rombel beserta data tagihan/tarif yang ada di kolom ini saat ini.
                  </span>
                </div>
              </div>

              {/* Bagian 2: Unggah Berkas Excel */}
              <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200/80 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-4 h-4 rounded-full bg-slate-700 text-white font-bold text-[10px] flex items-center justify-center">2</span>
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
                  className="border-2 border-dashed border-slate-300 hover:border-indigo-500 bg-white rounded-xl p-4 text-center cursor-pointer transition group"
                >
                  <input
                    type="file"
                    ref={importFileInputRef}
                    accept=".xlsx, .xls, .csv"
                    onChange={handleImportFileUpload}
                    className="hidden"
                  />
                  <div className="w-9 h-9 mx-auto rounded-lg bg-indigo-50 text-indigo-600 group-hover:scale-110 flex items-center justify-center mb-1.5 transition">
                    <UploadCloud className="w-4 h-4" />
                  </div>
                  {importFileName ? (
                    <div>
                      <p className="font-bold text-slate-800 text-xs">{importFileName}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">Klik di sini untuk mengganti berkas Excel</p>
                    </div>
                  ) : (
                    <div>
                      <p className="font-bold text-slate-700 text-xs">Pilih atau Seret Berkas Excel ke Sini</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">Mendukung format .xlsx dan .xls (Kolom NIS, Nama, Rombel, Nominal, Tgl Tagihan, Jatuh Tempo, Catatan)</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Status Validasi File */}
              {importFileValidation && (
                <div>
                  {importFileValidation.isValid ? (
                    <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-lg text-emerald-900 space-y-1">
                      <div className="flex items-center gap-2 font-bold text-xs text-emerald-800">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>Identitas Dokumen &amp; Format Terverifikasi Valid</span>
                      </div>
                      <p className="text-[11px] text-emerald-800">
                        Tahun Ajaran: <b>{importFileValidation.docAyName}</b> • Jenis Biaya: <b>{importFileValidation.docFeeTypeName}</b> • Terbaca: <b>{importFileValidation.totalRows} baris ({importFileValidation.validRows} siap diproses)</b>
                      </p>
                    </div>
                  ) : (
                    <div className="p-3 bg-rose-50 border border-rose-300 rounded-lg text-rose-900 space-y-1">
                      <div className="flex items-center gap-2 font-bold text-xs text-rose-800">
                        <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                        <span>Validasi Dokumen Tidak Cocok</span>
                      </div>
                      <p className="text-[11px] text-rose-800 leading-relaxed">
                        {importFileValidation.errorMsg}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Bagian 3: Review Data Preview Table (Ketika Data Terbaca) */}
              {importParsedRows.length > 0 && (
                <div className="p-3.5 rounded-lg bg-white border border-slate-200/90 shadow-2xs space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="w-4 h-4 rounded-full bg-indigo-600 text-white font-bold text-[10px] flex items-center justify-center">3</span>
                      <h4 className="font-bold text-slate-800 text-xs">Review Data Santri yang Akan Diinput ({importParsedRows.length} Data)</h4>
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
                          title="Siswa tidak ditemukan"
                        >
                          Masalah ({importParsedRows.filter((r) => r.change_status === 'invalid').length})
                        </button>
                      </div>

                      <div className="relative">
                        <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-slate-400" />
                        <input
                          type="text"
                          placeholder="Cari santri/NIS..."
                          value={importSearchFilter}
                          onChange={(e) => setImportSearchFilter(e.target.value)}
                          className="pl-8 pr-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-[11px] w-36 focus:w-48 transition-all"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Summary Metric Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    <div className="p-2 rounded-lg bg-slate-50 border border-slate-200 text-center">
                      <p className="text-[10px] text-slate-500 font-medium">Total Baris</p>
                      <p className="text-sm font-bold text-slate-800">{importParsedRows.length}</p>
                    </div>
                    <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-center">
                      <p className="text-[10px] text-emerald-700 font-medium">Baru / Ditimpa</p>
                      <p className="text-sm font-bold text-emerald-800">
                        {importParsedRows.filter((r) => r.change_status === 'new' || r.change_status === 'updated').length}
                      </p>
                    </div>
                    <div className="p-2 rounded-lg bg-slate-100 border border-slate-300 text-center">
                      <p className="text-[10px] text-slate-600 font-medium">Sama (Tidak Diubah)</p>
                      <p className="text-sm font-bold text-slate-700">
                        {importParsedRows.filter((r) => r.change_status === 'unchanged').length}
                      </p>
                    </div>
                    <div className="p-2 rounded-lg bg-amber-50 border border-amber-200 text-center">
                      <p className="text-[10px] text-amber-700 font-medium">Nominal 0 (Dilewati)</p>
                      <p className="text-sm font-bold text-amber-800">
                        {importParsedRows.filter((r) => r.change_status === 'skipped_zero').length}
                      </p>
                    </div>
                    <div className="p-2 rounded-lg bg-indigo-50 border border-indigo-200 text-center col-span-2 sm:col-span-1">
                      <p className="text-[10px] text-indigo-700 font-medium">Total Akumulasi</p>
                      <p className="text-xs font-bold font-mono text-indigo-900 truncate">
                        {formatCurrency(importParsedRows.reduce((acc, r) => acc + (r.is_valid && r.amount > 0 ? parseFloat(r.amount || 0) : 0), 0))}
                      </p>
                    </div>
                  </div>

                  {/* Review Table */}
                  <div className="table-container max-h-[300px]">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-100 text-slate-700 font-bold sticky top-0 z-10 border-b border-slate-200">
                        <tr>
                          <th className="px-3 py-2 text-center w-10">No</th>
                          <th className="px-3 py-2 w-32">Status Perubahan</th>
                          <th className="px-3 py-2 w-24">NIS / NIPD</th>
                          <th className="px-3 py-2">Nama Santri</th>
                          <th className="px-3 py-2 w-24">Rombel</th>
                          <th className="px-3 py-2 text-right w-28 num-cell">Nominal</th>
                          <th className="px-3 py-2 text-center w-24">Tgl Tagihan</th>
                          <th className="px-3 py-2 text-center w-24">Jatuh Tempo</th>
                          <th className="px-3 py-2 max-w-[140px]">Catatan</th>
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
                              const matchNis = String(r.nis || '').toLowerCase().includes(q);
                              const matchName = String(r.name || '').toLowerCase().includes(q);
                              const matchClass = String(r.class_name || '').toLowerCase().includes(q);
                              if (!matchNis && !matchName && !matchClass) return false;
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
                                      ? 'bg-indigo-50/30'
                                      : idx % 2 === 1
                                        ? 'bg-slate-50/30'
                                        : 'bg-white'
                              }`}
                            >
                              <td className="px-3 py-2 text-center text-slate-400 font-mono text-[11px]">{r.row_index || idx + 1}</td>
                              <td className="px-3 py-2">
                                {r.change_status === 'new' ? (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                    <Sparkles className="w-3 h-3 text-emerald-600" /> Data Baru
                                  </span>
                                ) : r.change_status === 'updated' ? (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-800" title={r.diff_summary}>
                                    <Edit2 className="w-3 h-3 text-indigo-600" /> Ditimpa
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
                              <td className="px-3 py-2 font-mono text-slate-600 text-[11px]">{r.nis || '-'}</td>
                              <td className="px-3 py-2 font-bold text-slate-800 truncate max-w-[200px]" title={r.name}>
                                {r.name}
                                {r.diff_summary && (
                                  <span className="block text-[10px] text-indigo-600 font-normal truncate">{r.diff_summary}</span>
                                )}
                                {!r.is_valid && r.validation_error && (
                                  <span className="block text-[10px] text-rose-600 font-normal">{r.validation_error}</span>
                                )}
                              </td>
                              <td className="px-3 py-2 text-slate-600 text-[11px]">{r.class_name || '-'}</td>
                              <td className={`px-3 py-2 text-right font-mono font-bold text-[11px] num-cell tnum ${r.amount <= 0 ? 'text-slate-400' : 'text-slate-900'}`}>
                                {formatCurrency(r.amount || 0)}
                              </td>
                              <td className="px-3 py-2 text-center font-mono text-[11px] text-slate-600">{r.bill_date ? formatDateToDMY(r.bill_date) : '-'}</td>
                              <td className="px-3 py-2 text-center font-mono text-[11px] text-slate-600">{r.due_date ? formatDateToDMY(r.due_date) : '-'}</td>
                              <td className="px-3 py-2 text-slate-500 text-[11px] max-w-[140px] truncate" title={r.notes}>{r.notes || '-'}</td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Aturan Jurnal Akuntansi Penagihan (Otomatis & Transparan) */}
                  <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-lg space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <BookOpen className="w-4 h-4 text-indigo-700" />
                        <span className="font-bold text-indigo-900 text-xs">Aturan Jurnal Akuntansi (Khusus jika Langsung Diterbitkan)</span>
                      </div>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-300">
                        <RefreshCw className="w-3 h-3 text-indigo-600" /> Non-Kas (Akrual Piutang)
                      </span>
                    </div>

                    {(() => {
                      const activeRule = (importAccountingRuleId
                        ? transactionRules.find((r) => r.id === Number(importAccountingRuleId))
                        : null)
                        || transactionRules.find((r) => r.related_fee_type_id === targetImportColumnInfo?.fee_type_id && r.transaction_type === 'non_kas')
                        || transactionRules.find((r) => r.transaction_code === 'student_bill_issued')
                        || {
                            transaction_code: 'student_bill_issued',
                            transaction_label: 'Penerbitan Tagihan Siswa',
                            debit_account_code: '201',
                            debit_account_name: 'Piutang Siswa',
                            credit_account_code: '601',
                            credit_account_name: 'Pendapatan Pendidikan'
                          };

                      return (
                        <div className="bg-white p-2.5 rounded-lg border border-indigo-100 space-y-1 text-[11px]">
                          <div className="flex justify-between items-center text-slate-700">
                            <span>Aturan Transaksi:</span>
                            <span className="font-bold text-slate-900">{activeRule?.transaction_label || 'Penerbitan Tagihan Siswa'}</span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100 text-[10px]">
                            <div className="bg-slate-50 p-1.5 rounded-md border border-slate-200">
                              <span className="text-slate-400 block font-semibold">Debit (Posisi Aktiva/Piutang)</span>
                              <span className="font-bold text-slate-800">{activeRule?.debit_account_name || 'Piutang Santri'}</span>
                              <span className="text-slate-500 font-mono ml-1">({activeRule?.debit_account_code || '201'})</span>
                            </div>
                            <div className="bg-slate-50 p-1.5 rounded-md border border-slate-200">
                              <span className="text-slate-400 block font-semibold">Kredit (Pendapatan)</span>
                              <span className="font-bold text-slate-800">{activeRule?.credit_account_name || 'Pendapatan Biaya'}</span>
                              <span className="text-slate-500 font-mono ml-1">({activeRule?.credit_account_code || '601'})</span>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer: 2 Action Buttons (Simpan Draf vs Langsung Terbitkan) */}
            <div className="p-3.5 sm:p-4 px-4 sm:px-5 border-t border-slate-100 shrink-0 bg-slate-50/90 flex flex-col sm:flex-row items-center justify-between gap-2.5">
              <button
                type="button"
                onClick={() => setColumnImportModalOpen(false)}
                className="w-full sm:w-auto px-4 py-2 border border-slate-200 text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-100 transition"
              >
                Batal
              </button>

              <div className="w-full sm:w-auto flex flex-col sm:flex-row items-center gap-2">
                {/* Opsi 1: Simpan Draf (Belum Diterbitkan) */}
                <button
                  type="button"
                  onClick={() => handleExecuteImport('draft')}
                  disabled={submittingImport || importParsedRows.length === 0 || !importFileValidation?.isValid}
                  className="w-full sm:w-auto px-4 py-2 bg-white border border-slate-300 hover:border-slate-400 text-slate-700 hover:bg-slate-50 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 disabled:opacity-40 shadow-2xs"
                  title="Simpan data tagihan sebagai draf ke tabel matriks tanpa menerbitkan/mencatat jurnal"
                >
                  {submittingImport ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5 text-slate-600" />}
                  <span>Simpan Draf (Belum Diterbitkan)</span>
                </button>

                {/* Opsi 2: Langsung Terbitkan & Catat Jurnal */}
                <button
                  type="button"
                  onClick={() => handleExecuteImport('publish')}
                  disabled={submittingImport || importParsedRows.length === 0 || !importFileValidation?.isValid}
                  className="w-full sm:w-auto px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs shadow-emerald-600/20 transition flex items-center justify-center gap-2 disabled:opacity-40"
                  title="Terbitkan tagihan resmi ke santri dan langsung catat jurnal akuntansi piutang"
                >
                  {submittingImport ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5 text-emerald-200" />}
                  <span>Langsung Terbitkan &amp; Catat Jurnal</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: DETAIL & RIWAYAT AUDIT TAGIHAN */}
      {/* ============================================================ */}
      {detailModalOpen && selectedBillDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-xl max-w-xl w-full shadow-xl border border-slate-200 overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Detail Tagihan Siswa #{selectedBillDetail.id}</h3>
                  <p className="text-[11px] text-slate-500">{selectedBillDetail.student_name || `Siswa ID ${selectedBillDetail.student_id}`}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDetailModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 sm:p-5 space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                <div>
                  <span className="text-slate-400 text-[10px] block">Jenis Biaya</span>
                  <span className="font-bold text-slate-800">{selectedBillDetail.fee_type_name}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block">Pola &amp; Periode</span>
                  <span className="font-semibold text-slate-700">
                    {selectedBillDetail.period_month ? `Bulan ${selectedBillDetail.period_month} / ` : ''}T.A. {selectedBillDetail.period_year}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block">Nominal Bersih</span>
                  <span className="font-mono font-bold text-emerald-700 text-sm">
                    {formatCurrency(selectedBillDetail.amount || 0)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block mb-1">Status Pembayaran</span>
                  <StatusPill
                    variant={
                      selectedBillDetail.status === 'paid' ? 'success' :
                      selectedBillDetail.status === 'partially_paid' ? 'info' :
                      selectedBillDetail.status === 'cancelled' ? 'neutral' : 'danger'
                    }
                    size="sm"
                    dot
                  >
                    {selectedBillDetail.status === 'paid' ? 'Lunas' :
                     selectedBillDetail.status === 'partially_paid' ? 'Sebagian' :
                     selectedBillDetail.status === 'cancelled' ? 'Dibatalkan' : 'Belum Bayar'}
                  </StatusPill>
                </div>
              </div>

              {selectedBillDetail.discount_amount > 0 && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 text-[11px]">
                  <p className="font-bold">Potongan / Diskon Tercatat</p>
                  <p>{formatCurrency(selectedBillDetail.discount_amount)} ({selectedBillDetail.discount_reason || 'Dispensasi'})</p>
                </div>
              )}

              {/* Riwayat Pembayaran Masuk */}
              <div>
                <p className="font-bold text-slate-700 mb-2">Riwayat Pembayaran Masuk</p>
                {selectedBillDetail.payments && selectedBillDetail.payments.length > 0 ? (
                  <div className="space-y-1.5">
                    {selectedBillDetail.payments.map((p) => (
                      <div key={p.id} className="p-2.5 rounded-lg bg-emerald-50/60 border border-emerald-200 flex justify-between items-center text-[11px]">
                        <div>
                          <span className="font-bold text-slate-800">{formatCurrency(p.amount)}</span>
                          <span className="text-slate-500 ml-2">via {p.payment_method} ({p.receipt_number || '-'})</span>
                        </div>
                        <span className="font-mono text-slate-500">{new Date(p.paid_at).toLocaleDateString('id-ID')}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-400 italic text-[11px]">Belum ada pembayaran yang tercatat.</p>
                )}
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => setDetailModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-lg text-xs transition"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: REVISI TAGIHAN (BAGIAN 3) */}
      {/* ============================================================ */}
      {reviseModalOpen && revisingBill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-xl max-w-md w-full shadow-xl border border-slate-200 overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-600 text-white flex items-center justify-center font-bold">
                  <Edit2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Revisi Tagihan #{revisingBill.id}</h3>
                  <p className="text-[11px] text-slate-500">{revisingBill.student_name}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setReviseModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveReviseBill} className="p-4 sm:p-5 space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nominal Baru (Rp) *</label>
                <input
                  type="number"
                  required
                  min="0"
                  value={reviseFormData.new_amount}
                  onChange={(e) => setReviseFormData({ ...reviseFormData, new_amount: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500 text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Alasan Revisi Operasional *</label>
                <textarea
                  required
                  rows="2"
                  value={reviseFormData.revision_reason}
                  onChange={(e) => setReviseFormData({ ...reviseFormData, revision_reason: e.target.value })}
                  placeholder="Wajib isi alasan perubahan nominal tagihan..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-emerald-500 text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setReviseModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-100 transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submittingRevise}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold flex items-center gap-2 disabled:opacity-50 transition"
                >
                  {submittingRevise ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Edit2 className="w-3.5 h-3.5" />}
                  <span>Simpan Revisi</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: BROADCAST REMINDER TAGIHAN (TAB 3) */}
      {/* ============================================================ */}
      {broadcastModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-xl max-w-lg w-full shadow-xl border border-slate-200 overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-amber-500 to-orange-500 text-white">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center font-bold">
                  <Send className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold">Broadcast Pengingat Tagihan</h3>
                  <p className="text-[11px] text-amber-100">Kirim notifikasi pesan ke Portal Orang Tua</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setBroadcastModalOpen(false)}
                className="p-1.5 text-white/80 hover:text-white rounded-lg transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 sm:p-5 space-y-3.5 text-xs">
              <div className="space-y-2">
                <label className="block font-semibold text-slate-700">Target Penerima Pengingat:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setBroadcastFilterMode('overdue');
                      const overdue = historyBills.filter((b) => b.status === 'unpaid' && b.due_date && new Date(b.due_date) < new Date());
                      setBroadcastSelectedBillIds(overdue.map((b) => b.id));
                    }}
                    className={`p-2.5 rounded-lg border text-left transition font-semibold ${
                      broadcastFilterMode === 'overdue'
                        ? 'border-rose-500 bg-rose-50 text-rose-800'
                        : 'border-slate-200 bg-slate-50 text-slate-600'
                    }`}
                  >
                    <p className="text-xs">Lewat Jatuh Tempo</p>
                    <p className="text-[10px] text-slate-400 font-normal">
                      {historyBills.filter((b) => b.status === 'unpaid' && b.due_date && new Date(b.due_date) < new Date()).length} tagihan overdue
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setBroadcastFilterMode('unpaid_all');
                      const allUnpaid = historyBills.filter((b) => b.status === 'unpaid' || b.status === 'partially_paid');
                      setBroadcastSelectedBillIds(allUnpaid.map((b) => b.id));
                    }}
                    className={`p-2.5 rounded-lg border text-left transition font-semibold ${
                      broadcastFilterMode === 'unpaid_all'
                        ? 'border-amber-500 bg-amber-50 text-amber-800'
                        : 'border-slate-200 bg-slate-50 text-slate-600'
                    }`}
                  >
                    <p className="text-xs">Semua Belum Lunas</p>
                    <p className="text-[10px] text-slate-400 font-normal">
                      {historyBills.filter((b) => b.status === 'unpaid' || b.status === 'partially_paid').length} tagihan aktif
                    </p>
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Pesan Khusus Tambahan (Opsional)
                </label>
                <textarea
                  rows="3"
                  value={broadcastCustomMessage}
                  onChange={(e) => setBroadcastCustomMessage(e.target.value)}
                  placeholder="Kosongkan untuk menggunakan template pesan resmi default..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 text-[11px] flex items-start gap-2">
                <Info className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  Pesan akan otomatis terkirim ke <b>{broadcastSelectedBillIds.length} wali murid</b> dan tercatat di riwayat reminder.
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setBroadcastModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-100 transition"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleExecuteBroadcastReminders}
                  disabled={submittingBroadcast || broadcastSelectedBillIds.length === 0}
                  className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white rounded-lg text-xs font-bold flex items-center gap-2 disabled:opacity-50 transition shadow-xs"
                >
                  {submittingBroadcast ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  <span>Kirim ke {broadcastSelectedBillIds.length} Santri</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: RINCIAN TAGIHAN SANTRI ALUMNI (READ-ONLY) */}
      {/* ============================================================ */}
      {alumniDetailModalOpen && selectedAlumnusDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-xl max-w-3xl w-full shadow-xl border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-900 to-indigo-950 text-white shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center text-amber-400 font-bold">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold">Rincian Tagihan Santri Alumni</h3>
                  <p className="text-[11px] text-slate-300">
                    {selectedAlumnusDetail.full_name} • NIS: {selectedAlumnusDetail.nis || selectedAlumnusDetail.nipd || '-'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAlumniDetailModalOpen(false)}
                className="p-1.5 text-white/80 hover:text-white rounded-lg transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-5 space-y-3.5 overflow-y-auto flex-1 text-xs">
              {/* Profile & Arrears Banner */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <div>
                  <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Status &amp; Angkatan</p>
                  <p className="font-semibold text-slate-800 mt-0.5">
                    {selectedAlumnusDetail.graduation_academic_year_name !== '-' ? `Lulus ${selectedAlumnusDetail.graduation_academic_year_name}` : 'Alumni'}
                    {selectedAlumnusDetail.cohort_name && selectedAlumnusDetail.cohort_name !== '-' ? ` (${selectedAlumnusDetail.cohort_name})` : ''}
                  </p>
                  <p className="text-[11px] text-slate-500">{selectedAlumnusDetail.last_class_name || 'Alumni'}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Total Riwayat Tagihan</p>
                  <p className="font-mono font-bold text-slate-800 text-sm mt-0.5">
                    {formatCurrency(selectedAlumnusDetail.total_bills || 0)}
                  </p>
                  <p className="text-[10px] text-emerald-600 font-medium">
                    Terbayar: {formatCurrency(selectedAlumnusDetail.total_paid || 0)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Sisa Tunggakan</p>
                  <p className="font-mono font-bold text-rose-700 text-sm mt-0.5">
                    {formatCurrency(selectedAlumnusDetail.total_remaining || 0)}
                  </p>
                  <div className="mt-1">
                    <StatusPill
                      variant={selectedAlumnusDetail.total_remaining > 0 ? 'danger' : 'success'}
                      size="sm"
                      dot
                    >
                      {selectedAlumnusDetail.total_remaining > 0 ? `${selectedAlumnusDetail.unpaid_bills_count} tagihan belum lunas` : 'Lunas Sepenuhnya'}
                    </StatusPill>
                  </div>
                </div>
              </div>

              {/* Table Breakdown Tagihan */}
              <div>
                <h4 className="font-bold text-slate-800 text-xs mb-2 flex items-center gap-1.5">
                  <Receipt className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Daftar Rincian Seluruh Tagihan</span>
                </h4>
                {(!selectedAlumnusDetail.bills || selectedAlumnusDetail.bills.length === 0) ? (
                  <div className="p-6 text-center text-slate-400 bg-slate-50 rounded-lg border border-slate-200">
                    Tidak ada rincian tagihan tercatat untuk alumni ini.
                  </div>
                ) : (
                  <div className="table-container max-h-[350px]">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 sticky top-0 z-10">
                        <tr>
                          <th className="px-3 py-2 text-center w-10">No</th>
                          <th className="px-3 py-2">Pos Biaya &amp; Periode</th>
                          <th className="px-3 py-2">T.A. Asal</th>
                          <th className="px-3 py-2 text-right num-cell">Nominal</th>
                          <th className="px-3 py-2 text-right num-cell">Diskon</th>
                          <th className="px-3 py-2 text-right num-cell">Terbayar</th>
                          <th className="px-3 py-2 text-right num-cell">Sisa</th>
                          <th className="px-3 py-2 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {selectedAlumnusDetail.bills.map((bill, bIdx) => (
                          <tr key={bill.id || bIdx} className="hover:bg-slate-50/80 transition">
                            <td className="px-3 py-2 text-center text-slate-400 font-mono text-[11px]">{bIdx + 1}</td>
                            <td className="px-3 py-2">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-bold text-slate-800">{bill.fee_type_name}</span>
                                {bill.is_manual && (
                                  <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                                    Input Manual
                                  </span>
                                )}
                              </div>
                              {bill.period_month && (
                                <span className="text-[10px] text-slate-500 block">
                                  Bulan {bill.period_month} / {bill.period_year}
                                </span>
                              )}
                              {bill.notes && (
                                <span className="text-[10px] text-slate-500 italic block mt-0.5">
                                  Catatan: {bill.notes}
                                </span>
                              )}
                            </td>
                            <td className="px-3 py-2 text-slate-600 font-medium">
                              {bill.academic_year_name || `T.A. ${bill.period_year || '-'}`}
                            </td>
                            <td className="px-3 py-2 text-right font-mono text-slate-700 num-cell tnum">
                              {formatCurrency(bill.amount || 0)}
                            </td>
                            <td className="px-3 py-2 text-right font-mono text-amber-600 num-cell tnum">
                              {bill.discount_amount > 0 ? formatCurrency(bill.discount_amount) : '-'}
                            </td>
                            <td className="px-3 py-2 text-right font-mono text-emerald-700 num-cell tnum">
                              {formatCurrency(bill.paid_amount || 0)}
                            </td>
                            <td className="px-3 py-2 text-right font-mono font-bold num-cell tnum">
                              {bill.remaining_amount > 0 ? (
                                <span className="text-rose-700">{formatCurrency(bill.remaining_amount)}</span>
                              ) : (
                                <span className="text-slate-400">Rp 0</span>
                              )}
                            </td>
                            <td className="px-3 py-2 text-center">
                              <StatusPill
                                variant={
                                  bill.status === 'paid' || bill.remaining_amount === 0 ? 'success' :
                                  bill.status === 'partially_paid' || (bill.paid_amount > 0 && bill.remaining_amount > 0) ? 'info' : 'danger'
                                }
                                size="sm"
                              >
                                {bill.status === 'paid' || bill.remaining_amount === 0 ? 'Lunas' :
                                 bill.status === 'partially_paid' || (bill.paid_amount > 0 && bill.remaining_amount > 0) ? 'Sebagian' : 'Belum Bayar'}
                              </StatusPill>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-3.5 sm:p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50 shrink-0">
              <span className="text-[11px] text-slate-400 italic">
                * Halaman tampilan data riwayat tagihan &amp; tunggakan alumni (Read-Only).
              </span>
              <button
                type="button"
                onClick={() => setAlumniDetailModalOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold transition shadow-xs"
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
