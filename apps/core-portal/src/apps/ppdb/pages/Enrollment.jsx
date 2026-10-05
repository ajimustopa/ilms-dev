import React, { useState, useEffect } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import api from '../../../shared/services/api';
import { useAuth } from '../../../shared/store/AuthContext';
import DataTable from '../../../shared/components/DataTable';
import FilterBar from '../../../shared/components/FilterBar';
import Modal from '../../../shared/components/Modal';
import StatusPill from '../../../shared/components/StatusPill';
import LoadingSkeleton from '../../../shared/components/LoadingSkeleton';
import EmptyState from '../../../shared/components/EmptyState';
import {
  Wallet,
  Building2,
  Users,
  CheckCircle2,
  AlertCircle,
  Receipt,
  Printer,
  Search,
  ArrowRight,
  ShieldCheck,
  CreditCard,
  Plus,
  UserCheck,
  Layers,
  GraduationCap,
  CalendarDays,
  ExternalLink,
  FileText,
  BadgeCheck,
  Clock,
  Sparkles
} from 'lucide-react';
import AcademicYearSelector from '../components/AcademicYearSelector';

export default function Enrollment() {
  const { activeSchoolUnit } = useAuth();
  const outletContext = useOutletContext() || {};
  const selectedAcademicYear = outletContext.selectedAcademicYear || localStorage.getItem('aldepos_ppdb_selected_academic_year') || '2026/2027';
  const setSelectedAcademicYear = outletContext.setSelectedAcademicYear;
  const contextAcademicYears = outletContext.academicYears || [];

  const [activeTab, setActiveTab] = useState('bills'); // 'bills' | 'placement'
  const [loading, setLoading] = useState(true);

  // Common Lookups
  const [programs, setPrograms] = useState([]);
  const [selectedProgramId, setSelectedProgramId] = useState('');
  const [feeSchemes, setFeeSchemes] = useState([]);
  const [cashAccounts, setCashAccounts] = useState([]);
  const [classGroups, setClassGroups] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);

  const navigate = useNavigate();

  // Tab 1: Monitoring Tagihan & Pembayaran Uang Pangkal
  const [passedRegistrants, setPassedRegistrants] = useState([]);
  const [searchBill, setSearchBill] = useState('');
  const [financialFilter, setFinancialFilter] = useState('all'); // 'all' | 'lunas' | 'partial' | 'unpaid' | 'unassigned'

  // Modals for Tab 1 (Detail Tagihan & Kwitansi Resmi Keuangan)
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedRegistrant, setSelectedRegistrant] = useState(null);
  const [detailBillData, setDetailBillData] = useState(null);
  const [detailBillLoading, setDetailBillLoading] = useState(false);

  // Tab 2: Penempatan Rombel Siswa
  const [classQuotas, setClassQuotas] = useState([]);
  const [placementModalOpen, setPlacementModalOpen] = useState(false);
  const [placementForm, setPlacementForm] = useState({
    class_group_id: '',
    academic_year_id: ''
  });
  const [placementLogs, setPlacementLogs] = useState([]);

  useEffect(() => {
    fetchInitialData();
  }, [activeSchoolUnit]);

  useEffect(() => {
    if (selectedProgramId) {
      loadTabData();
    }
  }, [activeTab, selectedProgramId]);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [resProg, resSchemes, resAccounts, resClasses, resYears] = await Promise.all([
        api.get('/api/v1/psb/programs'),
        api.get('/api/v1/psb/lookups/fee-schemes'),
        api.get('/api/v1/psb/lookups/cash-accounts'),
        api.get('/api/v1/psb/lookups/class-groups'),
        api.get('/api/v1/psb/lookups/academic-years')
      ]);

      const progs = resProg.data?.data || [];
      setPrograms(progs);
      if (progs.length > 0 && !selectedProgramId) {
        setSelectedProgramId(progs[0].id);
      }
      setFeeSchemes(resSchemes.data?.data || []);
      setCashAccounts(resAccounts.data?.data || []);
      setClassGroups(resClasses.data?.data || []);
      setAcademicYears(resYears.data?.data || []);
    } catch (err) {
      console.error('Error fetching initial lookups:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadTabData = async () => {
    try {
      setLoading(true);
      if (activeTab === 'bills') {
        const res = await api.get('/api/v1/psb/registrants', {
          params: { psb_program_id: selectedProgramId, limit: 200 }
        });
        const all = res.data?.data?.items || (Array.isArray(res.data?.data) ? res.data.data : []);
        // Calon santri yang lulus seleksi, diterima, enrolled, placed, atau memiliki tagihan
        const passed = all.filter((r) =>
          r.status === 'accepted' ||
          r.status === 'enrolled' ||
          r.status === 'placed' ||
          r.final_decision === 'lulus' ||
          r.status === 'lulus' ||
          r.status === 'diterima' ||
          Boolean(r.enrollment_fee_bill)
        );
        setPassedRegistrants(passed);
      } else if (activeTab === 'placement') {
        // Fetch class quotas & placement history
        const [resPlacements, resClasses] = await Promise.all([
          api.get('/api/v1/psb/placements', { params: { psb_program_id: selectedProgramId } }),
          api.get('/api/v1/psb/lookups/class-groups')
        ]);
        setPlacementLogs(resPlacements.data?.data || []);

        // Fetch detailed quota for each class group
        const classes = resClasses.data?.data || [];
        const quotaPromises = classes.map(async (cls) => {
          try {
            const qRes = await api.get(`/api/v1/psb/class-groups/${cls.id}/quota`);
            return { ...cls, ...qRes.data?.data };
          } catch {
            return { ...cls, capacity: 30, filled: 0, quota_male: 15, filled_male: 0, quota_female: 15, filled_female: 0 };
          }
        });
        const quotas = await Promise.all(quotaPromises);
        setClassQuotas(quotas);
      }
    } catch (err) {
      console.error('Error loading tab data:', err);
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // HANDLERS: Tab 1 Integrasi Finansial Keuangan
  // ==========================================
  const handleOpenFinanceModule = (reg = null) => {
    const term = reg?.registration_number || reg?.full_name || '';
    if (term) {
      navigate(`/keuangan/ppdb-billing?search=${encodeURIComponent(term)}`);
    } else {
      navigate('/keuangan/ppdb-billing');
    }
  };

  const handleOpenBillDetail = async (reg) => {
    setSelectedRegistrant(reg);
    setDetailModalOpen(true);
    setDetailBillLoading(true);
    try {
      const res = await api.get(`/api/v1/psb/registrants/${reg.id}/enrollment-bill`);
      setDetailBillData(res.data?.data);
    } catch (err) {
      setDetailBillData(reg.enrollment_fee_bill || null);
    } finally {
      setDetailBillLoading(false);
    }
  };

  const handleProceedToPlacement = (reg) => {
    setActiveTab('placement');
    handleOpenPlacementModal(reg);
  };

  // ==========================================
  // HANDLERS: Tab 2 Penempatan Rombel Siswa
  // ==========================================
  const handleOpenPlacementModal = (reg) => {
    setSelectedRegistrant(reg);
    setPlacementForm({
      class_group_id: classGroups[0]?.id || '',
      academic_year_id: academicYears[0]?.id || ''
    });
    setPlacementModalOpen(true);
  };

  const handlePlaceStudent = async (e) => {
    e.preventDefault();
    if (!placementForm.class_group_id) {
      alert('Pilih rombel kelas tujuan');
      return;
    }
    try {
      await api.post(`/api/v1/psb/registrants/${selectedRegistrant.id}/place-class`, placementForm);
      setPlacementModalOpen(false);
      alert(`Santri/Murid berhasil ditempatkan ke kelas tujuan & didaftarkan ke Akademik!`);
      loadTabData();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menempatkan siswa ke rombel');
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
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-teal-800 via-emerald-800 to-teal-900 rounded-2xl p-6 text-white shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 text-teal-200 text-xs font-semibold tracking-wider uppercase mb-1">
            <Building2 className="w-4 h-4" />
            <span>Tahap 5 & 6 Penerimaan Siswa Baru</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            Daftar Ulang, Uang Pangkal & Penempatan Rombel
          </h1>
          <p className="text-teal-100 text-xs mt-1 max-w-2xl">
            Penerbitan tagihan uang pangkal mengacu skema biaya Keuangan, kasir cicilan/pelunasan, cetak kuitansi resmi, serta penempatan definitif siswa ke rombel kelas Akademik sesuai kuota L/P.
          </p>
        </div>

        {/* Selectors (Tahun Ajaran & Program) */}
        <div className="bg-white/10 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/20 flex flex-wrap items-center gap-3">
          <AcademicYearSelector
            value={selectedAcademicYear}
            onChange={(ny) => {
              if (setSelectedAcademicYear) setSelectedAcademicYear(ny);
              localStorage.setItem('aldepos_ppdb_selected_academic_year', ny);
              window.dispatchEvent(new CustomEvent('aldepos_ppdb_academic_year_changed', { detail: ny }));
            }}
            years={contextAcademicYears}
            variant="banner"
          />

          <div className="flex items-center gap-1.5 pl-2 border-l border-white/20">
            <div className="text-xs text-teal-100 font-medium hidden sm:inline">Program:</div>
            <select
              value={selectedProgramId}
              onChange={(e) => setSelectedProgramId(e.target.value)}
              className="bg-emerald-950/80 text-white text-xs font-semibold rounded-lg px-3 py-1.5 border border-emerald-500/40 focus:outline-none focus:ring-2 focus:ring-emerald-400 cursor-pointer"
            >
              {programs
                .filter(p => !selectedAcademicYear || p.target_academic_year === selectedAcademicYear || programs.length <= 1)
                .map((p) => (
                  <option key={p.id} value={p.id} className="bg-slate-900 text-white">
                    {p.name}
                  </option>
                ))}
            </select>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 space-x-6 text-sm font-semibold">
        <button
          onClick={() => setActiveTab('bills')}
          className={`pb-3 flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'bills'
              ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Wallet className="w-4 h-4" />
          <span>Tagihan & Kasir Uang Pangkal</span>
          <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs px-2 py-0.5 rounded-full font-medium">
            {passedRegistrants.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('placement')}
          className={`pb-3 flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'placement'
              ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Penempatan Rombel & Kuota Kelas</span>
          <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs px-2 py-0.5 rounded-full font-medium">
            {classQuotas.length} Rombel
          </span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: Monitoring Status Finansial & Uang Pangkal Keuangan */}
      {/* ========================================================================= */}
      {activeTab === 'bills' && (() => {
        // Metrik Finansial
        const totalCandidates = passedRegistrants.length;
        const lunasList = passedRegistrants.filter(
          (r) => r.enrollment_fee_bill?.is_paid || r.status === 'enrolled' || r.status === 'placed'
        );
        const partialList = passedRegistrants.filter(
          (r) => !r.enrollment_fee_bill?.is_paid && Number(r.enrollment_fee_bill?.paid_amount || 0) > 0
        );
        const unpaidList = passedRegistrants.filter(
          (r) => r.enrollment_fee_bill && !r.enrollment_fee_bill?.is_paid && Number(r.enrollment_fee_bill?.paid_amount || 0) === 0
        );
        const unassignedList = passedRegistrants.filter((r) => !r.enrollment_fee_bill);

        const filteredRegistrants = passedRegistrants.filter((r) => {
          // Search filter
          if (searchBill) {
            const q = searchBill.toLowerCase();
            const matchNo = r.registration_number?.toLowerCase().includes(q);
            const matchName = r.full_name?.toLowerCase().includes(q);
            if (!matchNo && !matchName) return false;
          }

          // Category status filter
          if (financialFilter === 'lunas') {
            return r.enrollment_fee_bill?.is_paid || r.status === 'enrolled' || r.status === 'placed';
          }
          if (financialFilter === 'partial') {
            return !r.enrollment_fee_bill?.is_paid && Number(r.enrollment_fee_bill?.paid_amount || 0) > 0;
          }
          if (financialFilter === 'unpaid') {
            return r.enrollment_fee_bill && !r.enrollment_fee_bill?.is_paid && Number(r.enrollment_fee_bill?.paid_amount || 0) === 0;
          }
          if (financialFilter === 'unassigned') {
            return !r.enrollment_fee_bill;
          }
          return true;
        });

        return (
          <div className="space-y-4">
            {/* Banner Integrasi Keuangan */}
            <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 dark:from-emerald-950/40 dark:via-teal-950/30 dark:to-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50 rounded-xl p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="p-2.5 bg-emerald-600 text-white rounded-xl shadow-md">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                    Sentralisasi Transaksi Finansial di Modul Keuangan
                    <span className="text-[10px] bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                      Live Sync
                    </span>
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 leading-relaxed">
                    Penetapan skema biaya, transaksi kasir pembayaran uang pangkal/angsuran, persetujuan diskon/keringanan, dan penerbitan kuitansi resmi dikelola terpusat di Modul Keuangan. Santri yang telah lunas otomatis dapat langsung ditempatkan ke rombel kelas.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleOpenFinanceModule()}
                className="shrink-0 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-semibold rounded-lg shadow-sm inline-flex items-center gap-2 transition"
              >
                <CreditCard className="w-4 h-4" />
                <span>Buka Kasir Keuangan (PPDB Billing)</span>
                <ExternalLink className="w-3.5 h-3.5 opacity-80" />
              </button>
            </div>

            {/* KPI Stat Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              <button
                type="button"
                onClick={() => setFinancialFilter('all')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  financialFilter === 'all'
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-slate-900 dark:border-white shadow-md'
                    : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between text-xs opacity-80 mb-1">
                  <span>Lulus Seleksi</span>
                  <GraduationCap className="w-4 h-4" />
                </div>
                <div className="text-xl font-black">{totalCandidates}</div>
                <div className="text-[10px] opacity-75 mt-0.5">Semua Calon Siswa</div>
              </button>

              <button
                type="button"
                onClick={() => setFinancialFilter('lunas')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  financialFilter === 'lunas'
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-600/20'
                    : 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/40 hover:border-emerald-400'
                }`}
              >
                <div className="flex items-center justify-between text-xs opacity-80 mb-1">
                  <span>Lunas (Siap Rombel)</span>
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div className="text-xl font-black">{lunasList.length}</div>
                <div className="text-[10px] opacity-75 mt-0.5">Berhak Masuk Kelas</div>
              </button>

              <button
                type="button"
                onClick={() => setFinancialFilter('partial')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  financialFilter === 'partial'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-600/20'
                    : 'bg-white dark:bg-slate-900 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-900/40 hover:border-blue-400'
                }`}
              >
                <div className="flex items-center justify-between text-xs opacity-80 mb-1">
                  <span>Cicilan Berjalan</span>
                  <Clock className="w-4 h-4" />
                </div>
                <div className="text-xl font-black">{partialList.length}</div>
                <div className="text-[10px] opacity-75 mt-0.5">Sudah Ada Setoran</div>
              </button>

              <button
                type="button"
                onClick={() => setFinancialFilter('unpaid')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  financialFilter === 'unpaid'
                    ? 'bg-amber-600 text-white border-amber-600 shadow-md shadow-amber-600/20'
                    : 'bg-white dark:bg-slate-900 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-900/40 hover:border-amber-400'
                }`}
              >
                <div className="flex items-center justify-between text-xs opacity-80 mb-1">
                  <span>Menunggu Bayar</span>
                  <Wallet className="w-4 h-4" />
                </div>
                <div className="text-xl font-black">{unpaidList.length}</div>
                <div className="text-[10px] opacity-75 mt-0.5">Tagihan Belum Dibayar</div>
              </button>

              <button
                type="button"
                onClick={() => setFinancialFilter('unassigned')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  financialFilter === 'unassigned'
                    ? 'bg-rose-600 text-white border-rose-600 shadow-md shadow-rose-600/20'
                    : 'bg-white dark:bg-slate-900 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-900/40 hover:border-rose-400'
                }`}
              >
                <div className="flex items-center justify-between text-xs opacity-80 mb-1">
                  <span>Belum Ada Skema</span>
                  <AlertCircle className="w-4 h-4" />
                </div>
                <div className="text-xl font-black">{unassignedList.length}</div>
                <div className="text-[10px] opacity-75 mt-0.5">Perlu Ditetapkan Biaya</div>
              </button>
            </div>

            {/* Filter Search & Action Bar */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pt-2">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                  Daftar Calon Siswa & Status Pembayaran Uang Pangkal
                </h2>
                <span className="text-xs text-slate-500">
                  ({filteredRegistrants.length} siswa)
                </span>
              </div>
              <div className="relative w-full sm:w-72">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={searchBill}
                  onChange={(e) => setSearchBill(e.target.value)}
                  placeholder="Cari No. Reg / Nama Santri..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>

            {loading ? (
              <LoadingSkeleton rows={5} />
            ) : filteredRegistrants.length === 0 ? (
              <EmptyState
                icon={Wallet}
                title="Tidak Ada Data Calon Siswa Sesuai Kriteria"
                description="Ubah filter status finansial atau kata kunci pencarian untuk menemukan calon santri."
              />
            ) : (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-800">
                      <tr>
                        <th className="py-3 px-4">Calon Santri</th>
                        <th className="py-3 px-4">Skema Biaya & Tagihan</th>
                        <th className="py-3 px-4">Realisasi Pembayaran</th>
                        <th className="py-3 px-4 text-center">Status Rombel</th>
                        <th className="py-3 px-4 text-right">Aksi Terintegrasi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {filteredRegistrants.map((r) => {
                        const bill = r.enrollment_fee_bill;
                        const totalAmount = Number(bill?.amount || 0);
                        const paidAmount = Number(bill?.paid_amount || 0);
                        const remaining = Math.max(0, totalAmount - paidAmount);
                        const pct = totalAmount > 0 ? Math.min(100, Math.round((paidAmount / totalAmount) * 100)) : 0;
                        const isPaid = bill?.is_paid || remaining <= 0 || r.status === 'enrolled' || r.status === 'placed';
                        const isPlaced = r.status === 'placed' || Boolean(r.placed_student_id);

                        return (
                          <tr key={r.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                            {/* Calon Santri */}
                            <td className="py-3 px-4">
                              <div className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-[11px]">
                                {r.registration_number}
                              </div>
                              <div className="font-bold text-slate-800 dark:text-slate-100 text-sm mt-0.5">
                                {r.full_name}
                              </div>
                              <div className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                                <span className={`px-1.5 py-0.2 rounded font-semibold ${r.gender === 'L' ? 'bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300' : 'bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300'}`}>
                                  {r.gender === 'L' ? 'Ikhwan (L)' : 'Akhwat (P)'}
                                </span>
                                <span>•</span>
                                <span>{r.previous_school_name || 'Asal Sekolah -'}</span>
                              </div>
                            </td>

                            {/* Skema Biaya & Tagihan */}
                            <td className="py-3 px-4">
                              {bill ? (
                                <div className="space-y-1">
                                  <div className="font-semibold text-slate-700 dark:text-slate-200">
                                    {bill.fee_scheme_name || 'Skema Uang Pangkal Reguler'}
                                  </div>
                                  <div className="font-mono font-bold text-slate-900 dark:text-white text-xs">
                                    {formatCurrency(totalAmount)}
                                  </div>
                                  <div className="text-[10px] text-slate-400 font-mono">
                                    No. Tagihan: {bill.bill_number || `UP-${r.id}`}
                                  </div>
                                </div>
                              ) : (
                                <div className="text-slate-400 italic text-[11px] flex items-center gap-1">
                                  <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                                  <span>Belum ditetapkan skema</span>
                                </div>
                              )}
                            </td>

                            {/* Realisasi Pembayaran & Progress */}
                            <td className="py-3 px-4 min-w-[200px]">
                              {bill ? (
                                <div className="space-y-1.5">
                                  <div className="flex justify-between items-center text-[11px]">
                                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                                      {formatCurrency(paidAmount)}
                                    </span>
                                    <span className="text-slate-400 font-medium">
                                      {pct}%
                                    </span>
                                  </div>

                                  {/* Progress Bar */}
                                  <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden border border-slate-200/60 dark:border-slate-700">
                                    <div
                                      className={`h-full transition-all duration-500 ${
                                        isPaid
                                          ? 'bg-emerald-500'
                                          : paidAmount > 0
                                          ? 'bg-blue-500'
                                          : 'bg-slate-300 dark:bg-slate-700'
                                      }`}
                                      style={{ width: `${pct}%` }}
                                    />
                                  </div>

                                  <div className="flex justify-between items-center text-[10px]">
                                    <span
                                      className={`px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                                        isPaid
                                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                          : paidAmount > 0
                                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                                          : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                      }`}
                                    >
                                      {isPaid
                                        ? 'Lunas'
                                        : paidAmount > 0
                                        ? 'Cicilan Berjalan'
                                        : 'Menunggu Pembayaran'}
                                    </span>
                                    {!isPaid && remaining > 0 && (
                                      <span className="text-rose-500 font-medium">
                                        Sisa: {formatCurrency(remaining)}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                                  Belum Ada Tagihan
                                </span>
                              )}
                            </td>

                            {/* Status Rombel */}
                            <td className="py-3 px-4 text-center">
                              {isPlaced ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300/40">
                                  <CheckCircle2 className="w-3 h-3" />
                                  <span>Masuk Rombel</span>
                                </span>
                              ) : isPaid ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300 border border-teal-300/50 animate-pulse">
                                  <Sparkles className="w-3 h-3" />
                                  <span>Siap Ditempatkan</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800">
                                  <span>Menunggu Pelunasan</span>
                                </span>
                              )}
                            </td>

                            {/* Aksi Terintegrasi */}
                            <td className="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
                              <button
                                type="button"
                                onClick={() => handleOpenBillDetail(r)}
                                className="px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold inline-flex items-center gap-1 transition"
                                title="Lihat rincian tagihan & kwitansi resmi"
                              >
                                <Receipt className="w-3.5 h-3.5" />
                                <span>Rincian</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleOpenFinanceModule(r)}
                                className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-lg text-xs font-semibold shadow-sm inline-flex items-center gap-1 transition"
                                title="Buka transaksi di kasir Keuangan"
                              >
                                <CreditCard className="w-3.5 h-3.5" />
                                <span>Kasir Keuangan</span>
                                <ExternalLink className="w-3 h-3 opacity-70" />
                              </button>

                              {isPaid && !isPlaced && (
                                <button
                                  type="button"
                                  onClick={() => handleProceedToPlacement(r)}
                                  className="px-2.5 py-1.5 bg-teal-600 hover:bg-teal-700 active:scale-95 text-white rounded-lg text-xs font-semibold shadow-sm inline-flex items-center gap-1 transition"
                                  title="Tempatkan santri ke kelas Akademik"
                                >
                                  <Users className="w-3.5 h-3.5" />
                                  <span>Tempatkan Rombel</span>
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* ========================================================================= */}
      {/* TAB 2: Penempatan Rombel & Kuota Kelas */}
      {/* ========================================================================= */}
      {activeTab === 'placement' && (
        <div className="space-y-6">
          {/* Header Kuota Kelas */}
          <div>
            <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">
              Monitoring Kuota Rombel Kelas Akademik (L/P)
            </h2>
            <p className="text-xs text-slate-500">
              Kapasitas kelas terhubung langsung ke modul Akademik dengan batasan kuota gender terpisah.
            </p>
          </div>

          {/* Cards Kuota Rombel */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {classQuotas.map((cls) => {
              const totalCap = cls.capacity || 30;
              const totalFilled = cls.filled || 0;
              const pct = Math.min(100, Math.round((totalFilled / totalCap) * 100));

              return (
                <div
                  key={cls.id}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm hover:shadow-md transition space-y-3"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-teal-600 bg-teal-50 dark:bg-teal-950/60 px-2 py-0.5 rounded">
                        Tingkat {cls.grade_level || '7'}
                      </span>
                      <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm mt-1">
                        {cls.class_name || cls.name}
                      </h3>
                      <div className="text-[11px] text-slate-400">
                        Wali Kelas: {cls.homeroom_teacher_name || '-'}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        {totalFilled} / {totalCap}
                      </div>
                      <span className="text-[10px] text-slate-400">Total Terisi</span>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="space-y-1">
                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all ${
                          pct >= 100 ? 'bg-rose-500' : pct >= 80 ? 'bg-amber-500' : 'bg-emerald-500'
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-400">
                      <span>{pct}% Penuh</span>
                      <span>Sisa: {Math.max(0, totalCap - totalFilled)} Kursi</span>
                    </div>
                  </div>

                  {/* Rincian Gender L / P */}
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                    <div className="bg-sky-50 dark:bg-sky-950/40 p-2 rounded border border-sky-100 dark:border-sky-900/40">
                      <div className="text-[10px] font-bold text-sky-700 dark:text-sky-300">
                        Laki-laki (Ikhwan)
                      </div>
                      <div className="font-extrabold text-slate-800 dark:text-slate-200 mt-0.5">
                        {cls.filled_male || 0} / {cls.quota_male || 15}
                      </div>
                    </div>
                    <div className="bg-pink-50 dark:bg-pink-950/40 p-2 rounded border border-pink-100 dark:border-pink-900/40">
                      <div className="text-[10px] font-bold text-pink-700 dark:text-pink-300">
                        Perempuan (Akhwat)
                      </div>
                      <div className="font-extrabold text-slate-800 dark:text-slate-200 mt-0.5">
                        {cls.filled_female || 0} / {cls.quota_female || 15}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Tabel Riwayat Penempatan Definitif */}
          <div className="space-y-2 pt-4">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
              Riwayat Penempatan Siswa ke Akademik
            </h3>
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-3 px-4">No. Registrasi</th>
                    <th className="py-3 px-4">NIS / NIPD Akademik</th>
                    <th className="py-3 px-4">Nama Siswa</th>
                    <th className="py-3 px-4">Rombel Kelas</th>
                    <th className="py-3 px-4 text-center">Status Akademik</th>
                    <th className="py-3 px-4">Tanggal Penempatan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {placementLogs.length > 0 ? (
                    placementLogs.map((p, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                        <td className="py-3 px-4 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          {p.registration_number || '-'}
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-slate-800 dark:text-slate-100">
                          {p.nipd || p.student_id || '-'}
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-800 dark:text-slate-100">
                          {p.full_name}
                        </td>
                        <td className="py-3 px-4 font-bold text-teal-700 dark:text-teal-400">
                          {p.class_name}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                            AKTIF
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-500">
                          {new Date(p.created_at || Date.now()).toLocaleDateString('id-ID', {
                            dateStyle: 'medium'
                          })}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="6" className="py-6 text-center text-slate-400 italic">
                        Belum ada siswa yang ditempatkan ke kelas akademik.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: Detail Tagihan & Histori Pembayaran Kasir Keuangan */}
      {/* ========================================================================= */}
      <Modal
        isOpen={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        title="Rincian Tagihan & Histori Pembayaran Keuangan"
        size="lg"
      >
        <div className="space-y-4 text-xs">
          {/* Header Calon Santri */}
          <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-xl border border-slate-200/60 dark:border-slate-700/60 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <div>
              <div className="text-[11px] font-mono font-bold text-emerald-600 dark:text-emerald-400">
                {selectedRegistrant?.registration_number}
              </div>
              <div className="text-base font-bold text-slate-800 dark:text-slate-100">
                {selectedRegistrant?.full_name}
              </div>
              <div className="text-slate-500 text-[11px]">
                {selectedRegistrant?.gender === 'L' ? 'Laki-laki (Ikhwan)' : 'Perempuan (Akhwat)'} • {selectedRegistrant?.previous_school_name || 'Asal Sekolah -'}
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-400 block">Status PSB</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                LULUS SELEKSI
              </span>
            </div>
          </div>

          {detailBillLoading ? (
            <LoadingSkeleton rows={4} />
          ) : detailBillData ? (
            <div className="space-y-4">
              {/* Card Ringkasan Finansial */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700">
                  <span className="text-[10px] text-slate-400 block font-semibold">Total Tagihan Uang Pangkal</span>
                  <span className="text-base font-black text-slate-800 dark:text-white mt-1 block">
                    {formatCurrency(detailBillData.amount)}
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono mt-0.5 block truncate">
                    Skema: {detailBillData.fee_scheme_name || 'Skema Keuangan'}
                  </span>
                </div>

                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl border border-emerald-200 dark:border-emerald-800/40">
                  <span className="text-[10px] text-emerald-700 dark:text-emerald-400 block font-semibold">Total Pembayaran Masuk</span>
                  <span className="text-base font-black text-emerald-600 dark:text-emerald-400 mt-1 block">
                    {formatCurrency(detailBillData.paid_amount || 0)}
                  </span>
                  <span className="text-[10px] text-emerald-700/80 dark:text-emerald-300 mt-0.5 block">
                    {detailBillData.is_paid ? 'LUNAS DI KASIR' : 'Cicilan / Bertahap'}
                  </span>
                </div>

                <div className="p-3 bg-rose-50 dark:bg-rose-950/30 rounded-xl border border-rose-200 dark:border-rose-800/40">
                  <span className="text-[10px] text-rose-700 dark:text-rose-400 block font-semibold">Sisa Kewajiban Tagihan</span>
                  <span className="text-base font-black text-rose-600 dark:text-rose-400 mt-1 block">
                    {formatCurrency(detailBillData.remaining_balance || 0)}
                  </span>
                  <span className="text-[10px] text-rose-700/80 dark:text-rose-300 mt-0.5 block">
                    {Number(detailBillData.remaining_balance || 0) <= 0 ? 'Tidak Ada Tunggakan' : 'Perlu Dilunasi'}
                  </span>
                </div>
              </div>

              {/* Rincian Komponen Biaya (jika ada items) */}
              {detailBillData.items && detailBillData.items.length > 0 && (
                <div className="space-y-1.5">
                  <h4 className="text-xs font-bold text-slate-700 dark:text-slate-200">
                    Rincian Komponen Skema Biaya
                  </h4>
                  <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 font-semibold border-b border-slate-200 dark:border-slate-800">
                        <tr>
                          <th className="py-2 px-3">Komponen Biaya</th>
                          <th className="py-2 px-3 text-right">Nominal</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {detailBillData.items.map((item, idx) => (
                          <tr key={idx}>
                            <td className="py-2 px-3">{item.item_name || item.name}</td>
                            <td className="py-2 px-3 text-right font-mono font-bold">
                              {formatCurrency(item.amount)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Histori Pembayaran & Kuitansi Resmi */}
              <div className="space-y-1.5">
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center justify-between">
                  <span>Histori Pembayaran & Kuitansi Resmi Kasir Keuangan</span>
                  <span className="text-[10px] text-slate-400 font-normal">
                    {detailBillData.payments?.length || 0} transaksi tercatat
                  </span>
                </h4>
                {detailBillData.payments && detailBillData.payments.length > 0 ? (
                  <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 font-semibold border-b border-slate-200 dark:border-slate-800">
                        <tr>
                          <th className="py-2 px-3">No. Kwitansi</th>
                          <th className="py-2 px-3">Tanggal</th>
                          <th className="py-2 px-3">Kas / Bank</th>
                          <th className="py-2 px-3">Metode</th>
                          <th className="py-2 px-3 text-right">Nominal Setor</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {detailBillData.payments.map((p) => (
                          <tr key={p.id}>
                            <td className="py-2 px-3 font-mono font-bold text-emerald-600">
                              {p.receipt_number || `KWT-${p.id}`}
                            </td>
                            <td className="py-2 px-3 text-slate-500">
                              {new Date(p.payment_date || p.created_at).toLocaleDateString('id-ID', { dateStyle: 'medium' })}
                            </td>
                            <td className="py-2 px-3">
                              {p.account_name ? `${p.account_name} (${p.bank_name || 'Kas'})` : 'Kasir Keuangan'}
                            </td>
                            <td className="py-2 px-3 uppercase text-[10px] font-bold text-slate-600">
                              {p.payment_method || 'transfer'}
                            </td>
                            <td className="py-2 px-3 text-right font-mono font-bold text-emerald-600">
                              {formatCurrency(p.amount)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/30 rounded-lg border border-slate-200 dark:border-slate-800 text-center text-slate-400 italic">
                    Belum ada catatan setoran pembayaran di kasir Keuangan.
                  </div>
                )}
              </div>

              {/* Info Note Keuangan */}
              <div className="p-3 bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 rounded-lg text-[11px] text-amber-800 dark:text-amber-300 flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
                <span>
                  Seluruh penerimaan uang kasir, rekonsiliasi mutasi rekening bank, dan penyesuaian skema beasiswa/diskon dikelola secara terpusat oleh Kasir Keuangan Sekolah.
                </span>
              </div>
            </div>
          ) : (
            <div className="p-6 text-center space-y-3">
              <AlertCircle className="w-10 h-10 text-amber-500 mx-auto" />
              <div>
                <h4 className="font-bold text-slate-800 dark:text-slate-200">
                  Tagihan Uang Pangkal Belum Diterbitkan
                </h4>
                <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                  Calon santri ini telah lulus seleksi namun belum memiliki skema biaya uang pangkal di Modul Keuangan. Silakan tetapkan skema tagihan di Modul Keuangan (PPDB Billing).
                </p>
              </div>
            </div>
          )}

          {/* Action Footer */}
          <div className="flex flex-col sm:flex-row justify-between items-center gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setDetailModalOpen(false)}
              className="w-full sm:w-auto px-4 py-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-xs font-semibold"
            >
              Tutup
            </button>
            <div className="flex gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => {
                  setDetailModalOpen(false);
                  handleOpenFinanceModule(selectedRegistrant);
                }}
                className="flex-1 sm:flex-initial px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-semibold rounded-lg text-xs shadow-sm inline-flex items-center justify-center gap-1.5 transition"
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>Buka di Kasir Keuangan</span>
                <ExternalLink className="w-3.5 h-3.5 opacity-80" />
              </button>

              {detailBillData?.is_paid && selectedRegistrant?.status !== 'placed' && (
                <button
                  type="button"
                  onClick={() => {
                    setDetailModalOpen(false);
                    handleProceedToPlacement(selectedRegistrant);
                  }}
                  className="flex-1 sm:flex-initial px-4 py-2 bg-teal-600 hover:bg-teal-700 active:scale-95 text-white font-semibold rounded-lg text-xs shadow-sm inline-flex items-center justify-center gap-1.5 transition"
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Tempatkan ke Rombel</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL: Penempatan Siswa ke Rombel Akademik */}
      {/* ========================================================================= */}
      <Modal
        isOpen={placementModalOpen}
        onClose={() => setPlacementModalOpen(false)}
        title="Penempatan Siswa ke Rombel Kelas"
      >
        <form onSubmit={handlePlaceStudent} className="space-y-4 text-xs">
          <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-lg">
            <div className="font-bold text-slate-800 dark:text-slate-100">
              {selectedRegistrant?.full_name}
            </div>
            <div className="text-slate-500">
              Gender:{' '}
              <strong className="text-slate-700 dark:text-slate-300">
                {selectedRegistrant?.gender === 'L' ? 'Laki-laki (Ikhwan)' : 'Perempuan (Akhwat)'}
              </strong>{' '}
              | Status Uang Pangkal: LUNAS
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Rombel Kelas Tujuan (Akademik)
            </label>
            <select
              value={placementForm.class_group_id}
              onChange={(e) => setPlacementForm({ ...placementForm, class_group_id: e.target.value })}
              className="w-full p-2 border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-900"
              required
            >
              <option value="">-- Pilih Rombel --</option>
              {classQuotas.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.class_name || c.name} (Tingkat {c.grade_level}) - Kuota:{' '}
                  {c.filled || 0}/{c.capacity || 30}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-slate-400 mt-1">
              Sistem akan memvalidasi kuota gender dan otomatis menggenerate NIPD/NIS siswa di modul Akademik.
            </p>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Tahun Ajaran Akademik
            </label>
            <select
              value={placementForm.academic_year_id}
              onChange={(e) => setPlacementForm({ ...placementForm, academic_year_id: e.target.value })}
              className="w-full p-2 border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-900"
              required
            >
              <option value="">-- Pilih Tahun Ajaran --</option>
              {academicYears.map((y) => (
                <option key={y.id} value={y.id}>
                  {y.name} {y.is_active ? '(Aktif)' : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setPlacementModalOpen(false)}
              className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded font-semibold"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded shadow-sm"
            >
              Tempatkan Siswa
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
