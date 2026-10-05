import React, { useState, useEffect, useMemo, useRef } from 'react';
import api from '../../../shared/services/api';
import StatusPill from '../../../shared/components/StatusPill';
import FlatAlertBanner from '../../../shared/components/FlatAlertBanner';
import StudentWalletHistoryModal from '../../../shared/components/StudentWalletHistoryModal';
import { formatCurrency, formatDate } from '../../../shared/utils/formatters';
import {
  Users,
  QrCode,
  KeyRound,
  Search,
  Loader2,
  AlertCircle,
  CheckCircle2,
  X,
  Printer,
  Download,
  RotateCw,
  ShieldAlert,
  ShieldCheck,
  RefreshCw,
  GraduationCap,
  Filter,
  UserCheck,
  UserX,
  UserMinus,
  Wallet,
  Calendar,
  Layers,
  Sparkles,
  ChevronDown,
  Check,
  RotateCcw,
  School,
  SlidersHorizontal,
  History
} from 'lucide-react';

/**
 * Komponen Dropdown Filter Interaktif Enterprise
 */
function FilterDropdown({
  label,
  value,
  onChange,
  options = [],
  icon: Icon,
  theme = 'emerald',
  placeholder = 'Pilih Opsi'
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find((opt) => String(opt.value) === String(value)) || options[0];
  const isFiltered = value !== 'all' && value !== '';

  const themeClasses = {
    emerald: {
      activeTrigger: 'border-emerald-500 ring-2 ring-emerald-500/15 bg-emerald-50/50 text-emerald-900',
      icon: 'text-emerald-600',
      badge: isFiltered ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600',
      selectedItem: 'bg-emerald-50 text-emerald-900 font-bold border-emerald-200'
    },
    indigo: {
      activeTrigger: 'border-indigo-500 ring-2 ring-indigo-500/15 bg-indigo-50/50 text-indigo-900',
      icon: 'text-indigo-600',
      badge: isFiltered ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600',
      selectedItem: 'bg-indigo-50 text-indigo-900 font-bold border-indigo-200'
    },
    sky: {
      activeTrigger: 'border-sky-500 ring-2 ring-sky-500/15 bg-sky-50/50 text-sky-900',
      icon: 'text-sky-600',
      badge: isFiltered ? 'bg-sky-600 text-white' : 'bg-slate-100 text-slate-600',
      selectedItem: 'bg-sky-50 text-sky-900 font-bold border-sky-200'
    },
    amber: {
      activeTrigger: 'border-amber-500 ring-2 ring-amber-500/15 bg-amber-50/50 text-amber-900',
      icon: 'text-amber-600',
      badge: isFiltered ? 'bg-amber-600 text-white' : 'bg-slate-100 text-slate-600',
      selectedItem: 'bg-amber-50 text-amber-900 font-bold border-amber-200'
    }
  };

  const currentTheme = themeClasses[theme] || themeClasses.emerald;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition cursor-pointer select-none ${
          isFiltered
            ? currentTheme.activeTrigger
            : 'bg-white hover:bg-slate-50 border-slate-200/90 text-slate-700 shadow-2xs hover:border-slate-300'
        }`}
      >
        {Icon && <Icon className={`w-4 h-4 ${currentTheme.icon} shrink-0`} />}
        <div className="flex flex-col items-start text-left leading-none">
          <span className="text-[10px] text-slate-400 font-medium mb-0.5">{label}</span>
          <span className="truncate max-w-[130px] font-bold text-slate-800 text-[11px]">
            {selectedOption?.label || placeholder}
          </span>
        </div>
        {selectedOption?.count !== undefined && (
          <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-mono font-bold ${currentTheme.badge}`}>
            {selectedOption.count}
          </span>
        )}
        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ml-0.5 ${
            isOpen ? 'rotate-180 text-slate-700' : ''
          }`}
        />
      </button>

      {/* Popover Card */}
      {isOpen && (
        <div className="absolute left-0 top-full mt-1.5 z-40 w-64 bg-white rounded-2xl shadow-xl border border-slate-200/90 py-1.5 px-1 animate-in fade-in zoom-in-95 duration-150">
          <div className="px-3 py-1.5 border-b border-slate-100 flex items-center justify-between mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Filter {label}
            </span>
            {isFiltered && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onChange('all');
                  setIsOpen(false);
                }}
                className="text-[10px] font-bold text-rose-600 hover:text-rose-700 hover:underline cursor-pointer flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset</span>
              </button>
            )}
          </div>
          <div className="max-h-60 overflow-y-auto py-0.5 space-y-0.5">
            {options.map((opt) => {
              const isSelected = String(opt.value) === String(value);
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs transition cursor-pointer text-left border ${
                    isSelected
                      ? `${currentTheme.selectedItem} border-transparent`
                      : 'border-transparent hover:bg-slate-50 text-slate-700 hover:text-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0 pr-2">
                    {opt.dotColor && (
                      <span className={`w-2 h-2 rounded-full shrink-0 ${opt.dotColor}`} />
                    )}
                    <span className="truncate">{opt.label}</span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {opt.count !== undefined && (
                      <span
                        className={`text-[10px] font-mono px-1.5 py-0.2 rounded-md ${
                          isSelected
                            ? 'bg-white/80 font-bold text-slate-800'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {opt.count}
                      </span>
                    )}
                    {isSelected && <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[2.5]" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default function DataSiswaKantin() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedCohort, setSelectedCohort] = useState('all');
  const [selectedAcademicStatus, setSelectedAcademicStatus] = useState('all');
  const [selectedClassGroup, setSelectedClassGroup] = useState('all');
  const [selectedAccountStatus, setSelectedAccountStatus] = useState('all');
  const [selectedStudentQr, setSelectedStudentQr] = useState(null);
  const [historyModalStudent, setHistoryModalStudent] = useState(null);
  const [pinModalData, setPinModalData] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [generatingBulk, setGeneratingBulk] = useState(false);
  const [generatingSingleId, setGeneratingSingleId] = useState(null);
  const [syncAlert, setSyncAlert] = useState(null);

  // State Modal Saldo Awal Migrasi
  const [openingBalanceStudent, setOpeningBalanceStudent] = useState(null);
  const [openingBalanceAmount, setOpeningBalanceAmount] = useState('');
  const [openingBalanceDate, setOpeningBalanceDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [openingBalanceCashAccountId, setOpeningBalanceCashAccountId] = useState('');
  const [openingBalanceNotes, setOpeningBalanceNotes] = useState('Saldo Awal Migrasi Sistem Lama (Cutover)');
  const [openingBalanceLoading, setOpeningBalanceLoading] = useState(false);
  const [openingBalanceError, setOpeningBalanceError] = useState(null);
  const [openingBalanceSuccess, setOpeningBalanceSuccess] = useState(null);
  const [cashAccounts, setCashAccounts] = useState([]);

  const fetchCashAccounts = async () => {
    try {
      const res = await api.get('/kantin/wallet-transactions/cash-accounts');
      const list = res.data?.data || [];
      setCashAccounts(list);
      if (list.length > 0 && !openingBalanceCashAccountId) {
        const defaultCa = list.find(c => c.name?.toLowerCase().includes('kantin')) || list[0];
        setOpeningBalanceCashAccountId(String(defaultCa.id));
      }
    } catch (_) {}
  };

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const res = await api.get('/kantin/canteen-students');
      setStudents(res.data?.data || []);
    } catch (err) {
      console.error('Error fetching students:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
    fetchCashAccounts();
  }, []);

  const handleOpenOpeningBalance = (student) => {
    setOpeningBalanceStudent(student);
    setOpeningBalanceAmount('');
    setOpeningBalanceDate(new Date().toISOString().slice(0, 10));
    setOpeningBalanceNotes(`Saldo Awal Migrasi Sistem Lama - ${student.student_name}`);
    setOpeningBalanceError(null);
    setOpeningBalanceSuccess(null);
  };

  const handleSubmitOpeningBalance = async (e) => {
    e.preventDefault();
    if (!openingBalanceStudent) return;
    setOpeningBalanceLoading(true);
    setOpeningBalanceError(null);
    setOpeningBalanceSuccess(null);

    try {
      const payload = {
        student_id: Number(openingBalanceStudent.student_id),
        amount: parseFloat(openingBalanceAmount),
        occurred_at: openingBalanceDate ? new Date(openingBalanceDate).toISOString() : undefined,
        cash_account_id: openingBalanceCashAccountId ? Number(openingBalanceCashAccountId) : null,
        notes: openingBalanceNotes.trim() || 'Saldo Awal Migrasi Sistem Lama (Cutover)'
      };

      const res = await api.post('/kantin/wallet-transactions/opening-balance', payload);
      const resData = res.data?.data;
      const jrnInfo = resData?.journal_number ? ` [Jurnal: ${resData.journal_number}]` : '';

      setOpeningBalanceSuccess(`Saldo awal sebesar Rp${parseFloat(openingBalanceAmount).toLocaleString('id-ID')} berhasil dicatat! Saldo baru: Rp${resData.balance_after.toLocaleString('id-ID')}${jrnInfo}`);
      fetchStudents();
      setTimeout(() => {
        setOpeningBalanceStudent(null);
      }, 1500);
    } catch (err) {
      setOpeningBalanceError(err.response?.data?.message || err.message || 'Gagal menyimpan saldo awal');
    } finally {
      setOpeningBalanceLoading(false);
    }
  };

  // Cetak Kartu Digital Santri dengan QR Code
  const handlePrintCard = (student) => {
    if (!student) return;
    const printWindow = window.open('', '_blank', 'width=650,height=750');
    if (!printWindow) {
      alert('Pop-up terblokir di browser. Izinkan pop-up untuk mencetak kartu.');
      return;
    }
    const svgHtml = student.svg_content || (student.qr_image_url ? `<img src="${student.qr_image_url}" style="width:180px;height:180px;" alt="QR"/>` : '<p>QR Code tidak ditemukan</p>');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Kartu QR Santri - ${student.student_name}</title>
          <style>
            @page { size: auto; margin: 10mm; }
            * { box-sizing: border-box; }
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; display: flex; justify-content: center; align-items: center; min-height: 90vh; margin: 0; background: #f1f5f9; }
            .card { width: 340px; padding: 24px; background: white; border: 2px solid #0f172a; border-radius: 20px; text-align: center; box-shadow: 0 4px 15px rgba(0,0,0,0.08); }
            .header { border-bottom: 2px solid #e2e8f0; padding-bottom: 12px; margin-bottom: 16px; }
            .school-title { font-size: 15px; font-weight: 800; color: #065f46; text-transform: uppercase; letter-spacing: 0.5px; margin: 0; }
            .sub-title { font-size: 11px; font-weight: 600; color: #64748b; margin: 2px 0 0; }
            .qr-container { width: 200px; height: 200px; margin: 0 auto 16px; display: flex; align-items: center; justify-content: center; background: #ffffff; padding: 8px; border: 1.5px solid #cbd5e1; border-radius: 12px; }
            .qr-container svg { width: 100%; height: 100%; }
            .name { font-size: 16px; font-weight: 800; color: #0f172a; margin: 0 0 6px; }
            .meta { font-size: 12px; font-weight: 600; color: #475569; margin: 0 0 12px; }
            .nipd-badge { display: inline-block; background: #ecfdf5; border: 1.5px solid #10b981; color: #065f46; font-family: monospace; font-weight: 800; font-size: 14px; padding: 5px 16px; border-radius: 9999px; letter-spacing: 1px; }
            .footer { margin-top: 16px; font-size: 9px; color: #94a3b8; border-top: 1px dashed #cbd5e1; padding-top: 8px; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="header">
              <div class="school-title">PESANTREN ALDEPOS</div>
              <div class="sub-title">Kartu Digital QR Universal Santri</div>
            </div>
            <div class="qr-container">
              ${svgHtml}
            </div>
            <div class="name">${student.student_name}</div>
            <div class="meta">${student.class_group_name || 'Santri'} • ${student.cohort_name && student.cohort_name !== '-' ? student.cohort_name : 'Santri Aktif'}</div>
            <div class="nipd-badge">NIPD: ${student.qr_code || student.nipd || student.nis}</div>
            <div class="footer">Dapat discan di Kasir Kantin, Perpustakaan, dan POS Yayasan</div>
          </div>
          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Generate QR Per Siswa
  const handleGenerateQr = async (studentId) => {
    setGeneratingSingleId(studentId);
    try {
      const res = await api.post(`/kantin/canteen-students/${studentId}/generate-qr`);
      const studentData = res.data?.data;
      setSelectedStudentQr(studentData);
      setSyncAlert({
        type: 'success',
        message: `Gambar QR Code untuk ${studentData.student_name} berhasil dibuat dan disimpan ke folder penyimpanan server.`
      });
      fetchStudents();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal generate QR');
    } finally {
      setGeneratingSingleId(null);
    }
  };

  // Generate QR Masal untuk Seluruh Santri
  const handleBulkGenerateQr = async () => {
    if (!window.confirm('Generate / perbarui seluruh gambar QR Code santri ke folder penyimpanan server (/uploads/canteen-qr/)?')) return;
    setGeneratingBulk(true);
    setSyncAlert(null);
    try {
      const res = await api.post('/kantin/canteen-students/bulk-generate-qr');
      setSyncAlert({
        type: 'success',
        message: res.data?.message || 'Berhasil men-generate seluruh gambar QR santri ke folder penyimpanan server!'
      });
      fetchStudents();
    } catch (err) {
      setSyncAlert({
        type: 'error',
        message: err.response?.data?.message || err.message || 'Gagal generate masal QR code'
      });
    } finally {
      setGeneratingBulk(false);
    }
  };

  const handleResetChildPin = async (studentId) => {
    if (!window.confirm('Reset PIN anak untuk santri ini?')) return;
    try {
      const res = await api.post(`/kantin/canteen-students/${studentId}/reset-child-pin`);
      setPinModalData({
        title: 'PIN Anak Berhasil Direset',
        pin: res.data.data.new_pin,
        note: 'Berikan PIN baru ini kepada santri untuk transaksi dompet di kasir.'
      });
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal reset PIN');
    }
  };

  const handleResetParentPin = async (studentId) => {
    if (!window.confirm('Reset PIN orangtua untuk santri ini?')) return;
    try {
      const res = await api.post(`/kantin/canteen-students/${studentId}/reset-parent-pin`);
      setPinModalData({
        title: 'PIN Orangtua Berhasil Direset',
        pin: res.data.data.new_pin,
        note: 'Berikan PIN baru ini kepada orangtua santri untuk akses Portal Orangtua.'
      });
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal reset PIN');
    }
  };

  const handleToggleStatus = async (studentId, currentStatus) => {
    const nextStatus = currentStatus === 'active' ? 'inactive' : 'active';
    try {
      await api.patch(`/kantin/canteen-students/${studentId}/status`, {
        status: nextStatus
      });
      fetchStudents();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal update status');
    }
  };

  const handleSyncAcademic = async () => {
    setSyncing(true);
    setSyncAlert(null);
    try {
      const res = await api.post('/kantin/canteen-students/sync-academic');
      setSyncAlert({
        type: 'success',
        message: res.data?.message || 'Sinkronisasi santri dari Akademik berhasil!'
      });
      fetchStudents();
    } catch (err) {
      setSyncAlert({
        type: 'error',
        message: err.response?.data?.message || err.message || 'Gagal menyinkronkan siswa dari Akademik'
      });
    } finally {
      setSyncing(false);
    }
  };

  // Tahun ajaran aktif dari metadata santri
  const activeAcademicYearName = useMemo(() => {
    const found = students.find(s => s.active_academic_year_name);
    return found?.active_academic_year_name || null;
  }, [students]);

  // Statistik Ringkas
  const stats = useMemo(() => {
    const total = students.length;
    const activeTa = students.filter(s => s.is_active_ta).length;
    const lulus = students.filter(s => s.academic_status === 'lulus').length;
    const mutasi = students.filter(s => s.academic_status === 'pindah' || s.academic_status === 'keluar').length;
    const nonAktifTa = students.filter(s => !s.is_active_ta && s.academic_status !== 'lulus' && s.academic_status !== 'pindah' && s.academic_status !== 'keluar').length;
    const totalWallet = students.reduce((sum, s) => sum + (Number(s.wallet_balance) || 0), 0);
    return { total, activeTa, lulus, mutasi, nonAktifTa, totalWallet };
  }, [students]);

  // Opsi Dropdown Status Akademik
  const academicStatusOptions = useMemo(() => {
    return [
      { value: 'all', label: 'Semua Status Rombel', count: stats.total },
      { value: 'aktif_ta', label: 'Santri Aktif (TA Berjalan)', count: stats.activeTa, dotColor: 'bg-emerald-500' },
      { value: 'lulus', label: 'Alumni / Lulus', count: stats.lulus, dotColor: 'bg-indigo-500' },
      { value: 'pindah', label: 'Mutasi / Pindah', count: stats.mutasi, dotColor: 'bg-rose-500' },
      { value: 'non_aktif_ta', label: 'Non-Aktif TA Berjalan', count: stats.nonAktifTa, dotColor: 'bg-amber-500' }
    ];
  }, [stats]);

  // Opsi Dropdown Angkatan
  const cohortDropdownOptions = useMemo(() => {
    const counts = {};
    students.forEach(s => {
      if (s.cohort_name && s.cohort_name !== '-') {
        counts[s.cohort_name] = (counts[s.cohort_name] || 0) + 1;
      }
    });
    const sortedCohorts = Object.keys(counts).sort((a, b) => b.localeCompare(a));
    return [
      { value: 'all', label: 'Semua Angkatan', count: students.length },
      ...sortedCohorts.map(c => ({
        value: c,
        label: c,
        count: counts[c]
      }))
    ];
  }, [students]);

  // Opsi Dropdown Kelas Reguler
  const classGroupDropdownOptions = useMemo(() => {
    const counts = {};
    students.forEach(s => {
      if (s.is_active_ta && s.class_group_name && s.class_group_name !== '-') {
        counts[s.class_group_name] = (counts[s.class_group_name] || 0) + 1;
      }
    });
    const sortedClasses = Object.keys(counts).sort();
    return [
      { value: 'all', label: 'Semua Kelas Reguler', count: stats.activeTa },
      ...sortedClasses.map(cls => ({
        value: cls,
        label: `Kelas ${cls}`,
        count: counts[cls]
      }))
    ];
  }, [students, stats.activeTa]);

  // Opsi Dropdown Status Kasir
  const accountStatusOptions = useMemo(() => {
    const activeCount = students.filter(s => s.status === 'active' && !s.is_blocked_by_parent).length;
    const inactiveCount = students.filter(s => s.status !== 'active').length;
    const blockedCount = students.filter(s => s.is_blocked_by_parent).length;
    return [
      { value: 'all', label: 'Semua Status Kasir', count: students.length },
      { value: 'active', label: 'Kasir Aktif', count: activeCount, dotColor: 'bg-emerald-500' },
      { value: 'inactive', label: 'Kasir Non-Aktif', count: inactiveCount, dotColor: 'bg-slate-400' },
      { value: 'blocked', label: 'Diblokir Orangtua', count: blockedCount, dotColor: 'bg-rose-500' }
    ];
  }, [students]);

  const isAnyFilterActive =
    selectedAcademicStatus !== 'all' ||
    selectedCohort !== 'all' ||
    selectedClassGroup !== 'all' ||
    selectedAccountStatus !== 'all' ||
    Boolean(search.trim());

  const handleResetAllFilters = () => {
    setSelectedAcademicStatus('all');
    setSelectedCohort('all');
    setSelectedClassGroup('all');
    setSelectedAccountStatus('all');
    setSearch('');
  };

  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      // Filter Status Akademik
      if (selectedAcademicStatus !== 'all') {
        if (selectedAcademicStatus === 'aktif_ta' && !s.is_active_ta) return false;
        if (selectedAcademicStatus === 'lulus' && s.academic_status !== 'lulus') return false;
        if (selectedAcademicStatus === 'pindah' && s.academic_status !== 'pindah' && s.academic_status !== 'keluar') return false;
        if (selectedAcademicStatus === 'non_aktif_ta' && (s.is_active_ta || s.academic_status === 'lulus' || s.academic_status === 'pindah' || s.academic_status === 'keluar')) return false;
      }

      // Filter Angkatan
      if (selectedCohort !== 'all') {
        if (s.cohort_name !== selectedCohort) return false;
      }

      // Filter Kelas Reguler
      if (selectedClassGroup !== 'all') {
        if (s.class_group_name !== selectedClassGroup) return false;
      }

      // Filter Status Akun Kasir
      if (selectedAccountStatus !== 'all') {
        if (selectedAccountStatus === 'active' && (s.status !== 'active' || s.is_blocked_by_parent)) return false;
        if (selectedAccountStatus === 'inactive' && s.status === 'active') return false;
        if (selectedAccountStatus === 'blocked' && !s.is_blocked_by_parent) return false;
      }

      // Filter Pencarian Teks
      if (!search.trim()) return true;
      const term = search.toLowerCase().trim();
      return (
        s.student_name?.toLowerCase().includes(term) ||
        s.class_group_name?.toLowerCase().includes(term) ||
        s.cohort_name?.toLowerCase().includes(term) ||
        s.academic_status_label?.toLowerCase().includes(term) ||
        s.nis?.includes(term) ||
        s.nipd?.includes(term) ||
        s.qr_code?.toLowerCase().includes(term)
      );
    });
  }, [students, search, selectedCohort, selectedAcademicStatus, selectedClassGroup, selectedAccountStatus]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800 tracking-tight flex items-center gap-2.5">
            <span>Data Santri &amp; Dompet Kantin</span>
            {activeAcademicYearName && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-300 text-emerald-800 font-semibold text-xs">
                <Calendar className="w-3 h-3 text-emerald-600" />
                <span>TA Aktif: {activeAcademicYearName}</span>
              </span>
            )}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Daftar santri, rombel kelas TA aktif, identifikasi alumni / pindah, generate gambar QR mandiri &amp; masal
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Tombol Generate QR Masal */}
          <button
            type="button"
            onClick={handleBulkGenerateQr}
            disabled={generatingBulk}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-xs transition disabled:opacity-50 cursor-pointer"
            title="Generate dan simpan gambar QR seluruh santri ke folder penyimpanan server"
          >
            {generatingBulk ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            <span>{generatingBulk ? 'Memproses Masal...' : 'Generate QR Masal'}</span>
          </button>

          {/* Tombol Sinkronisasi dari Akademik */}
          <button
            type="button"
            onClick={handleSyncAcademic}
            disabled={syncing}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-xs transition disabled:opacity-50 cursor-pointer"
          >
            {syncing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            <span>{syncing ? 'Menyinkronkan...' : 'Sinkronkan dari Akademik'}</span>
          </button>
        </div>
      </div>

      {syncAlert && (
        <FlatAlertBanner
          type={syncAlert.type}
          message={syncAlert.message}
          onClose={() => setSyncAlert(null)}
        />
      )}

      {/* Ringkasan Status Santri & Dompet */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-medium">Santri Aktif TA</span>
            <UserCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-lg font-bold text-slate-800 mt-1">{stats.activeTa.toLocaleString('id-ID')}</p>
          <p className="text-[11px] text-emerald-600 font-medium mt-0.5">Terdaftar rombel reguler</p>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-medium">Alumni / Lulus</span>
            <GraduationCap className="w-4 h-4 text-indigo-600" />
          </div>
          <p className="text-lg font-bold text-slate-800 mt-1">{stats.lulus.toLocaleString('id-ID')}</p>
          <p className="text-[11px] text-indigo-600 font-medium mt-0.5">Tercatat status kelulusan</p>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-medium">Pindah / Non-Aktif</span>
            <UserMinus className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-lg font-bold text-slate-800 mt-1">{(stats.mutasi + stats.nonAktifTa).toLocaleString('id-ID')}</p>
          <p className="text-[11px] text-amber-600 font-medium mt-0.5">Mutasi / di luar rombel aktif</p>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-medium">Total Saldo Dompet</span>
            <Wallet className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-lg font-extrabold text-emerald-700 mt-1">Rp{stats.totalWallet.toLocaleString('id-ID')}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Dari {stats.total} total akun</p>
        </div>
      </div>

      {/* Control Search Bar & Modern Custom Dropdown Filters */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        <div className="flex flex-1 flex-wrap items-center gap-2.5">
          {/* Input Pencarian Modern */}
          <div className="relative min-w-[240px] flex-1 max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama santri, NIS, rombel..."
              className="w-full pl-9 pr-8 py-2 bg-slate-50/80 hover:bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/10 transition placeholder:text-slate-400 font-medium"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* 1. Dropdown Status Rombel / Akademik */}
          <FilterDropdown
            label="Status Rombel"
            value={selectedAcademicStatus}
            onChange={setSelectedAcademicStatus}
            options={academicStatusOptions}
            icon={Layers}
            theme="emerald"
          />

          {/* 2. Dropdown Angkatan */}
          <FilterDropdown
            label="Angkatan"
            value={selectedCohort}
            onChange={setSelectedCohort}
            options={cohortDropdownOptions}
            icon={GraduationCap}
            theme="indigo"
          />

          {/* 3. Dropdown Kelas Reguler */}
          <FilterDropdown
            label="Kelas Reguler"
            value={selectedClassGroup}
            onChange={setSelectedClassGroup}
            options={classGroupDropdownOptions}
            icon={School}
            theme="sky"
          />

          {/* 4. Dropdown Status Akun Kasir */}
          <FilterDropdown
            label="Status Kasir"
            value={selectedAccountStatus}
            onChange={setSelectedAccountStatus}
            options={accountStatusOptions}
            icon={ShieldCheck}
            theme="amber"
          />

          {/* Tombol Reset Filter */}
          {isAnyFilterActive && (
            <button
              type="button"
              onClick={handleResetAllFilters}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100/80 border border-rose-200 rounded-xl transition cursor-pointer"
              title="Reset semua filter ke kondisi awal"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Filter</span>
            </button>
          )}
        </div>

        <div className="text-xs text-slate-400 font-medium self-end lg:self-center shrink-0">
          Menampilkan <span className="font-bold text-slate-800">{filteredStudents.length}</span> dari {students.length} Santri
        </div>
      </div>

      {/* Table Santri Kantin */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-6 h-6 text-emerald-600 animate-spin" />
            <p className="text-xs text-slate-400">Memuat data santri kantin...</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Nama Santri &amp; Angkatan</th>
                  <th className="px-4 py-3">Rombel / Kelas (TA Aktif)</th>
                  <th className="px-4 py-3">NIPD / Kode QR Universal</th>
                  <th className="px-4 py-3">Saldo Dompet</th>
                  <th className="px-4 py-3">Limit Harian</th>
                  <th className="px-4 py-3">Status Kasir</th>
                  <th className="px-4 py-3 text-right">Aksi Keamanan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStudents.map((s) => (
                  <tr key={s.student_id} className="hover:bg-slate-50/60 transition">
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-0.5">
                        <p className="font-bold text-slate-800 text-[13px]">{s.student_name}</p>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {s.cohort_name && s.cohort_name !== '-' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-50 border border-indigo-200/60 text-indigo-700 font-semibold text-[10px]">
                              <GraduationCap className="w-3 h-3 text-indigo-500" />
                              <span>{s.cohort_name}</span>
                            </span>
                          )}
                          {(s.nipd || s.nis) && (
                            <span className="text-[10px] text-slate-500 font-mono bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200/60">
                              NIPD: {s.nipd || s.nis}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Kolom Rombel / Kelas dengan penanda Tahun Ajaran Aktif & Alumni/Pindah */}
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1 items-start">
                        {s.is_active_ta ? (
                          <span className="inline-flex items-center gap-1 font-bold text-emerald-800 bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded-md text-[11px]">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            <span>{s.class_group_name || '-'}</span>
                          </span>
                        ) : s.academic_status === 'lulus' ? (
                          <div className="flex flex-col gap-0.5">
                            <span className="inline-flex items-center gap-1 font-semibold text-slate-700 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md text-[11px]">
                              <span>{s.class_group_name || 'Alumni'}</span>
                            </span>
                            <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 border border-indigo-200/60 w-fit">
                              Lulus / Alumni
                            </span>
                          </div>
                        ) : s.academic_status === 'pindah' || s.academic_status === 'keluar' ? (
                          <div className="flex flex-col gap-0.5">
                            <span className="inline-flex items-center gap-1 font-semibold text-rose-700 bg-rose-50 border border-rose-200/60 px-2 py-0.5 rounded-md text-[11px]">
                              <span>{s.class_group_name || 'Mutasi'}</span>
                            </span>
                            <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded bg-rose-100 text-rose-800 w-fit">
                              Pindah / Keluar
                            </span>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-0.5">
                            <span className="inline-flex items-center gap-1 font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md text-[11px]">
                              <span>{s.class_group_name || '-'}</span>
                            </span>
                            <span className="text-[9px] font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200/60 w-fit">
                              Di luar Rombel TA Aktif
                            </span>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Gambar & Kode QR Kasir */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        {s.qr_code ? (
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => setSelectedStudentQr(s)}
                              className="font-mono text-xs font-bold text-emerald-900 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1.5 rounded-lg border border-emerald-300 flex items-center gap-1.5 transition shadow-2xs group cursor-pointer"
                              title="Klik untuk membuka Kartu Digital & Gambar QR"
                            >
                              <QrCode className="w-4 h-4 text-emerald-600 group-hover:scale-110 transition-transform" />
                              <span>{s.qr_code}</span>
                              <span className="text-[10px] font-sans font-medium text-emerald-700 bg-white/90 px-1.5 py-0.5 rounded border border-emerald-200">
                                Buka Kartu
                              </span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleGenerateQr(s.student_id)}
                              disabled={generatingSingleId === s.student_id}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 border border-transparent hover:border-indigo-200 transition cursor-pointer"
                              title="Generate ulang file gambar QR"
                            >
                              {generatingSingleId === s.student_id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                              ) : (
                                <RotateCw className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleGenerateQr(s.student_id)}
                            disabled={generatingSingleId === s.student_id}
                            className="text-xs text-white font-bold flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 px-3 py-1.5 rounded-lg shadow-xs transition cursor-pointer"
                            title="Buat dan simpan gambar QR santri ke folder penyimpanan server"
                          >
                            {generatingSingleId === s.student_id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                            ) : (
                              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                            )}
                            <span>+ Buat Gambar QR</span>
                          </button>
                        )}
                      </div>
                    </td>

                    {/* Saldo Dompet & Tombol Mutasi Cepat */}
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1 items-start">
                        <span className="font-mono font-extrabold text-emerald-700 text-[12px]">
                          Rp{s.wallet_balance.toLocaleString('id-ID')}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setHistoryModalStudent(s)}
                            className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded border border-emerald-200 transition cursor-pointer"
                            title="Lihat seluruh riwayat mutasi dompet santri"
                          >
                            <History className="w-3 h-3 text-emerald-600" />
                            <span>Mutasi</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenOpeningBalance(s)}
                            className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2 py-0.5 rounded border border-indigo-200 transition cursor-pointer"
                            title="Set Saldo Awal Migrasi Sistem Lama (Cutover)"
                          >
                            <Sparkles className="w-3 h-3 text-indigo-600" />
                            <span>+ Saldo Awal</span>
                          </button>
                        </div>
                      </div>
                    </td>

                    {/* Limit Harian */}
                    <td className="px-4 py-3 text-slate-600 font-mono text-[11px]">
                      {s.custom_daily_limit ? `Rp${s.custom_daily_limit.toLocaleString('id-ID')}` : (
                        <span className="text-slate-400 italic">Standar Unit</span>
                      )}
                    </td>

                    {/* Status Kasir */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(s.student_id, s.status)}
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold capitalize transition cursor-pointer ${
                            s.status === 'active'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                              : 'bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200'
                          }`}
                        >
                          {s.status === 'active' ? 'Aktif' : 'Non-Aktif'}
                        </button>
                        {s.is_blocked_by_parent && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                            Blokir Ortu
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Aksi Keamanan PIN & Histori */}
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5 flex-wrap">
                        <button
                          type="button"
                          onClick={() => setHistoryModalStudent(s)}
                          title="Lihat riwayat transaksi top up, tarik tunai & jajan POS"
                          className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-[11px] font-bold transition flex items-center gap-1 cursor-pointer"
                        >
                          <History className="w-3 h-3 text-emerald-600" />
                          <span>Mutasi</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleResetChildPin(s.student_id)}
                          title="Reset PIN Santri Kasir"
                          className="px-2.5 py-1 bg-slate-100 hover:bg-emerald-100 text-slate-700 hover:text-emerald-700 rounded-lg text-[11px] font-semibold transition cursor-pointer"
                        >
                          PIN Santri
                        </button>
                        <button
                          type="button"
                          onClick={() => handleResetParentPin(s.student_id)}
                          title="Reset PIN Akses Orangtua"
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-semibold transition cursor-pointer"
                        >
                          PIN Ortu
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {filteredStudents.length === 0 && (
                  <tr>
                    <td colSpan="7" className="py-12 text-center text-slate-400 italic">
                      Tidak ada data santri yang cocok dengan filter status atau pencarian
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Popup Gambar QR Code Santri */}
      {selectedStudentQr && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 text-center space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <div className="text-left">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                  <QrCode className="w-4 h-4 text-emerald-600" />
                  <span>Kartu Digital QR Universal Santri</span>
                </h3>
                <p className="text-[11px] text-slate-400">Kode QR berisi NIPD untuk transaksi universal di seluruh modul</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedStudentQr(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Container Kartu QR */}
            <div className="p-6 bg-gradient-to-b from-slate-50 via-emerald-50/20 to-emerald-50/50 border-2 border-dashed border-emerald-300 rounded-2xl space-y-4">
              {/* Gambar QR SVG Render Direct / URL */}
              <div className="w-56 h-56 bg-white p-3 border-2 border-slate-200/90 rounded-2xl mx-auto flex items-center justify-center shadow-md overflow-hidden">
                {selectedStudentQr.svg_content ? (
                  <div
                    className="w-full h-full flex items-center justify-center [&>svg]:w-full [&>svg]:h-full [&>svg]:max-w-full [&>svg]:max-h-full"
                    dangerouslySetInnerHTML={{ __html: selectedStudentQr.svg_content }}
                  />
                ) : selectedStudentQr.qr_image_url ? (
                  <img
                    src={selectedStudentQr.qr_image_url}
                    alt={selectedStudentQr.qr_code || 'QR Code'}
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center gap-1 text-slate-400">
                    <QrCode className="w-16 h-16 text-slate-300" />
                    <span className="text-xs font-medium">Belum di-generate</span>
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <p className="font-extrabold text-base text-slate-900">{selectedStudentQr.student_name}</p>
                <div className="flex items-center justify-center gap-2 text-xs text-slate-600 flex-wrap">
                  <span className="font-semibold px-2 py-0.5 rounded bg-slate-200/80 text-slate-700">
                    {selectedStudentQr.class_group_name || 'Rombel -'}
                  </span>
                  {selectedStudentQr.cohort_name && selectedStudentQr.cohort_name !== '-' && (
                    <span className="font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200/60 px-2 py-0.5 rounded">
                      {selectedStudentQr.cohort_name}
                    </span>
                  )}
                  {(selectedStudentQr.nipd || selectedStudentQr.nis) && (
                    <span className="text-slate-500 font-mono bg-white px-2 py-0.5 rounded border border-slate-200">
                      NIPD: {selectedStudentQr.nipd || selectedStudentQr.nis}
                    </span>
                  )}
                </div>
                <div className="pt-1">
                  <span className="font-mono text-xs font-extrabold text-emerald-900 bg-emerald-100 border border-emerald-300 px-3.5 py-1.5 rounded-full inline-block tracking-wider shadow-2xs">
                    NIPD QR: {selectedStudentQr.qr_code}
                  </span>
                </div>
              </div>
            </div>

            {/* Aksi Modal: Unduh, Cetak & Regenerate */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
              <a
                href={
                  selectedStudentQr.svg_content
                    ? `data:image/svg+xml;utf8,${encodeURIComponent(selectedStudentQr.svg_content)}`
                    : selectedStudentQr.qr_image_url || '#'
                }
                download={`${selectedStudentQr.qr_code || 'QR-Santri'}.svg`}
                className="py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition shadow-xs cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Unduh Gambar</span>
              </a>

              <button
                type="button"
                onClick={() => handlePrintCard(selectedStudentQr)}
                className="py-2.5 px-3 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition shadow-xs cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Cetak Kartu</span>
              </button>

              <button
                type="button"
                onClick={() => handleGenerateQr(selectedStudentQr.student_id)}
                disabled={generatingSingleId === selectedStudentQr.student_id}
                className="py-2.5 px-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
                title="Generate ulang file gambar QR"
              >
                {generatingSingleId === selectedStudentQr.student_id ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                ) : (
                  <RotateCw className="w-3.5 h-3.5" />
                )}
                <span>Regenerate</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Notifikasi Reset PIN */}
      {pinModalData && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 mx-auto flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">{pinModalData.title}</h3>
              <p className="text-xs text-slate-500 mt-1">{pinModalData.note}</p>
            </div>
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-xs text-slate-400 uppercase font-semibold">PIN Baru</span>
              <p className="text-2xl font-mono font-bold text-emerald-700 tracking-widest mt-0.5">
                {pinModalData.pin}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setPinModalData(null)}
              className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition cursor-pointer"
            >
              Saya Mengerti
            </button>
          </div>
        </div>
      )}

      {/* Modal Riwayat Mutasi Dompet Santri Lengkap (Top Up, Tarik Tunai, Jajan POS) */}
      <StudentWalletHistoryModal
        isOpen={!!historyModalStudent}
        onClose={() => setHistoryModalStudent(null)}
        student={historyModalStudent}
        apiEndpoint="/kantin/wallet-transactions"
      />

      {/* Modal Input Saldo Awal Migrasi (Cutover Balance) */}
      {openingBalanceStudent && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Set Saldo Awal Migrasi Dompet</h3>
                  <p className="text-[11px] text-slate-400">Migrasi saldo dari sistem lama (Cutover)</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpeningBalanceStudent(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Info Santri Terpilih */}
            <div className="p-3.5 bg-indigo-50/50 rounded-xl border border-indigo-100 space-y-1 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 text-sm">{openingBalanceStudent.student_name}</span>
                <span className="font-mono text-emerald-800 font-bold bg-white px-2 py-0.5 rounded border border-emerald-200">
                  Saldo Saat Ini: Rp{(openingBalanceStudent.wallet_balance || 0).toLocaleString('id-ID')}
                </span>
              </div>
              <div className="text-slate-500 text-[11px]">
                {openingBalanceStudent.class_group_name || 'Rombel -'} • NIPD: {openingBalanceStudent.nipd || openingBalanceStudent.nis || '-'}
              </div>
            </div>

            {openingBalanceError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{openingBalanceError}</span>
              </div>
            )}

            {openingBalanceSuccess && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
                <span>{openingBalanceSuccess}</span>
              </div>
            )}

            <form onSubmit={handleSubmitOpeningBalance} className="space-y-3.5">
              {/* Nominal Saldo Awal */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nominal Saldo Awal Bawaan (Rp) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  min={1}
                  required
                  value={openingBalanceAmount}
                  onChange={(e) => setOpeningBalanceAmount(e.target.value)}
                  placeholder="Contoh: 150000"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold font-mono text-slate-800 focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              {/* Tanggal Cutover */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Tanggal Cutover / Migrasi
                </label>
                <input
                  type="date"
                  required
                  value={openingBalanceDate}
                  onChange={(e) => setOpeningBalanceDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700"
                />
              </div>

              {/* Rekening Kas Penampung */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Rekening Kas / Bank Penampung Titipan
                </label>
                <select
                  value={openingBalanceCashAccountId}
                  onChange={(e) => setOpeningBalanceCashAccountId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700"
                >
                  {cashAccounts.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.account_kind === 'bank' ? a.bank_name || 'Bank' : 'Kas Tunai'})
                    </option>
                  ))}
                </select>
              </div>

              {/* Catatan / No Referensi */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Catatan / No. Referensi Sistem Lama
                </label>
                <input
                  type="text"
                  value={openingBalanceNotes}
                  onChange={(e) => setOpeningBalanceNotes(e.target.value)}
                  placeholder="No ID / Buku Tabungan sistem lama..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700"
                />
              </div>

              {/* Accounting Preview */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-[10.5px] space-y-1 font-mono text-slate-600">
                <div className="font-bold text-slate-700 font-sans text-[11px] mb-1">Alokasi Jurnal Akuntansi:</div>
                <div className="text-emerald-700 font-semibold">[DEBET] Kas / Bank Kantin</div>
                <div className="text-slate-500 pl-3">[KREDIT] 404 - Dana Titipan Dompet Santri</div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setOpeningBalanceStudent(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={openingBalanceLoading || !openingBalanceAmount}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition disabled:opacity-50 flex items-center gap-1.5"
                >
                  {openingBalanceLoading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Simpan Saldo Awal</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
