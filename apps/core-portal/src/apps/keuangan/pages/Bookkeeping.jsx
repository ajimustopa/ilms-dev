import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '../../../shared/store/AuthContext';
import api from '../../../shared/services/api';
import * as XLSX from 'xlsx';
import StatRibbonCard from '../../../shared/components/StatRibbonCard';
import StatusPill from '../../../shared/components/StatusPill';
import FlatAlertBanner from '../../../shared/components/FlatAlertBanner';
import { formatCurrency, formatNumber, formatPercentage, formatDate } from '../../../shared/utils/formatters';
import {
  BookOpen,
  PiggyBank,
  Lock,
  Plus,
  ArrowDownCircle,
  ArrowUpCircle,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Calendar,
  Eye,
  X,
  RotateCw,
  Scale,
  FileSpreadsheet,
  Building2,
  Search,
  Filter,
  FileText,
  FileDown,
  Layers,
  ChevronDown,
  ChevronRight,
  TrendingUp,
  Landmark,
  Wallet,
  Check,
  History,
  Tag,
  AlignLeft,
  ArrowDownLeft,
  ArrowUpRight,
  PieChart,
  Coins,
  SlidersHorizontal,
  RotateCcw
} from 'lucide-react';

const DEFAULT_CASH_COL_WIDTHS = {
  tanggal: 110,
  jenis: 140,
  uraian: 320,
  kas: 185,
  ref: 130,
  pos_rapbs: 200,
  pos_sumber_dana: 180,
  masuk: 130,
  keluar: 130,
  saldo: 140
};

const DEFAULT_JOURNAL_COL_WIDTHS = {
  ref: 180,
  akun: 280,
  uraian: 300,
  posisi: 85,
  debit: 135,
  kredit: 135,
  aksi: 80
};

// Reusable Enterprise Multi-Select Filter Popover
function MultiSelectFilterPopover({
  label,
  icon: Icon,
  options = [],
  selected = [],
  onChange,
  placeholder = 'Cari...'
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const popoverRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const filteredOptions = useMemo(() => {
    if (!search) return options;
    const q = search.toLowerCase();
    return options.filter(o => (o.label || '').toLowerCase().includes(q));
  }, [options, search]);

  const handleToggle = (val) => {
    if (selected.includes(val)) {
      onChange(selected.filter(v => v !== val));
    } else {
      onChange([...selected, val]);
    }
  };

  const handleSelectAll = () => {
    onChange(options.map(o => o.value));
  };

  const handleClear = () => {
    onChange([]);
  };

  const count = selected.length;

  return (
    <div className="relative inline-block" ref={popoverRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition shadow-2xs cursor-pointer select-none ${
          count > 0
            ? 'bg-amber-50 text-amber-900 border-amber-300 ring-1 ring-amber-400/40'
            : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-300'
        }`}
      >
        {Icon && <Icon className="w-3.5 h-3.5 text-slate-500 shrink-0" />}
        <span>{label}</span>
        {count > 0 && (
          <span className="px-1.5 py-0.2 text-[10px] font-extrabold bg-amber-600 text-white rounded-full">
            {count}
          </span>
        )}
        <ChevronDown className={`w-3 h-3 text-slate-400 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-1.5 w-64 bg-white rounded-xl shadow-xl border border-slate-200 z-50 p-2 text-xs animate-in fade-in zoom-in-95 duration-100">
          <div className="relative mb-2">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder={placeholder}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-7 pr-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-amber-500 focus:outline-hidden"
              autoFocus
            />
          </div>

          <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-slate-100 text-[11px] px-1">
            <button
              type="button"
              onClick={handleSelectAll}
              className="text-emerald-700 hover:text-emerald-800 font-bold hover:underline cursor-pointer"
            >
              Pilih Semua ({options.length})
            </button>
            <button
              type="button"
              onClick={handleClear}
              className="text-rose-600 hover:text-rose-700 font-bold hover:underline cursor-pointer"
            >
              Hapus Semua
            </button>
          </div>

          <div className="max-h-52 overflow-y-auto space-y-0.5 custom-scrollbar pr-1">
            {filteredOptions.length === 0 ? (
              <div className="text-center py-4 text-slate-400 text-xs italic">
                Tidak ada opsi yang sesuai
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isChecked = selected.includes(opt.value);
                return (
                  <label
                    key={opt.value}
                    className="flex items-center gap-2 px-2 py-1.5 hover:bg-amber-50/60 rounded-lg cursor-pointer transition select-none text-[11px]"
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => handleToggle(opt.value)}
                      className="rounded border-slate-300 text-amber-600 focus:ring-amber-500 w-3.5 h-3.5"
                    />
                    <span className="truncate text-slate-700 flex-1 font-medium" title={opt.label}>
                      {opt.label}
                    </span>
                  </label>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function Bookkeeping() {
  const { activeSchoolUnit } = useAuth();
  const [academicYears, setAcademicYears] = useState([]);
  const [selectedAcademicYearId, setSelectedAcademicYearId] = useState('');

  // Main Tabs: 'cash_ledger' | 'journals' | 'ledger' | 'worksheet' | 'statements' | 'savings-closings'
  const [mainTab, setMainTab] = useState('cash_ledger');

  // Global & tab loading
  const [loading, setLoading] = useState(false);

  // ==========================================
  // TAB 0: BUKU KAS TERPADU / KAS HARIAN (SLIM SPREADSHEET STYLE)
  // ==========================================
  const [cashLedgerData, setCashLedgerData] = useState({
    rows: [],
    grouped: {},
    summary: { total_income: 0, total_expense: 0, total_transfer: 0, net_balance: 0, count: 0 }
  });
  const [cashLedgerLoading, setCashLedgerLoading] = useState(false);
  const [cashAccountsList, setCashAccountsList] = useState([]);
  const [selectedCashAccountId, setSelectedCashAccountId] = useState('all');
  const [cashLedgerSearch, setCashLedgerSearch] = useState('');
  const [cashLedgerDateFrom, setCashLedgerDateFrom] = useState('');
  const [cashLedgerDateTo, setCashLedgerDateTo] = useState('');
  const [collapsedMonths, setCollapsedMonths] = useState({});

  // Multiselect Column Filters
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [selectedCashAccounts, setSelectedCashAccounts] = useState([]);
  const [selectedBudgetPos, setSelectedBudgetPos] = useState([]);
  const [selectedFundSources, setSelectedFundSources] = useState([]);
  const [selectedCashAffects, setSelectedCashAffects] = useState('all'); // 'all' | 'cash' | 'non_cash'

  // Resizable Column Widths with LocalStorage Persistence
  const [cashColWidths, setCashColWidths] = useState(() => {
    try {
      const saved = localStorage.getItem('cash_ledger_col_widths_v1');
      if (saved) return { ...DEFAULT_CASH_COL_WIDTHS, ...JSON.parse(saved) };
    } catch (e) {}
    return DEFAULT_CASH_COL_WIDTHS;
  });

  const resizingColRef = useRef(null);

  const handleMouseDownResize = (colKey, e) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startWidth = cashColWidths[colKey] || DEFAULT_CASH_COL_WIDTHS[colKey];
    resizingColRef.current = { colKey, startX, startWidth };

    const handleMouseMove = (moveEvent) => {
      if (!resizingColRef.current) return;
      const delta = moveEvent.clientX - resizingColRef.current.startX;
      const minWidths = {
        tanggal: 75,
        jenis: 90,
        uraian: 150,
        kas: 110,
        ref: 80,
        pos_rapbs: 110,
        pos_sumber_dana: 110,
        masuk: 90,
        keluar: 90,
        saldo: 100
      };
      const minW = minWidths[resizingColRef.current.colKey] || 70;
      const newWidth = Math.max(minW, resizingColRef.current.startWidth + delta);

      setCashColWidths(prev => {
        const updated = { ...prev, [resizingColRef.current.colKey]: newWidth };
        try { localStorage.setItem('cash_ledger_col_widths_v1', JSON.stringify(updated)); } catch (err) {}
        return updated;
      });
    };

    const handleMouseUp = () => {
      resizingColRef.current = null;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const handleResetColWidths = () => {
    setCashColWidths(DEFAULT_CASH_COL_WIDTHS);
    try { localStorage.removeItem('cash_ledger_col_widths_v1'); } catch (err) {}
  };

  // ==========================================
  // TAB 1: JURNAL UMUM STATES
  // ==========================================
  const [journals, setJournals] = useState([]);
  const [selectedJournal, setSelectedJournal] = useState(null);
  const [journalModalOpen, setJournalModalOpen] = useState(false);
  const [manualModalOpen, setManualModalOpen] = useState(false);
  const [coaList, setCoaList] = useState([]);
  const [manualForm, setManualForm] = useState({
    academic_year_id: '',
    journal_date: new Date().toISOString().slice(0, 10),
    description: '',
    source_type: 'adjustment',
    lines: [
      { chart_of_account_id: 1, entry_side: 'debit', amount: '' },
      { chart_of_account_id: 2, entry_side: 'credit', amount: '' }
    ]
  });
  const [submittingManual, setSubmittingManual] = useState(false);
  const [journalSearch, setJournalSearch] = useState('');
  const [journalSourceFilter, setJournalSourceFilter] = useState('all'); // 'all' | 'system' | 'manual'
  const [journalBalanceFilter, setJournalBalanceFilter] = useState('all'); // 'all' | 'balanced' | 'unbalanced'
  const [selectedJournalMonth, setSelectedJournalMonth] = useState('all'); // 'all' | 'YYYY-MM'
  const [collapsedJournals, setCollapsedJournals] = useState({});

  // Resizable Column Widths for Journals with LocalStorage Persistence
  const [journalColWidths, setJournalColWidths] = useState(() => {
    try {
      const saved = localStorage.getItem('journal_col_widths_v1');
      if (saved) return { ...DEFAULT_JOURNAL_COL_WIDTHS, ...JSON.parse(saved) };
    } catch (e) {}
    return DEFAULT_JOURNAL_COL_WIDTHS;
  });

  const resizingJournalColRef = useRef(null);

  const handleMouseDownResizeJournal = (colKey, e) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startWidth = journalColWidths[colKey] || DEFAULT_JOURNAL_COL_WIDTHS[colKey];
    resizingJournalColRef.current = { colKey, startX, startWidth };

    const handleMouseMove = (moveEvent) => {
      if (!resizingJournalColRef.current) return;
      const delta = moveEvent.clientX - resizingJournalColRef.current.startX;
      const minWidths = {
        ref: 120,
        akun: 180,
        uraian: 180,
        posisi: 65,
        debit: 95,
        kredit: 95,
        aksi: 65
      };
      const minW = minWidths[resizingJournalColRef.current.colKey] || 60;
      const newWidth = Math.max(minW, resizingJournalColRef.current.startWidth + delta);

      setJournalColWidths(prev => {
        const updated = { ...prev, [resizingJournalColRef.current.colKey]: newWidth };
        try { localStorage.setItem('journal_col_widths_v1', JSON.stringify(updated)); } catch (err) {}
        return updated;
      });
    };

    const handleMouseUp = () => {
      resizingJournalColRef.current = null;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const handleResetJournalColWidths = () => {
    setJournalColWidths(DEFAULT_JOURNAL_COL_WIDTHS);
    try { localStorage.removeItem('journal_col_widths_v1'); } catch (err) {}
  };

  const toggleJournalCollapse = (jId) => {
    setCollapsedJournals(prev => ({
      ...prev,
      [jId]: !prev[jId]
    }));
  };

  const toggleAllJournalsCollapse = () => {
    const allCollapsed = filteredJournals.length > 0 && filteredJournals.every(j => Boolean(collapsedJournals[j.id]));
    if (allCollapsed) {
      setCollapsedJournals({});
    } else {
      const next = {};
      filteredJournals.forEach(j => { next[j.id] = true; });
      setCollapsedJournals(next);
    }
  };

  const handleExportJournalsExcel = () => {
    if (!filteredJournals || filteredJournals.length === 0) {
      alert('Tidak ada data jurnal untuk diekspor.');
      return;
    }
    const excelRows = [];
    filteredJournals.forEach(j => {
      (j.lines || []).forEach(l => {
        excelRows.push({
          'No. Jurnal': j.journal_number,
          'Tanggal': j.journal_date ? (typeof j.journal_date === 'string' ? j.journal_date.slice(0, 10) : new Date(j.journal_date).toISOString().slice(0, 10)) : '',
          'Sumber': j.source_type || 'system',
          'Uraian Transaksi': j.description,
          'Kode Akun (COA)': l.account_code,
          'Nama Akun': l.account_name,
          'Grup Akun': l.account_group,
          'Posisi': l.entry_side === 'debit' ? 'DEBIT' : 'KREDIT',
          'Debit (Rp)': l.entry_side === 'debit' ? parseFloat(l.amount || 0) : 0,
          'Kredit (Rp)': l.entry_side === 'credit' ? parseFloat(l.amount || 0) : 0,
          'Status Seimbang': j.is_balanced ? 'SEIMBANG' : 'TIDAK SEIMBANG'
        });
      });
    });
    const ws = XLSX.utils.json_to_sheet(excelRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Jurnal Umum');
    XLSX.writeFile(wb, `Jurnal_Umum_${selectedAyObj?.name || 'Semua'}_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  // ==========================================
  // TAB 2: BUKU BESAR (GENERAL LEDGER) STATES
  // ==========================================
  const [ledgerData, setLedgerData] = useState([]);
  const [selectedLedgerAccountId, setSelectedLedgerAccountId] = useState('');
  const [ledgerLoading, setLedgerLoading] = useState(false);

  // ==========================================
  // TAB 3: LEMBAR KERJA (WORKSHEET) STATES
  // ==========================================
  const [worksheetData, setWorksheetData] = useState(null);
  const [worksheetLoading, setWorksheetLoading] = useState(false);

  // ==========================================
  // TAB 4: LAPORAN AKUNTANSI LENGKAP STATES
  // ==========================================
  const [statementType, setStatementType] = useState('balance-sheet'); // 'balance-sheet' | 'income-statement' | 'cash-flow'
  const [statementData, setStatementData] = useState(null);
  const [statementLoading, setStatementLoading] = useState(false);

  // ==========================================
  // TAB 5: TABUNGAN & TUTUP BUKU STATES
  // ==========================================
  const [subTabOperations, setSubTabOperations] = useState('savings'); // 'savings' | 'closings'
  const [savings, setSavings] = useState([]);
  const [selectedSaving, setSelectedSaving] = useState(null);
  const [savingModalOpen, setSavingModalOpen] = useState(false);
  const [savingTxType, setSavingTxType] = useState('deposit');
  const [savingAmount, setSavingAmount] = useState('');
  const [closings, setClosings] = useState([]);
  const [ayDropdownOpen, setAyDropdownOpen] = useState(false);
  const ayDropdownRef = React.useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ayDropdownRef.current && !ayDropdownRef.current.contains(e.target)) {
        setAyDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch Academic Years with Deduplication
  useEffect(() => {
    const fetchAY = async () => {
      try {
        const params = {};
        if (activeSchoolUnit?.id && activeSchoolUnit.id !== 'all' && activeSchoolUnit.id !== 'foundation') {
          params.satuan_pendidikan_id = activeSchoolUnit.id;
        }
        const res = await api.get('/akademik/academic-years', { params });
        const list = res.data?.data || [];

        // Deduplikasi tahun ajaran berdasarkan nama
        const seenNames = new Set();
        const uniqueList = [];
        for (const ay of list) {
          if (!seenNames.has(ay.name)) {
            seenNames.add(ay.name);
            uniqueList.push(ay);
          }
        }

        // Urutkan dari tahun terbaru ke terlama
        uniqueList.sort((a, b) => (b.start_date || '').localeCompare(a.start_date || '') || b.name.localeCompare(a.name));

        setAcademicYears(uniqueList);

        if (!selectedAcademicYearId) {
          const active = uniqueList.find(a => a.is_active);
          if (active) setSelectedAcademicYearId(String(active.id));
          else if (uniqueList.length > 0) setSelectedAcademicYearId(String(uniqueList[0].id));
        }
      } catch (err) {
        console.error('Error fetching academic years:', err);
      }
    };
    fetchAY();
  }, [activeSchoolUnit]);

  const selectedAyObj = useMemo(() => {
    if (selectedAcademicYearId === 'all') return { id: 'all', name: 'Semua Tahun Ajaran' };
    return academicYears.find(a => String(a.id) === String(selectedAcademicYearId)) || null;
  }, [academicYears, selectedAcademicYearId]);

  // Fetch COA List once for dropdowns
  useEffect(() => {
    const fetchCoa = async () => {
      try {
        const res = await api.get('/keuangan/chart-of-accounts');
        setCoaList(res.data?.data || []);
      } catch (err) {
        console.error('Error fetching COA:', err);
      }
    };
    fetchCoa();
  }, [activeSchoolUnit]);

  // Fetch Cash Accounts List
  useEffect(() => {
    const fetchCashAccounts = async () => {
      try {
        const res = await api.get('/keuangan/cash-accounts');
        setCashAccountsList(res.data?.data || []);
      } catch (err) {
        console.warn('Error fetching cash accounts:', err);
      }
    };
    fetchCashAccounts();
  }, [activeSchoolUnit]);

  // Main Fetch Data Controller
  const fetchData = async () => {
    setLoading(true);
    try {
      const commonParams = {};
      if (selectedAcademicYearId && selectedAcademicYearId !== 'all') {
        commonParams.academic_year_id = selectedAcademicYearId;
      }

      if (mainTab === 'cash_ledger') {
        setCashLedgerLoading(true);
        const params = { ...commonParams };
        if (selectedCashAccountId && selectedCashAccountId !== 'all') {
          params.cash_account_id = selectedCashAccountId;
        }
        if (cashLedgerDateFrom) params.date_from = cashLedgerDateFrom;
        if (cashLedgerDateTo) params.date_to = cashLedgerDateTo;
        if (cashLedgerSearch) params.search = cashLedgerSearch;

        const res = await api.get('/keuangan/bookkeeping/cash-ledger', { params });
        setCashLedgerData(res.data?.data || {
          rows: [],
          grouped: {},
          summary: { total_income: 0, total_expense: 0, total_transfer: 0, net_balance: 0, count: 0 }
        });
        setCashLedgerLoading(false);
      } else if (mainTab === 'journals') {
        const jRes = await api.get('/keuangan/journal-entries', { params: commonParams });
        setJournals(jRes.data?.data || []);
      } else if (mainTab === 'ledger') {
        setLedgerLoading(true);
        const params = { ...commonParams };
        if (selectedLedgerAccountId) params.account_id = selectedLedgerAccountId;
        const res = await api.get('/keuangan/bookkeeping/general-ledger', { params });
        setLedgerData(res.data?.data || []);
        setLedgerLoading(false);
      } else if (mainTab === 'worksheet') {
        setWorksheetLoading(true);
        const res = await api.get('/keuangan/bookkeeping/worksheet', { params: commonParams });
        setWorksheetData(res.data?.data || null);
        setWorksheetLoading(false);
      } else if (mainTab === 'statements') {
        setStatementLoading(true);
        const endpoint = statementType === 'balance-sheet'
          ? '/keuangan/reports/balance-sheet'
          : statementType === 'income-statement'
          ? '/keuangan/reports/income-statement'
          : '/keuangan/reports/cash-flow';
        const res = await api.get(endpoint, { params: commonParams });
        setStatementData(res.data?.data || null);
        setStatementLoading(false);
      } else if (mainTab === 'savings-closings') {
        if (subTabOperations === 'savings') {
          const res = await api.get('/keuangan/savings-accounts');
          setSavings(res.data?.data || []);
        } else {
          const res = await api.get('/keuangan/fiscal-year-closings', { params: commonParams });
          setClosings(res.data?.data || []);
        }
      }
    } catch (err) {
      console.error('Error fetching accounting data:', err);
    } finally {
      setLoading(false);
      setCashLedgerLoading(false);
      setLedgerLoading(false);
      setWorksheetLoading(false);
      setStatementLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [
    mainTab,
    statementType,
    selectedLedgerAccountId,
    selectedCashAccountId,
    cashLedgerDateFrom,
    cashLedgerDateTo,
    subTabOperations,
    activeSchoolUnit,
    selectedAcademicYearId
  ]);

  // ----------------------------------------------------
  // HANDLERS: JURNAL UMUM & DETAIL
  // ----------------------------------------------------
  const handleViewJournalDetail = async (id) => {
    try {
      const res = await api.get(`/keuangan/journal-entries/${id}`);
      setSelectedJournal(res.data?.data);
      setJournalModalOpen(true);
    } catch (err) {
      alert('Gagal mengambil rincian jurnal');
    }
  };

  const handleAddManualLine = () => {
    setManualForm(prev => ({
      ...prev,
      lines: [...prev.lines, { chart_of_account_id: coaList[0]?.id || 1, entry_side: 'debit', amount: '' }]
    }));
  };

  const handleRemoveManualLine = (idx) => {
    if (manualForm.lines.length <= 2) {
      alert('Jurnal minimal memiliki 2 baris (Debit dan Kredit)');
      return;
    }
    setManualForm(prev => ({
      ...prev,
      lines: prev.lines.filter((_, i) => i !== idx)
    }));
  };

  const handleManualLineChange = (idx, field, value) => {
    setManualForm(prev => {
      const next = [...prev.lines];
      next[idx] = { ...next[idx], [field]: value };
      return { ...prev, lines: next };
    });
  };

  const handleSaveManualJournal = async (e) => {
    e.preventDefault();
    const debits = manualForm.lines.filter(l => l.entry_side === 'debit').reduce((s, l) => s + parseFloat(l.amount || 0), 0);
    const credits = manualForm.lines.filter(l => l.entry_side === 'credit').reduce((s, l) => s + parseFloat(l.amount || 0), 0);

    if (Math.abs(debits - credits) > 0.01) {
      alert(`Jurnal tidak seimbang! Total Debit: ${formatCurrency(debits)} vs Total Kredit: ${formatCurrency(credits)}`);
      return;
    }

    setSubmittingManual(true);
    try {
      await api.post('/keuangan/journal-entries/manual', {
        academic_year_id: Number(manualForm.academic_year_id || selectedAcademicYearId || 2),
        journal_date: manualForm.journal_date,
        description: manualForm.description,
        source_type: manualForm.source_type || 'adjustment',
        lines: manualForm.lines.map(l => ({
          chart_of_account_id: Number(l.chart_of_account_id),
          entry_side: l.entry_side,
          amount: parseFloat(l.amount)
        }))
      });
      alert('Jurnal koreksi/penyesuaian manual berhasil dibukukan!');
      setManualModalOpen(false);
      setManualForm({
        journal_date: new Date().toISOString().slice(0, 10),
        description: '',
        source_type: 'adjustment',
        lines: [
          { chart_of_account_id: coaList[0]?.id || 1, entry_side: 'debit', amount: '' },
          { chart_of_account_id: coaList[1]?.id || 2, entry_side: 'credit', amount: '' }
        ]
      });
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menyimpan jurnal manual');
    } finally {
      setSubmittingManual(false);
    }
  };

  // ----------------------------------------------------
  // HANDLERS: TABUNGAN
  // ----------------------------------------------------
  const handleOpenSavingModal = (saving, type) => {
    setSelectedSaving(saving);
    setSavingTxType(type);
    setSavingAmount('');
    setSavingModalOpen(true);
  };

  const handleSavingTransaction = async (e) => {
    e.preventDefault();
    const amt = parseFloat(savingAmount);
    if (!amt || amt <= 0) {
      alert('Nominal harus lebih besar dari 0');
      return;
    }

    try {
      const endpoint = `/keuangan/savings-accounts/${selectedSaving.id}/${savingTxType}`;
      await api.post(endpoint, { amount: amt });
      alert(`Transaksi ${savingTxType === 'deposit' ? 'Setoran' : 'Penarikan'} berhasil dibukukan!`);
      setSavingModalOpen(false);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal memproses transaksi tabungan');
    }
  };

  // ----------------------------------------------------
  // HANDLERS: TUTUP BUKU
  // ----------------------------------------------------
  const handleCloseFiscalYear = async () => {
    if (!selectedAcademicYearId) {
      alert('Pilih tahun ajaran terlebih dahulu');
      return;
    }
    if (!window.confirm('PERINGATAN: Tutup buku akan mengunci seluruh jurnal pada periode ini dan memindahkan saldo laba/surplus bersih ke Ekuitas/Aset Neto. Lanjutkan?')) {
      return;
    }

    try {
      await api.post('/keuangan/fiscal-year-closings', {
        academic_year_id: Number(selectedAcademicYearId)
      });
      alert('Tutup buku tahunan berhasil dieksekusi!');
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal melakukan tutup buku');
    }
  };

  // ----------------------------------------------------
  // HANDLERS: BUKU KAS TERPADU / HARIAN
  // ----------------------------------------------------
  const toggleMonthCollapse = (mKey) => {
    setCollapsedMonths(prev => ({
      ...prev,
      [mKey]: !prev[mKey]
    }));
  };

  // Dynamic Multiselect Filter Options derived from loaded data
  const availableFilterOptions = useMemo(() => {
    const rows = cashLedgerData?.rows || [];
    
    const categoryMap = new Map();
    const cashAccountMap = new Map();
    const rapbsSet = new Set();
    const fundSourceSet = new Set();

    rows.forEach(r => {
      if (r.category_code && r.category_label) {
        categoryMap.set(r.category_code, r.category_label);
      }
      if (r.cash_label && r.cash_label !== '-') {
        cashAccountMap.set(r.cash_label, r.cash_label);
      }
      if (r.budget_pos_name && r.budget_pos_name !== '-' && r.budget_pos_name.trim() !== '') {
        rapbsSet.add(r.budget_pos_name.trim());
      }
      if (r.fund_source_name && r.fund_source_name !== '-' && r.fund_source_name.trim() !== '') {
        const raw = r.fund_source_name.trim();
        const rawLower = raw.toLowerCase();
        if (
          rawLower.includes('kas penampung') ||
          rawLower.includes('opening pool') ||
          rawLower.includes('saldo awal kas') ||
          rawLower.includes('saldo sebelumnya') ||
          rawLower === 'opening_pool'
        ) {
          fundSourceSet.add('Saldo Awal Kas (Opening Pool)');
        } else {
          fundSourceSet.add(raw);
        }
      }
    });

    return {
      categories: Array.from(categoryMap.entries()).map(([code, label]) => ({ value: code, label })),
      cashAccounts: Array.from(cashAccountMap.keys()).sort().map(name => ({ value: name, label: name })),
      budgetPosList: Array.from(rapbsSet).sort().map(pos => ({ value: pos, label: pos })),
      fundSourceList: Array.from(fundSourceSet).sort().map(fs => ({ value: fs, label: fs }))
    };
  }, [cashLedgerData?.rows]);

  // Real-Time Multi-Filter & Search Processor (Recalculates Totals & Running Balances)
  const processedCashLedger = useMemo(() => {
    const rawRows = cashLedgerData?.rows || [];
    
    const filtered = rawRows.filter(r => {
      // 1. Instant text search across all columns
      if (cashLedgerSearch && cashLedgerSearch.trim()) {
        const q = cashLedgerSearch.toLowerCase().trim();
        const match = (r.description || '').toLowerCase().includes(q) ||
                      (r.bank_reference || '').toLowerCase().includes(q) ||
                      (r.budget_pos_name || '').toLowerCase().includes(q) ||
                      (r.fund_source_name || '').toLowerCase().includes(q) ||
                      (r.cash_label || '').toLowerCase().includes(q) ||
                      (r.category_label || '').toLowerCase().includes(q) ||
                      (r.transaction_date || '').toLowerCase().includes(q);
        if (!match) return false;
      }

      // 2. Multiselect Categories
      if (selectedCategories.length > 0) {
        if (!selectedCategories.includes(r.category_code)) return false;
      }

      // 3. Multiselect Cash Accounts
      if (selectedCashAccounts.length > 0) {
        if (!selectedCashAccounts.includes(r.cash_label)) return false;
      }

      // 4. Multiselect Pos RAPBS
      if (selectedBudgetPos.length > 0) {
        if (!selectedBudgetPos.includes(r.budget_pos_name)) return false;
      }

      // 5. Multiselect Pos Sumber Dana
      if (selectedFundSources.length > 0) {
        let rFs = (r.fund_source_name || '').trim();
        const rFsLower = rFs.toLowerCase();
        if (
          rFsLower.includes('kas penampung') ||
          rFsLower.includes('opening pool') ||
          rFsLower.includes('saldo awal kas') ||
          rFsLower.includes('saldo sebelumnya') ||
          rFsLower === 'opening_pool'
        ) {
          rFs = 'Saldo Awal Kas (Opening Pool)';
        }
        if (!selectedFundSources.includes(rFs)) return false;
      }

      // 6. Sifat Kas (Kas Riil vs Non-Kas)
      if (selectedCashAffects === 'cash' && r.affects_cash === false) return false;
      if (selectedCashAffects === 'non_cash' && r.affects_cash !== false) return false;

      return true;
    });

    // Re-compute running balances for current filtered view
    let running = 0;
    const computedRows = filtered.map(r => {
      const affects = r.affects_cash !== false;
      if (affects) {
        running = running + (r.income_amount || 0) - (r.expense_amount || 0);
      }
      return {
        ...r,
        running_balance: affects ? running : null
      };
    });

    // Group by Month and Day
    const grouped = {};
    let totalIncome = 0;
    let totalExpense = 0;
    let totalTransfer = 0;
    let totalHistorical = 0;

    computedRows.forEach(row => {
      if (row.affects_cash !== false) {
        totalIncome += row.income_amount || 0;
        totalExpense += row.expense_amount || 0;
        totalTransfer += row.transfer_amount || 0;
      } else {
        totalHistorical += row.income_amount || 0;
      }

      const mKey = row.month_year_label || 'PERIODE AKTIF';
      const dKey = row.day_month_year_label || row.transaction_date;

      if (!grouped[mKey]) {
        grouped[mKey] = {
          month_label: mKey,
          total_income: 0,
          total_expense: 0,
          total_historical: 0,
          days: {}
        };
      }

      if (row.affects_cash !== false) {
        grouped[mKey].total_income += row.income_amount || 0;
        grouped[mKey].total_expense += row.expense_amount || 0;
      } else {
        grouped[mKey].total_historical += row.income_amount || 0;
      }

      if (!grouped[mKey].days[dKey]) {
        grouped[mKey].days[dKey] = {
          day_label: dKey,
          raw_date: row.raw_date,
          rows: []
        };
      }
      grouped[mKey].days[dKey].rows.push(row);
    });

    return {
      rows: computedRows,
      grouped,
      summary: {
        total_income: totalIncome,
        total_expense: totalExpense,
        total_transfer: totalTransfer,
        total_historical: totalHistorical,
        net_balance: totalIncome - totalExpense,
        count: computedRows.length,
        total_raw: rawRows.length
      }
    };
  }, [
    cashLedgerData?.rows,
    cashLedgerSearch,
    selectedCategories,
    selectedCashAccounts,
    selectedBudgetPos,
    selectedFundSources,
    selectedCashAffects
  ]);

  const handleExportCashLedgerExcel = () => {
    const rowsToExport = processedCashLedger?.rows || [];
    if (!rowsToExport || rowsToExport.length === 0) {
      alert('Tidak ada data buku kas untuk diekspor.');
      return;
    }

    const excelRows = rowsToExport.map(r => ({
      'Tanggal': r.transaction_date,
      'Jenis Transaksi': r.category_label,
      'Uraian & Keterangan': r.description,
      'Akun Kas / Bank': r.cash_label,
      'No. Bukti / Ref': r.bank_reference !== '-' ? r.bank_reference : '',
      'Pos RAPBS': r.budget_pos_name,
      'Pos Sumber Dana': r.fund_source_name !== '-' ? r.fund_source_name : '',
      'Masuk (Rp)': r.income_amount || 0,
      'Keluar (Rp)': r.expense_amount || 0,
      'Saldo Kas (Rp)': r.affects_cash !== false && r.running_balance !== null ? r.running_balance : '-',
      'Sifat Transaksi': r.affects_cash !== false ? 'Kas Riil' : 'Pencatatan Riwayat (Non-Kas)'
    }));

    const ws = XLSX.utils.json_to_sheet(excelRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Buku Kas Terpadu');
    XLSX.writeFile(wb, `Buku_Kas_Terpadu_${selectedAyObj?.name || 'Semua'}_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const getRapbsBadge = (row) => {
    const isTransfer = row.category_code === 'transfer_out' || 
                       row.category_code === 'transfer_in' || 
                       (row.source_type || '').startsWith('cash_transfer');
    
    if (isTransfer || !row.budget_pos_name || row.budget_pos_name.trim() === '-' || row.budget_pos_name.trim() === '') {
      return <span className="text-slate-300 font-bold text-xs select-none block text-center">—</span>;
    }

    const rawName = row.budget_pos_name;
    const isIncome = row.income_amount > 0 || 
                     rawName.toLowerCase().startsWith('[pemasukan]') || 
                     row.category_code === 'income_bill' || 
                     row.category_code === 'income_other' || 
                     row.category_code === 'opening_balance';

    const nameLower = rawName.toLowerCase();

    let badgeStyle = 'bg-slate-50 text-slate-700 border-slate-200';

    if (isIncome) {
      if (nameLower.includes('spp') || nameLower.includes('syahriah')) {
        badgeStyle = 'bg-emerald-50/90 text-emerald-800 border-emerald-300';
      } else if (nameLower.includes('saldo awal') || nameLower.includes('opening')) {
        badgeStyle = 'bg-teal-50/90 text-teal-800 border-teal-300';
      } else if (nameLower.includes('dsp') || nameLower.includes('gedung') || nameLower.includes('ppdb') || nameLower.includes('pendaftaran')) {
        badgeStyle = 'bg-indigo-50/90 text-indigo-800 border-indigo-300';
      } else if (nameLower.includes('bos') || nameLower.includes('bosp') || nameLower.includes('pemerintah')) {
        badgeStyle = 'bg-cyan-50/90 text-cyan-800 border-cyan-300';
      } else if (nameLower.includes('yayasan') || nameLower.includes('subsidi')) {
        badgeStyle = 'bg-purple-50/90 text-purple-800 border-purple-300';
      } else if (nameLower.includes('infaq') || nameLower.includes('sedekah') || nameLower.includes('donasi') || nameLower.includes('zakat')) {
        badgeStyle = 'bg-amber-50/90 text-amber-900 border-amber-300';
      } else if (nameLower.includes('kantin') || nameLower.includes('catering') || nameLower.includes('konsumsi')) {
        badgeStyle = 'bg-lime-50/90 text-lime-900 border-lime-300';
      } else if (nameLower.includes('kurban') || nameLower.includes('thr') || nameLower.includes('tabungan')) {
        badgeStyle = 'bg-orange-50/90 text-orange-900 border-orange-300';
      } else {
        badgeStyle = 'bg-emerald-50/90 text-emerald-800 border-emerald-300';
      }
    } else {
      // Pengeluaran / Expense Pos
      if (nameLower.includes('gaji') || nameLower.includes('honor') || nameLower.includes('payroll') || nameLower.includes('tunjangan') || nameLower.includes('sdm')) {
        badgeStyle = 'bg-rose-50/90 text-rose-800 border-rose-300';
      } else if (nameLower.includes('sarpras') || nameLower.includes('aset') || nameLower.includes('bangunan') || nameLower.includes('pemeliharaan') || nameLower.includes('gedung') || nameLower.includes('renovasi')) {
        badgeStyle = 'bg-blue-50/90 text-blue-800 border-blue-300';
      } else if (nameLower.includes('listrik') || nameLower.includes('air') || nameLower.includes('internet') || nameLower.includes('telkom') || nameLower.includes('pdam') || nameLower.includes('utilitas')) {
        badgeStyle = 'bg-amber-50/90 text-amber-900 border-amber-300';
      } else if (nameLower.includes('konsumsi') || nameLower.includes('makan') || nameLower.includes('dapur') || nameLower.includes('snack') || nameLower.includes('jamuan')) {
        badgeStyle = 'bg-orange-50/90 text-orange-900 border-orange-300';
      } else if (nameLower.includes('atk') || nameLower.includes('percetakan') || nameLower.includes('perlengkapan') || nameLower.includes('kantor') || nameLower.includes('fotocopy')) {
        badgeStyle = 'bg-violet-50/90 text-violet-800 border-violet-300';
      } else if (nameLower.includes('santri') || nameLower.includes('siswa') || nameLower.includes('kegiatan') || nameLower.includes('lomba') || nameLower.includes('ekstra') || nameLower.includes('ujian') || nameLower.includes('akademik')) {
        badgeStyle = 'bg-sky-50/90 text-sky-800 border-sky-300';
      } else if (nameLower.includes('transport') || nameLower.includes('perjalanan') || nameLower.includes('dinas') || nameLower.includes('bbm') || nameLower.includes('bensin')) {
        badgeStyle = 'bg-cyan-50/90 text-cyan-800 border-cyan-300';
      } else if (nameLower.includes('kesehatan') || nameLower.includes('obat') || nameLower.includes('poskestren') || nameLower.includes('uks')) {
        badgeStyle = 'bg-teal-50/90 text-teal-800 border-teal-300';
      } else {
        badgeStyle = 'bg-rose-50/90 text-rose-800 border-rose-300';
      }
    }

    return (
      <div className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border truncate max-w-full shadow-2xs ${badgeStyle}`} title={rawName}>
        <span className="truncate">{rawName}</span>
      </div>
    );
  };

  const getFundSourceBadge = (row) => {
    const isTransfer = row.category_code === 'transfer_out' || 
                       row.category_code === 'transfer_in' || 
                       (row.source_type || '').startsWith('cash_transfer');
    
    if (isTransfer || !row.fund_source_name || row.fund_source_name.trim() === '-' || row.fund_source_name.trim() === '') {
      return <span className="text-slate-300 font-bold text-xs select-none block text-center">—</span>;
    }

    let name = String(row.fund_source_name)
      .replace(/\s*[:\-]\s*(Januari|Februari|Maret|April|Mei|Juni|Juli|Agustus|September|Oktober|November|Desember)[^,]*/gi, '')
      .replace(/\s*\((Januari|Februari|Maret|April|Mei|Juni|Juli|Agustus|September|Oktober|November|Desember)[^)]*\)/gi, '')
      .trim();

    if (!name || name === '-') {
      return <span className="text-slate-300 font-bold text-xs select-none block text-center">—</span>;
    }

    const nameLower = name.toLowerCase();

    // Normalisasi nama Saldo Awal / Opening Pool agar 100% konsisten dengan Master Data
    if (
      nameLower.includes('kas penampung') ||
      nameLower.includes('opening pool') ||
      nameLower.includes('saldo awal kas') ||
      nameLower.includes('saldo sebelumnya') ||
      nameLower === 'opening_pool'
    ) {
      name = 'Saldo Awal Kas (Opening Pool)';
    }

    let badgeStyle = 'bg-slate-50 text-slate-700 border-slate-200';

    if (nameLower.includes('spp') || nameLower.includes('syahriah')) {
      badgeStyle = 'bg-emerald-50/90 text-emerald-800 border-emerald-300';
    } else if (nameLower.includes('dsp') || nameLower.includes('gedung') || nameLower.includes('ppdb') || nameLower.includes('pendaftaran') || nameLower.includes('sarana')) {
      badgeStyle = 'bg-indigo-50/90 text-indigo-800 border-indigo-300';
    } else if (nameLower.includes('bos') || nameLower.includes('bosp') || nameLower.includes('pemerintah')) {
      badgeStyle = 'bg-cyan-50/90 text-cyan-800 border-cyan-300';
    } else if (nameLower.includes('yayasan') || nameLower.includes('subsidi') || nameLower.includes('hibah')) {
      badgeStyle = 'bg-purple-50/90 text-purple-800 border-purple-300';
    } else if (nameLower.includes('infaq') || nameLower.includes('sedekah') || nameLower.includes('donasi') || nameLower.includes('zakat')) {
      badgeStyle = 'bg-amber-50/90 text-amber-900 border-amber-300';
    } else if (nameLower.includes('saldo awal') || nameLower.includes('opening') || nameLower.includes('penampung') || nameLower.includes('sebelumnya')) {
      badgeStyle = 'bg-teal-50/90 text-teal-800 border-teal-300';
    } else if (nameLower.includes('kantin') || nameLower.includes('catering') || nameLower.includes('konsumsi')) {
      badgeStyle = 'bg-lime-50/90 text-lime-900 border-lime-300';
    } else if (nameLower.includes('kurban')) {
      badgeStyle = 'bg-orange-50/90 text-orange-900 border-orange-300';
    } else if (nameLower.includes('thr') || nameLower.includes('tabungan')) {
      badgeStyle = 'bg-fuchsia-50/90 text-fuchsia-800 border-fuchsia-300';
    } else if (nameLower.includes('sport')) {
      badgeStyle = 'bg-sky-50/90 text-sky-800 border-sky-300';
    } else {
      badgeStyle = 'bg-slate-100 text-slate-800 border-slate-300';
    }

    return (
      <div className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border truncate max-w-full shadow-2xs ${badgeStyle}`} title={name}>
        <span className="truncate">{name}</span>
      </div>
    );
  };

  const availableJournalMonths = useMemo(() => {
    const MONTH_NAMES_ID = ['', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    const monthMap = {};
    journals.forEach(j => {
      const d = j.journal_date ? (typeof j.journal_date === 'string' ? j.journal_date.slice(0, 7) : new Date(j.journal_date).toISOString().slice(0, 7)) : '';
      if (!d || d.length < 7) return;
      if (!monthMap[d]) {
        const [yyyy, mm] = d.split('-');
        const monthNum = parseInt(mm, 10);
        const monthName = MONTH_NAMES_ID[monthNum] || mm;
        monthMap[d] = {
          key: d,
          year: yyyy,
          monthNum,
          label: `${monthName} ${yyyy}`,
          shortLabel: `${monthName.slice(0, 3)} ${yyyy}`,
          count: 0
        };
      }
      monthMap[d].count++;
    });

    const list = Object.values(monthMap);
    list.sort((a, b) => a.key.localeCompare(b.key));
    return list;
  }, [journals]);

  const filteredJournals = useMemo(() => {
    return journals.filter(j => {
      // Month pagination filter
      if (selectedJournalMonth !== 'all') {
        const d = j.journal_date ? (typeof j.journal_date === 'string' ? j.journal_date.slice(0, 7) : new Date(j.journal_date).toISOString().slice(0, 7)) : '';
        if (d !== selectedJournalMonth) return false;
      }

      // Source filter
      if (journalSourceFilter === 'manual' && !j.is_manual_correction && j.source_type !== 'manual') return false;
      if (journalSourceFilter === 'system' && (j.is_manual_correction || j.source_type === 'manual')) return false;

      // Balance filter
      if (journalBalanceFilter === 'balanced' && !j.is_balanced) return false;
      if (journalBalanceFilter === 'unbalanced' && j.is_balanced) return false;

      // Search filter
      if (!journalSearch) return true;
      const q = journalSearch.toLowerCase().trim();
      const num = (j.journal_number || '').toLowerCase();
      const desc = (j.description || '').toLowerCase();
      const src = (j.source_type || '').toLowerCase();
      const dateStr = (j.journal_date || '').toLowerCase();
      const matchInLines = (j.lines || []).some(l => 
        (l.account_code || '').toLowerCase().includes(q) ||
        (l.account_name || '').toLowerCase().includes(q) ||
        (l.account_group || '').toLowerCase().includes(q)
      );
      return num.includes(q) || desc.includes(q) || src.includes(q) || dateStr.includes(q) || matchInLines;
    });
  }, [journals, selectedJournalMonth, journalSearch, journalSourceFilter, journalBalanceFilter]);

  const journalSummary = useMemo(() => {
    const totalJournals = filteredJournals.length;
    let totalDebit = 0;
    let totalCredit = 0;
    let manualCount = 0;
    let unbalancedCount = 0;

    filteredJournals.forEach(j => {
      if (j.is_manual_correction || j.source_type === 'manual') manualCount++;
      if (!j.is_balanced) unbalancedCount++;
      (j.lines || []).forEach(l => {
        const amt = parseFloat(l.amount || 0);
        if (l.entry_side === 'debit') totalDebit += amt;
        else if (l.entry_side === 'credit') totalCredit += amt;
      });
    });

    return {
      count: totalJournals,
      total_debit: totalDebit,
      total_credit: totalCredit,
      manual_count: manualCount,
      unbalanced_count: unbalancedCount,
      is_all_balanced: unbalancedCount === 0
    };
  }, [filteredJournals]);

  return (
    <div className="space-y-6">
      {/* Header Halaman & Filter Global */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center space-x-2">
            <span className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <Scale className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-bold text-slate-800 tracking-tight">
              Modul Akuntansi & Siklus Keuangan Nirlaba
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Siklus akuntansi standar ISAK 35 / SAK EP: Jurnal Umum, Buku Besar, Neraca Lajur (Worksheet), Laporan Keuangan Formal & Tutup Buku
          </p>
        </div>

        {/* Global Multi-Tenant & Periode Filter */}
        <div className="flex flex-wrap items-center gap-2.5 text-xs">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100/90 border border-slate-200/80 rounded-xl font-medium text-slate-700 shadow-2xs">
            <Building2 className="w-3.5 h-3.5 text-slate-500" />
            <span className="font-semibold">{activeSchoolUnit?.name || 'Seluruh Satuan'}</span>
          </div>

          {/* Custom Elegant Academic Year Dropdown Picker */}
          <div className="relative" ref={ayDropdownRef}>
            <button
              type="button"
              onClick={() => setAyDropdownOpen(prev => !prev)}
              className="flex items-center gap-2.5 bg-gradient-to-r from-emerald-50/90 via-emerald-50/60 to-emerald-50/40 border border-emerald-300/90 hover:border-emerald-500 rounded-xl px-3 py-1.5 shadow-xs hover:shadow-sm transition-all text-left group cursor-pointer active:scale-98"
            >
              <div className="p-1.5 bg-emerald-600 group-hover:bg-emerald-700 text-white rounded-lg shadow-2xs transition">
                <Calendar className="w-3.5 h-3.5" />
              </div>
              <div className="flex flex-col pr-1">
                <span className="text-[10px] uppercase font-bold text-emerald-800/80 tracking-wider leading-none">
                  Tahun Ajaran
                </span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="font-extrabold text-emerald-950 text-xs tracking-tight">
                    {selectedAyObj?.name || 'Pilih Tahun'}
                  </span>
                  {selectedAyObj?.is_active && (
                    <span className="px-1.5 py-0.5 text-[9px] font-bold bg-emerald-200/90 text-emerald-900 rounded-md">
                      Aktif
                    </span>
                  )}
                </div>
              </div>
              <ChevronDown className={`w-3.5 h-3.5 text-emerald-700 transition-transform duration-200 ml-0.5 ${ayDropdownOpen ? 'rotate-180 text-emerald-900' : ''}`} />
            </button>

            {/* Floating Dropdown Menu */}
            {ayDropdownOpen && (
              <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-xl shadow-xl border border-slate-200/90 z-50 p-2 space-y-1 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-2.5 py-1.5 border-b border-slate-100 flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Konteks Tahun Ajaran</span>
                  <span className="text-[10px] text-slate-400 font-semibold">{academicYears.length} Pilihan</span>
                </div>

                <div className="max-h-64 overflow-y-auto space-y-1 p-0.5 custom-scrollbar">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedAcademicYearId('all');
                      setAyDropdownOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition ${
                      selectedAcademicYearId === 'all'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Layers className={`w-4 h-4 ${selectedAcademicYearId === 'all' ? 'text-white' : 'text-slate-400'}`} />
                      <span>Semua Tahun Ajaran (Multi-Periode)</span>
                    </div>
                    {selectedAcademicYearId === 'all' && <Check className="w-4 h-4 shrink-0" />}
                  </button>

                  <div className="h-px bg-slate-100 my-1" />

                  {academicYears.map((ay) => {
                    const isSelected = String(ay.id) === String(selectedAcademicYearId);
                    return (
                      <button
                        key={ay.id}
                        type="button"
                        onClick={() => {
                          setSelectedAcademicYearId(String(ay.id));
                          setAyDropdownOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition ${
                          isSelected
                            ? 'bg-emerald-600 text-white font-bold shadow-xs'
                            : 'text-slate-700 hover:bg-emerald-50/70 font-medium'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <Calendar className={`w-4 h-4 shrink-0 ${isSelected ? 'text-white' : 'text-emerald-600'}`} />
                          <div className="text-left">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold">{ay.name}</span>
                              {ay.is_active ? (
                                <span className={`px-1.5 py-0.2 text-[9px] font-bold rounded-md ${
                                  isSelected ? 'bg-emerald-700 text-white' : 'bg-emerald-100 text-emerald-800'
                                }`}>
                                  Aktif
                                </span>
                              ) : null}
                            </div>
                            {ay.start_date && ay.end_date && (
                              <p className={`text-[10px] mt-0.5 ${isSelected ? 'text-emerald-100' : 'text-slate-400'}`}>
                                {new Date(ay.start_date).toLocaleDateString('id-ID', { month: 'short', year: 'numeric' })} - {new Date(ay.end_date).toLocaleDateString('id-ID', { month: 'short', year: 'numeric' })}
                              </p>
                            )}
                          </div>
                        </div>
                        {isSelected && <Check className="w-4 h-4 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/90 font-semibold rounded-xl transition shadow-2xs active:scale-95 disabled:opacity-50"
            title="Muat ulang seluruh data siklus akuntansi"
          >
            <RotateCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-emerald-600' : 'text-slate-500'}`} />
            <span>Muat Ulang</span>
          </button>
        </div>
      </div>

      {/* TOP TABS: SIKLUS AKUNTANSI STANDAR & BUKU KAS */}
      <div className="flex border-b border-slate-200 gap-6 overflow-x-auto">
        <button
          type="button"
          onClick={() => setMainTab('cash_ledger')}
          className={`pb-3 text-xs font-bold flex items-center gap-2 border-b-2 transition shrink-0 ${
            mainTab === 'cash_ledger'
              ? 'border-amber-600 text-amber-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4 text-amber-600" />
          <span>Buku Kas Terpadu / Kas Harian</span>
        </button>

        <button
          type="button"
          onClick={() => setMainTab('journals')}
          className={`pb-3 text-xs font-bold flex items-center gap-2 border-b-2 transition shrink-0 ${
            mainTab === 'journals'
              ? 'border-emerald-600 text-emerald-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>1. Jurnal Umum & Penyesuaian</span>
        </button>

        <button
          type="button"
          onClick={() => setMainTab('ledger')}
          className={`pb-3 text-xs font-bold flex items-center gap-2 border-b-2 transition shrink-0 ${
            mainTab === 'ledger'
              ? 'border-emerald-600 text-emerald-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Landmark className="w-4 h-4" />
          <span>2. Buku Besar (General Ledger)</span>
        </button>

        <button
          type="button"
          onClick={() => setMainTab('worksheet')}
          className={`pb-3 text-xs font-bold flex items-center gap-2 border-b-2 transition shrink-0 ${
            mainTab === 'worksheet'
              ? 'border-emerald-600 text-emerald-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Scale className="w-4 h-4" />
          <span>3. Lembar Kerja (Worksheet)</span>
        </button>

        <button
          type="button"
          onClick={() => setMainTab('statements')}
          className={`pb-3 text-xs font-bold flex items-center gap-2 border-b-2 transition shrink-0 ${
            mainTab === 'statements'
              ? 'border-emerald-600 text-emerald-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>4. Laporan Akuntansi Lengkap</span>
        </button>

        <button
          type="button"
          onClick={() => setMainTab('savings-closings')}
          className={`pb-3 text-xs font-bold flex items-center gap-2 border-b-2 transition shrink-0 ${
            mainTab === 'savings-closings'
              ? 'border-emerald-600 text-emerald-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <PiggyBank className="w-4 h-4" />
          <span>5. Tabungan & Tutup Buku</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 0: BUKU KAS TERPADU / KAS HARIAN (DENSE SPREADSHEET LEDGER)           */}
      {/* ========================================================================= */}
      {mainTab === 'cash_ledger' && (
        <div className="space-y-4">
          {/* Top Filter & Action Bar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              {/* Search Box & Quick Info */}
              <div className="flex items-center gap-2 flex-1 min-w-[280px] max-w-md">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Cari transaksi, santri, ref bank, pos RAPBS, kas..."
                    value={cashLedgerSearch}
                    onChange={(e) => setCashLedgerSearch(e.target.value)}
                    className="w-full pl-8 pr-7 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 focus:bg-white focus:outline-hidden transition"
                  />
                  {cashLedgerSearch && (
                    <button
                      type="button"
                      onClick={() => setCashLedgerSearch('')}
                      className="absolute right-2 top-2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full hover:bg-slate-200/80"
                      title="Hapus pencarian"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                <div className="text-[11px] font-semibold text-slate-500 whitespace-nowrap px-2 py-1 bg-slate-100/80 rounded-lg border border-slate-200/60 shadow-2xs">
                  <span className="text-amber-700 font-bold font-mono">{processedCashLedger.summary.count}</span> / {processedCashLedger.summary.total_raw} baris
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleResetColWidths}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200/80 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 shadow-2xs transition"
                  title="Kembalikan lebar kolom ke ukuran default"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                  <span>Pulihkan Kolom</span>
                </button>

                <button
                  type="button"
                  onClick={handleExportCashLedgerExcel}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer"
                  title="Ekspor data hasil filter ke format Spreadsheet Excel (.xlsx)"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Export Excel</span>
                </button>
              </div>
            </div>

            {/* Multiselect Filter Controls Bar */}
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-xs">
              <div className="flex items-center gap-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">
                <Filter className="w-3 h-3 text-slate-500" />
                <span>Filter:</span>
              </div>

              {/* 1. Multiselect Kategori / Jenis Transaksi */}
              <MultiSelectFilterPopover
                label="Jenis Transaksi"
                icon={Tag}
                options={availableFilterOptions.categories}
                selected={selectedCategories}
                onChange={setSelectedCategories}
                placeholder="Cari jenis transaksi..."
              />

              {/* 2. Multiselect Akun Kas / Bank */}
              <MultiSelectFilterPopover
                label="Akun Kas / Bank"
                icon={Wallet}
                options={availableFilterOptions.cashAccounts}
                selected={selectedCashAccounts}
                onChange={setSelectedCashAccounts}
                placeholder="Cari akun kas / bank..."
              />

              {/* 3. Multiselect Pos RAPBS */}
              <MultiSelectFilterPopover
                label="Pos RAPBS"
                icon={PieChart}
                options={availableFilterOptions.budgetPosList}
                selected={selectedBudgetPos}
                onChange={setSelectedBudgetPos}
                placeholder="Cari pos RAPBS..."
              />

              {/* 4. Multiselect Pos Sumber Dana */}
              <MultiSelectFilterPopover
                label="Pos Sumber Dana"
                icon={Coins}
                options={availableFilterOptions.fundSourceList}
                selected={selectedFundSources}
                onChange={setSelectedFundSources}
                placeholder="Cari sumber dana..."
              />

              {/* 5. Sifat Kas (Kas Riil vs Non-Kas) */}
              <div className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 border border-slate-200 rounded-xl shadow-2xs">
                <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" />
                <select
                  value={selectedCashAffects}
                  onChange={(e) => setSelectedCashAffects(e.target.value)}
                  className="bg-transparent text-slate-700 font-semibold focus:outline-hidden cursor-pointer text-xs"
                >
                  <option value="all">Semua Sifat Kas</option>
                  <option value="cash">Hanya Kas Riil</option>
                  <option value="non_cash">Hanya Riwayat Non-Kas</option>
                </select>
              </div>

              {/* 6. Date Range Filters */}
              <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 border border-slate-200 rounded-xl shadow-2xs">
                <span className="text-[10px] uppercase font-bold text-slate-400">Dari:</span>
                <input
                  type="date"
                  value={cashLedgerDateFrom}
                  onChange={(e) => setCashLedgerDateFrom(e.target.value)}
                  className="bg-transparent text-slate-700 font-medium text-xs focus:outline-hidden"
                />
              </div>

              <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 border border-slate-200 rounded-xl shadow-2xs">
                <span className="text-[10px] uppercase font-bold text-slate-400">S.d:</span>
                <input
                  type="date"
                  value={cashLedgerDateTo}
                  onChange={(e) => setCashLedgerDateTo(e.target.value)}
                  className="bg-transparent text-slate-700 font-medium text-xs focus:outline-hidden"
                />
              </div>

              {/* Reset All Filters Button */}
              {(cashLedgerSearch ||
                selectedCategories.length > 0 ||
                selectedCashAccounts.length > 0 ||
                selectedBudgetPos.length > 0 ||
                selectedFundSources.length > 0 ||
                selectedCashAffects !== 'all' ||
                cashLedgerDateFrom ||
                cashLedgerDateTo ||
                selectedCashAccountId !== 'all') && (
                <button
                  type="button"
                  onClick={() => {
                    setCashLedgerSearch('');
                    setSelectedCategories([]);
                    setSelectedCashAccounts([]);
                    setSelectedBudgetPos([]);
                    setSelectedFundSources([]);
                    setSelectedCashAffects('all');
                    setSelectedCashAccountId('all');
                    setCashLedgerDateFrom('');
                    setCashLedgerDateTo('');
                  }}
                  className="text-xs text-rose-600 hover:text-rose-700 font-bold px-2.5 py-1.5 hover:bg-rose-50 border border-rose-200 rounded-xl transition shadow-2xs ml-auto"
                >
                  Reset Semua Filter
                </button>
              )}
            </div>

            {/* Active Filter Chips / Pills */}
            {(selectedCategories.length > 0 ||
              selectedCashAccounts.length > 0 ||
              selectedBudgetPos.length > 0 ||
              selectedFundSources.length > 0 ||
              selectedCashAffects !== 'all') && (
              <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[11px]">
                <span className="text-slate-400 font-medium">Filter Aktif:</span>

                {selectedCategories.map(cat => (
                  <span key={cat} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-900 border border-amber-200 font-medium">
                    <span>Jenis: {availableFilterOptions.categories.find(c => c.value === cat)?.label || cat}</span>
                    <button type="button" onClick={() => setSelectedCategories(prev => prev.filter(c => c !== cat))} className="hover:text-rose-600">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}

                {selectedCashAccounts.map(ca => (
                  <span key={ca} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-teal-50 text-teal-900 border border-teal-200 font-medium">
                    <span>Kas: {ca}</span>
                    <button type="button" onClick={() => setSelectedCashAccounts(prev => prev.filter(c => c !== ca))} className="hover:text-rose-600">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}

                {selectedBudgetPos.map(pos => (
                  <span key={pos} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-900 border border-indigo-200 font-medium">
                    <span>RAPBS: {pos}</span>
                    <button type="button" onClick={() => setSelectedBudgetPos(prev => prev.filter(p => p !== pos))} className="hover:text-rose-600">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}

                {selectedFundSources.map(fs => (
                  <span key={fs} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-50 text-purple-900 border border-purple-200 font-medium">
                    <span>Sumber: {fs}</span>
                    <button type="button" onClick={() => setSelectedFundSources(prev => prev.filter(f => f !== fs))} className="hover:text-rose-600">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}

                {selectedCashAffects !== 'all' && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 border border-slate-300 font-medium">
                    <span>Sifat: {selectedCashAffects === 'cash' ? 'Hanya Kas Riil' : 'Hanya Non-Kas'}</span>
                    <button type="button" onClick={() => setSelectedCashAffects('all')} className="hover:text-rose-600">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Stat Summary Ribbon */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-2xs">
              <div className="text-[10px] uppercase font-bold text-slate-400 flex items-center justify-between">
                <span>Total Masuk</span>
                <ArrowDownCircle className="w-3.5 h-3.5 text-emerald-600" />
              </div>
              <div className="text-sm font-extrabold text-emerald-700 font-mono mt-1">
                {formatCurrency(processedCashLedger.summary.total_income)}
              </div>
            </div>

            <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-2xs">
              <div className="text-[10px] uppercase font-bold text-slate-400 flex items-center justify-between">
                <span>Total Keluar</span>
                <ArrowUpCircle className="w-3.5 h-3.5 text-rose-600" />
              </div>
              <div className="text-sm font-extrabold text-rose-700 font-mono mt-1">
                {formatCurrency(processedCashLedger.summary.total_expense)}
              </div>
            </div>

            <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-2xs">
              <div className="text-[10px] uppercase font-bold text-slate-400 flex items-center justify-between">
                <span>Mutasi Transfer</span>
                <RotateCw className="w-3.5 h-3.5 text-sky-600" />
              </div>
              <div className="text-sm font-extrabold text-sky-800 font-mono mt-1">
                {formatCurrency(processedCashLedger.summary.total_transfer)}
              </div>
            </div>

            <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-2xs">
              <div className="text-[10px] uppercase font-bold text-slate-400 flex items-center justify-between">
                <span>Saldo Kas Bersih</span>
                <Scale className="w-3.5 h-3.5 text-amber-600" />
              </div>
              <div className={`text-sm font-extrabold font-mono mt-1 ${
                processedCashLedger.summary.net_balance >= 0 ? 'text-slate-800' : 'text-rose-600'
              }`}>
                {formatCurrency(processedCashLedger.summary.net_balance)}
              </div>
            </div>
          </div>

          {/* Historical / Non-Cash Info Notice */}
          {Boolean(processedCashLedger.summary.total_historical > 0) && (
            <div className="flex items-center justify-between px-3.5 py-2 bg-amber-50/90 border border-amber-200/90 rounded-xl text-xs text-amber-900 shadow-2xs">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-amber-700 shrink-0" />
                <span>
                  Terdapat total <b>{formatCurrency(processedCashLedger.summary.total_historical)}</b> pencatatan riwayat pembayaran lampau (Non-Kas). Transaksi ini ditandai khusus dan <b>tidak dihitung ke saldo kas fisik</b>.
                </span>
              </div>
            </div>
          )}

          {/* DENSE SPREADSHEET TABLE WITH RESIZABLE HEADERS & RICH ENTERPRISE LOOK */}
          <div className="bg-white rounded-xl border border-slate-300 shadow-sm overflow-hidden">
            {cashLedgerLoading ? (
              <div className="p-14 flex flex-col items-center justify-center text-slate-400 gap-2">
                <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
                <span className="text-xs font-semibold">Memuat buku kas terpadu...</span>
              </div>
            ) : !processedCashLedger?.rows || processedCashLedger.rows.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-xs italic">
                Tidak ada transaksi kas yang sesuai dengan filter yang dipilih.
              </div>
            ) : (
              <div className="overflow-x-auto max-h-[750px] custom-scrollbar">
                <table className="w-full text-left border-collapse text-xs select-text table-fixed">
                  {/* HIGH-CONTRAST VISIBLE ENTERPRISE HEADER WITH RESIZE HANDLES */}
                  <thead className="sticky top-0 z-30 bg-slate-100 border-b-2 border-slate-300 shadow-2xs select-none">
                    <tr>
                      {/* Tanggal */}
                      <th
                        style={{ width: `${cashColWidths.tanggal}px`, minWidth: `${cashColWidths.tanggal}px`, maxWidth: `${cashColWidths.tanggal}px` }}
                        className="relative px-2 py-2 text-center text-slate-800 font-extrabold text-[11px] uppercase tracking-wider border-r border-slate-200 group bg-slate-100"
                      >
                        <div className="flex items-center justify-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-500 shrink-0" />
                          <span className="truncate">Tanggal</span>
                        </div>
                        <div
                          onMouseDown={(e) => handleMouseDownResize('tanggal', e)}
                          className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-amber-500 active:bg-amber-600 z-10 transition-colors opacity-0 group-hover:opacity-100"
                          title="Geser untuk mengubah ukuran kolom"
                        />
                      </th>

                      {/* Jenis Transaksi */}
                      <th
                        style={{ width: `${cashColWidths.jenis}px`, minWidth: `${cashColWidths.jenis}px`, maxWidth: `${cashColWidths.jenis}px` }}
                        className="relative px-2 py-2 text-center text-slate-800 font-extrabold text-[11px] uppercase tracking-wider border-r border-slate-200 group bg-slate-100"
                      >
                        <div className="flex items-center justify-center gap-1">
                          <Tag className="w-3 h-3 text-slate-500 shrink-0" />
                          <span className="truncate">Jenis Transaksi</span>
                        </div>
                        <div
                          onMouseDown={(e) => handleMouseDownResize('jenis', e)}
                          className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-amber-500 active:bg-amber-600 z-10 transition-colors opacity-0 group-hover:opacity-100"
                          title="Geser untuk mengubah ukuran kolom"
                        />
                      </th>

                      {/* Uraian & Keterangan */}
                      <th
                        style={{ width: `${cashColWidths.uraian}px`, minWidth: `${cashColWidths.uraian}px`, maxWidth: `${cashColWidths.uraian}px` }}
                        className="relative px-3 py-2 text-left text-slate-800 font-extrabold text-[11px] uppercase tracking-wider border-r border-slate-200 group bg-slate-100"
                      >
                        <div className="flex items-center gap-1.5">
                          <AlignLeft className="w-3 h-3 text-slate-500 shrink-0" />
                          <span className="truncate">Uraian & Keterangan</span>
                        </div>
                        <div
                          onMouseDown={(e) => handleMouseDownResize('uraian', e)}
                          className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-amber-500 active:bg-amber-600 z-10 transition-colors opacity-0 group-hover:opacity-100"
                          title="Geser untuk mengubah ukuran kolom"
                        />
                      </th>

                      {/* Akun Kas / Bank */}
                      <th
                        style={{ width: `${cashColWidths.kas}px`, minWidth: `${cashColWidths.kas}px`, maxWidth: `${cashColWidths.kas}px` }}
                        className="relative px-2.5 py-2 text-left text-slate-800 font-extrabold text-[11px] uppercase tracking-wider border-r border-slate-200 group bg-slate-100"
                      >
                        <div className="flex items-center gap-1.5">
                          <Wallet className="w-3 h-3 text-slate-500 shrink-0" />
                          <span className="truncate">Akun Kas / Bank</span>
                        </div>
                        <div
                          onMouseDown={(e) => handleMouseDownResize('kas', e)}
                          className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-amber-500 active:bg-amber-600 z-10 transition-colors opacity-0 group-hover:opacity-100"
                          title="Geser untuk mengubah ukuran kolom"
                        />
                      </th>

                      {/* No. Bukti / Ref */}
                      <th
                        style={{ width: `${cashColWidths.ref}px`, minWidth: `${cashColWidths.ref}px`, maxWidth: `${cashColWidths.ref}px` }}
                        className="relative px-2.5 py-2 text-left text-slate-800 font-extrabold text-[11px] uppercase tracking-wider border-r border-slate-200 group bg-slate-100"
                      >
                        <div className="flex items-center gap-1.5">
                          <FileText className="w-3 h-3 text-slate-500 shrink-0" />
                          <span className="truncate">No. Bukti / Ref</span>
                        </div>
                        <div
                          onMouseDown={(e) => handleMouseDownResize('ref', e)}
                          className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-amber-500 active:bg-amber-600 z-10 transition-colors opacity-0 group-hover:opacity-100"
                          title="Geser untuk mengubah ukuran kolom"
                        />
                      </th>

                      {/* Pos RAPBS */}
                      <th
                        style={{ width: `${cashColWidths.pos_rapbs}px`, minWidth: `${cashColWidths.pos_rapbs}px`, maxWidth: `${cashColWidths.pos_rapbs}px` }}
                        className="relative px-2.5 py-2 text-left text-slate-800 font-extrabold text-[11px] uppercase tracking-wider border-r border-slate-200 group bg-slate-100"
                      >
                        <div className="flex items-center gap-1.5">
                          <PieChart className="w-3 h-3 text-slate-500 shrink-0" />
                          <span className="truncate">Pos RAPBS</span>
                        </div>
                        <div
                          onMouseDown={(e) => handleMouseDownResize('pos_rapbs', e)}
                          className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-amber-500 active:bg-amber-600 z-10 transition-colors opacity-0 group-hover:opacity-100"
                          title="Geser untuk mengubah ukuran kolom"
                        />
                      </th>

                      {/* Pos Sumber Dana */}
                      <th
                        style={{ width: `${cashColWidths.pos_sumber_dana}px`, minWidth: `${cashColWidths.pos_sumber_dana}px`, maxWidth: `${cashColWidths.pos_sumber_dana}px` }}
                        className="relative px-2.5 py-2 text-left text-slate-800 font-extrabold text-[11px] uppercase tracking-wider border-r border-slate-200 group bg-slate-100"
                      >
                        <div className="flex items-center gap-1.5">
                          <Coins className="w-3 h-3 text-slate-500 shrink-0" />
                          <span className="truncate">Pos Sumber Dana</span>
                        </div>
                        <div
                          onMouseDown={(e) => handleMouseDownResize('pos_sumber_dana', e)}
                          className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-amber-500 active:bg-amber-600 z-10 transition-colors opacity-0 group-hover:opacity-100"
                          title="Geser untuk mengubah ukuran kolom"
                        />
                      </th>

                      {/* Masuk (Rp) */}
                      <th
                        style={{ width: `${cashColWidths.masuk}px`, minWidth: `${cashColWidths.masuk}px`, maxWidth: `${cashColWidths.masuk}px` }}
                        className="relative px-2.5 py-2 text-right text-emerald-800 font-extrabold text-[11px] uppercase tracking-wider border-r border-slate-200 group bg-slate-100"
                      >
                        <div className="flex items-center justify-end gap-1">
                          <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span className="truncate">Masuk (Rp)</span>
                        </div>
                        <div
                          onMouseDown={(e) => handleMouseDownResize('masuk', e)}
                          className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-amber-500 active:bg-amber-600 z-10 transition-colors opacity-0 group-hover:opacity-100"
                          title="Geser untuk mengubah ukuran kolom"
                        />
                      </th>

                      {/* Keluar (Rp) */}
                      <th
                        style={{ width: `${cashColWidths.keluar}px`, minWidth: `${cashColWidths.keluar}px`, maxWidth: `${cashColWidths.keluar}px` }}
                        className="relative px-2.5 py-2 text-right text-rose-800 font-extrabold text-[11px] uppercase tracking-wider border-r border-slate-200 group bg-slate-100"
                      >
                        <div className="flex items-center justify-end gap-1">
                          <ArrowUpRight className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                          <span className="truncate">Keluar (Rp)</span>
                        </div>
                        <div
                          onMouseDown={(e) => handleMouseDownResize('keluar', e)}
                          className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-amber-500 active:bg-amber-600 z-10 transition-colors opacity-0 group-hover:opacity-100"
                          title="Geser untuk mengubah ukuran kolom"
                        />
                      </th>

                      {/* Saldo Kas (Rp) */}
                      <th
                        style={{ width: `${cashColWidths.saldo}px`, minWidth: `${cashColWidths.saldo}px`, maxWidth: `${cashColWidths.saldo}px` }}
                        className="relative px-2.5 py-2 text-right text-slate-900 font-extrabold text-[11px] uppercase tracking-wider group bg-slate-100"
                      >
                        <div className="flex items-center justify-end gap-1">
                          <Scale className="w-3 h-3 text-slate-700 shrink-0" />
                          <span className="truncate">Saldo Kas (Rp)</span>
                        </div>
                        <div
                          onMouseDown={(e) => handleMouseDownResize('saldo', e)}
                          className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-amber-500 active:bg-amber-600 z-10 transition-colors opacity-0 group-hover:opacity-100"
                          title="Geser untuk mengubah ukuran kolom"
                        />
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-200 bg-white">
                    {Object.entries(processedCashLedger.grouped || {}).map(([monthKey, monthObj]) => {
                      const isCollapsed = Boolean(collapsedMonths[monthKey]);

                      return (
                        <React.Fragment key={monthKey}>
                          {/* MONTH HEADER BANNER */}
                          <tr
                            onClick={() => toggleMonthCollapse(monthKey)}
                            className="bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs cursor-pointer transition select-none"
                          >
                            <td colSpan={10} className="px-3 py-2 border-y border-slate-900">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  {isCollapsed ? (
                                    <ChevronRight className="w-4 h-4 text-white" />
                                  ) : (
                                    <ChevronDown className="w-4 h-4 text-white" />
                                  )}
                                  <span className="tracking-wider">{monthKey}</span>
                                </div>
                                <div className="flex items-center gap-4 text-[11px] font-semibold pr-2">
                                  <span>Total Masuk: <b className="font-mono text-emerald-300">{formatCurrency(monthObj.total_income)}</b></span>
                                  <span>Total Keluar: <b className="font-mono text-rose-300">{formatCurrency(monthObj.total_expense)}</b></span>
                                </div>
                              </div>
                            </td>
                          </tr>

                          {/* DAYS AND TRANSACTIONS */}
                          {!isCollapsed &&
                            Object.entries(monthObj.days || {}).map(([dayKey, dayObj]) => (
                              <React.Fragment key={dayKey}>
                                {/* DAY HEADER BANNER (LIGHT GREEN) */}
                                <tr className="bg-[#ecfdf5] text-emerald-950 font-extrabold text-[11px] select-none">
                                  <td colSpan={10} className="px-3 py-1 border-y border-emerald-300">
                                    <div className="flex items-center gap-2">
                                      <div className="w-2 h-2 rounded-full bg-emerald-600" />
                                      <span>{dayKey}</span>
                                    </div>
                                  </td>
                                </tr>

                                {/* TRANSACTION ROWS (COMPACT & DENSE) */}
                                {(dayObj.rows || []).map((row) => (
                                  <tr
                                    key={row.id}
                                    className={`h-8 hover:bg-amber-50/50 transition-colors border-b border-slate-200 text-[11px] ${
                                      row.affects_cash === false ? 'bg-slate-50/70' : ''
                                    }`}
                                  >
                                    {/* Tanggal */}
                                    <td
                                      style={{ width: `${cashColWidths.tanggal}px`, minWidth: `${cashColWidths.tanggal}px`, maxWidth: `${cashColWidths.tanggal}px` }}
                                      className="px-2 py-1 text-center font-medium text-slate-700 border-r border-slate-200 truncate"
                                    >
                                      {row.transaction_date}
                                    </td>

                                    {/* Jenis / Kategori */}
                                    <td
                                      style={{ width: `${cashColWidths.jenis}px`, minWidth: `${cashColWidths.jenis}px`, maxWidth: `${cashColWidths.jenis}px` }}
                                      className="px-2 py-1 text-center border-r border-slate-200 truncate"
                                    >
                                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border truncate max-w-full ${
                                        row.category_code === 'history_non_cash'
                                          ? 'bg-amber-50 text-amber-900 border-amber-300'
                                          : row.category_code === 'income_bill'
                                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                          : row.category_code === 'income_other'
                                          ? 'bg-cyan-50 text-cyan-800 border-cyan-200'
                                          : row.category_code === 'expense'
                                          ? 'bg-rose-50 text-rose-800 border-rose-200'
                                          : row.category_code === 'transfer_out'
                                          ? 'bg-amber-50 text-amber-800 border-amber-200'
                                          : row.category_code === 'transfer_in'
                                          ? 'bg-sky-50 text-sky-800 border-sky-200'
                                          : 'bg-indigo-50 text-indigo-800 border-indigo-200'
                                      }`}>
                                        {row.category_label || row.source_type}
                                      </span>
                                    </td>

                                    {/* Uraian */}
                                    <td
                                      style={{ width: `${cashColWidths.uraian}px`, minWidth: `${cashColWidths.uraian}px`, maxWidth: `${cashColWidths.uraian}px` }}
                                      className={`px-3 py-1 border-r border-slate-200 text-slate-800 truncate ${
                                        row.affects_cash === false
                                          ? 'text-slate-600 font-medium'
                                          : row.row_highlight === 'cyan'
                                          ? 'bg-[#cffafe]/30 font-semibold text-cyan-950'
                                          : 'font-normal'
                                      }`}
                                      title={row.description}
                                    >
                                      <span className="truncate block">{row.description}</span>
                                    </td>

                                    {/* Kas Badge */}
                                    <td
                                      style={{ width: `${cashColWidths.kas}px`, minWidth: `${cashColWidths.kas}px`, maxWidth: `${cashColWidths.kas}px` }}
                                      className="px-2 py-1 border-r border-slate-200 truncate"
                                    >
                                      <div className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border truncate max-w-full shadow-2xs ${row.cash_badge_class}`} title={row.cash_label}>
                                        <span className="truncate">{row.cash_label}</span>
                                      </div>
                                    </td>

                                    {/* Ref Bank / No Bukti */}
                                    <td
                                      style={{ width: `${cashColWidths.ref}px`, minWidth: `${cashColWidths.ref}px`, maxWidth: `${cashColWidths.ref}px` }}
                                      className="px-2.5 py-1 border-r border-slate-200 font-mono text-[10px] text-slate-700 truncate"
                                      title={row.bank_reference}
                                    >
                                      {row.bank_reference !== '-' ? row.bank_reference : ''}
                                    </td>

                                    {/* Pos RAPBS */}
                                    <td
                                      style={{ width: `${cashColWidths.pos_rapbs}px`, minWidth: `${cashColWidths.pos_rapbs}px`, maxWidth: `${cashColWidths.pos_rapbs}px` }}
                                      className="px-2 py-1 border-r border-slate-200 text-[10px] truncate"
                                    >
                                      {getRapbsBadge(row)}
                                    </td>

                                    {/* Pos Sumber Dana */}
                                    <td
                                      style={{ width: `${cashColWidths.pos_sumber_dana}px`, minWidth: `${cashColWidths.pos_sumber_dana}px`, maxWidth: `${cashColWidths.pos_sumber_dana}px` }}
                                      className="px-2 py-1 border-r border-slate-200 text-[10px] truncate"
                                    >
                                      {getFundSourceBadge(row)}
                                    </td>

                                    {/* Masuk */}
                                    <td
                                      style={{ width: `${cashColWidths.masuk}px`, minWidth: `${cashColWidths.masuk}px`, maxWidth: `${cashColWidths.masuk}px` }}
                                      className="px-2.5 py-1 text-right font-mono font-bold border-r border-slate-200 tabular-nums truncate"
                                    >
                                      {row.income_amount > 0 ? (
                                        row.affects_cash === false ? (
                                          <div className="flex items-center justify-end gap-1" title="Riwayat pembayaran masa lalu (Non-Kas / Tanpa Mutasi Saldo)">
                                            <span className="text-slate-600 font-semibold">{formatNumber(row.income_amount)}</span>
                                            <span className="px-1 py-0.2 text-[8px] font-extrabold bg-amber-100 text-amber-900 rounded border border-amber-300">
                                              Non-Kas
                                            </span>
                                          </div>
                                        ) : (
                                          <span className="text-emerald-700">{formatNumber(row.income_amount)}</span>
                                        )
                                      ) : ''}
                                    </td>

                                    {/* Keluar */}
                                    <td
                                      style={{ width: `${cashColWidths.keluar}px`, minWidth: `${cashColWidths.keluar}px`, maxWidth: `${cashColWidths.keluar}px` }}
                                      className="px-2.5 py-1 text-right font-mono font-bold text-rose-700 border-r border-slate-200 tabular-nums truncate"
                                    >
                                      {row.expense_amount > 0 ? formatNumber(row.expense_amount) : ''}
                                    </td>

                                    {/* Saldo Kas Berjalan */}
                                    <td
                                      style={{ width: `${cashColWidths.saldo}px`, minWidth: `${cashColWidths.saldo}px`, maxWidth: `${cashColWidths.saldo}px` }}
                                      className="px-2.5 py-1 text-right font-mono font-extrabold tabular-nums truncate"
                                    >
                                      {row.affects_cash === false || row.running_balance === null ? (
                                        <span className="text-slate-300 text-center block font-bold text-xs select-none" title="Pencatatan riwayat masa lalu — tidak mempengaruhi saldo kas fisik">
                                          —
                                        </span>
                                      ) : (
                                        <span className="text-slate-900">{formatNumber(row.running_balance)}</span>
                                      )}
                                    </td>
                                  </tr>
                                ))}
                              </React.Fragment>
                            ))}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 1: JURNAL UMUM & PENYESUAIAN                                         */}
      {/* ========================================================================= */}
      {/* ========================================================================= */}
      {mainTab === 'journals' && (
        <div className="space-y-4">
          {/* Top Filter & Action Bar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              {/* Search Box & Quick Info */}
              <div className="flex items-center gap-2 flex-1 min-w-[280px] max-w-md">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Cari nomor jurnal, akun COA, uraian, sumber..."
                    value={journalSearch}
                    onChange={(e) => setJournalSearch(e.target.value)}
                    className="w-full pl-8 pr-7 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:bg-white focus:outline-hidden transition"
                  />
                  {journalSearch && (
                    <button
                      type="button"
                      onClick={() => setJournalSearch('')}
                      className="absolute right-2 top-2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full hover:bg-slate-200/80"
                      title="Hapus pencarian"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                <div className="text-[11px] font-semibold text-slate-500 whitespace-nowrap px-2 py-1 bg-slate-100/80 rounded-lg border border-slate-200/60 shadow-2xs">
                  <span className="text-emerald-700 font-bold font-mono">{filteredJournals.length}</span> / {journals.length} jurnal
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={toggleAllJournalsCollapse}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200/80 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 shadow-2xs transition"
                  title="Tutup / Buka semua baris rincian jurnal"
                >
                  <Layers className="w-3.5 h-3.5 text-slate-500" />
                  <span>{filteredJournals.length > 0 && filteredJournals.every(j => Boolean(collapsedJournals[j.id])) ? 'Buka Semua' : 'Tutup Semua'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleResetJournalColWidths}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200/80 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 shadow-2xs transition"
                  title="Kembalikan lebar kolom ke ukuran default"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                  <span>Pulihkan Kolom</span>
                </button>

                <button
                  type="button"
                  onClick={handleExportJournalsExcel}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer"
                  title="Ekspor seluruh entri jurnal ke format Excel (.xlsx)"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Export Excel</span>
                </button>

                <button
                  type="button"
                  onClick={() => setManualModalOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Input Jurnal Koreksi</span>
                </button>
              </div>
            </div>

            {/* Filter Controls Bar */}
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-xs">
              <div className="flex items-center gap-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">
                <Filter className="w-3 h-3 text-slate-500" />
                <span>Filter:</span>
              </div>

              {/* 1. Filter Sumber Jurnal */}
              <div className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 border border-slate-200 rounded-xl shadow-2xs">
                <Tag className="w-3.5 h-3.5 text-slate-500" />
                <select
                  value={journalSourceFilter}
                  onChange={(e) => setJournalSourceFilter(e.target.value)}
                  className="bg-transparent text-slate-700 font-semibold focus:outline-hidden cursor-pointer text-xs"
                >
                  <option value="all">Semua Sumber Jurnal</option>
                  <option value="system">Hanya Jurnal Otomatis Sistem</option>
                  <option value="manual">Hanya Jurnal Koreksi / Manual</option>
                </select>
              </div>

              {/* 2. Filter Keseimbangan Jurnal */}
              <div className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 border border-slate-200 rounded-xl shadow-2xs">
                <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" />
                <select
                  value={journalBalanceFilter}
                  onChange={(e) => setJournalBalanceFilter(e.target.value)}
                  className="bg-transparent text-slate-700 font-semibold focus:outline-hidden cursor-pointer text-xs"
                >
                  <option value="all">Semua Status Balance</option>
                  <option value="balanced">Hanya Seimbang (Balance)</option>
                  <option value="unbalanced">Hanya Tidak Seimbang (Warning)</option>
                </select>
              </div>

              {/* Reset All Filters Button */}
              {(journalSearch || journalSourceFilter !== 'all' || journalBalanceFilter !== 'all' || selectedJournalMonth !== 'all') && (
                <button
                  type="button"
                  onClick={() => {
                    setJournalSearch('');
                    setJournalSourceFilter('all');
                    setJournalBalanceFilter('all');
                    setSelectedJournalMonth('all');
                  }}
                  className="text-xs text-rose-600 hover:text-rose-700 font-bold px-2.5 py-1.5 hover:bg-rose-50 border border-rose-200 rounded-xl transition shadow-2xs ml-auto"
                >
                  Reset Filter
                </button>
              )}
            </div>
          </div>

          {/* KPI Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-2xs">
              <div className="text-[10px] uppercase font-bold text-slate-400 flex items-center justify-between">
                <span>Total Entri Jurnal</span>
                <BookOpen className="w-3.5 h-3.5 text-emerald-600" />
              </div>
              <div className="text-sm font-extrabold text-slate-800 font-mono mt-1">
                {journalSummary.count} <span className="text-xs font-semibold text-slate-500">Jurnal</span>
              </div>
            </div>

            <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-2xs">
              <div className="text-[10px] uppercase font-bold text-slate-400 flex items-center justify-between">
                <span>Total Nilai Debit</span>
                <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-600" />
              </div>
              <div className="text-sm font-extrabold text-emerald-700 font-mono mt-1">
                {formatCurrency(journalSummary.total_debit)}
              </div>
            </div>

            <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-2xs">
              <div className="text-[10px] uppercase font-bold text-slate-400 flex items-center justify-between">
                <span>Total Nilai Kredit</span>
                <ArrowUpRight className="w-3.5 h-3.5 text-rose-600" />
              </div>
              <div className="text-sm font-extrabold text-rose-700 font-mono mt-1">
                {formatCurrency(journalSummary.total_credit)}
              </div>
            </div>

            <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-2xs">
              <div className="text-[10px] uppercase font-bold text-slate-400 flex items-center justify-between">
                <span>Status Keseimbangan</span>
                {journalSummary.is_all_balanced ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                )}
              </div>
              <div className={`text-sm font-extrabold font-mono mt-1 ${
                journalSummary.is_all_balanced ? 'text-emerald-700' : 'text-rose-600'
              }`}>
                {journalSummary.is_all_balanced ? '100% Seimbang' : `${journalSummary.unbalanced_count} Tidak Balance`}
              </div>
            </div>
          </div>

          {/* MONTH PAGINATION RIBBON (PAGINASI PER BULAN DALAM TAHUN AJARAN) */}
          {availableJournalMonths.length > 0 && (
            <div className="bg-white p-2.5 rounded-xl border border-slate-200/80 shadow-2xs flex flex-wrap items-center justify-between gap-2 select-none">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600 mr-1">
                  <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Periode Bulan:</span>
                </div>

                {/* Prev & Next Month Quick Stepper */}
                <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
                  <button
                    type="button"
                    disabled={selectedJournalMonth === 'all' || availableJournalMonths.findIndex(m => m.key === selectedJournalMonth) <= 0}
                    onClick={() => {
                      const currentIdx = availableJournalMonths.findIndex(m => m.key === selectedJournalMonth);
                      if (currentIdx > 0) {
                        setSelectedJournalMonth(availableJournalMonths[currentIdx - 1].key);
                      }
                    }}
                    className="p-1 rounded-md text-slate-600 hover:text-slate-900 hover:bg-white disabled:opacity-30 disabled:hover:bg-transparent transition cursor-pointer"
                    title="Bulan Sebelumnya"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    disabled={selectedJournalMonth === 'all' || availableJournalMonths.findIndex(m => m.key === selectedJournalMonth) >= availableJournalMonths.length - 1}
                    onClick={() => {
                      const currentIdx = availableJournalMonths.findIndex(m => m.key === selectedJournalMonth);
                      if (currentIdx >= 0 && currentIdx < availableJournalMonths.length - 1) {
                        setSelectedJournalMonth(availableJournalMonths[currentIdx + 1].key);
                      }
                    }}
                    className="p-1 rounded-md text-slate-600 hover:text-slate-900 hover:bg-white disabled:opacity-30 disabled:hover:bg-transparent transition cursor-pointer"
                    title="Bulan Berikutnya"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Scrollable Month Pills List */}
              <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar py-0.5 max-w-full">
                <button
                  type="button"
                  onClick={() => setSelectedJournalMonth('all')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
                    selectedJournalMonth === 'all'
                      ? 'bg-slate-800 text-white shadow-xs'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  <span>Semua Bulan</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                    selectedJournalMonth === 'all' ? 'bg-slate-700 text-emerald-300' : 'bg-slate-200 text-slate-600'
                  }`}>
                    {journals.length}
                  </span>
                </button>

                {availableJournalMonths.map(m => {
                  const isActive = selectedJournalMonth === m.key;
                  return (
                    <button
                      key={m.key}
                      type="button"
                      onClick={() => setSelectedJournalMonth(m.key)}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
                        isActive
                          ? 'bg-emerald-600 text-white shadow-xs font-bold'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                      }`}
                    >
                      <span>{m.label}</span>
                      <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                        isActive ? 'bg-emerald-700 text-white' : 'bg-slate-200 text-slate-600'
                      }`}>
                        {m.count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* DENSE SPREADSHEET TABLE WITH RESIZABLE HEADERS & RICH ENTERPRISE LOOK */}
          <div className="bg-white rounded-xl border border-slate-300 shadow-sm overflow-hidden">
            {loading ? (
              <div className="p-14 flex flex-col items-center justify-center text-slate-400 gap-2">
                <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
                <span className="text-xs font-semibold">Memuat entri jurnal umum...</span>
              </div>
            ) : filteredJournals.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-xs italic">
                Tidak ada entri jurnal yang sesuai dengan filter yang dipilih.
              </div>
            ) : (
              <div className="overflow-x-auto max-h-[750px] custom-scrollbar">
                <table className="w-full text-left border-collapse text-xs select-text table-fixed">
                  {/* HIGH-CONTRAST VISIBLE ENTERPRISE HEADER WITH RESIZE HANDLES */}
                  <thead className="sticky top-0 z-30 bg-slate-100 border-b-2 border-slate-300 shadow-2xs select-none">
                    <tr>
                      {/* No. Jurnal & Tanggal */}
                      <th
                        style={{ width: `${journalColWidths.ref}px`, minWidth: `${journalColWidths.ref}px`, maxWidth: `${journalColWidths.ref}px` }}
                        className="relative px-2.5 py-2 text-left text-slate-800 font-extrabold text-[11px] uppercase tracking-wider border-r border-slate-200 group bg-slate-100"
                      >
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3 h-3 text-slate-500 shrink-0" />
                          <span className="truncate">No. Jurnal & Tgl</span>
                        </div>
                        <div
                          onMouseDown={(e) => handleMouseDownResizeJournal('ref', e)}
                          className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-emerald-500 active:bg-emerald-600 z-10 transition-colors opacity-0 group-hover:opacity-100"
                          title="Geser untuk mengubah ukuran kolom"
                        />
                      </th>

                      {/* Akun COA */}
                      <th
                        style={{ width: `${journalColWidths.akun}px`, minWidth: `${journalColWidths.akun}px`, maxWidth: `${journalColWidths.akun}px` }}
                        className="relative px-2.5 py-2 text-left text-slate-800 font-extrabold text-[11px] uppercase tracking-wider border-r border-slate-200 group bg-slate-100"
                      >
                        <div className="flex items-center gap-1.5">
                          <Layers className="w-3 h-3 text-slate-500 shrink-0" />
                          <span className="truncate">Kode & Akun (COA)</span>
                        </div>
                        <div
                          onMouseDown={(e) => handleMouseDownResizeJournal('akun', e)}
                          className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-emerald-500 active:bg-emerald-600 z-10 transition-colors opacity-0 group-hover:opacity-100"
                          title="Geser untuk mengubah ukuran kolom"
                        />
                      </th>

                      {/* Uraian Transaksi */}
                      <th
                        style={{ width: `${journalColWidths.uraian}px`, minWidth: `${journalColWidths.uraian}px`, maxWidth: `${journalColWidths.uraian}px` }}
                        className="relative px-3 py-2 text-left text-slate-800 font-extrabold text-[11px] uppercase tracking-wider border-r border-slate-200 group bg-slate-100"
                      >
                        <div className="flex items-center gap-1.5">
                          <AlignLeft className="w-3 h-3 text-slate-500 shrink-0" />
                          <span className="truncate">Uraian & Keterangan</span>
                        </div>
                        <div
                          onMouseDown={(e) => handleMouseDownResizeJournal('uraian', e)}
                          className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-emerald-500 active:bg-emerald-600 z-10 transition-colors opacity-0 group-hover:opacity-100"
                          title="Geser untuk mengubah ukuran kolom"
                        />
                      </th>

                      {/* Posisi (D/K) */}
                      <th
                        style={{ width: `${journalColWidths.posisi}px`, minWidth: `${journalColWidths.posisi}px`, maxWidth: `${journalColWidths.posisi}px` }}
                        className="relative px-2 py-2 text-center text-slate-800 font-extrabold text-[11px] uppercase tracking-wider border-r border-slate-200 group bg-slate-100"
                      >
                        <div className="flex items-center justify-center gap-1">
                          <SlidersHorizontal className="w-3 h-3 text-slate-500 shrink-0" />
                          <span className="truncate">Posisi</span>
                        </div>
                        <div
                          onMouseDown={(e) => handleMouseDownResizeJournal('posisi', e)}
                          className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-emerald-500 active:bg-emerald-600 z-10 transition-colors opacity-0 group-hover:opacity-100"
                          title="Geser untuk mengubah ukuran kolom"
                        />
                      </th>

                      {/* Debit (Rp) */}
                      <th
                        style={{ width: `${journalColWidths.debit}px`, minWidth: `${journalColWidths.debit}px`, maxWidth: `${journalColWidths.debit}px` }}
                        className="relative px-2.5 py-2 text-right text-emerald-800 font-extrabold text-[11px] uppercase tracking-wider border-r border-slate-200 group bg-slate-100"
                      >
                        <div className="flex items-center justify-end gap-1">
                          <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span className="truncate">Debit (Rp)</span>
                        </div>
                        <div
                          onMouseDown={(e) => handleMouseDownResizeJournal('debit', e)}
                          className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-emerald-500 active:bg-emerald-600 z-10 transition-colors opacity-0 group-hover:opacity-100"
                          title="Geser untuk mengubah ukuran kolom"
                        />
                      </th>

                      {/* Kredit (Rp) */}
                      <th
                        style={{ width: `${journalColWidths.kredit}px`, minWidth: `${journalColWidths.kredit}px`, maxWidth: `${journalColWidths.kredit}px` }}
                        className="relative px-2.5 py-2 text-right text-rose-800 font-extrabold text-[11px] uppercase tracking-wider border-r border-slate-200 group bg-slate-100"
                      >
                        <div className="flex items-center justify-end gap-1">
                          <ArrowUpRight className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                          <span className="truncate">Kredit (Rp)</span>
                        </div>
                        <div
                          onMouseDown={(e) => handleMouseDownResizeJournal('kredit', e)}
                          className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-emerald-500 active:bg-emerald-600 z-10 transition-colors opacity-0 group-hover:opacity-100"
                          title="Geser untuk mengubah ukuran kolom"
                        />
                      </th>

                      {/* Status / Aksi */}
                      <th
                        style={{ width: `${journalColWidths.aksi}px`, minWidth: `${journalColWidths.aksi}px`, maxWidth: `${journalColWidths.aksi}px` }}
                        className="relative px-2 py-2 text-center text-slate-800 font-extrabold text-[11px] uppercase tracking-wider group bg-slate-100"
                      >
                        <div className="flex items-center justify-center gap-1">
                          <Eye className="w-3 h-3 text-slate-500 shrink-0" />
                          <span className="truncate">Detail</span>
                        </div>
                        <div
                          onMouseDown={(e) => handleMouseDownResizeJournal('aksi', e)}
                          className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-emerald-500 active:bg-emerald-600 z-10 transition-colors opacity-0 group-hover:opacity-100"
                          title="Geser untuk mengubah ukuran kolom"
                        />
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-200 bg-white">
                    {filteredJournals.map((j) => {
                      const isCollapsed = Boolean(collapsedJournals[j.id]);
                      const lines = [...(j.lines || [])].sort((a, b) => {
                        if (a.entry_side === 'debit' && b.entry_side !== 'debit') return -1;
                        if (a.entry_side !== 'debit' && b.entry_side === 'debit') return 1;
                        return (a.id || 0) - (b.id || 0);
                      });

                      const formattedDate = j.journal_date
                        ? (typeof j.journal_date === 'string'
                            ? j.journal_date.slice(0, 10).split('-').reverse().join('/')
                            : new Date(j.journal_date).toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' }))
                        : '-';

                      return (
                        <React.Fragment key={j.id}>
                          {/* COMPACT DARK BANNER HEADER PER JOURNAL ENTRY */}
                          <tr
                            onClick={() => toggleJournalCollapse(j.id)}
                            className="bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs cursor-pointer select-none transition-colors"
                          >
                            <td colSpan={7} className="px-3 py-1.5 border-y border-slate-900">
                              <div className="flex items-center justify-between gap-3">
                                {/* Left Side Header Information */}
                                <div className="flex items-center gap-2 min-w-0">
                                  {isCollapsed ? (
                                    <ChevronRight className="w-4 h-4 text-emerald-400 shrink-0" />
                                  ) : (
                                    <ChevronDown className="w-4 h-4 text-emerald-400 shrink-0" />
                                  )}

                                  {/* Journal Number Badge */}
                                  <span className="font-mono font-extrabold text-[11px] text-emerald-300 bg-slate-900/90 px-2 py-0.5 rounded border border-slate-700 tracking-wider shrink-0">
                                    {j.journal_number}
                                  </span>

                                  {/* Date */}
                                  <span className="text-[11px] text-slate-300 font-medium whitespace-nowrap shrink-0 flex items-center gap-1">
                                    <Calendar className="w-3 h-3 text-slate-400" />
                                    {formattedDate}
                                  </span>

                                  {/* Source Badge */}
                                  <span className="text-[9px] uppercase font-extrabold px-1.5 py-0.5 rounded bg-slate-700 text-slate-200 border border-slate-600 shrink-0">
                                    {j.source_type || 'system'}
                                  </span>

                                  {/* Manual Correction Pill */}
                                  {(j.is_manual_correction === 1 || j.source_type === 'manual') && (
                                    <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 shrink-0">
                                      Koreksi Manual
                                    </span>
                                  )}

                                  {/* Description (Single place of truth per transaction) */}
                                  <span className="text-[11px] text-slate-200 font-normal truncate hidden sm:inline-block max-w-[550px] lg:max-w-[750px]" title={j.description}>
                                    — {j.description}
                                  </span>
                                </div>

                                {/* Right Side Summary & Action */}
                                <div className="flex items-center gap-3 text-[11px] shrink-0">
                                  {/* Balanced Pill */}
                                  {j.is_balanced ? (
                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-extrabold rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                                      <CheckCircle2 className="w-2.5 h-2.5" />
                                      Seimbang
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-extrabold rounded bg-rose-500/20 text-rose-300 border border-rose-500/40">
                                      <AlertCircle className="w-2.5 h-2.5" />
                                      Tidak Seimbang
                                    </span>
                                  )}

                                  {/* Total Amount */}
                                  <span className="font-mono text-white font-extrabold">
                                    Total: <b className="text-emerald-300">{formatCurrency(j.total_amount)}</b>
                                  </span>

                                  {/* View Detail Modal Button */}
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleViewJournalDetail(j.id);
                                    }}
                                    className="p-1 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition cursor-pointer"
                                    title="Buka rincian lengkap jurnal"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            </td>
                          </tr>

                          {/* DENSE CHILD ROWS: DEBITS & CREDITS (NO DUPLICATED DESCRIPTION) */}
                          {!isCollapsed && (
                            lines.length === 0 ? (
                              <tr className="border-b border-slate-200 bg-white text-slate-400 text-center italic text-[11px]">
                                <td colSpan={7} className="py-2">Tidak ada rincian baris akun.</td>
                              </tr>
                            ) : (
                              lines.map((line, lIdx) => {
                                const isDebit = line.entry_side === 'debit';
                                const lineAmount = parseFloat(line.amount || 0);
                                const hasCustomMemo = line.memo && line.memo.trim() !== '' && line.memo.trim() !== j.description.trim();

                                return (
                                  <tr
                                    key={lIdx}
                                    className="h-7.5 hover:bg-amber-50/50 transition-colors border-b border-slate-200 text-[11px] bg-white"
                                  >
                                    {/* Col 1: Empty Spacer / Line No */}
                                    <td
                                      style={{ width: `${journalColWidths.ref}px`, minWidth: `${journalColWidths.ref}px`, maxWidth: `${journalColWidths.ref}px` }}
                                      className="px-2.5 py-1 text-slate-400 font-mono text-[10px] border-r border-slate-200 truncate text-center"
                                    >
                                      #{lIdx + 1}
                                    </td>

                                    {/* Col 2: COA Account Code & Name */}
                                    <td
                                      style={{ width: `${journalColWidths.akun}px`, minWidth: `${journalColWidths.akun}px`, maxWidth: `${journalColWidths.akun}px` }}
                                      className="px-2.5 py-1 border-r border-slate-200 truncate"
                                    >
                                      <div className={`flex items-center gap-1.5 truncate ${isDebit ? 'pl-1 font-bold text-slate-900' : 'pl-6 font-medium text-slate-700 italic'}`}>
                                        <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-slate-100 text-slate-800 border border-slate-300 shrink-0">
                                          {line.account_code}
                                        </span>
                                        <span className="truncate" title={line.account_name}>{line.account_name}</span>
                                        {line.account_group && (
                                          <span className="text-[10px] text-slate-400 font-normal shrink-0 not-italic">
                                            ({line.account_group})
                                          </span>
                                        )}
                                      </div>
                                    </td>

                                    {/* Col 3: Memo Spesifik (Hanya jika beda dari uraian transaksi induk) */}
                                    <td
                                      style={{ width: `${journalColWidths.uraian}px`, minWidth: `${journalColWidths.uraian}px`, maxWidth: `${journalColWidths.uraian}px` }}
                                      className="px-3 py-1 border-r border-slate-200 text-slate-700 truncate"
                                      title={hasCustomMemo ? line.memo : ''}
                                    >
                                      {hasCustomMemo ? (
                                        <span className="truncate block font-medium text-slate-700">{line.memo}</span>
                                      ) : (
                                        <span className="text-slate-300 text-xs block font-bold text-center select-none" title="Uraian mengacu pada header transaksi di atas">
                                          —
                                        </span>
                                      )}
                                    </td>

                                    {/* Col 4: Posisi Badge (D/K) */}
                                    <td
                                      style={{ width: `${journalColWidths.posisi}px`, minWidth: `${journalColWidths.posisi}px`, maxWidth: `${journalColWidths.posisi}px` }}
                                      className="px-2 py-1 text-center border-r border-slate-200 truncate"
                                    >
                                      <span className={`inline-flex items-center justify-center px-2 py-0.2 rounded text-[9px] font-extrabold uppercase border ${
                                        isDebit
                                          ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                          : 'bg-rose-50 text-rose-800 border-rose-300'
                                      }`}>
                                        {isDebit ? 'DEBIT' : 'KREDIT'}
                                      </span>
                                    </td>

                                    {/* Col 5: Debit Amount (Rp) */}
                                    <td
                                      style={{ width: `${journalColWidths.debit}px`, minWidth: `${journalColWidths.debit}px`, maxWidth: `${journalColWidths.debit}px` }}
                                      className="px-2.5 py-1 text-right font-mono font-bold text-emerald-700 border-r border-slate-200 tabular-nums truncate"
                                    >
                                      {isDebit ? formatNumber(lineAmount) : '—'}
                                    </td>

                                    {/* Col 6: Kredit Amount (Rp) */}
                                    <td
                                      style={{ width: `${journalColWidths.kredit}px`, minWidth: `${journalColWidths.kredit}px`, maxWidth: `${journalColWidths.kredit}px` }}
                                      className="px-2.5 py-1 text-right font-mono font-bold text-rose-700 border-r border-slate-200 tabular-nums truncate"
                                    >
                                      {!isDebit ? formatNumber(lineAmount) : '—'}
                                    </td>

                                    {/* Col 7: Empty */}
                                    <td
                                      style={{ width: `${journalColWidths.aksi}px`, minWidth: `${journalColWidths.aksi}px`, maxWidth: `${journalColWidths.aksi}px` }}
                                      className="px-2 py-1 text-center text-slate-300 select-none"
                                    >
                                      ·
                                    </td>
                                  </tr>
                                );
                              })
                            )
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: BUKU BESAR (GENERAL LEDGER)                                        */}
      {/* ========================================================================= */}
      {mainTab === 'ledger' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3 text-xs">
              <span className="font-semibold text-slate-500">Pilih Akun Buku Besar:</span>
              <select
                value={selectedLedgerAccountId}
                onChange={(e) => setSelectedLedgerAccountId(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800"
              >
                <option value="">-- Seluruh Akun COA --</option>
                {coaList.map(acc => (
                  <option key={acc.id} value={acc.id}>
                    {acc.account_code} - {acc.account_name} ({acc.account_group})
                  </option>
                ))}
              </select>
            </div>
            <span className="text-xs text-slate-400">Total Akun Terbuku: {ledgerData.length}</span>
          </div>

          {ledgerLoading ? (
            <div className="p-12 bg-white rounded-xl border border-slate-200 flex flex-col items-center justify-center text-slate-400 gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
              <span className="text-xs">Menghitung mutasi buku besar...</span>
            </div>
          ) : ledgerData.length === 0 ? (
            <div className="p-12 bg-white rounded-xl border border-slate-200 text-center text-slate-400 text-xs italic">
              Tidak ada data buku besar untuk akun yang dipilih.
            </div>
          ) : (
            <div className="space-y-6">
              {ledgerData.map(acc => (
                <div key={acc.account_id} className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
                  <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <span className="font-extrabold tnum text-sm text-slate-800 mr-2">{acc.account_code}</span>
                      <span className="font-bold text-sm text-slate-800">{acc.account_name}</span>
                      <span className="ml-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-700">
                        {acc.account_group}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-xs">
                      <span className="text-slate-500">Saldo Normal: <b className="uppercase">{acc.normal_balance}</b></span>
                      <span className="text-slate-500">Total Debit: <b className="text-emerald-700">{formatCurrency(acc.total_debit)}</b></span>
                      <span className="text-slate-500">Total Kredit: <b className="text-rose-700">{formatCurrency(acc.total_credit)}</b></span>
                      <div className="px-3 py-1 bg-emerald-100 text-emerald-950 font-bold rounded-xl">
                        Saldo Akhir: {formatCurrency(acc.ending_balance)}
                      </div>
                    </div>
                  </div>

                  {acc.mutations.length === 0 ? (
                    <div className="p-4 text-xs text-slate-400 italic text-center">
                      Belum ada transaksi mutasi untuk akun ini.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50/50 text-slate-500 font-semibold border-b border-slate-200">
                          <tr>
                            <th className="px-4 py-2.5">Tanggal</th>
                            <th className="px-4 py-2.5">No. Bukti / Jurnal</th>
                            <th className="px-4 py-2.5">Keterangan Transaksi</th>
                            <th className="px-4 py-2.5 text-right">Debit</th>
                            <th className="px-4 py-2.5 text-right">Kredit</th>
                            <th className="px-4 py-2.5 text-right">Saldo Berjalan</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {acc.mutations.map((m, idx) => (
                            <tr key={idx} className="hover:bg-slate-50/70">
                              <td className="px-4 py-2 text-slate-600">
                                {new Date(m.journal_date).toLocaleDateString('id-ID')}
                              </td>
                              <td className="px-4 py-2 text-slate-800">{m.journal_number}</td>
                              <td className="px-4 py-2 text-slate-700 max-w-sm">{m.description}</td>
                              <td className="px-4 py-2 text-right text-emerald-600 font-medium">
                                {m.entry_side === 'debit' ? formatCurrency(m.amount) : '-'}
                              </td>
                              <td className="px-4 py-2 text-right text-rose-600 font-medium">
                                {m.entry_side === 'credit' ? formatCurrency(m.amount) : '-'}
                              </td>
                              <td className="px-4 py-2 text-right font-bold tnum text-slate-900">
                                {formatCurrency(m.balance_after)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: LEMBAR KERJA (WORKSHEET / NERACA LAJUR 10 KOLOM)                    */}
      {/* ========================================================================= */}
      {mainTab === 'worksheet' && (
        <div className="space-y-4">
          <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-emerald-950">Neraca Lajur Multi-Kolom (Worksheet)</h3>
              <p className="text-xs text-emerald-800 mt-0.5">
                Alat bantu pengikhtisaran siklus akuntansi sebelum penutupan buku tahunan: Neraca Saldo, Penyesuaian, Saldo Disesuaikan, Laporan Aktivitas & Neraca
              </p>
            </div>
            <button
              type="button"
              onClick={() => setManualModalOpen(true)}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition shrink-0 flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Input Penyesuaian</span>
            </button>
          </div>

          {worksheetLoading ? (
            <div className="p-12 bg-white rounded-xl border border-slate-200 flex flex-col items-center justify-center text-slate-400 gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
              <span className="text-xs">Menyusun lembar kerja (worksheet)...</span>
            </div>
          ) : !worksheetData ? (
            <div className="p-12 bg-white rounded-xl border border-slate-200 text-center text-slate-400 text-xs italic">
              Data lembar kerja belum tersedia.
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-[11px]">
                  <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                    <tr>
                      <th rowSpan={2} className="px-3 py-2 border-r border-slate-200">Kode</th>
                      <th rowSpan={2} className="px-3 py-2 border-r border-slate-200 min-w-[180px]">Nama Akun</th>
                      <th colSpan={2} className="px-3 py-1.5 text-center border-r border-slate-200 bg-slate-200/60">Neraca Saldo Awal</th>
                      <th colSpan={2} className="px-3 py-1.5 text-center border-r border-slate-200 bg-amber-100/60">Penyesuaian</th>
                      <th colSpan={2} className="px-3 py-1.5 text-center border-r border-slate-200 bg-indigo-100/60">Saldo Disesuaikan</th>
                      <th colSpan={2} className="px-3 py-1.5 text-center border-r border-slate-200 bg-indigo-100/60">Laporan Aktivitas</th>
                      <th colSpan={2} className="px-3 py-1.5 text-center bg-emerald-100/60">Posisi Keuangan</th>
                    </tr>
                    <tr className="border-t border-slate-200 text-[10px]">
                      <th className="px-2 py-1 text-right bg-slate-100">Debit</th>
                      <th className="px-2 py-1 text-right border-r border-slate-200 bg-slate-100">Kredit</th>
                      <th className="px-2 py-1 text-right bg-amber-50">Debit</th>
                      <th className="px-2 py-1 text-right border-r border-slate-200 bg-amber-50">Kredit</th>
                      <th className="px-2 py-1 text-right bg-indigo-50">Debit</th>
                      <th className="px-2 py-1 text-right border-r border-slate-200 bg-indigo-50">Kredit</th>
                      <th className="px-2 py-1 text-right bg-indigo-50">Debit</th>
                      <th className="px-2 py-1 text-right border-r border-slate-200 bg-indigo-50">Kredit</th>
                      <th className="px-2 py-1 text-right bg-emerald-50">Debit</th>
                      <th className="px-2 py-1 text-right bg-emerald-50">Kredit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {worksheetData.worksheet.map((row) => (
                      <tr key={row.account_id} className="hover:bg-slate-50/70">
                        <td className="px-3 py-2 font-bold text-slate-800 border-r border-slate-100">{row.account_code}</td>
                        <td className="px-3 py-2 font-sans font-medium text-slate-800 border-r border-slate-100">{row.account_name}</td>
                        {/* 1. Unadjusted */}
                        <td className="px-2 py-2 text-right text-slate-700">{row.unadjusted.debit ? formatCurrency(row.unadjusted.debit) : '-'}</td>
                        <td className="px-2 py-2 text-right text-slate-700 border-r border-slate-100">{row.unadjusted.credit ? formatCurrency(row.unadjusted.credit) : '-'}</td>
                        {/* 2. Adjustments */}
                        <td className="px-2 py-2 text-right text-amber-700 bg-amber-50/20">{row.adjustments.debit ? formatCurrency(row.adjustments.debit) : '-'}</td>
                        <td className="px-2 py-2 text-right text-amber-700 bg-amber-50/20 border-r border-slate-100">{row.adjustments.credit ? formatCurrency(row.adjustments.credit) : '-'}</td>
                        {/* 3. Adjusted */}
                        <td className="px-2 py-2 text-right text-indigo-700 bg-indigo-50/20">{row.adjusted.debit ? formatCurrency(row.adjusted.debit) : '-'}</td>
                        <td className="px-2 py-2 text-right text-indigo-700 bg-indigo-50/20 border-r border-slate-100">{row.adjusted.credit ? formatCurrency(row.adjusted.credit) : '-'}</td>
                        {/* 4. Activity */}
                        <td className="px-2 py-2 text-right text-indigo-700 bg-indigo-50/20">{row.activity_statement.debit ? formatCurrency(row.activity_statement.debit) : '-'}</td>
                        <td className="px-2 py-2 text-right text-indigo-700 bg-indigo-50/20 border-r border-slate-100">{row.activity_statement.credit ? formatCurrency(row.activity_statement.credit) : '-'}</td>
                        {/* 5. Balance Sheet */}
                        <td className="px-2 py-2 text-right text-emerald-700 bg-emerald-50/20">{row.balance_sheet.debit ? formatCurrency(row.balance_sheet.debit) : '-'}</td>
                        <td className="px-2 py-2 text-right text-emerald-700 bg-emerald-50/20">{row.balance_sheet.credit ? formatCurrency(row.balance_sheet.credit) : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                  {/* Totals Row */}
                  <tfoot className="bg-slate-100 font-bold tnum text-slate-900 border-t-2 border-slate-300">
                    <tr>
                      <td colSpan={2} className="px-3 py-2 text-center font-sans">TOTAL</td>
                      <td className="px-2 py-2 text-right">{formatCurrency(worksheetData.totals.unadjusted_debit)}</td>
                      <td className="px-2 py-2 text-right border-r border-slate-300">{formatCurrency(worksheetData.totals.unadjusted_credit)}</td>
                      <td className="px-2 py-2 text-right text-amber-800 bg-amber-100/50">{formatCurrency(worksheetData.totals.adjustment_debit)}</td>
                      <td className="px-2 py-2 text-right text-amber-800 bg-amber-100/50 border-r border-slate-300">{formatCurrency(worksheetData.totals.adjustment_credit)}</td>
                      <td className="px-2 py-2 text-right text-indigo-800 bg-indigo-100/50">{formatCurrency(worksheetData.totals.adjusted_debit)}</td>
                      <td className="px-2 py-2 text-right text-indigo-800 bg-indigo-100/50 border-r border-slate-300">{formatCurrency(worksheetData.totals.adjusted_credit)}</td>
                      <td className="px-2 py-2 text-right text-indigo-800 bg-indigo-100/50">{formatCurrency(worksheetData.totals.activity_debit)}</td>
                      <td className="px-2 py-2 text-right text-indigo-800 bg-indigo-100/50 border-r border-slate-300">{formatCurrency(worksheetData.totals.activity_credit)}</td>
                      <td className="px-2 py-2 text-right text-emerald-800 bg-emerald-100/50">{formatCurrency(worksheetData.totals.balance_sheet_debit)}</td>
                      <td className="px-2 py-2 text-right text-emerald-800 bg-emerald-100/50">{formatCurrency(worksheetData.totals.balance_sheet_credit)}</td>
                    </tr>
                    {/* Surplus / Defisit Row */}
                    <tr className="bg-emerald-50 text-emerald-950 font-bold border-t border-emerald-200">
                      <td colSpan={2} className="px-3 py-2 text-center font-sans">
                        SURPLUS / (DEFISIT) BERSIH PERIODE
                      </td>
                      <td colSpan={6} className="text-center font-sans text-xs italic text-slate-500 border-r border-slate-300">
                        Neraca Saldo Seimbang
                      </td>
                      <td colSpan={2} className="px-3 py-2 text-center border-r border-slate-300">
                        {formatCurrency(worksheetData.surplus_deficit.amount)} ({worksheetData.surplus_deficit.status.toUpperCase()})
                      </td>
                      <td colSpan={2} className="px-3 py-2 text-center">
                        {formatCurrency(worksheetData.surplus_deficit.amount)} (KENAIKAN ASET NETO)
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: LAPORAN AKUNTANSI LENGKAP (NERACA, AKTIVITAS, ARUS KAS)             */}
      {/* ========================================================================= */}
      {mainTab === 'statements' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-slate-500">Pilih Laporan Keuangan:</span>
              <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setStatementType('balance-sheet')}
                  className={`px-3 py-1.5 rounded-lg transition ${
                    statementType === 'balance-sheet' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Posisi Keuangan (Neraca)
                </button>
                <button
                  type="button"
                  onClick={() => setStatementType('income-statement')}
                  className={`px-3 py-1.5 rounded-lg transition ${
                    statementType === 'income-statement' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Laporan Aktivitas (Laba-Rugi)
                </button>
                <button
                  type="button"
                  onClick={() => setStatementType('cash-flow')}
                  className={`px-3 py-1.5 rounded-lg transition ${
                    statementType === 'cash-flow' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Laporan Arus Kas
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition"
            >
              <FileDown className="w-3.5 h-3.5" />
              <span>Cetak / Ekspor PDF</span>
            </button>
          </div>

          {statementLoading ? (
            <div className="p-12 bg-white rounded-xl border border-slate-200 flex flex-col items-center justify-center text-slate-400 gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
              <span className="text-xs">Menyiapkan laporan keuangan...</span>
            </div>
          ) : !statementData ? (
            <div className="p-12 bg-white rounded-xl border border-slate-200 text-center text-slate-400 text-xs italic">
              Laporan keuangan belum dapat ditampilkan.
            </div>
          ) : (
            <div className="bg-white p-6 rounded-xl border border-slate-200/80 shadow-xs space-y-6">
              {/* Header Formal */}
              <div className="text-center pb-4 border-b border-slate-200 space-y-1">
                <h2 className="text-base font-extrabold text-slate-800 uppercase tracking-wide">
                  {statementType === 'balance-sheet' && 'LAPORAN POSISI KEUANGAN (NERACA)'}
                  {statementType === 'income-statement' && 'LAPORAN AKTIVITAS (SURPLUS / DEFISIT)'}
                  {statementType === 'cash-flow' && 'LAPORAN ARUS KAS METODE LANGSUNG'}
                </h2>
                <p className="text-xs font-bold text-slate-600">{activeSchoolUnit?.name || 'Yayasan / Seluruh Satuan'}</p>
                <p className="text-[11px] text-slate-400">Periode Tahun Ajaran {academicYears.find(a => String(a.id) === selectedAcademicYearId)?.name || 'Berjalan'}</p>
              </div>

              {/* Laporan Posisi Keuangan View */}
              {statementType === 'balance-sheet' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">ASET (AKTIVA)</h3>
                    <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 text-xs">
                      {statementData.assets?.map((a, i) => (
                        <div key={i} className="flex justify-between px-4 py-2.5">
                          <span className="text-slate-600">{a.account_name}</span>
                          <span className="font-medium tnum text-slate-800">{formatCurrency(a.debit - a.credit)}</span>
                        </div>
                      ))}
                      <div className="flex justify-between px-4 py-3 bg-indigo-50 font-bold text-indigo-900">
                        <span>TOTAL ASET</span>
                        <span>{formatCurrency(statementData.total_assets)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">KEWAJIBAN & ASET NETO (PASIVA)</h3>
                    <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 text-xs">
                      {statementData.liabilities?.map((l, i) => (
                        <div key={i} className="flex justify-between px-4 py-2.5">
                          <span className="text-slate-600">{l.account_name}</span>
                          <span className="font-medium tnum text-slate-800">{formatCurrency(l.credit - l.debit)}</span>
                        </div>
                      ))}
                      <div className="flex justify-between px-4 py-2 bg-slate-50 font-semibold text-slate-700 text-[11px]">
                        <span>Subtotal Kewajiban</span>
                        <span>{formatCurrency(statementData.total_liabilities)}</span>
                      </div>

                      {statementData.equity?.map((eq, i) => (
                        <div key={i} className="flex justify-between px-4 py-2.5">
                          <span className="text-slate-600">{eq.account_name}</span>
                          <span className="font-medium tnum text-slate-800">{formatCurrency(eq.credit - eq.debit)}</span>
                        </div>
                      ))}
                      <div className="flex justify-between px-4 py-2 bg-slate-50 font-semibold text-slate-700 text-[11px]">
                        <span>Subtotal Aset Neto</span>
                        <span>{formatCurrency(statementData.total_equity)}</span>
                      </div>

                      <div className="flex justify-between px-4 py-3 bg-indigo-50 font-bold text-indigo-900">
                        <span>TOTAL KEWAJIBAN & ASET NETO</span>
                        <span>{formatCurrency(statementData.total_liabilities + statementData.total_equity)}</span>
                      </div>
                    </div>

                    <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Neraca Seimbang: Total Aset = Total Kewajiban & Aset Neto</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Laporan Aktivitas View */}
              {statementType === 'income-statement' && (
                <div className="max-w-2xl mx-auto space-y-6 text-xs">
                  <div className="space-y-2">
                    <span className="font-bold text-emerald-800 uppercase tracking-wider">I. PENDAPATAN & SUMBANGAN OPERASIONAL</span>
                    <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
                      {statementData.revenues?.map((r, i) => (
                        <div key={i} className="flex justify-between px-4 py-2.5">
                          <span className="text-slate-700">{r.account_name}</span>
                          <span className="font-medium tnum">{formatCurrency(r.credit - r.debit)}</span>
                        </div>
                      ))}
                      <div className="flex justify-between px-4 py-2.5 bg-emerald-50 font-bold text-emerald-900">
                        <span>TOTAL PENDAPATAN</span>
                        <span>{formatCurrency(statementData.total_revenue)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <span className="font-bold text-rose-800 uppercase tracking-wider">II. BEBAN & PENGELUARAN PROGRAM</span>
                    <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
                      {statementData.expenses?.map((e, i) => (
                        <div key={i} className="flex justify-between px-4 py-2.5">
                          <span className="text-slate-700">{e.account_name}</span>
                          <span className="font-medium tnum">{formatCurrency(e.debit - e.credit)}</span>
                        </div>
                      ))}
                      <div className="flex justify-between px-4 py-2.5 bg-rose-50 font-bold text-rose-900">
                        <span>TOTAL BEBAN</span>
                        <span>{formatCurrency(statementData.total_expense)}</span>
                      </div>
                    </div>
                  </div>

                  <div className={`p-4 rounded-xl border flex items-center justify-between text-sm font-extrabold ${statementData.is_surplus ? 'bg-emerald-100 border-emerald-300 text-emerald-950' : 'bg-rose-100 border-rose-300 text-rose-950'}`}>
                    <span>SURPLUS / (DEFISIT) BERSIH PERIODE</span>
                    <span className="">{formatCurrency(statementData.net_income)}</span>
                  </div>
                </div>
              )}

              {/* Laporan Arus Kas View */}
              {statementType === 'cash-flow' && (
                <div className="max-w-2xl mx-auto space-y-6 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200">
                      <span className="text-[11px] font-semibold text-emerald-700">Total Kas Masuk</span>
                      <p className="text-base font-extrabold text-emerald-900 mt-1">{formatCurrency(statementData.total_inflow)}</p>
                    </div>
                    <div className="p-4 rounded-xl bg-rose-50 border border-rose-200">
                      <span className="text-[11px] font-semibold text-rose-700">Total Kas Keluar</span>
                      <p className="text-base font-extrabold text-rose-900 mt-1">{formatCurrency(statementData.total_outflow)}</p>
                    </div>
                    <div className={`p-4 rounded-xl border ${statementData.net_cash_flow >= 0 ? 'bg-indigo-50 border-indigo-200 text-indigo-950' : 'bg-amber-50 border-amber-200 text-amber-950'}`}>
                      <span className="text-[11px] font-semibold">Arus Kas Bersih</span>
                      <p className="text-base font-extrabold mt-1">{formatCurrency(statementData.net_cash_flow)}</p>
                    </div>
                  </div>

                  <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
                    <div className="px-4 py-2.5 bg-slate-50 font-bold text-slate-700">Rincian Arus Kas Masuk & Keluar</div>
                    {statementData.cash_movements?.map((m, i) => (
                      <div key={i} className="flex justify-between px-4 py-2.5">
                        <span className="text-slate-600">{m.account_name}</span>
                        <span className={`font-medium tnum ${m.movement >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                          {m.movement >= 0 ? `+${formatCurrency(m.movement)}` : `-${formatCurrency(Math.abs(m.movement))}`}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: TABUNGAN SANTRI & TUTUP BUKU                                       */}
      {/* ========================================================================= */}
      {mainTab === 'savings-closings' && (
        <div className="space-y-4">
          <div className="flex border-b border-slate-200 gap-4">
            <button
              type="button"
              onClick={() => setSubTabOperations('savings')}
              className={`pb-2.5 text-xs font-bold transition border-b-2 ${
                subTabOperations === 'savings' ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-slate-400 hover:text-slate-700'
              }`}
            >
              Tabungan Santri & Pegawai
            </button>
            <button
              type="button"
              onClick={() => setSubTabOperations('closings')}
              className={`pb-2.5 text-xs font-bold transition border-b-2 ${
                subTabOperations === 'closings' ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-slate-400 hover:text-slate-700'
              }`}
            >
              Tutup Buku Tahunan
            </button>
          </div>

          {/* Sub-tab 5A: Tabungan Santri */}
          {subTabOperations === 'savings' && (
            <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between text-xs">
                <span className="font-bold text-slate-700">Daftar Rekening Tabungan Siswa ({savings.length})</span>
              </div>

              {loading ? (
                <div className="p-12 flex flex-col items-center justify-center text-slate-400 gap-2">
                  <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
                  <span className="text-xs">Memuat rekening tabungan...</span>
                </div>
              ) : savings.length === 0 ? (
                <div className="p-12 text-center text-slate-400 text-xs italic">
                  Belum ada rekening tabungan santri terdaftar.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-3">No. Rekening</th>
                        <th className="px-4 py-3">Nama Pemilik</th>
                        <th className="px-4 py-3">Tipe</th>
                        <th className="px-4 py-3 text-right">Saldo Saat Ini</th>
                        <th className="px-4 py-3 text-center">Aksi Setor / Tarik</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {savings.map((s) => (
                        <tr key={s.id} className="hover:bg-slate-50/70">
                          <td className="px-4 py-3 font-bold tnum text-slate-800">{s.account_number}</td>
                          <td className="px-4 py-3 font-medium text-slate-800">{s.owner_name || s.student_name || 'Santri'}</td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-100 text-slate-700">
                              {s.owner_type || 'student'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right font-bold tnum text-emerald-800">
                            {formatCurrency(s.balance)}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleOpenSavingModal(s, 'deposit')}
                                className="flex items-center gap-1 px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold rounded-lg transition"
                              >
                                <ArrowDownCircle className="w-3.5 h-3.5" />
                                <span>Setor</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenSavingModal(s, 'withdraw')}
                                className="flex items-center gap-1 px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-lg transition"
                              >
                                <ArrowUpCircle className="w-3.5 h-3.5" />
                                <span>Tarik</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Sub-tab 5B: Tutup Buku Tahunan */}
          {subTabOperations === 'closings' && (
            <div className="space-y-4">
              <div className="p-4 bg-amber-50/80 border border-amber-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-amber-600 text-white rounded-xl mt-0.5">
                    <Lock className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-800">Prosedur Tutup Buku Akhir Tahun Ajaran</h3>
                    <p className="text-xs text-slate-600 mt-0.5 max-w-xl">
                      Menutup transaksi buku besar, mengunci jurnal, dan memindahkan saldo laba/surplus operasional ke akun Ekuitas/Aset Neto untuk membuka tahun ajaran berikutnya.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleCloseFiscalYear}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-xs transition shrink-0"
                >
                  Eksekusi Tutup Buku TA Ini
                </button>
              </div>

              <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-700">Riwayat Penutupan Periode Akuntansi</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-3">Tahun Ajaran</th>
                        <th className="px-4 py-3">Tanggal Ditutup</th>
                        <th className="px-4 py-3">Petugas Penutup</th>
                        <th className="px-4 py-3 text-right">Surplus/Defisit Ditutup</th>
                        <th className="px-4 py-3 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {closings.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-8 text-center text-slate-400 italic">
                            Belum ada riwayat tutup buku tahunan.
                          </td>
                        </tr>
                      ) : (
                        closings.map(c => (
                          <tr key={c.id} className="hover:bg-slate-50/70">
                            <td className="px-4 py-3 font-bold text-slate-800">{c.academic_year_name || c.academic_year_id}</td>
                            <td className="px-4 py-3 text-slate-600">{new Date(c.closed_at).toLocaleString('id-ID')}</td>
                            <td className="px-4 py-3 text-slate-700">{c.closed_by_name || 'Admin Akuntansi'}</td>
                            <td className="px-4 py-3 text-right font-bold tnum text-emerald-800">{formatCurrency(c.net_surplus_deficit || 0)}</td>
                            <td className="px-4 py-3 text-center">
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                                {c.is_reopened ? 'Dibuka Kembali' : 'Terkunci'}
                              </span>
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
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: INPUT JURNAL KOREKSI / PENYESUAIAN MANUAL                          */}
      {/* ========================================================================= */}
      {manualModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full p-6 shadow-xl border border-slate-100 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-slate-800 text-sm">Input Jurnal Koreksi / Penyesuaian Manual</h3>
                <p className="text-[11px] text-slate-500">Mencatat jurnal penyesuaian (*adjusting entry*) atau koreksi akuntansi</p>
              </div>
              <button onClick={() => setManualModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveManualJournal} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Peruntukan Tahun Ajaran *</label>
                  <select
                    value={manualForm.academic_year_id || selectedAcademicYearId || ''}
                    onChange={(e) => setManualForm(prev => ({ ...prev, academic_year_id: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800"
                  >
                    {academicYears.map(ay => (
                      <option key={ay.id} value={ay.id}>
                        {ay.name} {ay.is_active ? '(Aktif)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Tanggal Jurnal:</label>
                  <input
                    type="date"
                    required
                    value={manualForm.journal_date}
                    onChange={(e) => setManualForm(prev => ({ ...prev, journal_date: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Tipe Entri:</label>
                  <select
                    value={manualForm.source_type}
                    onChange={(e) => setManualForm(prev => ({ ...prev, source_type: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                  >
                    <option value="adjustment">Jurnal Penyesuaian (Adjustment)</option>
                    <option value="correction">Jurnal Koreksi Kesalahan (Correction)</option>
                    <option value="closing">Jurnal Penutup (Closing)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Uraian / Keterangan Transaksi:</label>
                <textarea
                  rows={2}
                  required
                  placeholder="Contoh: Penyesuaian beban sewa gedung dibayar di muka semester ganjil..."
                  value={manualForm.description}
                  onChange={(e) => setManualForm(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              {/* Lines Table */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-700">Rincian Pos Debit & Kredit:</span>
                  <button
                    type="button"
                    onClick={handleAddManualLine}
                    className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 hover:text-emerald-700"
                  >
                    <Plus className="w-3 h-3" /> Tambah Baris
                  </button>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
                  {manualForm.lines.map((line, idx) => (
                    <div key={idx} className="p-3 bg-slate-50/50 flex flex-col sm:flex-row items-center gap-3">
                      <div className="flex-1 w-full">
                        <select
                          value={line.chart_of_account_id}
                          onChange={(e) => handleManualLineChange(idx, 'chart_of_account_id', e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                        >
                          {coaList.map(acc => (
                            <option key={acc.id} value={acc.id}>
                              {acc.account_code} - {acc.account_name} ({acc.account_group})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="w-32">
                        <select
                          value={line.entry_side}
                          onChange={(e) => handleManualLineChange(idx, 'entry_side', e.target.value)}
                          className={`w-full px-2.5 py-1.5 border rounded-lg text-xs font-bold uppercase ${
                            line.entry_side === 'debit' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'
                          }`}
                        >
                          <option value="debit">DEBIT</option>
                          <option value="credit">KREDIT</option>
                        </select>
                      </div>

                      <div className="w-36">
                        <input
                          type="number"
                          required
                          min="1"
                          placeholder="Nominal Rp"
                          value={line.amount}
                          onChange={(e) => handleManualLineChange(idx, 'amount', e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold tnum"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveManualLine(idx)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded"
                        title="Hapus baris"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Balance Verification Footer */}
              <div className="p-3 bg-slate-100 rounded-xl flex items-center justify-between text-xs">
                <div>
                  Total Debit: <b className="text-emerald-700">{formatCurrency(manualForm.lines.filter(l => l.entry_side === 'debit').reduce((s, l) => s + parseFloat(l.amount || 0), 0))}</b>
                </div>
                <div>
                  Total Kredit: <b className="text-rose-700">{formatCurrency(manualForm.lines.filter(l => l.entry_side === 'credit').reduce((s, l) => s + parseFloat(l.amount || 0), 0))}</b>
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setManualModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submittingManual}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-xs transition"
                >
                  {submittingManual ? 'Membukukan...' : 'Simpan & Bukukan Jurnal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: DETAIL GARIS JURNAL UMUM                                           */}
      {/* ========================================================================= */}
      {journalModalOpen && selectedJournal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-slate-800 text-sm">Rincian Entri Jurnal #{selectedJournal.journal_number}</h3>
                <p className="text-[11px] text-slate-400">
                  {new Date(selectedJournal.journal_date).toLocaleDateString('id-ID', { dateStyle: 'full' })}
                </p>
              </div>
              <button onClick={() => setJournalModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="text-slate-500">Uraian Transaksi:</span>
                <p className="font-medium text-slate-800 mt-0.5">{selectedJournal.description}</p>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
                <div className="bg-slate-100 px-3 py-2 flex justify-between font-bold text-slate-600 text-[11px]">
                  <span>Akun & Sisi</span>
                  <span>Nominal (Rp)</span>
                </div>
                {selectedJournal.lines?.map((line, idx) => (
                  <div key={idx} className="px-3 py-2.5 flex items-center justify-between">
                    <div>
                      <p className="font-bold text-slate-800">{line.account_code} - {line.account_name}</p>
                      <span className={`inline-block px-1.5 py-0.2 rounded text-[9px] font-bold uppercase mt-0.5 ${
                        line.entry_side === 'debit' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                      }`}>
                        {line.entry_side}
                      </span>
                    </div>
                    <span className="font-bold tnum text-slate-900">
                      {formatCurrency(line.amount)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setJournalModalOpen(false)}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-semibold text-xs"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: TRANSAKSI TABUNGAN (SETOR / TARIK)                                 */}
      {/* ========================================================================= */}
      {savingModalOpen && selectedSaving && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-sm w-full p-6 shadow-xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-800 text-sm">
                {savingTxType === 'deposit' ? 'Setoran Tabungan Santri' : 'Penarikan Tabungan Santri'}
              </h3>
              <button onClick={() => setSavingModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavingTransaction} className="space-y-3 text-xs">
              <div>
                <span className="text-slate-500">Pemilik Rekening:</span>
                <p className="font-bold text-slate-800">{selectedSaving.owner_name || selectedSaving.student_name}</p>
                <p className="text-[11px] text-slate-400">No. Rek: {selectedSaving.account_number}</p>
                <p className="text-[11px] text-emerald-700 mt-1">Saldo Saat Ini: {formatCurrency(selectedSaving.balance)}</p>
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">
                  Nominal {savingTxType === 'deposit' ? 'Setor' : 'Tarik'} (Rp):
                </label>
                <input
                  type="number"
                  required
                  min="1000"
                  placeholder="Contoh: 100000"
                  value={savingAmount}
                  onChange={(e) => setSavingAmount(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold tnum text-sm"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSavingModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className={`px-4 py-2 text-white rounded-xl font-bold shadow-xs transition ${
                    savingTxType === 'deposit' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
                  }`}
                >
                  Eksekusi {savingTxType === 'deposit' ? 'Setoran' : 'Penarikan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
