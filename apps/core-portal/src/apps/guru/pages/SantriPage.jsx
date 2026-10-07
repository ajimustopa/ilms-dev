import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Users,
  Search,
  Download,
  Phone,
  MessageCircle,
  Copy,
  Check,
  Calendar,
  MapPin,
  UserCheck,
  ShieldAlert,
  Sparkles,
  School,
  ExternalLink,
  GraduationCap,
  Home,
  Bus,
  Filter,
  X,
  LayoutGrid,
  Table as TableIcon,
  Cake,
  User,
  Building,
  CheckCircle2,
  FileSpreadsheet,
  ArrowUpDown,
  PhoneCall
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { useTeacherContext } from '../context/TeacherContext';
import { studentService } from '../services/studentService';
import PageHeader from '../components/PageHeader';
import SelectorKonteks from '../components/SelectorKonteks';
import Card from '../components/Card';
import Button from '../components/Button';
import BottomSheet from '../components/BottomSheet';
import StatusBadge from '../components/StatusBadge';
import EmptyState from '../components/EmptyState';
import ErrorState from '../components/ErrorState';
import Skeleton from '../components/Skeleton';
import Toast from '../components/Toast';
import { formatDate } from '../../../shared/utils/formatters';

export default function SantriPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    activeContext,
    teachingAssignments,
    homeroomClasses,
    loadingContext
  } = useTeacherContext();

  const [selectedClassId, setSelectedClassId] = useState(searchParams.get('class_id') || '');
  const [students, setStudents] = useState([]);
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);
  const [fetchError, setFetchError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'mukim' | 'non-mukim'
  const [sortBy, setSortBy] = useState('absen'); // 'absen' | 'name_asc' | 'name_desc'
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'table'
  const [copiedPhone, setCopiedPhone] = useState(null);
  const [toast, setToast] = useState(null);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

  const searchInputRef = useRef(null);

  // Keyboard shortcut '/' untuk fokus pencarian
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === '/' && document.activeElement !== searchInputRef.current) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // 1. Ekstrak Daftar Rombel yang Diampu Guru
  const availableClasses = useMemo(() => {
    const map = new Map();

    // Dari penugasan wali kelas
    homeroomClasses.forEach((h) => {
      const matchUnit = !activeContext?.satuanPendidikanId || String(h.satuan_pendidikan_id) === String(activeContext.satuanPendidikanId);
      const matchYear = !activeContext?.academicYearId || String(h.academic_year_id) === String(activeContext.academicYearId);
      if (matchUnit && matchYear && h.class_group_id) {
        map.set(String(h.class_group_id), {
          id: h.class_group_id,
          name: h.class_group_name || `Kelas #${h.class_group_id}`,
          is_homeroom: true
        });
      }
    });

    // Dari penugasan mengajar mata pelajaran
    teachingAssignments.forEach((a) => {
      const matchUnit = !activeContext?.satuanPendidikanId || String(a.satuan_pendidikan_id) === String(activeContext.satuanPendidikanId);
      const matchYear = !activeContext?.academicYearId || String(a.academic_year_id) === String(activeContext.academicYearId);
      if (matchUnit && matchYear && a.class_group_id) {
        if (!map.has(String(a.class_group_id))) {
          map.set(String(a.class_group_id), {
            id: a.class_group_id,
            name: a.class_group_name || `Kelas #${a.class_group_id}`,
            is_homeroom: false
          });
        }
      }
    });

    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [homeroomClasses, teachingAssignments, activeContext]);

  // Auto-select rombel pertama jika belum terpilih
  useEffect(() => {
    if (availableClasses.length > 0) {
      if (!selectedClassId || !availableClasses.some((c) => String(c.id) === String(selectedClassId))) {
        setSelectedClassId(String(availableClasses[0].id));
      }
    } else {
      setSelectedClassId('');
    }
  }, [availableClasses, selectedClassId]);

  // 2. Ambil Anggota Siswa pada Rombel Terpilih
  const fetchClassMembers = useCallback(async () => {
    if (!selectedClassId) {
      setStudents([]);
      return;
    }

    setIsLoadingStudents(true);
    setFetchError(null);

    try {
      const res = await studentService.getClassMembers(selectedClassId);
      const data = res?.data || res || [];
      const memberList = Array.isArray(data) ? data : data.members || data.items || [];
      setStudents(memberList);
    } catch (err) {
      console.error('Error fetching class members:', err);
      setFetchError(err.response?.data?.message || err.message || 'Gagal memuat data santri rombel.');
    } finally {
      setIsLoadingStudents(false);
    }
  }, [selectedClassId]);

  useEffect(() => {
    fetchClassMembers();
  }, [fetchClassMembers]);

  // Helper Menghitung Umur dari Tanggal Lahir
  const calculateAge = (birthDate) => {
    if (!birthDate) return null;
    const dob = new Date(birthDate);
    const diffMs = Date.now() - dob.getTime();
    const ageDate = new Date(diffMs);
    return Math.abs(ageDate.getUTCFullYear() - 1970);
  };

  // Helper Normalisasi Nomor WhatsApp (misal 0812... -> 62812...)
  const getWhatsAppUrl = (phone) => {
    if (!phone) return null;
    let clean = String(phone).replace(/[^0-9]/g, '');
    if (clean.startsWith('0')) {
      clean = '62' + clean.slice(1);
    } else if (clean.startsWith('8')) {
      clean = '62' + clean;
    }
    return `https://wa.me/${clean}`;
  };

  // 3. Filter & Sort Siswa
  const filteredStudents = useMemo(() => {
    let result = [...students];

    // Filter Status Tinggal (Mukim / Non-Mukim)
    if (statusFilter !== 'all') {
      result = result.filter((st) => {
        const isNonMukim =
          st.is_boarding === false ||
          st.residence_type === 'non_mukim' ||
          st.residence_type === 'orang_tua' ||
          st.residence_type === 'pp';

        if (statusFilter === 'mukim') return !isNonMukim;
        if (statusFilter === 'non-mukim') return isNonMukim;
        return true;
      });
    }

    // Filter Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((st) => {
        const name = (st.full_name || st.student_name || '').toLowerCase();
        const nickname = (st.nickname || '').toLowerCase();
        const nisn = String(st.nisn || '').toLowerCase();
        const nipd = String(st.nipd || st.nis || '').toLowerCase();
        const parent = (st.parent_name || '').toLowerCase();
        const phone = String(st.parent_phone || '').toLowerCase();
        return (
          name.includes(q) ||
          nickname.includes(q) ||
          nisn.includes(q) ||
          nipd.includes(q) ||
          parent.includes(q) ||
          phone.includes(q)
        );
      });
    }

    // Sorting
    if (sortBy === 'name_asc') {
      result.sort((a, b) => (a.full_name || a.student_name || '').localeCompare(b.full_name || b.student_name || ''));
    } else if (sortBy === 'name_desc') {
      result.sort((a, b) => (b.full_name || b.student_name || '').localeCompare(a.full_name || a.student_name || ''));
    }

    return result;
  }, [students, searchQuery, statusFilter, sortBy]);

  const activeClass = availableClasses.find((c) => String(c.id) === String(selectedClassId));

  // 4. Metrik Statistik KPI
  const stats = useMemo(() => {
    const total = students.length;
    if (total === 0) {
      return { total: 0, mukimCount: 0, mukimPct: 0, nonMukimCount: 0, nonMukimPct: 0, parentContactCount: 0, parentContactPct: 0 };
    }

    let mukim = 0;
    let nonMukim = 0;
    let withParent = 0;

    students.forEach((st) => {
      const isPP =
        st.is_boarding === false ||
        st.residence_type === 'non_mukim' ||
        st.residence_type === 'orang_tua' ||
        st.residence_type === 'pp';

      if (isPP) nonMukim++;
      else mukim++;

      if (st.parent_phone && st.parent_phone.trim() !== '') {
        withParent++;
      }
    });

    const mukimPct = Math.round((mukim / total) * 100);
    const nonMukimPct = Math.round((nonMukim / total) * 100);
    const parentContactPct = Math.round((withParent / total) * 100);

    return {
      total,
      mukimCount: mukim,
      mukimPct,
      nonMukimCount: nonMukim,
      nonMukimPct,
      parentContactCount: withParent,
      parentContactPct
    };
  }, [students]);

  // 5. Salin Nomor Kontak
  const handleCopyPhone = (phone, name) => {
    if (!phone) return;
    navigator.clipboard.writeText(phone);
    setCopiedPhone(phone);
    setToast({
      type: 'info',
      title: 'Kontak Disalin',
      message: `Nomor telepon wali ${name} (${phone}) berhasil disalin ke clipboard.`
    });
    setTimeout(() => {
      setCopiedPhone(null);
    }, 2000);
  };

  // 6. Ekspor Lembar Kerja Excel
  const handleExportExcel = () => {
    if (students.length === 0) {
      setToast({
        type: 'warning',
        title: 'Tidak Ada Data',
        message: 'Tidak ada data santri pada rombel ini untuk diekspor.'
      });
      return;
    }

    const className = activeClass?.name ? activeClass.name.replace(/[^a-zA-Z0-9_-]/g, '_') : 'Rombel';
    const yearName = activeContext?.academicYearName ? activeContext.academicYearName.replace(/[^a-zA-Z0-9_-]/g, '_') : 'Tahun_Ajaran';
    const dateStr = new Date().toISOString().slice(0, 10);

    const rows = filteredStudents.map((st, idx) => {
      const ttl = [st.birth_place, st.birth_date ? formatDate(st.birth_date) : null]
        .filter(Boolean)
        .join(', ') || '-';

      const isPP =
        st.is_boarding === false ||
        st.residence_type === 'non_mukim' ||
        st.residence_type === 'orang_tua' ||
        st.residence_type === 'pp';

      return {
        'No. Absen': idx + 1,
        'NIPD': st.nipd || st.nis || '-',
        'NISN': st.nisn || '-',
        'Nama Lengkap': st.full_name || st.student_name || '-',
        'Nama Panggilan': st.nickname || '-',
        'Jenis Kelamin': st.gender === 'L' ? 'Laki-laki' : st.gender === 'P' ? 'Perempuan' : '-',
        'Status Tinggal': isPP ? 'Non-Mukim (PP)' : 'Mukim (Asrama)',
        'Tempat, Tanggal Lahir': ttl,
        'Rombel': st.class_group_name || activeClass?.name || '-',
        'Nama Orang Tua / Wali': st.parent_name || '-',
        'Hubungan': st.parent_relationship || '-',
        'Kontak Orang Tua': st.parent_phone || '-'
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Data Santri');
    XLSX.writeFile(workbook, `Data_Siswa_${className}_${yearName}_${dateStr}.xlsx`);

    setToast({
      type: 'success',
      title: 'Ekspor Berhasil',
      message: `File Excel Data Siswa "${activeClass?.name}" berhasil diunduh.`
    });
  };

  return (
    <div className="space-y-6 pb-28 animate-in fade-in duration-200">
      {/* Toast Notification */}
      {toast && (
        <Toast
          type={toast.type}
          title={toast.title}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}

      {/* HEADER & TOP ACTIONS */}
      <div className="flex flex-col gap-2">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
          <span className="hover:text-emerald-600 transition-colors cursor-pointer">Kesiswaan & Akademik</span>
          <span>/</span>
          <span className="text-slate-800 dark:text-slate-200 font-semibold">Data Siswa & Rombel</span>
        </nav>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pt-1">
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                Data Siswa & Rombongan Belajar
              </h1>
              {activeClass && (
                <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-xs font-bold border border-emerald-200 dark:border-emerald-800">
                  {activeClass.name} {activeClass.is_homeroom ? '• Wali Kelas' : ''}
                </span>
              )}
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              Direktori santri aktif, kontak wali santri, informasi asrama, dan status kesiswaan SMP IT Aldepos.
            </p>
          </div>

          {/* Export Action */}
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              icon={Download}
              disabled={students.length === 0}
              onClick={handleExportExcel}
              className="text-xs"
            >
              Ekspor Excel (.xlsx)
            </Button>
          </div>
        </div>
      </div>

      {/* 4 KPI METRIC RIBBON CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Card 1: Total Santri */}
        <div className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-col justify-between shadow-sm overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-emerald-600"></div>
          <div className="flex items-start justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Santri Aktif</span>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-3xl font-bold font-mono text-slate-900 dark:text-slate-100 tabular-nums">
                  {stats.total}
                </span>
                <span className="text-sm text-slate-500 font-medium">Santri</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
            <span>Kelengkapan Berkas</span>
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">100% Terverifikasi</span>
          </div>
        </div>

        {/* Card 2: Status Mukim */}
        <div className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-col justify-between shadow-sm overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-indigo-600"></div>
          <div className="flex items-start justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Status Mukim</span>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-3xl font-bold font-mono text-slate-900 dark:text-slate-100 tabular-nums">
                  {stats.mukimCount}
                </span>
                <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-400">
                  {stats.mukimPct}%
                </span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <Home className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center gap-1.5 text-xs text-slate-500">
            <Building className="w-3.5 h-3.5 text-indigo-600" />
            <span className="truncate">Asrama Umar & Utsman</span>
          </div>
        </div>

        {/* Card 3: Non-Mukim (PP) */}
        <div className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-col justify-between shadow-sm overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-amber-500"></div>
          <div className="flex items-start justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Non-Mukim (PP)</span>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-3xl font-bold font-mono text-slate-900 dark:text-slate-100 tabular-nums">
                  {stats.nonMukimCount}
                </span>
                <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
                  {stats.nonMukimPct}%
                </span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-amber-50 dark:bg-amber-950/50 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <Bus className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center gap-1.5 text-xs text-slate-500">
            <MapPin className="w-3.5 h-3.5 text-amber-600" />
            <span className="truncate">Rute Ciawi & Bogor Kota</span>
          </div>
        </div>

        {/* Card 4: Kelengkapan Data Wali */}
        <div className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-col justify-between shadow-sm overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-emerald-600"></div>
          <div className="flex items-start justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Kelengkapan Data Wali</span>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-3xl font-bold font-mono text-slate-900 dark:text-slate-100 tabular-nums">
                  {stats.parentContactCount}
                </span>
                <span className="text-sm text-slate-500 font-medium">/ {stats.total}</span>
                <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                  {stats.parentContactPct}%
                </span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <PhoneCall className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>WhatsApp Terhubung</span>
          </div>
        </div>
      </div>

      {/* STICKY FILTER TOOLBAR */}
      <div className="sticky top-16 z-20 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 shadow-sm space-y-3">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[240px] max-w-lg">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama santri, panggilan, NISN, atau nama orang tua... (/)"
              className="w-full h-10 pl-9 pr-9 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:border-emerald-600 transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2.5 p-1 text-slate-400 hover:text-slate-600 rounded-full"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Desktop Filter Controls */}
          <div className="hidden md:flex items-center gap-2.5 flex-wrap">
            {/* Rombel Selector */}
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="h-10 px-3 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:border-emerald-600 cursor-pointer max-w-xs truncate"
            >
              {availableClasses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.is_homeroom ? '(Wali Kelas)' : ''}
                </option>
              ))}
            </select>

            {/* Status Tinggal Selector */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-10 px-3 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:border-emerald-600 cursor-pointer"
            >
              <option value="all">Semua Status ({stats.total})</option>
              <option value="mukim">Mukim Asrama ({stats.mukimCount})</option>
              <option value="non-mukim">Non-Mukim / PP ({stats.nonMukimCount})</option>
            </select>

            {/* Sort Selector */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="h-10 px-3 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:border-emerald-600 cursor-pointer"
            >
              <option value="absen">No. Absen</option>
              <option value="name_asc">Nama Santri (A - Z)</option>
              <option value="name_desc">Nama Santri (Z - A)</option>
            </select>

            {/* View Mode Toggle */}
            <div className="inline-flex rounded-lg bg-slate-100 dark:bg-slate-800 p-1 gap-1">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`w-8 h-8 rounded flex items-center justify-center transition-all ${
                  viewMode === 'grid'
                    ? 'bg-white dark:bg-slate-900 text-emerald-600 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
                title="Mode Kartu (Grid)"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`w-8 h-8 rounded flex items-center justify-center transition-all ${
                  viewMode === 'table'
                    ? 'bg-white dark:bg-slate-900 text-emerald-600 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
                title="Mode Tabel"
              >
                <TableIcon className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Mobile Filter Trigger */}
          <div className="md:hidden flex items-center gap-2">
            <button
              onClick={() => setIsMobileFilterOpen(true)}
              className="flex-1 h-10 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg flex items-center justify-between text-xs font-semibold text-slate-800 dark:text-slate-200"
            >
              <div className="flex items-center gap-2 truncate">
                <Filter className="w-4 h-4 text-emerald-600" />
                <span className="truncate">{activeClass?.name || 'Pilih Rombel'}</span>
              </div>
              <span className="text-[11px] text-emerald-600 font-bold">Ubah</span>
            </button>
          </div>
        </div>

        {/* Filter Pills Summary */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pt-1">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1 rounded-full text-xs font-semibold shrink-0 transition-colors ${
              statusFilter === 'all'
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            Semua Santri ({stats.total})
          </button>
          <button
            onClick={() => setStatusFilter('mukim')}
            className={`px-3 py-1 rounded-full text-xs font-semibold shrink-0 transition-colors flex items-center gap-1.5 ${
              statusFilter === 'mukim'
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            <Home className="w-3.5 h-3.5 text-indigo-500" />
            <span>Mukim ({stats.mukimCount})</span>
          </button>
          <button
            onClick={() => setStatusFilter('non-mukim')}
            className={`px-3 py-1 rounded-full text-xs font-semibold shrink-0 transition-colors flex items-center gap-1.5 ${
              statusFilter === 'non-mukim'
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            <Bus className="w-3.5 h-3.5 text-amber-500" />
            <span>Non-Mukim ({stats.nonMukimCount})</span>
          </button>
        </div>
      </div>

      {/* MAIN CONTENT */}
      {isLoadingStudents ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex items-center gap-3">
                <Skeleton className="w-14 h-14 rounded-xl" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
              <Skeleton className="h-8 w-full rounded-lg" />
              <Skeleton className="h-12 w-full rounded-lg" />
            </div>
          ))}
        </div>
      ) : fetchError ? (
        <ErrorState
          title="Gagal Memuat Data Siswa"
          message={fetchError}
          onRetry={fetchClassMembers}
        />
      ) : !selectedClassId ? (
        <EmptyState
          icon={Users}
          title="Pilih Rombel Kelas"
          message="Pilih salah satu rombel kelas di atas untuk melihat direktori santri dan kontak wali."
        />
      ) : filteredStudents.length === 0 ? (
        <EmptyState
          icon={Users}
          title={searchQuery ? 'Santri Tidak Ditemukan' : 'Belum Ada Santri'}
          message={
            searchQuery
              ? `Tidak ditemukan santri dengan kata kunci "${searchQuery}". Silakan periksa kembali nama atau nomor NISN.`
              : 'Belum ada data santri yang terdaftar aktif di rombel kelas ini.'
          }
          actionText={searchQuery ? 'Reset Pencarian' : undefined}
          onAction={searchQuery ? () => setSearchQuery('') : undefined}
        />
      ) : viewMode === 'table' ? (
        /* MODE TABEL LENGKAP */
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">
                  <th className="py-3 px-3 w-12 text-center">NO</th>
                  <th className="py-3 px-3 w-28">NISN</th>
                  <th className="py-3 px-3 w-28">NIPD</th>
                  <th className="py-3 px-4 min-w-[200px]">NAMA SANTRI</th>
                  <th className="py-3 px-3 w-24 text-center">STATUS</th>
                  <th className="py-3 px-4 min-w-[180px]">TTL & UMUR</th>
                  <th className="py-3 px-4 min-w-[200px]">WALI SANTRI</th>
                  <th className="py-3 px-3 w-36 text-center">AKSI KONTAK</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                {filteredStudents.map((st, idx) => {
                  const studentName = st.full_name || st.student_name || 'Santri';
                  const isPP =
                    st.is_boarding === false ||
                    st.residence_type === 'non_mukim' ||
                    st.residence_type === 'orang_tua' ||
                    st.residence_type === 'pp';

                  const age = calculateAge(st.birth_date);
                  const ttl = [st.birth_place, st.birth_date ? formatDate(st.birth_date) : null].filter(Boolean).join(', ');
                  const waUrl = getWhatsAppUrl(st.parent_phone);

                  return (
                    <tr key={st.student_id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-2.5 px-3 text-center font-mono text-slate-500 font-semibold">
                        {String(idx + 1).padStart(2, '0')}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-600 dark:text-slate-400">
                        {st.nisn || '-'}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-600 dark:text-slate-400">
                        {st.nipd || st.nis || '-'}
                      </td>
                      <td className="py-2.5 px-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-900 dark:text-slate-100">{studentName}</span>
                          <span className="text-[11px] text-slate-500">Panggilan: {st.nickname || '-'}</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-semibold text-[10px] ${
                          isPP
                            ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300'
                            : 'bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300'
                        }`}>
                          {isPP ? 'Non-Mukim' : 'Mukim'}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-slate-600 dark:text-slate-400">
                        {ttl || '-'} {age ? `(${age} Thn)` : ''}
                      </td>
                      <td className="py-2.5 px-4">
                        <div className="flex flex-col">
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                            {st.parent_name || 'Wali Santri'}
                          </span>
                          <span className="text-[11px] text-slate-500">
                            {st.parent_relationship ? `(${st.parent_relationship})` : ''} • {st.parent_phone || '-'}
                          </span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {waUrl ? (
                            <a
                              href={waUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-600 hover:bg-emerald-100 transition-colors"
                              title="Chat WhatsApp Wali"
                            >
                              <MessageCircle className="w-4 h-4" />
                            </a>
                          ) : null}
                          {st.parent_phone ? (
                            <a
                              href={`tel:${st.parent_phone}`}
                              className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 transition-colors"
                              title="Telepon Wali"
                            >
                              <Phone className="w-4 h-4" />
                            </a>
                          ) : null}
                          {st.parent_phone ? (
                            <button
                              onClick={() => handleCopyPhone(st.parent_phone, st.parent_name || studentName)}
                              className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-800 transition-colors"
                              title="Salin Nomor"
                            >
                              <Copy className="w-4 h-4" />
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* MODE KARTU 3-KOLOM (DESKTOP) & LIST (MOBILE) */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredStudents.map((st, idx) => {
            const studentName = st.full_name || st.student_name || 'Santri';
            const isPP =
              st.is_boarding === false ||
              st.residence_type === 'non_mukim' ||
              st.residence_type === 'orang_tua' ||
              st.residence_type === 'pp';

            const age = calculateAge(st.birth_date);
            const ttl = [st.birth_place, st.birth_date ? formatDate(st.birth_date) : null].filter(Boolean).join(', ');
            const waUrl = getWhatsAppUrl(st.parent_phone);

            const initials = studentName
              .split(' ')
              .map((n) => n[0])
              .slice(0, 2)
              .join('')
              .toUpperCase();

            return (
              <div
                key={st.student_id}
                className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between overflow-hidden relative"
              >
                <div className="space-y-3.5">
                  {/* Card Header: Photo/Avatar, Absen, Mukim Badge */}
                  <div className="flex items-start gap-3.5">
                    <div className="relative shrink-0">
                      {st.photo_url ? (
                        <img
                          src={st.photo_url}
                          alt={studentName}
                          className="w-14 h-14 rounded-xl object-cover bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                        />
                      ) : (
                        <div className="w-14 h-14 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-bold text-base flex items-center justify-center border border-emerald-200 dark:border-emerald-800">
                          {initials}
                        </div>
                      )}
                      <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900" title="Santri Aktif"></span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wide">
                          Absen #{String(idx + 1).padStart(2, '0')}
                        </span>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-semibold text-[10px] ${
                          isPP
                            ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300'
                            : 'bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${isPP ? 'bg-amber-500' : 'bg-indigo-500'}`}></span>
                          {isPP ? 'Non-Mukim' : 'Mukim'}
                        </span>
                      </div>

                      <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate mt-0.5" title={studentName}>
                        {studentName}
                      </h3>
                      <p className="text-xs text-slate-500 truncate">
                        Panggilan: <strong className="text-slate-700 dark:text-slate-300 font-semibold">{st.nickname || '-'}</strong>
                      </p>
                    </div>
                  </div>

                  {/* Identifiers Badge Strip */}
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 text-xs text-slate-600 dark:text-slate-300">
                    <span className="font-mono">NISN: <strong>{st.nisn || '-'}</strong></span>
                    <span className="text-slate-300 dark:text-slate-600">•</span>
                    <span className="font-mono">NIPD: <strong>{st.nipd || st.nis || '-'}</strong></span>
                    <span className="text-slate-300 dark:text-slate-600">•</span>
                    <span className="text-emerald-700 dark:text-emerald-400 font-semibold">{activeClass?.name || 'Kelas'}</span>
                  </div>

                  {/* Attributes Details */}
                  <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400 pt-0.5">
                    {/* Asrama / Rute Antar Jemput */}
                    <div className="flex items-center gap-2">
                      {isPP ? (
                        <Bus className="w-4 h-4 text-amber-600 shrink-0" />
                      ) : (
                        <Building className="w-4 h-4 text-indigo-600 shrink-0" />
                      )}
                      <span className="truncate">
                        {isPP ? 'Santri Pulang-Pergi (Non-Mukim)' : 'Asrama Pesantren IT Aldepos'}
                      </span>
                    </div>

                    {/* TTL & Umur */}
                    <div className="flex items-center gap-2">
                      <Cake className="w-4 h-4 text-slate-400 shrink-0" />
                      <span className="truncate">
                        {ttl || '-'} {age ? `(${age} Thn)` : ''}
                      </span>
                    </div>

                    {/* Wali Santri */}
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-slate-400 shrink-0" />
                      <span className="truncate">
                        Wali: <strong className="text-slate-800 dark:text-slate-200 font-medium">{st.parent_name || 'Orang Tua / Wali'}</strong> {st.parent_relationship ? `(${st.parent_relationship})` : ''}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Action Footer */}
                <div className="flex items-center gap-2 pt-3 mt-4 border-t border-slate-100 dark:border-slate-800">
                  {waUrl ? (
                    <a
                      href={waUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="flex-1 min-h-[38px] px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-sm active:scale-98"
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span>WhatsApp Wali</span>
                    </a>
                  ) : (
                    <button
                      disabled
                      className="flex-1 min-h-[38px] px-3 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-400 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-not-allowed"
                    >
                      <span>No Telp Belum Ada</span>
                    </button>
                  )}

                  {st.parent_phone ? (
                    <a
                      href={`tel:${st.parent_phone}`}
                      className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 flex items-center justify-center transition-colors shrink-0"
                      title="Telepon Wali"
                    >
                      <Phone className="w-4 h-4" />
                    </a>
                  ) : null}

                  {st.parent_phone ? (
                    <button
                      onClick={() => handleCopyPhone(st.parent_phone, st.parent_name || studentName)}
                      className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 flex items-center justify-center transition-colors shrink-0"
                      title="Salin Nomor Kontak"
                    >
                      {copiedPhone === st.parent_phone ? (
                        <Check className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MOBILE FILTER DRAWER */}
      <BottomSheet
        isOpen={isMobileFilterOpen}
        onClose={() => setIsMobileFilterOpen(false)}
        title="Filter Direktori Siswa"
      >
        <div className="space-y-4 p-1">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Rombongan Belajar</label>
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="w-full h-10 px-3 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-sm font-semibold"
            >
              {availableClasses.map((c) => (
                <option key={c.id} value={c.id}>{c.name} {c.is_homeroom ? '(Wali Kelas)' : ''}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Status Tinggal</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full h-10 px-3 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-sm font-semibold"
            >
              <option value="all">Semua Status</option>
              <option value="mukim">Mukim Asrama</option>
              <option value="non-mukim">Non-Mukim / PP</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Urutkan Berdasarkan</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full h-10 px-3 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-sm font-semibold"
            >
              <option value="absen">No. Absen</option>
              <option value="name_asc">Nama Santri (A - Z)</option>
              <option value="name_desc">Nama Santri (Z - A)</option>
            </select>
          </div>

          <div className="pt-2">
            <Button
              variant="primary"
              size="lg"
              className="w-full"
              onClick={() => setIsMobileFilterOpen(false)}
            >
              Terapkan Filter
            </Button>
          </div>
        </div>
      </BottomSheet>
    </div>
  );
}
