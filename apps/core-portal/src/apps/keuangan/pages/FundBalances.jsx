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
  TrendingDown,
  TrendingUp,
  Sparkles,
  ChevronRight,
  Activity,
  DollarSign
} from 'lucide-react';

export default function FundBalances({ isEmbedded = false, initialTab = 'balances' }) {
  const { activeSchoolUnit } = useAuth();
  
  // Active Tab: 'balances' (Pos Alokasi Dana & Saldo) | 'trajectory' (Matriks Lintas TA) | 'loans' (Pinjaman Antar TA)
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

  // State: Trajectory Data
  const [trajectoryData, setTrajectoryData] = useState(null);
  const [loadingTrajectory, setLoadingTrajectory] = useState(false);
  const [trajectorySearch, setTrajectorySearch] = useState('');

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
      setError(err.response?.data?.message || 'Gagal memuat data saldo pos alokasi dana');
    } finally {
      setLoading(false);
    }
  };

  // 3. Fetch Multi-Year Trajectory
  const fetchTrajectory = async () => {
    try {
      setLoadingTrajectory(true);
      const res = await api.get('/keuangan/fund-balances/multi-year-trajectory');
      if (res.data?.success) {
        setTrajectoryData(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching multi-year trajectory:', err);
    } finally {
      setLoadingTrajectory(false);
    }
  };

  // 4. Fetch Inter-Year Loans
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
    } else if (activeTab === 'trajectory') {
      fetchTrajectory();
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

  const filteredTrajectoryFunds = (trajectoryData?.funds || []).filter(f => {
    if (!trajectorySearch) return true;
    const q = trajectorySearch.toLowerCase();
    return f.name.toLowerCase().includes(q) || f.code.toLowerCase().includes(q);
  });

  const selectedYearObj = academicYears.find(y => String(y.id) === String(selectedYearId));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-800 tracking-tight">Pos Alokasi Sumber Dana</h1>
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
            Pelacakan dompet virtual penerimaan per jenis tagihan, saldo bawaan tahun sebelumnya, dan aliran pengeluaran
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-center flex-wrap">
          {/* Dropdown Filter Tahun Ajaran */}
          <div className="flex items-center gap-1.5 bg-white border border-slate-200 px-3 py-1.5 rounded-xl shadow-2xs">
            <Calendar className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span className="text-[11px] font-bold text-slate-500">Tahun Ajaran:</span>
            <select
              value={selectedYearId}
              onChange={(e) => handleYearChange(e.target.value)}
              className="text-xs font-bold text-slate-800 bg-transparent border-none focus:ring-0 cursor-pointer pr-4"
            >
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
            onClick={() => {
              if (activeTab === 'balances') fetchFundBalances();
              else if (activeTab === 'trajectory') fetchTrajectory();
              else fetchLoans();
            }}
            disabled={loading || loadingLoans || loadingTrajectory}
            className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl shadow-2xs transition disabled:opacity-60"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading || loadingLoans || loadingTrajectory ? 'animate-spin text-emerald-600' : 'text-slate-500'}`} />
            <span>{loading || loadingLoans || loadingTrajectory ? 'Memuat...' : 'Muat Ulang'}</span>
          </button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-slate-200 gap-6 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('balances')}
          className={`pb-3 text-xs font-bold flex items-center gap-2 border-b-2 transition shrink-0 ${
            activeTab === 'balances'
              ? 'border-emerald-600 text-emerald-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Pos Alokasi Dana &amp; Saldo</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('trajectory')}
          className={`pb-3 text-xs font-bold flex items-center gap-2 border-b-2 transition shrink-0 ${
            activeTab === 'trajectory'
              ? 'border-emerald-600 text-emerald-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>Matriks Akumulasi Lintas Tahun Ajaran</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('loans')}
          className={`pb-3 text-xs font-bold flex items-center gap-2 border-b-2 transition shrink-0 ${
            activeTab === 'loans'
              ? 'border-emerald-600 text-emerald-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <ArrowRightLeft className="w-4 h-4" />
          <span>Pinjaman &amp; Realokasi Antar Tahun Ajaran</span>
          {loansSummary.aged_loans_count > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-600 text-white animate-pulse" title={`${loansSummary.aged_loans_count} pinjaman >90 hari`}>
              {loansSummary.aged_loans_count}
            </span>
          )}
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: POS ALOKASI DANA & SALDO */}
      {/* ========================================================================= */}
      {activeTab === 'balances' && (
        <div className="space-y-6">
          {error && (
            <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Hero Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Total Saldo Tersedia */}
            <div className="bg-gradient-to-br from-emerald-600 to-teal-700 text-white p-5 rounded-2xl shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-emerald-100">Total Saldo Tersedia</span>
                <div className="p-2 bg-white/20 text-white rounded-xl">
                  <Wallet className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-extrabold text-white">
                  {formatCurrency(summary.total_fund_balance)}
                </div>
                <p className="text-[11px] text-emerald-100 font-medium mt-1">
                  Saldo bawaan lalu + kas berjalan
                </p>
              </div>
            </div>

            {/* Card 2: Saldo Bawaan Tahun Sebelumnya */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Saldo Bawaan T.A. Lalu</span>
                <div className="p-2 bg-purple-50 text-purple-600 rounded-xl">
                  <History className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-extrabold text-purple-700">
                  {formatCurrency(summary.total_prior_carry_over)}
                </div>
                <p className="text-[11px] text-purple-600 font-medium mt-1">
                  Sisa akumulasi tahun sebelumnya
                </p>
              </div>
            </div>

            {/* Card 3: Penerimaan Tahun Berjalan */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Penerimaan T.A. Berjalan</span>
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                  <ArrowDownLeft className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-extrabold text-emerald-700">
                  {formatCurrency(summary.total_current_year_in)}
                </div>
                <p className="text-[11px] text-emerald-600 font-medium mt-1">
                  Pembayaran siswa &amp; kas masuk
                </p>
              </div>
            </div>

            {/* Card 4: Pengeluaran Tahun Berjalan */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Pengeluaran T.A. Berjalan</span>
                <div className="p-2 bg-rose-50 text-rose-600 rounded-xl">
                  <ArrowUpRight className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-extrabold text-rose-700">
                  {formatCurrency(summary.total_current_year_out)}
                </div>
                <p className="text-[11px] text-rose-600 font-medium mt-1">
                  Realisasi belanja operasional
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
                    placeholder="Cari nama pos alokasi dana atau kode..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:ring-2 focus:ring-emerald-500 transition"
                >
                  <option value="all">Semua Kategori Pos Dana</option>
                  <option value="fee_type">Penerimaan Tagihan Siswa</option>
                  <option value="budget_income_item">Sumber Lain (RAPBS)</option>
                  <option value="opening_pool">Saldo Awal &amp; Kas Utama</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 rounded-l-xl">Pos Alokasi Sumber Dana</th>
                    <th className="px-4 py-3">Kategori Sumber</th>
                    <th className="px-4 py-3 text-right">Pagu Target</th>
                    <th className="px-4 py-3 text-right">Saldo Bawaan Lalu</th>
                    <th className="px-4 py-3 text-right">Penerimaan Berjalan</th>
                    <th className="px-4 py-3 text-right">Belanja Berjalan</th>
                    <th className="px-4 py-3 text-right font-bold text-slate-800">Total Saldo Tersedia</th>
                    <th className="px-4 py-3 text-center rounded-r-xl">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-12 text-center text-slate-400 italic">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto text-emerald-600 mb-2" />
                        Memuat data pos alokasi dana...
                      </td>
                    </tr>
                  ) : filteredFunds.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-slate-400 italic">
                        Tidak ada pos alokasi dana yang sesuai kriteria.
                      </td>
                    </tr>
                  ) : (
                    filteredFunds.map((f, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/70 transition">
                        <td className="px-4 py-3.5">
                          <div className="font-bold text-slate-800">{f.name}</div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[10px] text-slate-400 font-mono">{f.code || '-'}</span>
                            {f.billing_pattern && (
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-medium">
                                {f.billing_pattern === 'monthly' ? 'Bulanan' : 'Insidental'}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                            f.category === 'Saldo Awal & Kas Utama'
                              ? 'bg-purple-50 text-purple-700 border border-purple-200/60'
                              : f.category === 'Sumber Pendapatan Lain (RAPBS)'
                              ? 'bg-teal-50 text-teal-700 border border-teal-200/60'
                              : 'bg-indigo-50 text-indigo-700 border border-indigo-200/60'
                          }`}>
                            {f.category || 'Penerimaan Tagihan Siswa'}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-right font-mono text-slate-600 font-semibold">
                          {f.planned_amount > 0 ? formatCurrency(f.planned_amount) : '-'}
                        </td>
                        <td className="px-4 py-3.5 text-right font-mono text-purple-700 font-semibold">
                          {f.prior_years_carry_over > 0 ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded bg-purple-50 text-purple-800 border border-purple-200/50">
                              {formatCurrency(f.prior_years_carry_over)}
                            </span>
                          ) : (
                            <span className="text-slate-400">Rp 0</span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-right font-mono text-emerald-700 font-semibold">
                          {f.current_year_in > 0 ? `+${formatCurrency(f.current_year_in)}` : 'Rp 0'}
                        </td>
                        <td className="px-4 py-3.5 text-right font-mono text-rose-700 font-semibold">
                          {f.current_year_out > 0 ? `-${formatCurrency(f.current_year_out)}` : 'Rp 0'}
                        </td>
                        <td className="px-4 py-3.5 text-right font-mono font-extrabold text-slate-900 text-sm">
                          <span className={f.balance > 0 ? 'text-emerald-800' : 'text-slate-700'}>
                            {formatCurrency(f.balance)}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <button
                            type="button"
                            onClick={() => handleOpenMutationsModal(f)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-50 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 border border-slate-200 rounded-xl transition font-semibold text-[11px]"
                            title="Lihat Riwayat Aliran Masuk & Keluar"
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
      {/* TAB 2: MATRIKS AKUMULASI LINTAS TAHUN AJARAN */}
      {/* ========================================================================= */}
      {activeTab === 'trajectory' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-800">Evolusi Saldo Lintas Tahun Ajaran (Multi-Year Trajectory)</h3>
                <p className="text-[11px] text-slate-500">
                  Melacak saldo bawaan tahun sebelumnya yang terus terakumulasi dan digunakan pada tahun-tahun ajaran berikutnya
                </p>
              </div>

              <div className="w-full sm:w-72">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Cari pos dana..."
                    value={trajectorySearch}
                    onChange={(e) => setTrajectorySearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  />
                </div>
              </div>
            </div>

            {loadingTrajectory ? (
              <div className="py-12 text-center text-slate-400 italic text-xs">
                <Loader2 className="w-6 h-6 animate-spin mx-auto text-emerald-600 mb-2" />
                Memuat matriks saldo lintas tahun ajaran...
              </div>
            ) : !trajectoryData || filteredTrajectoryFunds.length === 0 ? (
              <div className="py-8 text-center text-slate-400 italic text-xs">
                Tidak ada data matriks yang ditemukan.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-800 text-white font-semibold">
                      <th className="px-4 py-3 rounded-tl-xl sticky left-0 bg-slate-800 z-10">Pos Alokasi Sumber Dana</th>
                      {trajectoryData.academic_years.map((ay) => (
                        <th key={ay.id} className="px-4 py-3 text-center border-l border-slate-700 min-w-[170px]">
                          <div>{ay.name}</div>
                          <div className="text-[9px] font-normal text-slate-300">
                            {ay.is_active ? '(T.A. Aktif)' : ''}
                          </div>
                        </th>
                      ))}
                      <th className="px-4 py-3 text-right rounded-tr-xl bg-slate-900 border-l border-slate-700">
                        Total Saldo Terkini
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredTrajectoryFunds.map((fund, fIdx) => (
                      <tr key={fIdx} className="hover:bg-slate-50/70 transition">
                        <td className="px-4 py-3.5 font-bold text-slate-800 sticky left-0 bg-white shadow-xs">
                          <div>{fund.name}</div>
                          <span className="text-[10px] text-slate-400 font-mono">{fund.code}</span>
                        </td>
                        {trajectoryData.academic_years.map((ay) => {
                          const item = fund.trajectory?.find(t => t.academic_year_id === ay.id) || {
                            total_in: 0,
                            total_out: 0,
                            net_change: 0,
                            cumulative_balance: 0
                          };
                          const isCurrentYear = String(ay.id) === String(selectedYearId);
                          return (
                            <td
                              key={ay.id}
                              className={`px-3 py-2.5 text-right font-mono border-l border-slate-100 ${
                                isCurrentYear ? 'bg-emerald-50/60' : ''
                              }`}
                            >
                              <div className="text-[10px] text-emerald-700">
                                {item.total_in > 0 ? `+${formatCurrency(item.total_in)}` : '-'}
                              </div>
                              <div className="text-[10px] text-rose-700">
                                {item.total_out > 0 ? `-${formatCurrency(item.total_out)}` : '-'}
                              </div>
                              <div className="text-xs font-bold text-slate-900 pt-1 border-t border-slate-100 mt-0.5">
                                Saldo: {formatCurrency(item.cumulative_balance)}
                              </div>
                            </td>
                          );
                        })}
                        <td className="px-4 py-3.5 text-right font-mono font-extrabold text-sm text-emerald-800 bg-slate-50 border-l border-slate-200">
                          {formatCurrency(fund.total_balance)}
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

      {/* ========================================================================= */}
      {/* TAB 3: PINJAMAN & REALOKASI ANTAR TAHUN AJARAN */}
      {/* ========================================================================= */}
      {activeTab === 'loans' && (
        <div className="space-y-6">
          {loansError && (
            <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{loansError}</span>
            </div>
          )}

          {/* Loans Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Total Dana Dipinjamkan</span>
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                  <ArrowRightLeft className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-extrabold text-slate-800">
                  {formatCurrency(loansSummary.total_loaned)}
                </div>
                <p className="text-[11px] text-slate-400 mt-1">Akumulasi seluruh transaksi pinjaman</p>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Sisa Belum Kembali</span>
                <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
                  <Clock className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-extrabold text-amber-700">
                  {formatCurrency(loansSummary.total_outstanding)}
                </div>
                <p className="text-[11px] text-amber-600 font-medium mt-1">
                  {loansSummary.active_loans_count || 0} pinjaman belum lunas
                </p>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Total Telah Dikembalikan</span>
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-extrabold text-emerald-700">
                  {formatCurrency(loansSummary.total_repaid)}
                </div>
                <p className="text-[11px] text-emerald-600 font-medium mt-1">Saldo telah dipulihkan ke pos asal</p>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Pinjaman Lewat 90 Hari</span>
                <div className="p-2 bg-rose-50 text-rose-600 rounded-xl">
                  <ShieldAlert className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-extrabold text-rose-700">
                  {loansSummary.aged_loans_count || 0}
                </div>
                <p className="text-[11px] text-rose-600 font-medium mt-1">Perlu perhatian &amp; pengembalian</p>
              </div>
            </div>
          </div>

          {/* Loans Table */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 flex-1 max-w-md">
                <div className="relative w-full">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Cari alasan pinjaman / pos..."
                    value={loanSearchTerm}
                    onChange={(e) => setLoanSearchTerm(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={loanStatusFilter}
                  onChange={(e) => setLoanStatusFilter(e.target.value)}
                  className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700"
                >
                  <option value="all">Semua Status</option>
                  <option value="outstanding">Belum Lunas (Outstanding)</option>
                  <option value="partially_repaid">Sebagian Dikembalikan</option>
                  <option value="repaid">Lunas Penuh</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 rounded-l-xl">Alasan &amp; Tujuan Penggunaan</th>
                    <th className="px-4 py-3">T.A. Sumber &rarr; T.A. Pemakai</th>
                    <th className="px-4 py-3 text-right">Nominal Pinjam</th>
                    <th className="px-4 py-3 text-right">Sisa Belum Kembali</th>
                    <th className="px-4 py-3 text-center">Status &amp; Usia</th>
                    <th className="px-4 py-3 text-center rounded-r-xl">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loadingLoans ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-12 text-center text-slate-400 italic">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto text-indigo-600 mb-2" />
                        Memuat data pinjaman antar tahun ajaran...
                      </td>
                    </tr>
                  ) : filteredLoans.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-slate-400 italic">
                        Belum ada data pinjaman antar tahun ajaran.
                      </td>
                    </tr>
                  ) : (
                    filteredLoans.map((loan) => (
                      <tr key={loan.id} className="hover:bg-slate-50/70 transition">
                        <td className="px-4 py-3.5">
                          <div className="font-bold text-slate-800">{loan.purpose}</div>
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            Pinjam: {String(loan.borrowed_at).slice(0, 10)}
                            {loan.expected_repayment_note && ` • Rencana: ${loan.expected_repayment_note}`}
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="font-semibold text-slate-700">
                            TA #{loan.from_academic_year_id} ({loan.from_fee_type_name || 'Pos Sumber'})
                          </div>
                          <div className="text-[10px] text-indigo-600 font-semibold flex items-center gap-1 mt-0.5">
                            <span>&rarr; TA #{loan.to_academic_year_id} ({loan.to_fee_type_name || 'Pos Tujuan'})</span>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-right font-mono font-semibold text-slate-800">
                          {formatCurrency(loan.amount)}
                        </td>
                        <td className="px-4 py-3.5 text-right font-mono font-bold text-amber-800">
                          {formatCurrency(loan.outstanding_amount)}
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <div className="flex flex-col items-center gap-1">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                loan.status === 'repaid'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : loan.status === 'partially_repaid'
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {loan.status === 'repaid'
                                ? 'Lunas'
                                : loan.status === 'partially_repaid'
                                ? 'Sebagian'
                                : 'Belum Kembali'}
                            </span>
                            {loan.status !== 'repaid' && (
                              <span
                                className={`text-[9px] font-medium ${
                                  loan.is_aged_90_days ? 'text-rose-600 font-bold' : 'text-slate-400'
                                }`}
                              >
                                {loan.days_outstanding} hari
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {loan.status !== 'repaid' && (
                              <button
                                type="button"
                                onClick={() => handleOpenRepayModal(loan)}
                                className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[11px] font-bold shadow-2xs transition"
                              >
                                Kembalikan
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleOpenDetailModal(loan.id)}
                              className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition"
                              title="Detail Pinjaman & Riwayat"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                          </div>
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
      {/* MODAL MUTASI DRILL-DOWN                                                   */}
      {/* ========================================================================= */}
      {selectedFund && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-2xl w-full overflow-hidden flex flex-col max-h-[85vh]">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm flex items-center gap-2">
                  <Coins className="w-4 h-4 text-emerald-400" />
                  Riwayat Mutasi: {selectedFund.name}
                </h3>
                <p className="text-[11px] text-slate-300 mt-0.5">
                  Saldo Tersedia: <strong>{formatCurrency(selectedFund.balance)}</strong>
                  {selectedFund.prior_years_carry_over > 0 && ` (Termasuk Saldo Bawaan: ${formatCurrency(selectedFund.prior_years_carry_over)})`}
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
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-emerald-600 mb-2" />
                  Memuat riwayat mutasi dana...
                </div>
              ) : mutationError ? (
                <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl">
                  {mutationError}
                </div>
              ) : mutations.length === 0 ? (
                <div className="py-8 text-center text-slate-400 italic text-xs">
                  Belum ada catatan mutasi untuk pos alokasi dana ini.
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

      {/* MODAL 1: CATAT PINJAMAN ANTAR TAHUN AJARAN */}
      {createLoanModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm flex items-center gap-2">
                  <ArrowRightLeft className="w-4 h-4 text-emerald-400" />
                  Catat Pinjaman / Realokasi Antar Tahun Ajaran
                </h3>
                <p className="text-[11px] text-slate-300 mt-0.5">
                  Pinjam sementara dana tahun ajaran lain untuk kebutuhan operasional
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCreateLoanModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateLoan} className="p-6 overflow-y-auto space-y-4 flex-1 text-xs">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-[11px] leading-relaxed">
                <strong>Informasi Akuntansi:</strong> Transaksi ini murni realokasi internal pada lapisan pos alokasi dana (<em>fund_balances</em>) dan tidak membentuk jurnal hutang/piutang formal baru di COA.
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
                  <div className="text-[11px] font-medium text-emerald-700 flex items-center gap-1.5">
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
                  placeholder="Contoh: Talangan biaya operasional sebelum dana termin berikutnya cair..."
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
                  placeholder="Contoh: Akan dikembalikan bertahap dari penerimaan SPP"
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
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-xs disabled:opacity-50"
                >
                  {creatingLoan ? 'Menyimpan...' : 'Catat & Realokasikan Saldo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: CATAT PENGEMBALIAN PINJAMAN */}
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
                  Saldo pos pemakai saat ini: <strong>{formatCurrency(borrowerAvailableBalance)}</strong>
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
                  placeholder="Contoh: Pengembalian pinjaman dana termin 1"
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

      {/* MODAL 3: DETAIL PINJAMAN */}
      {detailModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-xl w-full overflow-hidden flex flex-col max-h-[85vh]">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm flex items-center gap-2">
                  <Eye className="w-4 h-4 text-emerald-400" />
                  Detail Pinjaman &amp; Riwayat Pengembalian
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
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-emerald-600 mb-2" />
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
                      <History className="w-4 h-4 text-emerald-600" />
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
