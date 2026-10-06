import React, { useState, useEffect, useMemo } from 'react';
import api from '../../../shared/services/api';
import StatusPill from '../../../shared/components/StatusPill';
import FlatAlertBanner from '../../../shared/components/FlatAlertBanner';
import { formatCurrency, formatDate } from '../../../shared/utils/formatters';
import {
  BookOpen,
  Layers,
  Scale,
  TrendingUp,
  FileSpreadsheet,
  PieChart,
  DollarSign,
  Plus,
  Search,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Trash2,
  Printer,
  RefreshCw,
  ArrowRight,
  ArrowDownLeft,
  ArrowUpRight,
  Calendar,
  Building2,
  BadgePercent,
  Activity,
  ShieldCheck,
  Coins,
  Receipt,
  X
} from 'lucide-react';

const JOURNAL_TYPES = [
  { value: 'general', label: 'Jurnal Umum (General)', badge: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  { value: 'adjustment', label: 'Jurnal Penyesuaian (Adjustment)', badge: 'bg-amber-50 text-amber-700 border-amber-200' },
  { value: 'closing', label: 'Jurnal Penutup (Closing)', badge: 'bg-rose-50 text-rose-700 border-rose-200' },
  { value: 'reversing', label: 'Jurnal Pembalik (Reversing)', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200' }
];

export default function AkuntansiKantin() {
  const [activeTab, setActiveTab] = useState('journals'); // 'journals' | 'ledger' | 'worksheet' | 'income_statement' | 'equity' | 'cashflow' | 'ratios'
  
  // Filters
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [search, setSearch] = useState('');

  // States per Tab
  const [journals, setJournals] = useState([]);
  const [ledgerData, setLedgerData] = useState(null);
  const [selectedLedgerAccount, setSelectedLedgerAccount] = useState('all');
  const [worksheetData, setWorksheetData] = useState(null);
  const [financialStatements, setFinancialStatements] = useState(null);
  const [financialRatios, setFinancialRatios] = useState(null);
  const [coaList, setCoaList] = useState([]);

  const [loading, setLoading] = useState(false);

  // Modal Jurnal Baru
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const [journalForm, setJournalForm] = useState({
    entry_type: 'general',
    entry_date: new Date().toISOString().slice(0, 10),
    reference_number: '',
    description: '',
    lines: [
      { coa_account_id: '', coa_account_code: '', coa_account_name: '', debit: '', credit: '', memo: '' },
      { coa_account_id: '', coa_account_code: '', coa_account_name: '', debit: '', credit: '', memo: '' }
    ]
  });

  // Modal Hapus Jurnal
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Load COA Accounts
  const fetchCoaAccounts = async () => {
    try {
      const res = await api.get('/kantin/operational-expenses/coa-accounts');
      setCoaList(res.data?.data?.accounts || []);
    } catch (err) {
      console.warn('Gagal memuat COA:', err.message);
    }
  };

  // Fetch Data sesuai Tab Aktif
  const fetchTabData = async () => {
    setLoading(true);
    try {
      const params = {
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
        search: search.trim() || undefined
      };

      if (activeTab === 'journals') {
        const res = await api.get('/kantin/accounting/journals', {
          params: { ...params, entry_type: filterType !== 'all' ? filterType : undefined }
        });
        setJournals(res.data?.data || []);
      } else if (activeTab === 'ledger') {
        const res = await api.get('/kantin/accounting/general-ledger', { params });
        setLedgerData(res.data?.data || null);
      } else if (activeTab === 'worksheet') {
        const res = await api.get('/kantin/accounting/worksheet', { params });
        setWorksheetData(res.data?.data || null);
      } else if (activeTab === 'income_statement' || activeTab === 'equity' || activeTab === 'cashflow') {
        const res = await api.get('/kantin/accounting/financial-statements', { params });
        setFinancialStatements(res.data?.data || null);
      } else if (activeTab === 'ratios') {
        const res = await api.get('/kantin/accounting/financial-ratios', { params });
        setFinancialRatios(res.data?.data || null);
      }
    } catch (err) {
      console.error('Error fetching accounting tab data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCoaAccounts();
  }, []);

  useEffect(() => {
    fetchTabData();
  }, [activeTab, dateFrom, dateTo, filterType]);

  // Handle Form Lines
  const handleLineChange = (index, field, value) => {
    const updated = [...journalForm.lines];
    if (field === 'coa') {
      const selected = coaList.find(c => String(c.id) === String(value) || c.account_code === value);
      if (selected) {
        updated[index].coa_account_id = selected.id;
        updated[index].coa_account_code = selected.account_code;
        updated[index].coa_account_name = selected.account_name;
      }
    } else {
      updated[index][field] = value;
    }
    setJournalForm({ ...journalForm, lines: updated });
  };

  const handleAddLine = () => {
    setJournalForm({
      ...journalForm,
      lines: [
        ...journalForm.lines,
        { coa_account_id: '', coa_account_code: '', coa_account_name: '', debit: '', credit: '', memo: '' }
      ]
    });
  };

  const handleRemoveLine = (index) => {
    if (journalForm.lines.length <= 2) return;
    const updated = journalForm.lines.filter((_, i) => i !== index);
    setJournalForm({ ...journalForm, lines: updated });
  };

  // Hitung Total Debit & Credit di Form
  const formTotals = useMemo(() => {
    let d = 0, c = 0;
    journalForm.lines.forEach(l => {
      d += parseFloat(l.debit || 0);
      c += parseFloat(l.credit || 0);
    });
    return {
      debit: d,
      credit: c,
      is_balanced: Math.abs(d - c) < 0.01 && d > 0,
      diff: Math.abs(d - c)
    };
  }, [journalForm.lines]);

  // Submit Jurnal Baru
  const handleSubmitJournal = async (e) => {
    e.preventDefault();
    if (!formTotals.is_balanced) {
      setError(`Jurnal belum seimbang (selisih ${formatCurrency(formTotals.diff)})`);
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await api.post('/kantin/accounting/journals', journalForm);
      setShowModal(false);
      setJournalForm({
        entry_type: 'general',
        entry_date: new Date().toISOString().slice(0, 10),
        reference_number: '',
        description: '',
        lines: [
          { coa_account_id: '', coa_account_code: '', coa_account_name: '', debit: '', credit: '', memo: '' },
          { coa_account_id: '', coa_account_code: '', coa_account_name: '', debit: '', credit: '', memo: '' }
        ]
      });
      fetchTabData();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Gagal menyimpan jurnal');
    } finally {
      setSubmitting(false);
    }
  };

  // Delete Jurnal
  const handleDeleteJournal = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/kantin/accounting/journals/${deleteTarget.id}`);
      setDeleteTarget(null);
      fetchTabData();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menghapus entri jurnal');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Halaman */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-800 tracking-tight">Siklus &amp; Laporan Akuntansi SBU Kantin</h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-300">
              Full Accounting Cycle
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Pembukuan akuntansi mandiri: Jurnal Umum, Penyesuaian, Buku Besar, Neraca Lajur 10 Kolom, Laporan Keuangan &amp; Analisis Rasio
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => {
              setShowModal(true);
              setError(null);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-xs transition"
          >
            <Plus className="w-4 h-4" />
            <span>Buat Jurnal Baru</span>
          </button>
        </div>
      </div>

      {/* Tab Navigation (Siklus Akuntansi Runtut) */}
      <div className="flex items-center gap-1.5 border-b border-slate-200 pb-2 overflow-x-auto custom-scrollbar">
        {[
          { id: 'journals', label: '1. Jurnal & Transaksi', icon: BookOpen },
          { id: 'ledger', label: '2. Buku Besar (Ledger)', icon: Layers },
          { id: 'worksheet', label: '3. Kertas Kerja (10 Kolom)', icon: FileSpreadsheet },
          { id: 'income_statement', label: '4. Laba Rugi', icon: Scale },
          { id: 'equity', label: '5. Perubahan Modal', icon: Coins },
          { id: 'cashflow', label: '6. Arus Kas', icon: DollarSign },
          { id: 'ratios', label: '7. Analisis Rasio', icon: Activity }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 shrink-0 ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* FILTER BAR GLOBAL */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5 flex-1">
          {activeTab === 'journals' && (
            <div className="relative min-w-[200px] flex-1 max-w-xs">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari nomor bukti, uraian..."
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:border-indigo-500"
              />
            </div>
          )}

          {activeTab === 'journals' && (
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-medium"
            >
              <option value="all">Semua Jenis Jurnal</option>
              {JOURNAL_TYPES.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          )}

          {/* Filter Tanggal */}
          <div className="flex items-center gap-1.5">
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700"
              title="Dari Tanggal"
            />
            <span className="text-xs text-slate-400">s/d</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700"
              title="Sampai Tanggal"
            />
          </div>

          {(dateFrom || dateTo || filterType !== 'all' || search) && (
            <button
              type="button"
              onClick={() => {
                setDateFrom('');
                setDateTo('');
                setFilterType('all');
                setSearch('');
              }}
              className="text-xs text-slate-500 hover:text-rose-600 font-medium px-2 py-1"
            >
              Reset Filter
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={fetchTabData}
          title="Refresh Data"
          className="p-2 text-slate-500 hover:text-indigo-700 hover:bg-slate-100 rounded-xl border border-slate-200 transition"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: JURNAL & TRANSAKSI */}
      {/* ========================================================================= */}
      {activeTab === 'journals' && (
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-2">
              <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
              <p className="text-xs text-slate-400">Memuat data jurnal akuntansi...</p>
            </div>
          ) : (
            <div className="table-container">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3">No. Jurnal &amp; Tanggal</th>
                    <th className="px-4 py-3">Tipe &amp; Uraian</th>
                    <th className="px-4 py-3">Rincian Akun (Debet / Kredit)</th>
                    <th className="px-4 py-3 text-right">Total Debet</th>
                    <th className="px-4 py-3 text-right">Total Kredit</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-4 py-3 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {journals.map((entry) => {
                    const typeObj = JOURNAL_TYPES.find(t => t.value === entry.entry_type);
                    return (
                      <tr key={entry.id} className="hover:bg-slate-50/60 transition">
                        <td className="px-4 py-3 align-top">
                          <div className="font-mono font-bold text-slate-800 text-[11px]">
                            {entry.entry_number}
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            {formatDate(entry.entry_date)}
                          </div>
                        </td>

                        <td className="px-4 py-3 align-top">
                          <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border mb-1 ${typeObj?.badge || 'bg-slate-100 text-slate-700'}`}>
                            {typeObj?.label || entry.entry_type}
                          </span>
                          <div className="font-semibold text-slate-800">{entry.description}</div>
                          {entry.reference_number && (
                            <div className="text-[10px] text-slate-400 mt-0.5 font-mono">
                              Ref: {entry.reference_number}
                            </div>
                          )}
                        </td>

                        <td className="px-4 py-3 align-top">
                          <div className="space-y-1">
                            {entry.lines.map((l, idx) => (
                              <div key={idx} className="flex items-center justify-between gap-4 text-[11px] font-mono">
                                <span className={l.credit > 0 ? 'pl-4 text-slate-600' : 'font-semibold text-slate-800'}>
                                  [{l.coa_account_code}] {l.coa_account_name}
                                </span>
                                <span className={l.debit > 0 ? 'text-emerald-700 font-bold' : 'text-slate-500'}>
                                  {l.debit > 0 ? formatCurrency(l.debit) : formatCurrency(l.credit)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </td>

                        <td className="px-4 py-3 align-top text-right font-mono font-bold text-slate-800">
                          {formatCurrency(entry.total_debit)}
                        </td>

                        <td className="px-4 py-3 align-top text-right font-mono font-bold text-slate-800">
                          {formatCurrency(entry.total_credit)}
                        </td>

                        <td className="px-4 py-3 align-top text-center">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                            POSTED
                          </span>
                        </td>

                        <td className="px-4 py-3 align-top text-center">
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(entry)}
                            title="Hapus Jurnal"
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}

                  {journals.length === 0 && (
                    <tr>
                      <td colSpan="7" className="py-12 text-center text-slate-400 italic">
                        Belum ada entri jurnal akuntansi yang tercatat
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: BUKU BESAR (GENERAL LEDGER) */}
      {/* ========================================================================= */}
      {activeTab === 'ledger' && (
        <div className="space-y-6">
          {ledgerData?.accounts?.length > 0 ? (
            ledgerData.accounts.map((acc) => (
              <div key={acc.account_code} className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
                <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded bg-indigo-600 text-white font-mono text-xs font-bold">
                      [{acc.account_code}]
                    </span>
                    <h3 className="text-xs font-bold text-slate-800">{acc.account_name}</h3>
                    <span className="text-[10px] font-medium text-slate-400 uppercase">
                      (Saldo Normal: {acc.normal_balance?.toUpperCase()})
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-xs">
                    <div>
                      <span className="text-slate-400">Total Debet: </span>
                      <span className="font-mono font-bold text-slate-700">{formatCurrency(acc.total_debit)}</span>
                    </div>
                    <div>
                      <span className="text-slate-400">Total Kredit: </span>
                      <span className="font-mono font-bold text-slate-700">{formatCurrency(acc.total_credit)}</span>
                    </div>
                    <div className="px-2 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold font-mono">
                      Saldo Akhir: {formatCurrency(acc.closing_balance)}
                    </div>
                  </div>
                </div>

                <div className="table-container">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50/50 text-slate-500 font-semibold border-b border-slate-100 text-[11px]">
                      <tr>
                        <th className="px-4 py-2">Tanggal &amp; No. Bukti</th>
                        <th className="px-4 py-2">Jenis Transaksi</th>
                        <th className="px-4 py-2">Uraian / Memo</th>
                        <th className="px-4 py-2 text-right">Debet</th>
                        <th className="px-4 py-2 text-right">Kredit</th>
                        <th className="px-4 py-2 text-right">Saldo Berjalan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                      {acc.lines.map((line, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/60">
                          <td className="px-4 py-2 font-sans">
                            <span className="font-bold text-slate-800 font-mono">{line.ref_no}</span>
                            <span className="text-[10px] text-slate-400 block">{formatDate(line.date)}</span>
                          </td>
                          <td className="px-4 py-2 font-sans">
                            <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-medium">
                              {line.type}
                            </span>
                          </td>
                          <td className="px-4 py-2 font-sans text-slate-800 font-medium">
                            {line.description}
                          </td>
                          <td className="px-4 py-2 text-right text-emerald-700 font-bold">
                            {line.debit > 0 ? formatCurrency(line.debit) : '-'}
                          </td>
                          <td className="px-4 py-2 text-right text-rose-700 font-bold">
                            {line.credit > 0 ? formatCurrency(line.credit) : '-'}
                          </td>
                          <td className="px-4 py-2 text-right font-bold text-slate-900 bg-slate-50/50">
                            {formatCurrency(line.balance)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))
          ) : (
            <div className="p-12 text-center text-slate-400 italic bg-white rounded-xl border border-slate-200">
              Belum ada mutasi buku besar tercatat
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: KERTAS KERJA / NERACA LAJUR (10 KOLOM) */}
      {/* ========================================================================= */}
      {activeTab === 'worksheet' && (
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden space-y-2">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Kertas Kerja / Neraca Lajur 10 Kolom (Worksheet)</h3>
              <p className="text-xs text-slate-400">Lembar kerja penyusunan laporan keuangan sebelum &amp; sesudah penyesuaian</p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${
                worksheetData?.is_balanced
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-amber-50 text-amber-800 border-amber-200'
              }`}>
                {worksheetData?.is_balanced ? '✓ Seimbang (Balanced)' : 'Selisih Penyesuaian'}
              </span>
            </div>
          </div>

          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left text-xs border-collapse font-mono">
              <thead className="bg-slate-100 text-slate-700 font-bold text-center border-b border-slate-300">
                <tr>
                  <th rowSpan="2" className="px-3 py-2 border-r border-slate-200 text-left font-sans">Kode &amp; Nama Akun</th>
                  <th colSpan="2" className="px-2 py-1 border-r border-slate-200 bg-slate-200/70">Neraca Saldo</th>
                  <th colSpan="2" className="px-2 py-1 border-r border-slate-200 bg-amber-100/70">Penyesuaian</th>
                  <th colSpan="2" className="px-2 py-1 border-r border-slate-200 bg-indigo-100/70">Neraca Saldo Disesuaikan</th>
                  <th colSpan="2" className="px-2 py-1 border-r border-slate-200 bg-emerald-100/70">Laba Rugi</th>
                  <th colSpan="2" className="px-2 py-1 bg-purple-100/70">Neraca</th>
                </tr>
                <tr className="text-[10px] text-slate-500 border-t border-slate-200">
                  <th className="px-2 py-1 border-r border-slate-200">Debet</th>
                  <th className="px-2 py-1 border-r border-slate-200">Kredit</th>
                  <th className="px-2 py-1 border-r border-slate-200">Debet</th>
                  <th className="px-2 py-1 border-r border-slate-200">Kredit</th>
                  <th className="px-2 py-1 border-r border-slate-200">Debet</th>
                  <th className="px-2 py-1 border-r border-slate-200">Kredit</th>
                  <th className="px-2 py-1 border-r border-slate-200">Debet</th>
                  <th className="px-2 py-1 border-r border-slate-200">Kredit</th>
                  <th className="px-2 py-1 border-r border-slate-200">Debet</th>
                  <th className="px-2 py-1">Kredit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-[11px]">
                {worksheetData?.rows?.map((r, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/70">
                    <td className="px-3 py-2 font-sans font-medium text-slate-800 border-r border-slate-100">
                      <span className="font-bold font-mono">[{r.account_code}]</span> {r.account_name}
                    </td>
                    <td className="px-2 py-1.5 text-right border-r border-slate-100">{r.trial_balance.debit > 0 ? formatCurrency(r.trial_balance.debit) : '-'}</td>
                    <td className="px-2 py-1.5 text-right border-r border-slate-100">{r.trial_balance.credit > 0 ? formatCurrency(r.trial_balance.credit) : '-'}</td>
                    <td className="px-2 py-1.5 text-right border-r border-slate-100 text-amber-700 font-semibold">{r.adjustments.debit > 0 ? formatCurrency(r.adjustments.debit) : '-'}</td>
                    <td className="px-2 py-1.5 text-right border-r border-slate-100 text-amber-700 font-semibold">{r.adjustments.credit > 0 ? formatCurrency(r.adjustments.credit) : '-'}</td>
                    <td className="px-2 py-1.5 text-right border-r border-slate-100 text-indigo-700 font-semibold">{r.adjusted_trial_balance.debit > 0 ? formatCurrency(r.adjusted_trial_balance.debit) : '-'}</td>
                    <td className="px-2 py-1.5 text-right border-r border-slate-100 text-indigo-700 font-semibold">{r.adjusted_trial_balance.credit > 0 ? formatCurrency(r.adjusted_trial_balance.credit) : '-'}</td>
                    <td className="px-2 py-1.5 text-right border-r border-slate-100 text-emerald-700">{r.income_statement.debit > 0 ? formatCurrency(r.income_statement.debit) : '-'}</td>
                    <td className="px-2 py-1.5 text-right border-r border-slate-100 text-emerald-700 font-bold">{r.income_statement.credit > 0 ? formatCurrency(r.income_statement.credit) : '-'}</td>
                    <td className="px-2 py-1.5 text-right border-r border-slate-100 text-purple-700">{r.balance_sheet.debit > 0 ? formatCurrency(r.balance_sheet.debit) : '-'}</td>
                    <td className="px-2 py-1.5 text-right text-purple-700">{r.balance_sheet.credit > 0 ? formatCurrency(r.balance_sheet.credit) : '-'}</td>
                  </tr>
                ))}

                {/* Baris Total Kolom */}
                {worksheetData?.totals && (
                  <tr className="bg-slate-100 font-bold text-slate-800 border-t-2 border-slate-300">
                    <td className="px-3 py-2 font-sans">TOTAL</td>
                    <td className="px-2 py-1.5 text-right border-r border-slate-200">{formatCurrency(worksheetData.totals.trial_balance.debit)}</td>
                    <td className="px-2 py-1.5 text-right border-r border-slate-200">{formatCurrency(worksheetData.totals.trial_balance.credit)}</td>
                    <td className="px-2 py-1.5 text-right border-r border-slate-200 text-amber-800">{formatCurrency(worksheetData.totals.adjustments.debit)}</td>
                    <td className="px-2 py-1.5 text-right border-r border-slate-200 text-amber-800">{formatCurrency(worksheetData.totals.adjustments.credit)}</td>
                    <td className="px-2 py-1.5 text-right border-r border-slate-200 text-indigo-800">{formatCurrency(worksheetData.totals.adjusted_trial_balance.debit)}</td>
                    <td className="px-2 py-1.5 text-right border-r border-slate-200 text-indigo-800">{formatCurrency(worksheetData.totals.adjusted_trial_balance.credit)}</td>
                    <td className="px-2 py-1.5 text-right border-r border-slate-200 text-emerald-800">{formatCurrency(worksheetData.totals.income_statement.debit)}</td>
                    <td className="px-2 py-1.5 text-right border-r border-slate-200 text-emerald-800">{formatCurrency(worksheetData.totals.income_statement.credit)}</td>
                    <td className="px-2 py-1.5 text-right border-r border-slate-200 text-purple-800">{formatCurrency(worksheetData.totals.balance_sheet.debit)}</td>
                    <td className="px-2 py-1.5 text-right text-purple-800">{formatCurrency(worksheetData.totals.balance_sheet.credit)}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: LAPORAN LABA RUGI */}
      {/* ========================================================================= */}
      {activeTab === 'income_statement' && (
        <div className="bg-white rounded-xl border border-slate-200/80 p-6 shadow-xs space-y-6 max-w-4xl mx-auto">
          <div className="text-center pb-4 border-b border-slate-200">
            <h2 className="text-base font-bold text-slate-800">YAYASAN ALDEPOS</h2>
            <h3 className="text-sm font-semibold text-indigo-600">LAPORAN LABA RUGI OPERASIONAL SBU KANTIN</h3>
            <p className="text-xs text-slate-400 mt-1">Periode: {financialStatements?.period?.from} s/d {financialStatements?.period?.to}</p>
          </div>

          <div className="space-y-6 text-xs">
            {/* 1. PENDAPATAN */}
            <div className="space-y-2">
              <h4 className="font-bold text-emerald-800 uppercase tracking-wide border-b border-emerald-100 pb-1">
                1. Pendapatan Operasional
              </h4>
              <div className="space-y-1.5 pl-2">
                {financialStatements?.income_statement?.revenues?.map((rev, i) => (
                  <div key={i} className="flex justify-between items-center py-1 border-b border-slate-50">
                    <span className="text-slate-700">{rev.name}</span>
                    <span className="font-mono font-semibold text-slate-900">{formatCurrency(rev.amount)}</span>
                  </div>
                ))}
                <div className="flex justify-between items-center pt-2 font-bold text-emerald-900 bg-emerald-50/60 p-2 rounded-lg">
                  <span>TOTAL PENDAPATAN OPERASIONAL</span>
                  <span className="font-mono">{formatCurrency(financialStatements?.income_statement?.total_revenue || 0)}</span>
                </div>
              </div>
            </div>

            {/* 2. BEBAN */}
            <div className="space-y-2">
              <h4 className="font-bold text-rose-800 uppercase tracking-wide border-b border-rose-100 pb-1">
                2. Beban Operasional
              </h4>
              <div className="space-y-1.5 pl-2">
                {financialStatements?.income_statement?.expenses?.map((exp, i) => (
                  <div key={i} className="flex justify-between items-center py-1 border-b border-slate-50">
                    <span className="text-slate-700">{exp.name}</span>
                    <span className="font-mono font-semibold text-slate-900">{formatCurrency(exp.amount)}</span>
                  </div>
                ))}
                <div className="flex justify-between items-center pt-2 font-bold text-rose-900 bg-rose-50/60 p-2 rounded-lg">
                  <span>TOTAL BEBAN OPERASIONAL</span>
                  <span className="font-mono">{formatCurrency(financialStatements?.income_statement?.total_expense || 0)}</span>
                </div>
              </div>
            </div>

            {/* 3. LABA / RUGI BERSIH */}
            <div className="p-4 rounded-xl bg-slate-900 text-white flex items-center justify-between font-mono">
              <div>
                <span className="text-xs uppercase font-bold text-indigo-300 block">Laba / (Rugi) Bersih Operasional</span>
                <span className="text-[10px] text-slate-400 font-sans">Surplus pendapatan terhadap seluruh beban operasional</span>
              </div>
              <span className={`text-xl font-extrabold ${
                (financialStatements?.income_statement?.net_operating_income || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}>
                {formatCurrency(financialStatements?.income_statement?.net_operating_income || 0)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: LAPORAN PERUBAHAN MODAL */}
      {/* ========================================================================= */}
      {activeTab === 'equity' && (
        <div className="bg-white rounded-xl border border-slate-200/80 p-6 shadow-xs space-y-6 max-w-4xl mx-auto">
          <div className="text-center pb-4 border-b border-slate-200">
            <h2 className="text-base font-bold text-slate-800">YAYASAN ALDEPOS</h2>
            <h3 className="text-sm font-semibold text-indigo-600">LAPORAN PERUBAHAN MODAL / EKUITAS SBU KANTIN</h3>
            <p className="text-xs text-slate-400 mt-1">Periode: {financialStatements?.period?.from} s/d {financialStatements?.period?.to}</p>
          </div>

          <div className="space-y-4 text-xs">
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="font-semibold text-slate-700">Modal Awal Unit Usaha Kantin</span>
              <span className="font-mono font-bold text-slate-900">{formatCurrency(financialStatements?.statement_of_equity?.opening_capital || 0)}</span>
            </div>

            <div className="flex justify-between py-2 border-b border-slate-100 text-indigo-700">
              <span>(+) Setoran Modal Awal / Tambahan Modal Kerja (BKM)</span>
              <span className="font-mono font-bold">{formatCurrency(financialStatements?.statement_of_equity?.additional_investment || 0)}</span>
            </div>

            <div className="flex justify-between py-2 border-b border-slate-100 text-emerald-700">
              <span>(+) Laba Bersih Periode Berjalan</span>
              <span className="font-mono font-bold">{formatCurrency(financialStatements?.statement_of_equity?.net_income || 0)}</span>
            </div>

            <div className="flex justify-between py-2 border-b border-slate-100 text-rose-700">
              <span>(-) Prive / Setoran Dividen ke Yayasan</span>
              <span className="font-mono font-bold">{formatCurrency(financialStatements?.statement_of_equity?.drawings_or_dividends || 0)}</span>
            </div>

            <div className="p-4 rounded-xl bg-indigo-50 border border-indigo-200 flex justify-between items-center text-indigo-950 font-bold">
              <span className="text-sm">MODAL AKHIR SBU KANTIN</span>
              <span className="text-lg font-mono font-extrabold">{formatCurrency(financialStatements?.statement_of_equity?.ending_capital || 0)}</span>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 6: LAPORAN ARUS KAS */}
      {/* ========================================================================= */}
      {activeTab === 'cashflow' && (
        <div className="bg-white rounded-xl border border-slate-200/80 p-6 shadow-xs space-y-6 max-w-4xl mx-auto">
          <div className="text-center pb-4 border-b border-slate-200">
            <h2 className="text-base font-bold text-slate-800">YAYASAN ALDEPOS</h2>
            <h3 className="text-sm font-semibold text-indigo-600">LAPORAN ARUS KAS SBU KANTIN (STATEMENT OF CASH FLOWS)</h3>
            <p className="text-xs text-slate-400 mt-1">Periode: {financialStatements?.period?.from} s/d {financialStatements?.period?.to}</p>
          </div>

          <div className="space-y-4 text-xs">
            {/* Aktivitas Operasional */}
            <div className="space-y-2">
              <h4 className="font-bold text-slate-800 uppercase tracking-wide border-b pb-1">1. Arus Kas dari Aktivitas Operasional</h4>
              <div className="pl-3 space-y-1.5">
                {financialStatements?.cash_flow_statement?.operating_activities?.inflows?.map((inf, idx) => (
                  <div key={idx} className="flex justify-between text-slate-600">
                    <span>{inf.name}</span>
                    <span className="font-mono font-semibold text-emerald-700">{formatCurrency(inf.amount)}</span>
                  </div>
                ))}
                {financialStatements?.cash_flow_statement?.operating_activities?.outflows?.map((outf, idx) => (
                  <div key={idx} className="flex justify-between text-slate-600">
                    <span>{outf.name}</span>
                    <span className="font-mono font-semibold text-rose-700">({formatCurrency(outf.amount)})</span>
                  </div>
                ))}
                <div className="flex justify-between pt-1 font-bold text-slate-900 border-t">
                  <span>Arus Kas Bersih Aktivitas Operasional</span>
                  <span className="font-mono">{formatCurrency(financialStatements?.cash_flow_statement?.operating_activities?.net_cash || 0)}</span>
                </div>
              </div>
            </div>

            {/* Saldo Kas */}
            <div className="pt-4 border-t-2 border-slate-200 space-y-2">
              <div className="flex justify-between py-1 text-slate-600">
                <span>Saldo Kas Awal Periode</span>
                <span className="font-mono font-bold">{formatCurrency(financialStatements?.cash_flow_statement?.opening_cash_balance || 0)}</span>
              </div>
              <div className="flex justify-between py-1 text-indigo-700 font-semibold">
                <span>Kenaikan / (Penurunan) Kas Bersih</span>
                <span className="font-mono">{formatCurrency(financialStatements?.cash_flow_statement?.net_increase_in_cash || 0)}</span>
              </div>
              <div className="flex justify-between p-3 rounded-xl bg-slate-900 text-white font-bold">
                <span>SALDO KAS AKHIR PERIODE</span>
                <span className="font-mono text-base text-emerald-400">{formatCurrency(financialStatements?.cash_flow_statement?.closing_cash_balance || 0)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 7: ANALISIS RASIO KEUANGAN */}
      {/* ========================================================================= */}
      {activeTab === 'ratios' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Net Profit Margin */}
            <div className="bg-white rounded-xl border border-emerald-100 p-4 shadow-xs">
              <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider block">Net Profit Margin</span>
              <h3 className="text-2xl font-extrabold text-emerald-800 mt-1 font-mono">
                {financialRatios?.metrics?.net_profit_margin_percent || 0}%
              </h3>
              <p className="text-[10px] text-slate-400 mt-1">Persentase laba bersih dari total omzet</p>
            </div>

            {/* Card 2: Operating Expense Ratio */}
            <div className="bg-white rounded-xl border border-rose-100 p-4 shadow-xs">
              <span className="text-[11px] font-bold text-rose-700 uppercase tracking-wider block">Beban vs Omzet</span>
              <h3 className="text-2xl font-extrabold text-rose-800 mt-1 font-mono">
                {financialRatios?.metrics?.expense_ratio_percent || 0}%
              </h3>
              <p className="text-[10px] text-slate-400 mt-1">Rasio pengeluaran operasional terhadap pemasukan</p>
            </div>

            {/* Card 3: Return on Capital */}
            <div className="bg-white rounded-xl border border-indigo-100 p-4 shadow-xs">
              <span className="text-[11px] font-bold text-indigo-700 uppercase tracking-wider block">Return on Equity (ROE)</span>
              <h3 className="text-2xl font-extrabold text-indigo-800 mt-1 font-mono">
                {financialRatios?.metrics?.return_on_equity_percent || 0}%
              </h3>
              <p className="text-[10px] text-slate-400 mt-1">Tingkat pengembalian terhadap modal kantin</p>
            </div>

            {/* Card 4: Status Kesehatan */}
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Kesehatan Finansial</span>
              <h3 className="text-sm font-extrabold text-slate-800 mt-1">
                {financialRatios?.metrics?.health_status || 'Memuat...'}
              </h3>
              <p className="text-[10px] text-slate-400 mt-1">Evaluasi performa SBU mandiri</p>
            </div>
          </div>

          {/* Rekomendasi Manajerial */}
          <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs space-y-3">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-indigo-600" />
              <span>Rekomendasi Manajerial &amp; Efisiensi Keuangan Kantin</span>
            </h4>
            <div className="space-y-2">
              {financialRatios?.recommendations?.map((rec, idx) => (
                <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-200/60 text-xs text-slate-700 flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-[10px] shrink-0">
                    {idx + 1}
                  </span>
                  <span>{rec}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL INPUT JURNAL BARU */}
      {/* ========================================================================= */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-100 space-y-4 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-indigo-600" />
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Catat Entri Jurnal Akuntansi Kantin</h3>
                  <p className="text-[11px] text-slate-400">Jurnal Umum, Penyesuaian, Penutup, atau Pembalik</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmitJournal} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Tipe Jurnal</label>
                  <select
                    value={journalForm.entry_type}
                    onChange={(e) => setJournalForm({ ...journalForm, entry_type: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
                  >
                    {JOURNAL_TYPES.map(t => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Tanggal</label>
                  <input
                    type="date"
                    required
                    value={journalForm.entry_date}
                    onChange={(e) => setJournalForm({ ...journalForm, entry_date: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">No. Referensi (Opsional)</label>
                  <input
                    type="text"
                    value={journalForm.reference_number}
                    onChange={(e) => setJournalForm({ ...journalForm, reference_number: e.target.value })}
                    placeholder="Contoh: BKK-001, INV-12"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Uraian / Deskripsi Jurnal <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={journalForm.description}
                  onChange={(e) => setJournalForm({ ...journalForm, description: e.target.value })}
                  placeholder="Contoh: Penyesuaian penyusutan kulkas bulan Oktober, Tutup akun pendapatan..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              {/* Tabel Baris Jurnal Dinamis */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700">Rincian Baris Debet &amp; Kredit</label>
                  <button
                    type="button"
                    onClick={handleAddLine}
                    className="text-xs text-indigo-600 hover:text-indigo-700 font-semibold flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Tambah Baris</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {journalForm.lines.map((line, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-2 p-2.5 bg-slate-50 rounded-xl border border-slate-200 items-center text-xs">
                      {/* Akun COA */}
                      <div className="col-span-12 sm:col-span-5">
                        <select
                          required
                          value={line.coa_account_code}
                          onChange={(e) => handleLineChange(idx, 'coa', e.target.value)}
                          className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                        >
                          <option value="">-- Pilih Akun COA --</option>
                          {coaList.map(c => (
                            <option key={c.id} value={c.account_code}>{c.display_label}</option>
                          ))}
                        </select>
                      </div>

                      {/* Debet */}
                      <div className="col-span-5 sm:col-span-3">
                        <input
                          type="number"
                          min="0"
                          value={line.debit}
                          onChange={(e) => handleLineChange(idx, 'debit', e.target.value)}
                          placeholder="Debet (Rp)"
                          className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono font-bold text-emerald-700"
                        />
                      </div>

                      {/* Kredit */}
                      <div className="col-span-5 sm:col-span-3">
                        <input
                          type="number"
                          min="0"
                          value={line.credit}
                          onChange={(e) => handleLineChange(idx, 'credit', e.target.value)}
                          placeholder="Kredit (Rp)"
                          className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono font-bold text-rose-700"
                        />
                      </div>

                      {/* Hapus Baris */}
                      <div className="col-span-2 sm:col-span-1 text-center">
                        <button
                          type="button"
                          disabled={journalForm.lines.length <= 2}
                          onClick={() => handleRemoveLine(idx)}
                          className="p-1 text-slate-400 hover:text-rose-600 disabled:opacity-30"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Total & Status Balance Indicator */}
              <div className="p-3 bg-slate-100 rounded-xl border border-slate-200 flex items-center justify-between text-xs font-mono">
                <div>
                  <span className="text-slate-500">Debet: </span>
                  <span className="font-bold text-emerald-800">{formatCurrency(formTotals.debit)}</span>
                  <span className="text-slate-400 mx-2">|</span>
                  <span className="text-slate-500">Kredit: </span>
                  <span className="font-bold text-rose-800">{formatCurrency(formTotals.credit)}</span>
                </div>

                <div>
                  {formTotals.is_balanced ? (
                    <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-sans font-bold text-[10px] border border-emerald-300">
                      ✓ SEIMBANG (BALANCED)
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 font-sans font-bold text-[10px] border border-rose-300">
                      ⚠ SELISIH {formatCurrency(formTotals.diff)}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting || !formTotals.is_balanced}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs disabled:opacity-50 flex items-center gap-1.5"
                >
                  {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  <span>Posting Jurnal</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL HAPUS JURNAL */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800">Hapus Entri Jurnal</h3>
                <p className="text-xs text-slate-500">Tindakan ini tidak dapat dibatalkan</p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl text-xs space-y-1 font-mono">
              <p className="font-bold text-slate-800">{deleteTarget.entry_number}</p>
              <p className="text-slate-600 font-sans">{deleteTarget.description}</p>
              <p className="font-bold text-indigo-700">{formatCurrency(deleteTarget.total_debit)}</p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleDeleteJournal}
                disabled={deleting}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-xs disabled:opacity-50"
              >
                {deleting ? 'Menghapus...' : 'Ya, Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
