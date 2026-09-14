import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../shared/store/AuthContext';
import api from '../../../shared/services/api';
import SearchableSelect from '../../../shared/components/SearchableSelect';
import StatRibbonCard from '../../../shared/components/StatRibbonCard';
import StatusPill from '../../../shared/components/StatusPill';
import FlatAlertBanner from '../../../shared/components/FlatAlertBanner';
import { formatCurrency, formatNumber, formatDate } from '../../../shared/utils/formatters';
import {
  FileText,
  Printer,
  Download,
  Search,
  Filter,
  User,
  CheckCircle2,
  AlertCircle,
  Clock,
  RotateCw,
  Loader2,
  CreditCard,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  ArrowLeft,
  Users,
  Receipt,
  Calendar,
  Layers,
  History,
  UserCheck,
  Send,
  Sliders,
  TrendingUp,
  FileSpreadsheet,
  AlertTriangle,
  Bell,
  Sparkles,
  X,
  GraduationCap,
  ArrowUpRight,
  ShieldCheck,
  Building2,
  Check,
  Tag,
  BookOpen,
  BarChart3,
  PieChart,
  Percent,
  Activity,
  Wallet,
  Landmark,
  TrendingDown,
  Target,
  Zap
} from 'lucide-react';

export default function StudentPaymentCard() {
  const { activeSchoolUnit } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // URL query parameter support
  const queryParams = new URLSearchParams(location.search);
  const initialStudentId = queryParams.get('student_id') || '';

  // Mode Tab: 'class_recap' | 'individual'
  const [activeTab, setActiveTab] = useState(initialStudentId ? 'individual' : 'class_recap');

  // Master Data states
  const [academicYears, setAcademicYears] = useState([]);
  const [cohorts, setCohorts] = useState([]);
  const [gradeLevels, setGradeLevels] = useState([]);
  const [allClassGroups, setAllClassGroups] = useState([]);
  const [filteredClassGroups, setFilteredClassGroups] = useState([]);
  const [feeTypes, setFeeTypes] = useState([]);
  const [loadingMaster, setLoadingMaster] = useState(false);

  // Individual Ledger State
  const [selectedStudentId, setSelectedStudentId] = useState(initialStudentId);
  const [searchStudentTerm, setSearchStudentTerm] = useState('');
  const [studentSearchResults, setStudentSearchResults] = useState([]);
  const [searchingStudents, setSearchingStudents] = useState(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [ledgerData, setLedgerData] = useState(null);
  const [loadingLedger, setLoadingLedger] = useState(false);
  const [individualAllYears, setIndividualAllYears] = useState(true);
  const [individualAcademicYear, setIndividualAcademicYear] = useState('');
  const [expandedMonthlyRows, setExpandedMonthlyRows] = useState({});
  const [detailSearchTerm, setDetailSearchTerm] = useState('');
  const [detailFeeTypeId, setDetailFeeTypeId] = useState('');
  const [detailStatusFilter, setDetailStatusFilter] = useState('all');

  // Class Recap State
  const [classRecap, setClassRecap] = useState(null);
  const [loadingRecap, setLoadingRecap] = useState(false);
  const [recapAllYears, setRecapAllYears] = useState(false);
  const [recapAcademicYear, setRecapAcademicYear] = useState('');
  const [selectedCohortId, setSelectedCohortId] = useState('');
  const [selectedGradeLevelId, setSelectedGradeLevelId] = useState('');
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedPaymentStatus, setSelectedPaymentStatus] = useState('all');
  const [selectedFeeTypeId, setSelectedFeeTypeId] = useState('');
  const [recapSearchTerm, setRecapSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(25);

  // Collection Performance Analytics State
  const [performanceData, setPerformanceData] = useState(null);
  const [loadingPerformance, setLoadingPerformance] = useState(false);
  const [activeBreakdownGroup, setActiveBreakdownGroup] = useState('class'); // 'class' | 'cohort' | 'grade_level'

  // Export states
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [downloadingExcel, setDownloadingExcel] = useState(false);

  // Notification stub state
  const [notifyingStudentId, setNotifyingStudentId] = useState(null);

  // Search input ref
  const searchInputRef = useRef(null);
  const searchDropdownRef = useRef(null);

  // Format currency IDR
  const formatCurrency = (val) => {
    const num = parseFloat(val || 0);
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0
    }).format(num);
  };

  const formatRawNumber = (val) => {
    const num = parseFloat(val || 0);
    return num.toLocaleString('id-ID', { maximumFractionDigits: 0 });
  };

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (
        searchDropdownRef.current &&
        !searchDropdownRef.current.contains(e.target) &&
        searchInputRef.current &&
        !searchInputRef.current.contains(e.target)
      ) {
        setShowSearchDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 1. Fetch Master Data with Robust Multi-Source Fallbacks
  const fetchMasterData = async () => {
    setLoadingMaster(true);
    try {
      const ayParams = activeSchoolUnit?.id ? { satuan_pendidikan_id: activeSchoolUnit.id } : {};

      const [ayRes, repAyRes, clsRes, ftRes, filterOptRes] = await Promise.allSettled([
        api.get('/akademik/academic-years', { params: ayParams }),
        api.get('/keuangan/reports/academic-years', { params: ayParams }),
        api.get('/keuangan/reports/classes', { params: ayParams }),
        api.get('/keuangan/fee-types', { params: ayParams }),
        api.get('/keuangan/reports/student-ledger/filter-options', { params: ayParams })
      ]);

      let rawYears = [];
      if (repAyRes.status === 'fulfilled' && repAyRes.value?.data?.data?.length > 0) {
        rawYears = repAyRes.value.data.data;
      } else if (ayRes.status === 'fulfilled' && ayRes.value?.data) {
        rawYears = ayRes.value.data?.data || ayRes.value.data?.academic_years || (Array.isArray(ayRes.value.data) ? ayRes.value.data : []);
      }

      if (rawYears.length === 0) {
        try {
          const fb =
            (await api.get('/keuangan/academic-years').catch(() => null)) ||
            (await api.get('/akademik/academic-years').catch(() => null)) ||
            (await api.get('/keuangan/master-data/academic-years').catch(() => null));
          if (fb?.data) {
            rawYears = fb.data?.data || fb.data?.academic_years || (Array.isArray(fb.data) ? fb.data : []);
          }
        } catch (e) {
          console.warn('Fallback academic years warning:', e);
        }
      }

      // Deduplicate by year name & sort: Active first, then descending by id/name
      const uniqueAysMap = new Map();
      rawYears.forEach((y) => {
        if (!y || !y.name) return;
        const key = y.name.trim();
        const existing = uniqueAysMap.get(key);
        if (!existing || (y.is_active && !existing.is_active)) {
          uniqueAysMap.set(key, y);
        }
      });

      const uniqueAys = Array.from(uniqueAysMap.values()).sort((a, b) => {
        if (a.is_active && !b.is_active) return -1;
        if (!a.is_active && b.is_active) return 1;
        return (b.id || 0) - (a.id || 0);
      });

      setAcademicYears(uniqueAys);

      // Classes (Reguler Only)
      let classes = [];
      if (clsRes.status === 'fulfilled' && clsRes.value?.data) {
        classes = clsRes.value.data?.data || (Array.isArray(clsRes.value.data) ? clsRes.value.data : []);
      }
      setAllClassGroups(classes);

      // Fee Types
      let fees = [];
      if (ftRes.status === 'fulfilled' && ftRes.value?.data) {
        fees = ftRes.value.data?.data || (Array.isArray(ftRes.value.data) ? ftRes.value.data : []);
      }
      setFeeTypes(fees);

      // Filter Options: Cohorts (Angkatan) & Grade Levels (Tingkat)
      if (filterOptRes.status === 'fulfilled' && filterOptRes.value?.data?.data) {
        const fData = filterOptRes.value.data.data;
        setCohorts(fData.cohorts || []);
        setGradeLevels(fData.grade_levels || []);
      } else {
        // Fallbacks
        const [cRes, gRes] = await Promise.allSettled([
          api.get('/keuangan/reports/student-ledger/filters/cohorts', { params: ayParams }),
          api.get('/keuangan/reports/student-ledger/filters/grade-levels', { params: ayParams })
        ]);
        if (cRes.status === 'fulfilled') setCohorts(cRes.value.data?.data || []);
        if (gRes.status === 'fulfilled') setGradeLevels(gRes.value.data?.data || []);
      }

      // Set default selected academic year
      if (uniqueAys.length > 0) {
        const activeAy = uniqueAys.find((y) => y.is_active) || uniqueAys[0];
        setRecapAcademicYear((prev) => {
          if (prev && uniqueAys.some((y) => String(y.id) === String(prev))) return prev;
          return activeAy.id;
        });
        setIndividualAcademicYear((prev) => {
          if (prev && uniqueAys.some((y) => String(y.id) === String(prev))) return prev;
          return activeAy.id;
        });
      }
    } catch (err) {
      console.warn('Gagal memuat master data:', err.message);
    } finally {
      setLoadingMaster(false);
    }
  };

  useEffect(() => {
    fetchMasterData();
  }, [activeSchoolUnit]);

  // Filter Classes strictly according to Selected Academic Year, Grade Level & Unit
  useEffect(() => {
    let list = allClassGroups;
    if (!recapAllYears && recapAcademicYear) {
      list = list.filter(
        (c) => String(c.academic_year_id) === String(recapAcademicYear)
      );
    }
    if (selectedGradeLevelId) {
      list = list.filter(
        (c) => String(c.grade_level_id) === String(selectedGradeLevelId)
      );
    }
    setFilteredClassGroups(list);

    // Reset selected class if it's no longer in the filtered list
    if (selectedClassId && !list.some((c) => String(c.id) === String(selectedClassId))) {
      setSelectedClassId('');
    }
  }, [recapAcademicYear, recapAllYears, selectedGradeLevelId, allClassGroups]);

  // 2. Fetch Individual Student Ledger
  const fetchStudentLedger = async (studentId) => {
    if (!studentId) return;
    setLoadingLedger(true);
    try {
      const params = {};
      if (individualAllYears) {
        params.all_years = true;
      } else if (individualAcademicYear) {
        params.academic_year_id = individualAcademicYear;
      }

      const res = await api.get(`/keuangan/reports/student-ledger/${studentId}`, { params });
      setLedgerData(res.data?.data || null);
    } catch (err) {
      console.error('Error fetching student ledger:', err);
      alert(err.response?.data?.message || 'Gagal memuat kartu pembayaran siswa');
    } finally {
      setLoadingLedger(false);
    }
  };

  useEffect(() => {
    if (selectedStudentId) {
      fetchStudentLedger(selectedStudentId);
    }
  }, [selectedStudentId, individualAllYears, individualAcademicYear, activeSchoolUnit]);

  // Live Autocomplete Search Students (For Individual Tab)
  useEffect(() => {
    const timer = setTimeout(async () => {
      const q = searchStudentTerm.trim();
      if (q.length >= 2) {
        setSearchingStudents(true);
        try {
          const res = await api.get(
            `/keuangan/reports/student-ledger?search=${encodeURIComponent(q)}&all_years=true&per_page=12`
          );
          setStudentSearchResults(res.data?.data?.students || []);
          setShowSearchDropdown(true);
        } catch (err) {
          console.error('Error searching students:', err);
        } finally {
          setSearchingStudents(false);
        }
      } else {
        setStudentSearchResults([]);
        if (q.length === 0) setShowSearchDropdown(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchStudentTerm]);

  // 3. Fetch Class Recap / Collection Performance
  const fetchClassRecap = async (page = currentPage) => {
    setLoadingRecap(true);
    try {
      const params = {
        page,
        per_page: perPage
      };

      if (recapAllYears) {
        params.all_years = true;
      } else if (recapAcademicYear) {
        params.academic_year_id = recapAcademicYear;
      }

      if (selectedCohortId) params.cohort_id = selectedCohortId;
      if (selectedGradeLevelId) params.grade_level_id = selectedGradeLevelId;
      if (selectedClassId) params.class_id = selectedClassId;
      if (selectedPaymentStatus !== 'all') params.payment_status = selectedPaymentStatus;
      if (selectedFeeTypeId) params.fee_type_id = selectedFeeTypeId;
      if (recapSearchTerm.trim()) params.search = recapSearchTerm.trim();

      const res = await api.get('/keuangan/reports/student-ledger', { params });
      setClassRecap(res.data?.data || null);
    } catch (err) {
      console.error('Error fetching class recap:', err);
    } finally {
      setLoadingRecap(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'class_recap') {
      fetchClassRecap(1);
      setCurrentPage(1);
    }
  }, [
    activeTab,
    recapAllYears,
    recapAcademicYear,
    selectedCohortId,
    selectedGradeLevelId,
    selectedClassId,
    selectedPaymentStatus,
    selectedFeeTypeId,
    activeSchoolUnit
  ]);

  // 3b. Fetch Collection Performance Analytics
  const fetchCollectionPerformance = async () => {
    setLoadingPerformance(true);
    try {
      const params = {};
      if (recapAllYears) {
        params.all_years = true;
      } else if (recapAcademicYear) {
        params.academic_year_id = recapAcademicYear;
      }
      if (selectedCohortId) params.cohort_id = selectedCohortId;
      if (selectedGradeLevelId) params.grade_level_id = selectedGradeLevelId;
      if (selectedClassId) params.class_id = selectedClassId;
      if (selectedFeeTypeId) params.fee_type_id = selectedFeeTypeId;

      const res = await api.get('/keuangan/reports/student-ledger/collection-performance', { params });
      setPerformanceData(res.data?.data || null);
    } catch (err) {
      console.error('Error fetching collection performance:', err);
    } finally {
      setLoadingPerformance(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'performance') {
      fetchCollectionPerformance();
    }
  }, [
    activeTab,
    recapAllYears,
    recapAcademicYear,
    selectedCohortId,
    selectedGradeLevelId,
    selectedClassId,
    selectedFeeTypeId,
    activeSchoolUnit
  ]);

  // Search debounce for recap
  useEffect(() => {
    if (activeTab !== 'class_recap') return;
    const timer = setTimeout(() => {
      fetchClassRecap(1);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [recapSearchTerm]);

  // 4. Export Handlers
  const handleExportExcel = async () => {
    setDownloadingExcel(true);
    try {
      const params = new URLSearchParams();
      if (recapAllYears) params.append('all_years', 'true');
      else if (recapAcademicYear) params.append('academic_year_id', recapAcademicYear);
      if (selectedCohortId) params.append('cohort_id', selectedCohortId);
      if (selectedGradeLevelId) params.append('grade_level_id', selectedGradeLevelId);
      if (selectedClassId) params.append('class_id', selectedClassId);
      if (selectedPaymentStatus !== 'all') params.append('payment_status', selectedPaymentStatus);
      if (selectedFeeTypeId) params.append('fee_type_id', selectedFeeTypeId);
      if (recapSearchTerm) params.append('search', recapSearchTerm);

      const response = await api.get(`/keuangan/reports/student-ledger/export/excel?${params.toString()}`, {
        responseType: 'blob'
      });

      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `rekap-penagihan-siswa-${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      alert('Gagal mengunduh file Excel');
    } finally {
      setDownloadingExcel(false);
    }
  };

  const handleExportPdf = async () => {
    setDownloadingPdf(true);
    try {
      const params = new URLSearchParams();
      if (recapAllYears) params.append('all_years', 'true');
      else if (recapAcademicYear) params.append('academic_year_id', recapAcademicYear);
      if (selectedCohortId) params.append('cohort_id', selectedCohortId);
      if (selectedGradeLevelId) params.append('grade_level_id', selectedGradeLevelId);
      if (selectedClassId) params.append('class_id', selectedClassId);
      if (selectedPaymentStatus !== 'all') params.append('payment_status', selectedPaymentStatus);
      if (selectedFeeTypeId) params.append('fee_type_id', selectedFeeTypeId);
      if (recapSearchTerm) params.append('search', recapSearchTerm);

      const response = await api.get(`/keuangan/reports/student-ledger/export/pdf?${params.toString()}`, {
        responseType: 'blob'
      });

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `laporan-kinerja-penagihan-${new Date().toISOString().slice(0, 10)}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      alert('Gagal mengunduh file PDF');
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handleDownloadIndividualPdf = async () => {
    if (!selectedStudentId) return;
    setDownloadingPdf(true);
    try {
      const params = new URLSearchParams();
      if (individualAllYears) params.append('all_years', 'true');
      else if (individualAcademicYear) params.append('academic_year_id', individualAcademicYear);

      const response = await api.get(
        `/keuangan/reports/student-ledger/${selectedStudentId}/pdf?${params.toString()}`,
        {
          responseType: 'blob'
        }
      );

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const sName = (ledgerData?.student?.name || 'santri').toLowerCase().replace(/[^a-z0-9]/g, '-');
      a.download = `kartu-bayar-${sName}-${new Date().toISOString().slice(0, 10)}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      alert('Gagal mengunduh kartu bayar PDF');
    } finally {
      setDownloadingPdf(false);
    }
  };

  // 5. Send Notification Stub
  const handleNotifyOverdue = async (student) => {
    if (
      !window.confirm(
        `Kirim pengingat tunggakan tagihan ke wali santri ${student.name}?\nTotal tunggakan: ${formatCurrency(
          student.total_remaining
        )} (${student.aging_days} hari menunggak).`
      )
    ) {
      return;
    }
    setNotifyingStudentId(student.student_id);
    try {
      const res = await api.post(`/keuangan/reports/student-ledger/${student.student_id}/notify-overdue`, {
        notes: `Pengingat tagihan otomatis dari Kartu Bayar (${student.aging_days} hari)`
      });
      alert(res.data?.message || 'Pengingat tunggakan berhasil dicatat!');
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal mengirim pengingat');
    } finally {
      setNotifyingStudentId(null);
    }
  };

  // Aging Badge Helper
  const getAgingBadge = (days, status) => {
    switch (status) {
      case 'kritis':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-800 border border-rose-200">
            🔴 Macet ({days}h)
          </span>
        );
      case 'peringatan':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
            🟠 Peringatan ({days}h)
          </span>
        );
      case 'perhatian':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-yellow-100 text-yellow-800 border border-yellow-200">
            🟡 Perhatian ({days}h)
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
            🟢 Lancar
          </span>
        );
    }
  };

  const monthKeys = [
    { key: 'jul', label: 'Jul' },
    { key: 'aug', label: 'Agu' },
    { key: 'sep', label: 'Sep' },
    { key: 'oct', label: 'Okt' },
    { key: 'nov', label: 'Nov' },
    { key: 'dec', label: 'Des' },
    { key: 'jan', label: 'Jan' },
    { key: 'feb', label: 'Feb' },
    { key: 'mar', label: 'Mar' },
    { key: 'apr', label: 'Apr' },
    { key: 'may', label: 'Mei' },
    { key: 'jun', label: 'Jun' }
  ];

  // Options arrays for Searchable Selects
  const academicYearOptions = academicYears.map((ay) => ({
    id: ay.id,
    name: ay.name,
    is_active: ay.is_active,
    start_date: ay.start_date,
    end_date: ay.end_date
  }));

  const cohortOptions = [
    { id: '', name: 'Semua Angkatan' },
    ...cohorts.map((ch) => ({
      id: ch.id,
      name: ch.name ? `${ch.name} (${ch.year})` : `Angkatan ${ch.year}`,
      year: ch.year
    }))
  ];

  const gradeLevelOptions = [
    { id: '', name: 'Semua Tingkat' },
    ...gradeLevels.map((gl) => ({
      id: gl.id,
      name: gl.name || `Tingkat ${gl.level_order || gl.id}`,
      level_order: gl.level_order
    }))
  ];

  const classOptions = [
    { id: '', name: 'Semua Kelas (Reguler)' },
    ...filteredClassGroups.map((c) => ({
      id: c.id,
      name: `Kelas ${c.name}`,
      student_count: c.student_count,
      academic_year_id: c.academic_year_id,
      grade_level_id: c.grade_level_id
    }))
  ];

  const feeTypeOptions = [
    { id: '', name: 'Semua Pos Biaya' },
    ...feeTypes.map((f) => ({
      id: f.id,
      name: f.name,
      billing_pattern: f.billing_pattern
    }))
  ];

  const paymentStatusOptions = [
    { id: 'all', name: 'Semua Status' },
    { id: 'unpaid_only', name: '🔴 Menunggak Saja' },
    { id: 'paid_only', name: '🟢 Lunas Saja' }
  ];

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-12">
      {/* Header Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 rounded-xl p-6 sm:p-8 text-white shadow-xl shadow-emerald-950/20 border border-emerald-800/40">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-80 h-80 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 -mb-16 w-60 h-60 rounded-full bg-teal-400/10 blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 backdrop-blur-md">
                <Sparkles className="w-3.5 h-3.5 text-emerald-300 animate-pulse" />
                <span>Financial Ledger & Matrix Pivot</span>
              </span>
              {activeSchoolUnit && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/10 text-slate-200 border border-white/10 backdrop-blur-md">
                  <Building2 className="w-3.5 h-3.5 text-teal-300" />
                  <span>{activeSchoolUnit.name || 'Semua Unit'}</span>
                </span>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Kartu Bayar Siswa & Laporan Kinerja Penagihan
            </h1>
            <p className="text-xs sm:text-sm text-emerald-100/80 max-w-2xl font-normal leading-relaxed">
              Monitoring piutang individual santri, histori kwitansi, dan visualisasi kinerja efisiensi penagihan bulanan (Juli–Juni) berbasis SQL Conditional Pivot terintegrasi.
            </p>
          </div>

          {/* Top Actions */}
          <div className="flex flex-wrap items-center gap-2.5">
            {activeTab === 'class_recap' && (
              <>
                <button
                  type="button"
                  onClick={handleExportExcel}
                  disabled={downloadingExcel || loadingRecap}
                  className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-950/30 transition duration-200 disabled:opacity-60"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>{downloadingExcel ? 'Mengunduh...' : 'Ekspor Excel'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleExportPdf}
                  disabled={downloadingPdf || loadingRecap}
                  className="flex items-center gap-2 px-4 py-2.5 bg-rose-600 hover:bg-rose-500 active:scale-95 text-white text-xs font-bold rounded-xl shadow-lg shadow-rose-950/30 transition duration-200 disabled:opacity-60"
                >
                  <Printer className="w-4 h-4" />
                  <span>{downloadingPdf ? 'Mengunduh...' : 'Ekspor PDF'}</span>
                </button>
              </>
            )}

            {activeTab === 'individual' && selectedStudentId && (
              <button
                type="button"
                onClick={handleDownloadIndividualPdf}
                disabled={downloadingPdf || loadingLedger}
                className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-950/30 transition duration-200 disabled:opacity-60"
              >
                <Printer className="w-4 h-4" />
                <span>{downloadingPdf ? 'Mencetak...' : 'Cetak Kartu PDF'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                fetchMasterData();
                if (activeTab === 'class_recap') fetchClassRecap(currentPage);
                else if (activeTab === 'performance') fetchCollectionPerformance();
                else if (selectedStudentId) fetchStudentLedger(selectedStudentId);
              }}
              disabled={loadingRecap || loadingLedger || loadingPerformance || loadingMaster}
              className="flex items-center gap-2 px-3.5 py-2.5 bg-white/10 hover:bg-white/20 active:scale-95 text-white border border-white/20 text-xs font-semibold rounded-xl backdrop-blur-md transition duration-200 disabled:opacity-60"
            >
              <RotateCw
                className={`w-4 h-4 ${
                  loadingRecap || loadingLedger || loadingPerformance || loadingMaster
                    ? 'animate-spin text-emerald-300'
                    : 'text-slate-300'
                }`}
              />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </div>

        {/* Tab Selector inside Hero */}
        <div className="mt-8 pt-4 border-t border-white/10 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => setActiveTab('class_recap')}
            className={`flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 ${
              activeTab === 'class_recap'
                ? 'bg-white text-emerald-950 shadow-lg shadow-black/20 scale-102'
                : 'bg-white/10 text-emerald-100 hover:bg-white/15'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Rekap Seluruh Siswa & Matriks Penagihan (12 Bulan)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('individual')}
            className={`flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 ${
              activeTab === 'individual'
                ? 'bg-white text-emerald-950 shadow-lg shadow-black/20 scale-102'
                : 'bg-white/10 text-emerald-100 hover:bg-white/15'
            }`}
          >
            <User className="w-4 h-4" />
            <span>Kartu Bayar Individual Santri</span>
            {selectedStudentId && <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('performance')}
            className={`flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 ${
              activeTab === 'performance'
                ? 'bg-white text-emerald-950 shadow-lg shadow-black/20 scale-102'
                : 'bg-white/10 text-emerald-100 hover:bg-white/15'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>Kinerja Penerimaan & Analytics</span>
            <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-500/20 text-emerald-200 border border-emerald-400/30">
              Live
            </span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: REKAP KELAS & KINERJA PENAGIHAN BULANAN (COLLECTION PERFORMANCE) */}
      {/* ========================================================================= */}
      {activeTab === 'class_recap' && (
        <div className="space-y-6">
          {/* Live Search & Filter Control Bar with Custom Redesigned Comboboxes */}
          <div className="bg-white rounded-xl p-5 sm:p-6 border border-slate-200/80 shadow-xs space-y-5">
            {/* Top Filter Row: Cycle Switcher & Status Chips */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              {/* Cycle Toggle */}
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-emerald-600" />
                  <span>Siklus Periode:</span>
                </span>
                <div className="inline-flex p-1 bg-slate-100/90 rounded-xl border border-slate-200/60">
                  <button
                    type="button"
                    onClick={() => setRecapAllYears(false)}
                    className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      !recapAllYears ? 'bg-white text-emerald-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Tahun Ajaran Tertentu
                  </button>
                  <button
                    type="button"
                    onClick={() => setRecapAllYears(true)}
                    className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      recapAllYears
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Semua Tahun Ajaran (Riwayat Penuh)
                  </button>
                </div>
              </div>

              {/* Status Quick Filter Chips */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-semibold text-slate-400 mr-1">Status:</span>
                {[
                  { key: 'all', label: 'Semua Status' },
                  { key: 'unpaid_only', label: '🔴 Menunggak Saja' },
                  { key: 'paid_only', label: '🟢 Lunas Saja' }
                ].map((st) => (
                  <button
                    key={st.key}
                    type="button"
                    onClick={() => setSelectedPaymentStatus(st.key)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      selectedPaymentStatus === st.key
                        ? 'bg-slate-900 text-white shadow-xs scale-102'
                        : 'bg-slate-50 text-slate-600 border border-slate-200/60 hover:bg-slate-100'
                    }`}
                  >
                    {st.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Bottom Filter Row: Custom Searchable Comboboxes Grid (6 Kolom Filter Responsif) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3.5">
              {/* 1. Custom Dropdown Tahun Ajaran with Live Search */}
              {!recapAllYears ? (
                <SearchableSelect
                  label="Tahun Ajaran"
                  icon={Calendar}
                  options={academicYearOptions}
                  value={recapAcademicYear}
                  onChange={(val) => setRecapAcademicYear(val)}
                  placeholder="Pilih Tahun Ajaran..."
                  searchPlaceholder="Cari tahun ajaran (cth: 2024)..."
                  getOptionLabel={(opt) => opt.name}
                  getOptionValue={(opt) => opt.id}
                  getOptionBadge={(opt) =>
                    opt.is_active ? (
                      <StatusPill variant="success">Aktif</StatusPill>
                    ) : null
                  }
                  getOptionSubtext={(opt) =>
                    opt.start_date && opt.end_date
                      ? `${String(opt.start_date).slice(0, 10)} s/d ${String(opt.end_date).slice(0, 10)}`
                      : null
                  }
                />
              ) : (
                <div className="space-y-1.5 opacity-60">
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-purple-600" />
                    <span>Tahun Ajaran</span>
                  </label>
                  <div className="w-full px-3.5 py-2.5 rounded-xl border border-purple-200 bg-purple-50/50 text-xs font-bold text-purple-800 truncate">
                    Semua Tahun
                  </div>
                </div>
              )}

              {/* 2. Custom Dropdown Angkatan / Cohort */}
              <SearchableSelect
                label="Angkatan (Cohort)"
                icon={BookOpen}
                options={cohortOptions}
                value={selectedCohortId}
                onChange={(val) => setSelectedCohortId(val)}
                placeholder="Semua Angkatan..."
                searchPlaceholder="Cari angkatan (cth: 2024)..."
                badgeText={cohorts.length > 0 ? `${cohorts.length} Angkatan` : null}
                getOptionLabel={(opt) => opt.name}
                getOptionValue={(opt) => opt.id}
                getOptionBadge={(opt) =>
                  opt.year && opt.id !== '' ? (
                    <span className="text-[9px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-md">
                      Thn {opt.year}
                    </span>
                  ) : null
                }
              />

              {/* 3. Custom Dropdown Tingkat / Jenjang Kelas */}
              <SearchableSelect
                label="Tingkat Kelas"
                icon={Layers}
                options={gradeLevelOptions}
                value={selectedGradeLevelId}
                onChange={(val) => setSelectedGradeLevelId(val)}
                placeholder="Semua Tingkat..."
                searchPlaceholder="Cari tingkat (cth: 7, 8, 9)..."
                badgeText={gradeLevels.length > 0 ? `${gradeLevels.length} Tingkat` : null}
                getOptionLabel={(opt) => opt.name}
                getOptionValue={(opt) => opt.id}
                getOptionBadge={(opt) =>
                  opt.level_order && opt.id !== '' ? (
                    <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md border border-emerald-100">
                      Tk. {opt.level_order}
                    </span>
                  ) : null
                }
              />

              {/* 4. Custom Dropdown Rombel / Kelas (Filtered strictly to Reguler & Selected Year / Grade) */}
              <SearchableSelect
                label="Rombel / Kelas"
                icon={GraduationCap}
                options={classOptions}
                value={selectedClassId}
                onChange={(val) => setSelectedClassId(val)}
                placeholder="Semua Kelas..."
                searchPlaceholder="Cari rombel/kelas (cth: 7-A)..."
                badgeText={
                  filteredClassGroups.length > 0 ? `${filteredClassGroups.length} Rombel` : '0 Rombel'
                }
                getOptionLabel={(opt) => opt.name}
                getOptionValue={(opt) => opt.id}
                getOptionBadge={(opt) =>
                  opt.student_count !== undefined && opt.id !== '' ? (
                    <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                      {opt.student_count} Siswa
                    </span>
                  ) : null
                }
              />

              {/* 5. Custom Dropdown Pos Biaya with Live Search */}
              <SearchableSelect
                label="Pos Biaya"
                icon={Receipt}
                options={feeTypeOptions}
                value={selectedFeeTypeId}
                onChange={(val) => setSelectedFeeTypeId(val)}
                placeholder="Semua Pos Biaya..."
                searchPlaceholder="Cari pos biaya (cth: SPP)..."
                getOptionLabel={(opt) => opt.name}
                getOptionValue={(opt) => opt.id}
                getOptionBadge={(opt) =>
                  opt.billing_pattern ? (
                    <span className="text-[9px] font-bold text-slate-500 uppercase bg-slate-100 px-1.5 py-0.5 rounded-md">
                      {opt.billing_pattern}
                    </span>
                  ) : null
                }
              />

              {/* 6. Live Search Santri / NIS Input */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                    <Search className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Cari Santri / NIS</span>
                  </label>
                  {recapSearchTerm && (
                    <span className="text-[10px] text-emerald-600 font-bold lowercase">aktif</span>
                  )}
                </div>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Nama / NIS..."
                    value={recapSearchTerm}
                    onChange={(e) => setRecapSearchTerm(e.target.value)}
                    className="w-full text-xs font-semibold py-2.5 pl-9 pr-8 rounded-xl border border-slate-200/90 bg-slate-50/80 hover:bg-white focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition placeholder:text-slate-400 shadow-2xs"
                  />
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  {recapSearchTerm && (
                    <button
                      type="button"
                      onClick={() => setRecapSearchTerm('')}
                      className="absolute right-2.5 top-2.5 p-0.5 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Macro KPI Cards */}
          {classRecap && (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3.5">
              <StatRibbonCard
                label="Total Santri"
                value={`${classRecap.performance_summary?.total_students || 0} Siswa`}
                subvalue={classRecap.academic_year?.name}
                status="neutral"
                icon={Users}
              />
              <StatRibbonCard
                label="Kewajiban TP Ini"
                value={formatCurrency(classRecap.performance_summary?.total_billed)}
                subvalue={`Diskon: ${formatCurrency(classRecap.performance_summary?.total_discount || 0)}`}
                status="neutral"
                icon={Receipt}
              />
              <StatRibbonCard
                label="Kas Masuk (Terbayar)"
                value={formatCurrency(classRecap.performance_summary?.total_paid)}
                subvalue="Diterima di kas/bank"
                status="success"
                icon={CheckCircle2}
              />
              <StatRibbonCard
                label="Sisa TP Berjalan"
                value={formatCurrency(classRecap.performance_summary?.total_remaining)}
                subvalue="Tahun berjalan"
                status="danger"
                icon={AlertCircle}
              />
              <StatRibbonCard
                label="Sisa TP Lalu"
                value={formatCurrency(classRecap.performance_summary?.total_arrears_previous_year || 0)}
                subvalue="Carry-over piutang"
                status="warning"
                icon={History}
              />
              <StatRibbonCard
                label="Collection Rate"
                value={`${classRecap.performance_summary?.overall_collection_rate || 0}%`}
                subvalue="Efektivitas penagihan"
                status="info"
                icon={TrendingUp}
              />
            </div>
          )}

          {/* Visual Strip: Kinerja Penagihan Bulanan (Juli - Juni) */}
          {classRecap?.performance_summary?.monthly_performance && (
            <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs p-5 space-y-3.5">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="text-xs font-bold text-slate-800 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                  <span>Kinerja Penagihan Bulanan (Target Billed vs Realisasi Kas Masuk)</span>
                </div>
                <span className="text-[11px] font-semibold text-slate-400 bg-slate-100 px-2.5 py-0.5 rounded-full">
                  Siklus 12 Bulan Akademik (Juli &rarr; Juni)
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-12 gap-2">
                {classRecap.performance_summary.monthly_performance.map((m) => {
                  const rate = m.collection_rate || 0;
                  const isHigh = rate >= 85;
                  const isMid = rate >= 50 && rate < 85;

                  return (
                    <div
                      key={m.month_index}
                      className="p-2.5 bg-slate-50/80 hover:bg-white border border-slate-100 hover:border-emerald-200 rounded-xl space-y-1 text-center transition group shadow-2xs hover:shadow-xs"
                    >
                      <div className="text-[11px] font-extrabold text-slate-700">{m.month_name}</div>
                      <div
                        className="text-[9px] text-slate-400 truncate"
                        title={`Target: ${formatCurrency(m.target_billed)}`}
                      >
                        T: {formatRawNumber(m.target_billed)}
                      </div>
                      <div
                        className="text-[10px] font-bold text-emerald-700 truncate"
                        title={`Realisasi: ${formatCurrency(m.actual_collected)}`}
                      >
                        R: {formatRawNumber(m.actual_collected)}
                      </div>
                      <div className="pt-0.5">
                        <span
                          className={`inline-block px-1.5 py-0.2 rounded-full text-[9px] font-extrabold ${
                            isHigh
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : isMid
                              ? 'bg-amber-100 text-amber-800 border border-amber-200'
                              : 'bg-rose-100 text-rose-800 border border-rose-200'
                          }`}
                        >
                          {rate}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Matrix Table (12 Bulan Juli–Juni) */}
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="px-6 py-4 bg-slate-50/80 border-b border-slate-200/80 flex items-center justify-between flex-wrap gap-2">
              <div className="text-xs font-bold text-slate-800 flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-600" />
                <span>Matriks Penagihan Santri ({classRecap?.pagination?.total_records || 0} Siswa)</span>
                {recapSearchTerm && (
                  <span className="text-[10px] font-semibold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                    Hasil filter "{recapSearchTerm}"
                  </span>
                )}
              </div>
              <div className="text-[11px] text-slate-500 font-medium">
                Halaman {classRecap?.pagination?.current_page || 1} dari{' '}
                {classRecap?.pagination?.total_pages || 1}
              </div>
            </div>

            <div className="table-container">
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead className="bg-slate-50/60 text-slate-600 font-bold border-b border-slate-200/80 text-[11px] uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3 text-center w-10">No</th>
                    <th className="px-4 py-3">Santri & NIS</th>
                    <th className="px-3 py-3">Kelas</th>
                    {/* 12 Kolom Bulan */}
                    {monthKeys.map((m) => (
                      <th key={m.key} className="px-2 py-3 text-center">
                        {m.label}
                      </th>
                    ))}
                    <th className="px-4 py-3 text-right">Kewajiban TP</th>
                    <th className="px-4 py-3 text-right">Terbayar</th>
                    <th className="px-4 py-3 text-right">Sisa TP Ini</th>
                    <th className="px-4 py-3 text-right text-amber-700 bg-amber-50/50">Sisa TP Lalu</th>
                    <th className="px-4 py-3 text-right font-black">Total Piutang</th>
                    <th className="px-3 py-3 text-center">Status</th>
                    <th className="px-3 py-3 text-center">Aging</th>
                    <th className="px-4 py-3 text-right sticky right-0 bg-slate-50 shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.05)]">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loadingRecap ? (
                    <tr>
                      <td colSpan="20" className="text-center py-20 text-slate-400">
                        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-emerald-600" />
                        <span className="text-xs font-semibold">Memuat matriks penagihan siswa...</span>
                      </td>
                    </tr>
                  ) : !classRecap || classRecap.students.length === 0 ? (
                    <tr>
                      <td colSpan="20" className="text-center py-16 text-slate-400">
                        <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
                          <Search className="w-6 h-6" />
                        </div>
                        <p className="text-xs font-semibold text-slate-600">Tidak ada data santri ditemukan</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Coba sesuaikan kata kunci pencarian atau pilih tahun ajaran lain.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    classRecap.students.map((s, idx) => {
                      const rowNum = (currentPage - 1) * perPage + idx + 1;

                      return (
                        <tr key={s.student_id} className="hover:bg-slate-50/80 transition group">
                          <td className="px-4 py-3 text-center text-slate-400 font-mono text-xs">{rowNum}</td>
                          <td className="px-4 py-3">
                            <div className="font-bold text-slate-800 flex items-center gap-1.5">
                              <span>{s.name}</span>
                              <span className="text-[10px] text-slate-400 font-normal">
                                ({s.gender === 'L' ? 'L' : 'P'})
                              </span>
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono">NIS: {s.nis || '-'}</div>
                          </td>
                          <td className="px-3 py-3">
                            <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-lg text-[11px] font-semibold">
                              {s.class_name}
                            </span>
                          </td>

                          {/* 12 Kolom Bulan */}
                          {monthKeys.map((m) => {
                            const mData = s.months?.[m.key] || { billed: 0, paid: 0, status: 'none' };
                            return (
                              <td key={m.key} className="px-2 py-3 text-center">
                                {mData.status === 'none' ? (
                                  <span className="text-slate-200">&bull;</span>
                                ) : mData.status === 'paid' ? (
                                  <span
                                    className="inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-700 border border-emerald-200 shadow-2xs"
                                    title={`Lunas: ${formatCurrency(mData.paid)}`}
                                  >
                                    ✓
                                  </span>
                                ) : mData.status === 'partial' ? (
                                  <span
                                    className="inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-black bg-amber-100 text-amber-700 border border-amber-200 shadow-2xs"
                                    title={`Sebagian: ${formatCurrency(mData.paid)} / ${formatCurrency(
                                      mData.billed
                                    )}`}
                                  >
                                    ½
                                  </span>
                                ) : (
                                  <span
                                    className="inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-black bg-rose-100 text-rose-700 border border-rose-200 shadow-2xs"
                                    title={`Belum: ${formatCurrency(mData.billed)}`}
                                  >
                                    !
                                  </span>
                                )}
                              </td>
                            );
                          })}

                          <td className="px-4 py-3 text-right font-semibold text-slate-800 font-mono">
                            {formatRawNumber(s.total_billed)}
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-emerald-600 font-mono">
                            {formatRawNumber(s.total_paid)}
                          </td>
                          <td className="px-4 py-3 text-right font-semibold font-mono">
                            <span className={s.total_remaining > 0 ? 'text-rose-600' : 'text-emerald-600'}>
                              {formatRawNumber(s.total_remaining)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right font-mono bg-amber-50/30">
                            {s.arrears_previous_year > 0 ? (
                              <span className="font-bold text-amber-700" title={`${s.arrears_previous_year_count} pos tunggakan TP lampau`}>
                                {formatRawNumber(s.arrears_previous_year)}
                              </span>
                            ) : (
                              <span className="text-slate-300">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right font-black font-mono">
                            <span className={s.grand_total_remaining > 0 ? 'text-rose-700 font-extrabold' : 'text-emerald-600'}>
                              {formatRawNumber(s.grand_total_remaining)}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-center">
                            <span
                              className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                s.settlement_status === 'Lunas'
                                  ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                                  : s.settlement_status === 'Sebagian'
                                  ? 'bg-amber-100 text-amber-700 border border-amber-200'
                                  : 'bg-rose-100 text-rose-700 border border-rose-200'
                              }`}
                            >
                              {s.settlement_status}
                            </span>
                          </td>

                          {/* Aging Badge */}
                          <td className="px-3 py-3 text-center">
                            {s.grand_total_remaining > 0 ? (
                              getAgingBadge(s.aging_days, s.aging_status)
                            ) : (
                              <span className="text-[10px] text-emerald-600 font-semibold">Lunas</span>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="px-4 py-3 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedStudentId(s.student_id);
                                  setActiveTab('individual');
                                }}
                                title="Buka Kartu Bayar Individual"
                                className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-[11px] font-bold transition shadow-2xs"
                              >
                                <span>Kartu</span>
                                <ArrowUpRight className="w-3 h-3" />
                              </button>

                              {s.total_remaining > 0 && (
                                <button
                                  type="button"
                                  onClick={() => handleNotifyOverdue(s)}
                                  disabled={notifyingStudentId === s.student_id}
                                  title="Kirim Pengingat Tunggakan ke Wali Santri"
                                  className="p-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-xl transition shadow-2xs"
                                >
                                  {notifyingStudentId === s.student_id ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  ) : (
                                    <Bell className="w-3.5 h-3.5" />
                                  )}
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {classRecap?.pagination && classRecap.pagination.total_pages > 1 && (
              <div className="px-6 py-4 bg-slate-50/80 border-t border-slate-200/80 flex items-center justify-between text-xs flex-wrap gap-3">
                <div className="text-slate-500 font-medium">
                  Menampilkan {(currentPage - 1) * perPage + 1} s.d.{' '}
                  {Math.min(currentPage * perPage, classRecap.pagination.total_records)} dari{' '}
                  <span className="font-bold text-slate-800">{classRecap.pagination.total_records}</span>{' '}
                  santri
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={currentPage <= 1}
                    onClick={() => {
                      const prev = currentPage - 1;
                      setCurrentPage(prev);
                      fetchClassRecap(prev);
                    }}
                    className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 disabled:opacity-40 shadow-2xs transition"
                  >
                    <ChevronLeft className="w-4 h-4 text-slate-600" />
                  </button>

                  <span className="font-bold text-slate-700 px-2">
                    Halaman {currentPage} / {classRecap.pagination.total_pages}
                  </span>

                  <button
                    type="button"
                    disabled={currentPage >= classRecap.pagination.total_pages}
                    onClick={() => {
                      const next = currentPage + 1;
                      setCurrentPage(next);
                      fetchClassRecap(next);
                    }}
                    className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 disabled:opacity-40 shadow-2xs transition"
                  >
                    <ChevronRight className="w-4 h-4 text-slate-600" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: KARTU BAYAR INDIVIDUAL SANTRI */}
      {/* ========================================================================= */}
      {activeTab === 'individual' && (
        <div className="space-y-6">
          {/* Live Search and Year Select Bar */}
          <div className="bg-white rounded-xl p-6 border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              {/* Autocomplete Live Search Input */}
              <div className="relative flex-1 max-w-xl">
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Search className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Cari Santri (Live Search Nama / NIS / Rombel)</span>
                  </span>
                  {selectedStudentId && (
                    <span className="text-[10px] text-emerald-600 font-semibold">
                      ID #{selectedStudentId} Aktif
                    </span>
                  )}
                </label>
                <div className="relative">
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchStudentTerm}
                    onFocus={() => {
                      if (studentSearchResults.length > 0) setShowSearchDropdown(true);
                    }}
                    onChange={(e) => setSearchStudentTerm(e.target.value)}
                    placeholder="Ketik minimal 2 karakter nama santri..."
                    className="w-full px-4 py-3 pl-10 pr-10 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 shadow-2xs transition placeholder:text-slate-400"
                  />
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  {searchingStudents ? (
                    <Loader2 className="w-4 h-4 text-emerald-600 animate-spin absolute right-3.5 top-3.5" />
                  ) : searchStudentTerm ? (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchStudentTerm('');
                        setStudentSearchResults([]);
                        setShowSearchDropdown(false);
                      }}
                      className="absolute right-3.5 top-3.5 p-0.5 rounded-full hover:bg-slate-200 text-slate-400"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  ) : null}
                </div>

                {/* Autocomplete Dropdown Popup */}
                {showSearchDropdown && studentSearchResults.length > 0 && (
                  <div
                    ref={searchDropdownRef}
                    className="absolute left-0 right-0 top-full mt-2 bg-white rounded-xl shadow-xl border border-slate-200/90 z-50 divide-y divide-slate-100 max-h-72 overflow-y-auto overflow-x-hidden"
                  >
                    <div className="p-2.5 bg-slate-50/80 text-[11px] font-bold text-slate-500 flex items-center justify-between">
                      <span>Ditemukan {studentSearchResults.length} Santri Cocok</span>
                      <span className="text-[10px] text-slate-400">Klik untuk memilih</span>
                    </div>
                    {studentSearchResults.map((s) => (
                      <div
                        key={s.student_id}
                        onClick={() => {
                          setSelectedStudentId(s.student_id);
                          setSearchStudentTerm('');
                          setShowSearchDropdown(false);
                        }}
                        className="p-3 hover:bg-emerald-50/70 cursor-pointer flex items-center justify-between text-xs transition group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white font-bold flex items-center justify-center text-sm shadow-2xs group-hover:scale-105 transition">
                            {s.name?.charAt(0) || 'S'}
                          </div>
                          <div>
                            <div className="font-bold text-slate-800 group-hover:text-emerald-800 transition">
                              {s.name}
                            </div>
                            <div className="text-[10px] text-slate-400 mt-0.5 font-mono">
                              NIS: {s.nis || '-'} &bull; Kelas:{' '}
                              <span className="font-semibold text-slate-600">{s.class_name}</span>
                            </div>
                          </div>
                        </div>

                        <div className="text-right flex items-center gap-3">
                          <div>
                            <div
                              className={`text-[10px] font-bold ${
                                s.total_remaining > 0 ? 'text-rose-600' : 'text-emerald-600'
                              }`}
                            >
                              {s.total_remaining > 0 ? `Sisa: ${formatCurrency(s.total_remaining)}` : 'Lunas'}
                            </div>
                            <span className="text-[9px] text-slate-400">{s.bills_count} tagihan</span>
                          </div>
                          <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Toggle & Filter Tahun Ajaran Individual */}
              <div className="flex items-center gap-3 flex-wrap">
                <div className="space-y-1.5">
                  <span className="block text-xs font-bold text-slate-700">Rentang Siklus Transaksi:</span>
                  <div className="inline-flex p-1 bg-slate-100/80 rounded-xl border border-slate-200/60">
                    <button
                      type="button"
                      onClick={() => setIndividualAllYears(true)}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                        individualAllYears
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Semua Tahun Ajaran (Riwayat Penuh)
                    </button>
                    <button
                      type="button"
                      onClick={() => setIndividualAllYears(false)}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                        !individualAllYears
                          ? 'bg-white text-indigo-700 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Tahun Ajaran Tertentu
                    </button>
                  </div>
                </div>

                {!individualAllYears && (
                  <div className="w-52">
                    <SearchableSelect
                      label="Pilih Tahun Ajaran"
                      icon={Calendar}
                      options={academicYears}
                      value={individualAcademicYear}
                      onChange={(val) => setIndividualAcademicYear(val)}
                      placeholder="Pilih Tahun Ajaran..."
                      searchPlaceholder="Cari tahun ajaran..."
                      getOptionLabel={(opt) => opt.name}
                      getOptionValue={(opt) => opt.id}
                      getOptionBadge={(opt) =>
                        opt.is_active ? (
                          <StatusPill variant="success">Aktif</StatusPill>
                        ) : null
                      }
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {loadingLedger ? (
            <div className="py-24 bg-white rounded-xl border border-slate-200/80 flex flex-col items-center justify-center gap-3 shadow-xs">
              <Loader2 className="w-9 h-9 text-emerald-600 animate-spin" />
              <p className="text-xs font-bold text-slate-600">Memuat rincian kartu bayar santri...</p>
            </div>
          ) : !selectedStudentId ? (
            <div className="bg-white rounded-xl border border-slate-200/80 p-12 text-center space-y-4 shadow-xs">
              <div className="w-16 h-16 rounded-xl bg-gradient-to-tr from-emerald-100 to-teal-100 text-emerald-700 flex items-center justify-center mx-auto shadow-inner">
                <User className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h3 className="font-extrabold text-slate-800 text-base">Pilih Santri Terlebih Dahulu</h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                  Gunakan kotak pencarian di atas untuk mencari santri berdasarkan Nama atau NIS, atau klik
                  tombol <strong>"Kartu"</strong> pada tab Rekap Seluruh Siswa.
                </p>
              </div>
            </div>
          ) : (
            ledgerData && (
              <div className="space-y-6">
                {/* Profile Card & KPI */}
                <div className="bg-white rounded-xl p-6 sm:p-7 border border-slate-200/80 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                  <div className="flex items-center gap-4 sm:gap-5">
                    <div className="w-16 h-16 rounded-xl bg-gradient-to-tr from-emerald-600 via-teal-600 to-slate-800 text-white flex items-center justify-center font-black text-2xl shadow-md shadow-emerald-950/20">
                      {ledgerData.student?.name ? ledgerData.student.name.charAt(0) : 'S'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-lg sm:text-xl font-extrabold text-slate-800 tracking-tight">
                          {ledgerData.student?.name}
                        </h2>
                        <span
                          className={`px-3 py-0.5 rounded-full text-[10px] font-extrabold ${
                            ledgerData.summary?.settlement_status === 'Lunas'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : ledgerData.summary?.settlement_status === 'Sebagian'
                              ? 'bg-amber-100 text-amber-800 border border-amber-200'
                              : 'bg-rose-100 text-rose-800 border border-rose-200'
                          }`}
                        >
                          {ledgerData.summary?.settlement_status}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 mt-1.5 flex flex-wrap gap-x-4 gap-y-1">
                        <span>
                          NIS:{' '}
                          <span className="font-mono font-bold text-slate-700">
                            {ledgerData.student?.nis || '-'}
                          </span>
                        </span>
                        <span>
                          NISN:{' '}
                          <span className="font-mono font-bold text-slate-700">
                            {ledgerData.student?.nisn || '-'}
                          </span>
                        </span>
                        <span>
                          Kelas:{' '}
                          <span className="font-bold text-slate-700">
                            {ledgerData.student?.class_name || '-'}
                          </span>
                        </span>
                        <span>
                          Gender:{' '}
                          <span className="font-semibold text-slate-700">
                            {ledgerData.student?.gender === 'L' ? 'Laki-laki' : 'Perempuan'}
                          </span>
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-2.5 w-full lg:w-auto">
                    <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-100 text-center">
                      <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                        Tagihan TP Ini
                      </div>
                      <div className="text-sm sm:text-base font-black text-slate-800 mt-0.5">
                        {formatCurrency(ledgerData.summary?.total_billed)}
                      </div>
                    </div>
                    <div className="bg-emerald-50/70 rounded-xl p-3.5 border border-emerald-100 text-center">
                      <div className="text-[10px] text-emerald-700 font-bold uppercase tracking-wider">
                        Sudah Dibayar
                      </div>
                      <div className="text-sm sm:text-base font-black text-emerald-700 mt-0.5">
                        {formatCurrency(ledgerData.summary?.total_paid)}
                      </div>
                    </div>
                    <div
                      className={`rounded-xl p-3.5 border text-center ${
                        ledgerData.summary?.total_remaining > 0
                          ? 'bg-rose-50/80 border-rose-100 text-rose-700'
                          : 'bg-slate-50 border-slate-100 text-slate-700'
                      }`}
                    >
                      <div className="text-[10px] font-bold uppercase tracking-wider opacity-75">
                        Sisa TP Ini
                      </div>
                      <div className="text-sm sm:text-base font-black mt-0.5">
                        {formatCurrency(ledgerData.summary?.total_remaining)}
                      </div>
                    </div>
                    <div className="bg-amber-50/70 rounded-xl p-3.5 border border-amber-200 text-center">
                      <div className="text-[10px] text-amber-800 font-bold uppercase tracking-wider">
                        Sisa TP Lalu
                      </div>
                      <div className="text-sm sm:text-base font-black text-amber-800 mt-0.5">
                        {formatCurrency(ledgerData.previous_year_arrears?.total_remaining || 0)}
                      </div>
                    </div>
                    <div className="bg-slate-900 rounded-xl p-3.5 border border-slate-800 text-center text-white col-span-2 sm:col-span-1">
                      <div className="text-[10px] text-slate-300 font-bold uppercase tracking-wider">
                        Total Piutang
                      </div>
                      <div className="text-sm sm:text-base font-black text-rose-300 mt-0.5">
                        {formatCurrency(ledgerData.summary?.grand_total_remaining || ledgerData.summary?.total_remaining)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* ========================================================= */}
                {/* Banner Ringkas: Tunggakan Tahun Ajaran Sebelumnya (Carry-Over) */}
                {/* ========================================================= */}
                {!individualAllYears &&
                  ledgerData.previous_year_arrears &&
                  ledgerData.previous_year_arrears.total_remaining > 0 && (
                    <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent rounded-xl border border-amber-200/90 p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-2xs">
                      <div className="flex items-center gap-3.5">
                        <div className="w-10 h-10 rounded-xl bg-amber-100 border border-amber-300 text-amber-800 flex items-center justify-center shrink-0 shadow-2xs">
                          <History className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-extrabold text-slate-800 text-xs sm:text-sm">
                              Tunggakan Tahun Ajaran Sebelumnya (Carry-Over)
                            </h4>
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-200/80 text-amber-900 border border-amber-300">
                              {ledgerData.previous_year_arrears.count} Pos Tertunggak
                            </span>
                          </div>
                          <p className="text-[11px] text-amber-900/80 mt-0.5">
                            Santri memiliki sisa piutang dari tahun ajaran lampau. <strong>Lihat rincian lengkap di tabel Matriks Tagihan & Piutang Santri di bawah.</strong>
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 self-end sm:self-center shrink-0">
                        <div className="text-right">
                          <div className="text-[10px] uppercase font-extrabold text-amber-800 tracking-wider">
                            Sisa TP Lalu
                          </div>
                          <div className="text-base sm:text-lg font-black text-rose-700 font-mono">
                            {formatCurrency(ledgerData.previous_year_arrears.total_remaining)}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                {/* ========================================================= */}
                {/* PIVOT TABLE: Multi-Year Matrix by Fee Component */}
                {/* ========================================================= */}
                <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
                  <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 text-white flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-300">
                        <Layers className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="font-extrabold text-white text-xs sm:text-sm tracking-tight">
                          Matriks Tagihan & Piutang Santri (Pivot Multi-Tahun)
                        </h3>
                        <p className="text-[11px] text-emerald-200/70">
                          Rekapitulasi beban kewajiban, realisasi pembayaran, dan sisa piutang per pos biaya di seluruh tahun ajaran.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Expand / Collapse All Monthly Breakdown Button */}
                      {ledgerData.pivot_table?.rows?.some(
                        (r) => r.billing_pattern === 'monthly' && r.monthly_breakdown?.length > 0
                      ) && (
                        <button
                          type="button"
                          onClick={() => {
                            const monthlyRows = (ledgerData.pivot_table?.rows || []).filter(
                              (r) => r.billing_pattern === 'monthly' && r.monthly_breakdown?.length > 0
                            );
                            const isAnyExpanded = monthlyRows.some((r) => expandedMonthlyRows[r.fee_type_id]);
                            const newState = {};
                            monthlyRows.forEach((r) => {
                              newState[r.fee_type_id] = !isAnyExpanded;
                            });
                            setExpandedMonthlyRows(newState);
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-bold bg-white/10 hover:bg-white/20 text-emerald-200 border border-white/10 transition shadow-2xs cursor-pointer"
                        >
                          <Sliders className="w-3 h-3" />
                          <span>
                            {(ledgerData.pivot_table?.rows || [])
                              .filter((r) => r.billing_pattern === 'monthly')
                              .some((r) => expandedMonthlyRows[r.fee_type_id])
                              ? 'Lipat Semua Bulan'
                              : 'Buka Rincian Bulanan (12 Bln)'}
                          </span>
                        </button>
                      )}

                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold bg-white/10 text-emerald-200 border border-white/10 backdrop-blur-md">
                        <span>{ledgerData.pivot_table?.academic_years?.length || 1} Tahun Ajaran Terdata</span>
                      </span>
                    </div>
                  </div>

                  <div className="overflow-x-auto relative">
                    <table className="w-full text-left text-xs whitespace-nowrap border-collapse">
                      <thead>
                        {/* Header Row 1: Academic Year Groupings (colspan=3) */}
                        <tr className="bg-slate-900 text-white font-bold border-b border-slate-700 text-[11px] uppercase tracking-wider">
                          <th
                            rowSpan={2}
                            className="sticky left-0 z-30 bg-slate-900 px-3 py-3 text-center w-12 min-w-[48px] max-w-[48px] border-r border-slate-800 shadow-[1px_0_0_0_#334155]"
                          >
                            No
                          </th>
                          <th
                            rowSpan={2}
                            className="sticky left-12 z-30 bg-slate-900 px-4 py-3 min-w-[220px] max-w-[300px] border-r border-slate-700 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.4)]"
                          >
                            Komponen Biaya
                          </th>
                          {ledgerData.pivot_table?.academic_years?.map((ay) => (
                            <th
                              key={ay.id}
                              colSpan={3}
                              className="px-3 py-2.5 text-center font-black bg-slate-800 text-emerald-300 border-r border-slate-700 text-xs tracking-normal"
                            >
                              T.A. {ay.name}
                            </th>
                          ))}
                          <th
                            colSpan={3}
                            className="px-4 py-2.5 text-center font-black bg-emerald-950 text-emerald-300 text-xs tracking-normal border-l border-emerald-800"
                          >
                            Total Akumulasi
                          </th>
                        </tr>

                        {/* Header Row 2: Sub-columns (Tagihan, Dibayar, Sisa) */}
                        <tr className="bg-slate-800 text-slate-300 font-bold border-b border-slate-300 text-[10px] uppercase">
                          {ledgerData.pivot_table?.academic_years?.map((ay) => (
                            <React.Fragment key={ay.id}>
                              <th className="px-3 py-2 text-right bg-slate-800/90 text-slate-200 border-l border-slate-700/60">
                                Tagihan
                              </th>
                              <th className="px-3 py-2 text-right bg-slate-800/90 text-emerald-300">
                                Dibayar
                              </th>
                              <th className="px-3 py-2 text-right bg-slate-800/90 text-rose-300 border-r border-slate-700/60">
                                Sisa
                              </th>
                            </React.Fragment>
                          ))}
                          <th className="px-3 py-2 text-right bg-emerald-900 text-slate-100 border-l border-emerald-800">
                            Tagihan
                          </th>
                          <th className="px-3 py-2 text-right bg-emerald-900 text-emerald-300">
                            Dibayar
                          </th>
                          <th className="px-3 py-2 text-right bg-emerald-900 text-rose-300">
                            Sisa
                          </th>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-slate-100">
                        {!ledgerData.pivot_table?.rows || ledgerData.pivot_table.rows.length === 0 ? (
                          <tr>
                            <td colSpan={20} className="text-center py-12 text-slate-400">
                              Tidak ada data tagihan pivot untuk santri ini.
                            </td>
                          </tr>
                        ) : (
                          ledgerData.pivot_table.rows.map((row, idx) => {
                            const isMonthly = row.billing_pattern === 'monthly' && row.monthly_breakdown?.length > 0;
                            const isExpanded = isMonthly && Boolean(expandedMonthlyRows[row.fee_type_id]);

                            return (
                              <React.Fragment key={row.fee_type_id}>
                                <tr className={`hover:bg-slate-50/80 transition group ${isExpanded ? 'bg-emerald-50/20' : ''}`}>
                                  <td className="sticky left-0 z-20 bg-white group-hover:bg-slate-50 px-3 py-3 text-center text-slate-400 font-mono text-xs w-12 min-w-[48px] max-w-[48px] border-r border-slate-100 shadow-[1px_0_0_0_#f1f5f9]">
                                    {idx + 1}
                                  </td>
                                  <td className="sticky left-12 z-20 bg-white group-hover:bg-slate-50 px-4 py-3 min-w-[220px] max-w-[300px] border-r border-slate-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.06)]">
                                    <div className="font-bold text-slate-800 flex items-center justify-between gap-1.5 flex-wrap">
                                      <div className="flex items-center gap-1.5 flex-wrap">
                                        <span>{row.component_name}</span>
                                        {row.is_ppdb && (
                                          <span className="inline-flex items-center px-2 py-0.2 rounded-full text-[9px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
                                            PPDB
                                          </span>
                                        )}
                                        {row.billing_pattern === 'monthly' && (
                                          <button
                                            type="button"
                                            onClick={() =>
                                              setExpandedMonthlyRows((prev) => ({
                                                ...prev,
                                                [row.fee_type_id]: !prev[row.fee_type_id]
                                              }))
                                            }
                                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[9px] font-bold transition shadow-2xs cursor-pointer ${
                                              isExpanded
                                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                                : 'bg-cyan-50 hover:bg-cyan-100 text-cyan-800 border border-cyan-200'
                                            }`}
                                            title="Klik untuk membuka / melipat rincian 12 bulan"
                                          >
                                            <span>Bulanan</span>
                                            <span className="text-[8px] opacity-80 font-black">
                                              {isExpanded ? '▲ Tutup' : '▼ Rinci'}
                                            </span>
                                          </button>
                                        )}
                                        {row.billing_pattern === 'yearly' && (
                                          <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                                            Tahunan
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </td>

                                  {/* Per Academic Year Cells */}
                                  {ledgerData.pivot_table.academic_years.map((ay) => {
                                    const cell = row.by_year?.[ay.id] || { billed: 0, paid: 0, remaining: 0 };
                                    return (
                                      <React.Fragment key={ay.id}>
                                        <td className="px-3 py-3 text-right font-mono text-slate-700 border-l border-slate-100">
                                          {cell.billed > 0 ? formatRawNumber(cell.billed) : <span className="text-slate-300">-</span>}
                                        </td>
                                        <td className="px-3 py-3 text-right font-mono font-semibold text-emerald-600">
                                          {cell.paid > 0 ? formatRawNumber(cell.paid) : <span className="text-slate-300">-</span>}
                                        </td>
                                        <td className="px-3 py-3 text-right font-mono font-bold border-r border-slate-100">
                                          {cell.remaining > 0 ? (
                                            <span className="text-rose-600">{formatRawNumber(cell.remaining)}</span>
                                          ) : cell.billed > 0 ? (
                                            <span className="text-emerald-600 text-[10px] font-bold">✓ Lunas</span>
                                          ) : (
                                            <span className="text-slate-300">-</span>
                                          )}
                                        </td>
                                      </React.Fragment>
                                    );
                                  })}

                                  {/* Total Column Group (Rightmost) */}
                                  <td className="px-3 py-3 text-right font-mono font-bold text-slate-800 bg-slate-50/80 border-l border-slate-200">
                                    {row.total.billed > 0 ? formatRawNumber(row.total.billed) : <span className="text-slate-300">-</span>}
                                  </td>
                                  <td className="px-3 py-3 text-right font-mono font-bold text-emerald-700 bg-emerald-50/40">
                                    {row.total.paid > 0 ? formatRawNumber(row.total.paid) : <span className="text-slate-300">-</span>}
                                  </td>
                                  <td className="px-3 py-3 text-right font-mono font-black bg-rose-50/30">
                                    {row.total.remaining > 0 ? (
                                      <span className="text-rose-700 font-extrabold">{formatRawNumber(row.total.remaining)}</span>
                                    ) : row.total.billed > 0 ? (
                                      <span className="text-emerald-700 text-[10px] font-bold">✓ Lunas</span>
                                    ) : (
                                      <span className="text-slate-300">-</span>
                                    )}
                                  </td>
                                </tr>

                                {/* Monthly Sub-Rows (12 Months Breakdown) */}
                                {isExpanded &&
                                  row.monthly_breakdown.map((m) => (
                                    <tr
                                      key={`${row.fee_type_id}-m-${m.month}`}
                                      className="bg-slate-50/60 hover:bg-slate-100/80 transition group text-[11px]"
                                    >
                                      <td className="sticky left-0 z-20 bg-slate-50/95 group-hover:bg-slate-100/95 px-3 py-2 text-center text-slate-400 font-mono text-[10px] w-12 min-w-[48px] max-w-[48px] border-r border-slate-200/80 shadow-[1px_0_0_0_#f1f5f9]">
                                        ↳
                                      </td>
                                      <td className="sticky left-12 z-20 bg-slate-50/95 group-hover:bg-slate-100/95 px-4 py-2 min-w-[220px] max-w-[300px] border-r border-slate-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.06)]">
                                        <div className="flex items-center gap-2 pl-3">
                                          <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 shrink-0"></span>
                                          <span className="font-semibold text-slate-700">Bulan {m.month_name}</span>
                                        </div>
                                      </td>

                                      {/* Monthly per Academic Year */}
                                      {ledgerData.pivot_table.academic_years.map((ay) => {
                                        const cell = m.by_year?.[ay.id] || { billed: 0, paid: 0, remaining: 0 };
                                        return (
                                          <React.Fragment key={ay.id}>
                                            <td className="px-3 py-2 text-right font-mono text-slate-600 border-l border-slate-100">
                                              {cell.billed > 0 ? formatRawNumber(cell.billed) : <span className="text-slate-300">-</span>}
                                            </td>
                                            <td className="px-3 py-2 text-right font-mono font-semibold text-emerald-600">
                                              {cell.paid > 0 ? formatRawNumber(cell.paid) : <span className="text-slate-300">-</span>}
                                            </td>
                                            <td className="px-3 py-2 text-right font-mono font-bold border-r border-slate-100">
                                              {cell.remaining > 0 ? (
                                                <span className="text-rose-600">{formatRawNumber(cell.remaining)}</span>
                                              ) : cell.billed > 0 ? (
                                                <span className="text-emerald-600 text-[9px] font-bold">✓ Lunas</span>
                                              ) : (
                                                <span className="text-slate-300">-</span>
                                              )}
                                            </td>
                                          </React.Fragment>
                                        );
                                      })}

                                      {/* Monthly Total Akumulasi */}
                                      <td className="px-3 py-2 text-right font-mono font-bold text-slate-700 bg-slate-100/70 border-l border-slate-200">
                                        {m.total.billed > 0 ? formatRawNumber(m.total.billed) : <span className="text-slate-300">-</span>}
                                      </td>
                                      <td className="px-3 py-2 text-right font-mono font-bold text-emerald-700 bg-emerald-50/50">
                                        {m.total.paid > 0 ? formatRawNumber(m.total.paid) : <span className="text-slate-300">-</span>}
                                      </td>
                                      <td className="px-3 py-2 text-right font-mono font-black bg-rose-50/40">
                                        {m.total.remaining > 0 ? (
                                          <span className="text-rose-700 font-extrabold">{formatRawNumber(m.total.remaining)}</span>
                                        ) : m.total.billed > 0 ? (
                                          <span className="text-emerald-700 text-[9px] font-bold">✓ Lunas</span>
                                        ) : (
                                          <span className="text-slate-300">-</span>
                                        )}
                                      </td>
                                    </tr>
                                  ))}
                              </React.Fragment>
                            );
                          })
                        )}
                      </tbody>

                      {/* TOTAL Footer Row */}
                      {ledgerData.pivot_table?.grand_total && (
                        <tfoot className="bg-slate-100 font-black text-slate-900 border-t-2 border-slate-300 text-xs">
                          <tr>
                            <td
                              colSpan={2}
                              className="sticky left-0 z-20 bg-slate-100 px-4 py-4 text-right uppercase tracking-wider text-slate-900 border-r border-slate-300 font-extrabold shadow-[2px_0_5px_-2px_rgba(0,0,0,0.08)]"
                            >
                              TOTAL KESELURUHAN:
                            </td>
                            {ledgerData.pivot_table.academic_years.map((ay) => {
                              const gCell = ledgerData.pivot_table.grand_total.by_year?.[ay.id] || { billed: 0, paid: 0, remaining: 0 };
                              return (
                                <React.Fragment key={ay.id}>
                                  <td className="px-3 py-4 text-right font-mono font-black text-slate-900 border-l border-slate-200">
                                    {gCell.billed > 0 ? formatRawNumber(gCell.billed) : <span className="text-slate-400 font-normal">-</span>}
                                  </td>
                                  <td className="px-3 py-4 text-right font-mono font-black text-emerald-700">
                                    {gCell.paid > 0 ? formatRawNumber(gCell.paid) : <span className="text-slate-400 font-normal">-</span>}
                                  </td>
                                  <td className="px-3 py-4 text-right font-mono font-black border-r border-slate-200">
                                    {gCell.remaining > 0 ? (
                                      <span className="text-rose-700">{formatRawNumber(gCell.remaining)}</span>
                                    ) : (
                                      <span className="text-emerald-700 font-bold">0</span>
                                    )}
                                  </td>
                                </React.Fragment>
                              );
                            })}
                            <td className="px-3 py-4 text-right font-mono font-black text-slate-950 bg-slate-200/90 border-l border-slate-300 text-sm">
                              {formatRawNumber(ledgerData.pivot_table.grand_total.total.billed)}
                            </td>
                            <td className="px-3 py-4 text-right font-mono font-black text-emerald-800 bg-emerald-100/90 text-sm">
                              {formatRawNumber(ledgerData.pivot_table.grand_total.total.paid)}
                            </td>
                            <td className="px-3 py-4 text-right font-mono font-black text-rose-800 bg-rose-100/90 text-sm">
                              {formatRawNumber(ledgerData.pivot_table.grand_total.total.remaining)}
                            </td>
                          </tr>
                        </tfoot>
                      )}
                    </table>
                  </div>
                </div>

                {/* ========================================================= */}
                {/* Table Bills Detail & Receipts Breakdown (Collapsible) */}
                {/* ========================================================= */}
                {(() => {
                  const rawItems = ledgerData.items || [];
                  const filteredItems = rawItems.filter((it) => {
                    if (detailFeeTypeId && String(it.fee_type_id) !== String(detailFeeTypeId)) return false;
                    if (detailStatusFilter !== 'all' && it.status !== detailStatusFilter) return false;
                    if (detailSearchTerm.trim()) {
                      const q = detailSearchTerm.toLowerCase();
                      const matchName = String(it.fee_type_name || '').toLowerCase().includes(q);
                      const matchPeriod = String(it.period_label || '').toLowerCase().includes(q);
                      const matchAy = String(it.academic_year_name || '').toLowerCase().includes(q);
                      const matchReceipt = (it.payments || []).some((p) =>
                        String(p.receipt_number || '').toLowerCase().includes(q)
                      );
                      if (!matchName && !matchPeriod && !matchAy && !matchReceipt) return false;
                    }
                    return true;
                  });

                  const filteredTotalBilled = filteredItems.reduce(
                    (acc, it) => acc + (parseFloat(it.amount || 0) - parseFloat(it.discount_amount || 0)),
                    0
                  );
                  const filteredTotalDiscount = filteredItems.reduce(
                    (acc, it) => acc + parseFloat(it.discount_amount || 0),
                    0
                  );
                  const filteredTotalPaid = filteredItems.reduce(
                    (acc, it) => acc + parseFloat(it.paid_amount || 0),
                    0
                  );
                  const filteredTotalRemaining = filteredItems.reduce(
                    (acc, it) => acc + parseFloat(it.remaining_amount || 0),
                    0
                  );

                  return (
                    <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden space-y-0">
                      <div className="px-6 py-4 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between flex-wrap gap-3">
                        <div className="font-bold text-slate-800 text-xs flex items-center gap-2">
                          <Receipt className="w-4 h-4 text-emerald-600" />
                          <span>
                            Daftar Detail Transaksi & Kwitansi Pembayaran ({filteredItems.length} Baris Tagihan)
                          </span>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[11px] px-2.5 py-0.5 rounded-full font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            {individualAllYears
                              ? 'Riwayat Sepanjang Masa (Termasuk PPDB)'
                              : `Tahun Ajaran: ${academicYears.find((y) => String(y.id) === String(individualAcademicYear))?.name || 'Aktif'}`}
                          </span>
                        </div>
                      </div>

                      {/* Filter Bar for Detail Transactions */}
                      <div className="p-4 bg-slate-50/40 border-b border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 flex-1 flex-wrap">
                          {/* Search Term Input */}
                          <div className="relative min-w-[200px] flex-1 max-w-xs">
                            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                            <input
                              type="text"
                              value={detailSearchTerm}
                              onChange={(e) => setDetailSearchTerm(e.target.value)}
                              placeholder="Cari pos biaya / no kwitansi..."
                              className="w-full pl-8 pr-7 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20"
                            />
                            {detailSearchTerm && (
                              <button
                                type="button"
                                onClick={() => setDetailSearchTerm('')}
                                className="absolute right-2 top-2 text-slate-400 hover:text-slate-600"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            )}
                          </div>

                          {/* Fee Type Filter */}
                          <select
                            value={detailFeeTypeId}
                            onChange={(e) => setDetailFeeTypeId(e.target.value)}
                            className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20"
                          >
                            <option value="">Semua Pos Biaya</option>
                            {feeTypes.map((ft) => (
                              <option key={ft.id} value={ft.id}>
                                {ft.name}
                              </option>
                            ))}
                          </select>

                          {/* Status Filter */}
                          <select
                            value={detailStatusFilter}
                            onChange={(e) => setDetailStatusFilter(e.target.value)}
                            className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20"
                          >
                            <option value="all">Semua Status</option>
                            <option value="paid">Lunas</option>
                            <option value="partially_paid">Sebagian</option>
                            <option value="unpaid">Belum Lunas</option>
                          </select>
                        </div>

                        {/* Reset Filter Button */}
                        {(detailSearchTerm || detailFeeTypeId || detailStatusFilter !== 'all') && (
                          <button
                            type="button"
                            onClick={() => {
                              setDetailSearchTerm('');
                              setDetailFeeTypeId('');
                              setDetailStatusFilter('all');
                            }}
                            className="text-[11px] font-bold text-rose-600 hover:text-rose-800 self-end sm:self-center"
                          >
                            Reset Filter Detail
                          </button>
                        )}
                      </div>

                      <div className="table-container">
                        <table className="w-full text-left text-xs whitespace-nowrap">
                          <thead className="bg-slate-50/60 text-slate-600 font-bold border-b border-slate-200 text-[11px] uppercase tracking-wider">
                            <tr>
                              <th className="px-5 py-3.5">Pos Biaya & Periode</th>
                              <th className="px-5 py-3.5">Jatuh Tempo</th>
                              <th className="px-5 py-3.5 text-right">Nominal Tagihan</th>
                              <th className="px-5 py-3.5 text-right">Diskon</th>
                              <th className="px-5 py-3.5 text-right">Sudah Dibayar</th>
                              <th className="px-5 py-3.5 text-right">Sisa Piutang</th>
                              <th className="px-5 py-3.5 text-center">Status</th>
                              <th className="px-5 py-3.5">Histori Kwitansi</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {filteredItems.length === 0 ? (
                              <tr>
                                <td colSpan="8" className="text-center py-12 text-slate-400">
                                  <Receipt className="w-8 h-8 text-slate-300 mx-auto mb-2 opacity-60" />
                                  <p className="text-xs font-semibold text-slate-600">
                                    Tidak ada data transaksi yang sesuai filter
                                  </p>
                                  <p className="text-[11px] text-slate-400 mt-0.5">
                                    {!individualAllYears
                                      ? 'Siswa ini mungkin memiliki transaksi di tahun ajaran lain.'
                                      : 'Coba sesuaikan kata kunci pencarian atau filter di atas.'}
                                  </p>
                                  {!individualAllYears && (
                                    <button
                                      type="button"
                                      onClick={() => setIndividualAllYears(true)}
                                      className="mt-3 px-3.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold transition shadow-2xs cursor-pointer"
                                    >
                                      Tampilkan Semua Tahun Ajaran (Riwayat Penuh)
                                    </button>
                                  )}
                                </td>
                              </tr>
                            ) : (
                              filteredItems.map((it) => (
                                <tr key={it.bill_id} className="hover:bg-slate-50/70 transition">
                                  <td className="px-5 py-4">
                                    <div className="font-bold text-slate-800 flex items-center gap-1.5 flex-wrap">
                                      <span>{it.fee_type_name}</span>
                                      {it.academic_year_name && (
                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                                          T.A. {it.academic_year_name}
                                        </span>
                                      )}
                                      {it.is_ppdb && (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
                                          <UserCheck className="w-2.5 h-2.5 text-purple-600" />
                                          PPDB
                                        </span>
                                      )}
                                      {it.version > 1 && (
                                        <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-extrabold bg-indigo-100 text-indigo-700">
                                          v{it.version}
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-[11px] text-slate-400 mt-0.5">
                                      Periode: {it.period_label}
                                    </div>
                                  </td>
                                  <td className="px-5 py-4 text-slate-500 font-medium">{it.due_date || '-'}</td>
                                  <td className="px-5 py-4 text-right font-bold text-slate-800 font-mono">
                                    {formatCurrency(it.amount)}
                                  </td>
                                  <td className="px-5 py-4 text-right text-slate-400 font-mono">
                                    {it.discount_amount > 0 ? formatCurrency(it.discount_amount) : '-'}
                                  </td>
                                  <td className="px-5 py-4 text-right font-black text-emerald-600 font-mono">
                                    {formatCurrency(it.paid_amount)}
                                  </td>
                                  <td className="px-5 py-4 text-right font-black font-mono">
                                    <span className={it.remaining_amount > 0 ? 'text-rose-600' : 'text-emerald-600'}>
                                      {formatCurrency(it.remaining_amount)}
                                    </span>
                                  </td>
                                  <td className="px-5 py-4 text-center">
                                    <span
                                      className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                        it.status === 'paid'
                                          ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                                          : it.status === 'partially_paid'
                                          ? 'bg-amber-100 text-amber-700 border border-amber-200'
                                          : 'bg-rose-100 text-rose-700 border border-rose-200'
                                      }`}
                                    >
                                      {it.status === 'paid'
                                        ? 'Lunas'
                                        : it.status === 'partially_paid'
                                        ? 'Sebagian'
                                        : 'Belum Lunas'}
                                    </span>
                                  </td>
                                  <td className="px-5 py-4">
                                    {it.payments && it.payments.length > 0 ? (
                                      <div className="space-y-1">
                                        {it.payments.map((p) => (
                                          <div
                                            key={p.payment_id}
                                            className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1 rounded-lg flex items-center justify-between gap-3 font-mono transition"
                                          >
                                            <span className="font-semibold">{p.receipt_number || 'KWT-LOKAL'}</span>
                                            <span className="font-bold text-emerald-700">
                                              {formatCurrency(p.amount)}
                                            </span>
                                          </div>
                                        ))}
                                      </div>
                                    ) : (
                                      <span className="text-[11px] text-slate-400 italic">
                                        Belum ada pembayaran
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                          {filteredItems.length > 0 && (
                            <tfoot className="bg-slate-50 font-extrabold text-slate-800 border-t border-slate-200">
                              <tr>
                                <td colSpan="2" className="px-5 py-4 text-right uppercase tracking-wider text-xs">
                                  TOTAL RINGKASAN:
                                </td>
                                <td className="px-5 py-4 text-right font-black font-mono text-sm">
                                  {formatCurrency(filteredTotalBilled)}
                                </td>
                                <td className="px-5 py-4 text-right text-blue-600 font-bold font-mono">
                                  {formatCurrency(filteredTotalDiscount)}
                                </td>
                                <td className="px-5 py-4 text-right text-emerald-600 font-black font-mono text-sm">
                                  {formatCurrency(filteredTotalPaid)}
                                </td>
                                <td className="px-5 py-4 text-right text-rose-600 font-black font-mono text-sm">
                                  {formatCurrency(filteredTotalRemaining)}
                                </td>
                                <td colSpan="2"></td>
                              </tr>
                            </tfoot>
                          )}
                        </table>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: KINERJA PENERIMAAN & ANALYTICS (COLLECTION PERFORMANCE) */}
      {/* ========================================================================= */}
      {activeTab === 'performance' && (
        <div className="space-y-6">
          {/* Live Search & Filter Control Bar */}
          <div className="bg-white rounded-xl p-5 sm:p-6 border border-slate-200/80 shadow-xs space-y-5">
            {/* Top Filter Row: Cycle Switcher */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-emerald-600" />
                  <span>Siklus Periode Analytics:</span>
                </span>
                <div className="inline-flex p-1 bg-slate-100/90 rounded-xl border border-slate-200/60">
                  <button
                    type="button"
                    onClick={() => setRecapAllYears(false)}
                    className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      !recapAllYears ? 'bg-white text-emerald-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Tahun Ajaran Tertentu
                  </button>
                  <button
                    type="button"
                    onClick={() => setRecapAllYears(true)}
                    className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      recapAllYears
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Semua Tahun Ajaran (Riwayat Penuh)
                  </button>
                </div>
              </div>

              <div className="text-xs text-slate-400 font-medium flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-600 animate-pulse" />
                <span>Metrik dihitung otomatis dari data transaksi riil</span>
              </div>
            </div>

            {/* Bottom Filter Row: 5 Filter Comboboxes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3.5">
              {/* 1. Tahun Ajaran */}
              {!recapAllYears ? (
                <SearchableSelect
                  label="Tahun Ajaran"
                  icon={Calendar}
                  options={academicYearOptions}
                  value={recapAcademicYear}
                  onChange={(val) => setRecapAcademicYear(val)}
                  placeholder="Pilih Tahun Ajaran..."
                  searchPlaceholder="Cari tahun ajaran..."
                  getOptionLabel={(opt) => opt.name}
                  getOptionValue={(opt) => opt.id}
                  getOptionBadge={(opt) =>
                    opt.is_active ? (
                      <StatusPill variant="success">Aktif</StatusPill>
                    ) : null
                  }
                />
              ) : (
                <div className="space-y-1.5 opacity-60">
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-purple-600" />
                    <span>Tahun Ajaran</span>
                  </label>
                  <div className="w-full px-3.5 py-2.5 rounded-xl border border-purple-200 bg-purple-50/50 text-xs font-bold text-purple-800 truncate">
                    Semua Tahun (Riwayat Penuh)
                  </div>
                </div>
              )}

              {/* 2. Angkatan */}
              <SearchableSelect
                label="Angkatan (Cohort)"
                icon={GraduationCap}
                options={cohortOptions}
                value={selectedCohortId}
                onChange={(val) => setSelectedCohortId(val)}
                placeholder="Semua Angkatan"
                searchPlaceholder="Cari angkatan..."
                getOptionLabel={(opt) => opt.name}
                getOptionValue={(opt) => opt.id}
              />

              {/* 3. Tingkat */}
              <SearchableSelect
                label="Tingkat (Grade Level)"
                icon={Layers}
                options={gradeLevelOptions}
                value={selectedGradeLevelId}
                onChange={(val) => setSelectedGradeLevelId(val)}
                placeholder="Semua Tingkat"
                searchPlaceholder="Cari tingkat..."
                getOptionLabel={(opt) => opt.name}
                getOptionValue={(opt) => opt.id}
              />

              {/* 4. Rombel */}
              <SearchableSelect
                label="Rombel (Kelas)"
                icon={Users}
                options={classOptions}
                value={selectedClassId}
                onChange={(val) => setSelectedClassId(val)}
                placeholder="Semua Rombel"
                searchPlaceholder="Cari rombel..."
                getOptionLabel={(opt) => opt.name}
                getOptionValue={(opt) => opt.id}
              />

              {/* 5. Jenis Biaya */}
              <SearchableSelect
                label="Jenis Pos Tagihan"
                icon={Tag}
                options={feeTypeOptions}
                value={selectedFeeTypeId}
                onChange={(val) => setSelectedFeeTypeId(val)}
                placeholder="Semua Jenis Pos"
                searchPlaceholder="Cari pos tagihan..."
                getOptionLabel={(opt) => opt.name}
                getOptionValue={(opt) => opt.id}
              />
            </div>
          </div>

          {loadingPerformance ? (
            <div className="py-24 bg-white rounded-xl border border-slate-200/80 flex flex-col items-center justify-center gap-3 shadow-xs">
              <Loader2 className="w-9 h-9 text-emerald-600 animate-spin" />
              <p className="text-xs font-bold text-slate-600">Menghitung analitik kinerja penerimaan...</p>
            </div>
          ) : !performanceData ? (
            <div className="py-16 bg-white rounded-xl border border-slate-200/80 text-center space-y-3">
              <AlertCircle className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="text-xs font-bold text-slate-500">Tidak ada data transaksi untuk filter yang dipilih</p>
            </div>
          ) : (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* ========================================================================= */}
              {/* 1. EXECUTIVE KPI SUMMARY ROW (5 CARDS) */}
              {/* ========================================================================= */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                {/* KPI 1: Overall Collection Rate */}
                <div className="bg-gradient-to-br from-emerald-950 via-slate-900 to-teal-950 text-white rounded-xl p-5 border border-emerald-800/40 shadow-sm relative overflow-hidden flex flex-col justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-300">
                        Collection Rate
                      </span>
                      <Percent className="w-4 h-4 text-emerald-400 opacity-80" />
                    </div>
                    <div className="text-3xl font-black tracking-tight text-white mt-1">
                      {performanceData.summary?.overall_collection_rate || 0}%
                    </div>
                  </div>
                  <div className="mt-4 pt-3 border-t border-white/10 space-y-1.5">
                    <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-emerald-400 to-teal-300 h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, performanceData.summary?.overall_collection_rate || 0)}%` }}
                      />
                    </div>
                    <div className="text-[10px] text-emerald-200/80 flex items-center justify-between">
                      <span>Realisasi: {formatCurrency(performanceData.summary?.total_paid)}</span>
                    </div>
                  </div>
                </div>

                {/* KPI 2: Days to Settle / Average DSO */}
                <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-2xs flex flex-col justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                        Rata-Rata Pelunasan (DSO)
                      </span>
                      <Clock className="w-4 h-4 text-indigo-500" />
                    </div>
                    <div className="text-3xl font-black tracking-tight text-slate-800 mt-1">
                      {performanceData.summary?.avg_dso_days || 0}{' '}
                      <span className="text-sm font-semibold text-slate-400">Hari</span>
                    </div>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        (performanceData.summary?.avg_dso_days || 0) <= 30
                          ? 'bg-emerald-100 text-emerald-800'
                          : (performanceData.summary?.avg_dso_days || 0) <= 60
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {(performanceData.summary?.avg_dso_days || 0) <= 30
                        ? 'Sangat Cepat (≤30 hr)'
                        : (performanceData.summary?.avg_dso_days || 0) <= 60
                        ? 'Moderat (31-60 hr)'
                        : 'Lambat (>60 hr)'}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {performanceData.settlement_speed?.total_settled_transactions || 0} Trx
                    </span>
                  </div>
                </div>

                {/* KPI 3: On-Time Payment Rate */}
                <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-2xs flex flex-col justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                        Ketepatan Waktu Bayar
                      </span>
                      <CheckCircle2 className="w-4 h-4 text-teal-600" />
                    </div>
                    <div className="text-3xl font-black tracking-tight text-slate-800 mt-1">
                      {performanceData.summary?.on_time_payment_rate || 0}%
                    </div>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[10px]">
                    <span className="text-teal-700 font-bold">
                      {performanceData.punctuality?.on_time_transactions_count || 0} Tepat
                    </span>
                    <span className="text-slate-300">/</span>
                    <span className="text-rose-600 font-bold">
                      {performanceData.punctuality?.late_transactions_count || 0} Terlambat
                    </span>
                  </div>
                </div>

                {/* KPI 4: Total Tagihan Bersih (Target Billed) */}
                <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-2xs flex flex-col justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                        Total Tagihan Bersih
                      </span>
                      <Target className="w-4 h-4 text-blue-600" />
                    </div>
                    <div className="text-xl sm:text-2xl font-black tracking-tight text-slate-800 mt-1 font-mono">
                      {formatCurrency(performanceData.summary?.total_billed)}
                    </div>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-100 text-[10px] text-slate-500 flex items-center justify-between">
                    <span>Diskon: {formatCurrency(performanceData.summary?.total_discount)}</span>
                    <span className="font-semibold text-slate-700">{performanceData.summary?.total_students} Siswa</span>
                  </div>
                </div>

                {/* KPI 5: Total Sisa Piutang */}
                <div className="bg-white rounded-xl p-5 border border-rose-200/80 shadow-2xs flex flex-col justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-rose-600">
                        Total Sisa Piutang
                      </span>
                      <AlertTriangle className="w-4 h-4 text-rose-600" />
                    </div>
                    <div className="text-xl sm:text-2xl font-black tracking-tight text-rose-700 mt-1 font-mono">
                      {formatCurrency(performanceData.summary?.total_remaining)}
                    </div>
                  </div>
                  <div className="mt-4 pt-3 border-t border-rose-100 text-[10px] text-rose-600/80 flex items-center justify-between font-semibold">
                    <span>
                      {performanceData.summary?.total_remaining === 0
                        ? '✓ Piutang Bersih'
                        : `${Math.round(
                            (100 - (performanceData.summary?.overall_collection_rate || 0)) * 10
                          ) / 10}% Belum Tertagih`}
                    </span>
                  </div>
                </div>
              </div>

              {/* ========================================================================= */}
              {/* 2. BREAKDOWN GROUP PERFORMANCE (ROMBEL / ANGKATAN / TINGKAT) */}
              {/* ========================================================================= */}
              <div className="bg-white rounded-xl p-6 border border-slate-200/80 shadow-xs space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center font-black">
                      <BarChart3 className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-slate-800 text-sm">
                        Kinerja Kolektibilitas per Kelompok Santri
                      </h3>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Peringkat efektivitas penagihan berdasarkan Rombel, Angkatan, atau Tingkat.
                      </p>
                    </div>
                  </div>

                  {/* Segmented Selector */}
                  <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200/60">
                    {[
                      { key: 'class', label: 'Per Rombel (Kelas)', icon: Users },
                      { key: 'cohort', label: 'Per Angkatan (Cohort)', icon: GraduationCap },
                      { key: 'grade_level', label: 'Per Tingkat', icon: Layers }
                    ].map((tab) => {
                      const Icon = tab.icon;
                      const isActive = activeBreakdownGroup === tab.key;
                      return (
                        <button
                          key={tab.key}
                          type="button"
                          onClick={() => setActiveBreakdownGroup(tab.key)}
                          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                            isActive
                              ? 'bg-white text-emerald-900 shadow-xs scale-102'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          <Icon className="w-3.5 h-3.5" />
                          <span>{tab.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Breakdown List Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {(
                    (activeBreakdownGroup === 'class'
                      ? performanceData.breakdown_by_group?.by_class
                      : activeBreakdownGroup === 'cohort'
                      ? performanceData.breakdown_by_group?.by_cohort
                      : performanceData.breakdown_by_group?.by_grade_level) || []
                  ).map((item) => (
                    <div
                      key={item.id}
                      className="p-4 rounded-xl bg-slate-50/70 border border-slate-200/80 hover:bg-slate-50 transition space-y-3 shadow-2xs"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="font-extrabold text-slate-800 text-xs truncate">{item.name}</div>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                            item.collection_rate >= 80
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : item.collection_rate >= 50
                              ? 'bg-amber-100 text-amber-800 border border-amber-200'
                              : 'bg-rose-100 text-rose-800 border border-rose-200'
                          }`}
                        >
                          {item.collection_rate}%
                        </span>
                      </div>

                      {/* Progress Bar */}
                      <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            item.collection_rate >= 80
                              ? 'bg-emerald-500'
                              : item.collection_rate >= 50
                              ? 'bg-amber-500'
                              : 'bg-rose-500'
                          }`}
                          style={{ width: `${Math.min(100, item.collection_rate)}%` }}
                        />
                      </div>

                      <div className="grid grid-cols-3 gap-1 pt-1 text-[10px] border-t border-slate-200/60 font-mono">
                        <div>
                          <span className="block text-slate-400 text-[9px] font-sans">Target</span>
                          <span className="font-bold text-slate-700">{formatRawNumber(item.target_billed)}</span>
                        </div>
                        <div>
                          <span className="block text-emerald-600 text-[9px] font-sans">Terbayar</span>
                          <span className="font-bold text-emerald-700">{formatRawNumber(item.actual_collected)}</span>
                        </div>
                        <div>
                          <span className="block text-rose-600 text-[9px] font-sans">Sisa</span>
                          <span className="font-bold text-rose-700">{formatRawNumber(item.total_remaining)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* ========================================================================= */}
              {/* 3. CHANNELS, CASH ACCOUNTS & DSO SPEED DISTRIBUTION */}
              {/* ========================================================================= */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* 3a. Distribusi Metode Pembayaran */}
                <div className="bg-white rounded-xl p-6 border border-slate-200/80 shadow-xs space-y-5">
                  <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                    <CreditCard className="w-4 h-4 text-emerald-600" />
                    <h3 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider">
                      Metode Pembayaran
                    </h3>
                  </div>

                  <div className="space-y-3.5">
                    {(performanceData.channels_and_accounts?.payment_methods || []).map((m) => (
                      <div key={m.method} className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-slate-700">{m.label}</span>
                          <span className="font-mono font-extrabold text-slate-900">{m.percentage}%</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-emerald-500 h-full rounded-full"
                            style={{ width: `${m.percentage}%` }}
                          />
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                          <span>{m.count} transaksi</span>
                          <span>{formatCurrency(m.total_amount)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 3b. Distribusi Akun Kas / Rekening Tujuan */}
                <div className="bg-white rounded-xl p-6 border border-slate-200/80 shadow-xs space-y-5">
                  <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                    <Landmark className="w-4 h-4 text-indigo-600" />
                    <h3 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider">
                      Rekening Kas Penerimaan
                    </h3>
                  </div>

                  <div className="space-y-3.5">
                    {(performanceData.channels_and_accounts?.cash_accounts || []).map((a) => (
                      <div key={a.id} className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-slate-700 truncate max-w-[180px]">{a.name}</span>
                          <span className="font-mono font-extrabold text-indigo-700">{a.percentage}%</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-indigo-500 h-full rounded-full"
                            style={{ width: `${a.percentage}%` }}
                          />
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                          <span>{a.count} transaksi</span>
                          <span>{formatCurrency(a.total_amount)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 3c. Kecepatan Pelunasan (DSO Distribution) */}
                <div className="bg-white rounded-xl p-6 border border-slate-200/80 shadow-xs space-y-5">
                  <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                    <Zap className="w-4 h-4 text-amber-600" />
                    <h3 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider">
                      Distribusi Kecepatan Bayar
                    </h3>
                  </div>

                  <div className="space-y-3">
                    {[
                      {
                        label: 'Hari yang Sama (0 hari)',
                        count: performanceData.settlement_speed?.dso_buckets?.same_day || 0,
                        color: 'bg-emerald-500'
                      },
                      {
                        label: '1 s.d. 7 Hari',
                        count: performanceData.settlement_speed?.dso_buckets?.within_7_days || 0,
                        color: 'bg-teal-500'
                      },
                      {
                        label: '8 s.d. 30 Hari',
                        count: performanceData.settlement_speed?.dso_buckets?.within_30_days || 0,
                        color: 'bg-blue-500'
                      },
                      {
                        label: '31 s.d. 60 Hari',
                        count: performanceData.settlement_speed?.dso_buckets?.within_60_days || 0,
                        color: 'bg-amber-500'
                      },
                      {
                        label: '> 60 Hari',
                        count: performanceData.settlement_speed?.dso_buckets?.over_60_days || 0,
                        color: 'bg-rose-500'
                      }
                    ].map((b) => {
                      const totalTrx = performanceData.settlement_speed?.total_settled_transactions || 1;
                      const pct = Math.round((b.count / totalTrx) * 1000) / 10;
                      return (
                        <div key={b.label} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-600 font-semibold">{b.label}</span>
                            <span className="font-mono font-bold text-slate-800">
                              {b.count} trx <span className="text-slate-400 font-normal">({pct}%)</span>
                            </span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                            <div className={`${b.color} h-full rounded-full`} style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* ========================================================================= */}
              {/* 4. TABEL TREN BULANAN & YEAR-OVER-YEAR (YOY) */}
              {/* ========================================================================= */}
              <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center justify-center font-black">
                      <TrendingUp className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-slate-800 text-sm">
                        Tren Penagihan 12 Bulan & Perbandingan Year-Over-Year (YoY)
                      </h3>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Rincian target penerimaan vs realisasi kas masuk per bulan dan komparasi periode lampau.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="table-container">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50/80 text-[11px] font-extrabold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                        <th className="px-5 py-3.5">Bulan</th>
                        <th className="px-5 py-3.5 text-right">Target Tagihan</th>
                        <th className="px-5 py-3.5 text-right">Realisasi Terbayar</th>
                        <th className="px-5 py-3.5 text-center min-w-[160px]">Collection Rate</th>
                        <th className="px-5 py-3.5 text-right">Realisasi TP Lalu</th>
                        <th className="px-5 py-3.5 text-center">Pertumbuhan (YoY)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(performanceData.monthly_trend_yoy || []).map((m) => (
                        <tr key={m.month_index} className="hover:bg-slate-50/60 transition">
                          <td className="px-5 py-3.5 font-bold text-slate-800">
                            {m.month_name}
                          </td>
                          <td className="px-5 py-3.5 text-right font-mono font-semibold text-slate-700">
                            {formatRawNumber(m.target_billed)}
                          </td>
                          <td className="px-5 py-3.5 text-right font-mono font-bold text-emerald-700">
                            {formatRawNumber(m.actual_collected)}
                          </td>
                          <td className="px-5 py-3.5 text-center">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${
                                    m.collection_rate >= 80
                                      ? 'bg-emerald-500'
                                      : m.collection_rate >= 50
                                      ? 'bg-amber-500'
                                      : 'bg-rose-500'
                                  }`}
                                  style={{ width: `${Math.min(100, m.collection_rate)}%` }}
                                />
                              </div>
                              <span
                                className={`text-[10px] font-black font-mono px-2 py-0.5 rounded-md ${
                                  m.collection_rate >= 80
                                    ? 'bg-emerald-50 text-emerald-800'
                                    : m.collection_rate >= 50
                                    ? 'bg-amber-50 text-amber-800'
                                    : 'bg-slate-100 text-slate-600'
                                }`}
                              >
                                {m.collection_rate}%
                              </span>
                            </div>
                          </td>
                          <td className="px-5 py-3.5 text-right font-mono text-slate-500">
                            {m.actual_collected_previous > 0 ? (
                              <span className="font-semibold text-slate-700">
                                {formatRawNumber(m.actual_collected_previous)}
                              </span>
                            ) : m.target_billed_previous > 0 ? (
                              <span className="text-slate-400">0</span>
                            ) : (
                              <span className="text-slate-300 text-[10px] italic" title="Data tahun lalu belum tersedia">
                                Belum tersedia
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-3.5 text-center">
                            {m.yoy_growth_rate !== null ? (
                              <span
                                className={`inline-flex items-center gap-0.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                                  m.yoy_growth_rate >= 0
                                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                    : 'bg-rose-100 text-rose-800 border border-rose-200'
                                }`}
                              >
                                {m.yoy_growth_rate >= 0 ? '+' : ''}
                                {m.yoy_growth_rate}%
                              </span>
                            ) : (
                              <span className="text-slate-300 text-[10px] italic" title="Data pembanding belum tersedia">
                                -
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
