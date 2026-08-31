import React, { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import { Gantt, WillowDark, Willow } from '@svar-ui/react-gantt';
import '@svar-ui/react-gantt/all.css';
import './gantt-styles.css';

import apiService from '../../../../shared/services/api';
import { useManajemenTheme } from '../../theme';
import { mapDataToSvarFormat, getTaskCategory } from './adapters/mapDataToSvarFormat';
import { mapSvarChangeToApiPayload } from './adapters/mapSvarChangeToApiPayload';
import { parseAcademicYear, getAcademicYearScales, ID_MONTHS, ID_MONTHS_SHORT } from './utils/academicYearScale';
import {
  Calendar,
  Layers,
  Info,
  Sun,
  Moon,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  Gem,
  Loader2,
  Lock,
  MoveHorizontal,
  Plus,
  Maximize2,
  Minimize2,
  Filter,
  GripVertical,
} from 'lucide-react';

/**
 * Task Types yang didukung oleh konfigurasi SVAR Gantt
 */
const TASK_TYPES = [
  { id: 'task', label: 'Tugas' },
  { id: 'milestone', label: 'Milestone' },
  { id: 'summary', label: 'Summary' },
  { id: 'in_progress', label: 'Sedang Berjalan' },
  { id: 'completed', label: 'Selesai' },
  { id: 'planned', label: 'Direncanakan' },
  { id: 'cancelled', label: 'Dibatalkan' },
  { id: 'cat_kurikulum', label: 'Kurikulum & Akademik' },
  { id: 'cat_kesiswaan', label: 'Kesiswaan & Santri' },
  { id: 'cat_sarpras', label: 'Sarana & Prasarana' },
  { id: 'cat_sdm', label: 'SDM & Kepegawaian' },
  { id: 'cat_keuangan', label: 'Keuangan & Anggaran' },
  { id: 'cat_humas', label: 'Humas & Kemitraan' },
  { id: 'cat_manajemen', label: 'Tata Kelola & RIPS' },
  { id: 'cat_it', label: 'IT & Proyek Khusus' },
  { id: 'cat_umum', label: 'Umum & Operasional' },
];

/**
 * Custom Task Bar Component (Merender Warna Kategori Dinamis, Gradasi Halus & Progress)
 */
function CustomTaskBarTemplate({ data }) {
  if (!data) return null;

  if (data.type === 'milestone') {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div
          className="w-4 h-4 rotate-45 rounded-sm shadow-md transition-transform hover:scale-110"
          style={{
            background: 'linear-gradient(135deg, #c084fc 0%, #9333ea 100%)',
            border: '1.5px solid rgba(255, 255, 255, 0.4)',
            boxShadow: '0 2px 8px rgba(147, 51, 234, 0.4)',
          }}
          title={`${data.text} (Milestone)`}
        />
      </div>
    );
  }

  // Bidang, Sub Bidang, dan Program tidak perlu ada batangnya (hanya baris penanda pemisah)
  if (data.type === 'summary' || data.is_group) {
    return null;
  }

  const category = getTaskCategory(data.raw_item || data);
  const color = category.color || '#6366f1';
  const bgGradient = category.bgGradient || `linear-gradient(135deg, ${color} 0%, #4f46e5 100%)`;
  const fillGradient = category.fillGradient || `linear-gradient(135deg, #4f46e5 0%, #4338ca 100%)`;
  const border = category.border || 'rgba(99, 102, 241, 0.45)';
  const prog = Math.min(100, Math.max(0, Number(data.progress) || 0));

  // Format Tooltip Tanggal Inklusif (Menampilkan tanggal akhir yang tercakup pada batang)
  let dateTooltip = '';
  if (data.start) {
    const s = data.start instanceof Date ? data.start : new Date(data.start);
    const sStr = !isNaN(s.getTime()) ? `${s.getDate()}/${s.getMonth() + 1}/${s.getFullYear()}` : '';
    if (data.end) {
      const e = data.end instanceof Date ? data.end : new Date(data.end);
      let inclusiveEnd = e;
      if (data.duration && data.duration >= 1) {
        inclusiveEnd = new Date(s.getFullYear(), s.getMonth(), s.getDate() + (data.duration - 1));
      } else if (e.getTime() > s.getTime()) {
        inclusiveEnd = new Date(e.getFullYear(), e.getMonth(), e.getDate() - 1);
      }
      const eStr = !isNaN(inclusiveEnd.getTime()) ? `${inclusiveEnd.getDate()}/${inclusiveEnd.getMonth() + 1}/${inclusiveEnd.getFullYear()}` : '';
      dateTooltip = sStr && eStr ? ` • (${sStr} - ${eStr})` : '';
    } else {
      dateTooltip = sStr ? ` • (Mulai: ${sStr})` : '';
    }
  }

  const isCompleted = prog >= 100;
  const hasPartialProgress = prog > 0 && prog < 100;

  return (
    <div
      className="w-full h-full rounded-[8px] overflow-hidden flex items-center relative select-none cursor-pointer transition-all duration-200 hover:brightness-105"
      style={{
        background: isCompleted ? fillGradient : bgGradient,
        border: `1px solid ${border}`,
        boxShadow: '0 2px 5px rgba(0, 0, 0, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.25)',
      }}
      title={`${data.text} • [${category.label}] (${prog}%)${dateTooltip}`}
    >
      {/* Background uncompleted dim layer (untuk progress parsial agar kontras progress jelas) */}
      {hasPartialProgress && (
        <div
          className="absolute inset-0 pointer-events-none opacity-40"
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.25)',
          }}
        />
      )}

      {/* Progress Fill Layer */}
      {hasPartialProgress && (
        <div
          className="absolute left-0 top-0 bottom-0 transition-all duration-300 pointer-events-none"
          style={{
            width: `${prog}%`,
            background: fillGradient,
            borderRight: '1.5px solid rgba(255, 255, 255, 0.75)',
            boxShadow: '2px 0 6px rgba(0, 0, 0, 0.2)',
          }}
        />
      )}

      {/* Gloss Highlight on Top Edge */}
      <div
        className="absolute top-0 left-0 right-0 h-[35%] pointer-events-none opacity-40 rounded-t-[7px]"
        style={{
          background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.4) 0%, rgba(255, 255, 255, 0) 100%)',
        }}
      />

      {/* Task Text Content (Warna Teks Putih & Tanpa Angka Persen) */}
      <div
        className="relative z-10 px-2.5 flex items-center w-full h-full text-[12px] font-bold select-none pointer-events-none overflow-hidden"
        style={{ color: '#ffffff' }}
      >
        {/* Title Text (Truncates cleanly with min-w-0) */}
        <span
          className="truncate min-w-0 flex-1 flex items-center gap-1.5 font-bold tracking-tight"
          style={{ color: '#ffffff', textShadow: '0 1px 2px rgba(0, 0, 0, 0.45)' }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full shrink-0 shadow-xs"
            style={{ backgroundColor: '#ffffff', opacity: 0.95 }}
          />
          <span className="truncate" style={{ color: '#ffffff' }}>{data.text}</span>
        </span>
      </div>
    </div>
  );
}

/**
 * GanttTimelineView (SVAR React Gantt Integration)
 * 
 * Aturan Perilaku Skala & Hirarki:
 * - Hirarki 4 Tingkat: Bidang -> Sub Bidang -> Program -> Aktivitas / Tugas (Semua dapat dilipat / expand-collapse).
 * - Tab 'Hari': Batang digeser/dipanjangkan/dipendekkan match per hari (min 1 hari, ujung batang pas tanggal).
 * - Tab 'Minggu' & 'Bulan': Batang dikunci (tidak digeser) dan memenuhi sel periodenya secara rapi.
 * - Pewarnaan: Setiap batang memiliki warna berbeda berdasarkan Tag / Tipe Kegiatan.
 */
export default function GanttTimelineView({
  data = [],
  academicYear = '2026/2027',
  employees = [],
  onItemClick,
  onScheduleChange,
  onAddTask,
  onTaskReorder,
  children,
}) {
  // 1. Theme State (tersinkronisasi penuh dengan useManajemenTheme)
  let manajemenTheme = null;
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    manajemenTheme = useManajemenTheme();
  } catch (e) {
    // Fallback if rendered outside provider
  }

  const [localThemeMode, setLocalThemeMode] = useState(() => {
    return localStorage.getItem('aldepos_manajemen_theme') || localStorage.getItem('gantt_theme_mode') || 'dark';
  });

  const isDark = manajemenTheme ? manajemenTheme.isDark : localThemeMode === 'dark';
  const ThemeComponent = isDark ? WillowDark : Willow;

  const toggleTheme = useCallback(() => {
    if (manajemenTheme?.toggleTheme) {
      manajemenTheme.toggleTheme();
    } else {
      setLocalThemeMode((prev) => {
        const nextMode = prev === 'dark' ? 'light' : 'dark';
        localStorage.setItem('gantt_theme_mode', nextMode);
        return nextMode;
      });
    }
  }, [manajemenTheme]);

  // 2. Zoom Level State ('day' | 'week' | 'month' | 'semester') - Tersimpan di localStorage
  const [zoomLevel, setZoomLevel] = useState(() => {
    return localStorage.getItem('aldepos_gantt_zoom_level') || 'day';
  });

  const handleSetZoomLevel = (lvl) => {
    setZoomLevel(lvl);
    try {
      localStorage.setItem('aldepos_gantt_zoom_level', lvl);
    } catch (e) {
      console.warn('Failed to save gantt zoom level:', e);
    }
  };

  const [ganttApi, setGanttApi] = useState(null);
  const ganttApiRef = useRef(null);
  const containerRef = useRef(null);

  // Fullscreen State
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = useCallback(() => {
    const el = containerRef.current;
    if (!document.fullscreenElement) {
      if (el?.requestFullscreen) {
        el.requestFullscreen().catch(() => {});
      }
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
      setIsFullscreen(false);
    }
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // State status sinkronisasi API
  const [isSaving, setIsSaving] = useState(false);

  // 2b. Opsi & State Filter Status Tugas (Tersimpan di localStorage)
  const STATUS_FILTER_OPTIONS = useMemo(
    () => [
      {
        id: 'planned',
        label: 'Direncanakan',
        badgeBg: isDark ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40' : 'bg-indigo-50 text-indigo-700 border-indigo-200',
      },
      {
        id: 'in_progress',
        label: 'Sedang Berjalan',
        badgeBg: isDark ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' : 'bg-amber-50 text-amber-700 border-amber-200',
      },
      {
        id: 'completed',
        label: 'Selesai',
        badgeBg: isDark ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' : 'bg-emerald-50 text-emerald-700 border-emerald-200',
      },
      {
        id: 'cancelled',
        label: 'Dibatalkan',
        badgeBg: isDark ? 'bg-rose-500/20 text-rose-300 border-rose-500/40' : 'bg-rose-50 text-rose-700 border-rose-200',
      },
    ],
    [isDark]
  );

  const [selectedStatuses, setSelectedStatuses] = useState(() => {
    try {
      const saved = localStorage.getItem('aldepos_gantt_status_filters');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn('Failed to parse saved gantt status filters:', e);
    }
    return ['planned', 'in_progress', 'completed', 'cancelled'];
  });

  const toggleStatusFilter = (statusId) => {
    setSelectedStatuses((prev) => {
      let next;
      if (prev.includes(statusId)) {
        if (prev.length === 1) return prev; // Pertahankan minimal 1 status aktif
        next = prev.filter((s) => s !== statusId);
      } else {
        next = [...prev, statusId];
      }
      try {
        localStorage.setItem('aldepos_gantt_status_filters', JSON.stringify(next));
      } catch (e) {
        console.warn('Failed to save gantt status filters:', e);
      }
      return next;
    });
  };

  const toggleAllStatuses = () => {
    let next;
    if (selectedStatuses.length === STATUS_FILTER_OPTIONS.length) {
      next = ['planned', 'in_progress'];
    } else {
      next = STATUS_FILTER_OPTIONS.map((o) => o.id);
    }
    try {
      localStorage.setItem('aldepos_gantt_status_filters', JSON.stringify(next));
    } catch (e) {
      console.warn('Failed to save gantt status filters:', e);
    }
    setSelectedStatuses(next);
  };

  // Hitung jumlah tugas per status dari raw data
  const statsByStatus = useMemo(() => {
    const counts = { planned: 0, in_progress: 0, completed: 0, cancelled: 0 };
    if (!data) return counts;
    data.forEach((item) => {
      const st = String(item.status || 'planned').toLowerCase().trim();
      if (st === 'cancelled' || st === 'canceled' || st === 'dibatalkan' || st === 'batal') {
        counts.cancelled += 1;
      } else if (st === 'planned' || st === 'todo' || st === 'direncanakan') {
        counts.planned += 1;
      } else if (st === 'completed' || st === 'done' || st === 'selesai' || (Number(item.progress_percent) || 0) >= 100) {
        counts.completed += 1;
      } else if (st === 'in_progress' || st === 'sedang_berjalan' || st === 'running' || (Number(item.progress_percent) || 0) > 0) {
        counts.in_progress += 1;
      } else {
        counts.planned += 1;
      }
    });
    return counts;
  }, [data]);

  // Filter data sebelum diteruskan ke visualisasi timeline Gantt
  const filteredData = useMemo(() => {
    if (!data || data.length === 0) return [];
    if (selectedStatuses.length === STATUS_FILTER_OPTIONS.length) return data;
    return data.filter((item) => {
      const st = String(item.status || 'planned').toLowerCase().trim();
      let normSt = 'planned';
      if (st === 'cancelled' || st === 'canceled' || st === 'dibatalkan' || st === 'batal') {
        normSt = 'cancelled';
      } else if (st === 'planned' || st === 'todo' || st === 'direncanakan') {
        normSt = 'planned';
      } else if (st === 'completed' || st === 'done' || st === 'selesai' || (Number(item.progress_percent) || 0) >= 100) {
        normSt = 'completed';
      } else if (st === 'in_progress' || st === 'sedang_berjalan' || st === 'running' || (Number(item.progress_percent) || 0) > 0) {
        normSt = 'in_progress';
      } else {
        normSt = 'planned';
      }
      return selectedStatuses.includes(normSt);
    });
  }, [data, selectedStatuses, STATUS_FILTER_OPTIONS.length]);

  // 3. Parse Rentang Tahun Ajaran (1 Juli - 30 Juni)
  const academicYearInfo = useMemo(() => {
    return parseAcademicYear(academicYear);
  }, [academicYear]);

  // 4. Transformasi Data API Aldepos ke Format SVAR Gantt (Flat Array + Filtered Links)
  const { tasks, links, categories } = useMemo(() => {
    const res = mapDataToSvarFormat(filteredData);
    console.log('[GanttTimelineView] Filtered data count:', filteredData?.length || 0);
    console.log('[GanttTimelineView] Flat tasks count:', res.tasks?.length || 0, res.tasks);
    console.log('[GanttTimelineView] Valid links count:', res.links?.length || 0, res.links);
    return res;
  }, [filteredData]);

  // 5. Konfigurasi Scales SVAR
  const scales = useMemo(() => {
    return getAcademicYearScales(zoomLevel);
  }, [zoomLevel]);

  // 5b. Penanda Garis Hari Ini (Today Marker)
  const markers = useMemo(() => {
    return [
      {
        start: new Date(),
        text: 'Hari Ini',
        css: 'today-marker',
      },
    ];
  }, []);

  // 6. Konfigurasi Kolom Grid Sebelah Kiri
  const columns = useMemo(() => {
    const TaskTextCell = ({ row }) => {
      if (!row) return null;
      const isBidang = row.group_level === 'bidang';
      const isSubBidang = row.group_level === 'sub_bidang';
      const isProgram = row.group_level === 'program';

      if (isBidang) {
        return (
          <div
            style={{
              backgroundColor: 'var(--mj-primary-soft)',
              borderColor: 'var(--mj-primary-border)',
              color: 'var(--mj-primary-fg)',
              padding: '6px 10px',
              borderRadius: '6px',
              width: '100%',
              margin: '2px 0',
              border: '1px solid var(--mj-primary-border)',
            }}
            className="flex items-center gap-2 shadow-xs transition-colors duration-300"
          >
            <span className="text-base shrink-0">🏛️</span>
            <span
              style={{
                fontWeight: 800,
                fontSize: '13px',
                letterSpacing: '0.5px',
                whiteSpace: 'normal',
                wordBreak: 'break-word',
                lineHeight: '1.35',
              }}
              className="uppercase"
            >
              {row.text}
            </span>
          </div>
        );
      }

      if (isSubBidang) {
        return (
          <div
            style={{
              backgroundColor: 'var(--mj-sky-soft)',
              borderColor: 'var(--mj-sky-border)',
              color: 'var(--mj-sky-fg)',
              padding: '5px 8px',
              borderRadius: '6px',
              width: '100%',
              margin: '2px 0',
              border: '1px solid var(--mj-sky-border)',
            }}
            className="flex items-center gap-2 shadow-xs transition-colors duration-300"
          >
            <span className="text-base shrink-0">📁</span>
            <span
              style={{
                fontWeight: 700,
                fontSize: '12px',
                whiteSpace: 'normal',
                wordBreak: 'break-word',
                lineHeight: '1.35',
              }}
            >
              {row.text}
            </span>
          </div>
        );
      }

      if (isProgram) {
        const progId = row.program_id || row.raw_id || null;
        return (
          <div
            style={{
              backgroundColor: 'var(--mj-progress-soft)',
              borderColor: 'var(--mj-progress-border)',
              color: 'var(--mj-progress-fg)',
              padding: '4px 8px',
              borderRadius: '6px',
              width: '100%',
              margin: '2px 0',
              border: '1px solid var(--mj-progress-border)',
            }}
            className="flex items-center justify-between gap-3 pr-2 shadow-xs transition-colors duration-300"
          >
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <span className="text-base shrink-0">📋</span>
              <span
                style={{
                  fontWeight: 700,
                  fontSize: '12px',
                  whiteSpace: 'normal',
                  wordBreak: 'break-word',
                  lineHeight: '1.35',
                }}
                title={row.text}
              >
                {row.text}
              </span>
            </div>

            {/* Tombol Plus Tambah Tugas pada Baris Program - Selalu Muncul Jelas */}
            {onAddTask && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onAddTask(progId);
                }}
                className="shrink-0 flex items-center justify-center w-5 h-5 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white shadow transition hover:scale-110 cursor-pointer border border-indigo-400/40 active:scale-95 ml-2"
                title={`Tambah Tugas untuk Program: ${row.text}`}
              >
                <Plus className="w-3.5 h-3.5 stroke-[3] text-white" />
              </button>
            )}
          </div>
        );
      }

      const tagInfo = getTaskCategory(row.raw_item || row);
      return (
        <div className="flex items-start gap-1.5 w-full py-1 pl-[2px] group cursor-pointer">
          <span
            className="cursor-grab active:cursor-grabbing text-sky-400 hover:text-white bg-sky-500/20 hover:bg-sky-500 active:bg-sky-600 border border-sky-400/50 p-1 rounded-lg transition-all shadow-md shrink-0 flex items-center justify-center group-hover:scale-110 mt-0.5"
            title="Klik & tahan (drag & drop) untuk ubah urutan baris tugas"
          >
            <GripVertical className="w-3.5 h-3.5 stroke-[2.5]" />
          </span>
          <span
            className="w-3 h-3 rounded-full shrink-0 shadow-sm border border-black/15 dark:border-white/15 ml-0.5 mt-1"
            style={{ backgroundColor: tagInfo.color }}
          />
          <span
            style={{
              color: 'var(--mj-text-primary)',
              fontWeight: 700,
              fontSize: '12.5px',
              whiteSpace: 'normal',
              wordBreak: 'break-word',
              lineHeight: '1.35',
            }}
            className="transition-colors duration-300 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 flex-1"
          >
            {row.text}
          </span>
        </div>
      );
    };

    const TaskStartCell = ({ row }) => {
      if (!row) return null;
      if (row.is_group || row.type === 'summary' || String(row.id || '').startsWith('grp-')) {
        return null;
      }
      const val = row.start;
      if (!val) return <span style={{ color: 'var(--mj-text-muted)' }}>-</span>;
      const d = val instanceof Date ? val : new Date(val);
      if (isNaN(d.getTime())) return <span style={{ color: 'var(--mj-text-muted)' }}>-</span>;
      const formatted = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
      return (
        <span
          style={{
            color: 'var(--mj-text-primary)',
            fontWeight: 700,
            fontSize: '12px',
          }}
          className="transition-colors duration-300 cursor-pointer"
        >
          {formatted}
        </span>
      );
    };

    const TaskProgressCell = ({ row }) => {
      if (!row) return null;
      if (row.is_group || row.type === 'summary' || String(row.id || '').startsWith('grp-')) {
        return null;
      }

      // Prioritas Utama: Evaluasi status eksplisit terlebih dahulu
      const rawStatus = String(row.status || row.normalized_status || row.raw_item?.status || '').toLowerCase().trim();
      const p = Number(row.progress !== undefined ? row.progress : (row.raw_item?.progress_percent || 0)) || 0;

      let statusKey = 'planned';
      if (rawStatus === 'cancelled' || rawStatus === 'canceled' || rawStatus === 'dibatalkan' || rawStatus === 'batal') {
        statusKey = 'cancelled';
      } else if (rawStatus === 'planned' || rawStatus === 'todo' || rawStatus === 'direncanakan') {
        statusKey = 'planned';
      } else if (rawStatus === 'completed' || rawStatus === 'done' || rawStatus === 'selesai') {
        statusKey = 'done';
      } else if (rawStatus === 'in_progress' || rawStatus === 'progress' || rawStatus === 'sedang_berjalan') {
        statusKey = 'in_progress';
      } else if (p === 100) {
        statusKey = 'done';
      } else if (p > 0) {
        statusKey = 'in_progress';
      } else {
        statusKey = 'planned';
      }

      if (statusKey === 'done') {
        return (
          <span
            className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide border inline-block transition-colors duration-300 ${
              isDark
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
            }`}
          >
            Done
          </span>
        );
      }

      if (statusKey === 'cancelled') {
        return (
          <span
            className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide border inline-block transition-colors duration-300 ${
              isDark
                ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                : 'bg-rose-50 text-rose-700 border-rose-200'
            }`}
          >
            Cancelled
          </span>
        );
      }

      if (statusKey === 'planned') {
        return (
          <span
            className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide border inline-block transition-colors duration-300 ${
              isDark
                ? 'bg-slate-800 text-slate-300 border-slate-700'
                : 'bg-slate-100 text-slate-700 border-slate-300'
            }`}
          >
            Planned
          </span>
        );
      }

      // Status in_progress -> Tampilkan nilai persentase progress (%)
      return (
        <span
          className={`px-2.5 py-0.5 rounded-full text-[11px] font-extrabold border inline-block transition-colors duration-300 ${
            isDark
              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
              : 'bg-amber-50 text-amber-700 border-amber-200'
          }`}
        >
          {p}%
        </span>
      );
    };

    return [
      {
        id: 'text',
        header: 'Bidang / Sub Bidang / Program / Aktivitas',
        width: 530,
        flexgrow: 1,
        sort: true,
        cell: TaskTextCell,
      },
      {
        id: 'start',
        header: 'Mulai',
        width: 110,
        align: 'center',
        sort: true,
        cell: TaskStartCell,
      },
      {
        id: 'progress',
        header: 'Progres',
        width: 100,
        align: 'center',
        sort: true,
        cell: TaskProgressCell,
      },
    ];
  }, [onAddTask, isDark]);

  // 7. Handler Sinkronisasi Mutasi (Drag, Resize, Progress Drag, Form Edit) ke Backend
  const handleTaskScheduleMutation = useCallback(
    async (taskId, updatedTaskFields = {}) => {
      const apiInstance = ganttApiRef.current;
      const currentTask = apiInstance?.getTask ? apiInstance.getTask(taskId) : null;
      if (!currentTask || currentTask.is_group || currentTask.type === 'summary') return;

      const originalItem =
        data.find((d) => String(d.id) === String(taskId) || String(d.raw_id) === String(taskId)) ||
        currentTask.raw_item ||
        {};

      const mergedTask = { ...currentTask, ...updatedTaskFields };

      let payloadInfo;
      try {
        payloadInfo = mapSvarChangeToApiPayload(mergedTask, originalItem);
      } catch (err) {
        console.error('Gagal membuat payload mutasi:', err);
        return;
      }

      const { item_type, raw_id, endpoint, body, updatedItem } = payloadInfo;

      // Optimistic Update ke parent
      if (onScheduleChange) {
        onScheduleChange(updatedItem);
      }

      setIsSaving(true);
      try {
        const res = await apiService.patch(endpoint, body);
        if (!res.data?.success && res.status >= 400) {
          throw new Error(res.data?.message || 'Gagal menyimpan jadwal ke server');
        }

        // Sinkronisasi teks judul jika diedit via form editor
        if (mergedTask.text && originalItem.title && mergedTask.text !== originalItem.title) {
          const detailEndpoint =
            item_type === 'activity'
              ? `/manajemen/work-plan-activities/${raw_id}`
              : `/manajemen/tasks/${raw_id}`;

          await apiService
            .put(detailEndpoint, {
              title: mergedTask.text,
              status: originalItem.status,
            })
            .catch((e) => console.warn('Sync text detail warning:', e));
        }
      } catch (err) {
        console.error('Error saat menyimpan perubahan jadwal:', err);
        const errMsg =
          err.response?.data?.message ||
          err.message ||
          'Terjadi kesalahan saat menyimpan perubahan jadwal ke server.';

        alert(`Gagal menyimpan: ${errMsg}`);

        if (onScheduleChange && originalItem) {
          onScheduleChange(originalItem.raw_item || originalItem);
        }
      } finally {
        setIsSaving(false);
      }
    },
    [data, onScheduleChange]
  );

  // 8. Inisialisasi API SVAR Gantt & Event Listeners
  const handleGanttInit = useCallback(
    (api) => {
      ganttApiRef.current = api;
      setGanttApi(api);

      api.on('select-task', ({ id }) => {
        if (!id) return;
        const idStr = String(id);
        if (idStr.startsWith('grp-') || idStr.includes('summary')) return;

        const taskObj = api.getTask ? api.getTask(id) : null;
        if (taskObj && (taskObj.is_group || taskObj.type === 'summary')) {
          return;
        }

        if (taskObj && onItemClick) {
          const original = taskObj.raw_item || taskObj;
          onItemClick(original);
        } else if (onItemClick) {
          const found = data.find((d) => String(d.id) === String(id) || String(d.raw_id) === String(id));
          if (found) onItemClick(found);
        }
      });

      // Cegah popup editor internal untuk Bidang, Sub Bidang, dan Program
      api.intercept('show-editor', (ev) => {
        if (ev?.id && (String(ev.id).startsWith('grp-') || String(ev.id).includes('summary'))) {
          return false;
        }
      });
      api.intercept('open-editor', (ev) => {
        if (ev?.id && (String(ev.id).startsWith('grp-') || String(ev.id).includes('summary'))) {
          return false;
        }
      });

      api.on('update-task', ({ id, task, inProgress, eventSource }) => {
        if (inProgress || eventSource === 'external-sync') return;
        if (String(id).startsWith('grp-')) return;
        handleTaskScheduleMutation(id, task);
      });

      api.on('move-task', ({ id, mode, target, inProgress }) => {
        if (inProgress) return;
        if (String(id).startsWith('grp-') || String(target || '').startsWith('grp-')) return;
        if (onTaskReorder) {
          onTaskReorder(id, target, mode);
        }
      });
    },
    [data, onItemClick, handleTaskScheduleMutation, onTaskReorder]
  );

  // 9. Sinkronisasi Data Eksternal (misal: Edit dari Drawer) ke SVAR Gantt Store
  useEffect(() => {
    const apiInstance = ganttApiRef.current;
    if (!apiInstance || !data || data.length === 0) return;

    data.forEach((item) => {
      const itemType = item.item_type || (item.program_id ? 'activity' : 'task');
      const rawId = item.raw_id !== undefined ? item.raw_id : item.id;
      const taskId = String(item.id || `${itemType}-${rawId}`);

      const existing = apiInstance.getTask ? apiInstance.getTask(taskId) : null;
      if (existing) {
        const tagInfo = getTaskCategory(item);
        apiInstance.exec('update-task', {
          id: taskId,
          task: {
            text: item.title || item.name || existing.text,
            progress: Number(item.progress_percent) || 0,
            status: item.status,
            type: tagInfo.id,
            raw_item: item,
          },
          eventSource: 'external-sync',
        });
      }
    });
  }, [data]);

  // 10. Statistik Ringkasan Data
  const stats = useMemo(() => {
    const total = data.length;
    const inProgress = data.filter((t) => t.status === 'in_progress' || t.status === 'sedang_berjalan').length;
        const completed = data.filter((t) => t.status === 'completed' || t.status === 'done' || (Number(t.progress_percent) || 0) >= 100).length;
    const planned = data.filter((t) => t.status === 'planned' || t.status === 'todo').length;
    const milestones = data.filter((t) => t.type === 'milestone' || t.is_milestone).length;

    return { total, inProgress, completed, planned, milestones };
  }, [data]);

  const isDayView = zoomLevel === 'day';
  const cellWidth = zoomLevel === 'day' ? 42 : zoomLevel === 'week' ? 75 : zoomLevel === 'month' ? 140 : 260;

  // 11. Perhitungan Posisi Garis Hari Ini (Today Marker Position)
  const todayLeftPx = useMemo(() => {
    const start = academicYearInfo.startDate;
    const now = new Date();
    const diffMs = now.getTime() - start.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);

    if (zoomLevel === 'day') {
      return diffDays * cellWidth;
    } else if (zoomLevel === 'week') {
      return (diffDays / 7) * cellWidth;
    } else if (zoomLevel === 'month') {
      const diffMonths =
        (now.getFullYear() - start.getFullYear()) * 12 +
        (now.getMonth() - start.getMonth()) +
        now.getDate() / 31;
      return diffMonths * cellWidth;
    } else {
      const diffMonths =
        (now.getFullYear() - start.getFullYear()) * 12 +
        (now.getMonth() - start.getMonth()) +
        now.getDate() / 31;
      return (diffMonths / 6) * cellWidth;
    }
  }, [academicYearInfo.startDate, zoomLevel, cellWidth]);

  // Handler Scroll Langsung Menuju Hari Ini
  const scrollToToday = useCallback(() => {
    const chartEl = document.querySelector('.wx-chart');
    if (chartEl) {
      const targetScroll = Math.max(0, todayLeftPx - chartEl.clientWidth / 2 + 50);
      chartEl.scrollTo({
        left: targetScroll,
        behavior: 'smooth',
      });
    }
    if (ganttApiRef.current?.exec) {
      const targetScroll = Math.max(0, todayLeftPx - 300);
      ganttApiRef.current.exec('scroll-chart', { left: targetScroll });
    }
  }, [todayLeftPx]);

  // Injeksi Garis Pemisah Antar Bulan ke dalam Canvas Timeline (.wx-area)
  // Menjamin keselarasan presisi (100% sejajar) dengan header bulan SVAR
  useEffect(() => {
    const attachMonthDividers = () => {
      const areaEl = document.querySelector('.wx-chart .wx-area') || document.querySelector('.wx-chart');
      if (!areaEl) return;

      let dividersContainer = document.getElementById('aldepos-month-dividers-layer');

      // Pada skala bulan dan semester, setiap kolom grid sudah mewakili 1 bulan penuh (skip)
      if (zoomLevel === 'month' || zoomLevel === 'semester') {
        if (dividersContainer) dividersContainer.remove();
        return;
      }

      // Ambil posisi header bulan langsung dari DOM SVAR Gantt (.scale-month-header)
      const scaleHeaderCells = document.querySelectorAll('.wx-chart .wx-scale .scale-month-header');
      const boundaryPositions = [];

      if (scaleHeaderCells && scaleHeaderCells.length > 1) {
        // Ambil koordinat offsetLeft langsung dari header bulan SVAR yang sudah ter-render presisi
        scaleHeaderCells.forEach((cell, idx) => {
          if (idx === 0) return; // Lewati awal bulan pertama (tepi kiri canvas)
          const leftPx = cell.offsetLeft;
          const text = cell.textContent || '';
          const cleanText = text.replace(/\[.*?\]/g, '').trim();
          const shortMonth = cleanText.split(' ')[0] || '';

          boundaryPositions.push({
            id: `mb-hdr-${idx}`,
            leftPx,
            label: cleanText,
            shortMonth,
          });
        });
      } else {
        // Fallback jika header DOM belum siap
        const start = academicYearInfo.startDate;
        const startYear = start.getFullYear();
        for (let i = 1; i <= 11; i++) {
          const monthIdx = (6 + i) % 12;
          const year = 6 + i >= 12 ? startYear + 1 : startYear;
          const boundaryDate = new Date(year, monthIdx, 1, 0, 0, 0, 0);
          const diffMs = boundaryDate.getTime() - start.getTime();
          const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
          const leftPx = zoomLevel === 'day' ? diffDays * cellWidth : (diffDays / 7) * cellWidth;
          boundaryPositions.push({
            id: `mb-calc-${year}-${monthIdx}`,
            leftPx,
            label: `${ID_MONTHS[monthIdx]} ${year}`,
            shortMonth: ID_MONTHS_SHORT[monthIdx] || '',
          });
        }
      }

      if (boundaryPositions.length === 0) {
        if (dividersContainer) dividersContainer.remove();
        return;
      }

      if (!dividersContainer) {
        dividersContainer = document.createElement('div');
        dividersContainer.id = 'aldepos-month-dividers-layer';
        dividersContainer.style.cssText = `
          position: absolute;
          inset: 0;
          pointer-events: none;
          z-index: 2;
          overflow: visible;
        `;
        areaEl.insertBefore(dividersContainer, areaEl.firstChild);
      }

      const isLight = !isDark;
      const lineColor = isLight ? '#94a3b8' : '#475569';
      const tagBg = isLight ? '#f1f5f9' : '#1e293b';
      const tagColor = isLight ? '#334155' : '#cbd5e1';
      const tagBorder = isLight ? '#cbd5e1' : '#334155';

      dividersContainer.innerHTML = boundaryPositions
        .map(
          (b) => `
          <div
            class="aldepos-month-divider-line"
            style="
              position: absolute;
              left: ${b.leftPx}px;
              top: 0;
              bottom: 0;
              width: 2px;
              background-color: ${lineColor};
              box-shadow: ${isLight ? '0 0 2px rgba(15,23,42,0.1)' : '0 0 4px rgba(0,0,0,0.5)'};
              pointer-events: none;
              z-index: 2;
            "
            title="Batas Bulan: ${b.label}"
          >
            <div
              style="
                position: sticky;
                top: 4px;
                left: 0;
                transform: translateX(-50%);
                background-color: ${tagBg};
                color: ${tagColor};
                border: 1px solid ${tagBorder};
                font-size: 9.5px;
                font-weight: 800;
                padding: 1px 5px;
                border-radius: 5px;
                white-space: nowrap;
                letter-spacing: 0.3px;
                text-transform: uppercase;
                box-shadow: 0 1px 3px rgba(0,0,0,0.12);
                pointer-events: none;
                display: inline-block;
              "
            >
              1 ${b.shortMonth}
            </div>
          </div>
        `
        )
        .join('');
    };

    attachMonthDividers();
    const timer = setInterval(attachMonthDividers, 300);
    return () => clearInterval(timer);
  }, [zoomLevel, cellWidth, academicYearInfo.startDate, isDark]);

  // Injeksi Garis Penanda Hari Ini ke dalam Canvas Timeline (.wx-area)
  useEffect(() => {
    const attachMarker = () => {
      const areaEl = document.querySelector('.wx-chart .wx-area') || document.querySelector('.wx-chart');
      if (!areaEl) return;

      let markerEl = document.getElementById('aldepos-today-line-marker');
      if (!markerEl) {
        markerEl = document.createElement('div');
        markerEl.id = 'aldepos-today-line-marker';
        areaEl.appendChild(markerEl);
      }

      const now = new Date();
      const dayStr = `${now.getDate()} ${ID_MONTHS_SHORT[now.getMonth()] || ''}`;

      markerEl.style.cssText = `
        position: absolute;
        left: ${todayLeftPx}px;
        top: 0;
        bottom: 0;
        width: 2.5px;
        background-color: #ef4444;
        z-index: 35;
        pointer-events: none;
        box-shadow: 0 0 10px rgba(239, 68, 68, 0.8);
      `;

      markerEl.innerHTML = `
        <div style="position: sticky; top: 6px; left: 0; transform: translateX(-50%); background-color: #ef4444; color: #ffffff; font-size: 10.5px; font-weight: 800; padding: 2.5px 8px; border-radius: 9999px; box-shadow: 0 3px 10px rgba(239, 68, 68, 0.55); white-space: nowrap; display: inline-flex; align-items: center; gap: 3px; border: 1.5px solid #ffffff; letter-spacing: 0.3px; pointer-events: auto;">
          <span>📍</span> Hari Ini (${dayStr})
        </div>
      `;
    };

    attachMarker();
    const timer = setInterval(attachMarker, 400);
    return () => clearInterval(timer);
  }, [todayLeftPx]);

  return (
    <div
      ref={containerRef}
      className={`border shadow-2xl space-y-4 transition-all duration-300 flex flex-col aldepos-gantt-wrapper ${
        isFullscreen
          ? 'fixed inset-0 z-50 w-screen h-screen rounded-none p-5 overflow-hidden'
          : 'rounded-3xl p-6 min-h-[680px] sticky top-0 z-20'
      } ${
        isDark
          ? 'bg-slate-900 border-slate-800 text-slate-100 aldepos-gantt-dark'
          : 'bg-white border-slate-200 text-slate-800 aldepos-gantt-light shadow-slate-200/50'
      }`}
    >
      {/* Top Header & Toolbar Controls */}
      <div
        className={`flex flex-col gap-3 pb-4 border-b ${
          isDark ? 'border-slate-800' : 'border-slate-200'
        }`}
      >
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          {/* Left: Title, Academic Year Badge & Status Indicator */}
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-xl font-black tracking-tight flex items-center gap-2">
                <Calendar className="w-5 h-5 text-indigo-500" />
                Timeline Gantt Chart
              </h2>
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold border transition-colors ${
                  isDark
                    ? 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30'
                    : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                }`}
              >
                {academicYearInfo.fullLabel}
              </span>

              {/* Mode Indicator: Day (Interactive) vs Month/Week (Locked View) */}
              <span
                className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                  isDayView
                    ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                    : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}
              >
                {isDayView ? (
                  <>
                    <MoveHorizontal className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Mode Geser Harian</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-3.5 h-3.5 text-slate-400" />
                    <span>Tampilan Ringkas</span>
                  </>
                )}
              </span>

              {/* Loading Indicator saat Simpan */}
              {isSaving && (
                <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 animate-pulse">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Menyimpan...</span>
                </span>
              )}
            </div>

            {/* KPI Mini Badges */}
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 pt-1">
              <span className="font-semibold text-slate-300">
                Total Tugas: <b className="text-white">{stats.total}</b>
              </span>
              <span>&bull;</span>
              <span className="flex items-center gap-1 text-emerald-400 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" /> Selesai: <b>{stats.completed}</b>
              </span>
              <span>&bull;</span>
              <span className="flex items-center gap-1 text-amber-400 font-medium">
                <Clock className="w-3.5 h-3.5" /> Berjalan: <b>{stats.inProgress}</b>
              </span>
              <span>&bull;</span>
              <span className="flex items-center gap-1 text-indigo-400 font-medium">
                <AlertCircle className="w-3.5 h-3.5" /> Terencana: <b>{stats.planned}</b>
              </span>
              {stats.milestones > 0 && (
                <>
                  <span>&bull;</span>
                  <span className="flex items-center gap-1 text-purple-400 font-medium">
                    <Gem className="w-3.5 h-3.5" /> Milestone: <b>{stats.milestones}</b>
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Right: Controls (Tambah Tugas, Hari Ini Button, Zoom Switcher & Theme Toggle) */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Tombol Tambah Tugas */}
            {onAddTask && (
              <button
                type="button"
                onClick={onAddTask}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-2xl text-xs font-bold transition-all shadow-md cursor-pointer bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/30 hover:scale-[1.02] active:scale-[0.98]"
                title="Tambah Tugas / Jadwal Aktivitas Baru"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Tugas</span>
              </button>
            )}

            {/* Tombol Langsung Menuju Hari Ini */}
            <button
              type="button"
              onClick={scrollToToday}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-2xl border text-xs font-extrabold transition-all shadow-xs cursor-pointer ${
                isDark
                  ? 'bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border-rose-500/30 hover:border-rose-500/50'
                  : 'bg-rose-50 hover:bg-rose-100 text-black border-rose-300 hover:border-rose-400'
              }`}
              title="Klik untuk langsung memusatkan timeline ke posisi tanggal Hari Ini"
            >
              <Clock className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 animate-pulse" />
              <span className={isDark ? 'text-rose-300' : 'text-black font-extrabold'}>Hari Ini</span>
            </button>

            {/* Zoom Level Switcher */}
            <div
              className={`flex items-center gap-1 p-1 rounded-2xl border ${
                isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-100 border-slate-200'
              }`}
            >
              <span
                className={`text-xs font-bold px-2 flex items-center gap-1 ${
                  isDark ? 'text-slate-400' : 'text-slate-500'
                }`}
              >
                <Layers className="w-3.5 h-3.5" /> Skala:
              </span>
              {[
                { id: 'day', label: 'Hari (Edit)' },
                { id: 'week', label: 'Minggu' },
                { id: 'month', label: 'Bulan' },
                { id: 'semester', label: 'Semester' },
              ].map((z) => (
                <button
                  key={z.id}
                  type="button"
                  onClick={() => handleSetZoomLevel(z.id)}
                  className={`px-3 py-1 text-xs font-bold rounded-xl transition-all ${
                    zoomLevel === z.id
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                      : isDark
                      ? 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
                  }`}
                >
                  {z.label}
                </button>
              ))}
            </div>

            {/* Theme Toggle Button */}
            <button
              type="button"
              onClick={toggleTheme}
              title={`Ganti ke ${isDark ? 'Tema Terang (Light)' : 'Tema Gelap (Dark)'}`}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-2xl border text-xs font-bold transition-all shadow-sm ${
                isDark
                  ? 'bg-slate-800 hover:bg-slate-700 text-amber-300 border-slate-700 hover:border-slate-600'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300 hover:border-slate-400'
              }`}
            >
              {isDark ? (
                <>
                  <Sun className="w-4 h-4 text-amber-400" />
                  <span>Mode Terang</span>
                </>
              ) : (
                <>
                  <Moon className="w-4 h-4 text-indigo-600" />
                  <span>Mode Gelap</span>
                </>
              )}
            </button>

            {/* Fullscreen Toggle Button */}
            <button
              type="button"
              onClick={toggleFullscreen}
              title={isFullscreen ? 'Keluar dari Layar Penuh (Esc)' : 'Tampilkan Layar Penuh (Fullscreen)'}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-2xl border text-xs font-bold transition-all shadow-sm cursor-pointer ${
                isFullscreen
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30'
                  : isDark
                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700 hover:border-slate-600'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300 hover:border-slate-400'
              }`}
            >
              {isFullscreen ? (
                <>
                  <Minimize2 className="w-3.5 h-3.5 text-amber-400" />
                  <span>Keluar Fullscreen</span>
                </>
              ) : (
                <>
                  <Maximize2 className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Fullscreen</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Row 2: Status Filter Checklist Bar */}
        <div
          className={`flex flex-wrap items-center justify-between gap-3 pt-2.5 px-3.5 py-2 rounded-2xl border transition-colors ${
            isDark ? 'bg-slate-950/60 border-slate-800/80' : 'bg-slate-50 border-slate-200/80'
          }`}
        >
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`text-xs font-bold flex items-center gap-1.5 mr-1 ${
                isDark ? 'text-slate-400' : 'text-slate-600'
              }`}
            >
              <Filter className="w-3.5 h-3.5 text-indigo-400" />
              Filter Status:
            </span>

            {STATUS_FILTER_OPTIONS.map((opt) => {
              const isChecked = selectedStatuses.includes(opt.id);
              const count = statsByStatus[opt.id] || 0;
              return (
                <label
                  key={opt.id}
                  onClick={(e) => {
                    e.preventDefault();
                    toggleStatusFilter(opt.id);
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold border transition-all cursor-pointer select-none ${
                    isChecked
                      ? `${opt.badgeBg} shadow-sm ring-1 ring-white/10`
                      : isDark
                      ? 'bg-slate-900/60 text-slate-500 border-slate-800 hover:text-slate-400'
                      : 'bg-white text-slate-400 border-slate-200 hover:text-slate-600'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    readOnly
                    className="w-3.5 h-3.5 rounded border-slate-700 accent-indigo-600 cursor-pointer pointer-events-none"
                  />
                  <span>{opt.label}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
                      isChecked
                        ? 'bg-black/20 text-inherit'
                        : isDark
                        ? 'bg-slate-800 text-slate-500'
                        : 'bg-slate-100 text-slate-400'
                    }`}
                  >
                    {count}
                  </span>
                </label>
              );
            })}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={toggleAllStatuses}
              className={`text-[11px] font-bold px-2.5 py-1 rounded-xl transition border cursor-pointer ${
                selectedStatuses.length === STATUS_FILTER_OPTIONS.length
                  ? isDark
                    ? 'bg-slate-800 text-indigo-300 border-slate-700 hover:bg-slate-750'
                    : 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100'
                  : isDark
                  ? 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                  : 'bg-white text-slate-600 border-slate-200 hover:text-slate-900'
              }`}
            >
              {selectedStatuses.length === STATUS_FILTER_OPTIONS.length ? 'Hanya Aktif' : 'Pilih Semua'}
            </button>
            <span className={`text-[11px] font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Menampilkan <b>{filteredData.length}</b> dari <b>{data.length}</b> tugas
            </span>
          </div>
        </div>
      </div>

      {/* CSS untuk visibilitas tinggi, kontras tajam, pembersihan batang summary, dan efek colspan baris grup */}
      <style>{`
        .wx-bar.wx-summary,
        .wx-bars .wx-summary,
        .wx-bar[data-task-id^="grp-"],
        .wx-bar[data-id^="grp-"] {
          display: none !important;
          visibility: hidden !important;
          opacity: 0 !important;
          pointer-events: none !important;
          height: 0 !important;
          width: 0 !important;
        }

        /* 0. HEADER & SCALE TYPOGRAPHY DUAL THEME */
        .wx-header .wx-cell,
        .wx-header .wx-table-cell,
        .wx-header .wx-grid-cell,
        .wx-scale .wx-cell,
        .wx-scales .wx-cell {
          font-weight: 800 !important;
          color: ${isDark ? '#cbd5e1' : '#0f172a'} !important;
          background-color: ${isDark ? '#0f172a' : '#f8fafc'} !important;
        }

        /* 1. VISIBILITAS TEKS KONTRAST TINGGI (High Contrast) untuk semua sel tabel dan chart */
        .wx-cell, .wx-table-cell, .wx-grid-cell, .wx-tree-cell, .wx-text, .wx-content, .wx-text-out {
          color: ${isDark ? '#f8fafc' : '#0f172a'} !important;
          font-weight: 600 !important;
          opacity: 1 !important;
        }
        .wx-cell .wx-text, .wx-grid-cell .wx-text {
          color: ${isDark ? '#f8fafc' : '#0f172a'} !important;
        }
        .wx-tree-cell .wx-table-tree-toggle {
          color: ${isDark ? '#94a3b8' : '#334155'} !important;
          font-size: 14px;
        }

        /* Tanggal Mulai & Progres di tabel */
        .wx-cell[data-col-id="start"],
        .wx-cell[data-col-id="progress"] {
          color: ${isDark ? '#f8fafc' : '#0f172a'} !important;
          font-weight: 700 !important;
        }

        /* 2. WARNA LATAR BELAKANG COLSPAN MENYELURUH (BIDANG, SUB BIDANG, PROGRAM) TANPA GARIS VERTIKAL */
        /* Bidang (Level 1) */
        .wx-cell[data-row-id*="grp-bidang"],
        .wx-row[data-id*="grp-bidang"] .wx-cell,
        .wx-row[data-id*="grp-bidang"] {
          background-color: ${isDark ? '#1e1b4b' : '#e0e7ff'} !important;
          border-left: none !important;
        }
        .wx-cell[data-row-id*="grp-bidang"] span,
        .wx-row[data-id*="grp-bidang"] span {
          color: ${isDark ? '#e0e7ff' : '#1e1b4b'} !important;
          font-weight: 800 !important;
        }

        /* Sub Bidang (Level 2) */
        .wx-cell[data-row-id*="grp-subbidang"],
        .wx-row[data-id*="grp-subbidang"] .wx-cell,
        .wx-row[data-id*="grp-subbidang"] {
          background-color: ${isDark ? '#082f49' : '#e0f2fe'} !important;
          border-left: none !important;
        }
        .wx-cell[data-row-id*="grp-subbidang"] span,
        .wx-row[data-id*="grp-subbidang"] span {
          color: ${isDark ? '#e0f2fe' : '#075985'} !important;
          font-weight: 700 !important;
        }

        /* Program (Level 3) */
        .wx-cell[data-row-id*="grp-prog"],
        .wx-row[data-id*="grp-prog"] .wx-cell,
        .wx-row[data-id*="grp-prog"] {
          background-color: ${isDark ? '#451a03' : '#fef3c7'} !important;
          border-left: none !important;
        }
        .wx-cell[data-row-id*="grp-prog"] span,
        .wx-row[data-id*="grp-prog"] span {
          color: ${isDark ? '#fef3c7' : '#78350f'} !important;
          font-weight: 700 !important;
        }

        /* Hilangkan garis pemisah sel antar-kolom khusus pada baris grup agar menyatu mulus seperti colspan */
        .wx-row[data-id*="grp-"] .wx-cell,
        .wx-cell[data-row-id*="grp-"] {
          border-right: none !important;
          border-left: none !important;
        }

        /* 3. SEMUA LEVEL RATA KIRI PENUH DENGAN FITUR MELIPAT (Interactive Folding) */
        /* Hilangkan semua placeholder / spacer yang mendorong baris berjenjang ke kanan */
        .wx-toggle-placeholder,
        .wx-tree-spacer,
        .wx-tree-indent,
        .wx-spacer,
        .wx-indent,
        .wx-tree-level,
        .wx-table-tree-spacer,
        .wx-cell[data-col-id="text"] span[class*="spacer"],
        .wx-cell[data-col-id="text"] span[class*="indent"],
        .wx-cell[data-col-id="text"] span[class*="placeholder"],
        .wx-cell[data-col-id="text"] > span:empty,
        .wx-cell > span[style*="margin"],
        .wx-cell > span[style*="Margin"] {
          margin: 0px !important;
          padding: 0px !important;
          width: 0px !important;
          min-width: 0px !important;
          max-width: 0px !important;
          display: none !important;
          visibility: hidden !important;
          flex: 0 0 0px !important;
          pointer-events: none !important;
        }

        /* Tampilkan tombol lipat / toggle icon sejajar di tepi kiri */
        .wx-toggle-icon,
        .wx-table-tree-toggle,
        .wx-tree-toggle {
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          width: 18px !important;
          min-width: 18px !important;
          height: 18px !important;
          margin: 0 4px 0 2px !important;
          padding: 0 !important;
          cursor: pointer !important;
          visibility: visible !important;
          pointer-events: auto !important;
          z-index: 25 !important;
          flex-shrink: 0 !important;
          transition: transform 0.15s ease;
          color: ${isDark ? '#cbd5e1' : '#475569'} !important;
        }

        .wx-content,
        .wx-cell .wx-content {
          padding-left: 0px !important;
          margin-left: 0px !important;
          width: 100% !important;
          overflow: visible !important;
        }

        .wx-text,
        .wx-cell .wx-text {
          padding-left: 0px !important;
          margin-left: 0px !important;
          width: 100% !important;
          overflow: visible !important;
          text-overflow: clip !important;
        }

        .wx-table .wx-grid .wx-cell:first-child,
        .wx-table .wx-grid .wx-header .wx-cell:first-child,
        .wx-cell[data-col-id="text"],
        .wx-cell:first-child {
          display: flex !important;
          align-items: center !important;
          padding-left: 0px !important;
          margin-left: 0px !important;
          overflow: visible !important;
        }

        .wx-data .wx-row[data-id^="grp-"]:hover .wx-cell {
          filter: brightness(${isDark ? '1.15' : '0.96'});
        }

        /* 4. GARIS PENANDA HARI INI (TODAY MARKER) */
        .wx-marker {
          position: absolute;
          top: 0;
          bottom: 0;
          width: 2px !important;
          background-color: #ef4444 !important;
          z-index: 25 !important;
          pointer-events: none !important;
        }

        .wx-marker .wx-content {
          position: absolute;
          top: 4px;
          left: 4px;
          background-color: #ef4444 !important;
          color: #ffffff !important;
          font-size: 10px !important;
          font-weight: 800 !important;
          padding: 2px 7px !important;
          border-radius: 5px !important;
          white-space: nowrap !important;
          box-shadow: 0 2px 8px rgba(239, 68, 68, 0.45) !important;
          pointer-events: auto !important;
          letter-spacing: 0.3px;
        }

        .aldepos-gantt-dark .wx-marker {
          background-color: #f87171 !important;
        }
        .aldepos-gantt-dark .wx-marker .wx-content {
          background-color: #ef4444 !important;
          color: #ffffff !important;
        }

        /* 5. VISIBILITAS NAMA BIDANG, SUB BIDANG, DAN PROGRAM (Membentang Penuh tanpa Terpotong Kolom Lain) */
        .wx-table .wx-row[data-id*="grp-"],
        .wx-grid .wx-row[data-id*="grp-"],
        .wx-data .wx-row[data-id*="grp-"],
        .wx-row[data-id*="grp-"],
        .wx-row[data-row-id*="grp-"] {
          overflow: visible !important;
          z-index: 10 !important;
        }

        .wx-row[data-id*="grp-"] .wx-cell,
        .wx-row[data-row-id*="grp-"] .wx-cell,
        .wx-cell[data-row-id*="grp-"] {
          overflow: visible !important;
        }

        .wx-row[data-id*="grp-"] .wx-cell:first-child,
        .wx-row[data-id*="grp-"] .wx-cell[data-col-id="text"],
        .wx-row[data-row-id*="grp-"] .wx-cell:first-child,
        .wx-row[data-row-id*="grp-"] .wx-cell[data-col-id="text"],
        .wx-cell[data-row-id*="grp-"]:first-child,
        .wx-cell[data-row-id*="grp-"][data-col-id="text"] {
          overflow: visible !important;
          z-index: 30 !important;
          position: relative !important;
        }

        .wx-row[data-id*="grp-"] .wx-cell:first-child *,
        .wx-row[data-id*="grp-"] .wx-cell[data-col-id="text"] *,
        .wx-row[data-row-id*="grp-"] .wx-cell:first-child *,
        .wx-row[data-row-id*="grp-"] .wx-cell[data-col-id="text"] *,
        .wx-cell[data-row-id*="grp-"]:first-child *,
        .wx-cell[data-row-id*="grp-"][data-col-id="text"] * {
          overflow: visible !important;
          text-overflow: clip !important;
          white-space: nowrap !important;
        }

        .wx-row[data-id*="grp-"] .wx-cell:not(:first-child):not([data-col-id="text"]),
        .wx-row[data-row-id*="grp-"] .wx-cell:not(:first-child):not([data-col-id="text"]),
        .wx-cell[data-row-id*="grp-"]:not(:first-child):not([data-col-id="text"]) {
          pointer-events: none !important;
          z-index: 1 !important;
          overflow: hidden !important;
        }
      `}</style>

      {/* Main SVAR Gantt Chart Container with Built-in Editor Side Panel */}
      <div
        className={`w-full rounded-2xl overflow-hidden border shadow-inner relative transition-all duration-300 flex flex-col ${
          isFullscreen
            ? 'h-[calc(100vh-175px)] min-h-[calc(100vh-175px)] max-h-[calc(100vh-175px)]'
            : 'h-[580px] min-h-[580px] max-h-[580px]'
        } ${
          isDark ? 'border-slate-800 bg-[#101827] aldepos-gantt-dark' : 'border-slate-200 bg-white aldepos-gantt-light'
        }`}
      >
        {tasks.length === 0 ? (
          <div className="flex-1 h-full min-h-[400px] flex flex-col items-center justify-center text-slate-500 space-y-3">
            <Info className="w-10 h-10 text-slate-400" />
            <p className="text-sm font-medium">Belum ada item jadwal untuk ditampilkan dalam timeline ini.</p>
          </div>
        ) : (
          <ThemeComponent>
            <div className="w-full h-full flex-1 flex flex-row relative min-h-0 overflow-hidden">
              <div className="flex-1 w-full h-full relative min-h-0 overflow-hidden">
                <Gantt
                  init={handleGanttInit}
                  theme={isDark ? 'dark' : 'light'}
                  tasks={tasks}
                  links={links}
                  scales={scales}
                  columns={columns}
                  markers={markers}
                  taskTypes={TASK_TYPES}
                  taskTemplate={CustomTaskBarTemplate}
                  start={academicYearInfo.startDate}
                  end={academicYearInfo.endDate}
                  cellWidth={cellWidth}
                  cellHeight={40}
                  scaleHeight={36}
                  readonly={!isDayView}
                  cellBorders="full"
                />
              </div>
            </div>
          </ThemeComponent>
        )}
      </div>

      {/* Info Legend Footer & Category Colors */}
      <div
        className={`flex flex-col md:flex-row md:items-center justify-between text-xs pt-3 border-t gap-3 ${
          isDark ? 'border-slate-800/80 text-slate-400' : 'border-slate-200 text-slate-600'
        }`}
      >
        {/* Tag / Tipe Color Indicators */}
        <div className="flex flex-wrap items-center gap-3.5">
          <span className="font-bold text-[11px] uppercase tracking-wider text-slate-400">
            Warna Tag / Tipe Tugas:
          </span>
          {categories.length > 0 ? (
            categories.map((cat) => (
              <span key={cat.id} className="flex items-center gap-1.5 font-medium">
                <span
                  className="w-3 h-3 rounded-md inline-block shadow-sm"
                  style={{ backgroundColor: cat.color }}
                ></span>
                {cat.label}
              </span>
            ))
          ) : (
            <>
              <span className="flex items-center gap-1.5 font-medium">
                <span className="w-3 h-3 rounded-md bg-indigo-500 inline-block"></span>
                Rapat &amp; Pertemuan
              </span>
              <span className="flex items-center gap-1.5 font-medium">
                <span className="w-3 h-3 rounded-md bg-sky-500 inline-block"></span>
                Koordinasi
              </span>
              <span className="flex items-center gap-1.5 font-medium">
                <span className="w-3 h-3 rounded-md bg-emerald-500 inline-block"></span>
                Dokumen &amp; Administrasi
              </span>
              <span className="flex items-center gap-1.5 font-medium">
                <span className="w-3 h-3 rounded-md bg-rose-500 inline-block"></span>
                Dokumentasi &amp; Media
              </span>
              <span className="flex items-center gap-1.5 font-medium">
                <span className="w-3 h-3 rounded-md bg-amber-500 inline-block"></span>
                Kegiatan Lapangan
              </span>
            </>
          )}

          <span className="flex items-center gap-1.5 font-medium">
            <span className="w-2.5 h-2.5 rotate-45 bg-purple-400 inline-block shadow-sm"></span>
            Milestone
          </span>
        </div>

        <div className="text-[11px] opacity-80 flex items-center gap-1">
          {isDayView ? (
            <span>💡 <b>Tab Hari:</b> Geser tengah batang untuk pindah tanggal, tarik tepi untuk ubah durasi (min 1 hari).</span>
          ) : (
            <span>🔒 <b>Tab {zoomLevel === 'week' ? 'Minggu' : 'Bulan'}:</b> Batang terkunci rapi memenuhi sel periodenya.</span>
          )}
        </div>
      </div>

      {/* Embedded Modals / Popups (tetap muncul dan berinteraksi saat mode Fullscreen aktif) */}
      {children}
    </div>
  );
}
