import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../shared/store/AuthContext';
import api from '../../../shared/services/api';
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
  BookOpen
} from 'lucide-react';

/**
 * Custom Searchable Dropdown / Combobox Component
 */
function SearchableSelect({
  label,
  icon: Icon,
  options = [],
  value,
  onChange,
  placeholder = 'Pilih...',
  searchPlaceholder = 'Cari opsi...',
  disabled = false,
  badgeText = null,
  getOptionLabel = (opt) => opt?.name || opt?.label || '',
  getOptionValue = (opt) => opt?.id ?? opt?.value ?? '',
  getOptionSubtext = (opt) => null,
  getOptionBadge = (opt) => null,
  className = ''
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef(null);
  const searchInputRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus search input on open
  useEffect(() => {
    if (isOpen) {
      setSearchTerm('');
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  const selectedOption = options.find((opt) => String(getOptionValue(opt)) === String(value));

  const filteredOptions = options.filter((opt) => {
    if (!searchTerm.trim()) return true;
    const labelStr = String(getOptionLabel(opt) || '').toLowerCase();
    const subStr = String(getOptionSubtext(opt) || '').toLowerCase();
    const q = searchTerm.toLowerCase();
    return labelStr.includes(q) || subStr.includes(q);
  });

  return (
    <div ref={containerRef} className={`relative space-y-1.5 ${className}`}>
      {label && (
        <div className="flex items-center justify-between">
          <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
            {Icon && <Icon className="w-3.5 h-3.5 text-emerald-600" />}
            <span>{label}</span>
          </label>
          {badgeText && (
            <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.2 rounded-full">
              {badgeText}
            </span>
          )}
        </div>
      )}

      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-2xl border text-xs font-semibold transition-all duration-150 text-left ${
          isOpen
            ? 'bg-white border-emerald-500 ring-2 ring-emerald-500/20 shadow-xs'
            : 'bg-slate-50/80 hover:bg-white border-slate-200/90 shadow-2xs'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {Icon && <Icon className="w-4 h-4 text-slate-400 shrink-0" />}
          <div className="truncate flex items-center gap-1.5 flex-1">
            {selectedOption ? (
              <>
                <span className="font-bold text-slate-800 truncate">{getOptionLabel(selectedOption)}</span>
                {getOptionBadge && getOptionBadge(selectedOption)}
              </>
            ) : (
              <span className="text-slate-400 font-normal">{placeholder}</span>
            )}
          </div>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-emerald-600' : ''
          }`}
        />
      </button>

      {/* Popover Dropdown Panel */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1.5 bg-white rounded-2xl shadow-xl border border-slate-200/90 z-50 overflow-hidden flex flex-col max-h-72 animate-in fade-in zoom-in-95 duration-100">
          {/* Live Search Input inside Dropdown */}
          <div className="p-2.5 border-b border-slate-100 bg-slate-50/70">
            <div className="relative">
              <input
                ref={searchInputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full text-xs font-semibold py-2 pl-8 pr-7 bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition placeholder:text-slate-400"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2 top-2 p-0.5 text-slate-400 hover:text-slate-700"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Options List */}
          <div className="overflow-y-auto divide-y divide-slate-50 p-1">
            {filteredOptions.length === 0 ? (
              <div className="p-4 text-center text-slate-400 text-xs font-medium">
                Tidak ada opsi yang cocok dengan "{searchTerm}"
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const optVal = getOptionValue(opt);
                const isSelected = String(optVal) === String(value);
                const optLabel = getOptionLabel(opt);
                const optSub = getOptionSubtext ? getOptionSubtext(opt) : null;
                const optBadge = getOptionBadge ? getOptionBadge(opt) : null;

                return (
                  <button
                    key={String(optVal)}
                    type="button"
                    onClick={() => {
                      onChange(optVal, opt);
                      setIsOpen(false);
                    }}
                    className={`w-full p-2.5 rounded-xl text-left text-xs font-medium transition flex items-center justify-between gap-2 group ${
                      isSelected
                        ? 'bg-emerald-50/90 text-emerald-900 font-bold'
                        : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`truncate ${isSelected ? 'text-emerald-950 font-black' : ''}`}>
                          {optLabel}
                        </span>
                        {optBadge}
                      </div>
                      {optSub && (
                        <div className="text-[10px] text-slate-400 mt-0.5 truncate">{optSub}</div>
                      )}
                    </div>
                    {isSelected && (
                      <Check className="w-4 h-4 text-emerald-600 shrink-0 stroke-[2.5]" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

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
  const [individualAllYears, setIndividualAllYears] = useState(false);
  const [individualAcademicYear, setIndividualAcademicYear] = useState('');

  // Class Recap State
  const [classRecap, setClassRecap] = useState(null);
  const [loadingRecap, setLoadingRecap] = useState(false);
  const [recapAllYears, setRecapAllYears] = useState(false);
  const [recapAcademicYear, setRecapAcademicYear] = useState('');
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedPaymentStatus, setSelectedPaymentStatus] = useState('all');
  const [selectedFeeTypeId, setSelectedFeeTypeId] = useState('');
  const [recapSearchTerm, setRecapSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(25);

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

      const [ayRes, repAyRes, clsRes, ftRes] = await Promise.allSettled([
        api.get('/akademik/academic-years', { params: ayParams }),
        api.get('/keuangan/reports/academic-years', { params: ayParams }),
        api.get('/keuangan/reports/classes', { params: ayParams }),
        api.get('/keuangan/fee-types', { params: ayParams })
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

  // Filter Classes strictly according to Selected Academic Year & Unit
  useEffect(() => {
    if (recapAllYears) {
      setFilteredClassGroups(allClassGroups);
    } else if (recapAcademicYear) {
      const filtered = allClassGroups.filter(
        (c) => String(c.academic_year_id) === String(recapAcademicYear)
      );
      setFilteredClassGroups(filtered);

      // Reset selected class if it's no longer in the filtered list
      if (selectedClassId && !filtered.some((c) => String(c.id) === String(selectedClassId))) {
        setSelectedClassId('');
      }
    } else {
      setFilteredClassGroups(allClassGroups);
    }
  }, [recapAcademicYear, recapAllYears, allClassGroups]);

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
    selectedClassId,
    selectedPaymentStatus,
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

  const classOptions = [
    { id: '', name: 'Semua Kelas (Reguler)' },
    ...filteredClassGroups.map((c) => ({
      id: c.id,
      name: `Kelas ${c.name}`,
      student_count: c.student_count,
      academic_year_id: c.academic_year_id
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
      <div className="relative overflow-hidden bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-emerald-950/20 border border-emerald-800/40">
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
                  className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-bold rounded-2xl shadow-lg shadow-emerald-950/30 transition duration-200 disabled:opacity-60"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>{downloadingExcel ? 'Mengunduh...' : 'Ekspor Excel'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleExportPdf}
                  disabled={downloadingPdf || loadingRecap}
                  className="flex items-center gap-2 px-4 py-2.5 bg-rose-600 hover:bg-rose-500 active:scale-95 text-white text-xs font-bold rounded-2xl shadow-lg shadow-rose-950/30 transition duration-200 disabled:opacity-60"
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
                className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white text-xs font-bold rounded-2xl shadow-lg shadow-indigo-950/30 transition duration-200 disabled:opacity-60"
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
                else if (selectedStudentId) fetchStudentLedger(selectedStudentId);
              }}
              disabled={loadingRecap || loadingLedger || loadingMaster}
              className="flex items-center gap-2 px-3.5 py-2.5 bg-white/10 hover:bg-white/20 active:scale-95 text-white border border-white/20 text-xs font-semibold rounded-2xl backdrop-blur-md transition duration-200 disabled:opacity-60"
            >
              <RotateCw
                className={`w-4 h-4 ${
                  loadingRecap || loadingLedger || loadingMaster
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
            className={`flex items-center gap-2.5 px-5 py-2.5 rounded-2xl text-xs font-bold transition-all duration-200 ${
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
            className={`flex items-center gap-2.5 px-5 py-2.5 rounded-2xl text-xs font-bold transition-all duration-200 ${
              activeTab === 'individual'
                ? 'bg-white text-emerald-950 shadow-lg shadow-black/20 scale-102'
                : 'bg-white/10 text-emerald-100 hover:bg-white/15'
            }`}
          >
            <User className="w-4 h-4" />
            <span>Kartu Bayar Individual Santri</span>
            {selectedStudentId && <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />}
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: REKAP KELAS & KINERJA PENAGIHAN BULANAN (COLLECTION PERFORMANCE) */}
      {/* ========================================================================= */}
      {activeTab === 'class_recap' && (
        <div className="space-y-6">
          {/* Live Search & Filter Control Bar with Custom Redesigned Comboboxes */}
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-xs space-y-5">
            {/* Top Filter Row: Cycle Switcher & Status Chips */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              {/* Cycle Toggle */}
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-emerald-600" />
                  <span>Siklus Periode:</span>
                </span>
                <div className="inline-flex p-1 bg-slate-100/90 rounded-2xl border border-slate-200/60">
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
                        ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-xs'
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

            {/* Bottom Filter Row: Custom Searchable Comboboxes Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200">
                        ★ Aktif / Berjalan
                      </span>
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
                  <div className="w-full px-3.5 py-2.5 rounded-2xl border border-purple-200 bg-purple-50/50 text-xs font-bold text-purple-800">
                    Riwayat Penuh (Semua Tahun)
                  </div>
                </div>
              )}

              {/* 2. Custom Dropdown Rombel / Kelas (Filtered strictly to Reguler & Selected Year) */}
              <SearchableSelect
                label="Rombel / Kelas (Reguler)"
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

              {/* 3. Custom Dropdown Pos Biaya with Live Search */}
              <SearchableSelect
                label="Pos Biaya Spesifik"
                icon={Receipt}
                options={feeTypeOptions}
                value={selectedFeeTypeId}
                onChange={(val) => setSelectedFeeTypeId(val)}
                placeholder="Semua Pos Biaya..."
                searchPlaceholder="Cari pos biaya (cth: SPP, Gedung)..."
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

              {/* 4. Live Search Santri / NIS Input */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                    <Search className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Live Search Santri / NIS</span>
                  </label>
                  {recapSearchTerm && (
                    <span className="text-[10px] text-emerald-600 font-bold lowercase">aktif</span>
                  )}
                </div>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Ketik nama santri atau NIS..."
                    value={recapSearchTerm}
                    onChange={(e) => setRecapSearchTerm(e.target.value)}
                    className="w-full text-xs font-semibold py-2.5 pl-9 pr-8 rounded-2xl border border-slate-200/90 bg-slate-50/80 hover:bg-white focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition placeholder:text-slate-400 shadow-2xs"
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
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
              <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/80 shadow-2xs hover:shadow-md transition">
                <div className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Total Santri</div>
                <div className="text-xl sm:text-2xl font-black text-slate-800 mt-1">
                  {classRecap.performance_summary?.total_students || 0}{' '}
                  <span className="text-xs font-semibold text-slate-500">Siswa</span>
                </div>
                <div className="text-[10px] text-slate-400 mt-1 font-medium truncate">
                  {classRecap.academic_year?.name}
                </div>
              </div>

              <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/80 shadow-2xs hover:shadow-md transition">
                <div className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Total Kewajiban</div>
                <div className="text-lg sm:text-xl font-black text-slate-800 mt-1 truncate">
                  {formatCurrency(classRecap.performance_summary?.total_billed)}
                </div>
                <div className="text-[10px] text-blue-600 mt-1 font-semibold">
                  Diskon: {formatCurrency(classRecap.performance_summary?.total_discount)}
                </div>
              </div>

              <div className="bg-gradient-to-br from-emerald-50 to-teal-50/40 p-4 sm:p-5 rounded-3xl border border-emerald-100 shadow-2xs hover:shadow-md transition">
                <div className="text-[11px] text-emerald-700 font-bold uppercase tracking-wider">
                  Kas Masuk (Terbayar)
                </div>
                <div className="text-lg sm:text-xl font-black text-emerald-700 mt-1 truncate">
                  {formatCurrency(classRecap.performance_summary?.total_paid)}
                </div>
                <div className="text-[10px] text-emerald-600 mt-1 font-medium flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Diterima di kas/bank</span>
                </div>
              </div>

              <div className="bg-gradient-to-br from-rose-50 to-amber-50/30 p-4 sm:p-5 rounded-3xl border border-rose-100 shadow-2xs hover:shadow-md transition">
                <div className="text-[11px] text-rose-700 font-bold uppercase tracking-wider">Sisa Tunggakan</div>
                <div className="text-lg sm:text-xl font-black text-rose-700 mt-1 truncate">
                  {formatCurrency(classRecap.performance_summary?.total_remaining)}
                </div>
                <div className="text-[10px] text-rose-600 mt-1 font-medium flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  <span>Piutang tertagih</span>
                </div>
              </div>

              <div className="bg-gradient-to-br from-indigo-50 to-purple-50/40 p-4 sm:p-5 rounded-3xl border border-indigo-100 shadow-2xs hover:shadow-md transition col-span-2 sm:col-span-1">
                <div className="text-[11px] text-indigo-700 font-bold uppercase tracking-wider">
                  Collection Rate
                </div>
                <div className="text-2xl font-black text-indigo-800 mt-1 flex items-baseline gap-1">
                  <span>{classRecap.performance_summary?.overall_collection_rate || 0}%</span>
                </div>
                <div className="w-full bg-indigo-200/60 rounded-full h-1.5 mt-2 overflow-hidden">
                  <div
                    className="bg-indigo-600 h-1.5 rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(
                        100,
                        classRecap.performance_summary?.overall_collection_rate || 0
                      )}%`
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Visual Strip: Kinerja Penagihan Bulanan (Juli - Juni) */}
          {classRecap?.performance_summary?.monthly_performance && (
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs p-5 space-y-3.5">
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
                      className="p-2.5 bg-slate-50/80 hover:bg-white border border-slate-100 hover:border-emerald-200 rounded-2xl space-y-1 text-center transition group shadow-2xs hover:shadow-xs"
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
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
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

            <div className="overflow-x-auto">
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
                    <th className="px-4 py-3 text-right">Kewajiban</th>
                    <th className="px-4 py-3 text-right">Terbayar</th>
                    <th className="px-4 py-3 text-right">Sisa</th>
                    <th className="px-3 py-3 text-center">Status</th>
                    <th className="px-3 py-3 text-center">Aging</th>
                    <th className="px-4 py-3 text-center">Aksi</th>
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
                        <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
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
                          <td className="px-4 py-3 text-right font-bold font-mono">
                            <span className={s.total_remaining > 0 ? 'text-rose-600' : 'text-emerald-600'}>
                              {formatRawNumber(s.total_remaining)}
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
                            {s.total_remaining > 0 ? (
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
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
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
                    className="w-full px-4 py-3 pl-10 pr-10 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-2xl text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 shadow-2xs transition placeholder:text-slate-400"
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
                    className="absolute left-0 right-0 top-full mt-2 bg-white rounded-2xl shadow-2xl border border-slate-200/90 z-50 divide-y divide-slate-100 max-h-72 overflow-y-auto overflow-x-hidden"
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

              {/* Toggle Tahun Ajaran Individual */}
              <div className="space-y-1.5">
                <span className="block text-xs font-bold text-slate-700">Rentang Siklus Kartu:</span>
                <div className="inline-flex p-1 bg-slate-100/80 rounded-2xl border border-slate-200/60">
                  <button
                    type="button"
                    onClick={() => setIndividualAllYears(false)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      !individualAllYears
                        ? 'bg-white text-indigo-700 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Tahun Ajaran Aktif
                  </button>
                  <button
                    type="button"
                    onClick={() => setIndividualAllYears(true)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      individualAllYears
                        ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Semua Tahun Ajaran (Riwayat Penuh)
                  </button>
                </div>
              </div>
            </div>
          </div>

          {loadingLedger ? (
            <div className="py-24 bg-white rounded-3xl border border-slate-200/80 flex flex-col items-center justify-center gap-3 shadow-xs">
              <Loader2 className="w-9 h-9 text-emerald-600 animate-spin" />
              <p className="text-xs font-bold text-slate-600">Memuat rincian kartu bayar santri...</p>
            </div>
          ) : !selectedStudentId ? (
            <div className="bg-white rounded-3xl border border-slate-200/80 p-12 text-center space-y-4 shadow-xs">
              <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-emerald-100 to-teal-100 text-emerald-700 flex items-center justify-center mx-auto shadow-inner">
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
                <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                  <div className="flex items-center gap-4 sm:gap-5">
                    <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-emerald-600 via-teal-600 to-slate-800 text-white flex items-center justify-center font-black text-2xl shadow-md shadow-emerald-950/20">
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

                  <div className="grid grid-cols-3 gap-3 w-full lg:w-auto">
                    <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 text-center">
                      <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                        Total Tagihan
                      </div>
                      <div className="text-base sm:text-lg font-black text-slate-800 mt-0.5">
                        {formatCurrency(ledgerData.summary?.total_billed)}
                      </div>
                    </div>
                    <div className="bg-emerald-50/70 rounded-2xl p-4 border border-emerald-100 text-center">
                      <div className="text-[10px] text-emerald-700 font-bold uppercase tracking-wider">
                        Sudah Dibayar
                      </div>
                      <div className="text-base sm:text-lg font-black text-emerald-700 mt-0.5">
                        {formatCurrency(ledgerData.summary?.total_paid)}
                      </div>
                    </div>
                    <div
                      className={`rounded-2xl p-4 border text-center ${
                        ledgerData.summary?.total_remaining > 0
                          ? 'bg-rose-50/80 border-rose-100 text-rose-700'
                          : 'bg-slate-50 border-slate-100 text-slate-700'
                      }`}
                    >
                      <div className="text-[10px] font-bold uppercase tracking-wider opacity-75">
                        Sisa Tunggakan
                      </div>
                      <div className="text-base sm:text-lg font-black mt-0.5">
                        {formatCurrency(ledgerData.summary?.total_remaining)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Table Bills Detail */}
                <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
                  <div className="px-6 py-4 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2">
                    <div className="font-bold text-slate-800 text-xs flex items-center gap-2">
                      <Receipt className="w-4 h-4 text-emerald-600" />
                      <span>
                        Rincian Pos Tagihan & Histori Kwitansi ({ledgerData.items?.length || 0} Pos Biaya)
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 font-medium">
                      {individualAllYears
                        ? 'Riwayat Sepanjang Masa (Termasuk PPDB)'
                        : 'Tahun Ajaran Aktif'}
                    </div>
                  </div>

                  <div className="overflow-x-auto">
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
                        {ledgerData.items.map((it) => (
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
                        ))}
                      </tbody>
                      <tfoot className="bg-slate-50 font-extrabold text-slate-800 border-t border-slate-200">
                        <tr>
                          <td colSpan="2" className="px-5 py-4 text-right uppercase tracking-wider text-xs">
                            TOTAL KESELURUHAN:
                          </td>
                          <td className="px-5 py-4 text-right font-black font-mono text-sm">
                            {formatCurrency(ledgerData.summary?.total_billed)}
                          </td>
                          <td className="px-5 py-4 text-right text-blue-600 font-bold font-mono">
                            {formatCurrency(ledgerData.summary?.total_discount)}
                          </td>
                          <td className="px-5 py-4 text-right text-emerald-600 font-black font-mono text-sm">
                            {formatCurrency(ledgerData.summary?.total_paid)}
                          </td>
                          <td className="px-5 py-4 text-right text-rose-600 font-black font-mono text-sm">
                            {formatCurrency(ledgerData.summary?.total_remaining)}
                          </td>
                          <td colSpan="2"></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}
