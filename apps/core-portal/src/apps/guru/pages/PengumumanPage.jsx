import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  BookOpen
} from 'lucide-react';
import { useTeacherAuth } from '../hooks/useTeacherAuth';
import { useTeacherContext } from '../context/TeacherContext';
import { announcementService } from '../services/announcementService';
import {
  PageHeader,
  Card,
  Button,
  StatusBadge,
  SegmentedTabs,
  EmptyState,
  ErrorState,
  Skeleton,
  BottomSheet,
  useToast
} from '../components';

// Helper format tanggal Indonesia
const formatIndonesianDate = (dateString, includeTime = false) => {
  if (!dateString) return '-';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return String(dateString);
    const options = {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      ...(includeTime ? { hour: '2-digit', minute: '2-digit' } : {})
    };
    return new Intl.DateTimeFormat('id-ID', options).format(d);
  } catch {
    return String(dateString);
  }
};

export default function PengumumanPage() {
  const { user } = useTeacherAuth();
  const { activeSchoolUnit } = useTeacherContext();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();

  // Tab State: 'internal' (Guru & Internal) | 'public' (Berita Umum Yayasan)
  const [activeTab, setActiveTab] = useState('internal');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Data State
  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, total_pages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Detail Modal / Reader State
  const [selectedItem, setSelectedItem] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Client-Side Read State
  const userId = user?.id || user?.user_id || 'guru';
  const [readIds, setReadIds] = useState(() => announcementService.getReadIds(userId));

  // Debounce search query 350ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Load items from API
  const fetchList = useCallback(async (page = 1) => {
    setLoading(true);
    setError(null);
    try {
      if (activeTab === 'internal') {
        const res = await announcementService.getTeacherAnnouncements({
          page,
          limit: 10,
          search: debouncedSearch || undefined,
          school_unit_id: activeSchoolUnit?.id || undefined
        });

        const data = res?.data || res;
        const rows = data?.items || (Array.isArray(data) ? data : []);
        setItems(rows);
        setPagination(
          data?.pagination || {
            page,
            limit: 10,
            total: rows.length,
            total_pages: Math.ceil(rows.length / 10) || 1
          }
        );
      } else {
        const res = await announcementService.getPublicNews({
          page,
          limit: 10,
          search: debouncedSearch || undefined,
          school_unit_id: activeSchoolUnit?.id || undefined
        });

        const data = res?.data || res;
        const rows = data?.items || (Array.isArray(data) ? data : []);
        setItems(rows);
        setPagination(
          data?.pagination || {
            page,
            limit: 10,
            total: rows.length,
            total_pages: Math.ceil(rows.length / 10) || 1
          }
        );
      }
    } catch (err) {
      console.error('Gagal memuat pengumuman:', err);
      setError(err?.message || 'Gagal memuat daftar pengumuman. Periksa koneksi Anda.');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [activeTab, debouncedSearch, activeSchoolUnit?.id]);

  // Refetch when tab, debounced search, or school unit changes
  useEffect(() => {
    fetchList(1);
  }, [fetchList]);

  // Handle URL query parameter ?id=... on load or change
  useEffect(() => {
    const urlId = searchParams.get('id');
    if (urlId) {
      const parsedId = Number(urlId);
      // Cek apakah item sudah ada di list
      const existing = items.find(i => i.id === parsedId);
      if (existing) {
        setSelectedItem(existing);
        markItemRead(existing.id);
      } else {
        // Fetch detail dari endpoint
        setLoadingDetail(true);
        announcementService.getTeacherAnnouncementById(parsedId)
          .then(res => {
            const itemData = res?.data || res;
            if (itemData) {
              setSelectedItem(itemData);
              markItemRead(itemData.id);
            }
          })
          .catch(err => {
            console.error('Detail pengumuman tidak ditemukan:', err);
          })
          .finally(() => {
            setLoadingDetail(false);
          });
      }
    }
  }, [searchParams, items]);

  const markItemRead = (id) => {
    const updated = announcementService.markAsRead(id, userId);
    setReadIds(updated);
  };

  const handleSelectAnnouncement = (item) => {
    setSelectedItem(item);
    markItemRead(item.id);
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.set('id', item.id);
      return next;
    }, { replace: true });
  };

  const handleCloseDetail = () => {
    setSelectedItem(null);
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.delete('id');
      return next;
    }, { replace: true });
  };

  const handleMarkAllRead = () => {
    const allCurrentIds = items.map(i => i.id);
    const updated = announcementService.markAllAsRead(allCurrentIds, userId);
    setReadIds(updated);
    toast?.success('Semua pengumuman pada halaman ini ditandai telah dibaca.');
  };

  const handleCopyLink = () => {
    if (!selectedItem) return;
    const url = `${window.location.origin}/guru/pengumuman?id=${selectedItem.id}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedLink(true);
      toast?.success('Tautan pengumuman disalin ke clipboard.');
      setTimeout(() => setCopiedLink(false), 2000);
    });
  };

  // Hitung jumlah belum dibaca di tab internal
  const unreadCount = useMemo(() => {
    if (activeTab !== 'internal') return 0;
    return items.filter(i => !readIds.includes(i.id)).length;
  }, [items, readIds, activeTab]);

  const tabs = [
    {
      id: 'internal',
      label: 'Pengumuman Guru',
      icon: BellRing,
      badge: unreadCount > 0 ? `${unreadCount} Baru` : null
    },
    {
      id: 'public',
      label: 'Berita Umum Yayasan',
      icon: Globe
    }
  ];

  return (
    <div className="space-y-4 sm:space-y-5 animate-in fade-in duration-200">
      {/* 1. Header Halaman */}
      <PageHeader
        title="Papan Pengumuman & Berita"
        subtitle="Informasi kedinasan, surat edaran yayasan, dan berita resmi kegiatan sekolah"
        breadcrumbs={[
          { label: 'Portal Guru', to: '/guru' },
          { label: 'Pengumuman' }
        ]}
      />

      {/* 2. Pemisah Tab & Filter Bar */}
      <Card className="p-3.5 sm:p-4 space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <SegmentedTabs
            tabs={tabs}
            activeTab={activeTab}
            onChange={(tabId) => {
              setActiveTab(tabId);
              setSearchQuery('');
            }}
            size="md"
            className="w-full sm:w-auto"
          />

          {activeTab === 'internal' && items.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleMarkAllRead}
              leftIcon={<CheckCheck className="w-3.5 h-3.5 text-emerald-600" />}
              className="text-xs self-end sm:self-auto min-h-[38px]"
            >
              Tandai Semua Dibaca
            </Button>
          )}
        </div>

        {/* Search Bar Input */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              activeTab === 'internal'
                ? 'Cari judul surat edaran, agenda dinas, atau kata kunci...'
                : 'Cari berita kegiatan atau rilis pers yayasan...'
            }
            className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 min-h-[42px]"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
            >
              Hapus
            </button>
          )}
        </div>
      </Card>

      {/* 3. Daftar Pengumuman / Berita */}
      <div>
        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-28 w-full rounded-xl" />
            <Skeleton className="h-28 w-full rounded-xl" />
            <Skeleton className="h-28 w-full rounded-xl" />
          </div>
        ) : error ? (
          <ErrorState
            title="Gagal Memuat Pengumuman"
            message={error}
            onRetry={() => fetchList(pagination.page)}
          />
        ) : items.length === 0 ? (
          <EmptyState
            icon={activeTab === 'internal' ? <BellRing className="w-8 h-8 text-slate-400" /> : <Newspaper className="w-8 h-8 text-slate-400" />}
            title={
              searchQuery
                ? 'Hasil Pencarian Tidak Ditemukan'
                : activeTab === 'internal'
                ? 'Belum Ada Pengumuman Internal'
                : 'Belum Ada Berita Yayasan'
            }
            description={
              searchQuery
                ? `Tidak ada pengumuman yang cocok dengan kata kunci "${searchQuery}". Coba kata kunci lain.`
                : activeTab === 'internal'
                ? 'Surat edaran atau pengumuman resmi yayasan khusus guru akan ditampilkan di sini.'
                : 'Publikasi artikel dan berita kegiatan yayasan akan muncul di tab ini.'
            }
            action={
              searchQuery ? (
                <Button variant="outline" size="sm" onClick={() => setSearchQuery('')}>
                  Bersihkan Pencarian
                </Button>
              ) : null
            }
          />
        ) : (
          <div className="space-y-3">
            {items.map((item) => {
              const isRead = readIds.includes(item.id);
              const targetAudience = item.target_audience || 'teachers';
              const isPublic = targetAudience === 'public';
              const isStrictGuru = targetAudience === 'teachers';

              return (
                <div
                  key={item.id}
                  onClick={() => handleSelectAnnouncement(item)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer select-none relative group ${
                    !isRead && activeTab === 'internal'
                      ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800 shadow-sm'
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                  }`}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleSelectAnnouncement(item);
                    }
                  }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1.5 flex-1 min-w-0">
                      {/* Baris Meta: Badge & Tanggal */}
                      <div className="flex flex-wrap items-center gap-2">
                        {isStrictGuru ? (
                          <StatusBadge status="info" size="sm">
                            <span className="flex items-center gap-1">
                              <ShieldCheck className="w-3 h-3" />
                              Khusus Guru
                            </span>
                          </StatusBadge>
                        ) : isPublic ? (
                          <StatusBadge status="neutral" size="sm">
                            <span className="flex items-center gap-1">
                              <Globe className="w-3 h-3" />
                              Publik Yayasan
                            </span>
                          </StatusBadge>
                        ) : (
                          <StatusBadge status="warning" size="sm">
                            <span className="flex items-center gap-1">
                              <Sparkles className="w-3 h-3" />
                              Internal Sekolah
                            </span>
                          </StatusBadge>
                        )}

                        {item.category && (
                          <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center gap-1">
                            <Tag className="w-2.5 h-2.5" />
                            {item.category}
                          </span>
                        )}

                        <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          {formatIndonesianDate(item.published_at || item.created_at)}
                        </span>
                      </div>

                      {/* Judul Pengumuman */}
                      <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors line-clamp-2">
                        {item.title}
                      </h3>

                      {/* Excerpt / Cuplikan Konten */}
                      <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                        {item.summary ||
                          item.excerpt ||
                          (item.content ? item.content.replace(/<[^>]*>?/gm, '').slice(0, 160) : '-')}
                      </p>
                    </div>

                    {/* Sisi Kanan: Dot Belum Dibaca & Tombol Aksi */}
                    <div className="flex flex-col items-end justify-between self-stretch shrink-0 pl-1">
                      {!isRead && activeTab === 'internal' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-600 text-white shadow-xs animate-pulse">
                          Baru
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium flex items-center gap-1">
                          <Eye className="w-3 h-3" />
                          Dibaca
                        </span>
                      )}

                      <div className="mt-auto pt-2 flex items-center text-xs font-semibold text-emerald-700 dark:text-emerald-400 group-hover:underline">
                        <span>Buka</span>
                        <ChevronRight className="w-4 h-4 ml-0.5" />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* 4. Paginasi */}
            {pagination.total_pages > 1 && (
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600 dark:text-slate-400">
                <span className="font-medium">
                  Menampilkan <span className="font-bold text-slate-900 dark:text-slate-100">{items.length}</span> dari{' '}
                  <span className="font-bold text-slate-900 dark:text-slate-100">{pagination.total}</span> item (Halaman{' '}
                  <span className="font-bold text-slate-900 dark:text-slate-100">{pagination.page}</span> dari {pagination.total_pages})
                </span>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pagination.page <= 1 || loading}
                    onClick={() => fetchList(pagination.page - 1)}
                    leftIcon={<ChevronLeft className="w-3.5 h-3.5" />}
                    className="min-h-[40px]"
                  >
                    Sebelumnya
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pagination.page >= pagination.total_pages || loading}
                    onClick={() => fetchList(pagination.page + 1)}
                    rightIcon={<ChevronRight className="w-3.5 h-3.5" />}
                    className="min-h-[40px]"
                  >
                    Berikutnya
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 5. BottomSheet / Detail Reader Modal untuk HP & Desktop */}
      <BottomSheet
        isOpen={Boolean(selectedItem)}
        onClose={handleCloseDetail}
        title={selectedItem?.category ? `Pengumuman: ${selectedItem.category}` : 'Detail Pengumuman'}
        maxHeight="max-h-[92vh]"
      >
        {selectedItem && (
          <div className="space-y-4 pb-6">
            {/* Meta Header */}
            <div className="space-y-2 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex flex-wrap items-center gap-2">
                {selectedItem.target_audience === 'teachers' ? (
                  <StatusBadge status="info" size="sm">
                    Khusus Guru
                  </StatusBadge>
                ) : selectedItem.target_audience === 'public' ? (
                  <StatusBadge status="neutral" size="sm">
                    Publik Yayasan
                  </StatusBadge>
                ) : (
                  <StatusBadge status="warning" size="sm">
                    Internal Sekolah
                  </StatusBadge>
                )}

                <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 font-medium">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  {formatIndonesianDate(selectedItem.published_at || selectedItem.created_at, true)}
                </span>
              </div>

              <h1 className="text-base sm:text-xl font-bold text-slate-900 dark:text-slate-100 leading-snug">
                {selectedItem.title}
              </h1>

              {selectedItem.author_name && (
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Diterbitkan oleh: <span className="font-semibold text-slate-700 dark:text-slate-300">{selectedItem.author_name}</span>
                </p>
              )}
            </div>

            {/* Cover Image jika tersedia */}
            {selectedItem.cover_image_url && (
              <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 max-h-64 bg-slate-100 dark:bg-slate-900">
                <img
                  src={selectedItem.cover_image_url}
                  alt={selectedItem.title}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            {/* Konten Utama */}
            <div className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed space-y-3 font-normal whitespace-pre-line break-words">
              {selectedItem.content ? (
                // Bila format teks polos atau HTML sederhana
                <div
                  className="prose prose-sm dark:prose-invert max-w-none space-y-2.5"
                  dangerouslySetInnerHTML={{
                    __html: selectedItem.content.startsWith('<')
                      ? selectedItem.content
                      : selectedItem.content.replace(/\n/g, '<br/>')
                  }}
                />
              ) : (
                <p className="text-slate-400 italic">Tidak ada rincian konten tambahan.</p>
              )}
            </div>

            {/* Toolbar Aksi Pembaca */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2.5">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyLink}
                leftIcon={copiedLink ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                className="text-xs min-h-[40px]"
              >
                {copiedLink ? 'Tautan Disalin' : 'Salin Tautan'}
              </Button>

              <Button
                variant="primary"
                size="sm"
                onClick={handleCloseDetail}
                className="text-xs min-h-[40px]"
              >
                Tutup Pembaca
              </Button>
            </div>
          </div>
        )}
      </BottomSheet>
    </div>
  );
}
