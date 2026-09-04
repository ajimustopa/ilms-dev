import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { useAuth } from '../../../shared/store/AuthContext';
import api from '../../../shared/services/api';
import SearchableSelect from '../../../shared/components/SearchableSelect';
import DatePickerField from '../../../shared/components/DatePickerField';
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
  HelpCircle
} from 'lucide-react';

export default function StudentBills() {
  const navigate = useNavigate();
  const { activeSchoolUnit } = useAuth();

  // ------------------------------------------------------------
  // 1. GLOBAL CONTEXT & TABS
  // ------------------------------------------------------------
  const [activeTab, setActiveTab] = useState('matrix'); // 'matrix' | 'history' | 'reminders'
  const [academicYears, setAcademicYears] = useState([]);
  const [selectedAcademicYearId, setSelectedAcademicYearId] = useState(() => {
    try {
      return localStorage.getItem('keuangan_bills_selected_ay_id') || '';
    } catch {
      return '';
    }
  });

  const [classGroups, setClassGroups] = useState([]);
  const [feeTypes, setFeeTypes] = useState([]);
  const [coasList, setCoasList] = useState([]);
  const [transactionRules, setTransactionRules] = useState([]);

  // ------------------------------------------------------------
  // 2. TAB 1: MATRIX PENETAPAN & PENAGIHAN STATE
  // ------------------------------------------------------------
  const [matrixData, setMatrixData] = useState({ columns: [], rows: [], summary: {}, academic_year: {} });
  const [matrixLoading, setMatrixLoading] = useState(false);
  const [matrixFilterClassId, setMatrixFilterClassId] = useState('');
  const [matrixSearch, setMatrixSearch] = useState('');
  const [selectedRowStudentIds, setSelectedRowStudentIds] = useState(new Set());

  // Modal Penerbitan / Edit Sel Matrix
  const [cellModalOpen, setCellModalOpen] = useState(false);
  const [selectedCellInfo, setSelectedCellInfo] = useState(null);
  const [cellFormData, setCellFormData] = useState({
    amount: '',
    bill_date: new Date().toISOString().slice(0, 10),
    due_date: '',
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
  const [broadcastModalOpen, setBroadcastModalOpen] = useState(false);
  const [broadcastFilterMode, setBroadcastFilterMode] = useState('overdue'); // 'overdue' | 'unpaid_all' | 'selected'
  const [broadcastSelectedBillIds, setBroadcastSelectedBillIds] = useState([]);
  const [broadcastCustomMessage, setBroadcastCustomMessage] = useState('');
  const [submittingBroadcast, setSubmittingBroadcast] = useState(false);

  // Quick single reminder
  const [sendingSingleReminderId, setSendingSingleReminderId] = useState(null);

  // ============================================================
  // LOAD MASTER CONTEXT (Academic Years, Classes, Fee Types)
  // ============================================================
  useEffect(() => {
    const fetchMasterContext = async () => {
      try {
        const ayParams = {};
        if (activeSchoolUnit && activeSchoolUnit.id && activeSchoolUnit.id !== 'all' && !activeSchoolUnit.is_foundation) {
          ayParams.satuan_pendidikan_id = activeSchoolUnit.id;
        }

        const [ayRes, clsRes, ftRes, coaRes, trRes] = await Promise.allSettled([
          api.get('/akademik/academic-years', { params: ayParams }),
          api.get('/akademik/class-groups'),
          api.get('/keuangan/fee-types'),
          api.get('/keuangan/chart-of-accounts'),
          api.get('/keuangan/transaction-account-mappings')
        ]);

        let yearsList = [];
        if (ayRes.status === 'fulfilled' && ayRes.value.data) {
          yearsList = ayRes.value.data?.data || ayRes.value.data?.academic_years || (Array.isArray(ayRes.value.data) ? ayRes.value.data : []);
        }

        // Fallback jika kosong
        if (yearsList.length === 0) {
          try {
            const fallbackRes = await api.get('/keuangan/academic-years').catch(() => api.get('/keuangan/master-data/academic-years'));
            yearsList = fallbackRes?.data?.data || [];
          } catch (e) {
            console.warn('Fallback AY error:', e);
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
          const found = finalYears.find((y) => String(y.id) === String(selectedAcademicYearId));
          if (!found) {
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
      } catch (err) {
        console.error('Error fetching master context:', err);
      }
    };

    fetchMasterContext();
  }, [activeSchoolUnit]);

  // Save selected AY ID to local storage
  useEffect(() => {
    if (selectedAcademicYearId) {
      try {
        localStorage.setItem('keuangan_bills_selected_ay_id', selectedAcademicYearId);
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
    } else if (activeTab === 'history') {
      fetchHistoryBills();
    } else if (activeTab === 'reminders') {
      fetchReminderLogs();
    }
  }, [activeTab, selectedAcademicYearId, matrixFilterClassId, historyFilterClassId, historyFilterFeeTypeId, historyFilterStatus]);

  // Debounced search for matrix
  useEffect(() => {
    if (activeTab !== 'matrix') return;
    const timer = setTimeout(() => {
      fetchMatrixData();
    }, 350);
    return () => clearTimeout(timer);
  }, [matrixSearch]);

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

  // Open Cell Modal
  const handleOpenCellModal = (row, cell) => {
    setSelectedCellInfo({ row, cell });
    const isAlreadyPublished = cell.is_published;
    const ft = feeTypes.find((f) => f.id === cell.fee_type_id);
    const defaultRuleId = ft?.billing_account_mapping_id ? String(ft.billing_account_mapping_id) : '';
    const defaultDiscountRuleId = ft?.billing_discount_account_mapping_id ? String(ft.billing_discount_account_mapping_id) : '';
    const defaultPaymentDiscountRuleId = ft?.payment_discount_account_mapping_id ? String(ft.payment_discount_account_mapping_id) : '';

    const baseNominal = cell.amount !== undefined && cell.amount !== null ? cell.amount : cell.base_amount;
    const currentDiscount = cell.discount_amount || 0;
    const computedPct = baseNominal > 0 && currentDiscount > 0 ? ((currentDiscount / baseNominal) * 100).toFixed(1) : 0;

    setCellFormData({
      amount: baseNominal,
      bill_date: cell.bill_date || new Date().toISOString().slice(0, 10),
      due_date: cell.due_date || `${cell.period_year}-${cell.period_month ? String(cell.period_month).padStart(2, '0') : '10'}-10`,
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

  const handleCellBillDateChange = (val) => {
    setCellFormData((prev) => {
      let updatedDueDate = prev.due_date;
      // Jika due_date kosong atau due_date < val, otomatis ubah due_date = val
      if (val && (!updatedDueDate || updatedDueDate < val)) {
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
      const payload = {
        student_id: row.student_id,
        fee_type_id: cell.fee_type_id,
        period_month: cell.period_month,
        period_year: cell.period_year,
        academic_year_id: selectedAcademicYearId ? Number(selectedAcademicYearId) : 1,
        amount: parseFloat(cellFormData.amount || 0),
        bill_date: cellFormData.bill_date,
        due_date: cellFormData.due_date,
        discount_amount: cellFormData.has_discount ? parseFloat(cellFormData.discount_amount || 0) : 0,
        discount_reason: cellFormData.has_discount ? cellFormData.discount_reason : null,
        notes: cellFormData.notes || null,
        mapping_id: cellFormData.mapping_id ? Number(cellFormData.mapping_id) : null,
        discount_mapping_id: cellFormData.discount_mapping_id ? Number(cellFormData.discount_mapping_id) : null,
        payment_discount_mapping_id: cellFormData.payment_discount_mapping_id ? Number(cellFormData.payment_discount_mapping_id) : null
      };

      await api.post('/keuangan/student-bills/publish-cell', payload);
      setCellModalOpen(false);
      setSelectedCellInfo(null);
      fetchMatrixData();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menerbitkan tagihan');
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

    const defaultDueDate = `${col.period_year}-${col.period_month ? String(col.period_month).padStart(2, '0') : '10'}-10`;
    const defaultBillDate = new Date().toISOString().slice(0, 10);

    setColumnPublishFormData({
      bill_date: defaultBillDate,
      due_date: defaultDueDate,
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

  const handleColumnBillDateChange = (val) => {
    setColumnPublishFormData((prev) => {
      let updatedDueDate = prev.due_date;
      if (val && (!updatedDueDate || updatedDueDate < val)) {
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

    const defaultDueDateStr = `${col.period_year}-${col.period_month ? String(col.period_month).padStart(2, '0') : '10'}-10`;
    const defaultBillDateStr = new Date().toISOString().slice(0, 10);

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
          b.fee_type_name?.toLowerCase().includes(q) ||
          String(b.id).includes(q)
      );
    }

    result.sort((a, b) => {
      let aVal = a[historySortConfig.key];
      let bVal = b[historySortConfig.key];

      if (historySortConfig.key === 'amount' || historySortConfig.key === 'discount_amount' || historySortConfig.key === 'paid_amount') {
        aVal = parseFloat(aVal || 0);
        bVal = parseFloat(bVal || 0);
      }

      if (aVal < bVal) return historySortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return historySortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [historyBills, historySearch, historySortConfig]);

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

  const filteredReminderLogs = useMemo(() => {
    if (!reminderSearch.trim()) return reminderLogs;
    const q = reminderSearch.toLowerCase();
    return reminderLogs.filter(
      (l) =>
        l.student_name?.toLowerCase().includes(q) ||
        l.recipient_name?.toLowerCase().includes(q) ||
        l.fee_type_name?.toLowerCase().includes(q) ||
        l.message?.toLowerCase().includes(q)
    );
  }, [reminderLogs, reminderSearch]);

  // Current active AY object
  const activeAY = academicYears.find((a) => String(a.id) === String(selectedAcademicYearId)) || academicYears[0];

  return (
    <div className="p-4 sm:p-6 max-w-[1600px] mx-auto space-y-6 pb-24">
      {/* ------------------------------------------------------------ */}
      {/* HEADER UTAMA & KONTROL TAHUN AJARAN */}
      {/* ------------------------------------------------------------ */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 bg-white/90 backdrop-blur-md p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
            <Receipt className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-slate-800 tracking-tight">Penagihan Siswa</h1>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                {activeSchoolUnit?.name || 'Semua Unit'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Matriks penetapan biaya 12 bulan (Juli-Juni), penerbitan piutang santri, audit riwayat &amp; reminder portal orang tua.
            </p>
          </div>
        </div>

        {/* Global Academic Year Switcher */}
        <div className="flex items-center gap-2.5 self-stretch sm:self-auto bg-slate-50 p-1.5 rounded-xl border border-slate-200">
          <Calendar className="w-4 h-4 text-slate-400 ml-1.5 shrink-0" />
          <div className="min-w-[200px]">
            <SearchableSelect
              options={academicYears.map((ay) => ({
                value: String(ay.id),
                label: `T.A. ${ay.name} ${ay.is_active ? '★ Aktif' : ''}`,
                sublabel: ay.is_active ? 'Tahun Ajaran Berjalan' : 'Tahun Ajaran Arsip'
              }))}
              value={String(selectedAcademicYearId || '')}
              onChange={(val) => setSelectedAcademicYearId(String(val))}
              placeholder="Pilih Tahun Ajaran"
              allowClear={false}
            />
          </div>
          <button
            type="button"
            onClick={() => {
              if (activeTab === 'matrix') fetchMatrixData();
              else if (activeTab === 'history') fetchHistoryBills();
              else if (activeTab === 'reminders') fetchReminderLogs();
            }}
            title="Muat ulang data"
            className="p-2 text-slate-500 hover:text-emerald-700 hover:bg-white rounded-lg transition border border-transparent hover:border-slate-200 shadow-2xs"
          >
            <RotateCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------ */}
      {/* 3 TAB NAVIGATION */}
      {/* ------------------------------------------------------------ */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-1">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setActiveTab('matrix')}
            className={`flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-xs transition relative ${
              activeTab === 'matrix'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>1. Tagihan &amp; Matriks Biaya</span>
            {matrixData.rows.length > 0 && (
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${activeTab === 'matrix' ? 'bg-emerald-700 text-white' : 'bg-slate-200 text-slate-700'}`}>
                {matrixData.rows.length} Santri
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-xs transition relative ${
              activeTab === 'history'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <History className="w-4 h-4" />
            <span>2. Riwayat Tagihan</span>
            {historyBills.length > 0 && (
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${activeTab === 'history' ? 'bg-emerald-700 text-white' : 'bg-slate-200 text-slate-700'}`}>
                {historyBills.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('reminders')}
            className={`flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-xs transition relative ${
              activeTab === 'reminders'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Bell className="w-4 h-4" />
            <span>3. Reminder Tagihan (Portal Ortu)</span>
            {reminderLogs.length > 0 && (
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${activeTab === 'reminders' ? 'bg-emerald-700 text-white' : 'bg-slate-200 text-slate-700'}`}>
                {reminderLogs.length} Log
              </span>
            )}
          </button>
        </div>

        {/* Tab-specific top right actions */}
        {activeTab === 'reminders' && (
          <button
            type="button"
            onClick={handleOpenBroadcastModal}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white rounded-xl text-xs font-bold shadow-md shadow-amber-500/20 transition"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Kirim Reminder Massal</span>
          </button>
        )}
      </div>

      {/* ============================================================ */}
      {/* TAB 1: TAGIHAN (MATRIKS PENETAPAN & PENERBITAN BULANAN) */}
      {/* ============================================================ */}
      {activeTab === 'matrix' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          {/* Summary & KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Siswa Terdaftar</p>
                <p className="text-xl font-black text-slate-800 mt-1">{matrixData.summary?.total_students || 0} Santri</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Konteks T.A. {activeAY?.name || '-'}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                <Users className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Tagihan Diterbitkan</p>
                <p className="text-xl font-black text-emerald-700 mt-1">{matrixData.summary?.total_published_bills || 0} Tagihan</p>
                <p className="text-[10px] text-emerald-600 mt-0.5">Sudah tercatat di Piutang</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                <FileCheck className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Piutang Belum Lunas</p>
                <p className="text-xl font-black text-rose-700 mt-1">Rp {(matrixData.summary?.total_unpaid_ar || 0).toLocaleString('id-ID')}</p>
                <p className="text-[10px] text-rose-500 mt-0.5">Sisa tagihan aktif santri</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
                <AlertCircle className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Pembayaran Masuk</p>
                <p className="text-xl font-black text-teal-700 mt-1">Rp {(matrixData.summary?.total_paid || 0).toLocaleString('id-ID')}</p>
                <p className="text-[10px] text-teal-600 mt-0.5">Kas/Bank telah diterima</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center font-bold">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Matrix Controls & Filter Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Cari santri, NIS, NIPD..."
                  value={matrixSearch}
                  onChange={(e) => setMatrixSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-emerald-500 transition"
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
                <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-800 px-3 py-1.5 rounded-xl text-xs font-semibold animate-in fade-in">
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
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden relative">
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
              <div className="overflow-x-auto max-h-[680px]">
                <table className="w-full text-left text-xs border-collapse border-separate border-spacing-0">
                  <thead className="bg-slate-100 text-slate-700 font-bold sticky top-0 z-20 border-b border-slate-200 shadow-2xs">
                    <tr>
                      {/* Fixed Left Header 1: Checkbox (44px) */}
                      <th className="p-3 w-[44px] min-w-[44px] max-w-[44px] text-center sticky left-0 z-30 bg-slate-100 border-r border-b border-slate-200">
                        <input
                          type="checkbox"
                          checked={selectedRowStudentIds.size === matrixData.rows.length && matrixData.rows.length > 0}
                          onChange={handleToggleSelectAllRows}
                          className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                        />
                      </th>

                      {/* Fixed Left Header 2: Nama Siswa (260px, left: 44px) */}
                      <th className="p-3 w-[260px] min-w-[260px] max-w-[260px] text-left sticky left-[44px] z-30 bg-slate-100 border-r border-b border-slate-200 font-bold text-slate-800">
                        Nama Santri
                      </th>

                      {/* Fixed Left Header 3: Rombel (110px, left: 304px) */}
                      <th className="p-3 w-[110px] min-w-[110px] max-w-[110px] text-left sticky left-[304px] z-30 bg-slate-100 border-r border-b border-slate-200 shadow-[3px_0_6px_-2px_rgba(0,0,0,0.12)]">
                        Rombel
                      </th>

                      {/* Dynamic Columns: Sekali Bayar, Tahunan, Bulanan (Juli-Juni) */}
                      {matrixData.columns.map((col) => (
                        <th
                          key={col.key}
                          className="p-3 min-w-[145px] text-center border-r border-b border-slate-200 align-top group hover:bg-slate-100/80 transition"
                        >
                          <div className="flex flex-col items-center gap-1">
                            <div className="flex items-center gap-1">
                              <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border uppercase ${col.badge_color}`}>
                                {col.badge_text}
                              </span>
                              {col.semester && (
                                <span className="text-[9px] text-slate-400 font-medium">({col.semester})</span>
                              )}
                            </div>
                            <span className="font-semibold text-slate-800 text-[11px]">{col.fee_type_name}</span>
                            <span className="text-[10px] text-slate-500 font-normal">T.A. {col.period_year}</span>

                            {/* Tombol Aksi Kolom: Terbitkan & Import Excel */}
                            <div className="mt-1.5 w-full flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleOpenColumnPublishModal(col)}
                                title="Terbitkan tagihan kolom ini"
                                className="flex-1 flex items-center justify-center gap-1 py-1 px-1.5 rounded-lg bg-white border border-slate-300 hover:border-emerald-500 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 text-[10px] font-semibold transition shadow-2xs"
                              >
                                <Zap className="w-3 h-3 text-emerald-600" />
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
                    {matrixData.rows.map((row, rIdx) => {
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
                          <td className={`p-3 w-[44px] min-w-[44px] max-w-[44px] text-center sticky left-0 z-10 ${stickyBg} border-r border-slate-200`}>
                            <input
                              type="checkbox"
                              checked={isRowSelected}
                              onChange={() => handleToggleSelectRow(row.student_id)}
                              className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                            />
                          </td>

                          {/* Sticky Cell 2: Nama Siswa & NIS */}
                          <td className={`p-3 w-[260px] min-w-[260px] max-w-[260px] sticky left-[44px] z-10 ${stickyBg} border-r border-slate-200 truncate`} title={row.name}>
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
                          <td className={`p-3 w-[110px] min-w-[110px] max-w-[110px] text-slate-600 sticky left-[304px] z-10 ${stickyBg} border-r border-slate-200 text-[11px] shadow-[3px_0_6px_-2px_rgba(0,0,0,0.12)]`}>
                            <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium">
                              {row.class_name}
                            </span>
                          </td>

                          {/* Dynamic Matrix Cells */}
                          {matrixData.columns.map((col) => {
                            const cell = row.cells[col.key] || {};
                            const isPub = cell.is_published;
                            const isPaid = cell.is_paid;
                            const isPart = cell.is_partially_paid;
                            const isOver = cell.is_overdue;

                            let cellStyle = 'bg-white text-slate-700 hover:border-emerald-400 border-slate-200';
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
                                    Rp {(cell.amount !== undefined ? cell.amount : cell.base_amount || 0).toLocaleString('id-ID')}
                                  </div>
                                  <div className="flex items-center justify-center gap-1 mt-1">
                                    <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${badgeClass}`}>
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
      {/* TAB 2: RIWAYAT PENAGIHAN (AUDIT TRAIL & LIST) */}
      {/* ============================================================ */}
      {activeTab === 'history' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          {/* Filter Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari santri, tagihan #ID..."
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-emerald-500 transition"
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
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
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
              <div className="overflow-x-auto max-h-[700px]">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50/95 backdrop-blur text-slate-700 font-bold sticky top-0 z-10 border-b border-slate-200 shadow-2xs select-none">
                    <tr>
                      <th
                        onClick={() => handleSortHistory('created_at')}
                        className="p-3.5 cursor-pointer hover:bg-slate-100 transition"
                      >
                        <div className="flex items-center gap-1.5">
                          <span>Tanggal Terbit</span>
                          <ArrowUpDown className="w-3 h-3 text-slate-400" />
                        </div>
                      </th>
                      <th
                        onClick={() => handleSortHistory('student_name')}
                        className="p-3.5 cursor-pointer hover:bg-slate-100 transition"
                      >
                        <div className="flex items-center gap-1.5">
                          <span>Santri (Nama / ID)</span>
                          <ArrowUpDown className="w-3 h-3 text-slate-400" />
                        </div>
                      </th>
                      <th
                        onClick={() => handleSortHistory('fee_type_name')}
                        className="p-3.5 cursor-pointer hover:bg-slate-100 transition"
                      >
                        <div className="flex items-center gap-1.5">
                          <span>Jenis Biaya &amp; Periode</span>
                          <ArrowUpDown className="w-3 h-3 text-slate-400" />
                        </div>
                      </th>
                      <th
                        onClick={() => handleSortHistory('amount')}
                        className="p-3.5 text-right cursor-pointer hover:bg-slate-100 transition"
                      >
                        <div className="flex items-center justify-end gap-1.5">
                          <span>Nominal Kotor</span>
                          <ArrowUpDown className="w-3 h-3 text-slate-400" />
                        </div>
                      </th>
                      <th
                        onClick={() => handleSortHistory('discount_amount')}
                        className="p-3.5 text-right cursor-pointer hover:bg-slate-100 transition"
                      >
                        <div className="flex items-center justify-end gap-1.5">
                          <span>Diskon</span>
                          <ArrowUpDown className="w-3 h-3 text-slate-400" />
                        </div>
                      </th>
                      <th
                        onClick={() => handleSortHistory('amount')}
                        className="p-3.5 text-right cursor-pointer hover:bg-slate-100 transition"
                      >
                        <div className="flex items-center justify-end gap-1.5">
                          <span>Nominal Bersih</span>
                          <ArrowUpDown className="w-3 h-3 text-slate-400" />
                        </div>
                      </th>
                      <th className="p-3.5 max-w-xs">Catatan</th>
                      <th
                        onClick={() => handleSortHistory('due_date')}
                        className="p-3.5 cursor-pointer hover:bg-slate-100 transition"
                      >
                        <div className="flex items-center gap-1.5">
                          <span>Jatuh Tempo</span>
                          <ArrowUpDown className="w-3 h-3 text-slate-400" />
                        </div>
                      </th>
                      <th className="p-3.5">Status</th>
                      <th className="p-3.5 text-right">Aksi</th>
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
                          <td className="p-3.5 font-mono text-[11px] text-slate-600">
                            <div>{b.bill_date ? String(b.bill_date).slice(0, 10) : String(b.created_at || '').slice(0, 10)}</div>
                            <div className="text-[10px] text-slate-400">#{b.id}</div>
                          </td>

                          <td className="p-3.5 font-bold text-slate-800">
                            <div>{b.student_name}</div>
                            <div className="text-[10px] text-slate-400 font-mono">ID Siswa: {b.student_id}</div>
                          </td>

                          <td className="p-3.5">
                            <div className="font-semibold text-slate-800">{b.fee_type_name}</div>
                            <div className="text-[10px] text-slate-500 font-medium">
                              {b.period_month ? `Bulan ke-${b.period_month} / ` : ''}T.A. {b.period_year || '-'}
                            </div>
                          </td>

                          <td className="p-3.5 text-right font-mono text-slate-500">
                            Rp {grossAmount.toLocaleString('id-ID')}
                          </td>

                          <td className="p-3.5 text-right font-mono text-amber-600 font-semibold">
                            {parseFloat(b.discount_amount || 0) > 0 ? (
                              <span>- Rp {parseFloat(b.discount_amount).toLocaleString('id-ID')}</span>
                            ) : (
                              <span className="text-slate-300">-</span>
                            )}
                          </td>

                          <td className="p-3.5 text-right font-mono font-bold text-slate-900">
                            Rp {netAmount.toLocaleString('id-ID')}
                          </td>

                          <td className="p-3.5 text-slate-600 max-w-xs truncate text-[11px]" title={b.discount_reason || b.edit_reason}>
                            {b.discount_reason || b.edit_reason || <span className="text-slate-300 italic">-</span>}
                          </td>

                          <td className="p-3.5 font-mono text-[11px]">
                            {b.due_date ? (
                              <span className={isOverdue ? 'text-rose-700 font-bold flex items-center gap-1' : 'text-slate-700'}>
                                {isOverdue && <AlertCircle className="w-3 h-3 text-rose-600" />}
                                {String(b.due_date).slice(0, 10)}
                              </span>
                            ) : (
                              <span className="text-slate-300">-</span>
                            )}
                          </td>

                          <td className="p-3.5">
                            {b.status === 'paid' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <CheckCircle2 className="w-3 h-3" /> Lunas
                              </span>
                            ) : b.status === 'partially_paid' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-200">
                                <Clock className="w-3 h-3" /> Sebagian
                              </span>
                            ) : isOverdue ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 animate-pulse">
                                <AlertCircle className="w-3 h-3" /> Jatuh Tempo
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                <Clock className="w-3 h-3" /> Belum Bayar
                              </span>
                            )}
                          </td>

                          <td className="p-3.5 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                type="button"
                                onClick={() => handleOpenDetailModal(b)}
                                title="Lihat Detail & Jurnal Piutang"
                                className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>

                              {b.status !== 'paid' && (
                                <button
                                  type="button"
                                  onClick={() => handleOpenReviseModal(b)}
                                  title="Revisi Tagihan (Catat Riwayat)"
                                  className="p-1.5 text-slate-500 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition"
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
                                  className="p-1.5 text-slate-500 hover:text-orange-700 hover:bg-orange-50 rounded-lg transition disabled:opacity-50"
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
      {/* TAB 3: REMINDER TAGIHAN (PORTAL ORANG TUA NOTIFIKASI) */}
      {/* ============================================================ */}
      {activeTab === 'reminders' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          {/* Quick KPI & Broadcast Banner */}
          <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 rounded-2xl p-6 text-white shadow-lg shadow-orange-500/15 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Bell className="w-6 h-6" />
                <h2 className="text-lg font-black tracking-tight">Pusat Pengingat Tagihan (Portal Orang Tua)</h2>
              </div>
              <p className="text-xs text-amber-100 mt-1 max-w-2xl">
                Kirim pesan tagihan otomatis atau pesan khusus langsung ke modul notifikasi wali murid di Portal Orang Tua santri, lengkap dengan log audit pengiriman.
              </p>
            </div>
            <button
              type="button"
              onClick={handleOpenBroadcastModal}
              className="px-5 py-2.5 bg-white text-orange-700 font-bold text-xs rounded-xl shadow-md hover:bg-amber-50 transition shrink-0 flex items-center gap-2"
            >
              <Send className="w-4 h-4 text-orange-600" />
              <span>Broadcast Pengingat Sekarang</span>
            </button>
          </div>

          {/* Filter Logs */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari log nama santri, penerima, pesan..."
                value={reminderSearch}
                onChange={(e) => setReminderSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-amber-500 transition"
              />
            </div>
            <div className="text-xs text-slate-500 font-medium">
              Total {filteredReminderLogs.length} pengiriman tercatat
            </div>
          </div>

          {/* Table Log Riwayat Reminder */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
            {reminderLogsLoading ? (
              <div className="p-16 text-center text-slate-400">
                <Loader2 className="w-8 h-8 animate-spin mx-auto text-amber-600 mb-2" />
                <p className="text-xs font-medium">Memuat riwayat pengiriman reminder...</p>
              </div>
            ) : filteredReminderLogs.length === 0 ? (
              <div className="p-16 text-center text-slate-400">
                <Bell className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                <p className="text-xs font-bold text-slate-700">Belum ada pengiriman reminder</p>
                <p className="text-[11px] text-slate-400 mt-1">Gunakan tombol "Broadcast Pengingat" di atas untuk mengirimkan pesan pertama.</p>
              </div>
            ) : (
              <div className="overflow-x-auto max-h-[650px]">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50/95 backdrop-blur text-slate-700 font-bold sticky top-0 z-10 border-b border-slate-200 shadow-2xs">
                    <tr>
                      <th className="p-3.5">Waktu Kirim</th>
                      <th className="p-3.5">Santri &amp; Rombel</th>
                      <th className="p-3.5">Penerima (Wali Murid)</th>
                      <th className="p-3.5">Tagihan Terkait</th>
                      <th className="p-3.5 max-w-md">Isi Pesan Notifikasi</th>
                      <th className="p-3.5">Kanal Media</th>
                      <th className="p-3.5">Status Pengiriman</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredReminderLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/70 transition">
                        <td className="p-3.5 font-mono text-[11px] text-slate-600">
                          {new Date(log.sent_at || log.created_at).toLocaleString('id-ID')}
                        </td>
                        <td className="p-3.5 font-bold text-slate-800">
                          <div>{log.student_name}</div>
                          <div className="text-[10px] text-slate-400 font-medium">{log.class_name} • NIS: {log.nis}</div>
                        </td>
                        <td className="p-3.5 text-slate-700">
                          <div className="font-semibold">{log.recipient_name || 'Wali Santri'}</div>
                          {log.phone_or_email && <div className="text-[10px] text-slate-400 font-mono">{log.phone_or_email}</div>}
                        </td>
                        <td className="p-3.5">
                          <div className="font-semibold text-slate-800">{log.fee_type_name}</div>
                          <div className="text-[10px] text-slate-500 font-mono">
                            Rp {parseFloat(log.bill_amount || 0).toLocaleString('id-ID')} • JT: {String(log.bill_due_date || '-').slice(0, 10)}
                          </div>
                        </td>
                        <td className="p-3.5 text-slate-600 max-w-md text-[11px] bg-slate-50/40 rounded">
                          <p className="line-clamp-2" title={log.message}>
                            {log.message || 'Pengingat tagihan reguler via Portal'}
                          </p>
                        </td>
                        <td className="p-3.5">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                            <Smartphone className="w-3 h-3" /> {log.channel === 'portal_notification' ? 'Portal Ortu' : log.channel}
                          </span>
                        </td>
                        <td className="p-3.5">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3" /> Terkirim
                          </span>
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
          <div className="bg-white rounded-3xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold">
                  <Receipt className="w-5 h-5" />
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
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSavePublishCell} className="flex flex-col min-h-0 flex-1 overflow-hidden">
              <div className="p-5 overflow-y-auto space-y-4 text-xs flex-1">
                {/* Info Fee Type & Periode */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
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
                <div className="flex justify-between">
                  <span className="text-slate-500">Status Saat Ini:</span>
                  <span className="font-bold uppercase text-[10px] text-emerald-700">
                    {selectedCellInfo.cell.is_published ? selectedCellInfo.cell.status : 'Belum Diterbitkan (Draf Acuan)'}
                  </span>
                </div>
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
                  value={cellFormData.amount}
                  onChange={(e) => setCellFormData({ ...cellFormData, amount: e.target.value })}
                  placeholder="0"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500 text-xs"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Dapat diisi 0 atau nominal berapa pun (tidak ada batas minimal).
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

              {/* Catatan */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Catatan Operasional</label>
                <textarea
                  rows="2"
                  value={cellFormData.notes}
                  onChange={(e) => setCellFormData({ ...cellFormData, notes: e.target.value })}
                  placeholder="Keterangan tambahan..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              {/* Aturan Transaksi Penagihan & Penjurnalan (Transparansi Akuntansi) */}
              <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-2xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <BookOpen className="w-4 h-4 text-blue-700" />
                    <span className="font-bold text-blue-900 text-xs">Aturan Transaksi Penagihan (Piutang)</span>
                  </div>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-300">
                    <RefreshCw className="w-3 h-3 text-blue-600" /> Non-Kas (Akrual Piutang)
                  </span>
                </div>

                {(() => {
                  const activeRule = cellFormData.mapping_id
                    ? transactionRules.find((r) => r.id === Number(cellFormData.mapping_id))
                    : (transactionRules.find((r) => r.related_fee_type_id === selectedCellInfo?.cell?.fee_type_id && r.transaction_type === 'non_kas')
                        || transactionRules.find((r) => r.transaction_code === 'student_bill_issued')
                        || {
                            transaction_code: 'student_bill_issued',
                            transaction_label: 'Penerbitan Tagihan Siswa',
                            debit_account_code: '201',
                            debit_account_name: 'Piutang Siswa',
                            credit_account_code: '601',
                            credit_account_name: 'Pendapatan Pendidikan'
                          });

                  return (
                    <div className="bg-white p-2.5 rounded-xl border border-blue-100 space-y-1.5 text-[11px]">
                      <div className="flex justify-between items-center text-slate-700">
                        <span>Aturan Terpilih:</span>
                        <span className="font-bold text-slate-900">{activeRule.transaction_label}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100">
                        <div className="p-1.5 bg-slate-50 rounded-lg border border-slate-200/60">
                          <div className="text-[10px] font-bold text-slate-500 uppercase">Debit (Posisi Aktiva/Piutang)</div>
                          <div className="font-semibold text-slate-800 mt-0.5">{activeRule.debit_account_name || 'Piutang'}</div>
                          <div className="font-mono text-[10px] text-slate-400">{activeRule.debit_account_code}</div>
                        </div>
                        <div className="p-1.5 bg-slate-50 rounded-lg border border-slate-200/60">
                          <div className="text-[10px] font-bold text-slate-500 uppercase">Kredit (Pendapatan)</div>
                          <div className="font-semibold text-slate-800 mt-0.5">{activeRule.credit_account_name || 'Pendapatan'}</div>
                          <div className="font-mono text-[10px] text-slate-400">{activeRule.credit_account_code}</div>
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
                    className="text-[11px] text-blue-700 hover:text-blue-800 font-semibold flex items-center gap-1"
                  >
                    <Sliders className="w-3 h-3" />
                    <span>{cellFormData.custom_rule_mode ? 'Tutup Pilihan Aturan Penagihan' : 'Sesuaikan / Ganti Aturan Penagihan'}</span>
                  </button>

                  {cellFormData.custom_rule_mode && (
                    <div className="mt-2 pt-2 border-t border-blue-200 animate-in fade-in">
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

              {/* Aturan Transaksi Diskon / Potongan (Hanya Tampil Jika Diskon Diberikan) */}
              {cellFormData.has_discount && parseFloat(cellFormData.discount_amount || 0) > 0 && (
                <div className="space-y-3 animate-in fade-in">
                  {/* 1. Aturan Diskon Penagihan (Non-Kas) */}
                  <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-2xl space-y-2.5">
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
                      const activeDiscountRule = cellFormData.discount_mapping_id
                        ? transactionRules.find((r) => r.id === Number(cellFormData.discount_mapping_id))
                        : (transactionRules.find((r) => r.related_fee_type_id === selectedCellInfo?.cell?.fee_type_id && r.transaction_code.startsWith('bill_discount'))
                            || transactionRules.find((r) => r.transaction_code === 'student_bill_discount')
                            || {
                              transaction_code: 'student_bill_discount',
                              transaction_label: 'Diskon Tagihan Siswa',
                              debit_account_code: '69001',
                              debit_account_name: 'Diskon / Potongan Beasiswa',
                              credit_account_code: '201',
                              credit_account_name: 'Piutang Siswa'
                            });

                      return (
                        <div className="bg-white p-2.5 rounded-xl border border-amber-100 space-y-1.5 text-[11px]">
                          <div className="flex justify-between items-center text-slate-700">
                            <span>Aturan Diskon Penagihan:</span>
                            <span className="font-bold text-slate-900">{activeDiscountRule.transaction_label}</span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100">
                            <div className="p-1.5 bg-slate-50 rounded-lg border border-slate-200/60">
                              <div className="text-[10px] font-bold text-slate-500 uppercase">Debit (Beban Diskon)</div>
                              <div className="font-semibold text-slate-800 mt-0.5">{activeDiscountRule.debit_account_name || 'Beban Diskon'}</div>
                              <div className="font-mono text-[10px] text-slate-400">{activeDiscountRule.debit_account_code || '69001'}</div>
                            </div>
                            <div className="p-1.5 bg-slate-50 rounded-lg border border-slate-200/60">
                              <div className="text-[10px] font-bold text-slate-500 uppercase">Kredit (Piutang Terkait)</div>
                              <div className="font-semibold text-slate-800 mt-0.5">{activeDiscountRule.credit_account_name || 'Piutang Terkait'}</div>
                              <div className="font-mono text-[10px] text-slate-400">{activeDiscountRule.credit_account_code || '201'}</div>
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
                  <div className="p-3.5 bg-teal-50/70 border border-teal-200 rounded-2xl space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Percent className="w-4 h-4 text-teal-700" />
                        <span className="font-bold text-teal-900 text-xs">Aturan Diskon Pembayaran</span>
                      </div>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-teal-100 text-teal-800 border border-teal-300">
                        <RefreshCw className="w-3 h-3 text-teal-600" /> Non-Kas (Pelunasan Diskon)
                      </span>
                    </div>

                    {(() => {
                      const activePaymentDiscountRule = cellFormData.payment_discount_mapping_id
                        ? transactionRules.find((r) => r.id === Number(cellFormData.payment_discount_mapping_id))
                        : (transactionRules.find((r) => r.related_fee_type_id === selectedCellInfo?.cell?.fee_type_id && r.transaction_code.startsWith('pay_discount'))
                            || transactionRules.find((r) => r.transaction_code.includes('discount'))
                            || {
                              transaction_code: 'pay_discount_default',
                              transaction_label: 'Diskon Pembayaran Tagihan',
                              debit_account_code: '69001',
                              debit_account_name: 'Beban Diskon Pelunasan',
                              credit_account_code: '201',
                              credit_account_name: 'Piutang Siswa'
                            });

                      return (
                        <div className="bg-white p-2.5 rounded-xl border border-teal-100 space-y-1.5 text-[11px]">
                          <div className="flex justify-between items-center text-slate-700">
                            <span>Aturan Diskon Pembayaran:</span>
                            <span className="font-bold text-slate-900">{activePaymentDiscountRule.transaction_label}</span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100">
                            <div className="p-1.5 bg-slate-50 rounded-lg border border-slate-200/60">
                              <div className="text-[10px] font-bold text-slate-500 uppercase">Debit (Beban Diskon)</div>
                              <div className="font-semibold text-slate-800 mt-0.5">{activePaymentDiscountRule.debit_account_name || 'Beban Diskon'}</div>
                              <div className="font-mono text-[10px] text-slate-400">{activePaymentDiscountRule.debit_account_code || '69001'}</div>
                            </div>
                            <div className="p-1.5 bg-slate-50 rounded-lg border border-slate-200/60">
                              <div className="text-[10px] font-bold text-slate-500 uppercase">Kredit (Piutang Terkait)</div>
                              <div className="font-semibold text-slate-800 mt-0.5">{activePaymentDiscountRule.credit_account_name || 'Piutang Terkait'}</div>
                              <div className="font-mono text-[10px] text-slate-400">{activePaymentDiscountRule.credit_account_code || '201'}</div>
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
                        className="text-[11px] text-teal-800 hover:text-teal-900 font-semibold flex items-center gap-1"
                      >
                        <Sliders className="w-3 h-3" />
                        <span>{cellFormData.custom_payment_discount_rule_mode ? 'Tutup Pilihan Aturan Diskon Pembayaran' : 'Sesuaikan / Ganti Aturan Diskon Pembayaran'}</span>
                      </button>

                      {cellFormData.custom_payment_discount_rule_mode && (
                        <div className="mt-2 pt-2 border-t border-teal-200 animate-in fade-in">
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

              <div className="p-4 px-5 border-t border-slate-100 shrink-0 bg-slate-50/70 flex items-center justify-between gap-2">
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
                      className="px-3.5 py-2 border border-rose-200 text-rose-700 bg-rose-50 hover:bg-rose-100 hover:border-rose-300 rounded-xl font-bold flex items-center gap-1.5 transition text-xs shadow-2xs"
                    >
                      <XCircle className="w-4 h-4 text-rose-600" />
                      <span>Batalkan Tagihan</span>
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setCellModalOpen(false)}
                    className="px-4 py-2 border border-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-100 transition"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={submittingCell}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-md shadow-emerald-600/20 transition flex items-center gap-2 disabled:opacity-50"
                  >
                    {submittingCell ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileCheck className="w-4 h-4" />}
                    <span>{selectedCellInfo.cell.is_published ? 'Simpan Perubahan' : 'Terbitkan & Catat Piutang'}</span>
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
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-rose-200 overflow-hidden">
            <div className="p-5 border-b border-rose-100 flex items-center justify-between bg-rose-50/70">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-rose-600 text-white flex items-center justify-center font-bold">
                  <XCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-rose-950">Batalkan Tagihan Santri</h3>
                  <p className="text-[11px] text-rose-700 font-medium">{selectedCellInfo.row.name} ({selectedCellInfo.row.nipd})</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCancelModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {(() => {
              const hasPayment = parseFloat(selectedCellInfo.cell.paid_amount || 0) > 0 || selectedCellInfo.cell.is_paid || selectedCellInfo.cell.is_partially_paid;

              return (
                <form onSubmit={handleExecuteCancelCellBill} className="p-5 space-y-4 text-xs">
                  {hasPayment ? (
                    <div className="p-4 bg-amber-50 border border-amber-300 rounded-2xl space-y-2 text-amber-900">
                      <div className="flex items-center gap-2 font-bold text-xs text-amber-800">
                        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>Peringatan: Tagihan Sudah Memiliki Pembayaran!</span>
                      </div>
                      <p className="text-[11px] text-amber-800 leading-relaxed">
                        Tagihan santri <b>{selectedCellInfo.row.name}</b> untuk <b>{selectedCellInfo.cell.fee_type_name}</b> telah tercatat pembayaran oleh orang tua sebesar <b>Rp {parseFloat(selectedCellInfo.cell.paid_amount || 0).toLocaleString('id-ID')}</b>.
                      </p>
                      <p className="text-[11px] text-amber-700 font-semibold">
                        Tagihan yang sudah memiliki transaksi penerimaan pembayaran tidak dapat dibatalkan untuk menjaga integritas pembukuan kas &amp; audit trail keuangan.
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="p-3 bg-rose-50/80 border border-rose-200 rounded-2xl text-rose-900 space-y-1">
                        <p className="font-bold flex items-center gap-1.5 text-xs text-rose-800">
                          <AlertCircle className="w-4 h-4 text-rose-600" />
                          <span>Konfirmasi Pembatalan Tagihan</span>
                        </p>
                        <p className="text-[11px] text-rose-800">
                          Tagihan <b>#{selectedCellInfo.cell.bill_id}</b> ({selectedCellInfo.cell.fee_type_name}) untuk santri <b>{selectedCellInfo.row.name}</b> sebesar <b>Rp {(selectedCellInfo.cell.amount || selectedCellInfo.cell.base_amount || 0).toLocaleString('id-ID')}</b> akan dibatalkan secara permanen.
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
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-rose-500 transition placeholder:text-slate-400"
                        />
                      </div>
                    </>
                  )}

                  <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setCancelModalOpen(false)}
                      className="px-4 py-2 border border-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-100 transition"
                    >
                      Tutup
                    </button>
                    {!hasPayment && (
                      <button
                        type="submit"
                        disabled={submittingCancel}
                        className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold shadow-md shadow-rose-600/20 transition flex items-center gap-2 disabled:opacity-50"
                      >
                        {submittingCancel ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
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
          <div className="bg-white rounded-3xl max-w-md w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Penerbitan Tagihan Kolom</h3>
                  <p className="text-[11px] text-slate-500">{targetColumnInfo.label}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setColumnPublishModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 text-xs flex-1">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 space-y-1">
                <p className="font-bold flex items-center gap-1">
                  <AlertCircle className="w-4 h-4 text-amber-600" />
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

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1 text-slate-600 text-[11px]">
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
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500 transition"
                />
              </div>

              {/* Aturan Transaksi Penagihan Kolom Massal */}
              <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-2xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <BookOpen className="w-4 h-4 text-blue-700" />
                    <span className="font-bold text-blue-900 text-xs">Aturan Transaksi Penagihan Kolom</span>
                  </div>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-300">
                    <RefreshCw className="w-3 h-3 text-blue-600" /> Non-Kas (Piutang)
                  </span>
                </div>

                {(() => {
                  const activeRule = columnPublishFormData.mapping_id
                    ? transactionRules.find((r) => r.id === Number(columnPublishFormData.mapping_id))
                    : (transactionRules.find((r) => r.related_fee_type_id === targetColumnInfo.fee_type_id && r.transaction_type === 'non_kas')
                        || transactionRules.find((r) => r.transaction_code === 'student_bill_issued')
                        || {
                            transaction_code: 'student_bill_issued',
                            transaction_label: 'Penerbitan Tagihan Siswa',
                            debit_account_name: 'Piutang Siswa',
                            debit_account_code: '201',
                            credit_account_name: 'Pendapatan Pendidikan',
                            credit_account_code: '601'
                          });

                  return (
                    <div className="bg-white p-2.5 rounded-xl border border-blue-100 space-y-1.5 text-[11px]">
                      <div className="flex justify-between items-center text-slate-700">
                        <span>Aturan Diterapkan:</span>
                        <span className="font-bold text-slate-900">{activeRule.transaction_label}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100">
                        <div className="p-1.5 bg-slate-50 rounded-lg border border-slate-200/60">
                          <div className="text-[10px] font-bold text-slate-500 uppercase">Debit (Piutang)</div>
                          <div className="font-semibold text-slate-800 mt-0.5">{activeRule.debit_account_name || 'Piutang'}</div>
                          <div className="font-mono text-[10px] text-slate-400">{activeRule.debit_account_code}</div>
                        </div>
                        <div className="p-1.5 bg-slate-50 rounded-lg border border-slate-200/60">
                          <div className="text-[10px] font-bold text-slate-500 uppercase">Kredit (Pendapatan)</div>
                          <div className="font-semibold text-slate-800 mt-0.5">{activeRule.credit_account_name || 'Pendapatan'}</div>
                          <div className="font-mono text-[10px] text-slate-400">{activeRule.credit_account_code}</div>
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
                    className="text-[11px] text-blue-700 hover:text-blue-800 font-semibold flex items-center gap-1"
                  >
                    <Sliders className="w-3 h-3" />
                    <span>{columnPublishFormData.custom_rule_mode ? 'Tutup Pilihan Aturan' : 'Sesuaikan / Ganti Aturan Penagihan'}</span>
                  </button>

                  {columnPublishFormData.custom_rule_mode && (
                    <div className="mt-2 pt-2 border-t border-blue-200 animate-in fade-in">
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
              <div className="p-3.5 rounded-2xl border border-amber-200/80 bg-amber-50/40 space-y-3">
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
                    <div className="p-3 bg-white rounded-xl border border-amber-200 space-y-2 text-[11px]">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-amber-900">Aturan Transaksi Diskon Kolom:</span>
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                          <RefreshCw className="w-3 h-3" /> Non-Kas
                        </span>
                      </div>

                      {(() => {
                        const activeColDiscountRule = columnPublishFormData.discount_mapping_id
                          ? transactionRules.find((r) => r.id === Number(columnPublishFormData.discount_mapping_id))
                          : (transactionRules.find((r) => r.related_fee_type_id === targetColumnInfo.fee_type_id && r.transaction_code.includes('discount'))
                              || transactionRules.find((r) => r.transaction_code === 'student_bill_discount')
                              || {
                                  transaction_code: 'student_bill_discount',
                                  transaction_label: 'Diskon Tagihan Siswa',
                                  debit_account_name: 'Beban Diskon',
                                  debit_account_code: '69001',
                                  credit_account_name: 'Piutang Siswa',
                                  credit_account_code: '201'
                                });

                        return (
                          <div className="space-y-1.5">
                            <div className="flex justify-between">
                              <span>Aturan Diterapkan:</span>
                              <span className="font-bold text-slate-800">{activeColDiscountRule.transaction_label}</span>
                            </div>
                            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100">
                              <div className="p-1.5 bg-slate-50 rounded-lg border border-slate-200/60">
                                <div className="text-[10px] font-bold text-slate-500 uppercase">Debit (Beban Diskon)</div>
                                <div className="font-semibold text-slate-800 mt-0.5">{activeColDiscountRule.debit_account_name || 'Beban Diskon'}</div>
                                <div className="font-mono text-[10px] text-slate-400">{activeColDiscountRule.debit_account_code}</div>
                              </div>
                              <div className="p-1.5 bg-slate-50 rounded-lg border border-slate-200/60">
                                <div className="text-[10px] font-bold text-slate-500 uppercase">Kredit (Piutang)</div>
                                <div className="font-semibold text-slate-800 mt-0.5">{activeColDiscountRule.credit_account_name || 'Piutang Terkait'}</div>
                                <div className="font-mono text-[10px] text-slate-400">{activeColDiscountRule.credit_account_code}</div>
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

              <div className="p-4 px-5 border-t border-slate-100 shrink-0 bg-slate-50/70 flex justify-end gap-2">
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
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-md shadow-emerald-600/20 transition flex items-center gap-2 disabled:opacity-50"
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
      {/* MODAL: IMPORT DATA EXCEL PER KOLOM & REVIEW DATA (Fitur Baru) */}
      {/* ============================================================ */}
      {columnImportModalOpen && targetImportColumnInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-blue-50/70 via-slate-50 to-emerald-50/50 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold shadow-md shadow-blue-500/20">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-800">Import Data Tagihan (Excel)</h3>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase ${targetImportColumnInfo.badge_color || 'bg-blue-100 text-blue-800 border-blue-200'}`}>
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
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body (Scrollable) */}
            <div className="p-5 overflow-y-auto space-y-4 text-xs flex-1">
              {/* Bagian 1: Identitas Dokumen & Unduh Format */}
              <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-200/80 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-bold text-[11px] flex items-center justify-center">1</span>
                      <h4 className="font-bold text-blue-950 text-xs">Identitas &amp; Unduh Format Excel</h4>
                    </div>
                    <p className="text-[11px] text-blue-900 leading-relaxed">
                      Satu berkas Excel berlaku <b>khusus untuk kolom ini pada Tahun Ajaran terkait</b>. Baris 1-5 di file Excel memuat identitas dokumen verifikasi otomatis.
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

                <div className="bg-white/80 p-2.5 rounded-xl border border-blue-100 flex items-center gap-2 text-[11px] text-blue-800">
                  <Info className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>
                    Format yang diunduh sudah berisi seluruh daftar santri aktif rombel beserta data tagihan/tarif yang ada di kolom ini saat ini.
                  </span>
                </div>
              </div>

              {/* Bagian 2: Unggah Berkas Excel */}
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
                      <p className="text-[11px] text-slate-400 mt-0.5">Mendukung format .xlsx dan .xls (Kolom NIS, Nama, Rombel, Nominal, Tgl Tagihan, Jatuh Tempo, Catatan)</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Status Validasi File */}
              {importFileValidation && (
                <div>
                  {importFileValidation.isValid ? (
                    <div className="p-3.5 bg-emerald-50 border border-emerald-300 rounded-2xl text-emerald-900 space-y-1">
                      <div className="flex items-center gap-2 font-bold text-xs text-emerald-800">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>Identitas Dokumen &amp; Format Terverifikasi Valid</span>
                      </div>
                      <p className="text-[11px] text-emerald-800">
                        Tahun Ajaran: <b>{importFileValidation.docAyName}</b> • Jenis Biaya: <b>{importFileValidation.docFeeTypeName}</b> • Terbaca: <b>{importFileValidation.totalRows} baris ({importFileValidation.validRows} siap diproses)</b>
                      </p>
                    </div>
                  ) : (
                    <div className="p-3.5 bg-rose-50 border border-rose-300 rounded-2xl text-rose-900 space-y-1">
                      <div className="flex items-center gap-2 font-bold text-xs text-rose-800">
                        <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
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
                <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-indigo-600 text-white font-bold text-[11px] flex items-center justify-center">3</span>
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
                          <th className="p-2.5 w-24">NIS / NIPD</th>
                          <th className="p-2.5">Nama Santri</th>
                          <th className="p-2.5 w-24">Rombel</th>
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
                                      ? 'bg-blue-50/30'
                                      : idx % 2 === 1
                                        ? 'bg-slate-50/30'
                                        : 'bg-white'
                              }`}
                            >
                              <td className="p-2 text-center text-slate-400 font-mono text-[11px]">{r.row_index || idx + 1}</td>
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
                              <td className="p-2 font-mono text-slate-600 text-[11px]">{r.nis || '-'}</td>
                              <td className="p-2 font-bold text-slate-800 truncate max-w-[200px]" title={r.name}>
                                {r.name}
                                {r.diff_summary && (
                                  <span className="block text-[10px] text-blue-600 font-normal truncate">{r.diff_summary}</span>
                                )}
                                {!r.is_valid && r.validation_error && (
                                  <span className="block text-[10px] text-rose-600 font-normal">{r.validation_error}</span>
                                )}
                              </td>
                              <td className="p-2 text-slate-600 text-[11px]">{r.class_name || '-'}</td>
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

                  {/* Aturan Jurnal Akuntansi Penagihan (Otomatis & Transparan) */}
                  <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-2xl space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <BookOpen className="w-4 h-4 text-blue-700" />
                        <span className="font-bold text-blue-900 text-xs">Aturan Jurnal Akuntansi (Khusus jika Langsung Diterbitkan)</span>
                      </div>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-300">
                        <RefreshCw className="w-3 h-3 text-blue-600" /> Non-Kas (Akrual Piutang)
                      </span>
                    </div>

                    {(() => {
                      const activeRule = importAccountingRuleId
                        ? transactionRules.find((r) => r.id === Number(importAccountingRuleId))
                        : (transactionRules.find((r) => r.related_fee_type_id === targetImportColumnInfo?.fee_type_id && r.transaction_type === 'non_kas')
                            || transactionRules.find((r) => r.transaction_code === 'student_bill_issued')
                            || {
                                transaction_code: 'student_bill_issued',
                                transaction_label: 'Penerbitan Tagihan Siswa',
                                debit_account_code: '201',
                                debit_account_name: 'Piutang Siswa',
                                credit_account_code: '601',
                                credit_account_name: 'Pendapatan Pendidikan'
                              });

                      return (
                        <div className="bg-white p-2.5 rounded-xl border border-blue-100 space-y-1 text-[11px]">
                          <div className="flex justify-between items-center text-slate-700">
                            <span>Aturan Transaksi:</span>
                            <span className="font-bold text-slate-900">{activeRule.transaction_label}</span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100 text-[10px]">
                            <div className="bg-slate-50 p-1.5 rounded-lg border border-slate-200">
                              <span className="text-slate-400 block font-semibold">Debit (Posisi Aktiva/Piutang)</span>
                              <span className="font-bold text-slate-800">{activeRule.debit_account_name || 'Piutang Santri'}</span>
                              <span className="text-slate-500 font-mono ml-1">({activeRule.debit_account_code || '201'})</span>
                            </div>
                            <div className="bg-slate-50 p-1.5 rounded-lg border border-slate-200">
                              <span className="text-slate-400 block font-semibold">Kredit (Pendapatan)</span>
                              <span className="font-bold text-slate-800">{activeRule.credit_account_name || 'Pendapatan Biaya'}</span>
                              <span className="text-slate-500 font-mono ml-1">({activeRule.credit_account_code || '601'})</span>
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
            <div className="p-4 px-5 border-t border-slate-100 shrink-0 bg-slate-50/90 flex flex-col sm:flex-row items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setColumnImportModalOpen(false)}
                className="w-full sm:w-auto px-4 py-2 border border-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-100 transition"
              >
                Batal
              </button>

              <div className="w-full sm:w-auto flex flex-col sm:flex-row items-center gap-2">
                {/* Opsi 1: Simpan Draf (Belum Diterbitkan) */}
                <button
                  type="button"
                  onClick={() => handleExecuteImport('draft')}
                  disabled={submittingImport || importParsedRows.length === 0 || !importFileValidation?.isValid}
                  className="w-full sm:w-auto px-4 py-2 bg-white border-2 border-slate-300 hover:border-slate-400 text-slate-700 hover:bg-slate-50 rounded-xl font-bold transition flex items-center justify-center gap-2 disabled:opacity-40 shadow-2xs"
                  title="Simpan data tagihan sebagai draf ke tabel matriks tanpa menerbitkan/mencatat jurnal"
                >
                  {submittingImport ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 text-slate-600" />}
                  <span>Simpan Draf (Belum Diterbitkan)</span>
                </button>

                {/* Opsi 2: Langsung Terbitkan & Catat Jurnal */}
                <button
                  type="button"
                  onClick={() => handleExecuteImport('publish')}
                  disabled={submittingImport || importParsedRows.length === 0 || !importFileValidation?.isValid}
                  className="w-full sm:w-auto px-5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl font-bold shadow-md shadow-emerald-600/20 transition flex items-center justify-center gap-2 disabled:opacity-40"
                  title="Terbitkan tagihan resmi ke santri dan langsung catat jurnal akuntansi piutang"
                >
                  {submittingImport ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4 text-emerald-200" />}
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
          <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Detail Tagihan Siswa #{selectedBillDetail.id}</h3>
                  <p className="text-[11px] text-slate-500">{selectedBillDetail.student_name || `Siswa ID ${selectedBillDetail.student_id}`}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDetailModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
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
                    Rp {parseFloat(selectedBillDetail.amount || 0).toLocaleString('id-ID')}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block">Status Pembayaran</span>
                  <span className="font-bold uppercase text-[10px] text-slate-800">{selectedBillDetail.status}</span>
                </div>
              </div>

              {selectedBillDetail.discount_amount > 0 && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-[11px]">
                  <p className="font-bold">Potongan / Diskon Tercatat</p>
                  <p>Rp {parseFloat(selectedBillDetail.discount_amount).toLocaleString('id-ID')} ({selectedBillDetail.discount_reason || 'Dispensasi'})</p>
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
                          <span className="font-bold text-slate-800">Rp {parseFloat(p.amount).toLocaleString('id-ID')}</span>
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
                  className="px-5 py-2 bg-slate-800 text-white font-bold rounded-xl hover:bg-slate-900 transition"
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
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-600 text-white flex items-center justify-center font-bold">
                  <Edit2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Revisi Tagihan #{revisingBill.id}</h3>
                  <p className="text-[11px] text-slate-500">{revisingBill.student_name}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setReviseModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveReviseBill} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nominal Baru (Rp) *</label>
                <input
                  type="number"
                  required
                  min="0"
                  value={reviseFormData.new_amount}
                  onChange={(e) => setReviseFormData({ ...reviseFormData, new_amount: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-slate-800"
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
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setReviseModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-700 rounded-xl font-bold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submittingRevise}
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold flex items-center gap-2 disabled:opacity-50"
                >
                  {submittingRevise ? <Loader2 className="w-4 h-4 animate-spin" /> : <Edit2 className="w-4 h-4" />}
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
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-amber-500 to-orange-500 text-white">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center font-bold">
                  <Send className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold">Broadcast Pengingat Tagihan</h3>
                  <p className="text-[11px] text-amber-100">Kirim notifikasi pesan ke Portal Orang Tua</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setBroadcastModalOpen(false)}
                className="p-1.5 text-white/80 hover:text-white rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
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
                    className={`p-2.5 rounded-xl border text-left transition font-semibold ${
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
                    className={`p-2.5 rounded-xl border text-left transition font-semibold ${
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
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs placeholder-slate-400"
                />
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-[11px] flex items-start gap-2">
                <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  Pesan akan otomatis terkirim ke <b>{broadcastSelectedBillIds.length} wali murid</b> dan tercatat di riwayat reminder.
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setBroadcastModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-700 rounded-xl font-bold"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleExecuteBroadcastReminders}
                  disabled={submittingBroadcast || broadcastSelectedBillIds.length === 0}
                  className="px-5 py-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white rounded-xl font-bold flex items-center gap-2 disabled:opacity-50"
                >
                  {submittingBroadcast ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  <span>Kirim ke {broadcastSelectedBillIds.length} Santri</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
