import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../../shared/store/AuthContext';
import api from '../../../shared/services/api';
import {
  CreditCard,
  Plus,
  Printer,
  Edit2,
  Receipt,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  X,
  FileDown,
  ExternalLink,
  Eye,
  Check,
  Ban,
  ShieldCheck,
  AlertCircle,
  RotateCw,
  Building2,
  Calendar,
  UserCheck,
  Layers,
  ArrowDownLeft,
  FileSpreadsheet,
  Download,
  Landmark,
  TrendingUp,
  Wallet,
  BookOpen,
  Sliders,
  RefreshCw
} from 'lucide-react';

export default function Payments() {
  const { activeSchoolUnit } = useAuth();

  // Top-Level Penerimaan Category
  // 'student' | 'ppdb' | 'other_income' | 'daily_inflows'
  const [mainTab, setMainTab] = useState('student');

  // Academic Years Context
  const [academicYears, setAcademicYears] = useState([]);
  const [activeAcademicYearId, setActiveAcademicYearId] = useState('');
  const [ppdbAcademicYearId, setPpdbAcademicYearId] = useState('');

  // Shared Cash Accounts & Master Context
  const [cashAccounts, setCashAccounts] = useState([]);
  const [transactionRules, setTransactionRules] = useState([]);
  const [loading, setLoading] = useState(false);

  // ==========================================
  // 1. SECTION SISWA AKTIF STATES
  // ==========================================
  const [studentSubTab, setStudentSubTab] = useState('proofs'); // 'proofs' | 'pos'
  const [unpaidBills, setUnpaidBills] = useState([]);
  const [proofs, setProofs] = useState([]);
  const [proofFilter, setProofFilter] = useState('pending');
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    student_bill_id: '',
    cash_account_id: '',
    amount: '',
    payment_method: 'cash',
    notes: ''
  });
  const [submitting, setSubmitting] = useState(false);

  // Receipt Modal (Siswa Aktif)
  const [receiptData, setReceiptData] = useState(null);
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);

  // Preview & Verification Modals
  const [previewProof, setPreviewProof] = useState(null);
  const [verifyModalProof, setVerifyModalProof] = useState(null);
  const [verifyCashAccountId, setVerifyCashAccountId] = useState('');
  const [verifyAllocations, setVerifyAllocations] = useState([]);
  const [studentUnpaidBills, setStudentUnpaidBills] = useState([]);
  const [rejectModalProof, setRejectModalProof] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // ==========================================
  // 2. SECTION PPDB (CALON MURID) STATES
  // ==========================================
  const [ppdbBills, setPpdbBills] = useState([]);
  const [loadingPpdb, setLoadingPpdb] = useState(false);
  const [ppdbSearch, setPpdbSearch] = useState('');
  const [ppdbPayModalOpen, setPpdbPayModalOpen] = useState(false);
  const [selectedPpdbBill, setSelectedPpdbBill] = useState(null);
  const [ppdbPayForm, setPpdbPayForm] = useState({
    amount_paid: '',
    cash_account_id: '',
    payment_date: new Date().toISOString().slice(0, 10),
    payment_method: 'cash',
    notes: ''
  });
  const [savingPpdbPayment, setSavingPpdbPayment] = useState(false);
  const [ppdbReceiptData, setPpdbReceiptData] = useState(null);
  const [ppdbReceiptModalOpen, setPpdbReceiptModalOpen] = useState(false);

  // ==========================================
  // 3. SECTION SUMBER LAIN (RAPBS) STATES
  // ==========================================
  const [rapbsSources, setRapbsSources] = useState([]);
  const [otherIncomesList, setOtherIncomesList] = useState([]);
  const [loadingOtherIncome, setLoadingOtherIncome] = useState(false);
  const [otherIncomeModalOpen, setOtherIncomeModalOpen] = useState(false);
  const [otherIncomeForm, setOtherIncomeForm] = useState({
    budget_plan_income_item_id: '',
    cash_account_id: '',
    amount: '',
    received_at: new Date().toISOString().slice(0, 10),
    notes: ''
  });
  const [savingOtherIncome, setSavingOtherIncome] = useState(false);

  // ==========================================
  // 4. SECTION REKAP & BUKU KAS GABUNGAN
  // ==========================================
  const [inflowsData, setInflowsData] = useState({ summary: {}, inflows: [], pagination: {} });
  const [loadingInflows, setLoadingInflows] = useState(false);
  const [inflowStartDate, setInflowStartDate] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
  });
  const [inflowEndDate, setInflowEndDate] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().slice(0, 10);
  });
  const [inflowCategoryFilter, setInflowCategoryFilter] = useState('all');
  const [inflowSearch, setInflowSearch] = useState('');

  // Initial Fetch Master Data
  useEffect(() => {
    fetchMasterContext();
  }, [activeSchoolUnit]);

  // Fetch Section Data when active tab or unit changes
  useEffect(() => {
    if (mainTab === 'student') {
      fetchStudentData();
    } else if (mainTab === 'ppdb') {
      fetchPpdbData();
    } else if (mainTab === 'other_income') {
      fetchOtherIncomeData();
    } else if (mainTab === 'daily_inflows') {
      fetchAllInflowsData();
    }
  }, [
    activeSchoolUnit,
    mainTab,
    activeAcademicYearId,
    ppdbAcademicYearId,
    inflowStartDate,
    inflowEndDate,
    inflowCategoryFilter
  ]);

  const fetchMasterContext = async () => {
    try {
      const [cashRes, ayRes, trRes] = await Promise.all([
        api.get('/keuangan/cash-accounts'),
        api.get('/keuangan/academic-years'),
        api.get('/keuangan/transaction-account-mappings')
      ]);

      const accs = cashRes.data?.data || [];
      setCashAccounts(accs);

      const ays = ayRes.data?.data || [];
      setAcademicYears(ays);

      const rules = trRes.data?.data || [];
      setTransactionRules(rules);

      if (ays.length > 0) {
        // Find current active year
        const currentYear = ays.find(y => y.is_active) || ays[0];
        setActiveAcademicYearId(String(currentYear.id));

        // PPDB defaults to next academic year if exists, else next index or active
        const currentIndex = ays.findIndex(y => y.id === currentYear.id);
        const nextYear = (currentIndex >= 0 && currentIndex < ays.length - 1)
          ? ays[currentIndex + 1]
          : (ays.find(y => y.id !== currentYear.id) || currentYear);
        setPpdbAcademicYearId(String(nextYear.id));
      }

      if (accs.length > 0) {
        setFormData(prev => ({ ...prev, cash_account_id: accs[0].id }));
        setPpdbPayForm(prev => ({ ...prev, cash_account_id: accs[0].id }));
        setOtherIncomeForm(prev => ({ ...prev, cash_account_id: accs[0].id }));
        const bankAcc = accs.find(a => a.account_kind === 'bank') || accs[0];
        setVerifyCashAccountId(bankAcc.id);
      }
    } catch (err) {
      console.error('Error fetching master context:', err);
    }
  };

  // 1. Fetch Student Bills & Proofs
  const fetchStudentData = async () => {
    setLoading(true);
    try {
      const [billsRes, proofsRes] = await Promise.all([
        api.get('/keuangan/student-bills?status=unpaid'),
        api.get('/keuangan/bill-payment-proofs')
      ]);
      setUnpaidBills(billsRes.data?.data || []);
      setProofs(proofsRes.data?.data || []);
    } catch (err) {
      console.error('Error fetching student data:', err);
    } finally {
      setLoading(false);
    }
  };

  // 2. Fetch PPDB Bills
  const fetchPpdbData = async () => {
    setLoadingPpdb(true);
    try {
      const params = {
        status: 'unpaid'
      };
      if (ppdbAcademicYearId) {
        params.target_academic_year_id = ppdbAcademicYearId;
      }
      if (ppdbSearch) {
        params.search = ppdbSearch;
      }

      const res = await api.get('/keuangan/ppdb-billing/registration-bills', { params });
      setPpdbBills(res.data?.data?.bills || res.data?.data || []);
    } catch (err) {
      console.error('Error fetching PPDB bills:', err);
    } finally {
      setLoadingPpdb(false);
    }
  };

  // 3. Fetch Other Income & RAPBS Sources
  const fetchOtherIncomeData = async () => {
    setLoadingOtherIncome(true);
    try {
      const [rapbsRes, incRes] = await Promise.all([
        api.get(`/keuangan/other-incomes/rapbs-sources${activeAcademicYearId ? `?academic_year_id=${activeAcademicYearId}` : ''}`),
        api.get(`/keuangan/other-incomes${activeAcademicYearId ? `?academic_year_id=${activeAcademicYearId}` : ''}`)
      ]);

      const sources = rapbsRes.data?.data || [];
      setRapbsSources(sources);
      setOtherIncomesList(incRes.data?.data || []);

      if (sources.length > 0 && !otherIncomeForm.budget_plan_income_item_id) {
        setOtherIncomeForm(prev => ({
          ...prev,
          budget_plan_income_item_id: String(sources[0].id)
        }));
      }
    } catch (err) {
      console.error('Error fetching other incomes data:', err);
    } finally {
      setLoadingOtherIncome(false);
    }
  };

  // 4. Fetch All Inflows Timeline
  const fetchAllInflowsData = async () => {
    setLoadingInflows(true);
    try {
      const params = {
        start_date: inflowStartDate,
        end_date: inflowEndDate,
        academic_year_id: activeAcademicYearId || undefined,
        category: inflowCategoryFilter !== 'all' ? inflowCategoryFilter : undefined,
        search: inflowSearch || undefined
      };
      const res = await api.get('/keuangan/payments/all-inflows', { params });
      if (res.data?.success) {
        setInflowsData(res.data.data || { summary: {}, inflows: [], pagination: {} });
      }
    } catch (err) {
      console.error('Error fetching all inflows:', err);
    } finally {
      setLoadingInflows(false);
    }
  };

  // ==========================================
  // HANDLERS: SISWA AKTIF
  // ==========================================
  const handleSelectBill = (billId) => {
    const b = unpaidBills.find(x => x.id === parseInt(billId, 10));
    setFormData(prev => ({
      ...prev,
      student_bill_id: billId,
      amount: b ? b.amount : ''
    }));
  };

  const handleRecordPayment = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await api.post('/keuangan/bill-payments', formData);
      alert('Pembayaran siswa berhasil dicatat & jurnal otomatis telah dibukukan!');
      setPayModalOpen(false);
      fetchStudentData();
      if (res.data?.data?.id) {
        handleViewReceipt(res.data.data.id);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal mencatat pembayaran');
    } finally {
      setSubmitting(false);
    }
  };

  const handleViewReceipt = async (paymentId) => {
    try {
      const res = await api.get(`/keuangan/bill-payments/${paymentId}/receipt`);
      setReceiptData(res.data?.data);
      setReceiptModalOpen(true);
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal memuat kwitansi pembayaran');
    }
  };

  const handleOpenVerifyModal = async (proof) => {
    setVerifyModalProof(proof);
    try {
      const targetStudentId = proof.student_id || proof.bill_student_id;
      let sBills = unpaidBills;
      if (targetStudentId) {
        sBills = unpaidBills.filter(b => b.student_id === targetStudentId);
      }
      setStudentUnpaidBills(sBills);

      const allocRes = await api.get(`/keuangan/bill-payment-proofs/${proof.id}/allocations`);
      const existingAllocs = allocRes.data?.data || [];

      if (existingAllocs.length > 0) {
        setVerifyAllocations(
          existingAllocs.map(a => ({
            student_bill_id: String(a.student_bill_id),
            allocated_amount: parseFloat(a.allocated_amount)
          }))
        );
      } else {
        const initialBillId = proof.student_bill_id ? String(proof.student_bill_id) : (sBills[0] ? String(sBills[0].id) : '');
        const totalTransfer = parseFloat(proof.total_transfer_amount || proof.amount || 0);
        setVerifyAllocations([
          {
            student_bill_id: initialBillId,
            allocated_amount: totalTransfer
          }
        ]);
      }
    } catch (err) {
      console.error('Error fetching allocations for verify modal:', err);
    }
  };

  const handleVerifyProofSubmit = async (e) => {
    e.preventDefault();
    if (!verifyModalProof) return;

    const totalTransfer = parseFloat(verifyModalProof.total_transfer_amount || verifyModalProof.amount || 0);
    const sumAllocated = verifyAllocations.reduce((acc, a) => acc + (parseFloat(a.allocated_amount) || 0), 0);

    if (Math.abs(sumAllocated - totalTransfer) > 0.01) {
      alert(`Total nominal dialokasikan (Rp ${sumAllocated.toLocaleString('id-ID')}) belum sama dengan nominal transfer (Rp ${totalTransfer.toLocaleString('id-ID')}). Sisa: Rp ${(totalTransfer - sumAllocated).toLocaleString('id-ID')}`);
      return;
    }

    setSubmitting(true);
    try {
      await api.post(`/keuangan/bill-payment-proofs/${verifyModalProof.id}/allocations`, {
        allocations: verifyAllocations.map(a => ({
          student_bill_id: parseInt(a.student_bill_id, 10),
          allocated_amount: parseFloat(a.allocated_amount)
        }))
      });

      await api.patch(`/keuangan/bill-payment-proofs/${verifyModalProof.id}/verify`, {
        cash_account_id: verifyCashAccountId ? parseInt(verifyCashAccountId, 10) : undefined
      });

      alert('Bukti transfer berhasil diverifikasi & kwitansi diterbitkan!');
      setVerifyModalProof(null);
      fetchStudentData();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal memverifikasi bukti transfer');
    } finally {
      setSubmitting(false);
    }
  };

  // ==========================================
  // HANDLERS: PPDB (CALON MURID)
  // ==========================================
  const handleOpenPpdbPay = (bill) => {
    setSelectedPpdbBill(bill);
    const remaining = Math.max(0, parseFloat(bill.amount || 0) - parseFloat(bill.paid_amount || 0));
    setPpdbPayForm({
      amount_paid: remaining > 0 ? remaining : '',
      cash_account_id: cashAccounts[0]?.id || '',
      payment_date: new Date().toISOString().slice(0, 10),
      payment_method: 'cash',
      notes: `Pembayaran ${bill.billing_phase === 'enrollment_fee' ? 'Uang Pangkal' : 'Pendaftaran'} PPDB: ${bill.registrant_name_snapshot}`
    });
    setPpdbPayModalOpen(true);
  };

  const handleRecordPpdbPayment = async (e) => {
    e.preventDefault();
    if (!selectedPpdbBill) return;
    try {
      setSavingPpdbPayment(true);
      const res = await api.post(`/keuangan/ppdb-billing/registration-bills/${selectedPpdbBill.id}/pay`, ppdbPayForm);
      alert('Pembayaran PPDB berhasil dicatat & jurnal resmi piutang PPDB telah dikreditkan!');
      setPpdbPayModalOpen(false);
      fetchPpdbData();
      if (res.data?.data?.payment_id) {
        handleViewPpdbReceipt(res.data.data.payment_id);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal mencatat pembayaran PPDB');
    } finally {
      setSavingPpdbPayment(false);
    }
  };

  const handleViewPpdbReceipt = async (paymentId) => {
    try {
      const res = await api.get(`/keuangan/ppdb-billing/payments/${paymentId}/receipt`);
      setPpdbReceiptData(res.data?.data);
      setPpdbReceiptModalOpen(true);
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal memuat kwitansi PPDB');
    }
  };

  // ==========================================
  // HANDLERS: OTHER INCOMES (RAPBS)
  // ==========================================
  const handleCreateOtherIncome = async (e) => {
    e.preventDefault();
    try {
      setSavingOtherIncome(true);
      const res = await api.post('/keuangan/other-incomes', {
        ...otherIncomeForm,
        academic_year_id: activeAcademicYearId || 1
      });
      alert('Penerimaan sumber lain RAPBS berhasil dicatat & jurnal otomatis telah dibukukan!');
      setOtherIncomeModalOpen(false);
      setOtherIncomeForm({
        budget_plan_income_item_id: rapbsSources[0]?.id || '',
        cash_account_id: cashAccounts[0]?.id || '',
        amount: '',
        received_at: new Date().toISOString().slice(0, 10),
        notes: ''
      });
      fetchOtherIncomeData();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal mencatat penerimaan sumber lain');
    } finally {
      setSavingOtherIncome(false);
    }
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0
    }).format(val || 0);
  };

  return (
    <div className="space-y-6">
      {/* Header Halaman Terpadu */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center space-x-2">
            <span className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <CreditCard className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-bold text-slate-800 tracking-tight">
              Pusat Penerimaan Kas & Kwitansi
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Loket terpadu pencatatan kas masuk: Tagihan Siswa Aktif, Pembayaran PPDB Calon Murid, dan Penerimaan Sumber Lain (RAPBS)
          </p>
        </div>

        {/* Global Multi-Tenant Info */}
        <div className="flex items-center space-x-2 text-xs">
          <span className="px-3 py-1.5 bg-slate-100 rounded-xl font-medium text-slate-700 flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-slate-500" />
            {activeSchoolUnit?.name || 'Seluruh Satuan'}
          </span>
          <span className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-xl font-medium flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-blue-600" />
            T.A. Berjalan: {academicYears.find(y => String(y.id) === String(activeAcademicYearId))?.name || '2025/2026'}
          </span>
        </div>
      </div>

      {/* Main Penerimaan Tabs Switcher */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setMainTab('student')}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all ${
            mainTab === 'student'
              ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/20'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span>1. Siswa Aktif (SPP & Biaya)</span>
          {proofs.filter(p => p.status === 'pending').length > 0 && (
            <span className="px-1.5 py-0.5 bg-amber-400 text-amber-950 rounded-full text-[10px] font-bold">
              {proofs.filter(p => p.status === 'pending').length}
            </span>
          )}
        </button>

        <button
          onClick={() => setMainTab('ppdb')}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all ${
            mainTab === 'ppdb'
              ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/20'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          <span>2. Calon Murid PPDB</span>
          <span className="px-1.5 py-0.5 bg-indigo-100 text-indigo-700 rounded-md text-[10px] font-semibold">
            T.A. Masuk
          </span>
        </button>

        <button
          onClick={() => setMainTab('other_income')}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all ${
            mainTab === 'other_income'
              ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/20'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>3. Sumber Lain (RAPBS)</span>
        </button>

        <button
          onClick={() => setMainTab('daily_inflows')}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all ${
            mainTab === 'daily_inflows'
              ? 'bg-slate-900 text-white shadow-sm shadow-slate-900/20'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>4. Rekapitulasi Kas Masuk</span>
        </button>
      </div>

      {/* ============================================================== */}
      {/* TAB 1: PENERIMAAN SISWA AKTIF                                 */}
      {/* ============================================================== */}
      {mainTab === 'student' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-slate-50 p-2 rounded-xl border border-slate-200">
            <div className="flex items-center space-x-1">
              <button
                onClick={() => setStudentSubTab('proofs')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  studentSubTab === 'proofs'
                    ? 'bg-white text-slate-800 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Clock className="w-3.5 h-3.5 text-amber-500" />
                <span>Verifikasi Bukti Transfer Orang Tua</span>
              </button>
              <button
                onClick={() => setStudentSubTab('pos')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  studentSubTab === 'pos'
                    ? 'bg-white text-slate-800 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <CreditCard className="w-3.5 h-3.5 text-blue-500" />
                <span>Kasir Loket Langsung (POS)</span>
              </button>
            </div>
            {studentSubTab === 'pos' && (
              <button
                type="button"
                onClick={() => setPayModalOpen(true)}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-2xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Catat Pembayaran Loket</span>
              </button>
            )}
          </div>

          {/* Sub-tab 1.1: Bukti Transfer */}
          {studentSubTab === 'proofs' && (
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div>
                  <h2 className="text-sm font-bold text-slate-800">Antrean Verifikasi Bukti Bayar Transfer</h2>
                  <p className="text-xs text-slate-400">Verifikasi setoran bank orang tua, alokasikan pos tagihan, & terbitkan kwitansi resmi</p>
                </div>
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-medium">
                  {['all', 'pending', 'verified', 'rejected'].map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setProofFilter(st)}
                      className={`px-3 py-1 rounded-lg capitalize transition-colors ${
                        proofFilter === st ? 'bg-white font-bold text-slate-800 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      {st === 'all' ? 'Semua' : st === 'pending' ? 'Menunggu' : st === 'verified' ? 'Terverifikasi' : 'Ditolak'}
                    </button>
                  ))}
                </div>
              </div>

              {loading ? (
                <div className="py-12 text-center text-slate-400 text-xs">Memuat antrean transfer...</div>
              ) : proofs.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs italic">Tidak ada bukti transfer dalam status ini.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-3">Tgl Upload</th>
                        <th className="px-4 py-3">Nama Siswa</th>
                        <th className="px-4 py-3">Bank Pengirim</th>
                        <th className="px-4 py-3 text-right">Nominal Transfer</th>
                        <th className="px-4 py-3 text-center">Status</th>
                        <th className="px-4 py-3 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {proofs
                        .filter((p) => proofFilter === 'all' || p.status === proofFilter)
                        .map((p) => (
                          <tr key={p.id} className="hover:bg-slate-50/80">
                            <td className="px-4 py-3 font-mono text-slate-600">{p.uploaded_at ? String(p.uploaded_at).slice(0, 10) : '-'}</td>
                            <td className="px-4 py-3 font-bold text-slate-800">{p.student_name || `Siswa ID ${p.student_id}`}</td>
                            <td className="px-4 py-3 text-slate-600">{p.source_bank || '-'} a.n. {p.account_holder_name || '-'}</td>
                            <td className="px-4 py-3 text-right font-bold text-slate-900 font-mono">{formatCurrency(p.total_transfer_amount || p.amount)}</td>
                            <td className="px-4 py-3 text-center">
                              {p.status === 'pending' ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200/60 rounded-md font-semibold text-[11px]">
                                  <Clock className="w-3 h-3" /> Menunggu
                                </span>
                              ) : p.status === 'verified' ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200/60 rounded-md font-semibold text-[11px]">
                                  <CheckCircle2 className="w-3 h-3" /> Terverifikasi
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-rose-50 text-rose-700 border border-rose-200/60 rounded-md font-semibold text-[11px]">
                                  <XCircle className="w-3 h-3" /> Ditolak
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => setPreviewProof(p)}
                                  className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg"
                                  title="Lihat Bukti Transfer"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </button>
                                {p.status === 'pending' && (
                                  <button
                                    type="button"
                                    onClick={() => handleOpenVerifyModal(p)}
                                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1 shadow-2xs"
                                  >
                                    <Check className="w-3 h-3" />
                                    <span>Verifikasi</span>
                                  </button>
                                )}
                                {p.status === 'verified' && p.bill_payment_id && (
                                  <button
                                    type="button"
                                    onClick={() => handleViewReceipt(p.bill_payment_id)}
                                    className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1"
                                  >
                                    <Receipt className="w-3 h-3" />
                                    <span>Kwitansi</span>
                                  </button>
                                )}
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

          {/* Sub-tab 1.2: Kasir Langsung / POS */}
          {studentSubTab === 'pos' && (
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h2 className="text-sm font-bold text-slate-800">Tagihan Siap Bayar di Kasir (Unpaid)</h2>
                  <p className="text-xs text-slate-400">Pilih tagihan siswa aktif untuk langsung mencatat kasir tunai / transfer loket</p>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 bg-amber-50 text-amber-700 rounded-lg">
                  {unpaidBills.length} Tagihan Belum Lunas
                </span>
              </div>

              {unpaidBills.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs italic">Semua tagihan siswa aktif telah lunas.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-3">No. Tagihan</th>
                        <th className="px-4 py-3">Nama Siswa</th>
                        <th className="px-4 py-3">Jenis Biaya</th>
                        <th className="px-4 py-3">Periode</th>
                        <th className="px-4 py-3 text-right">Nominal</th>
                        <th className="px-4 py-3 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {unpaidBills.map((b) => (
                        <tr key={b.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3 font-mono font-bold text-slate-600">#{b.id}</td>
                          <td className="px-4 py-3 font-bold text-slate-800">{b.student_name || `Siswa ID ${b.student_id}`}</td>
                          <td className="px-4 py-3 text-slate-700">{b.fee_type_name}</td>
                          <td className="px-4 py-3 text-slate-500">{b.period_month ? `${b.period_month}/${b.period_year}` : b.period_year}</td>
                          <td className="px-4 py-3 text-right font-bold font-mono text-slate-900">{formatCurrency(b.amount)}</td>
                          <td className="px-4 py-3 text-right">
                            <button
                              type="button"
                              onClick={() => {
                                handleSelectBill(b.id);
                                setPayModalOpen(true);
                              }}
                              className="px-3 py-1 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white rounded-lg font-semibold transition-colors"
                            >
                              Bayar
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 2: PENERIMAAN PPDB (CALON MURID)                           */}
      {/* ============================================================== */}
      {mainTab === 'ppdb' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-sm font-bold text-slate-800">Kasir Penerimaan PPDB (Calon Murid)</h2>
                <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded text-[11px] font-bold">
                  Siklus PPDB Terpadu
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Konteks Tahun Ajaran: <b>Tahun Ajaran Masuk Target ({academicYears.find(y => String(y.id) === String(ppdbAcademicYearId))?.name || 'T.A. Depan'})</b>
              </p>
            </div>

            {/* Explicit PPDB Target Academic Year Selector */}
            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-slate-600 whitespace-nowrap">
                T.A. Calon Murid Masuk:
              </label>
              <select
                value={ppdbAcademicYearId}
                onChange={(e) => setPpdbAcademicYearId(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-indigo-900 focus:ring-2 focus:ring-indigo-500/20"
              >
                {academicYears.map((ay) => (
                  <option key={ay.id} value={ay.id}>
                    {ay.name} {ay.is_active ? '(Berjalan)' : '(PPDB/Masa Depan)'}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Quick Search */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari nama calon murid atau nomor registrasi PPDB..."
              value={ppdbSearch}
              onChange={(e) => setPpdbSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchPpdbData()}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          {loadingPpdb ? (
            <div className="py-12 text-center text-slate-400 text-xs">Memuat tagihan PPDB siap bayar...</div>
          ) : ppdbBills.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs italic">
              Tidak ada tagihan calon murid yang berstatus belum lunas untuk Tahun Ajaran PPDB ini.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3">No. Tagihan</th>
                    <th className="px-4 py-3">Calon Murid</th>
                    <th className="px-4 py-3">Fase Biaya</th>
                    <th className="px-4 py-3 text-right">Total Tagihan</th>
                    <th className="px-4 py-3 text-right">Sudah Dibayar</th>
                    <th className="px-4 py-3 text-right">Sisa Piutang</th>
                    <th className="px-4 py-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {ppdbBills.map((pb) => {
                    const remaining = Math.max(0, parseFloat(pb.amount || 0) - parseFloat(pb.paid_amount || 0));
                    return (
                      <tr key={pb.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-mono font-bold text-slate-600">#{pb.id}</td>
                        <td className="px-4 py-3">
                          <p className="font-bold text-slate-800">{pb.registrant_name_snapshot || 'Calon Murid'}</p>
                          <p className="text-[11px] text-slate-400 font-mono">Reg: {pb.registration_number_snapshot || '-'}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded font-semibold text-[10px]">
                            {pb.billing_phase === 'enrollment_fee' ? 'Uang Pangkal' : 'Biaya Pendaftaran'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-slate-800">{formatCurrency(pb.amount)}</td>
                        <td className="px-4 py-3 text-right font-mono text-emerald-700">{formatCurrency(pb.paid_amount || 0)}</td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-rose-700">{formatCurrency(remaining)}</td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleOpenPpdbPay(pb)}
                            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs"
                          >
                            Catat Bayar
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 3: PENERIMAAN SUMBER LAIN (RAPBS)                         */}
      {/* ============================================================== */}
      {mainTab === 'other_income' && (
        <div className="space-y-4">
          {/* Card Informasi Serapan RAPBS */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                  Penerimaan Sumber Lain Berbasis Mata Anggaran RAPBS
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Pencatatan kas masuk non-SPP wajib memilih pos dari rencana pendapatan RAPBS (Subsidi Yayasan, BOS, Hibah, dsb.)
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOtherIncomeModalOpen(true)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm shadow-emerald-600/20"
              >
                <Plus className="w-4 h-4" />
                Catat Kas Masuk RAPBS
              </button>
            </div>

            {/* Pagu Rencana vs Realisasi Table */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                Daftar Mata Anggaran Pendapatan RAPBS & Progres Realisasi
              </h3>
              {rapbsSources.length === 0 ? (
                <div className="p-4 bg-slate-50 rounded-xl text-center text-xs text-slate-400">
                  Belum ada pos pendapatan RAPBS yang terdaftar pada tahun ajaran ini.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {rapbsSources.map((src) => (
                    <div key={src.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800 text-xs">{src.name}</span>
                        <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                          {src.realization_percentage}%
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-emerald-600 h-full rounded-full"
                          style={{ width: `${Math.min(100, src.realization_percentage || 0)}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-500">
                        <span>Pagu: {formatCurrency(src.planned_amount)}</span>
                        <span className="font-bold text-slate-700">Masuk: {formatCurrency(src.total_realized)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Riwayat Penerimaan Lain */}
            <div className="pt-4 border-t border-slate-100">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                Riwayat Kas Masuk Sumber Lain
              </h3>
              {otherIncomesList.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs italic">
                  Belum ada transaksi penerimaan sumber lain yang dicatat.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-3">Tanggal</th>
                        <th className="px-4 py-3">Pos Pendapatan RAPBS</th>
                        <th className="px-4 py-3">Rekening Kas Masuk</th>
                        <th className="px-4 py-3">Keterangan / Penyetor</th>
                        <th className="px-4 py-3 text-right">Nominal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {otherIncomesList.map((inc) => (
                        <tr key={inc.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3 font-mono text-slate-600">{inc.received_at}</td>
                          <td className="px-4 py-3 font-bold text-slate-800">
                            {inc.budget_income_name || inc.category_name || 'Pendapatan Lain'}
                          </td>
                          <td className="px-4 py-3 text-slate-600">{inc.cash_account_name || 'Kasir'}</td>
                          <td className="px-4 py-3 text-slate-600">{inc.notes || '-'}</td>
                          <td className="px-4 py-3 text-right font-bold font-mono text-emerald-700">
                            {formatCurrency(inc.amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 4: REKAPITULASI KAS MASUK GABUNGAN                         */}
      {/* ============================================================== */}
      {mainTab === 'daily_inflows' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-sm font-bold text-slate-800">Buku Kas & Rekapitulasi Penerimaan Gabungan</h2>
            <p className="text-xs text-slate-400">Timeline arus kas masuk terpadu dari seluruh kanal penerimaan sekolah</p>
          </div>

          {/* Macro KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80">
              <span className="text-[11px] text-slate-500 font-bold uppercase">Total Kas Masuk</span>
              <p className="text-lg font-bold text-slate-900 mt-1">
                {formatCurrency(inflowsData.summary?.total_amount)}
              </p>
              <p className="text-[10px] text-slate-400">{inflowsData.summary?.total_records || 0} transaksi penerimaan</p>
            </div>
            <div className="p-4 bg-blue-50/60 rounded-xl border border-blue-200/60">
              <span className="text-[11px] text-blue-700 font-bold uppercase">Penerimaan Siswa</span>
              <p className="text-lg font-bold text-blue-800 mt-1">
                {formatCurrency(inflowsData.summary?.student_amount)}
              </p>
              <p className="text-[10px] text-blue-500">SPP & Biaya Pendidikan</p>
            </div>
            <div className="p-4 bg-indigo-50/60 rounded-xl border border-indigo-200/60">
              <span className="text-[11px] text-indigo-700 font-bold uppercase">Penerimaan PPDB</span>
              <p className="text-lg font-bold text-indigo-800 mt-1">
                {formatCurrency(inflowsData.summary?.ppdb_amount)}
              </p>
              <p className="text-[10px] text-indigo-500">Calon Murid Baru</p>
            </div>
            <div className="p-4 bg-emerald-50/60 rounded-xl border border-emerald-200/60">
              <span className="text-[11px] text-emerald-700 font-bold uppercase">Sumber Lain (RAPBS)</span>
              <p className="text-lg font-bold text-emerald-800 mt-1">
                {formatCurrency(inflowsData.summary?.other_amount)}
              </p>
              <p className="text-[10px] text-emerald-500">Subsidi, BOS & Non-SPP</p>
            </div>
          </div>

          {/* Filter Timeline Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-xl">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Tanggal Mulai</label>
              <input
                type="date"
                value={inflowStartDate}
                onChange={(e) => setInflowStartDate(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Tanggal Selesai</label>
              <input
                type="date"
                value={inflowEndDate}
                onChange={(e) => setInflowEndDate(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Kategori Kanal</label>
              <select
                value={inflowCategoryFilter}
                onChange={(e) => setInflowCategoryFilter(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium"
              >
                <option value="all">Semua Penerimaan</option>
                <option value="student">Siswa Aktif</option>
                <option value="ppdb">Calon Murid PPDB</option>
                <option value="other">Sumber Lain (RAPBS)</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Pencarian</label>
              <input
                type="text"
                placeholder="Cari kwitansi / penyetor..."
                value={inflowSearch}
                onChange={(e) => setInflowSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchAllInflowsData()}
                className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
              />
            </div>
          </div>

          {/* Timeline Table */}
          {loadingInflows ? (
            <div className="py-12 text-center text-slate-400 text-xs">Memuat rekapitulasi kas masuk...</div>
          ) : (inflowsData.inflows || []).length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs italic">Tidak ada transaksi penerimaan pada rentang tanggal ini.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3">Tanggal</th>
                    <th className="px-4 py-3">No. Kwitansi</th>
                    <th className="px-4 py-3">Kanal Penerimaan</th>
                    <th className="px-4 py-3">Penyetor / Siswa</th>
                    <th className="px-4 py-3">Keterangan</th>
                    <th className="px-4 py-3">Akun Kas Masuk</th>
                    <th className="px-4 py-3 text-right">Nominal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {inflowsData.inflows.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-mono text-slate-600">{row.transaction_date}</td>
                      <td className="px-4 py-3 font-mono font-bold text-slate-700">{row.receipt_number || '-'}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          row.source_type === 'student_bill_payment'
                            ? 'bg-blue-100 text-blue-800'
                            : row.source_type === 'ppdb_registration_payment'
                            ? 'bg-indigo-100 text-indigo-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {row.category_label}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-bold text-slate-800">{row.payer_info}</td>
                      <td className="px-4 py-3 text-slate-600 max-w-xs truncate">{row.description}</td>
                      <td className="px-4 py-3 text-slate-600">{row.cash_account_name}</td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-slate-900">
                        {formatCurrency(row.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* MODALS SECTION                                                */}
      {/* ============================================================== */}

      {/* Modal 1: Catat Pembayaran Siswa Aktif */}
      {payModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-800 text-sm">Penerimaan Pembayaran Siswa Aktif</h3>
              <button onClick={() => setPayModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleRecordPayment} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Pilih Tagihan Siswa *</label>
                <select
                  value={formData.student_bill_id}
                  onChange={(e) => handleSelectBill(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                >
                  <option value="">-- Pilih Tagihan Belum Lunas --</option>
                  {unpaidBills.map((b) => (
                    <option key={b.id} value={b.id}>
                      #{b.id} - {b.student_name || `Siswa #${b.student_id}`} ({b.fee_type_name} - {formatCurrency(b.amount)})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">Rekening Kas Masuk *</label>
                <select
                  value={formData.cash_account_id}
                  onChange={(e) => setFormData(p => ({ ...p, cash_account_id: e.target.value }))}
                  required
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                >
                  {cashAccounts.map((a) => (
                    <option key={a.id} value={a.id}>{a.name} ({a.account_kind})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">Nominal Bayar (Rp) *</label>
                <input
                  type="number"
                  value={formData.amount}
                  onChange={(e) => setFormData(p => ({ ...p, amount: e.target.value }))}
                  required
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">Keterangan</label>
                <input
                  type="text"
                  placeholder="Catatan kasir loket..."
                  value={formData.notes}
                  onChange={(e) => setFormData(p => ({ ...p, notes: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              {/* Aturan Transaksi & Jurnal Otomatis */}
              <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-1.5 text-[11px]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-bold text-emerald-900">
                    <BookOpen className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Aturan Transaksi &amp; Jurnal</span>
                  </div>
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                    <ArrowDownLeft className="w-3 h-3 text-emerald-600" /> Penambahan Kas
                  </span>
                </div>
                <div className="bg-white p-2 rounded-lg border border-emerald-100 space-y-1 text-slate-700">
                  <div className="flex justify-between">
                    <span>Aturan Pembukuan:</span>
                    <span className="font-bold text-slate-800">Pembayaran Tagihan Siswa (student_bill_payment)</span>
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-500 pt-0.5 border-t border-slate-100">
                    <span>Posisi Debit (Kas Masuk):</span>
                    <span className="font-semibold text-emerald-700">
                      {cashAccounts.find(a => String(a.id) === String(formData.cash_account_id))?.name || 'Kas Loket'}
                    </span>
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-500">
                    <span>Posisi Kredit (Pengurang Piutang):</span>
                    <span className="font-semibold text-slate-700">Piutang Siswa [104]</span>
                  </div>
                </div>
              </div>
              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setPayModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-blue-600 text-white rounded-xl font-semibold shadow-2xs"
                >
                  {submitting ? 'Memproses...' : 'Simpan Pembayaran'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Catat Pembayaran PPDB */}
      {ppdbPayModalOpen && selectedPpdbBill && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-slate-800 text-sm">Penerimaan Pembayaran PPDB</h3>
                <p className="text-[11px] text-indigo-700 font-semibold mt-0.5">
                  Calon Murid: {selectedPpdbBill.registrant_name_snapshot}
                </p>
              </div>
              <button onClick={() => setPpdbPayModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleRecordPpdbPayment} className="space-y-3 text-xs">
              <div className="p-3 bg-indigo-50/60 rounded-xl text-indigo-950 space-y-1">
                <div className="flex justify-between">
                  <span>Tagihan PPDB:</span>
                  <span className="font-bold">#{selectedPpdbBill.id} ({selectedPpdbBill.billing_phase === 'enrollment_fee' ? 'Uang Pangkal' : 'Pendaftaran'})</span>
                </div>
                <div className="flex justify-between">
                  <span>Total Tagihan:</span>
                  <span className="font-bold">{formatCurrency(selectedPpdbBill.amount)}</span>
                </div>
                <div className="flex justify-between text-rose-700">
                  <span>Sisa Piutang:</span>
                  <span className="font-bold">{formatCurrency(parseFloat(selectedPpdbBill.amount || 0) - parseFloat(selectedPpdbBill.paid_amount || 0))}</span>
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Rekening Kas/Bank Masuk *</label>
                <select
                  value={ppdbPayForm.cash_account_id}
                  onChange={(e) => setPpdbPayForm(p => ({ ...p, cash_account_id: e.target.value }))}
                  required
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                >
                  {cashAccounts.map((a) => (
                    <option key={a.id} value={a.id}>{a.name} ({a.bank_name || a.account_kind})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Tgl Bayar *</label>
                  <input
                    type="date"
                    value={ppdbPayForm.payment_date}
                    onChange={(e) => setPpdbPayForm(p => ({ ...p, payment_date: e.target.value }))}
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Metode *</label>
                  <select
                    value={ppdbPayForm.payment_method}
                    onChange={(e) => setPpdbPayForm(p => ({ ...p, payment_method: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                  >
                    <option value="cash">Tunai / Loket</option>
                    <option value="bank_transfer">Transfer Bank</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Nominal Bayar (Rp) *</label>
                <input
                  type="number"
                  value={ppdbPayForm.amount_paid}
                  onChange={(e) => setPpdbPayForm(p => ({ ...p, amount_paid: e.target.value }))}
                  required
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setPpdbPayModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={savingPpdbPayment}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-semibold shadow-2xs"
                >
                  {savingPpdbPayment ? 'Memproses...' : 'Catat Kasir PPDB'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 3: Catat Penerimaan Sumber Lain (RAPBS) */}
      {otherIncomeModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-800 text-sm">Penerimaan Kas Sumber Lain (RAPBS)</h3>
              <button onClick={() => setOtherIncomeModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateOtherIncome} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Nama Sumber Pendapatan (Mata Anggaran RAPBS) *
                </label>
                <select
                  value={otherIncomeForm.budget_plan_income_item_id}
                  onChange={(e) => setOtherIncomeForm(p => ({ ...p, budget_plan_income_item_id: e.target.value }))}
                  required
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800"
                >
                  <option value="">-- Pilih Mata Anggaran RAPBS --</option>
                  {rapbsSources.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} (Pagu: {formatCurrency(s.planned_amount)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Rekening Kas/Bank Tujuan *</label>
                <select
                  value={otherIncomeForm.cash_account_id}
                  onChange={(e) => setOtherIncomeForm(p => ({ ...p, cash_account_id: e.target.value }))}
                  required
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                >
                  {cashAccounts.map((a) => (
                    <option key={a.id} value={a.id}>{a.name} ({a.account_kind})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Tanggal Diterima *</label>
                  <input
                    type="date"
                    value={otherIncomeForm.received_at}
                    onChange={(e) => setOtherIncomeForm(p => ({ ...p, received_at: e.target.value }))}
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Nominal (Rp) *</label>
                  <input
                    type="number"
                    value={otherIncomeForm.amount}
                    onChange={(e) => setOtherIncomeForm(p => ({ ...p, amount: e.target.value }))}
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-emerald-800"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Catatan / Penyetor</label>
                <input
                  type="text"
                  placeholder="Contoh: Bantuan Yayasan Tahap 1"
                  value={otherIncomeForm.notes}
                  onChange={(e) => setOtherIncomeForm(p => ({ ...p, notes: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setOtherIncomeModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={savingOtherIncome}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-xl font-semibold shadow-2xs"
                >
                  {savingOtherIncome ? 'Memproses...' : 'Simpan Penerimaan RAPBS'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Kwitansi Resmi Siswa Aktif */}
      {receiptModalOpen && receiptData && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <Receipt className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-slate-800 text-sm">Kwitansi Pembayaran Resmi</h3>
              </div>
              <button onClick={() => setReceiptModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 bg-slate-50 rounded-xl border border-dashed border-slate-200 font-mono text-xs space-y-2">
              <div className="flex justify-between font-bold text-slate-800">
                <span>No. Kwitansi:</span>
                <span>{receiptData.receipt_number}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Tanggal:</span>
                <span>{receiptData.paid_at}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Nama Siswa:</span>
                <span className="font-bold text-slate-800">{receiptData.student_name}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Jenis Biaya:</span>
                <span>{receiptData.fee_type_name}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Akun Kas:</span>
                <span>{receiptData.cash_account_name}</span>
              </div>
              <div className="border-t border-slate-200 pt-2 flex justify-between font-bold text-slate-900 text-sm">
                <span>Nominal Bayar:</span>
                <span className="text-emerald-700">{formatCurrency(receiptData.amount)}</span>
              </div>
            </div>
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-slate-800 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" /> Cetak Kwitansi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Kwitansi PPDB */}
      {ppdbReceiptModalOpen && ppdbReceiptData && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <Receipt className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-slate-800 text-sm">Kwitansi Penerimaan PPDB</h3>
              </div>
              <button onClick={() => setPpdbReceiptModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 bg-indigo-50/50 rounded-xl border border-dashed border-indigo-200 font-mono text-xs space-y-2">
              <div className="flex justify-between font-bold text-indigo-950">
                <span>No. Kwitansi:</span>
                <span>{ppdbReceiptData.receipt_number}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Calon Murid:</span>
                <span className="font-bold text-slate-900">{ppdbReceiptData.registrant_name}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Fase Biaya:</span>
                <span>{ppdbReceiptData.fee_phase}</span>
              </div>
              <div className="border-t border-indigo-200 pt-2 flex justify-between font-bold text-sm text-indigo-950">
                <span>Nominal Dibayar:</span>
                <span className="text-indigo-700">{formatCurrency(ppdbReceiptData.amount_paid)}</span>
              </div>
            </div>
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" /> Cetak Kwitansi PPDB
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Preview Gambar Bukti Transfer */}
      {previewProof && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-800 text-sm">Gambar Bukti Transfer Bank</h3>
              <button onClick={() => setPreviewProof(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="w-full h-80 bg-slate-100 rounded-xl overflow-hidden flex items-center justify-center border border-slate-200">
              {previewProof.file_url ? (
                <img src={previewProof.file_url} alt="Bukti Transfer" className="object-contain w-full h-full" />
              ) : (
                <span className="text-xs text-slate-400 italic">File gambar tidak tersedia</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Multi-Alokasi Verifikasi Bukti Transfer */}
      {verifyModalProof && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-xl border border-slate-100 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-800 text-sm">Verifikasi & Alokasi Tagihan Bukti Transfer</h3>
              <button onClick={() => setVerifyModalProof(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleVerifyProofSubmit} className="space-y-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <div className="flex justify-between">
                  <span>Nama Siswa:</span>
                  <span className="font-bold text-slate-800">{verifyModalProof.student_name}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total Transfer:</span>
                  <span className="font-bold text-emerald-700 font-mono text-sm">
                    {formatCurrency(verifyModalProof.total_transfer_amount || verifyModalProof.amount)}
                  </span>
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Rekening Kas/Bank Penampung *</label>
                <select
                  value={verifyCashAccountId}
                  onChange={(e) => setVerifyCashAccountId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                >
                  {cashAccounts.map((a) => (
                    <option key={a.id} value={a.id}>{a.name} ({a.bank_name || a.account_kind})</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="block font-medium text-slate-700">Pos Alokasi Tagihan</label>
                {verifyAllocations.map((alloc, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <select
                      value={alloc.student_bill_id}
                      onChange={(e) => {
                        const updated = [...verifyAllocations];
                        updated[idx].student_bill_id = e.target.value;
                        setVerifyAllocations(updated);
                      }}
                      className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                    >
                      <option value="">Pilih Tagihan...</option>
                      {studentUnpaidBills.map((b) => (
                        <option key={b.id} value={b.id}>
                          #{b.id} - {b.fee_type_name} ({formatCurrency(b.amount)})
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      value={alloc.allocated_amount}
                      onChange={(e) => {
                        const updated = [...verifyAllocations];
                        updated[idx].allocated_amount = parseFloat(e.target.value) || 0;
                        setVerifyAllocations(updated);
                      }}
                      className="w-32 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-right"
                    />
                  </div>
                ))}
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setVerifyModalProof(null)}
                  className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-xl font-semibold shadow-2xs"
                >
                  {submitting ? 'Memproses...' : 'Sahkan & Terbitkan Kwitansi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
