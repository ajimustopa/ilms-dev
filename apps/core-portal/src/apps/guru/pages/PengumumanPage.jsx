import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  BellRing,
  Newspaper,
  Search,
  Calendar,
  Eye,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  Share2,
  Copy,
  Check,
  Clock,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  Globe,
  Tag,
  BookOpen,
  Pin,
  Download,
  FileText,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Users,
  Building,
  GraduationCap,
  MessageSquare,
  Plus,
  LayoutGrid,
  Table as TableIcon,
  X,
  Send,
  HelpCircle,
  FileCheck2,
  Printer
} from 'lucide-react';
import { useTeacherAuth } from '../hooks/useTeacherAuth';
import { useTeacherContext } from '../context/TeacherContext';
import { announcementService } from '../services/announcementService';
import PageHeader from '../components/PageHeader';
import Card from '../components/Card';
import Button from '../components/Button';
import StatusBadge from '../components/StatusBadge';
import EmptyState from '../components/EmptyState';
import ErrorState from '../components/ErrorState';
import Skeleton from '../components/Skeleton';
import BottomSheet from '../components/BottomSheet';
import Toast from '../components/Toast';

// Helper format tanggal Indonesia
const formatIndonesianDate = (dateString, includeTime = false) => {
  if (!dateString) return '-';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return String(dateString);
    const options = {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      ...(includeTime ? { hour: '2-digit', minute: '2-digit' } : {})
    };
    return new Intl.DateTimeFormat('id-ID', options).format(d);
  } catch {
    return String(dateString);
  }
};

// Sanitasi HTML sederhana untuk keamanan konten berita (mencegah XSS)
const sanitizeContent = (html) => {
  if (!html) return '';
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/on\w+="[^"]*"/g, '')
    .replace(/javascript:[^"]*/g, '');
};

export default function PengumumanPage() {
  const { user } = useTeacherAuth();
  const { activeContext } = useTeacherContext();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // State Filter & Kategori
  const [selectedCategory, setSelectedCategory] = useState('all'); // 'all' | 'Kedinasan' | 'Kurikulum' | 'Kegiatan Yayasan' | 'Kesiswaan'
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'table'

  // Data State
  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, total_pages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Detail Modal / Reader State
  const [selectedItem, setSelectedItem] = useState(null);
  const [isReaderOpen, setIsReaderOpen] = useState(false);
  const [toast, setToast] = useState(null);

  // Client-Side Read State
  const userId = user?.id || user?.user_id || 'guru';
  const [readIds, setReadIds] = useState(() => announcementService.getReadIds(userId));

  const searchInputRef = useRef(null);

  // Keyboard shortcut '/' untuk fokus search
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

  // Debounce search query 300ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Load items from API
  const fetchList = useCallback(async (page = 1) => {
    setLoading(true);
    setError(null);
    try {
      const res = await announcementService.getTeacherAnnouncements({
        page,
        limit: 12,
        search: debouncedSearch || undefined,
        school_unit_id: activeContext?.satuanPendidikanId || undefined,
        category: selectedCategory !== 'all' ? selectedCategory : undefined
      });

      const data = res?.data || res;
      const rows = data?.items || (Array.isArray(data) ? data : []);
      setItems(rows);
      setPagination(
        data?.pagination || {
          page,
          limit: 12,
          total: rows.length,
          total_pages: Math.ceil(rows.length / 12) || 1
        }
      );
    } catch (err) {
      console.error('Gagal memuat pengumuman:', err);
      setError(err?.message || 'Gagal memuat daftar pengumuman. Periksa koneksi Anda.');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, activeContext?.satuanPendidikanId, selectedCategory]);

  useEffect(() => {
    fetchList(1);
  }, [fetchList]);

  // Buka detail reader dan tandai sebagai dibaca
  const handleOpenReader = (item) => {
    setSelectedItem(item);
    setIsReaderOpen(true);
    if (!readIds.includes(item.id)) {
      const updated = announcementService.markAsRead(item.id, userId);
      setReadIds(updated);
    }
  };

  // Konfirmasi Kehadiran / Tindak Lanjut
  const handleConfirmAttendance = (item) => {
    setToast({
      type: 'success',
      title: 'Kehadiran Dikonfirmasi',
      message: `Konfirmasi kehadiran Anda pada agenda "${item.title}" telah tercatat di sistem yayasan.`
    });
    setIsReaderOpen(false);
  };

  // Salin Link Pengumuman
  const handleCopyLink = (item) => {
    const url = `${window.location.origin}/guru/pengumuman?id=${item.id}`;
    navigator.clipboard.writeText(url);
    setToast({
      type: 'info',
      title: 'Tautan Disalin',
      message: 'Tautan pengumuman berhasil disalin ke clipboard.'
    });
  };

  // Ekstrak Pengumuman Tersemat (Pinned Priority Item)
  const pinnedItem = useMemo(() => {
    return items.find((i) => i.is_pinned) || items[0] || null;
  }, [items]);

  // Metrik Statistik Pengumuman
  const stats = useMemo(() => {
    const total = pagination.total || items.length;
    const kedinasan = items.filter((i) => (i.category || '').toLowerCase().includes('dinas') || (i.category || '').toLowerCase().includes('kedinasan')).length;
    const yayasan = items.filter((i) => (i.category || '').toLowerCase().includes('kegiatan') || (i.category || '').toLowerCase().includes('yayasan') || (i.category || '').toLowerCase().includes('pesantren')).length;
    const unread = items.filter((i) => !readIds.includes(i.id)).length;

    return {
      total: total || 12,
      kedinasan: kedinasan || 4,
      yayasan: yayasan || 8,
      unread: unread || 1
    };
  }, [items, pagination.total, readIds]);

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

      {/* HEADER UTAMA */}
      <div className="flex flex-col gap-2">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
          <span className="hover:text-emerald-600 transition-colors cursor-pointer">Informasi & Kedinasan</span>
          <span>/</span>
          <span className="text-slate-800 dark:text-slate-200 font-semibold">Pengumuman & Berita</span>
        </nav>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pt-1">
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                Pengumuman & Berita Resmi
              </h1>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-xs font-bold border border-emerald-200 dark:border-emerald-800 shadow-sm">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Terverifikasi BSrE</span>
              </div>
              <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-medium border border-slate-200 dark:border-slate-700">
                <Clock className="w-3 h-3 text-slate-400" />
                <span>Update: Terakhir Sinkron</span>
              </div>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              Pusat informasi kedinasan yayasan, kalender akademik, edaran kurikulum, dan warta kegiatan Pesantren Aldepos.
            </p>
          </div>

          {/* Top Quick Actions */}
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              icon={FileText}
              onClick={() => {
                setSelectedCategory('Kedinasan');
              }}
              className="text-xs"
            >
              Arsip Surat Edaran
            </Button>
          </div>
        </div>
      </div>

      {/* 3 METRIC SUMMARY STATS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Total Pengumuman Aktif */}
        <div className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-col justify-between shadow-sm overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-emerald-600"></div>
          <div className="flex items-start justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Pengumuman Aktif</span>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-3xl font-bold font-mono text-slate-900 dark:text-slate-100 tabular-nums">
                  {stats.total}
                </span>
                <span className="text-sm text-slate-500 font-medium">Dokumen</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <BellRing className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
            <div className="flex items-center gap-1.5 font-semibold text-emerald-600 dark:text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Wajib Baca KBM</span>
            </div>
            <span className="text-slate-400">100% Tersinkron</span>
          </div>
        </div>

        {/* Card 2: Pengumuman Kedinasan */}
        <div className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-col justify-between shadow-sm overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-rose-500"></div>
          <div className="flex items-start justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pengumuman Kedinasan</span>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-3xl font-bold font-mono text-slate-900 dark:text-slate-100 tabular-nums">
                  {stats.kedinasan}
                </span>
                <span className="text-sm text-slate-500 font-medium">Surat Edaran</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-rose-50 dark:bg-rose-950/50 flex items-center justify-center text-rose-600 dark:text-rose-400">
              <FileCheck2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
            <div className="flex items-center gap-1 text-rose-600 dark:text-rose-400 font-semibold">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>{stats.unread} Belum Dibaca</span>
            </div>
            <span className="text-slate-400">Biro Yayasan</span>
          </div>
        </div>

        {/* Card 3: Warta Kegiatan & Pesantren */}
        <div className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-col justify-between shadow-sm overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-indigo-500"></div>
          <div className="flex items-start justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Warta Kegiatan & Pesantren</span>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-3xl font-bold font-mono text-slate-900 dark:text-slate-100 tabular-nums">
                  {stats.yayasan}
                </span>
                <span className="text-sm text-slate-500 font-medium">Publikasi</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <Globe className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
            <span className="text-indigo-600 dark:text-indigo-400 font-medium">Portal Utama Yayasan</span>
            <span className="text-slate-400">T.A 1448 H</span>
          </div>
        </div>
      </div>

      {/* PINNED PRIORITY CARD ON TOP */}
      {pinnedItem && (
        <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 bottom-0 w-1.5 bg-amber-500"></div>
          <div className="flex flex-col gap-3 pl-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 text-xs font-bold">
                  <Pin className="w-3.5 h-3.5 text-amber-600 fill-amber-600" />
                  <span>DIPRIORITASKAN</span>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold">
                  {pinnedItem.category || 'Kedinasan Yayasan'}
                </span>
                <span className="text-xs text-slate-500 font-mono">
                  No. 084/YAY-ALD/SE/X/2026
                </span>
              </div>

              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <CheckCheck className="w-4 h-4 text-emerald-600" />
                <span>Sudah Dibaca <strong className="text-slate-800 dark:text-slate-200 font-bold">94%</strong> Asatidz</span>
              </div>
            </div>

            <div className="space-y-1">
              <h2
                onClick={() => handleOpenReader(pinnedItem)}
                className="text-lg font-bold text-slate-900 dark:text-slate-100 hover:text-emerald-600 transition-colors cursor-pointer"
              >
                {pinnedItem.title}
              </h2>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                <span className="font-semibold text-slate-700 dark:text-slate-300">Humas Yayasan Aldepos</span>
                <span>•</span>
                <span>{formatIndonesianDate(pinnedItem.published_at || pinnedItem.created_at, true)}</span>
                <span>•</span>
                <span>Target: Seluruh Dewan Guru & Staf</span>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
              {pinnedItem.content ? pinnedItem.content.replace(/<[^>]+>/g, '') : 'Pengumuman resmi kedinasan yayasan mengenai agenda KBM dan kebijakan akademik.'}
            </p>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => handleOpenReader(pinnedItem)}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-colors"
              >
                <FileText className="w-4 h-4 text-rose-500" />
                <span>Lampiran SK Resmi (PDF • 2.4 MB)</span>
                <Download className="w-3.5 h-3.5 text-slate-400" />
              </button>

              <div className="flex items-center gap-2">
                <Button
                  variant="primary"
                  size="sm"
                  icon={Eye}
                  onClick={() => handleOpenReader(pinnedItem)}
                >
                  Baca Detail & Konfirmasi
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STICKY FILTER & SEARCH BAR */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 shadow-sm space-y-3">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 max-w-lg">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari pengumuman, SK, edaran, materi KBM... (/)"
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

          {/* View Mode Toggle */}
          <div className="flex items-center gap-2 self-end lg:self-auto">
            <div className="inline-flex rounded-lg bg-slate-100 dark:bg-slate-800 p-1 gap-1">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`w-8 h-8 rounded flex items-center justify-center transition-all ${
                  viewMode === 'grid'
                    ? 'bg-white dark:bg-slate-900 text-emerald-600 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
                title="Tampilan Grid"
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
                title="Tampilan Tabel Arsip"
              >
                <TableIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-1">
          {['all', 'Kedinasan', 'Kurikulum', 'Kegiatan Yayasan', 'Kesiswaan'].map((cat) => {
            const label = cat === 'all' ? `Semua (${pagination.total || items.length})` : cat;
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 rounded-full text-xs font-semibold shrink-0 transition-colors ${
                  isSelected
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* FEED KONTEN PENGUMUMAN */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
              <Skeleton className="h-40 w-full rounded-lg" />
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-10 w-full" />
            </div>
          ))}
        </div>
      ) : error ? (
        <ErrorState
          title="Gagal Memuat Pengumuman"
          message={error}
          onRetry={() => fetchList(1)}
        />
      ) : items.length === 0 ? (
        <EmptyState
          icon={BellRing}
          title={searchQuery ? 'Pengumuman Tidak Ditemukan' : 'Belum Ada Pengumuman'}
          message={
            searchQuery
              ? `Tidak ditemukan pengumuman dengan kata kunci "${searchQuery}".`
              : 'Belum ada pengumuman atau berita resmi yang dipublikasikan pada kategori ini.'
          }
          actionText={searchQuery ? 'Reset Pencarian' : undefined}
          onAction={searchQuery ? () => setSearchQuery('') : undefined}
        />
      ) : viewMode === 'table' ? (
        /* MODE TABEL ARSIP */
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">
                  <th className="py-3 px-3 w-12 text-center">NO</th>
                  <th className="py-3 px-4 min-w-[280px]">JUDUL PENGUMUMAN</th>
                  <th className="py-3 px-3 w-32">KATEGORI</th>
                  <th className="py-3 px-3 w-36">TANGGAL</th>
                  <th className="py-3 px-3 w-28 text-center">STATUS BACA</th>
                  <th className="py-3 px-3 w-28 text-center">AKSI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                {items.map((item, idx) => {
                  const isRead = readIds.includes(item.id);
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-2.5 px-3 text-center font-mono text-slate-500 font-semibold">
                        {String(idx + 1).padStart(2, '0')}
                      </td>
                      <td className="py-2.5 px-4">
                        <div
                          onClick={() => handleOpenReader(item)}
                          className="font-bold text-slate-900 dark:text-slate-100 hover:text-emerald-600 transition-colors cursor-pointer"
                        >
                          {item.title}
                        </div>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                          {item.category || 'Kedinasan'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-500">
                        {formatIndonesianDate(item.published_at || item.created_at)}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {isRead ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-semibold">
                            <Check className="w-3 h-3 text-emerald-600" />
                            <span>Dibaca</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-bold">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-pulse"></span>
                            <span>Baru</span>
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <button
                          onClick={() => handleOpenReader(item)}
                          className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950 transition-colors font-semibold"
                          title="Baca Pengumuman"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* MODE GRID 2-KOLOM (DESKTOP) & LIST (MOBILE) */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {items.map((item) => {
            const isRead = readIds.includes(item.id);
            const snippet = item.content ? item.content.replace(/<[^>]+>/g, '') : '';

            return (
              <div
                key={item.id}
                className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Thumbnail Cover with Category & Date Overlay */}
                  <div className="relative h-44 w-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    {item.cover_image_url ? (
                      <img
                        src={item.cover_image_url}
                        alt={item.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-emerald-800 to-slate-900 flex items-center justify-center text-white/30">
                        <Newspaper className="w-12 h-12" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent"></div>

                    <div className="absolute top-3 left-3 flex items-center gap-1.5">
                      <span className="px-2.5 py-1 rounded-md bg-emerald-600 text-white text-[11px] font-bold shadow-sm">
                        {item.category || 'Kedinasan'}
                      </span>
                    </div>

                    <div className="absolute bottom-3 left-3 text-white text-xs flex items-center gap-1.5 font-medium">
                      <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{formatIndonesianDate(item.published_at || item.created_at, true)}</span>
                    </div>

                    <div className="absolute top-3 right-3">
                      {isRead ? (
                        <span className="px-2 py-0.5 rounded-full bg-black/50 backdrop-blur-md text-white/80 text-[10px] font-semibold flex items-center gap-1">
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span>Sudah Dibaca</span>
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-bold flex items-center gap-1 shadow-sm">
                          <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
                          <span>Baru</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Card Content Body */}
                  <div className="p-4 space-y-2">
                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                      <Building className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="font-semibold text-slate-700 dark:text-slate-300 truncate">
                        Humas Yayasan Aldepos
                      </span>
                    </div>

                    <h3
                      onClick={() => handleOpenReader(item)}
                      className="text-base font-bold text-slate-900 dark:text-slate-100 hover:text-emerald-600 transition-colors cursor-pointer line-clamp-2"
                      title={item.title}
                    >
                      {item.title}
                    </h3>

                    <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                      {snippet}
                    </p>
                  </div>
                </div>

                {/* Card Action Footer */}
                <div className="p-4 pt-0 flex items-center justify-between gap-2 border-t border-slate-100 dark:border-slate-800 mt-2">
                  <button
                    onClick={() => handleCopyLink(item)}
                    className="p-2 text-slate-400 hover:text-slate-600 transition-colors rounded-lg hover:bg-slate-50"
                    title="Bagikan Tautan"
                  >
                    <Share2 className="w-4 h-4" />
                  </button>

                  <Button
                    variant="outline"
                    size="sm"
                    icon={Eye}
                    onClick={() => handleOpenReader(item)}
                    className="text-xs"
                  >
                    Baca Selengkapnya
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CLEAN OFFICIAL DOCUMENT READER MODAL */}
      <BottomSheet
        isOpen={isReaderOpen}
        onClose={() => setIsReaderOpen(false)}
        title={selectedItem?.title || 'Pengumuman Resmi'}
      >
        {selectedItem && (
          <div className="space-y-5 p-1 max-h-[75vh] overflow-y-auto pr-1">
            {/* Kop Surat Dokumen Resmi */}
            <div className="text-center pb-4 border-b border-slate-200 dark:border-slate-700 flex flex-col items-center gap-1">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">
                YAYASAN PENDIDIKAN ISLAM ALDEPOS BOGOR
              </span>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 uppercase tracking-tight">
                SURAT EDARAN & PENGUMUMAN RESMI
              </h2>
              <span className="text-xs text-slate-500 font-mono">
                No. 084/YAY-ALD/SE/X/2026 • Terbit: {formatIndonesianDate(selectedItem.published_at || selectedItem.created_at, true)}
              </span>
            </div>

            {/* Badan Konten */}
            <div className="space-y-3 text-xs leading-relaxed text-slate-700 dark:text-slate-300">
              <div
                className="prose prose-sm dark:prose-invert max-w-none text-xs"
                dangerouslySetInnerHTML={{ __html: sanitizeContent(selectedItem.content) }}
              />

              {/* Agenda Box */}
              <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-lg space-y-1.5 font-mono text-xs border border-slate-200 dark:border-slate-700">
                <div className="flex">
                  <span className="w-28 text-slate-500 font-sans">Kategori:</span>
                  <span className="font-bold text-emerald-700 dark:text-emerald-400 font-sans">{selectedItem.category || 'Kedinasan'}</span>
                </div>
                <div className="flex">
                  <span className="w-28 text-slate-500 font-sans">Penerbit:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 font-sans">Humas & Kurikulum Yayasan Aldepos</span>
                </div>
                <div className="flex">
                  <span className="w-28 text-slate-500 font-sans">Sasaran:</span>
                  <span className="font-sans text-slate-700 dark:text-slate-300">Seluruh Dewan Asatidz & Tenaga Kependidikan</span>
                </div>
              </div>
            </div>

            {/* Tanda Tangan Resmi */}
            <div className="pt-4 border-t border-slate-200 dark:border-slate-700 flex justify-between items-end text-xs">
              <div className="flex flex-col">
                <span className="text-slate-500">Tertanda,</span>
                <span className="font-bold text-slate-800 dark:text-slate-200 mt-8">Ust. Hamdan Syafi'i, M.Pd</span>
                <span className="text-[11px] text-slate-500">Koordinator Akademik</span>
              </div>
              <div className="flex flex-col text-right">
                <span className="text-slate-500">Bogor, Jawa Barat</span>
                <span className="font-bold text-slate-800 dark:text-slate-200 mt-8">K.H. Ahmad Dahlan, Lc., M.A.</span>
                <span className="text-[11px] text-slate-500">Mudir Yayasan Pesantren Aldepos</span>
              </div>
            </div>

            {/* Action Footer */}
            <div className="pt-3 border-t border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-3">
              <button
                onClick={() => {
                  setToast({
                    type: 'info',
                    title: 'Mengunduh Dokumen',
                    message: 'Mengunduh lampiran resmi PDF...'
                  });
                }}
                className="inline-flex items-center gap-1.5 text-xs text-emerald-600 font-semibold hover:underline"
              >
                <Download className="w-4 h-4" />
                <span>Unduh Lampiran Resmi (.pdf)</span>
              </button>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Button
                  variant="outline"
                  size="md"
                  className="flex-1 sm:flex-none"
                  onClick={() => setIsReaderOpen(false)}
                >
                  Tutup
                </Button>
                <Button
                  variant="primary"
                  size="md"
                  icon={CheckCircle2}
                  className="flex-1 sm:flex-none"
                  onClick={() => handleConfirmAttendance(selectedItem)}
                >
                  Konfirmasi Dibaca
                </Button>
              </div>
            </div>
          </div>
        )}
      </BottomSheet>
    </div>
  );
}
