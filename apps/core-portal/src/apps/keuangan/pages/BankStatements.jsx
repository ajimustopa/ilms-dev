import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '../../../shared/store/AuthContext';
import api from '../../../shared/services/api';
import * as XLSX from 'xlsx';
import {
  Landmark,
  Calendar,
  Search,
  Filter,
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle2,
  AlertCircle,
  Clock,
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
  ChevronRight,
  ShieldCheck,
  Building2,
  Layers,
  HelpCircle,
  Eye,
  Check,
  X
} from 'lucide-react';

export default function BankStatements() {
  const { activeSchoolUnit, schoolUnits } = useAuth();
  const fileInputRef = useRef(null);

  // Filter States
  const [bankAccounts, setBankAccounts] = useState([]);
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [academicYears, setAcademicYears] = useState([]);
  const [selectedAcademicYearId, setSelectedAcademicYearId] = useState('');
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
  });
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().slice(0, 10);
  });
  const [statusFilter, setStatusFilter] = useState('all'); // all, reconciled, unreconciled
  const [dcFilter, setDcFilter] = useState(''); // all, credit, debit
  const [searchTerm, setSearchTerm] = useState('');

  // Data States
  const [loading, setLoading] = useState(false);
  const [statements, setStatements] = useState([]);
  const [summary, setSummary] = useState({
    total_rows: 0,
    total_credit: 0,
    total_debit: 0,
    net_mutation: 0,
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

  // Modal States
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

  // Notifications
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  const showNotification = (type, message) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback({ type: '', message: '' }), 5000);
  };

  // Load Bank Accounts & Master Data
  useEffect(() => {
    fetchMasterData();
  }, [activeSchoolUnit]);

  // Load Statements on filter changes
  useEffect(() => {
    fetchStatements();
  }, [
    activeSchoolUnit,
    selectedAccountId,
    selectedAcademicYearId,
    startDate,
    endDate,
    statusFilter,
    dcFilter,
    pagination.current_page
  ]);

  const fetchMasterData = async () => {
    try {
      // 1. Fetch Cash Accounts & filter for account_kind = 'bank'
      const accRes = await api.get('/keuangan/cash-accounts');
      if (accRes.data?.success) {
        const banks = (accRes.data.data || []).filter(acc => acc.account_kind === 'bank' && acc.is_active);
        setBankAccounts(banks);
        if (banks.length > 0 && !selectedAccountId) {
          setSelectedAccountId(String(banks[0].id));
          setImportAccountId(String(banks[0].id));
        }
      }

      // 2. Fetch Academic Years
      const ayRes = await api.get('/keuangan/academic-years');
      if (ayRes.data?.success) {
        setAcademicYears(ayRes.data.data || []);
      }
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
        start_date: startDate,
        end_date: endDate
      };

      if (selectedAccountId) params.cash_account_id = selectedAccountId;
      if (selectedAcademicYearId) params.academic_year_id = selectedAcademicYearId;
      if (statusFilter !== 'all') params.is_reconciled = statusFilter === 'reconciled';
      if (dcFilter) params.dc_type = dcFilter;
      if (searchTerm) params.search = searchTerm;

      const res = await api.get('/keuangan/bank-statements', { params });
      if (res.data?.success) {
        setStatements(res.data.data.statements || []);
        setSummary(res.data.data.summary || {});
        setPagination(prev => ({
          ...prev,
          ...res.data.data.pagination
        }));
      }
    } catch (err) {
      console.error('Error loading bank statements:', err);
      showNotification('error', err.response?.data?.message || 'Gagal memuat daftar rekening koran');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPagination(p => ({ ...p, current_page: 1 }));
    fetchStatements();
  };

  // Open Reconcile Modal & Fetch candidates
  const openReconcileModal = async (statement) => {
    setReconcileTarget(statement);
    setCandidates([]);
    setCustomReconcileForm({
      reference_type: statement.dc_type === 'credit' ? 'student_bill_payment' : 'expense',
      reference_id: '',
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
  const handleReconcile = async (refType, refId, notes) => {
    if (!reconcileTarget) return;
    try {
      setReconciling(true);
      const res = await api.post(`/keuangan/bank-statements/${reconcileTarget.id}/reconcile`, {
        reference_type: refType,
        reference_id: refId,
        notes: notes || null
      });

      if (res.data?.success) {
        showNotification('success', 'Baris rekening koran berhasil direkonsiliasi!');
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
  const handleUnreconcile = async (statementId) => {
    if (!window.confirm('Lepas rujukan rekonsiliasi untuk baris rekening koran ini?')) return;
    try {
      const res = await api.post(`/keuangan/bank-statements/${statementId}/unreconcile`);
      if (res.data?.success) {
        showNotification('success', 'Rujukan rekonsiliasi berhasil dilepas');
        fetchStatements();
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
        fetchStatements();
      }
    } catch (err) {
      showNotification('error', err.response?.data?.message || 'Gagal menghapus baris rekening koran');
    }
  };

  // Save Manual Form
  const handleSaveManual = async (e) => {
    e.preventDefault();
    try {
      setSavingManual(true);
      const res = await api.post('/keuangan/bank-statements', {
        ...manualForm,
        cash_account_id: manualForm.cash_account_id || selectedAccountId,
        academic_year_id: selectedAcademicYearId || null
      });

      if (res.data?.success) {
        showNotification('success', 'Mutasi rekening koran berhasil dicatat');
        setShowManualModal(false);
        setManualForm({
          cash_account_id: selectedAccountId,
          transaction_date: new Date().toISOString().slice(0, 16),
          journal_number: '',
          description: '',
          amount: '',
          dc_type: 'credit',
          running_balance: ''
        });
        fetchStatements();
      }
    } catch (err) {
      showNotification('error', err.response?.data?.message || 'Gagal mencatat mutasi rekening koran');
    } finally {
      setSavingManual(false);
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
          date_key: headers.find(h => /tgl|tanggal|date/i.test(h)) || '',
          desc_key: headers.find(h => /uraian|keterangan|deskripsi|desc/i.test(h)) || '',
          ref_key: headers.find(h => /ref|jurnal|nomor/i.test(h)) || '',
          debit_key: headers.find(h => /debit|db|keluar/i.test(h)) || '',
          credit_key: headers.find(h => /kredit|cr|masuk/i.test(h)) || '',
          amount_key: headers.find(h => /nominal|amount|jumlah/i.test(h)) || '',
          dc_key: headers.find(h => /tipe|dc|d\/c/i.test(h)) || '',
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Mutasi Masuk (Kredit) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Total Masuk (Kredit)
            </span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <ArrowDownLeft className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl font-bold text-emerald-700">
            {formatCurrency(summary.total_credit)}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            Uang masuk menurut rekening koran
          </p>
        </div>

        {/* Total Mutasi Keluar (Debit) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Total Keluar (Debit)
            </span>
            <div className="p-2 bg-rose-50 text-rose-600 rounded-xl">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl font-bold text-rose-700">
            {formatCurrency(summary.total_debit)}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            Uang keluar menurut rekening koran
          </p>
        </div>

        {/* Mutasi Bersih */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Mutasi Bersih (Net)
            </span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <p className={`text-xl font-bold ${summary.net_mutation >= 0 ? 'text-slate-800' : 'text-rose-600'}`}>
            {formatCurrency(summary.net_mutation)}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            Selisih arus kas mutasi bank
          </p>
        </div>

        {/* Progress Rekonsiliasi */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Progres Rekonsiliasi
            </span>
            <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-xs font-bold">
              {summary.reconciliation_rate}%
            </span>
          </div>
          <div className="flex items-baseline space-x-2">
            <p className="text-xl font-bold text-slate-800">
              {summary.reconciled_count}
            </p>
            <span className="text-xs text-slate-400">/ {summary.total_rows} baris cocok</span>
          </div>
          {/* Progress Bar */}
          <div className="w-full bg-slate-100 h-2 rounded-full mt-2 overflow-hidden">
            <div
              className="bg-blue-600 h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, summary.reconciliation_rate)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Rekening Bank */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Rekening Bank
            </label>
            <select
              value={selectedAccountId}
              onChange={(e) => {
                setSelectedAccountId(e.target.value);
                setPagination(p => ({ ...p, current_page: 1 }));
              }}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            >
              {bankAccounts.length === 0 && (
                <option value="">Tidak ada rekening bank</option>
              )}
              {bankAccounts.map(acc => (
                <option key={acc.id} value={acc.id}>
                  {acc.name} ({acc.bank_name || 'Bank'} - {acc.bank_account_number || '-'})
                </option>
              ))}
            </select>
          </div>

          {/* Tanggal Mulai */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Tanggal Mulai
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPagination(p => ({ ...p, current_page: 1 }));
              }}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          {/* Tanggal Selesai */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Tanggal Selesai
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPagination(p => ({ ...p, current_page: 1 }));
              }}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          {/* Status Rekonsiliasi */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Status Rekonsiliasi
            </label>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPagination(p => ({ ...p, current_page: 1 }));
              }}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            >
              <option value="all">Semua Status</option>
              <option value="unreconciled">Belum Direkonsiliasi (🟡)</option>
              <option value="reconciled">Sudah Direkonsiliasi (🟢)</option>
            </select>
          </div>

          {/* Tipe D/C */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Arus Mutasi (D/C)
            </label>
            <select
              value={dcFilter}
              onChange={(e) => {
                setDcFilter(e.target.value);
                setPagination(p => ({ ...p, current_page: 1 }));
              }}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            >
              <option value="">Semua Mutasi</option>
              <option value="credit">Kredit (Uang Masuk)</option>
              <option value="debit">Debit (Uang Keluar)</option>
            </select>
          </div>
        </div>

        {/* Search Box & Quick Controls */}
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 pt-2 border-t border-slate-100">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari uraian transaksi, nomor referensi, atau catatan rekonsiliasi..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-medium transition-colors"
          >
            Terapkan
          </button>
          <button
            type="button"
            onClick={() => {
              setSearchTerm('');
              setStatusFilter('all');
              setDcFilter('');
              setPagination(p => ({ ...p, current_page: 1 }));
            }}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
            title="Reset filter"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </form>
      </div>

      {/* Main Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold">
                <th className="py-3.5 px-4 w-12 text-center">No</th>
                <th className="py-3.5 px-4 w-28">Tanggal</th>
                <th className="py-3.5 px-4 w-32">No. Referensi</th>
                <th className="py-3.5 px-4 min-w-[220px]">Uraian Mutasi Bank</th>
                <th className="py-3.5 px-4 w-24 text-center">Tipe</th>
                <th className="py-3.5 px-4 w-32 text-right">Nominal</th>
                <th className="py-3.5 px-4 w-32 text-right">Saldo Berjalan</th>
                <th className="py-3.5 px-4 w-36 text-center">Status</th>
                <th className="py-3.5 px-4 min-w-[200px]">Rujukan Transaksi Sistem</th>
                <th className="py-3.5 px-4 w-28 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <RefreshCw className="w-6 h-6 animate-spin text-blue-500" />
                      <span className="text-xs font-medium">Memuat data rekening koran...</span>
                    </div>
                  </td>
                </tr>
              ) : statements.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">
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
                  return (
                    <tr
                      key={row.id}
                      className={`hover:bg-slate-50/60 transition-colors ${
                        row.is_reconciled ? 'bg-emerald-50/10' : ''
                      }`}
                    >
                      <td className="py-3 px-4 text-center text-slate-400 font-mono text-[11px]">
                        {rowNumber}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-700 whitespace-nowrap">
                        {row.transaction_date_formatted || '-'}
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
                      <td className="py-3 px-4 text-right font-semibold whitespace-nowrap">
                        <span className={row.dc_type === 'credit' ? 'text-emerald-700' : 'text-rose-700'}>
                          {row.dc_type === 'credit' ? '+' : '-'} {formatCurrency(row.amount)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right text-slate-600 font-mono text-[11px] whitespace-nowrap">
                        {row.running_balance !== null ? formatCurrency(row.running_balance) : '-'}
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        {row.is_reconciled ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-100 text-emerald-800">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Cocok
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-amber-100 text-amber-800">
                            <Clock className="w-3.5 h-3.5" />
                            Belum Cocok
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {row.is_reconciled ? (
                          <div className="space-y-0.5">
                            <div className="flex items-center space-x-1.5">
                              <span className="px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded font-semibold text-[10px] uppercase">
                                {row.reconciled_reference_type}
                              </span>
                              <span className="font-medium text-slate-800 text-[11px]">
                                {row.reference_display?.label || `#${row.reconciled_reference_id}`}
                              </span>
                            </div>
                            {row.reconciliation_notes && (
                              <p className="text-[10px] text-slate-400 italic">
                                "{row.reconciliation_notes}"
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[11px] italic">
                            Belum ditautkan ke transaksi sistem
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        {row.is_reconciled ? (
                          <button
                            onClick={() => handleUnreconcile(row.id)}
                            className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Lepas Rujukan Rekonsiliasi"
                          >
                            <Unlink className="w-4 h-4" />
                          </button>
                        ) : (
                          <div className="flex items-center justify-center space-x-1">
                            <button
                              onClick={() => openReconcileModal(row)}
                              className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg font-medium text-[11px] flex items-center gap-1 transition-colors"
                              title="Tautkan ke Transaksi Internal"
                            >
                              <LinkIcon className="w-3 h-3" />
                              Tautkan
                            </button>
                            <button
                              onClick={() => handleDeleteStatement(row.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                              title="Hapus"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-600">
          <div>
            Menampilkan baris <b>{statements.length > 0 ? (pagination.current_page - 1) * pagination.per_page + 1 : 0}</b> sampai{' '}
            <b>{Math.min(pagination.current_page * pagination.per_page, pagination.total_records)}</b> dari{' '}
            <b>{pagination.total_records}</b> total baris mutasi
          </div>
          <div className="flex items-center space-x-1">
            <button
              disabled={pagination.current_page <= 1}
              onClick={() => setPagination(p => ({ ...p, current_page: p.current_page - 1 }))}
              className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-100 font-medium"
            >
              Sebelumnya
            </button>
            <span className="px-3 py-1.5 font-bold text-slate-800">
              Hal {pagination.current_page} / {pagination.total_pages || 1}
            </span>
            <button
              disabled={pagination.current_page >= pagination.total_pages}
              onClick={() => setPagination(p => ({ ...p, current_page: p.current_page + 1 }))}
              className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-100 font-medium"
            >
              Selanjutnya
            </button>
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
            <div className="p-5 bg-slate-50/80 border-b border-slate-100">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Mutasi Rekening Koran Bank Target
              </span>
              <div className="mt-2 flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200/80">
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
            </div>

            <div className="p-5 space-y-5">
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
                    {candidates.map((cand, cIdx) => (
                      <div
                        key={cIdx}
                        className="p-3 bg-white hover:bg-blue-50/50 border border-slate-200 hover:border-blue-300 rounded-xl flex items-center justify-between transition-all"
                      >
                        <div className="space-y-1">
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
                          <p className="text-xs font-semibold text-slate-800">
                            {cand.title}
                          </p>
                        </div>
                        <div className="flex items-center space-x-3">
                          <span className="text-xs font-bold text-slate-800">
                            {formatCurrency(cand.amount)}
                          </span>
                          <button
                            onClick={() => handleReconcile(cand.reference_type, cand.reference_id, `Cocok otomatis (${cand.confidence})`)}
                            disabled={reconciling}
                            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow-sm transition-all"
                          >
                            Pilih
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Manual Input Link Option */}
              <div className="pt-4 border-t border-slate-100 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  Atau Tautkan Manual dengan ID Transaksi
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Kategori Transaksi
                    </label>
                    <select
                      value={customReconcileForm.reference_type}
                      onChange={(e) => setCustomReconcileForm(p => ({ ...p, reference_type: e.target.value }))}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
                    >
                      <option value="student_bill_payment">Pembayaran Tagihan Siswa (bill_payments)</option>
                      <option value="other_income">Penerimaan Non-SPP (other_incomes)</option>
                      <option value="expense">Pengeluaran & Belanja (expenses)</option>
                      <option value="cash_transfer">Transfer Antar Kas/Bank (cash_transfers)</option>
                      <option value="payroll">Pencairan Gaji (payroll_disbursements)</option>
                      <option value="other">Lainnya (Bunga/Pajak/Biaya Admin)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      ID Transaksi Sistem
                    </label>
                    <input
                      type="number"
                      placeholder="Contoh: 154"
                      value={customReconcileForm.reference_id}
                      onChange={(e) => setCustomReconcileForm(p => ({ ...p, reference_id: e.target.value }))}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Catatan Rekonsiliasi (Opsional)
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Diterima kliring BNI tgl 5 Agustus"
                    value={customReconcileForm.notes}
                    onChange={(e) => setCustomReconcileForm(p => ({ ...p, notes: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
                  />
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    onClick={() => handleReconcile(customReconcileForm.reference_type, customReconcileForm.reference_id, customReconcileForm.notes)}
                    disabled={reconciling || !customReconcileForm.reference_id}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-900 disabled:opacity-40 text-white rounded-xl text-xs font-semibold"
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
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-100 p-6 space-y-5">
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
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Target Bank Account */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Rekening Bank Tujuan Import *
                </label>
                <select
                  value={importAccountId}
                  onChange={(e) => setImportAccountId(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800"
                >
                  {bankAccounts.map(acc => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} ({acc.bank_name || 'Bank'} - {acc.bank_account_number || '-'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Pilih Berkas Excel (.xlsx, .xls) *
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={handleFileSelect}
                  className="w-full text-xs text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
                />
              </div>
            </div>

            {/* Column Mapping (If file selected) */}
            {columnHeaders.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Pemetaan Kolom Excel ({parsedRows.length} baris terdeteksi)
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl text-xs">
                  <div>
                    <label className="block font-medium text-slate-600 mb-1">Kolom Tanggal *</label>
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
                    Pratinjau 3 Baris Pertama
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

            {/* Footer Buttons */}
            <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
              <button
                onClick={() => setShowImportModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
              >
                Batal
              </button>
              <button
                onClick={handleExecuteImport}
                disabled={importing || parsedRows.length === 0}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white rounded-xl text-xs font-semibold shadow-sm transition-all"
              >
                {importing ? 'Mengimpor Data...' : `Mulai Import (${parsedRows.length} Baris)`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Catat Manual Mutasi */}
      {showManualModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-100 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
                <Plus className="w-5 h-5 text-blue-600" />
                Catat Mutasi Rekening Koran Manual
              </h3>
              <button
                onClick={() => setShowManualModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveManual} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Rekening Bank *</label>
                <select
                  value={manualForm.cash_account_id}
                  onChange={(e) => setManualForm(p => ({ ...p, cash_account_id: e.target.value }))}
                  required
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                >
                  {bankAccounts.map(acc => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} ({acc.bank_name || 'Bank'} - {acc.bank_account_number || '-'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Tanggal & Jam *</label>
                  <input
                    type="datetime-local"
                    value={manualForm.transaction_date}
                    onChange={(e) => setManualForm(p => ({ ...p, transaction_date: e.target.value }))}
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">No. Referensi Bank</label>
                  <input
                    type="text"
                    placeholder="Contoh: TRF-102938"
                    value={manualForm.journal_number}
                    onChange={(e) => setManualForm(p => ({ ...p, journal_number: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Uraian Mutasi *</label>
                <textarea
                  rows={2}
                  placeholder="Contoh: Setoran tunai loket cabang BNI"
                  value={manualForm.description}
                  onChange={(e) => setManualForm(p => ({ ...p, description: e.target.value }))}
                  required
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Arus Mutasi *</label>
                  <select
                    value={manualForm.dc_type}
                    onChange={(e) => setManualForm(p => ({ ...p, dc_type: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                  >
                    <option value="credit">Kredit (Uang Masuk / +)</option>
                    <option value="debit">Debit (Uang Keluar / -)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Nominal (Rp) *</label>
                  <input
                    type="number"
                    min="1"
                    placeholder="Contoh: 1500000"
                    value={manualForm.amount}
                    onChange={(e) => setManualForm(p => ({ ...p, amount: e.target.value }))}
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Saldo Berjalan Bank (Opsional)</label>
                <input
                  type="number"
                  placeholder="Contoh: 54500000"
                  value={manualForm.running_balance}
                  onChange={(e) => setManualForm(p => ({ ...p, running_balance: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowManualModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={savingManual}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold shadow-sm"
                >
                  {savingManual ? 'Menyimpan...' : 'Simpan Mutasi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
