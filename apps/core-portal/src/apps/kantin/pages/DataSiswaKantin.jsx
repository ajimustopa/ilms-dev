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
  History,
  CheckSquare,
  Square,
  FileText,
  LayoutGrid,
  Settings2,
  Maximize2,
  Sliders,
  Eye,
  EyeOff,
  Scissors,
  CreditCard,
  Trash2
} from 'lucide-react';

const PAPER_OPTIONS = [
  { value: 'a4', label: 'A4 (210 × 297 mm)', width: 210, height: 297, desc: 'Standar kertas kantor' },
  { value: 'f4', label: 'F4 / Folio (215 × 330 mm)', width: 215, height: 330, desc: 'Kertas F4 / Folio Indonesia' },
  { value: 'letter', label: 'Letter (215.9 × 279.4 mm)', width: 215.9, height: 279.4, desc: 'Standar US Letter' },
  { value: 'a3', label: 'A3 (297 × 420 mm)', width: 297, height: 420, desc: 'Ukuran Besar A3' },
  { value: 'custom', label: 'Ukuran Kertas Kustom (mm)', width: 210, height: 297, desc: 'Tentukan panjang & lebar kertas sendiri' }
];

const CARD_OPTIONS = [
  { value: 'label_standard', label: 'Slip Label Standar (95 × 52 mm - ~10 slip/A4)', width: 95.0, height: 52.0, desc: 'Format ideal slip gunting pembagian ke santri (2 kolom × 5 baris)', is_label: true },
  { value: 'label_compact', label: 'Slip Label Hemat / Compact (64 × 38 mm - ~21 slip/A4)', width: 64.0, height: 38.0, desc: 'Format mini hemat kertas untuk santri banyak (3 kolom × 7 baris)', is_label: true },
  { value: 'label_mini', label: 'Slip Mini Strip (95 × 36 mm - ~14 slip/A4)', width: 95.0, height: 36.0, desc: 'Format pita horizontal ramping (2 kolom × 7 baris)', is_label: true },
  { value: 'cr80', label: 'Standar ID Card / CR80 (85.6 × 54 mm)', width: 85.6, height: 54.0, desc: 'Ukuran kartu ATM / KTP / Kartu PVC', is_label: false },
  { value: 'b2', label: 'Ukuran B2 (106 × 82 mm)', width: 106.0, height: 82.0, desc: 'Ukuran Name Tag B2 Landscape', is_label: false },
  { value: 'b3', label: 'Ukuran B3 (124 × 95 mm)', width: 124.0, height: 95.0, desc: 'Ukuran Name Tag B3 Landscape', is_label: false },
  { value: 'compact', label: 'Ukuran Compact (70 × 45 mm)', width: 70.0, height: 45.0, desc: 'Ukuran Mini Hemat Kertas', is_label: false },
  { value: 'a6_landscape', label: 'Ukuran A6 Landscape (148 × 105 mm)', width: 148.0, height: 105.0, desc: 'Ukuran Kartu Besar A6', is_label: false },
  { value: 'custom', label: 'Ukuran Kartu/Slip Kustom (mm)', width: 95.0, height: 52.0, desc: 'Tentukan dimensi kartu/slip sendiri', is_label: true }
];

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

  // State Cetak Kartu & Label PIN Siswa PDF (Multi-Selection & Layout Config)
  const [selectedStudentIds, setSelectedStudentIds] = useState(new Set());
  const [printModalOpen, setPrintModalOpen] = useState(false);
  const [showPinOnTable, setShowPinOnTable] = useState(false);
  const [printConfig, setPrintConfig] = useState({
    paper_size: 'a4',
    paper_orientation: 'portrait',
    custom_paper_width_mm: 210,
    custom_paper_height_mm: 297,
    card_size: 'label_standard',
    custom_card_width_mm: 95.0,
    custom_card_height_mm: 52.0,
    margin_mm: 8,
    gap_mm: 3,
    show_cutting_lines: true,
    show_pin: true,
    show_qr: true,
    show_class: true,
    regenerate_pins: false
  });
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [printSearch, setPrintSearch] = useState('');

  // State Generate Masal PIN Santri
  const [bulkPinModalOpen, setBulkPinModalOpen] = useState(false);
  const [generatingBulkPin, setGeneratingBulkPin] = useState(false);
  const [bulkPinConfig, setBulkPinConfig] = useState({
    scope: 'selected', // 'selected' | 'filtered' | 'all'
    target_type: 'child', // 'child' | 'parent' | 'both'
    pin_mode: 'random', // 'random' | 'fixed'
    custom_pin: '123456',
    auto_open_print: true
  });
  const [deactivatingInactive, setDeactivatingInactive] = useState(false);

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
      const jrnInfo = resData?.journal_number ? ` [Ref: ${resData.journal_number}]` : '';

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

  // Data Siswa Terfilter (Live Filter & Search)
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

  // Handlers Pemilihan Siswa untuk Cetak Kartu / Label PIN
  const handleToggleSelectStudent = (studentId) => {
    setSelectedStudentIds(prev => {
      const next = new Set(prev);
      if (next.has(studentId)) {
        next.delete(studentId);
      } else {
        next.add(studentId);
      }
      return next;
    });
  };

  const handleSelectAllFiltered = (filteredList) => {
    setSelectedStudentIds(prev => {
      const next = new Set(prev);
      filteredList.forEach(s => next.add(s.student_id));
      return next;
    });
  };

  const handleDeselectAllFiltered = (filteredList) => {
    setSelectedStudentIds(prev => {
      const next = new Set(prev);
      filteredList.forEach(s => next.delete(s.student_id));
      return next;
    });
  };

  const handleClearAllSelected = () => {
    setSelectedStudentIds(new Set());
  };

  const handleOpenPrintModal = (singleStudent = null) => {
    if (singleStudent) {
      setSelectedStudentIds(new Set([singleStudent.student_id]));
    } else if (selectedStudentIds.size === 0) {
      // Jika belum ada yang dipilih, otomatis pilih semua siswa dari filter aktif
      const allFilteredIds = new Set(filteredStudents.map(s => s.student_id));
      setSelectedStudentIds(allFilteredIds);
    }
    setPrintModalOpen(true);
  };

  // Eksekusi Pembuatan File PDF Label PIN / Kartu
  const handleExecutePrintPdf = async (actionType = 'open') => {
    const targetStudents = students.filter(s => selectedStudentIds.has(s.student_id));
    if (targetStudents.length === 0) {
      alert('Pilih minimal satu santri untuk dicetak.');
      return;
    }

    if (printConfig.regenerate_pins) {
      const confirmRegen = window.confirm(
        `PERHATIAN: Anda memilih opsi "Generate PIN Baru (Acak 6-Digit)".\n\nSebanyak ${targetStudents.length} santri yang dipilih akan diberikan PIN baru secara acak dan langsung disimpan ke database.\n\nLanjutkan proses cetak & reset PIN?`
      );
      if (!confirmRegen) return;
    }

    setGeneratingPdf(true);
    try {
      const payload = {
        student_ids: targetStudents.map(s => s.student_id),
        paper_size: printConfig.paper_size,
        paper_orientation: printConfig.paper_orientation,
        custom_paper_width_mm: printConfig.custom_paper_width_mm,
        custom_paper_height_mm: printConfig.custom_paper_height_mm,
        card_size: printConfig.card_size,
        custom_card_width_mm: printConfig.custom_card_width_mm,
        custom_card_height_mm: printConfig.custom_card_height_mm,
        margin_mm: printConfig.margin_mm,
        gap_mm: printConfig.gap_mm,
        show_cutting_lines: printConfig.show_cutting_lines,
        show_pin: printConfig.show_pin,
        show_qr: printConfig.show_qr,
        show_class: printConfig.show_class,
        regenerate_pins: printConfig.regenerate_pins
      };

      const res = await api.post('/kantin/canteen-students/print-cards-pdf', payload, {
        responseType: 'blob'
      });

      const blob = new Blob([res.data], { type: 'application/pdf' });
      const blobUrl = URL.createObjectURL(blob);
      const downloadName = printConfig.show_pin
        ? `slip-label-pin-santri-${targetStudents.length}-siswa.pdf`
        : `kartu-santri-kantin-${targetStudents.length}-siswa.pdf`;

      if (actionType === 'open') {
        const printWindow = window.open(blobUrl, '_blank');
        if (!printWindow) {
          // Fallback jika pop-up terblokir
          const link = document.createElement('a');
          link.href = blobUrl;
          link.download = downloadName;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
      } else {
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = downloadName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }

      if (printConfig.regenerate_pins) {
        fetchStudents();
      }
    } catch (err) {
      console.error('Error generating PDF:', err);
      alert('Gagal membuat file PDF: ' + (err.response?.data?.message || err.message));
    } finally {
      setGeneratingPdf(false);
    }
  };

  // Kalkulasi Estimasi Layout Kartu per Lembar Kertas
  const printLayoutEstimate = useMemo(() => {
    const paperDef = PAPER_OPTIONS.find(p => p.value === printConfig.paper_size) || PAPER_OPTIONS[0];
    let pW = printConfig.paper_size === 'custom' ? (parseFloat(printConfig.custom_paper_width_mm) || 210) : paperDef.width;
    let pH = printConfig.paper_size === 'custom' ? (parseFloat(printConfig.custom_paper_height_mm) || 297) : paperDef.height;

    if (printConfig.paper_orientation === 'landscape') {
      const t = pW;
      pW = Math.max(pW, pH);
      pH = Math.min(t, pH);
    } else {
      const t = pW;
      pW = Math.min(pW, pH);
      pH = Math.max(t, pH);
    }

    const cardDef = CARD_OPTIONS.find(c => c.value === printConfig.card_size) || CARD_OPTIONS[0];
    let rawCW = printConfig.card_size === 'custom' ? (parseFloat(printConfig.custom_card_width_mm) || 85.6) : cardDef.width;
    let rawCH = printConfig.card_size === 'custom' ? (parseFloat(printConfig.custom_card_height_mm) || 54.0) : cardDef.height;

    // Kartu selalu landscape (lebar >= tinggi)
    const cW = Math.max(rawCW, rawCH);
    const cH = Math.min(rawCW, rawCH);

    const margin = parseFloat(printConfig.margin_mm) || 8;
    const gap = parseFloat(printConfig.gap_mm) || 4;

    const availW = Math.max(0, pW - (2 * margin));
    const availH = Math.max(0, pH - (2 * margin));

    const cols = Math.max(1, Math.floor((availW + gap) / (cW + gap)));
    const rows = Math.max(1, Math.floor((availH + gap) / (cH + gap)));
    const cardsPerPage = cols * rows;
    const selectedCount = selectedStudentIds.size;
    const totalPages = selectedCount > 0 ? Math.ceil(selectedCount / cardsPerPage) : 1;

    return {
      pW,
      pH,
      cW,
      cH,
      cols,
      rows,
      cardsPerPage,
      totalPages,
      selectedCount
    };
  }, [printConfig, selectedStudentIds]);

  // Santri contoh untuk live preview di modal
  const sampleStudentForPreview = useMemo(() => {
    const selectedList = students.filter(s => selectedStudentIds.has(s.student_id));
    if (selectedList.length > 0) return selectedList[0];
    if (filteredStudents.length > 0) return filteredStudents[0];
    return students[0] || {
      student_name: 'AHMAD DAFI FAKHRUDIN',
      nipd: '2024001',
      nis: '2024001',
      class_group_name: '10 IPA 1',
      child_pin: '123456',
      qr_code: '2024001'
    };
  }, [students, selectedStudentIds, filteredStudents]);

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

  // Handler Buka & Eksekusi Generate Masal PIN
  const handleOpenBulkPinModal = (scope = 'auto') => {
    let initialScope = 'selected';
    if (scope === 'all') {
      initialScope = 'all';
    } else if (scope === 'filtered' || selectedStudentIds.size === 0) {
      initialScope = 'filtered';
    }
    setBulkPinConfig(prev => ({
      ...prev,
      scope: initialScope
    }));
    setBulkPinModalOpen(true);
  };

  const handleExecuteBulkPin = async () => {
    let targetIds = [];
    if (bulkPinConfig.scope === 'selected') {
      targetIds = Array.from(selectedStudentIds);
      if (targetIds.length === 0) {
        targetIds = filteredStudents.map(s => s.student_id);
      }
    } else if (bulkPinConfig.scope === 'filtered') {
      targetIds = filteredStudents.map(s => s.student_id);
    } else if (bulkPinConfig.scope === 'all') {
      targetIds = students.map(s => s.student_id);
    }

    if (targetIds.length === 0) {
      alert('Tidak ada data santri yang dapat diproses untuk generate PIN.');
      return;
    }

    const typeText = bulkPinConfig.target_type === 'both'
      ? 'PIN Santri (Kasir) & PIN Orangtua'
      : (bulkPinConfig.target_type === 'parent' ? 'PIN Orangtua' : 'PIN Santri (Kasir)');
    const modeText = bulkPinConfig.pin_mode === 'fixed'
      ? `PIN seragam "${bulkPinConfig.custom_pin || '123456'}"`
      : '6-digit PIN acak baru';

    const confirmMsg = `Konfirmasi Generate Masal PIN:\n\n` +
      `• Target: ${targetIds.length} Santri (${bulkPinConfig.scope === 'all' ? 'Seluruh Santri Unit' : (bulkPinConfig.scope === 'filtered' ? 'Hasil Filter Tabel' : 'Santri yang Dicentang')})\n` +
      `• Jenis PIN: ${typeText}\n` +
      `• Pola PIN: ${modeText}\n\n` +
      `Lanjutkan proses generate PIN masal ini?`;

    if (!window.confirm(confirmMsg)) return;

    setGeneratingBulkPin(true);
    try {
      const payload = {
        student_ids: targetIds,
        target_type: bulkPinConfig.target_type,
        pin_mode: bulkPinConfig.pin_mode,
        custom_pin: bulkPinConfig.custom_pin
      };

      const res = await api.post('/kantin/canteen-students/bulk-reset-pin', payload);
      setSyncAlert({
        type: 'success',
        message: res.data?.message || `Berhasil men-generate PIN untuk ${targetIds.length} santri!`
      });

      // Sinkronkan pilihan santri agar jika cetak label langsung dipilih
      setSelectedStudentIds(new Set(targetIds));

      await fetchStudents();
      setBulkPinModalOpen(false);

      if (bulkPinConfig.auto_open_print) {
        setPrintConfig(prev => ({
          ...prev,
          show_pin: true,
          regenerate_pins: false
        }));
        setPrintModalOpen(true);
      }
    } catch (err) {
      console.error('Error bulk resetting PIN:', err);
      alert(err.response?.data?.message || err.message || 'Gagal generate PIN masal');
    } finally {
      setGeneratingBulkPin(false);
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

  // Handler Nonaktifkan Siswa Alumni & Keluar Secara Masal
  const handleDeactivateAlumniAndKeluar = async () => {
    const activeAlumniOrKeluar = students.filter(
      s => (s.academic_status === 'lulus' || s.academic_status === 'pindah' || s.academic_status === 'keluar' || s.academic_status === 'drop_out') && s.status === 'active'
    );

    const countText = activeAlumniOrKeluar.length > 0
      ? `Ditemukan ${activeAlumniOrKeluar.length} santri berstatus Alumni/Keluar yang saat ini MASIH AKTIF di kasir.`
      : 'Saat ini seluruh santri alumni dan keluar sudah berstatus Non-Aktif.';

    const confirmMsg = `Konfirmasi Nonaktifkan Santri Alumni & Keluar:\n\n` +
      `Sistem akan menonaktifkan status akun kasir untuk seluruh santri yang berstatus Alumni / Lulus dan Mutasi / Pindah / Keluar agar tidak dapat melakukan transaksi jajan di kasir kantin.\n\n` +
      `${countText}\n\n` +
      `Lanjutkan proses penonaktifan santri alumni & keluar?`;

    if (!window.confirm(confirmMsg)) return;

    setDeactivatingInactive(true);
    setSyncAlert(null);
    try {
      const res = await api.post('/kantin/canteen-students/deactivate-inactive', {
        include_alumni: true,
        include_mutasi: true
      });
      setSyncAlert({
        type: 'success',
        message: res.data?.message || 'Santri alumni dan keluar berhasil dinonaktifkan!'
      });
      fetchStudents();
    } catch (err) {
      console.error('Error deactivating alumni & keluar:', err);
      setSyncAlert({
        type: 'error',
        message: err.response?.data?.message || err.message || 'Gagal menonaktifkan santri alumni/keluar'
      });
    } finally {
      setDeactivatingInactive(false);
    }
  };

  // Handler Bulk Toggle Status Kasir untuk Santri yang Dicentang
  const handleBulkSetStatus = async (targetStatus) => {
    const targetIds = Array.from(selectedStudentIds);
    if (targetIds.length === 0) return;

    const actionText = targetStatus === 'active' ? 'Mengaktifkan' : 'Menonaktifkan';
    if (!window.confirm(`${actionText} status akun kasir untuk ${targetIds.length} santri yang dipilih?`)) return;

    try {
      await Promise.all(
        targetIds.map(sId =>
          api.patch(`/kantin/canteen-students/${sId}/status`, { status: targetStatus }).catch(() => null)
        )
      );
      setSyncAlert({
        type: 'success',
        message: `Status kasir untuk ${targetIds.length} santri berhasil diubah menjadi ${targetStatus === 'active' ? 'Aktif' : 'Non-Aktif'}.`
      });
      fetchStudents();
    } catch (err) {
      alert('Gagal mengubah status santri: ' + (err.response?.data?.message || err.message));
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
          {/* Tombol Nonaktifkan Siswa Alumni & Keluar */}
          <button
            type="button"
            onClick={handleDeactivateAlumniAndKeluar}
            disabled={deactivatingInactive}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer hover:shadow-md disabled:opacity-50"
            title="Nonaktifkan akun kasir santri alumni (lulus) dan yang sudah pindah/keluar"
          >
            {deactivatingInactive ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <UserX className="w-4 h-4 text-rose-200" />
            )}
            <span>{deactivatingInactive ? 'Menonaktifkan...' : 'Nonaktifkan Alumni & Keluar'}</span>
          </button>

          {/* Tombol Generate Masal PIN */}
          <button
            type="button"
            onClick={() => handleOpenBulkPinModal('auto')}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer hover:shadow-md hover:scale-[1.02] active:scale-[0.98]"
            title="Generate PIN santri atau PIN orangtua secara masal (acak 6-digit atau PIN default)"
          >
            <KeyRound className="w-4 h-4 text-amber-200" />
            <span>Generate Masal PIN</span>
            {selectedStudentIds.size > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-white text-amber-950 font-extrabold text-[10px]">
                {selectedStudentIds.size}
              </span>
            )}
          </button>

          {/* Tombol Cetak Label PIN & Kartu Santri (PDF) */}
          <button
            type="button"
            onClick={() => handleOpenPrintModal()}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer border border-slate-700 hover:shadow-md"
            title="Cetak slip label PIN santri (format gunting) atau kartu santri format PDF multi-halaman"
          >
            <Scissors className="w-4 h-4 text-emerald-400" />
            <span>Cetak Label PIN &amp; Kartu (PDF)</span>
            {selectedStudentIds.size > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-emerald-500 text-slate-950 font-extrabold text-[10px]">
                {selectedStudentIds.size}
              </span>
            )}
          </button>

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

        <div className="flex items-center gap-3 self-end lg:self-center shrink-0">
          {selectedStudentIds.size > 0 && (
            <button
              type="button"
              onClick={handleClearAllSelected}
              className="text-xs font-semibold text-rose-600 hover:text-rose-700 hover:underline cursor-pointer"
            >
              Batalkan ({selectedStudentIds.size})
            </button>
          )}
          <div className="text-xs text-slate-400 font-medium">
            Menampilkan <span className="font-bold text-slate-800">{filteredStudents.length}</span> dari {students.length} Santri
          </div>
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
                  <th className="px-3 py-3 w-10 text-center">
                    <button
                      type="button"
                      onClick={() => {
                        const allFilteredSelected = filteredStudents.length > 0 && filteredStudents.every(s => selectedStudentIds.has(s.student_id));
                        if (allFilteredSelected) {
                          handleDeselectAllFiltered(filteredStudents);
                        } else {
                          handleSelectAllFiltered(filteredStudents);
                        }
                      }}
                      className="p-1 rounded-md text-slate-400 hover:text-emerald-600 transition cursor-pointer"
                      title="Pilih seluruh santri pada tabel ini"
                    >
                      {filteredStudents.length > 0 && filteredStudents.every(s => selectedStudentIds.has(s.student_id)) ? (
                        <CheckSquare className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-400" />
                      )}
                    </button>
                  </th>
                  <th className="px-4 py-3">Nama Santri &amp; Angkatan</th>
                  <th className="px-4 py-3">Rombel / Kelas (TA Aktif)</th>
                  <th className="px-4 py-3">NIPD / Kode QR Universal</th>
                  <th className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <span>PIN Kasir</span>
                      <button
                        type="button"
                        onClick={() => setShowPinOnTable(!showPinOnTable)}
                        className="p-1 rounded text-slate-400 hover:text-emerald-700 transition cursor-pointer"
                        title={showPinOnTable ? 'Sembunyikan PIN' : 'Tampilkan PIN'}
                      >
                        {showPinOnTable ? <EyeOff className="w-3.5 h-3.5 text-emerald-600" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </th>
                  <th className="px-4 py-3">Saldo Dompet</th>
                  <th className="px-4 py-3">Limit Harian</th>
                  <th className="px-4 py-3">Status Kasir</th>
                  <th className="px-4 py-3 text-right">Aksi &amp; Keamanan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStudents.map((s) => {
                  const isSelected = selectedStudentIds.has(s.student_id);
                  return (
                    <tr
                      key={s.student_id}
                      className={`transition ${
                        isSelected ? 'bg-emerald-50/40 hover:bg-emerald-50/60' : 'hover:bg-slate-50/60'
                      }`}
                    >
                      {/* Checkbox Kolom */}
                      <td className="px-3 py-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleSelectStudent(s.student_id)}
                          className="p-1 rounded-md transition cursor-pointer"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-emerald-600" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-300 hover:text-slate-500" />
                          )}
                        </button>
                      </td>

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

                      {/* Kolom PIN Kasir */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-xs font-bold text-emerald-950 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-200 tracking-wider">
                            {showPinOnTable ? (s.child_pin || '123456') : '••••••'}
                          </span>
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

                      {/* Aksi Cetak Kartu, Keamanan PIN & Histori */}
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5 flex-wrap">
                          {/* Tombol Cetak Slip Label Individual */}
                          <button
                            type="button"
                            onClick={() => handleOpenPrintModal(s)}
                            title="Cetak slip label PIN santri format PDF"
                            className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-[11px] font-bold transition flex items-center gap-1 cursor-pointer shadow-2xs"
                          >
                            <Scissors className="w-3 h-3 text-emerald-400" />
                            <span>Cetak Slip</span>
                          </button>
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
                  );
                })}

                {filteredStudents.length === 0 && (
                  <tr>
                    <td colSpan="9" className="py-12 text-center text-slate-400 italic">
                      Tidak ada data santri yang cocok dengan filter status atau pencarian
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Floating Bottom Multi-Select Action Bar */}
      {selectedStudentIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-slate-900/95 text-white border border-slate-700/80 shadow-2xl rounded-2xl px-5 py-3 flex items-center gap-3.5 backdrop-blur-md animate-in slide-in-from-bottom-4 duration-200 flex-wrap sm:flex-nowrap">
          <div className="flex items-center gap-2 pr-3 border-r border-slate-700">
            <span className="w-6 h-6 rounded-lg bg-emerald-500 text-slate-950 flex items-center justify-center font-black text-xs">
              {selectedStudentIds.size}
            </span>
            <span className="text-xs font-bold text-slate-200">Santri Dipilih</span>
          </div>

          <button
            type="button"
            onClick={() => handleOpenBulkPinModal('selected')}
            className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-[0.98]"
          >
            <KeyRound className="w-3.5 h-3.5 text-amber-200" />
            <span>Generate PIN ({selectedStudentIds.size})</span>
          </button>

          <button
            type="button"
            onClick={() => handleOpenPrintModal()}
            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-[0.98]"
          >
            <Scissors className="w-3.5 h-3.5 text-emerald-200" />
            <span>Cetak Slip Label ({selectedStudentIds.size})</span>
          </button>

          <button
            type="button"
            onClick={() => handleBulkSetStatus('inactive')}
            className="px-3 py-1.5 bg-rose-600/90 hover:bg-rose-600 text-white rounded-xl text-xs font-semibold transition flex items-center gap-1 cursor-pointer shadow-xs"
            title="Nonaktifkan akun santri terpilih di kasir"
          >
            <UserX className="w-3.5 h-3.5" />
            <span>Nonaktifkan</span>
          </button>

          <button
            type="button"
            onClick={() => handleBulkSetStatus('active')}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition flex items-center gap-1 cursor-pointer"
            title="Aktifkan kembali akun santri terpilih di kasir"
          >
            <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Aktifkan</span>
          </button>

          <button
            type="button"
            onClick={handleClearAllSelected}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition cursor-pointer ml-1"
            title="Batal pilih semua"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

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
                onClick={() => handleOpenPrintModal(selectedStudentQr)}
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

      {/* Floating Bulk Action Bar */}
      {selectedStudentIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 animate-in fade-in slide-in-from-bottom-5 duration-200">
          <div className="bg-slate-900/95 text-white px-5 py-3 rounded-2xl shadow-2xl border border-slate-700 backdrop-blur-md flex items-center gap-4">
            <div className="flex items-center gap-2 pr-2 border-r border-slate-700">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-bold font-mono text-emerald-400">
                {selectedStudentIds.size} Santri Terpilih
              </span>
            </div>

            <button
              type="button"
              onClick={() => handleOpenPrintModal()}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-xl text-xs shadow-lg hover:shadow-emerald-500/25 transition flex items-center gap-1.5 cursor-pointer"
            >
              <Scissors className="w-4 h-4" />
              <span>Cetak Label PIN &amp; Kartu ({selectedStudentIds.size})</span>
            </button>

            <button
              type="button"
              onClick={handleClearAllSelected}
              className="text-xs font-medium text-slate-400 hover:text-slate-200 px-2 py-1 rounded-lg transition cursor-pointer"
            >
              Batal
            </button>
          </div>
        </div>
      )}

      {/* Modal Cetak Label PIN & Kartu PDF Terintegrasi */}
      {printModalOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 animate-in fade-in duration-150 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-4xl w-full shadow-2xl border border-slate-100 overflow-hidden my-auto flex flex-col max-h-[94vh]">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400">
                  <Scissors className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold flex items-center gap-2">
                    <span>Cetak Label PIN &amp; Kartu Santri (Format PDF)</span>
                    <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                      Siap Gunting &amp; Distribusi
                    </span>
                  </h3>
                  <p className="text-xs text-slate-300">
                    Menghasilkan lembar PDF berisi label PIN, nama, NIPD, dan QR santri yang siap digunting untuk dibagikan ke siswa.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setPrintModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body: 2 Kolom Layout */}
            <div className="p-6 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Kolom Kiri: Pengaturan Template & Kertas (7 cols) */}
              <div className="lg:col-span-7 space-y-4">
                {/* Mode Pilihan Cepat: Slip Label vs ID Card */}
                <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-2xl border border-slate-200">
                  <button
                    type="button"
                    onClick={() => {
                      setPrintConfig(prev => ({
                        ...prev,
                        card_size: 'label_standard',
                        show_pin: true,
                        show_qr: true,
                        show_class: true,
                        show_cutting_lines: true
                      }));
                    }}
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                      printConfig.card_size.startsWith('label_')
                        ? 'bg-white text-emerald-900 shadow-xs border border-emerald-300 font-extrabold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Scissors className="w-4 h-4 text-emerald-600" />
                    <span>Mode Slip Label Gunting</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPrintConfig(prev => ({
                        ...prev,
                        card_size: 'cr80',
                        show_pin: false
                      }));
                    }}
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                      !printConfig.card_size.startsWith('label_')
                        ? 'bg-white text-emerald-900 shadow-xs border border-emerald-300 font-extrabold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <CreditCard className="w-4 h-4 text-emerald-600" />
                    <span>Mode Kartu ID Card (PVC)</span>
                  </button>
                </div>

                {/* 1. Pengaturan Template & Dimensi Slip / Kartu */}
                <div className="p-4 bg-emerald-50/40 rounded-2xl border border-emerald-200/60 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-600" />
                      <span>1. Template &amp; Dimensi Label</span>
                    </span>
                    <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                      Ukuran: {printLayoutEstimate.cW} × {printLayoutEstimate.cH} mm
                    </span>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Preset Template Label / Kartu</label>
                    <select
                      value={printConfig.card_size}
                      onChange={(e) => setPrintConfig(prev => ({ ...prev, card_size: e.target.value }))}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-hidden focus:border-emerald-500 cursor-pointer"
                    >
                      {CARD_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Custom Ukuran Kartu jika dipilih */}
                  {printConfig.card_size === 'custom' && (
                    <div className="grid grid-cols-2 gap-3 pt-1 border-t border-emerald-200/50">
                      <div>
                        <label className="block text-[10.5px] font-medium text-slate-500 mb-0.5">Lebar Label (mm)</label>
                        <input
                          type="number"
                          min={20}
                          max={300}
                          step={1}
                          value={printConfig.custom_card_width_mm}
                          onChange={(e) => setPrintConfig(prev => ({ ...prev, custom_card_width_mm: e.target.value }))}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono font-bold"
                        />
                      </div>
                      <div>
                        <label className="block text-[10.5px] font-medium text-slate-500 mb-0.5">Tinggi Label (mm)</label>
                        <input
                          type="number"
                          min={20}
                          max={300}
                          step={1}
                          value={printConfig.custom_card_height_mm}
                          onChange={(e) => setPrintConfig(prev => ({ ...prev, custom_card_height_mm: e.target.value }))}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono font-bold"
                        />
                      </div>
                    </div>
                  )}

                  {/* Pilihan Elemen Data yang Ditampilkan */}
                  <div className="pt-2 border-t border-emerald-200/60 space-y-2">
                    <span className="block text-[10.5px] font-bold text-slate-600 uppercase tracking-wider">
                      Elemen Data pada Slip Label:
                    </span>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <label className="flex items-center gap-2 text-slate-700 font-semibold cursor-pointer">
                        <input
                          type="checkbox"
                          checked={printConfig.show_pin}
                          onChange={(e) => setPrintConfig(prev => ({ ...prev, show_pin: e.target.checked }))}
                          className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                        />
                        <span>Sertakan PIN Transaksi</span>
                      </label>
                      <label className="flex items-center gap-2 text-slate-700 font-medium cursor-pointer">
                        <input
                          type="checkbox"
                          checked={printConfig.show_qr}
                          onChange={(e) => setPrintConfig(prev => ({ ...prev, show_qr: e.target.checked }))}
                          className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                        />
                        <span>Sertakan Kode QR NIPD</span>
                      </label>
                      <label className="flex items-center gap-2 text-slate-700 font-medium cursor-pointer">
                        <input
                          type="checkbox"
                          checked={printConfig.show_class}
                          onChange={(e) => setPrintConfig(prev => ({ ...prev, show_class: e.target.checked }))}
                          className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                        />
                        <span>Sertakan Info Kelas / Rombel</span>
                      </label>
                      <label className="flex items-center gap-2 text-slate-700 font-medium cursor-pointer">
                        <input
                          type="checkbox"
                          checked={printConfig.show_cutting_lines}
                          onChange={(e) => setPrintConfig(prev => ({ ...prev, show_cutting_lines: e.target.checked }))}
                          className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                        />
                        <span>Garis Potong Putus-putus (✂)</span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* 2. Opsi Regenerasi PIN Masal Sebelum Cetak */}
                <div className="p-3.5 bg-amber-50/70 rounded-2xl border border-amber-200/80 space-y-2">
                  <div className="flex items-start gap-2.5">
                    <input
                      type="checkbox"
                      id="regenerate_pins_checkbox"
                      checked={printConfig.regenerate_pins}
                      onChange={(e) => setPrintConfig(prev => ({ ...prev, regenerate_pins: e.target.checked }))}
                      className="mt-0.5 rounded text-amber-600 focus:ring-amber-500 w-4 h-4 cursor-pointer"
                    />
                    <label htmlFor="regenerate_pins_checkbox" className="text-xs cursor-pointer select-none">
                      <span className="font-bold text-slate-900 block">
                        Generate PIN Baru (6-Digit Acak) untuk Santri Terpilih
                      </span>
                      <span className="text-[11px] text-slate-500 block mt-0.5">
                        Jika diaktifkan, PIN transaksi dari {selectedStudentIds.size} santri terpilih akan di-reset dengan PIN baru dan langsung tersimpan otomatis ke sistem saat file PDF dibuat.
                      </span>
                    </label>
                  </div>
                </div>

                {/* 3. Pengaturan Kertas & Tata Letak */}
                <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200/80 space-y-3">
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-slate-600" />
                    <span>2. Ukuran &amp; Orientasi Kertas</span>
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">Ukuran Kertas</label>
                      <select
                        value={printConfig.paper_size}
                        onChange={(e) => setPrintConfig(prev => ({ ...prev, paper_size: e.target.value }))}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-hidden focus:border-emerald-500 cursor-pointer"
                      >
                        {PAPER_OPTIONS.map(opt => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">Orientasi Lembar Kertas</label>
                      <div className="grid grid-cols-2 gap-1.5 bg-slate-200/60 p-1 rounded-xl">
                        <button
                          type="button"
                          onClick={() => setPrintConfig(prev => ({ ...prev, paper_orientation: 'portrait' }))}
                          className={`py-1 text-[11px] font-bold rounded-lg transition cursor-pointer ${
                            printConfig.paper_orientation === 'portrait'
                              ? 'bg-white text-slate-900 shadow-xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          Portrait
                        </button>
                        <button
                          type="button"
                          onClick={() => setPrintConfig(prev => ({ ...prev, paper_orientation: 'landscape' }))}
                          className={`py-1 text-[11px] font-bold rounded-lg transition cursor-pointer ${
                            printConfig.paper_orientation === 'landscape'
                              ? 'bg-white text-slate-900 shadow-xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          Landscape
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Margin & Gap */}
                  <div className="grid grid-cols-2 gap-3 pt-1 border-t border-slate-200/60">
                    <div>
                      <label className="block text-[10.5px] font-medium text-slate-500 mb-0.5">Margin Tepi Kertas (mm)</label>
                      <input
                        type="number"
                        min={0}
                        max={50}
                        step={1}
                        value={printConfig.margin_mm}
                        onChange={(e) => setPrintConfig(prev => ({ ...prev, margin_mm: e.target.value }))}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[10.5px] font-medium text-slate-500 mb-0.5">Jarak Antar Label / Gap (mm)</label>
                      <input
                        type="number"
                        min={0}
                        max={30}
                        step={1}
                        value={printConfig.gap_mm}
                        onChange={(e) => setPrintConfig(prev => ({ ...prev, gap_mm: e.target.value }))}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono font-bold"
                      />
                    </div>
                  </div>
                </div>

                {/* 4. Live Auto-Layout Calculation Badge */}
                <div className="p-4 bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-2xl shadow-sm space-y-2">
                  <div className="text-[11px] font-mono text-emerald-400 uppercase tracking-wider font-bold">
                    📐 Estimasi Tata Letak Halaman PDF
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center pt-1">
                    <div className="p-2 bg-white/5 rounded-xl border border-white/10">
                      <div className="text-[10px] text-slate-400">Muat Per Lembar</div>
                      <div className="text-base font-extrabold text-emerald-400 font-mono">
                        {printLayoutEstimate.cardsPerPage} Label
                      </div>
                      <div className="text-[9px] text-slate-400">({printLayoutEstimate.cols} kol × {printLayoutEstimate.rows} baris)</div>
                    </div>

                    <div className="p-2 bg-white/5 rounded-xl border border-white/10">
                      <div className="text-[10px] text-slate-400">Santri Terpilih</div>
                      <div className="text-base font-extrabold text-white font-mono">
                        {selectedStudentIds.size} Santri
                      </div>
                      <div className="text-[9px] text-slate-400">Siap dicetak</div>
                    </div>

                    <div className="p-2 bg-white/5 rounded-xl border border-white/10">
                      <div className="text-[10px] text-slate-400">Total Lembar PDF</div>
                      <div className="text-base font-extrabold text-amber-300 font-mono">
                        {printLayoutEstimate.totalPages} Halaman
                      </div>
                      <div className="text-[9px] text-slate-400">File gabungan</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Kolom Kanan: Live Visual Preview Label & Daftar Siswa Terpilih (5 cols) */}
              <div className="lg:col-span-5 space-y-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Live Preview Slip Label Gunting</span>
                    </span>
                    <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-bold border border-emerald-200">
                      {printConfig.show_pin ? 'PIN + NIPD + QR' : 'NIPD + QR'}
                    </span>
                  </div>

                  {/* Live Visual Card / Slip Preview Box */}
                  <div className="p-3.5 bg-slate-100/90 rounded-2xl border border-slate-200 flex items-center justify-center">
                    <div
                      className={`w-full bg-white rounded-xl shadow-md p-3 flex flex-col justify-between select-none relative overflow-hidden ${
                        printConfig.show_cutting_lines ? 'border-2 border-dashed border-slate-400' : 'border border-slate-200'
                      }`}
                      style={{ minHeight: '135px' }}
                    >
                      {/* Tanda Gunting */}
                      {printConfig.show_cutting_lines && (
                        <div className="absolute top-1 right-2 text-[9px] font-mono text-slate-400 flex items-center gap-1">
                          <Scissors className="w-3 h-3" />
                          <span>potong</span>
                        </div>
                      )}

                      {/* Header Slip */}
                      <div className="pb-1.5 border-b border-emerald-100 flex items-center justify-between">
                        <div>
                          <div className="text-[9.5px] font-extrabold text-emerald-900 tracking-wider">
                            ALDEPOS BOARDING SCHOOL
                          </div>
                          <div className="text-[8px] font-bold text-emerald-700 tracking-wide">
                            SLIP PIN KANTIN SANTRI
                          </div>
                        </div>
                      </div>

                      {/* Body Content */}
                      <div className="flex items-center gap-3 py-2">
                        {/* QR Code */}
                        {printConfig.show_qr && (
                          <div className="w-16 h-16 shrink-0 bg-white p-1 border border-slate-800 rounded-lg flex items-center justify-center shadow-2xs">
                            {sampleStudentForPreview?.svg_content ? (
                              <div
                                className="w-full h-full flex items-center justify-center [&>svg]:w-full [&>svg]:h-full"
                                dangerouslySetInnerHTML={{ __html: sampleStudentForPreview.svg_content }}
                              />
                            ) : sampleStudentForPreview?.qr_image_url ? (
                              <img
                                src={sampleStudentForPreview.qr_image_url}
                                alt="QR"
                                className="w-full h-full object-contain"
                              />
                            ) : (
                              <QrCode className="w-12 h-12 text-slate-900" />
                            )}
                          </div>
                        )}

                        {/* Details */}
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="font-extrabold text-slate-900 text-xs leading-tight truncate" title={sampleStudentForPreview?.student_name}>
                            {sampleStudentForPreview?.student_name || 'AHMAD DAFI FAKHRUDIN'}
                          </div>
                          <div className="text-[10px] text-slate-600 font-medium">
                            <span className="font-bold">NIPD:</span> {sampleStudentForPreview?.nipd || sampleStudentForPreview?.nis || '2024001'}
                            {printConfig.show_class && (
                              <span> • <span className="font-bold">Kls:</span> {sampleStudentForPreview?.class_group_name || '10 IPA 1'}</span>
                            )}
                          </div>

                          {/* Highlight PIN Box */}
                          {printConfig.show_pin && (
                            <div className="p-1.5 bg-emerald-50 rounded-lg border border-emerald-400 space-y-0.5">
                              <div className="text-[8px] font-extrabold text-emerald-800 uppercase tracking-wider leading-none">
                                PIN KASIR KANTIN
                              </div>
                              <div className="font-mono text-sm font-black text-emerald-950 tracking-widest leading-none">
                                {sampleStudentForPreview?.child_pin || '123456'}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Footer Info */}
                      <div className="text-[8px] text-slate-400 italic pt-1 border-t border-slate-100 flex items-center justify-between">
                        <span>*Gunakan NIPD/QR &amp; PIN saat jajan di kasir</span>
                        <span className="font-bold text-emerald-700">Rahasia</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* List Siswa Terpilih & Pencarian Cepat */}
                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2.5 flex-1 flex flex-col">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Daftar Siswa Terpilih ({selectedStudentIds.size})</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => handleSelectAllFiltered(filteredStudents)}
                      className="text-[10px] font-bold text-emerald-700 hover:text-emerald-800 transition cursor-pointer"
                    >
                      Pilih Semua ({filteredStudents.length})
                    </button>
                  </div>

                  {/* Input Search Siswa di Modal */}
                  <div className="relative">
                    <Search className="w-3 h-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Cari dalam santri terpilih..."
                      value={printSearch}
                      onChange={(e) => setPrintSearch(e.target.value)}
                      className="w-full pl-7 pr-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-hidden focus:border-emerald-500"
                    />
                  </div>

                  {/* Mini List Siswa Terpilih */}
                  <div className="max-h-36 overflow-y-auto space-y-1 pr-1 flex-1">
                    {students
                      .filter(s => selectedStudentIds.has(s.student_id))
                      .filter(s => {
                        if (!printSearch) return true;
                        const q = printSearch.toLowerCase();
                        return (
                          s.student_name?.toLowerCase().includes(q) ||
                          s.nipd?.toLowerCase().includes(q) ||
                          s.nis?.toLowerCase().includes(q)
                        );
                      })
                      .map(s => (
                        <div
                          key={s.student_id}
                          className="px-2.5 py-1.5 bg-white rounded-lg border border-slate-200 text-xs flex items-center justify-between gap-2 shadow-2xs"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="font-bold text-slate-800 text-[11px] truncate">{s.student_name}</p>
                            <p className="text-[10px] text-slate-500 font-mono">
                              NIPD: {s.nipd || s.nis || '-'} • PIN: {s.child_pin || '123456'}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleToggleSelectStudent(s.student_id)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded transition cursor-pointer"
                            title="Keluarkan dari cetakan"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}

                    {selectedStudentIds.size === 0 && (
                      <div className="py-6 text-center text-xs text-rose-500 font-medium">
                        Belum ada santri yang dipilih. Silakan centang minimal 1 santri.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer: Action Buttons */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setPrintModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-xl transition cursor-pointer"
              >
                Tutup
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={generatingPdf || selectedStudentIds.size === 0}
                  onClick={() => handleExecutePrintPdf('download')}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl shadow-xs transition disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                  title="Unduh file PDF label PIN santri"
                >
                  {generatingPdf ? (
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                  ) : (
                    <Download className="w-4 h-4 text-emerald-400" />
                  )}
                  <span>Unduh File PDF</span>
                </button>

                <button
                  type="button"
                  disabled={generatingPdf || selectedStudentIds.size === 0}
                  onClick={() => handleExecutePrintPdf('open')}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md hover:shadow-emerald-600/25 transition disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                  title="Buka PDF di tab baru dan langsung cetak"
                >
                  {generatingPdf ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Memproses PDF...</span>
                    </>
                  ) : (
                    <>
                      <Printer className="w-4 h-4" />
                      <span>Buka &amp; Cetak PDF ({selectedStudentIds.size} Label)</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL GENERATE MASAL PIN SANTRI & ORANGTUA */}
      {/* =================================================================== */}
      {bulkPinModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-xl w-full max-h-[90vh] shadow-2xl border border-slate-100 flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-amber-500/10 via-white to-amber-500/5 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-600 text-white flex items-center justify-center shadow-md shadow-amber-600/20">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-800 tracking-tight">
                    Generate Masal PIN Santri &amp; Orangtua
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Otomatisasi pembuatan PIN kasir jajan santri &amp; PIN portal orangtua
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setBulkPinModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body: Options & Scope Selection */}
            <div className="p-6 overflow-y-auto space-y-5 text-xs">
              {/* 1. Target Cakupan Santri (Scope) */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-2">
                  1. Pilih Sasaran Santri (Target Scope)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {/* Scope: Santri Terpilih */}
                  <button
                    type="button"
                    onClick={() => setBulkPinConfig(prev => ({ ...prev, scope: 'selected' }))}
                    className={`p-3 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
                      bulkPinConfig.scope === 'selected'
                        ? 'border-amber-500 bg-amber-50/60 ring-2 ring-amber-500/15'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-slate-800">Santri Dicentang</span>
                        {bulkPinConfig.scope === 'selected' && (
                          <Check className="w-3.5 h-3.5 text-amber-600 font-bold" />
                        )}
                      </div>
                      <p className="text-[10.5px] text-slate-500 leading-tight">
                        Hanya santri yang dipilih di tabel
                      </p>
                    </div>
                    <div className="mt-2.5 pt-2 border-t border-slate-200/60 flex items-center justify-between">
                      <span className="text-[10px] text-slate-400 font-medium">Jumlah:</span>
                      <span className="font-mono font-bold text-amber-700 bg-white px-2 py-0.5 rounded border border-amber-200">
                        {selectedStudentIds.size > 0 ? selectedStudentIds.size : filteredStudents.length} santri
                      </span>
                    </div>
                  </button>

                  {/* Scope: Hasil Filter Aktif */}
                  <button
                    type="button"
                    onClick={() => setBulkPinConfig(prev => ({ ...prev, scope: 'filtered' }))}
                    className={`p-3 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
                      bulkPinConfig.scope === 'filtered'
                        ? 'border-amber-500 bg-amber-50/60 ring-2 ring-amber-500/15'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-slate-800">Sesuai Filter Tabel</span>
                        {bulkPinConfig.scope === 'filtered' && (
                          <Check className="w-3.5 h-3.5 text-amber-600 font-bold" />
                        )}
                      </div>
                      <p className="text-[10.5px] text-slate-500 leading-tight">
                        Rombel / kelas / status yang sedang difilter
                      </p>
                    </div>
                    <div className="mt-2.5 pt-2 border-t border-slate-200/60 flex items-center justify-between">
                      <span className="text-[10px] text-slate-400 font-medium">Jumlah:</span>
                      <span className="font-mono font-bold text-amber-700 bg-white px-2 py-0.5 rounded border border-amber-200">
                        {filteredStudents.length} santri
                      </span>
                    </div>
                  </button>

                  {/* Scope: Seluruh Santri Unit */}
                  <button
                    type="button"
                    onClick={() => setBulkPinConfig(prev => ({ ...prev, scope: 'all' }))}
                    className={`p-3 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
                      bulkPinConfig.scope === 'all'
                        ? 'border-amber-500 bg-amber-50/60 ring-2 ring-amber-500/15'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-slate-800">Seluruh Santri</span>
                        {bulkPinConfig.scope === 'all' && (
                          <Check className="w-3.5 h-3.5 text-amber-600 font-bold" />
                        )}
                      </div>
                      <p className="text-[10.5px] text-slate-500 leading-tight">
                        Semua data santri di unit aktif ini
                      </p>
                    </div>
                    <div className="mt-2.5 pt-2 border-t border-slate-200/60 flex items-center justify-between">
                      <span className="text-[10px] text-slate-400 font-medium">Jumlah:</span>
                      <span className="font-mono font-bold text-amber-700 bg-white px-2 py-0.5 rounded border border-amber-200">
                        {students.length} santri
                      </span>
                    </div>
                  </button>
                </div>
              </div>

              {/* 2. Jenis PIN yang Ingin Di-generate */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-2">
                  2. Jenis PIN yang Ingin Direset / Dibuat
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <label className={`p-3 rounded-xl border flex items-center gap-2.5 cursor-pointer transition ${
                    bulkPinConfig.target_type === 'child'
                      ? 'border-amber-500 bg-amber-50/50 font-bold text-amber-950'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}>
                    <input
                      type="radio"
                      name="bulk_pin_target"
                      checked={bulkPinConfig.target_type === 'child'}
                      onChange={() => setBulkPinConfig(prev => ({ ...prev, target_type: 'child' }))}
                      className="accent-amber-600"
                    />
                    <div>
                      <p className="font-bold">PIN Santri (Kasir)</p>
                      <p className="text-[10px] text-slate-500 font-normal">Digunakan jajan &amp; kasir POS</p>
                    </div>
                  </label>

                  <label className={`p-3 rounded-xl border flex items-center gap-2.5 cursor-pointer transition ${
                    bulkPinConfig.target_type === 'parent'
                      ? 'border-amber-500 bg-amber-50/50 font-bold text-amber-950'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}>
                    <input
                      type="radio"
                      name="bulk_pin_target"
                      checked={bulkPinConfig.target_type === 'parent'}
                      onChange={() => setBulkPinConfig(prev => ({ ...prev, target_type: 'parent' }))}
                      className="accent-amber-600"
                    />
                    <div>
                      <p className="font-bold">PIN Orangtua</p>
                      <p className="text-[10px] text-slate-500 font-normal">Akses Portal Orangtua</p>
                    </div>
                  </label>

                  <label className={`p-3 rounded-xl border flex items-center gap-2.5 cursor-pointer transition ${
                    bulkPinConfig.target_type === 'both'
                      ? 'border-amber-500 bg-amber-50/50 font-bold text-amber-950'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}>
                    <input
                      type="radio"
                      name="bulk_pin_target"
                      checked={bulkPinConfig.target_type === 'both'}
                      onChange={() => setBulkPinConfig(prev => ({ ...prev, target_type: 'both' }))}
                      className="accent-amber-600"
                    />
                    <div>
                      <p className="font-bold">Keduanya Sekaligus</p>
                      <p className="text-[10px] text-slate-500 font-normal">Reset PIN santri &amp; ortu</p>
                    </div>
                  </label>
                </div>
              </div>

              {/* 3. Mode Pembuatan PIN */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-2">
                  3. Pola / Format PIN Baru
                </label>
                <div className="space-y-2">
                  <label className={`p-3 rounded-xl border flex items-start gap-3 cursor-pointer transition ${
                    bulkPinConfig.pin_mode === 'random'
                      ? 'border-amber-500 bg-amber-50/40 ring-1 ring-amber-500/20'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}>
                    <input
                      type="radio"
                      name="bulk_pin_mode"
                      checked={bulkPinConfig.pin_mode === 'random'}
                      onChange={() => setBulkPinConfig(prev => ({ ...prev, pin_mode: 'random' }))}
                      className="mt-0.5 accent-amber-600"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800">PIN Acak 6-Digit Baru (Sangat Direkomendasikan)</span>
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-extrabold rounded-full">
                          Paling Aman
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Setiap santri akan mendapatkan 6 digit angka acak unik (contoh: 482915, 739104). PIN tersimpan dan dapat langsung dicetak pada lembar label untuk digunting dan dibagikan.
                      </p>
                    </div>
                  </label>

                  <label className={`p-3 rounded-xl border flex items-start gap-3 cursor-pointer transition ${
                    bulkPinConfig.pin_mode === 'fixed'
                      ? 'border-amber-500 bg-amber-50/40 ring-1 ring-amber-500/20'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}>
                    <input
                      type="radio"
                      name="bulk_pin_mode"
                      checked={bulkPinConfig.pin_mode === 'fixed'}
                      onChange={() => setBulkPinConfig(prev => ({ ...prev, pin_mode: 'fixed' }))}
                      className="mt-0.5 accent-amber-600"
                    />
                    <div className="flex-1">
                      <span className="font-bold text-slate-800">PIN Seragam / Default Standar</span>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Mengatur semua santri memiliki nomor PIN yang sama secara serentak (misal PIN awal 123456).
                      </p>
                      {bulkPinConfig.pin_mode === 'fixed' && (
                        <div className="mt-2.5 flex items-center gap-2">
                          <span className="text-[11px] font-bold text-slate-600">Nomor PIN:</span>
                          <input
                            type="text"
                            maxLength={6}
                            value={bulkPinConfig.custom_pin}
                            onChange={(e) => setBulkPinConfig(prev => ({ ...prev, custom_pin: e.target.value.replace(/\D/g, '') }))}
                            placeholder="123456"
                            className="w-28 px-3 py-1 bg-white border border-amber-300 rounded-lg text-xs font-mono font-bold text-amber-900 tracking-wider text-center focus:outline-hidden focus:ring-2 focus:ring-amber-500/20"
                          />
                        </div>
                      )}
                    </div>
                  </label>
                </div>
              </div>

              {/* 4. Opsi Lanjutan: Langsung Buka Modal Cetak */}
              <div className="pt-1">
                <label className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-100 transition">
                  <input
                    type="checkbox"
                    checked={bulkPinConfig.auto_open_print}
                    onChange={(e) => setBulkPinConfig(prev => ({ ...prev, auto_open_print: e.target.checked }))}
                    className="w-4 h-4 text-emerald-600 rounded-sm accent-emerald-600"
                  />
                  <div>
                    <span className="font-bold text-slate-800 text-xs">
                      Langsung buka dialog Cetak Label Slip PIN setelah selesai generate
                    </span>
                    <p className="text-[10.5px] text-slate-500">
                      Memudahkan Anda langsung mencetak slip gunting santri tanpa harus menekan tombol cetak lagi
                    </p>
                  </div>
                </label>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setBulkPinModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-xl transition cursor-pointer"
              >
                Batal
              </button>

              <button
                type="button"
                disabled={generatingBulkPin}
                onClick={handleExecuteBulkPin}
                className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-md hover:shadow-amber-600/25 transition disabled:opacity-50 flex items-center gap-2 cursor-pointer active:scale-[0.98]"
              >
                {generatingBulkPin ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Memproses Generate PIN...</span>
                  </>
                ) : (
                  <>
                    <KeyRound className="w-4 h-4 text-amber-200" />
                    <span>Eksekusi Generate PIN Masal</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
