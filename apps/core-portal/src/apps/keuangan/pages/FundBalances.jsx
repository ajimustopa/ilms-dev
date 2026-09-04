import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../shared/store/AuthContext';
import api from '../../../shared/services/api';
import {
  Layers,
  Coins,
  ArrowDownLeft,
  ArrowUpRight,
  RefreshCw,
  Search,
  Filter,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Eye,
  X,
  History,
  Building2,
  School,
  Wallet,
  FileSpreadsheet,
  Tag,
  Calendar,
  ArrowRightLeft,
  Plus,
  Clock,
  AlertCircle,
  HelpCircle,
  RotateCcw,
  ShieldAlert,
  Percent,
  TrendingDown
} from 'lucide-react';

export default function FundBalances({ isEmbedded = false, initialTab = 'balances' }) {
  const { activeSchoolUnit, user } = useAuth();
  
  // Active Tab: 'balances' (Saldo Kantong Dana) | 'loans' (Pinjaman Antar Tahun Ajaran)
  const [activeTab, setActiveTab] = useState(initialTab);

  // Master Data & Academic Year State
  const [academicYears, setAcademicYears] = useState([]);
  const [selectedYearId, setSelectedYearId] = useState('');
  const [feeTypes, setFeeTypes] = useState([]);

  // Data State: Fund Balances
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');

  // State Modal Mutasi
  const [selectedFund, setSelectedFund] = useState(null);
  const [mutations, setMutations] = useState([]);
  const [loadingMutations, setLoadingMutations] = useState(false);
  const [mutationError, setMutationError] = useState('');

  // Data State: Inter-Year Loans
  const [loansData, setLoansData] = useState({ summary: {}, loans: [] });
  const [loadingLoans, setLoadingLoans] = useState(false);
  const [loansError, setLoansError] = useState('');
  const [loanStatusFilter, setLoanStatusFilter] = useState('all');
  const [loanSearchTerm, setLoanSearchTerm] = useState('');

  // Modal: Create Loan
  const [createLoanModalOpen, setCreateLoanModalOpen] = useState(false);
  const [creatingLoan, setCreatingLoan] = useState(false);
  const [sourceAvailableBalance, setSourceAvailableBalance] = useState(null);
  const [loadingSourceBalance, setLoadingSourceBalance] = useState(false);
  const [loanForm, setLoanForm] = useState({
    from_academic_year_id: '',
    to_academic_year_id: '',
    fund_type: 'fee_type',
    fund_ref_id: '',
    to_fund_type: 'fee_type',
    to_fund_ref_id: '',
    amount: '',
    purpose: '',
    expected_repayment_note: '',
    borrowed_at: new Date().toISOString().slice(0, 10)
  });

  // Modal: Repay Loan
  const [repayModalOpen, setRepayModalOpen] = useState(false);
  const [repayingLoan, setRepayingLoan] = useState(false);
  const [selectedLoanForRepay, setSelectedLoanForRepay] = useState(null);
  const [borrowerAvailableBalance, setBorrowerAvailableBalance] = useState(null);
  const [loadingBorrowerBalance, setLoadingBorrowerBalance] = useState(false);
  const [repayForm, setRepayForm] = useState({
    amount: '',
    repaid_at: new Date().toISOString().slice(0, 10),
    notes: ''
  });

  // Modal: Detail Loan & Repayment Log
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedLoanDetail, setSelectedLoanDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const isYayasan = !activeSchoolUnit || activeSchoolUnit.id === 'all' || activeSchoolUnit.is_foundation || activeSchoolUnit.id === null;

  // 1. Fetch Academic Years & Fee Types
  const fetchMasters = async () => {
    try {
      const [ayRes, feeRes] = await Promise.all([
        api.get('/akademik/academic-years').catch(() => null)
          || api.get('/akademik/internal/academic-years').catch(() => null),
        api.get('/keuangan/fee-types?is_active=true').catch(() => ({ data: { data: [] } }))
      ]);

      const yearsList = ayRes?.data?.data || ayRes?.data?.academic_years || [];
      const unitIdNum = activeSchoolUnit?.id ? Number(activeSchoolUnit.id) : null;

      let filteredYears = yearsList;
      if (unitIdNum && !isYayasan) {
        filteredYears = yearsList.filter(y => !y.satuan_pendidikan_id || Number(y.satuan_pendidikan_id) === unitIdNum);
      }

      const uniqueYears = [];
      const seen = new Set();
      filteredYears.forEach(y => {
        if (!seen.has(y.name || y.id)) {
          seen.add(y.name || y.id);
          uniqueYears.push(y);
        }
      });

      setAcademicYears(uniqueYears);
      const activeYear = uniqueYears.find(y => y.is_active) || uniqueYears[0];
      if (activeYear && !selectedYearId) {
        setSelectedYearId(String(activeYear.id));
      }

      const fTypes = feeRes.data?.data || [];
      setFeeTypes(fTypes);
      return activeYear ? activeYear.id : null;
    } catch (e) {
      console.error('Error fetching masters in FundBalances:', e);
    }
    return null;
  };

  // 2. Fetch Fund Balances
  const fetchFundBalances = async (ayId = null) => {
    try {
      setLoading(true);
      setError('');
      const targetAyId = ayId || selectedYearId || undefined;
      const res = await api.get('/keuangan/fund-balances', {
        params: {
          academic_year_id: targetAyId
        }
      });
      if (res.data?.success) {
        setData(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching fund balances:', err);
      setError(err.response?.data?.message || 'Gagal memuat data saldo sumber dana');
    } finally {
      setLoading(false);
    }
  };

  // 3. Fetch Inter-Year Loans
  const fetchLoans = async () => {
    try {
      setLoadingLoans(true);
      setLoansError('');
      const res = await api.get('/keuangan/fund-balances/inter-year-loans', {
        params: {
          status: loanStatusFilter,
          academic_year_id: selectedYearId || undefined
        }
      });
      if (res.data?.success) {
        setLoansData(res.data.data || { summary: {}, loans: [] });
      }
    } catch (err) {
      console.error('Error fetching inter-year loans:', err);
      setLoansError(err.response?.data?.message || 'Gagal memuat daftar pinjaman antar tahun ajaran');
    } finally {
      setLoadingLoans(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      const defaultAyId = await fetchMasters();
      await fetchFundBalances(defaultAyId);
    };
    init();
  }, [activeSchoolUnit]);

  useEffect(() => {
    if (activeTab === 'loans') {
      fetchLoans();
    } else {
      fetchFundBalances();
    }
  }, [activeTab, selectedYearId, loanStatusFilter, activeSchoolUnit]);

  const handleYearChange = (newYearId) => {
    setSelectedYearId(newYearId);
    if (activeTab === 'balances') {
      fetchFundBalances(newYearId);
    }
  };

  // Mutations modal
  const handleOpenMutationsModal = async (fund) => {
    setSelectedFund(fund);
    setMutations([]);
    setMutationError('');
    if (!fund.id) return;

    try {
      setLoadingMutations(true);
      const res = await api.get(`/keuangan/fund-balances/${fund.id}/mutations`, {
        params: {
          academic_year_id: selectedYearId || undefined
        }
      });
      if (res.data?.success) {
        setMutations(res.data.data.mutations || []);
      }
    } catch (err) {
      console.error('Error fetching mutations:', err);
      setMutationError(err.response?.data?.message || 'Gagal memuat riwayat mutasi');
    } finally {
      setLoadingMutations(false);
    }
  };

  // Check Source Fund balance when modal creates loan
  const checkSourceBalance = async (fromAyId, fundRefId) => {
    if (!fromAyId || !fundRefId) {
      setSourceAvailableBalance(null);
      return;
    }
    try {
      setLoadingSourceBalance(true);
      const res = await api.get('/keuangan/fund-balances', {
        params: { academic_year_id: fromAyId }
      });
      const funds = res.data?.data?.funds || [];
      const matched = funds.find(f => Number(f.fund_ref_id) === Number(fundRefId));
      setSourceAvailableBalance(matched ? parseFloat(matched.balance || 0) : 0);
    } catch (e) {
      setSourceAvailableBalance(null);
    } finally {
      setLoadingSourceBalance(false);
    }
  };

  const handleOpenCreateLoanModal = () => {
    const defaultFromAy = academicYears[1]?.id || academicYears[0]?.id || 2;
    const defaultToAy = academicYears[0]?.id || 1;
    const defaultFee = feeTypes[0]?.id || 1;

    setLoanForm({
      from_academic_year_id: String(defaultFromAy),
      to_academic_year_id: String(defaultToAy),
      fund_type: 'fee_type',
      fund_ref_id: String(defaultFee),
      to_fund_type: 'fee_type',
      to_fund_ref_id: String(defaultFee),
      amount: '',
      purpose: '',
      expected_repayment_note: '',
      borrowed_at: new Date().toISOString().slice(0, 10)
    });
    setCreateLoanModalOpen(true);
    checkSourceBalance(defaultFromAy, defaultFee);
  };

  const handleCreateLoan = async (e) => {
    e.preventDefault();
    if (Number(loanForm.from_academic_year_id) === Number(loanForm.to_academic_year_id)) {
      alert('Tahun ajaran sumber dan tahun ajaran pemakai tidak boleh sama!');
      return;
    }
    if (!loanForm.purpose.trim()) {
      alert('Wajib mengisi alasan / tujuan penggunaan dana');
      return;
    }
    const numAmt = parseFloat(loanForm.amount || 0);
    if (numAmt <= 0) {
      alert('Nominal pinjaman harus lebih dari Rp 0');
      return;
    }
    if (sourceAvailableBalance !== null && numAmt > sourceAvailableBalance) {
      alert(`Nominal pinjaman melebihi saldo kantong sumber yang tersedia (Tersedia: ${formatCurrency(sourceAvailableBalance)})`);
      return;
    }

    setCreatingLoan(true);
    try {
      await api.post('/keuangan/fund-balances/inter-year-loans', {
        from_academic_year_id: Number(loanForm.from_academic_year_id),
        to_academic_year_id: Number(loanForm.to_academic_year_id),
        fund_type: loanForm.fund_type,
        fund_ref_id: Number(loanForm.fund_ref_id),
        to_fund_type: loanForm.to_fund_type,
        to_fund_ref_id: Number(loanForm.to_fund_ref_id || loanForm.fund_ref_id),
        amount: numAmt,
        purpose: loanForm.purpose,
        expected_repayment_note: loanForm.expected_repayment_note,
        borrowed_at: loanForm.borrowed_at
      });
      alert('Pinjaman dana antar tahun ajaran berhasil dicatat dan saldo telah direalokasikan!');
      setCreateLoanModalOpen(false);
      fetchLoans();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal membuat pinjaman antar tahun ajaran');
    } finally {
      setCreatingLoan(false);
    }
  };

  // Open Repay Modal
  const handleOpenRepayModal = async (loan) => {
    setSelectedLoanForRepay(loan);
    setRepayForm({
      amount: parseFloat(loan.outstanding_amount || 0),
      repaid_at: new Date().toISOString().slice(0, 10),
      notes: `Pengembalian pinjaman #${loan.id}`
    });
    setRepayModalOpen(true);

    // Fetch borrower fund balance
    try {
      setLoadingBorrowerBalance(true);
      const res = await api.get('/keuangan/fund-balances', {
        params: { academic_year_id: loan.to_academic_year_id }
      });
      const funds = res.data?.data?.funds || [];
      const matched = funds.find(f => Number(f.fund_ref_id) === Number(loan.to_fund_ref_id || loan.fund_ref_id));
      setBorrowerAvailableBalance(matched ? parseFloat(matched.balance || 0) : 0);
    } catch (e) {
      setBorrowerAvailableBalance(null);
    } finally {
      setLoadingBorrowerBalance(false);
    }
  };

  const handleRepayLoan = async (e) => {
    e.preventDefault();
    if (!selectedLoanForRepay) return;
    const numAmt = parseFloat(repayForm.amount || 0);
    const maxOutstanding = parseFloat(selectedLoanForRepay.outstanding_amount || 0);

    if (numAmt <= 0) {
      alert('Nominal pengembalian harus lebih dari Rp 0');
      return;
    }
    if (numAmt > maxOutstanding) {
      alert(`Nominal pengembalian melebihi sisa pinjaman (Sisa: ${formatCurrency(maxOutstanding)})`);
      return;
    }

    setRepayingLoan(true);
    try {
      await api.post(`/keuangan/fund-balances/inter-year-loans/${selectedLoanForRepay.id}/repay`, {
        amount: numAmt,
        repaid_at: repayForm.repaid_at,
        notes: repayForm.notes
      });
      alert('Pengembalian pinjaman dana berhasil dicatat & saldo dikembalikan ke tahun sumber!');
      setRepayModalOpen(false);
      fetchLoans();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal memproses pengembalian pinjaman');
    } finally {
      setRepayingLoan(false);
    }
  };

  const handleOpenDetailModal = async (loanId) => {
    setDetailModalOpen(true);
    setLoadingDetail(true);
    setSelectedLoanDetail(null);
    try {
      const res = await api.get(`/keuangan/fund-balances/inter-year-loans/${loanId}`);
      if (res.data?.success) {
        setSelectedLoanDetail(res.data.data);
      }
    } catch (err) {
      alert('Gagal memuat detail pinjaman');
      setDetailModalOpen(false);
    } finally {
      setLoadingDetail(false);
    }
  };

  const formatCurrency = (val) => {
    const num = parseFloat(val || 0);
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0
    }).format(num);
  };

  const { summary = {}, funds = [] } = data || {};
  const { summary: loansSummary = {}, loans = [] } = loansData;

  const filteredFunds = funds.filter(f => {
    const matchesSearch = f.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || f.fund_type === filterType;
    return matchesSearch && matchesType;
  });

  const filteredLoans = loans.filter(l => {
    if (!loanSearchTerm) return true;
    const term = loanSearchTerm.toLowerCase();
    return (
      (l.purpose || '').toLowerCase().includes(term) ||
      (l.from_fee_type_name || '').toLowerCase().includes(term) ||
      (l.to_fee_type_name || '').toLowerCase().includes(term) ||
      (l.expected_repayment_note || '').toLowerCase().includes(term)
    );
  });

  const selectedYearObj = academicYears.find(y => String(y.id) === String(selectedYearId));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-800 tracking-tight">Saldo & Kantong Sumber Dana</h1>
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                isYayasan
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                  : 'bg-indigo-100 text-indigo-800 border border-indigo-200'
              }`}
            >
              {isYayasan ? <Building2 className="w-3 h-3 text-emerald-600" /> : <School className="w-3 h-3 text-indigo-600" />}
              <span>{isYayasan ? 'Pusat Yayasan (Gabungan)' : (activeSchoolUnit?.name || 'Satuan')}</span>
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Pelacakan posisi saldo per pos dana per tahun ajaran & realokasi pinjaman antar tahun ajaran
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-center">
          {/* Dropdown Filter Tahun Ajaran */}
          <div className="flex items-center gap-1.5 bg-white border border-slate-200 px-3 py-1.5 rounded-xl shadow-2xs">
            <Calendar className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
            <span className="text-[11px] font-bold text-slate-500">Tahun Ajaran:</span>
            <select
              value={selectedYearId}
              onChange={(e) => handleYearChange(e.target.value)}
              className="text-xs font-bold text-slate-800 bg-transparent border-none focus:ring-0 cursor-pointer pr-4"
            >
              <option value="">Semua Tahun</option>
              {academicYears.map(y => (
                <option key={y.id} value={y.id}>
                  {y.name || `TA #${y.id}`} {y.is_active ? '(Aktif)' : ''}
                </option>
              ))}
            </select>
          </div>

          {activeTab === 'loans' && (
            <button
              type="button"
              onClick={handleOpenCreateLoanModal}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition"
            >
              <Plus className="w-4 h-4" />
              <span>+ Pinjaman Antar TA</span>
            </button>
          )}

          <button
            type="button"
            onClick={activeTab === 'balances' ? () => fetchFundBalances() : () => fetchLoans()}
            disabled={loading || loadingLoans}
            className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl shadow-2xs transition disabled:opacity-60"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading || loadingLoans ? 'animate-spin text-indigo-600' : 'text-slate-500'}`} />
            <span>{loading || loadingLoans ? 'Memuat...' : 'Muat Ulang'}</span>
          </button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-slate-200 gap-6">
        <button
          type="button"
          onClick={() => setActiveTab('balances')}
          className={`pb-3 text-xs font-bold flex items-center gap-2 border-b-2 transition ${
            activeTab === 'balances'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Saldo Kantong Dana & Mutasi</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('loans')}
          className={`pb-3 text-xs font-bold flex items-center gap-2 border-b-2 transition ${
            activeTab === 'loans'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <ArrowRightLeft className="w-4 h-4" />
          <span>Pinjaman & Realokasi Antar Tahun Ajaran</span>
          {loansSummary.aged_loans_count > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-600 text-white animate-pulse" title={`${loansSummary.aged_loans_count} pinjaman >90 hari`}>
              {loansSummary.aged_loans_count}
            </span>
          )}
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: SALDO KANTONG DANA & MUTASI */}
      {/* ========================================================================= */}
      {activeTab === 'balances' && (
        <div className="space-y-6">
          {error && (
            <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Total Akumulasi Masuk</span>
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                  <ArrowDownLeft className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-extrabold text-slate-800">
                  {formatCurrency(summary.total_fund_in)}
                </div>
                <p className="text-[11px] text-emerald-600 font-medium mt-1">
                  Penerimaan kas & pendaftaran
                </p>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Total Realisasi Keluar</span>
                <div className="p-2 bg-rose-50 text-rose-600 rounded-xl">
                  <ArrowUpRight className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-extrabold text-slate-800">
                  {formatCurrency(summary.total_fund_out)}
                </div>
                <p className="text-[11px] text-rose-600 font-medium mt-1">
                  Belanja RAPBS & operasional
                </p>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Total Sisa Saldo Dana</span>
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                  <Wallet className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-extrabold text-indigo-700">
                  {formatCurrency(summary.total_fund_balance)}
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Saldo riil di seluruh pos dana
                </p>
              </div>
            </div>

            <div className="bg-purple-50/60 p-5 rounded-2xl border border-purple-200/80 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-purple-900">Dimensi Tahun Ajaran</span>
                <div className="p-2 bg-purple-100 text-purple-800 rounded-xl">
                  <Calendar className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-lg font-bold text-purple-950">
                  {selectedYearObj ? selectedYearObj.name : 'Semua Tahun (Konsolidasi)'}
                </div>
                <p className="text-[11px] text-purple-700 font-medium mt-1">
                  {selectedYearObj?.is_active ? 'Tahun Ajaran Aktif Berjalan' : 'Tahun Ajaran Mendatang / Historis'}
                </p>
              </div>
            </div>
          </div>

          {/* Table of Fund Balances */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 flex-1 max-w-md">
                <div className="relative w-full">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Cari nama pos dana atau kode..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:ring-2 focus:ring-indigo-500 transition"
                >
                  <option value="all">Semua Jenis Kantong</option>
                  <option value="fee_type">Pos Biaya Pendidikan (SPP/Kegiatan/PPDB)</option>
                  <option value="income_category">Pendapatan Lain / Non-Siswa</option>
                  <option value="opening_pool">Saldo Awal (Opening Pool)</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 rounded-l-xl">Mata Anggaran / Pos RAPBS</th>
                    <th className="px-4 py-3">Kategori Sumber Dana</th>
                    <th className="px-4 py-3 text-right">Pagu RAPBS</th>
                    <th className="px-4 py-3 text-right">Realisasi Masuk</th>
                    <th className="px-4 py-3 text-right">Realisasi Belanja</th>
                    <th className="px-4 py-3 text-right">Sisa Saldo Kas</th>
                    <th className="px-4 py-3 text-center">Serapan</th>
                    <th className="px-4 py-3 text-center rounded-r-xl">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-12 text-center text-slate-400 italic">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto text-indigo-600 mb-2" />
                        Memuat data kantong dana...
                      </td>
                    </tr>
                  ) : filteredFunds.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-slate-400 italic">
                        Tidak ada pos dana yang sesuai kriteria.
                      </td>
                    </tr>
                  ) : (
                    filteredFunds.map((f, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/70 transition">
                        <td className="px-4 py-3.5">
                          <div className="font-bold text-slate-800">{f.name}</div>
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5">{f.code || '-'}</div>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                            f.category === 'Saldo Awal'
                              ? 'bg-purple-50 text-purple-700'
                              : f.category === 'Sumber Lain (RAPBS)'
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-indigo-50 text-indigo-700'
                          }`}>
                            {f.category || (f.fund_type === 'fee_type' ? 'Penerimaan Siswa' : 'Pendapatan Lain')}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-right font-mono text-slate-700 font-semibold">
                          {f.planned_amount > 0 ? formatCurrency(f.planned_amount) : '-'}
                        </td>
                        <td className="px-4 py-3.5 text-right font-mono text-emerald-700 font-semibold">
                          {formatCurrency(f.total_in)}
                        </td>
                        <td className="px-4 py-3.5 text-right font-mono text-rose-700 font-semibold">
                          {formatCurrency(f.total_out)}
                        </td>
                        <td className="px-4 py-3.5 text-right font-mono font-bold text-slate-900 text-sm">
                          {formatCurrency(f.balance)}
                        </td>
                        <td className="px-4 py-3.5 text-center font-mono">
                          {f.planned_amount > 0 ? (
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              f.realization_percentage >= 100
                                ? 'bg-emerald-100 text-emerald-800'
                                : f.realization_percentage >= 50
                                ? 'bg-blue-50 text-blue-800'
                                : 'bg-slate-100 text-slate-700'
                            }`}>
                              {f.realization_percentage}%
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <button
                            type="button"
                            onClick={() => handleOpenMutationsModal(f)}
                            className="inline-flex items-center gap-1 px-3 py-1 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-700 font-semibold rounded-lg transition"
                          >
                            <History className="w-3.5 h-3.5" />
                            <span>Mutasi</span>
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

      {/* ========================================================================= */}
      {/* TAB 2: PINJAMAN & REALOKASI ANTAR TAHUN AJARAN */}
      {/* ========================================================================= */}
      {activeTab === 'loans' && (
        <div className="space-y-6">
          {loansError && (
            <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{loansError}</span>
            </div>
          )}

          {/* KPI Cards Pinjaman */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Total Pinjaman Dibuat</span>
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                  <ArrowRightLeft className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-extrabold text-slate-800">
                  {formatCurrency(loansSummary.total_loaned)}
                </div>
                <p className="text-[11px] text-slate-400 mt-1">Realokasi dana antar tahun ajaran</p>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Sisa Pinjaman (Outstanding)</span>
                <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
                  <Clock className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-extrabold text-amber-700">
                  {formatCurrency(loansSummary.total_outstanding)}
                </div>
                <p className="text-[11px] text-amber-600 font-medium mt-1">
                  {loansSummary.active_loans_count || 0} Pinjaman Belum Lunas
                </p>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Total Dikembalikan</span>
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-extrabold text-emerald-700">
                  {formatCurrency(loansSummary.total_repaid)}
                </div>
                <p className="text-[11px] text-emerald-600 font-medium mt-1">Dana telah kembali ke tahun sumber</p>
              </div>
            </div>

            <div className={`p-5 rounded-2xl border shadow-xs flex flex-col justify-between ${
              loansSummary.aged_loans_count > 0
                ? 'bg-rose-50/70 border-rose-300'
                : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="flex items-center justify-between">
                <span className={`text-xs font-bold ${loansSummary.aged_loans_count > 0 ? 'text-rose-900' : 'text-slate-600'}`}>
                  Pinjaman &gt; 90 Hari
                </span>
                <div className={`p-2 rounded-xl ${loansSummary.aged_loans_count > 0 ? 'bg-rose-100 text-rose-700' : 'bg-slate-200 text-slate-600'}`}>
                  <ShieldAlert className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3">
                <div className={`text-2xl font-extrabold ${loansSummary.aged_loans_count > 0 ? 'text-rose-800' : 'text-slate-800'}`}>
                  {loansSummary.aged_loans_count || 0} <span className="text-xs font-normal">Perlu Perhatian</span>
                </div>
                <p className={`text-[11px] font-medium mt-1 ${loansSummary.aged_loans_count > 0 ? 'text-rose-700' : 'text-slate-400'}`}>
                  {loansSummary.aged_loans_count > 0 ? 'Belum lunas melebihi 90 hari' : 'Semua pinjaman berjalan lancar'}
                </p>
              </div>
            </div>
          </div>

          {/* Loans Table & Filters */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 flex-1 max-w-md">
                <div className="relative w-full">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Cari alasan / pos biaya / catatan pinjaman..."
                    value={loanSearchTerm}
                    onChange={(e) => setLoanSearchTerm(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={loanStatusFilter}
                  onChange={(e) => setLoanStatusFilter(e.target.value)}
                  className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:ring-2 focus:ring-indigo-500 transition"
                >
                  <option value="all">Semua Status Pinjaman</option>
                  <option value="outstanding">Belum Dibayar (Outstanding)</option>
                  <option value="partially_repaid">Dibayar Sebagian</option>
                  <option value="repaid">Sudah Lunas (Repaid)</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 rounded-l-xl">Alur Tahun Ajaran</th>
                    <th className="px-4 py-3">Pos Dana Sumber &rarr; Tujuan</th>
                    <th className="px-4 py-3 text-right">Nominal Pinjaman</th>
                    <th className="px-4 py-3 text-right">Sisa Pinjaman</th>
                    <th className="px-4 py-3">Progress Pelunasan</th>
                    <th className="px-4 py-3 text-center">Status & Usia</th>
                    <th className="px-4 py-3 text-center rounded-r-xl">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loadingLoans ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center text-slate-400 italic">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto text-indigo-600 mb-2" />
                        Memuat daftar pinjaman antar tahun ajaran...
                      </td>
                    </tr>
                  ) : filteredLoans.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-slate-400 italic">
                        Belum ada data pinjaman antar tahun ajaran yang tercatat.
                      </td>
                    </tr>
                  ) : (
                    filteredLoans.map((l) => {
                      const fromYear = academicYears.find(y => Number(y.id) === Number(l.from_academic_year_id))?.name || `TA #${l.from_academic_year_id}`;
                      const toYear = academicYears.find(y => Number(y.id) === Number(l.to_academic_year_id))?.name || `TA #${l.to_academic_year_id}`;
                      const isOutstanding = l.status === 'outstanding';
                      const isPartial = l.status === 'partially_repaid';
                      const isRepaid = l.status === 'repaid';

                      return (
                        <tr key={l.id} className="hover:bg-slate-50/70 transition">
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-1.5 font-bold text-slate-800">
                              <span className="px-2 py-0.5 rounded text-[10px] bg-purple-100 text-purple-800">{fromYear}</span>
                              <ArrowRightLeft className="w-3 h-3 text-slate-400" />
                              <span className="px-2 py-0.5 rounded text-[10px] bg-indigo-100 text-indigo-800">{toYear}</span>
                            </div>
                            <div className="text-[10px] text-slate-500 mt-1 truncate max-w-xs font-medium" title={l.purpose}>
                              {l.purpose}
                            </div>
                          </td>
                          <td className="px-4 py-3.5">
                            <div className="font-semibold text-slate-700">{l.from_fee_type_name || 'Pos Biaya Sumber'}</div>
                            <div className="text-[10px] text-slate-400 mt-0.5">&rarr; {l.to_fee_type_name || 'Pos Tujuan'}</div>
                          </td>
                          <td className="px-4 py-3.5 text-right font-mono font-bold text-slate-900">
                            {formatCurrency(l.amount)}
                          </td>
                          <td className="px-4 py-3.5 text-right font-mono font-bold text-amber-800">
                            {formatCurrency(l.outstanding_amount)}
                          </td>
                          <td className="px-4 py-3.5">
                            <div className="w-32">
                              <div className="flex justify-between text-[10px] mb-1 text-slate-500 font-semibold">
                                <span>{l.progress_percentage}%</span>
                                <span>{formatCurrency(l.repaid_amount)}</span>
                              </div>
                              <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all ${
                                    isRepaid ? 'bg-emerald-600' : 'bg-indigo-600'
                                  }`}
                                  style={{ width: `${l.progress_percentage}%` }}
                                />
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3.5 text-center">
                            <div className="space-y-1">
                              {isOutstanding && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                                  <Clock className="w-3 h-3 text-amber-600" />
                                  Outstanding
                                </span>
                              )}
                              {isPartial && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                                  <RotateCcw className="w-3 h-3 text-blue-600" />
                                  Sebagian
                                </span>
                              )}
                              {isRepaid && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                  Lunas
                                </span>
                              )}

                              {l.is_aged_90_days && (
                                <div>
                                  <span className="inline-flex items-center gap-1 px-2 py-0.2 rounded text-[9px] font-bold bg-rose-100 text-rose-800 border border-rose-200" title={`${l.days_outstanding} hari sejak dipinjam`}>
                                    &gt; 90 Hari ({l.days_outstanding}h)
                                  </span>
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3.5 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              {!isRepaid && (
                                <button
                                  type="button"
                                  onClick={() => handleOpenRepayModal(l)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg transition shadow-2xs"
                                  title="Catat Pengembalian Dana"
                                >
                                  <ArrowDownLeft className="w-3.5 h-3.5" />
                                  <span>Kembalikan</span>
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => handleOpenDetailModal(l.id)}
                                className="p-1 text-slate-400 hover:text-indigo-600 rounded-lg transition"
                                title="Lihat Riwayat & Detail"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL MUTASI KANTONG DANA (TAB 1) */}
      {/* ========================================================================= */}
      {selectedFund && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl shadow-xl border border-slate-100 max-w-2xl w-full overflow-hidden flex flex-col max-h-[85vh]">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm flex items-center gap-2">
                  <History className="w-4 h-4 text-indigo-400" />
                  Riwayat Mutasi Saldo Kantong Dana
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {selectedFund.name} &bull; Sisa Saldo: {formatCurrency(selectedFund.balance)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedFund(null)}
                className="p-1 text-slate-400 hover:text-white rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              {loadingMutations ? (
                <div className="py-12 text-center text-slate-400 italic text-xs">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-indigo-600 mb-2" />
                  Memuat riwayat mutasi dana...
                </div>
              ) : mutationError ? (
                <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl">
                  {mutationError}
                </div>
              ) : mutations.length === 0 ? (
                <div className="py-8 text-center text-slate-400 italic text-xs">
                  Belum ada catatan mutasi untuk pos dana ini.
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {mutations.map((m) => (
                    <div key={m.id} className="py-3 flex items-start justify-between gap-4 text-xs">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                              m.direction === 'in'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {m.direction === 'in' ? <ArrowDownLeft className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                            {m.direction === 'in' ? 'Masuk' : 'Keluar'}
                          </span>
                          <span className="font-semibold text-slate-700">{m.notes || 'Mutasi Dana'}</span>
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {String(m.created_at).slice(0, 19).replace('T', ' ')} &bull; Ref: {m.source_table || '-'} #{m.source_id || '-'}
                        </div>
                      </div>
                      <div className="text-right">
                        <div
                          className={`font-bold font-mono ${
                            m.direction === 'in' ? 'text-emerald-700' : 'text-rose-700'
                          }`}
                        >
                          {m.direction === 'in' ? '+' : '-'}{formatCurrency(m.amount)}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          Saldo: {formatCurrency(m.balance_after)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedFund(null)}
                className="px-4 py-2 bg-white border border-slate-200 text-slate-700 font-semibold rounded-xl text-xs hover:bg-slate-50"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: CATAT PINJAMAN ANTAR TAHUN AJARAN */}
      {/* ========================================================================= */}
      {createLoanModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 bg-indigo-900 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm flex items-center gap-2">
                  <ArrowRightLeft className="w-4 h-4 text-indigo-300" />
                  Catat Pinjaman / Realokasi Antar Tahun Ajaran
                </h3>
                <p className="text-[11px] text-indigo-200 mt-0.5">
                  Pinjam sementara dana tahun ajaran lain untuk kebutuhan operasional
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCreateLoanModalOpen(false)}
                className="p-1 text-indigo-300 hover:text-white rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateLoan} className="p-6 overflow-y-auto space-y-4 flex-1 text-xs">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-[11px] leading-relaxed">
                <strong>Informasi Akuntansi:</strong> Transaksi ini murni realokasi internal pada lapisan kantong dana (<em>fund_balances</em>) dan tidak membentuk jurnal hutang/piutang formal baru di COA.
              </div>

              {/* Tahun Sumber & Kantong Sumber */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <span className="text-xs font-bold text-slate-800">1. Sumber Dana yang Dipinjam</span>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Tahun Sumber (e.g. PPDB / Depan) <span className="text-rose-500">*</span>
                    </label>
                    <select
                      required
                      value={loanForm.from_academic_year_id}
                      onChange={(e) => {
                        setLoanForm({ ...loanForm, from_academic_year_id: e.target.value });
                        checkSourceBalance(e.target.value, loanForm.fund_ref_id);
                      }}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold"
                    >
                      {academicYears.map(y => (
                        <option key={y.id} value={y.id}>
                          {y.name || `TA #${y.id}`} {y.is_active ? '(Aktif)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Pos Dana Sumber <span className="text-rose-500">*</span>
                    </label>
                    <select
                      required
                      value={loanForm.fund_ref_id}
                      onChange={(e) => {
                        setLoanForm({ ...loanForm, fund_ref_id: e.target.value });
                        checkSourceBalance(loanForm.from_academic_year_id, e.target.value);
                      }}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold"
                    >
                      {feeTypes.map(f => (
                        <option key={f.id} value={f.id}>{f.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {sourceAvailableBalance !== null && (
                  <div className="text-[11px] font-medium text-indigo-700 flex items-center gap-1.5">
                    <Coins className="w-3.5 h-3.5" />
                    <span>Saldo tersedia di pos sumber: <strong>{formatCurrency(sourceAvailableBalance)}</strong></span>
                  </div>
                )}
              </div>

              {/* Tahun Tujuan & Pos Penerima */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <span className="text-xs font-bold text-slate-800">2. Tahun Ajaran Pemakai / Peminjam</span>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Tahun Pemakai (e.g. Berjalan) <span className="text-rose-500">*</span>
                    </label>
                    <select
                      required
                      value={loanForm.to_academic_year_id}
                      onChange={(e) => setLoanForm({ ...loanForm, to_academic_year_id: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold"
                    >
                      {academicYears.map(y => (
                        <option key={y.id} value={y.id}>
                          {y.name || `TA #${y.id}`} {y.is_active ? '(Aktif)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Pos Dana Tujuan <span className="text-rose-500">*</span>
                    </label>
                    <select
                      required
                      value={loanForm.to_fund_ref_id}
                      onChange={(e) => setLoanForm({ ...loanForm, to_fund_ref_id: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold"
                    >
                      {feeTypes.map(f => (
                        <option key={f.id} value={f.id}>{f.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Nominal, Tanggal, & Alasan */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Nominal Pinjaman (Rp) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    step="1000"
                    placeholder="Contoh: 5000000"
                    value={loanForm.amount}
                    onChange={(e) => setLoanForm({ ...loanForm, amount: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tanggal Peminjaman <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={loanForm.borrowed_at}
                    onChange={(e) => setLoanForm({ ...loanForm, borrowed_at: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Alasan / Tujuan Penggunaan Dana <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={2}
                  placeholder="Contoh: Talangan biaya perbaikan ruang kelas sebelum dana BOS semester 1 cair..."
                  value={loanForm.purpose}
                  onChange={(e) => setLoanForm({ ...loanForm, purpose: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Rencana / Catatan Pengembalian
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Akan dikembalikan bertahap dari penerimaan SPP Oktober - Desember"
                  value={loanForm.expected_repayment_note}
                  onChange={(e) => setLoanForm({ ...loanForm, expected_repayment_note: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCreateLoanModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={creatingLoan}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-xs disabled:opacity-50"
                >
                  {creatingLoan ? 'Menyimpan...' : 'Catat & Realokasikan Saldo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: CATAT PENGEMBALIAN PINJAMAN */}
      {/* ========================================================================= */}
      {repayModalOpen && selectedLoanForRepay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-md w-full overflow-hidden flex flex-col">
            <div className="px-6 py-4 bg-emerald-700 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm flex items-center gap-2">
                  <ArrowDownLeft className="w-4 h-4 text-emerald-200" />
                  Catat Pengembalian Dana Pinjaman
                </h3>
                <p className="text-[11px] text-emerald-100 mt-0.5">
                  Pinjaman #{selectedLoanForRepay.id} &bull; Sisa: {formatCurrency(selectedLoanForRepay.outstanding_amount)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setRepayModalOpen(false)}
                className="p-1 text-emerald-200 hover:text-white rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRepayLoan} className="p-6 space-y-4 text-xs">
              <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-1">
                <div className="text-xs font-bold text-emerald-950">
                  Tujuan Pengembalian: TA #{selectedLoanForRepay.from_academic_year_id} ({selectedLoanForRepay.from_fee_type_name || 'Pos Sumber'})
                </div>
                <div className="text-[10px] text-emerald-800">
                  Dana akan dipindahkan kembali dari pos pemakai di TA #{selectedLoanForRepay.to_academic_year_id}
                </div>
              </div>

              {borrowerAvailableBalance !== null && (
                <div className="text-[11px] text-slate-600">
                  Saldo kantong pemakai saat ini: <strong>{formatCurrency(borrowerAvailableBalance)}</strong>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Nominal Pengembalian (Rp) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  max={selectedLoanForRepay.outstanding_amount}
                  value={repayForm.amount}
                  onChange={(e) => setRepayForm({ ...repayForm, amount: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold font-mono"
                />
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Maksimal sisa pinjaman: {formatCurrency(selectedLoanForRepay.outstanding_amount)}
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tanggal Pengembalian <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={repayForm.repaid_at}
                  onChange={(e) => setRepayForm({ ...repayForm, repaid_at: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Catatan Pengembalian</label>
                <input
                  type="text"
                  placeholder="Contoh: Pengembalian termin 1 dari pencairan dana BOS"
                  value={repayForm.notes}
                  onChange={(e) => setRepayForm({ ...repayForm, notes: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setRepayModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={repayingLoan}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-xs disabled:opacity-50"
                >
                  {repayingLoan ? 'Memproses...' : 'Konfirmasi Pengembalian'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: DETAIL PINJAMAN & RIWAYAT REPAYMENT */}
      {/* ========================================================================= */}
      {detailModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-xl w-full overflow-hidden flex flex-col max-h-[85vh]">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm flex items-center gap-2">
                  <Eye className="w-4 h-4 text-indigo-400" />
                  Detail Pinjaman & Riwayat Pengembalian
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setDetailModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 flex-1 text-xs">
              {loadingDetail ? (
                <div className="py-12 text-center text-slate-400 italic">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-indigo-600 mb-2" />
                  Memuat rincian pinjaman...
                </div>
              ) : selectedLoanDetail ? (
                <div className="space-y-4">
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 font-semibold">Tujuan Penggunaan:</span>
                      <span className="font-bold text-slate-800">{selectedLoanDetail.purpose}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 font-semibold">Nominal Awal:</span>
                      <span className="font-bold font-mono">{formatCurrency(selectedLoanDetail.amount)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 font-semibold">Sisa Belum Kembali:</span>
                      <span className="font-bold font-mono text-amber-800">{formatCurrency(selectedLoanDetail.outstanding_amount)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 font-semibold">Tanggal Pinjam:</span>
                      <span>{String(selectedLoanDetail.borrowed_at).slice(0, 10)}</span>
                    </div>
                    {selectedLoanDetail.expected_repayment_note && (
                      <div className="text-[11px] text-slate-500 pt-1 border-t border-slate-200">
                        Catatan Rencana: {selectedLoanDetail.expected_repayment_note}
                      </div>
                    )}
                  </div>

                  <div>
                    <h4 className="font-bold text-slate-800 mb-2 flex items-center gap-1.5">
                      <History className="w-4 h-4 text-indigo-600" />
                      Riwayat Pengembalian ({selectedLoanDetail.repayments?.length || 0})
                    </h4>

                    {selectedLoanDetail.repayments?.length === 0 ? (
                      <div className="p-4 bg-slate-50 rounded-xl text-center text-slate-400 italic">
                        Belum ada riwayat pengembalian dana tercatat.
                      </div>
                    ) : (
                      <div className="border border-slate-200 rounded-2xl divide-y divide-slate-100 overflow-hidden">
                        {selectedLoanDetail.repayments.map((r) => (
                          <div key={r.id} className="p-3 flex justify-between items-center bg-white hover:bg-slate-50/60">
                            <div>
                              <div className="font-bold text-emerald-800">
                                + {formatCurrency(r.amount)}
                              </div>
                              <div className="text-[10px] text-slate-400 mt-0.5">
                                {String(r.repaid_at).slice(0, 10)} &bull; {r.notes || 'Pengembalian pinjaman'}
                              </div>
                            </div>
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                              Berhasil
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : null}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setDetailModalOpen(false)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded-xl text-xs"
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
