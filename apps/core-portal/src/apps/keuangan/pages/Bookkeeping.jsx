import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../../shared/store/AuthContext';
import api from '../../../shared/services/api';
import * as XLSX from 'xlsx';
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
  Check
} from 'lucide-react';

export default function Bookkeeping() {
  const { activeSchoolUnit } = useAuth();
  const [academicYears, setAcademicYears] = useState([]);
  const [selectedAcademicYearId, setSelectedAcademicYearId] = useState('');

  // Main Tabs: 'journals' | 'ledger' | 'worksheet' | 'statements' | 'savings-closings'
  const [mainTab, setMainTab] = useState('journals');

  // Global & tab loading
  const [loading, setLoading] = useState(false);

  // ==========================================
  // TAB 1: JURNAL UMUM STATES
  // ==========================================
  const [journals, setJournals] = useState([]);
  const [selectedJournal, setSelectedJournal] = useState(null);
  const [journalModalOpen, setJournalModalOpen] = useState(false);
  const [manualModalOpen, setManualModalOpen] = useState(false);
  const [coaList, setCoaList] = useState([]);
  const [manualForm, setManualForm] = useState({
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

  // Main Fetch Data Controller
  const fetchData = async () => {
    setLoading(true);
    try {
      const commonParams = {};
      if (selectedAcademicYearId && selectedAcademicYearId !== 'all') {
        commonParams.academic_year_id = selectedAcademicYearId;
      }

      if (mainTab === 'journals') {
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
      setLedgerLoading(false);
      setWorksheetLoading(false);
      setStatementLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [mainTab, statementType, selectedLedgerAccountId, subTabOperations, activeSchoolUnit, selectedAcademicYearId]);

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

  // Formatters
  const formatCurrency = (val) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val || 0);
  };

  const filteredJournals = useMemo(() => {
    return journals.filter(j => {
      if (!journalSearch) return true;
      const q = journalSearch.toLowerCase();
      const num = (j.journal_number || '').toLowerCase();
      const desc = (j.description || '').toLowerCase();
      const src = (j.source_type || '').toLowerCase();
      const matchInLines = (j.lines || []).some(l => 
        (l.account_code || '').toLowerCase().includes(q) ||
        (l.account_name || '').toLowerCase().includes(q)
      );
      return num.includes(q) || desc.includes(q) || src.includes(q) || matchInLines;
    });
  }, [journals, journalSearch]);

  return (
    <div className="space-y-6">
      {/* Header Halaman & Filter Global */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
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
              className="flex items-center gap-2.5 bg-gradient-to-r from-emerald-50/90 via-teal-50/60 to-emerald-50/40 border border-emerald-300/90 hover:border-emerald-500 rounded-xl px-3 py-1.5 shadow-xs hover:shadow-sm transition-all text-left group cursor-pointer active:scale-98"
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
              <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-2xl shadow-xl border border-slate-200/90 z-50 p-2 space-y-1 animate-in fade-in zoom-in-95 duration-150">
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

      {/* TOP 5 TABS: SIKLUS AKUNTANSI STANDAR */}
      <div className="flex border-b border-slate-200 gap-6 overflow-x-auto">
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
      {/* TAB 1: JURNAL UMUM & PENYESUAIAN                                         */}
      {/* ========================================================================= */}
      {mainTab === 'journals' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="relative w-72">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Cari nomor jurnal, uraian, sumber..."
                value={journalSearch}
                onChange={(e) => setJournalSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <button
              type="button"
              onClick={() => setManualModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Input Jurnal Koreksi / Penyesuaian</span>
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-emerald-600" />
                <span className="font-bold text-slate-800">Daftar Transaksi Jurnal Umum ({filteredJournals.length})</span>
              </div>
              <div className="flex items-center gap-4 text-slate-600 text-xs">
                <span>Total Nilai Jurnal: <b className="font-mono text-emerald-700 font-extrabold">{formatCurrency(filteredJournals.reduce((s, j) => s + parseFloat(j.total_amount || 0), 0))}</b></span>
              </div>
            </div>

            {loading ? (
              <div className="p-12 flex flex-col items-center justify-center text-slate-400 gap-2">
                <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
                <span className="text-xs">Memuat entri jurnal umum...</span>
              </div>
            ) : filteredJournals.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-xs italic">
                Belum ada transaksi jurnal pada filter ini.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100/80 text-slate-700 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="px-4 py-3 w-56">Tanggal & No. Jurnal</th>
                      <th className="px-4 py-3">Akun Akuntansi & Uraian Transaksi</th>
                      <th className="px-4 py-3 text-center w-24">Posisi</th>
                      <th className="px-4 py-3 text-right w-44">Debit (Rp)</th>
                      <th className="px-4 py-3 text-right w-44">Kredit (Rp)</th>
                      <th className="px-4 py-3 text-center w-20">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y-2 divide-slate-200/90 bg-white">
                    {filteredJournals.map((j) => (
                      <React.Fragment key={j.id}>
                        {/* Header Row: Journal Summary & Description */}
                        <tr className="bg-slate-50/90 font-semibold border-t border-slate-200 text-slate-800">
                          <td className="px-4 py-2.5">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono font-extrabold text-slate-900">{j.journal_number}</span>
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase bg-slate-200 text-slate-700">
                                {j.source_type || 'system'}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                              <Calendar className="w-3 h-3 text-slate-400" />
                              {new Date(j.journal_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </p>
                          </td>
                          <td className="px-4 py-2.5">
                            <div className="text-slate-800 font-medium">
                              {j.description}
                              {j.is_manual_correction === 1 && (
                                <span className="ml-2 px-1.5 py-0.5 bg-amber-100 text-amber-800 text-[9px] font-bold rounded">
                                  Koreksi Manual
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-2.5 text-center">
                            {j.is_balanced ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                Seimbang
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                <AlertCircle className="w-3 h-3 text-rose-600" />
                                Tidak Seimbang
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono font-bold text-slate-800 text-[11px]">
                            Total: {formatCurrency(j.total_amount)}
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono font-bold text-slate-800 text-[11px]">
                            Total: {formatCurrency(j.total_amount)}
                          </td>
                          <td className="px-4 py-2.5 text-center">
                            <button
                              type="button"
                              onClick={() => handleViewJournalDetail(j.id)}
                              className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
                              title="Lihat Detail Garis Jurnal"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>

                        {/* Line details: Debited and Credited Accounts with Amounts */}
                        {(() => {
                          const lines = [...(j.lines || [])].sort((a, b) => {
                            if (a.entry_side === 'debit' && b.entry_side !== 'debit') return -1;
                            if (a.entry_side !== 'debit' && b.entry_side === 'debit') return 1;
                            return (a.id || 0) - (b.id || 0);
                          });

                          if (lines.length === 0) {
                            return (
                              <tr className="border-t border-slate-100 text-xs">
                                <td colSpan={6} className="px-4 py-2 text-center text-slate-400 italic">
                                  Tidak ada rincian baris jurnal.
                                </td>
                              </tr>
                            );
                          }

                          return lines.map((line, lIdx) => {
                            const isDebit = line.entry_side === 'debit';
                            return (
                              <tr key={lIdx} className="bg-white hover:bg-emerald-50/20 transition-colors border-t border-slate-100">
                                <td className="px-4 py-2 text-slate-400 text-[10px] pl-8">
                                  {/* Indent spacer */}
                                </td>
                                <td className="px-4 py-2">
                                  <div className={`flex items-center gap-2 ${isDebit ? 'font-bold text-slate-800 pl-2' : 'font-medium text-slate-700 pl-8 italic'}`}>
                                    <span className="font-mono text-xs text-slate-600 font-bold bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200/70">
                                      {line.account_code}
                                    </span>
                                    <span>{line.account_name}</span>
                                    <span className="text-[10px] text-slate-400 font-normal">({line.account_group})</span>
                                  </div>
                                </td>
                                <td className="px-4 py-2 text-center">
                                  <span className={`px-2 py-0.5 text-[9px] font-extrabold uppercase rounded-full tracking-wider ${
                                    isDebit ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-rose-100 text-rose-800 border border-rose-200'
                                  }`}>
                                    {isDebit ? 'DEBIT' : 'KREDIT'}
                                  </span>
                                </td>
                                <td className="px-4 py-2 text-right font-mono font-bold text-emerald-700">
                                  {isDebit ? formatCurrency(line.amount) : '-'}
                                </td>
                                <td className="px-4 py-2 text-right font-mono font-bold text-rose-700">
                                  {!isDebit ? formatCurrency(line.amount) : '-'}
                                </td>
                                <td></td>
                              </tr>
                            );
                          });
                        })()}
                      </React.Fragment>
                    ))}
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
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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
            <div className="p-12 bg-white rounded-2xl border border-slate-200 flex flex-col items-center justify-center text-slate-400 gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
              <span className="text-xs">Menghitung mutasi buku besar...</span>
            </div>
          ) : ledgerData.length === 0 ? (
            <div className="p-12 bg-white rounded-2xl border border-slate-200 text-center text-slate-400 text-xs italic">
              Tidak ada data buku besar untuk akun yang dipilih.
            </div>
          ) : (
            <div className="space-y-6">
              {ledgerData.map(acc => (
                <div key={acc.account_id} className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
                  <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <span className="font-mono font-extrabold text-sm text-slate-800 mr-2">{acc.account_code}</span>
                      <span className="font-bold text-sm text-slate-800">{acc.account_name}</span>
                      <span className="ml-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-700">
                        {acc.account_group}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-xs">
                      <span className="text-slate-500">Saldo Normal: <b className="uppercase">{acc.normal_balance}</b></span>
                      <span className="text-slate-500">Total Debit: <b className="font-mono text-emerald-700">{formatCurrency(acc.total_debit)}</b></span>
                      <span className="text-slate-500">Total Kredit: <b className="font-mono text-rose-700">{formatCurrency(acc.total_credit)}</b></span>
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
                              <td className="px-4 py-2 font-mono text-slate-600">
                                {new Date(m.journal_date).toLocaleDateString('id-ID')}
                              </td>
                              <td className="px-4 py-2 font-mono text-slate-800">{m.journal_number}</td>
                              <td className="px-4 py-2 text-slate-700 max-w-sm">{m.description}</td>
                              <td className="px-4 py-2 text-right font-mono text-emerald-600 font-medium">
                                {m.entry_side === 'debit' ? formatCurrency(m.amount) : '-'}
                              </td>
                              <td className="px-4 py-2 text-right font-mono text-rose-600 font-medium">
                                {m.entry_side === 'credit' ? formatCurrency(m.amount) : '-'}
                              </td>
                              <td className="px-4 py-2 text-right font-mono font-bold text-slate-900">
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
          <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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
            <div className="p-12 bg-white rounded-2xl border border-slate-200 flex flex-col items-center justify-center text-slate-400 gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
              <span className="text-xs">Menyusun lembar kerja (worksheet)...</span>
            </div>
          ) : !worksheetData ? (
            <div className="p-12 bg-white rounded-2xl border border-slate-200 text-center text-slate-400 text-xs italic">
              Data lembar kerja belum tersedia.
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-[11px]">
                  <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                    <tr>
                      <th rowSpan={2} className="px-3 py-2 border-r border-slate-200">Kode</th>
                      <th rowSpan={2} className="px-3 py-2 border-r border-slate-200 min-w-[180px]">Nama Akun</th>
                      <th colSpan={2} className="px-3 py-1.5 text-center border-r border-slate-200 bg-slate-200/60">Neraca Saldo Awal</th>
                      <th colSpan={2} className="px-3 py-1.5 text-center border-r border-slate-200 bg-amber-100/60">Penyesuaian</th>
                      <th colSpan={2} className="px-3 py-1.5 text-center border-r border-slate-200 bg-blue-100/60">Saldo Disesuaikan</th>
                      <th colSpan={2} className="px-3 py-1.5 text-center border-r border-slate-200 bg-purple-100/60">Laporan Aktivitas</th>
                      <th colSpan={2} className="px-3 py-1.5 text-center bg-emerald-100/60">Posisi Keuangan</th>
                    </tr>
                    <tr className="border-t border-slate-200 text-[10px]">
                      <th className="px-2 py-1 text-right bg-slate-100">Debit</th>
                      <th className="px-2 py-1 text-right border-r border-slate-200 bg-slate-100">Kredit</th>
                      <th className="px-2 py-1 text-right bg-amber-50">Debit</th>
                      <th className="px-2 py-1 text-right border-r border-slate-200 bg-amber-50">Kredit</th>
                      <th className="px-2 py-1 text-right bg-blue-50">Debit</th>
                      <th className="px-2 py-1 text-right border-r border-slate-200 bg-blue-50">Kredit</th>
                      <th className="px-2 py-1 text-right bg-purple-50">Debit</th>
                      <th className="px-2 py-1 text-right border-r border-slate-200 bg-purple-50">Kredit</th>
                      <th className="px-2 py-1 text-right bg-emerald-50">Debit</th>
                      <th className="px-2 py-1 text-right bg-emerald-50">Kredit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
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
                        <td className="px-2 py-2 text-right text-blue-700 bg-blue-50/20">{row.adjusted.debit ? formatCurrency(row.adjusted.debit) : '-'}</td>
                        <td className="px-2 py-2 text-right text-blue-700 bg-blue-50/20 border-r border-slate-100">{row.adjusted.credit ? formatCurrency(row.adjusted.credit) : '-'}</td>
                        {/* 4. Activity */}
                        <td className="px-2 py-2 text-right text-purple-700 bg-purple-50/20">{row.activity_statement.debit ? formatCurrency(row.activity_statement.debit) : '-'}</td>
                        <td className="px-2 py-2 text-right text-purple-700 bg-purple-50/20 border-r border-slate-100">{row.activity_statement.credit ? formatCurrency(row.activity_statement.credit) : '-'}</td>
                        {/* 5. Balance Sheet */}
                        <td className="px-2 py-2 text-right text-emerald-700 bg-emerald-50/20">{row.balance_sheet.debit ? formatCurrency(row.balance_sheet.debit) : '-'}</td>
                        <td className="px-2 py-2 text-right text-emerald-700 bg-emerald-50/20">{row.balance_sheet.credit ? formatCurrency(row.balance_sheet.credit) : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                  {/* Totals Row */}
                  <tfoot className="bg-slate-100 font-mono font-bold text-slate-900 border-t-2 border-slate-300">
                    <tr>
                      <td colSpan={2} className="px-3 py-2 text-center font-sans">TOTAL</td>
                      <td className="px-2 py-2 text-right">{formatCurrency(worksheetData.totals.unadjusted_debit)}</td>
                      <td className="px-2 py-2 text-right border-r border-slate-300">{formatCurrency(worksheetData.totals.unadjusted_credit)}</td>
                      <td className="px-2 py-2 text-right text-amber-800 bg-amber-100/50">{formatCurrency(worksheetData.totals.adjustment_debit)}</td>
                      <td className="px-2 py-2 text-right text-amber-800 bg-amber-100/50 border-r border-slate-300">{formatCurrency(worksheetData.totals.adjustment_credit)}</td>
                      <td className="px-2 py-2 text-right text-blue-800 bg-blue-100/50">{formatCurrency(worksheetData.totals.adjusted_debit)}</td>
                      <td className="px-2 py-2 text-right text-blue-800 bg-blue-100/50 border-r border-slate-300">{formatCurrency(worksheetData.totals.adjusted_credit)}</td>
                      <td className="px-2 py-2 text-right text-purple-800 bg-purple-100/50">{formatCurrency(worksheetData.totals.activity_debit)}</td>
                      <td className="px-2 py-2 text-right text-purple-800 bg-purple-100/50 border-r border-slate-300">{formatCurrency(worksheetData.totals.activity_credit)}</td>
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
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-4">
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
            <div className="p-12 bg-white rounded-2xl border border-slate-200 flex flex-col items-center justify-center text-slate-400 gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
              <span className="text-xs">Menyiapkan laporan keuangan...</span>
            </div>
          ) : !statementData ? (
            <div className="p-12 bg-white rounded-2xl border border-slate-200 text-center text-slate-400 text-xs italic">
              Laporan keuangan belum dapat ditampilkan.
            </div>
          ) : (
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-6">
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
                          <span className="font-mono font-medium text-slate-800">{formatCurrency(a.debit - a.credit)}</span>
                        </div>
                      ))}
                      <div className="flex justify-between px-4 py-3 bg-blue-50 font-bold text-blue-900 font-mono">
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
                          <span className="font-mono font-medium text-slate-800">{formatCurrency(l.credit - l.debit)}</span>
                        </div>
                      ))}
                      <div className="flex justify-between px-4 py-2 bg-slate-50 font-semibold text-slate-700 text-[11px]">
                        <span>Subtotal Kewajiban</span>
                        <span>{formatCurrency(statementData.total_liabilities)}</span>
                      </div>

                      {statementData.equity?.map((eq, i) => (
                        <div key={i} className="flex justify-between px-4 py-2.5">
                          <span className="text-slate-600">{eq.account_name}</span>
                          <span className="font-mono font-medium text-slate-800">{formatCurrency(eq.credit - eq.debit)}</span>
                        </div>
                      ))}
                      <div className="flex justify-between px-4 py-2 bg-slate-50 font-semibold text-slate-700 text-[11px]">
                        <span>Subtotal Aset Neto</span>
                        <span>{formatCurrency(statementData.total_equity)}</span>
                      </div>

                      <div className="flex justify-between px-4 py-3 bg-purple-50 font-bold text-purple-900 font-mono">
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
                          <span className="font-mono font-medium">{formatCurrency(r.credit - r.debit)}</span>
                        </div>
                      ))}
                      <div className="flex justify-between px-4 py-2.5 bg-emerald-50 font-bold text-emerald-900 font-mono">
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
                          <span className="font-mono font-medium">{formatCurrency(e.debit - e.credit)}</span>
                        </div>
                      ))}
                      <div className="flex justify-between px-4 py-2.5 bg-rose-50 font-bold text-rose-900 font-mono">
                        <span>TOTAL BEBAN</span>
                        <span>{formatCurrency(statementData.total_expense)}</span>
                      </div>
                    </div>
                  </div>

                  <div className={`p-4 rounded-xl border flex items-center justify-between text-sm font-extrabold ${statementData.is_surplus ? 'bg-emerald-100 border-emerald-300 text-emerald-950' : 'bg-red-100 border-red-300 text-red-950'}`}>
                    <span>SURPLUS / (DEFISIT) BERSIH PERIODE</span>
                    <span className="font-mono">{formatCurrency(statementData.net_income)}</span>
                  </div>
                </div>
              )}

              {/* Laporan Arus Kas View */}
              {statementType === 'cash-flow' && (
                <div className="max-w-2xl mx-auto space-y-6 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200">
                      <span className="text-[11px] font-semibold text-emerald-700">Total Kas Masuk</span>
                      <p className="text-base font-extrabold text-emerald-900 mt-1 font-mono">{formatCurrency(statementData.total_inflow)}</p>
                    </div>
                    <div className="p-4 rounded-xl bg-rose-50 border border-rose-200">
                      <span className="text-[11px] font-semibold text-rose-700">Total Kas Keluar</span>
                      <p className="text-base font-extrabold text-rose-900 mt-1 font-mono">{formatCurrency(statementData.total_outflow)}</p>
                    </div>
                    <div className={`p-4 rounded-xl border ${statementData.net_cash_flow >= 0 ? 'bg-blue-50 border-blue-200 text-blue-950' : 'bg-amber-50 border-amber-200 text-amber-950'}`}>
                      <span className="text-[11px] font-semibold">Arus Kas Bersih</span>
                      <p className="text-base font-extrabold mt-1 font-mono">{formatCurrency(statementData.net_cash_flow)}</p>
                    </div>
                  </div>

                  <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
                    <div className="px-4 py-2.5 bg-slate-50 font-bold text-slate-700">Rincian Arus Kas Masuk & Keluar</div>
                    {statementData.cash_movements?.map((m, i) => (
                      <div key={i} className="flex justify-between px-4 py-2.5">
                        <span className="text-slate-600">{m.account_name}</span>
                        <span className={`font-mono font-medium ${m.movement >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
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
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
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
                          <td className="px-4 py-3 font-mono font-bold text-slate-800">{s.account_number}</td>
                          <td className="px-4 py-3 font-medium text-slate-800">{s.owner_name || s.student_name || 'Santri'}</td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-100 text-slate-700">
                              {s.owner_type || 'student'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right font-mono font-bold text-emerald-800">
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
              <div className="p-4 bg-amber-50/80 border border-amber-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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

              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
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
                            <td className="px-4 py-3 text-right font-mono font-bold text-emerald-800">{formatCurrency(c.net_surplus_deficit || 0)}</td>
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
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-xl border border-slate-100 space-y-4 max-h-[90vh] overflow-y-auto">
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
              <div className="grid grid-cols-2 gap-4">
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
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono font-bold"
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
              <div className="p-3 bg-slate-100 rounded-xl flex items-center justify-between text-xs font-mono">
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
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-100 space-y-4">
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
                    <span className="font-mono font-bold text-slate-900">
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
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl border border-slate-100 space-y-4">
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
                <p className="text-[11px] text-slate-400 font-mono">No. Rek: {selectedSaving.account_number}</p>
                <p className="text-[11px] text-emerald-700 font-mono mt-1">Saldo Saat Ini: {formatCurrency(selectedSaving.balance)}</p>
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
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-sm"
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
