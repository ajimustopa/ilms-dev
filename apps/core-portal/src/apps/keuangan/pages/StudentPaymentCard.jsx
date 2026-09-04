import React, { useState, useEffect } from 'react';
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
  Sparkles
} from 'lucide-react';

export default function StudentPaymentCard() {
  const { activeSchoolUnit } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // URL query parameter support
  const queryParams = new URLSearchParams(location.search);
  const initialStudentId = queryParams.get('student_id') || '';

  // Mode Tab: 'individual' | 'class_recap'
  const [activeTab, setActiveTab] = useState(initialStudentId ? 'individual' : 'class_recap');

  // Master Data states
  const [academicYears, setAcademicYears] = useState([]);
  const [classGroups, setClassGroups] = useState([]);
  const [feeTypes, setFeeTypes] = useState([]);

  // Individual Ledger State
  const [selectedStudentId, setSelectedStudentId] = useState(initialStudentId);
  const [searchStudentTerm, setSearchStudentTerm] = useState('');
  const [studentSearchResults, setStudentSearchResults] = useState([]);
  const [searchingStudents, setSearchingStudents] = useState(false);
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

  // 1. Fetch Master Data
  const fetchMasterData = async () => {
    try {
      const [ayRes, clsRes, ftRes] = await Promise.all([
        api.get('/keuangan/master-data/academic-years').catch(() => ({ data: { data: [] } })),
        api.get('/keuangan/reports/classes').catch(() => ({ data: { data: [] } })),
        api.get('/keuangan/master-data/fee-types').catch(() => ({ data: { data: [] } }))
      ]);

      const ays = ayRes.data?.data || [];
      setAcademicYears(ays);
      setClassGroups(clsRes.data?.data || []);
      setFeeTypes(ftRes.data?.data || []);

      if (ays.length > 0 && !recapAcademicYear) {
        const activeAy = ays.find(y => y.is_active) || ays[0];
        setRecapAcademicYear(activeAy.id);
        setIndividualAcademicYear(activeAy.id);
      }
    } catch (err) {
      console.warn('Gagal memuat master data:', err.message);
    }
  };

  useEffect(() => {
    fetchMasterData();
  }, [activeSchoolUnit]);

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

  // Autocomplete Search Students
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (searchStudentTerm.trim().length >= 2) {
        setSearchingStudents(true);
        try {
          const res = await api.get(`/keuangan/reports/student-ledger?search=${encodeURIComponent(searchStudentTerm.trim())}&all_years=true&per_page=10`);
          setStudentSearchResults(res.data?.data?.students || []);
        } catch (err) {
          console.error('Error searching students:', err);
        } finally {
          setSearchingStudents(false);
        }
      } else {
        setStudentSearchResults([]);
      }
    }, 300);

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
      if (recapSearchTerm) params.search = recapSearchTerm;

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
  }, [activeTab, recapAllYears, recapAcademicYear, selectedClassId, selectedPaymentStatus, selectedFeeTypeId, activeSchoolUnit]);

  // Search debounce for recap
  useEffect(() => {
    if (activeTab !== 'class_recap') return;
    const timer = setTimeout(() => {
      fetchClassRecap(1);
      setCurrentPage(1);
    }, 400);
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

      const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
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

      const response = await api.get(`/keuangan/reports/student-ledger/${selectedStudentId}/pdf?${params.toString()}`, {
        responseType: 'blob'
      });

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
    if (!window.confirm(`Kirim pengingat tunggakan tagihan ke wali santri ${student.name}?\nTotal tunggakan: ${formatCurrency(student.total_remaining)} (${student.aging_days} hari menunggak).`)) {
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
        return <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-rose-100 text-rose-800 border border-rose-300 animate-pulse">🔴 Macet ({days}h)</span>;
      case 'peringatan':
        return <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-800 border border-amber-300">🟠 Peringatan ({days}h)</span>;
      case 'perhatian':
        return <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-semibold bg-yellow-100 text-yellow-800 border border-yellow-200">🟡 Perhatian ({days}h)</span>;
      default:
        return <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">🟢 Lancar</span>;
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-800 tracking-tight">Kartu Bayar Siswa & Laporan Kinerja Penagihan</h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
              <TrendingUp className="w-3 h-3 text-emerald-600" />
              <span>Collection Performance & Matrix</span>
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Monitoring piutang individual santri & rekapitulasi kinerja penagihan bulanan (Juli–Juni) berbasis SQL Conditional Pivot
          </p>
        </div>

        {/* Top Actions */}
        <div className="flex items-center gap-2">
          {activeTab === 'class_recap' && (
            <>
              <button
                type="button"
                onClick={handleExportExcel}
                disabled={downloadingExcel || loadingRecap}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition disabled:opacity-60"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>{downloadingExcel ? 'Mengunduh...' : 'Ekspor Excel'}</span>
              </button>
              <button
                type="button"
                onClick={handleExportPdf}
                disabled={downloadingPdf || loadingRecap}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-xs transition disabled:opacity-60"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>{downloadingPdf ? 'Mengunduh...' : 'Ekspor PDF'}</span>
              </button>
            </>
          )}

          {activeTab === 'individual' && selectedStudentId && (
            <button
              type="button"
              onClick={handleDownloadIndividualPdf}
              disabled={downloadingPdf || loadingLedger}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition disabled:opacity-60"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>{downloadingPdf ? 'Mencetak...' : 'Cetak Kartu PDF'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => (activeTab === 'class_recap' ? fetchClassRecap(currentPage) : fetchStudentLedger(selectedStudentId))}
            disabled={loadingRecap || loadingLedger}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl shadow-2xs transition"
          >
            <RotateCw className={`w-3.5 h-3.5 ${(loadingRecap || loadingLedger) ? 'animate-spin text-emerald-600' : 'text-slate-500'}`} />
            <span>Muat Ulang</span>
          </button>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="flex border-b border-slate-200 gap-6">
        <button
          type="button"
          onClick={() => setActiveTab('class_recap')}
          className={`pb-3 text-xs font-bold flex items-center gap-2 border-b-2 transition ${
            activeTab === 'class_recap'
              ? 'border-emerald-600 text-emerald-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Rekap Seluruh Siswa & Kinerja Penagihan (Matriks 12 Bulan)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('individual')}
          className={`pb-3 text-xs font-bold flex items-center gap-2 border-b-2 transition ${
            activeTab === 'individual'
              ? 'border-emerald-600 text-emerald-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <User className="w-4 h-4" />
          <span>Kartu Bayar Individual Santri</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: REKAP KELAS & KINERJA PENAGIHAN BULANAN (COLLECTION PERFORMANCE) */}
      {/* ========================================================================= */}
      {activeTab === 'class_recap' && (
        <div className="space-y-6">
          {/* Filter Bar */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
              {/* Toggle Tahun Ajaran Spesifik vs Semua Riwayat */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-700">Rentang Siklus:</span>
                <div className="inline-flex p-1 bg-slate-100 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setRecapAllYears(false)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                      !recapAllYears ? 'bg-white text-emerald-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Tahun Ajaran Tertentu
                  </button>
                  <button
                    type="button"
                    onClick={() => setRecapAllYears(true)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                      recapAllYears ? 'bg-white text-purple-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Semua Tahun Ajaran (Riwayat Penuh)
                  </button>
                </div>
              </div>

              {/* Status Pelunasan Quick Toggle */}
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-slate-500 mr-1">Status:</span>
                {[
                  { key: 'all', label: 'Semua' },
                  { key: 'unpaid_only', label: 'Menunggak Saja' },
                  { key: 'paid_only', label: 'Lunas' }
                ].map(st => (
                  <button
                    key={st.key}
                    type="button"
                    onClick={() => setSelectedPaymentStatus(st.key)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                      selectedPaymentStatus === st.key
                        ? 'bg-slate-800 text-white'
                        : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {st.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Dropdown Filters Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              {!recapAllYears && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Tahun Ajaran</label>
                  <select
                    value={recapAcademicYear}
                    onChange={(e) => setRecapAcademicYear(e.target.value)}
                    className="w-full text-xs py-2 px-2.5 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white"
                  >
                    {academicYears.map(ay => (
                      <option key={ay.id} value={ay.id}>{ay.name} {ay.is_active ? '(Aktif)' : ''}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Rombel / Kelas</label>
                <select
                  value={selectedClassId}
                  onChange={(e) => setSelectedClassId(e.target.value)}
                  className="w-full text-xs py-2 px-2.5 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white"
                >
                  <option value="">Semua Kelas</option>
                  {classGroups.map(cls => (
                    <option key={cls.id} value={cls.id}>{cls.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Pos Biaya Spesifik</label>
                <select
                  value={selectedFeeTypeId}
                  onChange={(e) => setSelectedFeeTypeId(e.target.value)}
                  className="w-full text-xs py-2 px-2.5 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white"
                >
                  <option value="">Semua Pos Biaya</option>
                  {feeTypes.map(ft => (
                    <option key={ft.id} value={ft.id}>{ft.name} ({ft.billing_pattern})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Pencarian Santri / NIS</label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Nama / NIS..."
                    value={recapSearchTerm}
                    onChange={(e) => setRecapSearchTerm(e.target.value)}
                    className="w-full text-xs py-2 pl-8 pr-3 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white"
                  />
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                </div>
              </div>
            </div>
          </div>

          {/* Macro KPI Cards */}
          {classRecap && (
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
                <div className="text-[11px] text-slate-400 font-semibold uppercase">Total Santri</div>
                <div className="text-lg font-bold text-slate-800 mt-1">{classRecap.performance_summary?.total_students || 0} Siswa</div>
                <div className="text-[10px] text-slate-400 mt-0.5">{classRecap.academic_year?.name}</div>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
                <div className="text-[11px] text-slate-400 font-semibold uppercase">Total Kewajiban</div>
                <div className="text-lg font-bold text-slate-800 mt-1">{formatCurrency(classRecap.performance_summary?.total_billed)}</div>
                <div className="text-[10px] text-blue-600 mt-0.5">Diskon: {formatCurrency(classRecap.performance_summary?.total_discount)}</div>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
                <div className="text-[11px] text-emerald-600 font-semibold uppercase">Kas Masuk (Terbayar)</div>
                <div className="text-lg font-bold text-emerald-600 mt-1">{formatCurrency(classRecap.performance_summary?.total_paid)}</div>
                <div className="text-[10px] text-emerald-600 mt-0.5">Telah diterima di kas/bank</div>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
                <div className="text-[11px] text-rose-600 font-semibold uppercase">Sisa Tunggakan</div>
                <div className="text-lg font-bold text-rose-600 mt-1">{formatCurrency(classRecap.performance_summary?.total_remaining)}</div>
                <div className="text-[10px] text-rose-500 mt-0.5">Piutang belum terselesaikan</div>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs col-span-2 sm:col-span-1">
                <div className="text-[11px] text-indigo-600 font-semibold uppercase">Collection Rate</div>
                <div className="text-lg font-extrabold text-indigo-700 mt-1">
                  {classRecap.performance_summary?.overall_collection_rate || 0}%
                </div>
                <div className="text-[10px] text-indigo-500 mt-0.5">Rasio efisiensi penagihan</div>
              </div>
            </div>
          )}

          {/* Visual Strip: Kinerja Penagihan Bulanan (Juli - Juni) */}
          {classRecap?.performance_summary?.monthly_performance && (
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-4 space-y-3 overflow-hidden">
              <div className="flex items-center justify-between">
                <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                  <span>Kinerja Penagihan Bulanan (Target Billed vs Actual Cash Inflow)</span>
                </div>
                <span className="text-[11px] text-slate-400">Siklus 12 Bulan (Juli &rarr; Juni)</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-12 gap-2">
                {classRecap.performance_summary.monthly_performance.map((m) => {
                  const rate = m.collection_rate || 0;
                  const isHigh = rate >= 90;
                  const isMid = rate >= 70 && rate < 90;

                  return (
                    <div key={m.month_index} className="p-2.5 bg-slate-50 border border-slate-100 rounded-xl space-y-1 text-center">
                      <div className="text-[11px] font-bold text-slate-700">{m.month_name}</div>
                      <div className="text-[10px] text-slate-400">T: {formatRawNumber(m.target_billed)}</div>
                      <div className="text-[10px] font-bold text-emerald-700">R: {formatRawNumber(m.actual_collected)}</div>
                      <div className="pt-0.5">
                        <span className={`inline-block px-1.5 py-0.2 rounded text-[9px] font-extrabold ${
                          isHigh ? 'bg-emerald-100 text-emerald-800' : (isMid ? 'bg-indigo-100 text-indigo-800' : 'bg-rose-100 text-rose-800')
                        }`}>
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
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
            <div className="px-5 py-3.5 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
              <div className="text-xs font-bold text-slate-800 flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-600" />
                <span>Matriks Penagihan Santri ({classRecap?.pagination?.total_records || 0} Siswa)</span>
              </div>
              <div className="text-[11px] text-slate-500 font-medium">
                Halaman {classRecap?.pagination?.current_page || 1} dari {classRecap?.pagination?.total_pages || 1}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 text-[11px]">
                  <tr>
                    <th className="px-3 py-2.5 text-center w-8">No</th>
                    <th className="px-3 py-2.5">Santri & NIS</th>
                    <th className="px-3 py-2.5">Kelas</th>
                    {/* 12 Bulan Kolom */}
                    {monthKeys.map(m => (
                      <th key={m.key} className="px-2 py-2.5 text-center">{m.label}</th>
                    ))}
                    <th className="px-3 py-2.5 text-right">Kewajiban</th>
                    <th className="px-3 py-2.5 text-right">Terbayar</th>
                    <th className="px-3 py-2.5 text-right">Sisa</th>
                    <th className="px-3 py-2.5 text-center">Status</th>
                    <th className="px-3 py-2.5 text-center">Aging</th>
                    <th className="px-3 py-2.5 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loadingRecap ? (
                    <tr>
                      <td colSpan="20" className="text-center py-16 text-slate-400">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-600" />
                        <span>Memuat matriks penagihan siswa...</span>
                      </td>
                    </tr>
                  ) : !classRecap || classRecap.students.length === 0 ? (
                    <tr>
                      <td colSpan="20" className="text-center py-16 text-slate-400">
                        Tidak ada data santri pada kriteria filter yang dipilih.
                      </td>
                    </tr>
                  ) : (
                    classRecap.students.map((s, idx) => {
                      const rowNum = (currentPage - 1) * perPage + idx + 1;

                      return (
                        <tr key={s.student_id} className="hover:bg-slate-50/70 transition">
                          <td className="px-3 py-2.5 text-center text-slate-400 font-mono">{rowNum}</td>
                          <td className="px-3 py-2.5">
                            <div className="font-bold text-slate-800">{s.name}</div>
                            <div className="text-[10px] text-slate-400 font-mono">{s.nis || '-'}</div>
                          </td>
                          <td className="px-3 py-2.5 text-slate-600">{s.class_name}</td>

                          {/* 12 Kolom Bulan */}
                          {monthKeys.map(m => {
                            const mData = s.months?.[m.key] || { billed: 0, paid: 0, status: 'none' };
                            return (
                              <td key={m.key} className="px-2 py-2.5 text-center">
                                {mData.status === 'none' ? (
                                  <span className="text-slate-200">&bull;</span>
                                ) : mData.status === 'paid' ? (
                                  <span className="inline-block px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-100 text-emerald-700" title={`Lunas: ${formatCurrency(mData.paid)}`}>
                                    ✓
                                  </span>
                                ) : mData.status === 'partial' ? (
                                  <span className="inline-block px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-100 text-amber-700" title={`Sebagian: ${formatCurrency(mData.paid)} / ${formatCurrency(mData.billed)}`}>
                                    ½
                                  </span>
                                ) : (
                                  <span className="inline-block px-1.5 py-0.2 rounded text-[9px] font-bold bg-rose-100 text-rose-700" title={`Belum: ${formatCurrency(mData.billed)}`}>
                                    !
                                  </span>
                                )}
                              </td>
                            );
                          })}

                          <td className="px-3 py-2.5 text-right font-semibold text-slate-800 font-mono">
                            {formatRawNumber(s.total_billed)}
                          </td>
                          <td className="px-3 py-2.5 text-right font-bold text-emerald-600 font-mono">
                            {formatRawNumber(s.total_paid)}
                          </td>
                          <td className="px-3 py-2.5 text-right font-bold font-mono">
                            <span className={s.total_remaining > 0 ? 'text-rose-600' : 'text-emerald-600'}>
                              {formatRawNumber(s.total_remaining)}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold ${
                              s.settlement_status === 'Lunas'
                                ? 'bg-emerald-100 text-emerald-700'
                                : (s.settlement_status === 'Sebagian' ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700')
                            }`}>
                              {s.settlement_status}
                            </span>
                          </td>

                          {/* Aging Badge */}
                          <td className="px-3 py-2.5 text-center">
                            {s.total_remaining > 0 ? getAgingBadge(s.aging_days, s.aging_status) : <span className="text-[10px] text-emerald-600 font-semibold">Lunas</span>}
                          </td>

                          {/* Actions */}
                          <td className="px-3 py-2.5 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedStudentId(s.student_id);
                                  setActiveTab('individual');
                                }}
                                title="Buka Kartu Bayar Individual"
                                className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-semibold transition"
                              >
                                Kartu
                              </button>

                              {s.total_remaining > 0 && (
                                <button
                                  type="button"
                                  onClick={() => handleNotifyOverdue(s)}
                                  disabled={notifyingStudentId === s.student_id}
                                  title="Kirim Pengingat Tunggakan (WhatsApp/Notifikasi)"
                                  className="p-1 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-lg transition"
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
              <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs">
                <div className="text-slate-500">
                  Menampilkan {(currentPage - 1) * perPage + 1} s.d. {Math.min(currentPage * perPage, classRecap.pagination.total_records)} dari {classRecap.pagination.total_records} data santri
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
                    className="p-1.5 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40"
                  >
                    <ChevronLeft className="w-4 h-4 text-slate-600" />
                  </button>

                  <span className="font-bold text-slate-700">
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
                    className="p-1.5 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40"
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
          {/* Search and Year Select Bar */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              {/* Autocomplete Search */}
              <div className="relative flex-1 max-w-md">
                <label className="block text-xs font-semibold text-slate-700 mb-1">Cari Nama Santri / NIS</label>
                <div className="relative">
                  <input
                    type="text"
                    value={searchStudentTerm}
                    onChange={(e) => setSearchStudentTerm(e.target.value)}
                    placeholder="Ketik minimal 2 huruf nama santri..."
                    className="w-full px-3 py-2 pl-9 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20"
                  />
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  {searchingStudents && <Loader2 className="w-4 h-4 text-emerald-600 animate-spin absolute right-3 top-2.5" />}
                </div>

                {/* Autocomplete dropdown */}
                {studentSearchResults.length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-white rounded-xl shadow-xl border border-slate-100 z-50 divide-y divide-slate-100 max-h-56 overflow-y-auto">
                    {studentSearchResults.map((s) => (
                      <div
                        key={s.student_id}
                        onClick={() => {
                          setSelectedStudentId(s.student_id);
                          setSearchStudentTerm('');
                          setStudentSearchResults([]);
                        }}
                        className="p-2.5 hover:bg-emerald-50/50 cursor-pointer flex items-center justify-between text-xs"
                      >
                        <div>
                          <div className="font-bold text-slate-800">{s.name}</div>
                          <div className="text-[10px] text-slate-400">NIS: {s.nis} &bull; Kelas: {s.class_name}</div>
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Toggle Tahun Ajaran Individual */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-700">Tampilan:</span>
                <div className="inline-flex p-1 bg-slate-100 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setIndividualAllYears(false)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                      !individualAllYears ? 'bg-white text-indigo-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Tahun Ajaran Aktif
                  </button>
                  <button
                    type="button"
                    onClick={() => setIndividualAllYears(true)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                      individualAllYears ? 'bg-white text-purple-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Semua Tahun Ajaran (Riwayat Penuh)
                  </button>
                </div>
              </div>
            </div>
          </div>

          {loadingLedger ? (
            <div className="py-24 flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
              <p className="text-xs font-semibold text-slate-500">Memuat kartu bayar santri...</p>
            </div>
          ) : !selectedStudentId ? (
            <div className="bg-white rounded-3xl border border-slate-200/80 p-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                <User className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-slate-800 text-sm">Pilih Santri Terlebih Dahulu</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Cari nama atau NIS santri melalui kotak pencarian di atas, atau klik tombol "Kartu" pada tab Rekap Seluruh Siswa.
              </p>
            </div>
          ) : ledgerData && (
            <div className="space-y-6">
              {/* Profile Card & KPI */}
              <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-2xs flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center font-bold text-xl shadow-xs">
                    {ledgerData.student?.name ? ledgerData.student.name.charAt(0) : 'S'}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-base font-bold text-slate-800 tracking-tight">{ledgerData.student?.name}</h2>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        ledgerData.summary?.settlement_status === 'Lunas'
                          ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                          : (ledgerData.summary?.settlement_status === 'Sebagian' ? 'bg-amber-100 text-amber-700 border border-amber-200' : 'bg-rose-100 text-rose-700 border border-rose-200')
                      }`}>
                        {ledgerData.summary?.settlement_status}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 mt-1 flex flex-wrap gap-x-4 gap-y-1">
                      <span>NIS: <span className="font-mono text-slate-700">{ledgerData.student?.nis || '-'}</span></span>
                      <span>NISN: <span className="font-mono text-slate-700">{ledgerData.student?.nisn || '-'}</span></span>
                      <span>Kelas: <span className="font-semibold text-slate-700">{ledgerData.student?.class_name || '-'}</span></span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-100 text-center">
                    <div className="text-[10px] text-slate-400 font-semibold uppercase">Total Tagihan</div>
                    <div className="text-sm font-bold text-slate-800 mt-0.5">{formatCurrency(ledgerData.summary?.total_billed)}</div>
                  </div>
                  <div className="bg-emerald-50/60 rounded-2xl p-3.5 border border-emerald-100 text-center">
                    <div className="text-[10px] text-emerald-700 font-semibold uppercase">Sudah Dibayar</div>
                    <div className="text-sm font-bold text-emerald-700 mt-0.5">{formatCurrency(ledgerData.summary?.total_paid)}</div>
                  </div>
                  <div className={`rounded-2xl p-3.5 border text-center ${ledgerData.summary?.total_remaining > 0 ? 'bg-rose-50/60 border-rose-100 text-rose-700' : 'bg-slate-50 border-slate-100 text-slate-700'}`}>
                    <div className="text-[10px] font-semibold uppercase opacity-75">Sisa Tunggakan</div>
                    <div className="text-sm font-bold mt-0.5">{formatCurrency(ledgerData.summary?.total_remaining)}</div>
                  </div>
                </div>
              </div>

              {/* Table Bills Detail */}
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
                <div className="px-5 py-3.5 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
                  <div className="font-bold text-slate-800 text-xs flex items-center gap-2">
                    <Receipt className="w-4 h-4 text-emerald-600" />
                    <span>Rincian Pos Tagihan & Histori Kwitansi ({ledgerData.items?.length || 0} pos)</span>
                  </div>
                  <div className="text-[11px] text-slate-400">
                    {individualAllYears ? 'Riwayat Sepanjang Masa Termasuk PPDB' : 'Tahun Ajaran Aktif'}
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="px-5 py-3">Pos Biaya & Periode</th>
                        <th className="px-5 py-3">Jatuh Tempo</th>
                        <th className="px-5 py-3 text-right">Nominal Tagihan</th>
                        <th className="px-5 py-3 text-right">Diskon</th>
                        <th className="px-5 py-3 text-right">Sudah Dibayar</th>
                        <th className="px-5 py-3 text-right">Sisa Piutang</th>
                        <th className="px-5 py-3 text-center">Status</th>
                        <th className="px-5 py-3">Histori Kwitansi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {ledgerData.items.map((it) => (
                        <tr key={it.bill_id} className="hover:bg-slate-50/60 transition">
                          <td className="px-5 py-3.5">
                            <div className="font-bold text-slate-800 flex items-center gap-1.5 flex-wrap">
                              <span>{it.fee_type_name}</span>
                              {it.is_ppdb && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
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
                            <div className="text-[11px] text-slate-400">Periode: {it.period_label}</div>
                          </td>
                          <td className="px-5 py-3.5 text-slate-500">{it.due_date || '-'}</td>
                          <td className="px-5 py-3.5 text-right font-semibold text-slate-800">{formatCurrency(it.amount)}</td>
                          <td className="px-5 py-3.5 text-right text-slate-400">
                            {it.discount_amount > 0 ? formatCurrency(it.discount_amount) : '-'}
                          </td>
                          <td className="px-5 py-3.5 text-right font-bold text-emerald-600">{formatCurrency(it.paid_amount)}</td>
                          <td className="px-5 py-3.5 text-right font-bold">
                            <span className={it.remaining_amount > 0 ? 'text-rose-600' : 'text-emerald-600'}>
                              {formatCurrency(it.remaining_amount)}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-center">
                            <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold ${
                              it.status === 'paid'
                                ? 'bg-emerald-100 text-emerald-700'
                                : (it.status === 'partially_paid' ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700')
                            }`}>
                              {it.status === 'paid' ? 'Lunas' : (it.status === 'partially_paid' ? 'Sebagian' : 'Belum Lunas')}
                            </span>
                          </td>
                          <td className="px-5 py-3.5">
                            {it.payments && it.payments.length > 0 ? (
                              <div className="space-y-1">
                                {it.payments.map((p) => (
                                  <div key={p.payment_id} className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded flex items-center justify-between gap-2 font-mono">
                                    <span>{p.receipt_number || 'KWT-LOKAL'}</span>
                                    <span className="font-bold text-emerald-700">{formatCurrency(p.amount)}</span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span className="text-[11px] text-slate-400 italic">Belum ada pembayaran</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-slate-50 font-bold text-slate-800 border-t border-slate-200">
                      <tr>
                        <td colSpan="2" className="px-5 py-3 text-right">TOTAL KESELURUHAN:</td>
                        <td className="px-5 py-3 text-right">{formatCurrency(ledgerData.summary?.total_billed)}</td>
                        <td className="px-5 py-3 text-right text-blue-600">{formatCurrency(ledgerData.summary?.total_discount)}</td>
                        <td className="px-5 py-3 text-right text-emerald-600">{formatCurrency(ledgerData.summary?.total_paid)}</td>
                        <td className="px-5 py-3 text-right text-rose-600">{formatCurrency(ledgerData.summary?.total_remaining)}</td>
                        <td colSpan="2"></td>
                      </tr>
                    </tfoot>
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
