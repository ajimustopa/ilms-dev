import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../../../shared/store/AuthContext';
import api from '../../../shared/services/api';
import {
  CalendarDays,
  School,
  Building2,
  Plus,
  Edit2,
  Trash2,
  Send,
  History,
  Users,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  FileCheck,
  Tag,
  Star,
  Check,
  ShieldCheck,
  Calendar,
  Layers,
  Lock,
  Sparkles,
  Link as LinkIcon,
  Percent,
  RefreshCw,
  Search,
  Filter,
  CheckSquare,
  ListPlus,
  FolderOpen,
  Maximize2,
  Minimize2,
  Printer,
  Eye,
  X
} from 'lucide-react';
import { useManajemenTheme } from '../theme/ManajemenThemeContext';

// Custom Searchable Select Component with Live Search, Multi-Select & Full Keyboard Navigation (ArrowUp/Down/Enter/Escape)
function SearchableSelect({
  value,
  onChange,
  options = [],
  placeholder = '-- Pilih --',
  searchPlaceholder = 'Ketik untuk mencari...',
  className = '',
  disabled = false,
  allowClear = true,
  required = false,
  isMulti = false,
}) {
  const { isDark } = useManajemenTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const triggerRef = useRef(null);
  const listRef = useRef(null);
  const optionRefs = useRef([]);

  // Normalisasi value multi vs single
  const selectedValues = useMemo(() => {
    if (!isMulti) return value !== undefined && value !== null && value !== '' ? [String(value)] : [];
    if (Array.isArray(value)) return value.map(String);
    if (value !== undefined && value !== null && value !== '') return [String(value)];
    return [];
  }, [value, isMulti]);

  // Filter options berdasarkan search
  const filteredOptions = useMemo(() => {
    if (!search.trim()) return options;
    const q = search.toLowerCase().trim();
    return options.filter((o) => {
      const matchLabel = o.label?.toLowerCase().includes(q);
      const matchSub = o.sublabel?.toLowerCase().includes(q);
      return matchLabel || matchSub;
    });
  }, [options, search]);

  // Reset highlight index saat filter berubah
  useEffect(() => {
    setHighlightedIndex(0);
  }, [filteredOptions.length, search]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (isOpen && optionRefs.current[highlightedIndex]) {
      optionRefs.current[highlightedIndex]?.scrollIntoView({ block: 'nearest' });
    }
  }, [highlightedIndex, isOpen]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Handle single select / toggle multi select
  const handleSelectOption = (optVal) => {
    const valStr = String(optVal);
    if (!isMulti) {
      onChange(optVal);
      setIsOpen(false);
      triggerRef.current?.focus();
    } else {
      const isSelected = selectedValues.includes(valStr);
      let updated;
      if (isSelected) {
        updated = selectedValues.filter((v) => v !== valStr);
      } else {
        updated = [...selectedValues, valStr];
      }
      // Cast ke tipe data aslinya (misal number)
      const castedUpdated = updated.map((v) => {
        const orig = options.find((o) => String(o.value) === String(v));
        return orig ? orig.value : v;
      });
      onChange(castedUpdated);
    }
  };

  // Keyboard navigation handler
  const handleKeyDown = (e) => {
    if (disabled) return;

    if (!isOpen) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) {
        e.preventDefault();
        setSearch('');
        setIsOpen(true);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev < filteredOptions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : filteredOptions.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredOptions.length > 0 && filteredOptions[highlightedIndex]) {
        handleSelectOption(filteredOptions[highlightedIndex].value);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
      triggerRef.current?.focus();
    }
  };

  // Selected options objects
  const selectedOptionObjs = useMemo(() => {
    return selectedValues
      .map((val) => options.find((o) => String(o.value) === String(val)))
      .filter(Boolean);
  }, [selectedValues, options]);

  return (
    <div ref={containerRef} className={`relative ${className}`} onKeyDown={handleKeyDown}>
      {/* Trigger Button */}
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => {
          setSearch('');
          setIsOpen(!isOpen);
        }}
        className={`w-full flex items-center justify-between gap-2 border rounded-xl px-3 py-2 text-xs text-left transition min-h-[38px] shadow-xs ${
          isDark
            ? 'bg-slate-950 border-slate-800 text-slate-200 hover:border-slate-700'
            : 'bg-slate-50 border-slate-300 text-slate-900 hover:border-slate-400'
        } ${
          isOpen
            ? isDark ? 'border-indigo-500 ring-2 ring-indigo-500/30' : 'border-indigo-500 ring-2 ring-indigo-500/20'
            : ''
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <div className="flex items-center gap-1.5 flex-wrap flex-1 min-w-0">
          {selectedOptionObjs.length === 0 ? (
            <span className={`font-medium truncate ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{placeholder}</span>
          ) : isMulti ? (
            selectedOptionObjs.map((opt) => (
              <span
                key={opt.value}
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-bold shadow-xs border ${
                  isDark
                    ? 'bg-indigo-600/20 text-indigo-200 border-indigo-500/30'
                    : 'bg-indigo-50 text-indigo-800 border-indigo-200'
                }`}
              >
                <span className="truncate max-w-[130px]">{opt.label}</span>
                <span
                  role="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelectOption(opt.value);
                  }}
                  className={`p-0.5 rounded transition cursor-pointer font-bold leading-none ${
                    isDark
                      ? 'text-indigo-300 hover:text-rose-300'
                      : 'text-indigo-600 hover:text-rose-600'
                  }`}
                  title="Hapus"
                >
                  <X className="w-2.5 h-2.5" />
                </span>
              </span>
            ))
          ) : (
            <div className="flex items-center gap-2 truncate">
              {selectedOptionObjs[0].badge && (
                <span
                  className={
                    selectedOptionObjs[0].badgeClass ||
                    (isDark
                      ? 'px-1.5 py-0.5 rounded text-[9px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                      : 'px-1.5 py-0.5 rounded text-[9px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200')
                  }
                >
                  {selectedOptionObjs[0].badge}
                </span>
              )}
              <span className={`font-semibold truncate ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>
                {selectedOptionObjs[0].label}
              </span>
              {selectedOptionObjs[0].sublabel && (
                <span className={`text-[10px] shrink-0 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  ({selectedOptionObjs[0].sublabel})
                </span>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0 text-slate-400">
          {allowClear && selectedOptionObjs.length > 0 && !disabled && (
            <span
              onClick={(e) => {
                e.stopPropagation();
                onChange(isMulti ? [] : '');
              }}
              className={`p-1 rounded transition cursor-pointer ${
                isDark
                  ? 'hover:bg-slate-800 hover:text-white'
                  : 'hover:bg-slate-100 hover:text-slate-900'
              }`}
              title="Hapus semua pilihan"
            >
              <X className="w-3 h-3" />
            </span>
          )}
          <ChevronDown
            className={`w-3.5 h-3.5 transition-transform duration-200 ${
              isOpen ? (isDark ? 'rotate-180 text-indigo-400' : 'rotate-180 text-indigo-600') : ''
            }`}
          />
        </div>
      </button>

      {/* Hidden input for HTML form validation */}
      {required && (
        <input
          type="text"
          value={selectedValues.length > 0 ? selectedValues.join(',') : ''}
          required={required}
          className="opacity-0 absolute pointer-events-none w-0 h-0"
          onChange={() => {}}
        />
      )}

      {/* Floating Menu with Live Search & Keyboard Navigation */}
      {isOpen && (
        <div className={`absolute left-0 right-0 top-full mt-1.5 z-50 border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-64 animate-fadeIn ${
          isDark
            ? 'bg-slate-900 border-slate-700 text-white'
            : 'bg-white border-slate-200 text-slate-900 shadow-slate-300/60'
        }`}>
          {/* Live Search Bar */}
          <div className={`p-2 border-b sticky top-0 z-10 space-y-1.5 ${
            isDark ? 'border-slate-800 bg-slate-950/95' : 'border-slate-200 bg-slate-50'
          }`}>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                ref={inputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={searchPlaceholder}
                className={`w-full rounded-xl pl-8 pr-7 py-1.5 text-xs outline-none focus:border-indigo-500 font-medium border ${
                  isDark
                    ? 'bg-slate-900 border-slate-800 text-slate-200 placeholder-slate-500'
                    : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
                }`}
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className={`absolute right-2 top-1/2 -translate-y-1/2 ${
                    isDark ? 'text-slate-400 hover:text-white' : 'text-slate-400 hover:text-slate-900'
                  }`}
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Keyboard Hint & Selection Counter */}
            <div className={`flex items-center justify-between text-[10px] px-1 ${
              isDark ? 'text-slate-400' : 'text-slate-500'
            }`}>
              <span>Navigasi: gunakan ↑ / ↓ dan Enter</span>
              {isMulti && (
                <span className={`font-semibold ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`}>
                  {selectedValues.length} dipilih
                </span>
              )}
            </div>
          </div>

          {/* Options List */}
          <div ref={listRef} className={`overflow-y-auto p-1 divide-y ${
            isDark ? 'divide-slate-800/40' : 'divide-slate-100'
          }`}>
            {filteredOptions.length === 0 ? (
              <div className="py-5 text-center text-xs text-slate-500">
                Tidak ada pilihan yang cocok
              </div>
            ) : (
              filteredOptions.map((opt, idx) => {
                const isSelected = selectedValues.includes(String(opt.value));
                const isHighlighted = idx === highlightedIndex;

                return (
                  <button
                    key={opt.value}
                    ref={(el) => (optionRefs.current[idx] = el)}
                    type="button"
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    onClick={() => handleSelectOption(opt.value)}
                    className={`w-full flex items-center justify-between p-2 rounded-xl text-left text-xs transition cursor-pointer ${
                      isHighlighted
                        ? isDark
                          ? 'bg-indigo-600/30 text-white ring-1 ring-indigo-500/50 font-bold'
                          : 'bg-indigo-50 text-indigo-900 ring-1 ring-indigo-400 font-bold'
                        : isSelected
                        ? isDark
                          ? 'bg-indigo-950/40 text-indigo-200 font-semibold'
                          : 'bg-indigo-50/70 text-indigo-800 font-semibold'
                        : isDark
                        ? 'hover:bg-slate-800 text-slate-300'
                        : 'hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {isMulti && (
                        <input
                          type="checkbox"
                          checked={isSelected}
                          readOnly
                          className={`w-3.5 h-3.5 rounded focus:ring-0 shrink-0 pointer-events-none ${
                            isDark
                              ? 'border-slate-700 bg-slate-950 text-indigo-500'
                              : 'border-slate-300 bg-white text-indigo-600'
                          }`}
                        />
                      )}
                      {opt.badge && (
                        <span
                          className={
                            opt.badgeClass ||
                            (isDark
                              ? 'px-1.5 py-0.5 rounded text-[9px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                              : 'px-1.5 py-0.5 rounded text-[9px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200')
                          }
                        >
                          {opt.badge}
                        </span>
                      )}
                      <span className={`truncate ${isSelected ? 'font-bold' : ''}`}>{opt.label}</span>
                      {opt.sublabel && (
                        <span className={`text-[10px] truncate ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                          &bull; {opt.sublabel}
                        </span>
                      )}
                    </div>
                    {!isMulti && isSelected && (
                      <Check className={`w-3.5 h-3.5 shrink-0 ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`} />
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

import DatePickerField, { isoToDmy, dmyToIso } from '../components/shared/DatePickerField';

// Alias DatePickerField sebagai DateInput berdesain modern bertema
const IndonesianDateInput = DatePickerField;

export default function AnnualWorkPlan() {
  const { user, schoolUnits, activeSchoolUnit } = useAuth();

  // Context Type: 'foundation' (Yayasan/Gabungan) | 'school_unit' (Per Satuan Pendidikan)
  const [contextType, setContextType] = useState('foundation');

  // Filters & Context
  const [selectedUnitId, setSelectedUnitId] = useState(
    activeSchoolUnit?.id || (schoolUnits?.[0]?.id || 1)
  );
  const [academicYear, setAcademicYear] = useState('2026/2027');
  const [filterFlagshipOnly, setFilterFlagshipOnly] = useState(false);
  const [filterDomain, setFilterDomain] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Active Main Tab: 'rkt' | 'publications'
  const [mainTab, setMainTab] = useState('rkt');

  // Loading & Data States
  const [loading, setLoading] = useState(true);
  const [annualWorkPlan, setAnnualWorkPlan] = useState(null);
  const [programs, setPrograms] = useState([]);
  const [domainsData, setDomainsData] = useState([]);
  const [subdomainsData, setSubdomainsData] = useState([]);
  const [expandedDomains, setExpandedDomains] = useState({});
  const [expandedSubdomains, setExpandedSubdomains] = useState({});
  const [expandedPrograms, setExpandedPrograms] = useState({});
  const [positionTypes, setPositionTypes] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [publications, setPublications] = useState([]);

  // Modals
  const [modalType, setModalType] = useState(null); // 'activity' | 'committee_detail' | 'add_member' | 'sahkan_committee' | 'publish' | 'view_pub'
  const [currentProgId, setCurrentProgId] = useState(null);
  const [currentProgramObj, setCurrentProgramObj] = useState(null);
  const [currentCommId, setCurrentCommId] = useState(null);
  const [editingActivity, setEditingActivity] = useState(null);
  const [formData, setFormData] = useState({});
  const [formLoading, setFormLoading] = useState(false);
  const [selectedPubSnapshot, setSelectedPubSnapshot] = useState(null);

  // Helper untuk menyorot kata kunci pencarian
  const highlightMatch = (text, query) => {
    if (!text || !query || !query.trim()) return text;
    const q = query.trim();
    const regex = new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = String(text).split(regex);
    if (parts.length <= 1) return text;
    return (
      <>
        {parts.map((part, i) =>
          part.toLowerCase() === q.toLowerCase() ? (
            <mark key={i} className="bg-amber-300 text-gray-950 font-bold px-0.5 rounded shadow-xs">
              {part}
            </mark>
          ) : (
            part
          )
        )}
      </>
    );
  };

  // Kategori unik dari program
  const programCategories = useMemo(() => {
    const map = new Map();
    programs.forEach((p) => {
      if (p.category_name) {
        map.set(p.category_name, {
          name: p.category_name,
          color: p.category_color,
          bg: p.category_bg_color,
        });
      }
    });
    return Array.from(map.values());
  }, [programs]);

  // Opsi Dropdown Tag dengan live search
  const tagOptions = useMemo(() => [
    { value: 'kegiatan_utama', label: 'Kegiatan Utama', badge: 'Utama', badgeClass: 'px-1.5 py-0.5 rounded text-[9px] font-bold mj-badge-primary' },
    { value: 'rapat', label: 'Rapat Koordinasi', badge: 'Rapat', badgeClass: 'px-1.5 py-0.5 rounded text-[9px] font-bold mj-badge-amber' },
    { value: 'dokumen', label: 'Penyusunan Dokumen', badge: 'Dokumen', badgeClass: 'px-1.5 py-0.5 rounded text-[9px] font-bold mj-badge-cyan' },
    { value: 'pengadaan', label: 'Pengadaan Logistik', badge: 'Pengadaan', badgeClass: 'px-1.5 py-0.5 rounded text-[9px] font-bold mj-badge-emerald' },
    { value: 'sosialisasi', label: 'Sosialisasi / Workshop', badge: 'Sosialisasi', badgeClass: 'px-1.5 py-0.5 rounded text-[9px] font-bold mj-badge-violet' },
    { value: 'koordinasi', label: 'Koordinasi Eksternal', badge: 'Koordinasi', badgeClass: 'px-1.5 py-0.5 rounded text-[9px] font-bold mj-badge-blue' },
    { value: 'dokumentasi', label: 'Dokumentasi & Laporan', badge: 'Laporan', badgeClass: 'px-1.5 py-0.5 rounded text-[9px] font-bold mj-badge-rose' },
    { value: 'lainnya', label: 'Lainnya', badge: 'Lainnya', badgeClass: 'px-1.5 py-0.5 rounded text-[9px] font-bold mj-badge-slate' },
  ], []);

  // Opsi Dropdown Status Pelaksanaan dengan live search
  const statusOptions = useMemo(() => [
    { value: 'planned', label: 'Planned (Direncanakan)', badge: 'Planned', badgeClass: 'px-1.5 py-0.5 rounded text-[9px] font-bold mj-badge-slate' },
    { value: 'in_progress', label: 'In Progress (Berjalan)', badge: 'In Progress', badgeClass: 'px-1.5 py-0.5 rounded text-[9px] font-bold mj-badge-amber' },
    { value: 'completed', label: 'Completed (Selesai)', badge: 'Completed', badgeClass: 'px-1.5 py-0.5 rounded text-[9px] font-bold mj-badge-emerald' },
    { value: 'cancelled', label: 'Cancelled (Dibatalkan)', badge: 'Cancelled', badgeClass: 'px-1.5 py-0.5 rounded text-[9px] font-bold mj-badge-rose' },
  ], []);

  // Opsi Pegawai untuk PIC dengan live search
  const employeeOptions = useMemo(() => {
    return employees.map((emp) => ({
      value: emp.id,
      label: emp.name || emp.full_name || `Pegawai #${emp.id}`,
      sublabel: emp.nip ? `NIP: ${emp.nip}` : (emp.position || emp.role || ''),
    }));
  }, [employees]);

  // Opsi Posisi Kepanitiaan dengan live search
  const positionTypeOptions = useMemo(() => {
    return positionTypes.map((pt) => ({
      value: pt.id,
      label: pt.name,
      sublabel: pt.description || '',
    }));
  }, [positionTypes]);

  // Status apakah sedang ada pencarian atau filter aktif
  const isFilteringActive = Boolean(
    searchQuery.trim() || filterFlagshipOnly || filterDomain !== 'all' || filterCategory !== 'all' || filterStatus !== 'all'
  );

  // Lock body overflow when fullscreen is active
  useEffect(() => {
    if (isFullscreen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      const handleKeyDown = (e) => {
        if (e.key === 'Escape') setIsFullscreen(false);
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => {
        document.body.style.overflow = originalOverflow;
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [isFullscreen]);

  // Sync activeSchoolUnit on mount
  useEffect(() => {
    if (activeSchoolUnit?.id) {
      setSelectedUnitId(activeSchoolUnit.id);
    }
  }, [activeSchoolUnit]);

  // Fetch RKT Data & Matrix
  const fetchData = async () => {
    try {
      setLoading(true);

      const unitQuery = contextType === 'school_unit' && selectedUnitId
        ? `school_unit_id=${selectedUnitId}`
        : `context=foundation`;

      // 1. Get or Init AWP Header
      const awpRes = await api.get(
        `/manajemen/annual-work-plans/current?${unitQuery}&academic_year=${encodeURIComponent(academicYear)}`
      );

      if (awpRes.data?.success) {
        const awp = awpRes.data.data;
        setAnnualWorkPlan(awp);

        // 2. Get Program Matrix (Activities + Committees + Domains)
        const matrixRes = await api.get(`/manajemen/annual-work-plans/${awp.id}/matrix`);
        if (matrixRes.data?.success) {
          const progs = matrixRes.data.data?.programs || [];
          setPrograms(progs);
          setDomainsData(matrixRes.data.data?.domains || []);
          setSubdomainsData(matrixRes.data.data?.subdomains || []);

          // Keep currentProgramObj synced if committee popup is open
          if (currentProgId) {
            const updatedProg = progs.find((p) => p.program_id === currentProgId);
            if (updatedProg) setCurrentProgramObj(updatedProg);
          }

          // Expand all programs by default
          const exp = {};
          progs.forEach((p) => {
            exp[p.program_id] = true;
          });
          setExpandedPrograms(exp);
        }

        // 3. Get Publications
        const pubRes = await api.get(`/manajemen/annual-work-plans/${awp.id}/publications`);
        if (pubRes.data?.success) {
          setPublications(pubRes.data.data || []);
        }
      }

      // 4. Get Master Position Types & Employees
      const empQuery = contextType === 'school_unit' && selectedUnitId
        ? `/kepegawaian/employees?limit=100&school_unit_id=${selectedUnitId}`
        : `/kepegawaian/employees?limit=100`;

      const [posRes, empRes] = await Promise.all([
        api.get('/manajemen/committee-position-types'),
        api.get(empQuery).catch(() => ({ data: { data: { items: [] } } })),
      ]);

      if (posRes.data?.success) setPositionTypes(posRes.data.data);
      if (empRes.data?.success && empRes.data.data?.items) {
        setEmployees(empRes.data.data.items);
      }
    } catch (err) {
      console.error('Error fetching RKT data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [contextType, selectedUnitId, academicYear]);

  // Toggle Domain / Subdomain / Program
  const toggleDomain = (key) => {
    setExpandedDomains((prev) => ({
      ...prev,
      [key]: prev[key] === undefined ? false : !prev[key],
    }));
  };

  const toggleSubdomain = (key) => {
    setExpandedSubdomains((prev) => ({
      ...prev,
      [key]: prev[key] === undefined ? false : !prev[key],
    }));
  };

  const toggleProgram = (pId) => {
    setExpandedPrograms((prev) => ({ ...prev, [pId]: !prev[pId] }));
  };

  // Group Programs by Domain and Subdomain (Hierarchy Tree with Enhanced Search & Filtering)
  const groupedProgramsHierarchy = useMemo(() => {
    if (!programs || programs.length === 0) return [];

    const domainMap = new Map();

    // 1. Initialize Domains & Subdomains
    domainsData.forEach((d, dIdx) => {
      const domOrder = d.order_index ?? (dIdx + 1);
      const subMap = new Map();

      const matchedSubs = subdomainsData.filter((s) => Number(s.domain_id) === Number(d.id));
      if (matchedSubs.length > 0) {
        matchedSubs.forEach((s, sIdx) => {
          subMap.set(s.id, {
            id: s.id,
            name: s.name,
            code: `SUB-${String(s.order_index ?? sIdx + 1).padStart(2, '0')}`,
            order_index: s.order_index ?? (sIdx + 1),
            programs: [],
          });
        });
      }

      domainMap.set(d.id, {
        id: d.id,
        name: d.name,
        code: `BID-${String(domOrder).padStart(2, '0')}`,
        order_index: domOrder,
        subdomains: subMap,
      });
    });

    // 2. Filter programs (Name, Code, Category, Description, Activities, PIC, Committee)
    const filtered = programs.filter((p) => {
      if (filterFlagshipOnly && p.is_flagship !== 1) return false;
      if (filterCategory !== 'all' && p.category_name !== filterCategory) return false;

      // Status filter
      if (filterStatus !== 'all') {
        const avgProg = p.stats?.avg_progress_percent || 0;
        if (filterStatus === 'not_started' && avgProg > 0) return false;
        if (filterStatus === 'in_progress' && (avgProg <= 0 || avgProg >= 100)) return false;
        if (filterStatus === 'completed' && avgProg < 100) return false;
      }

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      const matchTitle = p.program_name?.toLowerCase().includes(q);
      const matchCode = p.program_code?.toLowerCase().includes(q);
      const matchCat = p.category_name?.toLowerCase().includes(q);
      const matchDesc = p.program_description?.toLowerCase().includes(q);
      const matchAct = p.activities?.some((a) => {
        const titleMatch = a.title?.toLowerCase().includes(q);
        const notesMatch = a.notes?.toLowerCase().includes(q);
        const tagMatch = a.tag?.toLowerCase().includes(q);

        let empIds = [];
        if (Array.isArray(a.assignee_employee_ids) && a.assignee_employee_ids.length > 0) {
          empIds = a.assignee_employee_ids;
        } else if (a.assignee_employee_id) {
          empIds = [a.assignee_employee_id];
        }

        const picMatch = empIds.some((id) => {
          const emp = employees.find((e) => e.id === Number(id));
          const empName = (emp?.name || emp?.full_name || '').toLowerCase();
          const empNip = (emp?.nip || '').toLowerCase();
          return empName.includes(q) || empNip.includes(q);
        });

        return titleMatch || notesMatch || tagMatch || picMatch;
      });
      const matchComm = p.committee?.members?.some((m) => {
        const posMatch = m.position_name?.toLowerCase().includes(q);
        const emp = employees.find((e) => e.id === Number(m.employee_id));
        const empName = (emp?.name || emp?.full_name || '').toLowerCase();
        const empNip = (emp?.nip || '').toLowerCase();
        return posMatch || empName.includes(q) || empNip.includes(q);
      });

      return matchTitle || matchCode || matchCat || matchDesc || matchAct || matchComm;
    });

    // 3. Place programs into domains and subdomains
    filtered.forEach((prog) => {
      const dId = prog.domain_id || 'unassigned';
      if (!domainMap.has(dId)) {
        domainMap.set(dId, {
          id: dId,
          name: 'Bidang Lainnya',
          code: `BID-${dId !== 'unassigned' ? String(dId).padStart(2, '0') : '00'}`,
          order_index: 999,
          subdomains: new Map(),
        });
      }
      const domainObj = domainMap.get(dId);

      const subId = prog.subdomain_id || 'general';
      if (!domainObj.subdomains.has(subId)) {
        domainObj.subdomains.set(subId, {
          id: subId,
          name: subId === 'general' ? 'Umum / Lintas Sub-Bidang' : 'Sub-Bidang',
          code: `SUB-${subId !== 'general' ? String(subId).padStart(2, '0') : '00'}`,
          order_index: 999,
          programs: [],
        });
      }
      const subObj = domainObj.subdomains.get(subId);
      subObj.programs.push(prog);
    });

    const result = [];
    domainMap.forEach((domainItem) => {
      if (filterDomain !== 'all' && Number(filterDomain) !== Number(domainItem.id)) {
        return;
      }

      const subList = [];
      domainItem.subdomains.forEach((subItem) => {
        subList.push(subItem);
      });

      subList.sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
      const totalProgramsCount = subList.reduce((acc, curr) => acc + curr.programs.length, 0);

      // Sembunyikan bidang jika kosong saat ada search / filter
      if (isFilteringActive && totalProgramsCount === 0) {
        return;
      }

      result.push({
        ...domainItem,
        subdomainList: subList,
        totalPrograms: totalProgramsCount,
      });
    });

    return result.sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
  }, [programs, domainsData, subdomainsData, filterDomain, filterCategory, filterStatus, filterFlagshipOnly, searchQuery, employees, isFilteringActive]);

  // Total Program setelah difilter
  const totalFilteredPrograms = useMemo(() => {
    return groupedProgramsHierarchy.reduce((acc, curr) => acc + curr.totalPrograms, 0);
  }, [groupedProgramsHierarchy]);

  // Activity Form Submit (Create / Edit)
  const handleActivitySubmit = async (e) => {
    e.preventDefault();
    if (!formData.title?.trim()) {
      alert('Judul langkah kegiatan wajib diisi');
      return;
    }
    setFormLoading(true);
    try {
      const assigneeIds = Array.isArray(formData.assignee_employee_ids)
        ? formData.assignee_employee_ids.map(Number).filter(Boolean)
        : (formData.assignee_employee_id ? [Number(formData.assignee_employee_id)] : []);

      const sDate = formData.start_date || formData.activity_date || null;
      const eDate = formData.date_mode === 'range'
        ? (formData.end_date || sDate)
        : sDate;

      const payload = {
        title: formData.title.trim(),
        tag: formData.tag || 'kegiatan_utama',
        status: formData.status || 'planned',
        progress_percent: formData.progress_percent !== undefined ? Number(formData.progress_percent) : 0,
        activity_date: sDate,
        start_date: sDate,
        end_date: eDate,
        assignee_employee_ids: assigneeIds,
        assignee_employee_id: assigneeIds.length > 0 ? assigneeIds[0] : null,
        document_link: formData.document_link || null,
        notes: formData.notes || null,
        order_index: formData.order_index !== undefined ? Number(formData.order_index) : 0,
        annual_work_plan_id: annualWorkPlan?.id,
        rips_program_id: currentProgId,
      };

      if (editingActivity) {
        await api.put(`/manajemen/work-plan-activities/${editingActivity.id}`, payload);
      } else {
        await api.post('/manajemen/work-plan-activities', payload);
      }

      setModalType(null);
      setEditingActivity(null);
      setFormData({});
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menyimpan kegiatan');
    } finally {
      setFormLoading(false);
    }
  };

  // Delete Activity
  const handleDeleteActivity = async (id) => {
    if (!window.confirm('Hapus langkah kegiatan ini?')) return;
    try {
      await api.delete(`/manajemen/work-plan-activities/${id}`);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menghapus kegiatan');
    }
  };

  // Add Committee Member Submit
  const handleAddMemberSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    try {
      // Pastikan committee ada
      const commRes = await api.get(`/manajemen/program-committees/current?annual_work_plan_id=${annualWorkPlan.id}&rips_program_id=${currentProgId}`);
      const commId = commRes.data?.data?.id;

      await api.post(`/manajemen/program-committees/${commId}/members`, {
        committee_position_type_id: Number(formData.committee_position_type_id),
        employee_id: Number(formData.employee_id),
      });

      setModalType('committee_detail');
      setFormData({});
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menambahkan anggota');
    } finally {
      setFormLoading(false);
    }
  };

  // Remove Committee Member
  const handleRemoveMember = async (memberId) => {
    if (!window.confirm('Hapus anggota kepanitiaan ini?')) return;
    try {
      await api.delete(`/manajemen/program-committees/members/${memberId}`);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menghapus anggota');
    }
  };

  // Sahkan Kepanitiaan Submit
  const handleSahkanSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    try {
      await api.post(`/manajemen/program-committees/${currentCommId}/sahkan`, {
        sk_number: formData.sk_number,
        sk_date: formData.sk_date,
        sk_file_url: formData.sk_file_url || null,
      });

      setModalType(null);
      setFormData({});
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal mengesahkan kepanitiaan');
    } finally {
      setFormLoading(false);
    }
  };

  // Publish RKT Document Submit
  const handlePublishSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    try {
      await api.post(`/manajemen/annual-work-plans/${annualWorkPlan.id}/publish`, {
        document_number: formData.document_number,
        title: formData.title,
        effective_date: formData.effective_date,
        change_summary: formData.change_summary || null,
      });

      setModalType(null);
      setFormData({});
      fetchData();
      alert('Dokumen resmi RKT berhasil diterbitkan!');
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menerbitkan dokumen RKT');
    } finally {
      setFormLoading(false);
    }
  };

  // Format Helper: Tag Badge Color
  const getTagBadge = (tag) => {
    switch (tag) {
      case 'kegiatan_utama':
        return 'mj-badge-primary';
      case 'rapat':
        return 'mj-badge-amber';
      case 'dokumen':
        return 'mj-badge-cyan';
      case 'pengadaan':
        return 'mj-badge-emerald';
      case 'sosialisasi':
        return 'mj-badge-violet';
      case 'koordinasi':
        return 'mj-badge-blue';
      case 'dokumentasi':
        return 'mj-badge-rose';
      default:
        return 'mj-badge-slate';
    }
  };

  const selectedUnit = schoolUnits?.find((u) => u.id === Number(selectedUnitId));
  const currentLevelLabel = contextType === 'foundation'
    ? 'Tingkat Yayasan (Gabungan)'
    : (selectedUnit ? `${selectedUnit.name} (${selectedUnit.level})` : 'Satuan Pendidikan');


  // Open Committee Detail Modal
  const handleOpenCommitteeModal = (prog) => {
    setCurrentProgId(prog.program_id);
    setCurrentProgramObj(prog);
    setCurrentCommId(prog.committee?.id || null);
    setModalType('committee_detail');
  };

  // Open Add Activity Modal
  const handleOpenAddActivity = (prog) => {
    setCurrentProgId(prog.program_id);
    setCurrentProgramObj(prog);
    setEditingActivity(null);
    setFormData({
      title: '',
      tag: 'kegiatan_utama',
      status: 'planned',
      progress_percent: 0,
      date_mode: 'single',
      start_date: '',
      end_date: '',
      activity_date: '',
      assignee_employee_ids: [],
      document_link: '',
      notes: '',
      order_index: (prog.activities?.length || 0) + 1,
    });
    setModalType('activity');
  };

  // Open Edit Activity Modal
  const handleOpenEditActivity = (prog, act) => {
    setCurrentProgId(prog.program_id);
    setCurrentProgramObj(prog);
    setEditingActivity(act);

    const empIds = Array.isArray(act.assignee_employee_ids) && act.assignee_employee_ids.length > 0
      ? act.assignee_employee_ids
      : (act.assignee_employee_id ? [act.assignee_employee_id] : []);

    const sDate = act.start_date ? act.start_date.substring(0, 10) : (act.activity_date ? act.activity_date.substring(0, 10) : '');
    const eDate = act.end_date ? act.end_date.substring(0, 10) : sDate;
    const isRange = Boolean(sDate && eDate && sDate !== eDate);

    setFormData({
      title: act.title,
      tag: act.tag,
      date_mode: isRange ? 'range' : 'single',
      start_date: sDate,
      end_date: eDate,
      activity_date: sDate,
      assignee_employee_ids: empIds,
      document_link: act.document_link || '',
      status: act.status,
      progress_percent: act.progress_percent,
      notes: act.notes || '',
      order_index: act.order_index,
    });
    setModalType('activity');
  };

  // Expand All / Collapse All Hierarchies
  const handleExpandAll = () => {
    const allExp = {};
    groupedProgramsHierarchy.forEach((d) => {
      allExp[`dom_${d.id}`] = true;
      d.subdomainList.forEach((s) => {
        allExp[`sub_${d.id}_${s.id}`] = true;
      });
    });
    programs.forEach((p) => {
      allExp[p.program_id] = true;
    });
    setExpandedDomains(allExp);
    setExpandedSubdomains(allExp);
    setExpandedPrograms(allExp);
  };

  const handleCollapseAll = () => {
    const allClose = {};
    groupedProgramsHierarchy.forEach((d) => {
      allClose[`dom_${d.id}`] = false;
      d.subdomainList.forEach((s) => {
        allClose[`sub_${d.id}_${s.id}`] = false;
      });
    });
    programs.forEach((p) => {
      allClose[p.program_id] = false;
    });
    setExpandedDomains(allClose);
    setExpandedSubdomains(allClose);
    setExpandedPrograms(allClose);
  };

  const handlePrint = () => {
    window.print();
  };
  // Render RKT Table Body (Hierarki: Bidang -> Sub-Bidang -> Program -> Tugas)
  const renderRktTableBody = () => {
    return groupedProgramsHierarchy.map((domain) => {
      const domKey = `dom_${domain.id}`;
      const isDomExpanded = isFilteringActive || expandedDomains[domKey] !== false;

      return (
        <React.Fragment key={domain.id}>
          {/* LEVEL 1: BIDANG */}
          <tr className="bg-[#E5E7EB] border-b border-gray-300 font-bold text-gray-900 transition-colors">
            <td className="py-2 px-3 text-center border-r border-gray-300 font-mono text-[11px] text-blue-800">
              {domain.code}
            </td>
            <td colSpan={6} className="py-2 px-3">
              <button
                type="button"
                onClick={() => toggleDomain(domKey)}
                className="flex items-center gap-1.5 text-left w-full group focus:outline-none"
              >
                <span className="p-0.5 rounded bg-gray-300 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  {isDomExpanded ? (
                    <ChevronDown className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5" />
                  )}
                </span>
                <span className="text-xs uppercase tracking-wider font-extrabold text-gray-900 group-hover:text-blue-700 transition-colors">
                  BIDANG: {domain.name}
                </span>
                <span className="ml-1.5 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-gray-300 text-gray-700 leading-tight">
                  {domain.totalPrograms} Program Kerja / {domain.subdomainList.length} Sub-Bidang
                </span>
              </button>
            </td>
          </tr>

          {/* LEVEL 2: SUB-BIDANG */}
          {isDomExpanded &&
            domain.subdomainList.map((sub) => {
              const subKey = `sub_${domain.id}_${sub.id}`;
              const isSubExpanded = isFilteringActive || expandedSubdomains[subKey] !== false;

              return (
                <React.Fragment key={sub.id}>
                  <tr className="bg-[#FEF3C7] border-b border-amber-200/80 font-semibold text-amber-950 transition-colors">
                    <td className="py-2 px-3 text-center border-r border-amber-200/80 font-mono text-[11px] text-amber-800">
                      {sub.code}
                    </td>
                    <td colSpan={6} className="py-2 px-3 pl-7">
                      <button
                        type="button"
                        onClick={() => toggleSubdomain(subKey)}
                        className="flex items-center gap-1.5 text-left w-full group focus:outline-none"
                      >
                        <span className="p-0.5 rounded bg-amber-200 group-hover:bg-amber-600 group-hover:text-white transition-colors">
                          {isSubExpanded ? (
                            <ChevronDown className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronRight className="w-3.5 h-3.5" />
                          )}
                        </span>
                        <span className="text-xs font-bold text-amber-900 group-hover:text-amber-700 transition-colors">
                          Sub-Bidang: {sub.name}
                        </span>
                        <span className="ml-1 text-[10px] text-amber-800 font-normal">
                          ({sub.programs.length} program terjadwal)
                        </span>
                      </button>
                    </td>
                  </tr>

                  {/* LEVEL 3: PROGRAM ROW & LEVEL 4: TASKS / ACTIVITIES */}
                  {isSubExpanded &&
                    sub.programs.map((prog) => {
                      const isProgExpanded = isFilteringActive || (expandedPrograms[prog.program_id] ?? true);
                      const actCount = prog.activities?.length || 0;
                      const commMembersCount = prog.committee?.members?.length || 0;
                      const isCommDisahkan = prog.committee?.status === 'disahkan';

                      return (
                        <React.Fragment key={prog.program_id}>
                          {/* BARIS PROGRAM */}
                          <tr className="bg-slate-50/80 hover:bg-blue-50/70 border-b border-gray-200 font-medium transition-colors">
                            {/* Kode Program */}
                            <td className="py-2.5 px-3 text-center border-r border-gray-200 font-mono text-[11px] font-bold text-indigo-700 align-middle">
                              {highlightMatch(prog.program_code, searchQuery)}
                            </td>

                            {/* Nama Program */}
                            <td className="py-2.5 px-4 border-r border-gray-200 align-middle">
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => toggleProgram(prog.program_id)}
                                  className="p-1 rounded bg-gray-200 hover:bg-gray-300 text-gray-700 transition shrink-0"
                                  title={isProgExpanded ? 'Sembunyikan rincian tugas' : 'Tampilkan rincian tugas'}
                                >
                                  {isProgExpanded ? (
                                    <ChevronDown className="w-3.5 h-3.5" />
                                  ) : (
                                    <ChevronRight className="w-3.5 h-3.5" />
                                  )}
                                </button>
                                <span className="text-xs font-bold text-gray-900 leading-snug">
                                  {highlightMatch(prog.program_name, searchQuery)}
                                </span>
                                {prog.is_flagship === 1 && (
                                  <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-amber-100 text-amber-800 border border-amber-300 shrink-0">
                                    ⭐ Unggulan
                                  </span>
                                )}
                              </div>
                              {prog.program_description && (
                                <p className="text-[11px] text-gray-500 mt-0.5 pl-6 line-clamp-1">
                                  {highlightMatch(prog.program_description, searchQuery)}
                                </p>
                              )}
                            </td>

                            {/* Kategori Program */}
                            <td className="py-2.5 px-3 text-center border-r border-gray-200 align-middle">
                              <span
                                style={{
                                  backgroundColor: prog.category_bg_color || '#EEF2FF',
                                  color: prog.category_color || '#4F46E5',
                                  borderColor: prog.category_border_color || '#C7D2FE',
                                }}
                                className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold border"
                              >
                                {highlightMatch(prog.category_name || 'Reguler', searchQuery)}
                              </span>
                            </td>

                            {/* Jadwal Pelaksanaan */}
                            <td className="py-2.5 px-3 text-center border-r border-gray-200 align-middle text-xs font-bold text-slate-700 font-mono">
                              TA {academicYear}
                            </td>

                            {/* Kepanitiaan (Pop up trigger button) */}
                            <td className="py-2.5 px-3 text-center border-r border-gray-200 align-middle">
                              <button
                                type="button"
                                onClick={() => handleOpenCommitteeModal(prog)}
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition shadow-xs ${
                                  commMembersCount > 0
                                    ? isCommDisahkan
                                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 hover:bg-emerald-200'
                                      : 'bg-indigo-100 text-indigo-800 border border-indigo-300 hover:bg-indigo-200'
                                    : 'bg-gray-100 text-gray-600 border border-gray-300 hover:bg-gray-200'
                                }`}
                                title="Klik untuk melihat / mengelola susunan SK Kepanitiaan"
                              >
                                <Users className="w-3.5 h-3.5" />
                                <span>{commMembersCount > 0 ? `${commMembersCount} Panitia` : 'Set Panitia'}</span>
                                {isCommDisahkan && (
                                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                                )}
                              </button>
                            </td>

                            {/* Status & Agregat Progres */}
                            <td className="py-2.5 px-3 border-r border-gray-200 align-middle">
                              <div className="space-y-1">
                                <div className="flex items-center justify-between text-[10px]">
                                  <span className="font-semibold text-gray-600">
                                    {prog.stats?.completed_activities || 0}/{actCount} Tugas
                                  </span>
                                  <span className="font-bold text-indigo-700">
                                    {prog.stats?.avg_progress_percent || 0}%
                                  </span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                                  <div
                                    className="bg-indigo-600 h-full rounded-full transition-all duration-300"
                                    style={{ width: `${prog.stats?.avg_progress_percent || 0}%` }}
                                  />
                                </div>
                              </div>
                            </td>

                            {/* Aksi Tambah Tugas */}
                            <td className="py-2.5 px-3 text-center align-middle">
                              <button
                                type="button"
                                onClick={() => handleOpenAddActivity(prog)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold transition shadow-xs"
                                title="Tambah baris langkah tugas kegiatan baru pada program ini"
                              >
                                <Plus className="w-3 h-3" />
                                <span>Tugas</span>
                              </button>
                            </td>
                          </tr>

                          {/* LEVEL 4: DAFTAR BARIS LANGKAH KEGIATAN / TUGAS OPERASIONAL */}
                          {isProgExpanded && (
                            <>
                              {actCount === 0 ? (
                                <tr className="bg-white border-b border-gray-200">
                                  <td className="py-2 px-3 text-center border-r border-gray-200 text-gray-400 font-mono text-[10px]">
                                    -
                                  </td>
                                  <td colSpan={5} className="py-2 px-8 text-xs text-gray-400 italic">
                                    Belum ada rincian tugas kegiatan. Klik tombol <strong>+ Tugas</strong> di sebelah kanan untuk menambahkan.
                                  </td>
                                  <td className="py-2 px-3 text-center">
                                    <button
                                      type="button"
                                      onClick={() => handleOpenAddActivity(prog)}
                                      className="text-xs text-emerald-600 hover:text-emerald-700 font-bold flex items-center justify-center gap-1 mx-auto"
                                    >
                                      <Plus className="w-3.5 h-3.5" /> Tambah
                                    </button>
                                  </td>
                                </tr>
                              ) : (
                                prog.activities.map((act, actIdx) => {
                                  const assignee = employees.find((e) => e.id === Number(act.assignee_employee_id));

                                  return (
                                    <tr
                                      key={act.id}
                                      className="bg-white hover:bg-amber-50/40 border-b border-gray-100 text-gray-800 transition-colors"
                                    >
                                      {/* Penomoran Sub-Tugas */}
                                      <td className="py-2 px-3 text-center border-r border-gray-200 font-mono text-[10.5px] text-gray-500 align-middle">
                                        {prog.program_code}.{actIdx + 1}
                                      </td>

                                      {/* Judul Langkah Tugas & Catatan */}
                                      <td className="py-2 px-4 pl-8 border-r border-gray-200 align-middle">
                                        <div className="flex items-center gap-2">
                                          <CheckSquare className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                                          <span className="text-xs font-semibold text-gray-900 leading-snug">
                                            {highlightMatch(act.title, searchQuery)}
                                          </span>
                                          {act.document_link && (
                                            <a
                                              href={act.document_link}
                                              target="_blank"
                                              rel="noreferrer"
                                              className="text-indigo-600 hover:text-indigo-800 text-[10.5px] inline-flex items-center gap-0.5 underline shrink-0 ml-1"
                                            >
                                              <LinkIcon className="w-3 h-3" /> Bukti Dokumen
                                            </a>
                                          )}
                                        </div>
                                        {act.notes && (
                                          <p className="text-[10.5px] text-gray-500 mt-0.5 pl-5">
                                            {highlightMatch(act.notes, searchQuery)}
                                          </p>
                                        )}
                                      </td>

                                      {/* Tag / Tipe Tugas */}
                                      <td className="py-2 px-3 text-center border-r border-gray-200 align-middle">
                                        <span
                                          className={`inline-flex items-center px-2 py-0.5 rounded text-[9.5px] font-bold border uppercase ${getTagBadge(
                                            act.tag
                                          )}`}
                                        >
                                          {act.tag.replace('_', ' ')}
                                        </span>
                                      </td>

                                      {/* Jadwal Tanggal (Single Day / Rentang Waktu) */}
                                      <td className="py-2 px-3 text-center border-r border-gray-200 align-middle text-[11px] text-gray-600">
                                        {(() => {
                                          const sDate = act.start_date || act.activity_date;
                                          const eDate = act.end_date || sDate;

                                          if (!sDate && !eDate) {
                                            return <span className="text-gray-400 text-[11px]">-</span>;
                                          }

                                          if (!eDate || sDate === eDate) {
                                            return (
                                              <span className="inline-flex items-center gap-1 font-medium text-slate-700 whitespace-nowrap">
                                                <Calendar className="w-3 h-3 text-indigo-500 shrink-0" />
                                                {new Date(sDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                                              </span>
                                            );
                                          }

                                          // Rentang Waktu
                                          const d1 = new Date(sDate);
                                          const d2 = new Date(eDate);
                                          const diffDays = Math.ceil(Math.abs(d2 - d1) / (1000 * 60 * 60 * 24)) + 1;

                                          return (
                                            <div className="flex flex-col items-center gap-0.5 whitespace-nowrap">
                                              <span className="inline-flex items-center gap-1 font-semibold text-slate-800 text-[10.5px]">
                                                <CalendarDays className="w-3 h-3 text-indigo-500 shrink-0" />
                                                {d1.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} &ndash; {d2.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                                              </span>
                                              <span className="text-[9.5px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.2 rounded border border-indigo-200">
                                                {diffDays} hari kerja
                                              </span>
                                            </div>
                                          );
                                        })()}
                                      </td>

                                      {/* PIC Pelaksana Tugas (Multi-Assignee) */}
                                      <td className="py-2 px-3 text-center border-r border-gray-200 align-middle text-xs text-gray-700">
                                        {(() => {
                                          let empIds = [];
                                          if (Array.isArray(act.assignee_employee_ids) && act.assignee_employee_ids.length > 0) {
                                            empIds = act.assignee_employee_ids;
                                          } else if (act.assignee_employee_id) {
                                            empIds = [act.assignee_employee_id];
                                          }

                                          if (empIds.length === 0) {
                                            return <span className="text-gray-400 text-[11px]">-</span>;
                                          }

                                          const matchedEmps = empIds
                                            .map((id) => employees.find((e) => e.id === Number(id)))
                                            .filter(Boolean);

                                          if (matchedEmps.length === 0) {
                                            return <span className="text-gray-400 text-[11px]">-</span>;
                                          }

                                          if (matchedEmps.length === 1) {
                                            const emp = matchedEmps[0];
                                            return (
                                              <span className="font-semibold text-slate-800" title={`NIP: ${emp.nip || '-'}`}>
                                                {highlightMatch(emp.name || emp.full_name, searchQuery)}
                                              </span>
                                            );
                                          }

                                          return (
                                            <div className="flex flex-wrap items-center justify-center gap-1 max-w-[200px] mx-auto">
                                              {matchedEmps.map((emp) => (
                                                <span
                                                  key={emp.id}
                                                  className="inline-flex items-center px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-900 text-[10px] font-semibold border border-indigo-200"
                                                  title={`NIP: ${emp.nip || '-'}`}
                                                >
                                                  {highlightMatch(emp.name || emp.full_name, searchQuery)}
                                                </span>
                                              ))}
                                            </div>
                                          );
                                        })()}
                                      </td>

                                      {/* Status & Progres Bar */}
                                      <td className="py-2 px-3 border-r border-gray-200 align-middle">
                                        <div className="space-y-1">
                                          <div className="flex items-center justify-between text-[10px]">
                                            <span className="capitalize font-semibold text-gray-600">
                                              {act.status.replace('_', ' ')}
                                            </span>
                                            <span className="font-bold text-emerald-600">
                                              {act.progress_percent}%
                                            </span>
                                          </div>
                                          <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                                            <div
                                              className="bg-emerald-500 h-full rounded-full"
                                              style={{ width: `${act.progress_percent}%` }}
                                            />
                                          </div>
                                        </div>
                                      </td>

                                      {/* Aksi Edit & Hapus Tugas */}
                                      <td className="py-2 px-3 text-center align-middle whitespace-nowrap space-x-1">
                                        <button
                                          type="button"
                                          onClick={() => handleOpenEditActivity(prog, act)}
                                          className="p-1 rounded bg-gray-100 hover:bg-gray-200 text-gray-700 transition"
                                          title="Edit tugas"
                                        >
                                          <Edit2 className="w-3 h-3" />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleDeleteActivity(act.id)}
                                          className="p-1 rounded bg-rose-50 hover:bg-rose-100 text-rose-600 transition"
                                          title="Hapus tugas"
                                        >
                                          <Trash2 className="w-3 h-3" />
                                        </button>
                                      </td>
                                    </tr>
                                  );
                                })
                              )}
                            </>
                          )}
                        </React.Fragment>
                      );
                    })}
                </React.Fragment>
              );
            })}
        </React.Fragment>
      );
    });
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Top Header Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 relative z-10">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-500 to-violet-600 flex items-center justify-center text-white shadow-lg shadow-indigo-950/60 border border-indigo-400/30">
              <CalendarDays className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-bold text-white tracking-tight">Rencana Kerja Tahunan (RKT)</h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  {currentLevelLabel}
                </span>
                {annualWorkPlan && (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                    TA {annualWorkPlan.academic_year} (v{annualWorkPlan.current_version})
                  </span>
                )}
              </div>
              <p className="text-slate-400 text-xs mt-0.5">
                Rincian operasional langkah tugas kegiatan, susunan kepanitiaan SK, dan pemantauan progres program tahunan
              </p>
            </div>
          </div>

          {/* Context Switcher & Academic Year Selectors */}
          <div className="flex flex-wrap items-center gap-3 self-start lg:self-auto">
            {/* Context Switcher: Yayasan vs Satuan */}
            <div className="flex items-center gap-1 bg-slate-950/80 p-1 rounded-2xl border border-slate-800">
              <button
                onClick={() => setContextType('foundation')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  contextType === 'foundation'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Building2 className="w-3.5 h-3.5" />
                Yayasan
              </button>
              <button
                onClick={() => setContextType('school_unit')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  contextType === 'school_unit'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <School className="w-3.5 h-3.5" />
                Satuan Pendidikan
              </button>
            </div>

            {/* School Unit Dropdown (if context === school_unit) */}
            {contextType === 'school_unit' && (
              <div className="relative">
                <select
                  value={selectedUnitId}
                  onChange={(e) => setSelectedUnitId(Number(e.target.value))}
                  className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none focus:border-indigo-500 font-medium"
                >
                  {schoolUnits?.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.level})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Academic Year Selector */}
            <div className="relative">
              <select
                value={academicYear}
                onChange={(e) => setAcademicYear(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none focus:border-indigo-500 font-bold"
              >
                <option value="2025/2026">2025/2026</option>
                <option value="2026/2027">2026/2027</option>
                <option value="2027/2028">2027/2028</option>
                <option value="2028/2029">2028/2029</option>
                <option value="2029/2030">2029/2030</option>
                <option value="2030/2031">2030/2031</option>
              </select>
            </div>

            {/* Publish RKT Button */}
            {annualWorkPlan && (
              <button
                onClick={() => {
                  const defaultDocNum = contextType === 'foundation'
                    ? `SK-RKT-YAYASAN/${academicYear.replace('/', '-')}/V${annualWorkPlan.current_version || 1}`
                    : `SK-RKT/${academicYear.replace('/', '-')}/V${annualWorkPlan.current_version || 1}`;
                  setFormData({
                    document_number: defaultDocNum,
                    title: `${annualWorkPlan.title} (Versi Resmi ${annualWorkPlan.current_version || 1})`,
                    effective_date: new Date().toISOString().substring(0, 10),
                    change_summary: '',
                  });
                  setModalType('publish');
                }}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold transition shadow-lg shadow-emerald-950/40"
              >
                <Send className="w-3.5 h-3.5" />
                Terbitkan RKT Ini
              </button>
            )}
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="mt-4 pt-3 border-t border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Filter Domain */}
            <div className="relative inline-flex items-center">
              <select
                value={filterDomain}
                onChange={(e) => setFilterDomain(e.target.value)}
                className="appearance-none bg-slate-950/90 hover:bg-slate-850/90 border border-slate-800 hover:border-slate-700 text-slate-200 text-xs font-medium rounded-xl pl-3 pr-8 py-1.5 outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition shadow-inner cursor-pointer"
              >
                <option value="all" className="bg-slate-950 text-slate-200">
                  Semua Bidang ({domainsData?.length || 0})
                </option>
                {domainsData?.map((d) => (
                  <option key={d.id} value={d.id} className="bg-slate-950 text-slate-200">
                    {d.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 pointer-events-none" />
            </div>

            {/* Filter Kategori (jika ada) */}
            {programCategories.length > 0 && (
              <div className="relative inline-flex items-center">
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="appearance-none bg-slate-950/90 hover:bg-slate-850/90 border border-slate-800 hover:border-slate-700 text-slate-200 text-xs font-medium rounded-xl pl-3 pr-8 py-1.5 outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition shadow-inner cursor-pointer"
                >
                  <option value="all" className="bg-slate-950 text-slate-200">
                    Semua Kategori ({programCategories.length})
                  </option>
                  {programCategories.map((cat) => (
                    <option key={cat.name} value={cat.name} className="bg-slate-950 text-slate-200">
                      {cat.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 pointer-events-none" />
              </div>
            )}

            {/* Filter Status Progres */}
            <div className="relative inline-flex items-center">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="appearance-none bg-slate-950/90 hover:bg-slate-850/90 border border-slate-800 hover:border-slate-700 text-slate-200 text-xs font-medium rounded-xl pl-3 pr-8 py-1.5 outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition shadow-inner cursor-pointer"
              >
                <option value="all" className="bg-slate-950 text-slate-200">Semua Status</option>
                <option value="not_started" className="bg-slate-950 text-slate-200">Belum Mulai (0%)</option>
                <option value="in_progress" className="bg-slate-950 text-slate-200">Sedang Berjalan (1-99%)</option>
                <option value="completed" className="bg-slate-950 text-slate-200">Selesai (100%)</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 pointer-events-none" />
            </div>

            {/* Flagship Toggle */}
            <label className="flex items-center gap-2 text-slate-300 font-semibold cursor-pointer select-none px-2.5 py-1.5 rounded-xl bg-slate-950 border border-slate-800">
              <input
                type="checkbox"
                checked={filterFlagshipOnly}
                onChange={(e) => setFilterFlagshipOnly(e.target.checked)}
                className="rounded border-slate-700 text-amber-500 focus:ring-amber-500"
              />
              <span className="flex items-center gap-1 text-amber-300 text-xs">
                ⭐ Hanya Unggulan
              </span>
            </label>
          </div>

          {/* Search Box with Clear Button */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1 sm:flex-initial">
              <Search className="w-3.5 h-3.5 text-indigo-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari kode, nama, deskripsi, tugas, panitia..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-8 py-1.5 text-xs text-slate-200 outline-none focus:border-indigo-500 w-full sm:w-72 transition font-medium"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-0.5 rounded-md hover:bg-slate-800 transition"
                  title="Hapus pencarian"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <span className="text-slate-400 text-[11px] whitespace-nowrap shrink-0">
              {isFilteringActive ? (
                <>
                  Ditemukan: <strong className="text-indigo-400 font-bold">{totalFilteredPrograms}</strong> / {programs.length} Program
                </>
              ) : (
                <>
                  Total: <strong className="text-white">{programs.length}</strong> Program
                </>
              )}
            </span>
          </div>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setMainTab('rkt')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-semibold whitespace-nowrap transition-all ${
            mainTab === 'rkt'
              ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 shadow-md'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Layers className="w-4 h-4" />
          Tabel Rincian Operasional &amp; Tugas ({isFilteringActive ? `${totalFilteredPrograms} / ${programs.length}` : programs.length} Program)
        </button>

        <button
          onClick={() => setMainTab('publications')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-semibold whitespace-nowrap transition-all ${
            mainTab === 'publications'
              ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 shadow-md'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <History className="w-4 h-4" />
          Riwayat Penerbitan RKT ({publications.length})
        </button>
      </div>

      {/* TAB 1: RKT HIERARCHICAL TABLE (BIDANG -> SUB-BIDANG -> PROGRAM -> TUGAS) */}
      {mainTab === 'rkt' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800 flex-wrap gap-3">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <FolderOpen className="w-4 h-4 text-indigo-400" />
                Matriks Operasional Program Kerja Tahunan ({academicYear})
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Struktur pohon hierarki Bidang &amp; Sub-Bidang. Klik tombol panitia untuk melihat susunan SK, dan klik <strong>+ Tambah Tugas</strong> pada setiap program.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleExpandAll}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-semibold transition"
              >
                Buka Semua
              </button>
              <button
                type="button"
                onClick={handleCollapseAll}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-semibold transition"
              >
                Tutup Semua
              </button>
              <button
                type="button"
                onClick={handlePrint}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition border border-slate-700 shadow-xs"
                title="Cetak Dokumen RKT"
              >
                <Printer className="w-3.5 h-3.5 text-indigo-400" />
                <span className="hidden sm:inline">Cetak</span>
              </button>
              <button
                type="button"
                onClick={() => setIsFullscreen(true)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 hover:text-white text-xs font-bold transition border border-indigo-500/40 shadow-xs select-none"
                title="Tampilkan Matriks RKT dalam Mode Layar Penuh (Fullscreen)"
              >
                <Maximize2 className="w-3.5 h-3.5 text-indigo-400" />
                <span>Layar Penuh</span>
              </button>
            </div>
          </div>

          {/* Banner Hasil Pencarian / Filter Aktif */}
          {isFilteringActive && (
            <div className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-indigo-950/60 border border-indigo-500/30 text-xs text-indigo-200 animate-fadeIn">
              <div className="flex items-center gap-2.5 flex-wrap">
                <Search className="w-4 h-4 text-indigo-400 shrink-0" />
                <span>
                  {searchQuery.trim() ? (
                    <>
                      Hasil pencarian: <strong className="text-white">"{searchQuery}"</strong> &bull; Ditemukan <strong className="text-emerald-400">{totalFilteredPrograms}</strong> dari {programs.length} program kerja.
                    </>
                  ) : (
                    <>
                      Filter aktif &bull; Menampilkan <strong className="text-emerald-400">{totalFilteredPrograms}</strong> dari {programs.length} program kerja.
                    </>
                  )}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setFilterDomain('all');
                  setFilterCategory('all');
                  setFilterStatus('all');
                  setFilterFlagshipOnly(false);
                }}
                className="px-2.5 py-1 rounded-xl bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 hover:text-white text-[11px] font-bold transition flex items-center gap-1 shrink-0"
              >
                <X className="w-3 h-3" /> Reset Filter
              </button>
            </div>
          )}

          {groupedProgramsHierarchy.length === 0 ? (
            <div className="p-12 text-center space-y-3 bg-slate-950/60 rounded-2xl border border-slate-800">
              <Sparkles className="w-12 h-12 text-slate-600 mx-auto" />
              <h4 className="text-sm font-bold text-white">
                {isFilteringActive ? 'Tidak Ada Program yang Cocok' : 'Tidak Ada Program yang Dijadwalkan'}
              </h4>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                {isFilteringActive
                  ? 'Tidak ada program kerja atau langkah tugas kegiatan yang cocok dengan kata kunci dan filter yang Anda pilih.'
                  : 'Program pada tahun ajaran ini ditentukan dari centang pada Tabel Penerapan Rencana Program di menu RKJP & RKJM.'}
              </p>
              {isFilteringActive && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setFilterDomain('all');
                    setFilterCategory('all');
                    setFilterStatus('all');
                    setFilterFlagshipOnly(false);
                  }}
                  className="mt-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition shadow-md"
                >
                  Reset Semua Filter &amp; Pencarian
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-gray-300 bg-white shadow-sm">
              <table className="w-full text-left border-collapse min-w-[950px]">
                <thead>
                  <tr className="bg-[#F3F4F6] text-gray-800 uppercase text-[11px] font-bold tracking-wider border-b border-[#D1D5DB]">
                    <th className="py-3 px-3 text-center border-r border-[#D1D5DB] w-24">Kode</th>
                    <th className="py-3 px-4 border-r border-[#D1D5DB] min-w-[280px]">Program Kerja / Langkah Tugas Kegiatan</th>
                    <th className="py-3 px-3 text-center border-r border-[#D1D5DB] w-32">Kategori / Tag</th>
                    <th className="py-3 px-3 text-center border-r border-[#D1D5DB] w-28">Jadwal Tgl</th>
                    <th className="py-3 px-3 text-center border-r border-[#D1D5DB] w-36">Pelaksana / Panitia</th>
                    <th className="py-3 px-3 text-center border-r border-[#D1D5DB] w-28">Status &amp; Progres</th>
                    <th className="py-3 px-3 text-center w-28">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {renderRktTableBody()}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* FULLSCREEN OVERLAY VIA REACT PORTAL UNTUK RKT */}
      {isFullscreen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              width: '100vw',
              height: '100vh',
              zIndex: 99999,
              boxSizing: 'border-box',
            }}
            className="bg-slate-950/95 backdrop-blur-md p-3 sm:p-5 flex flex-col overflow-hidden"
          >
            <div
              style={{
                height: '100%',
                maxHeight: '100%',
                display: 'flex',
                flexDirection: 'column',
                flex: '1 1 auto',
                minHeight: 0,
              }}
              className="bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden"
            >
              {/* Header Fullscreen */}
              <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-6 py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 text-white shrink-0 shadow-md z-10">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center font-bold">
                    <CalendarDays className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-extrabold text-sm sm:text-base tracking-wider uppercase">
                        MATRIKS OPERASIONAL PROGRAM KERJA TAHUNAN (RKT TA {academicYear})
                      </h3>
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-white/20 text-white uppercase tracking-wider">
                        Full Screen Mode
                      </span>
                    </div>
                    <p className="text-[11px] text-blue-100 font-medium">
                      {currentLevelLabel} &bull; Rincian langkah operasional, susunan panitia SK &amp; progres tugas
                    </p>
                  </div>
                </div>

                {/* Quick Filters & Controls in Fullscreen */}
                <div className="flex flex-wrap items-center gap-2">
                  {/* Filter Domain in Fullscreen */}
                  <div className="relative inline-flex items-center">
                    <select
                      value={filterDomain}
                      onChange={(e) => setFilterDomain(e.target.value)}
                      className="appearance-none bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded-xl pl-3 pr-7 py-1.5 outline-none border border-white/20 focus:border-white transition cursor-pointer"
                    >
                      <option value="all" className="bg-slate-900 text-slate-100">
                        Semua Bidang ({domainsData?.length || 0})
                      </option>
                      {domainsData?.map((d) => (
                        <option key={d.id} value={d.id} className="bg-slate-900 text-slate-100">
                          {d.name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-blue-200 absolute right-2 pointer-events-none" />
                  </div>

                  {/* Filter Status in Fullscreen */}
                  <div className="relative inline-flex items-center">
                    <select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      className="appearance-none bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded-xl pl-3 pr-7 py-1.5 outline-none border border-white/20 focus:border-white transition cursor-pointer"
                    >
                      <option value="all" className="bg-slate-900 text-slate-100">Semua Status</option>
                      <option value="not_started" className="bg-slate-900 text-slate-100">Belum Mulai</option>
                      <option value="in_progress" className="bg-slate-900 text-slate-100">Sedang Berjalan</option>
                      <option value="completed" className="bg-slate-900 text-slate-100">Selesai</option>
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-blue-200 absolute right-2 pointer-events-none" />
                  </div>

                  {/* Flagship Only Toggle */}
                  <label className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/20 text-xs font-semibold text-white cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={filterFlagshipOnly}
                      onChange={(e) => setFilterFlagshipOnly(e.target.checked)}
                      className="w-3.5 h-3.5 rounded text-amber-500 focus:ring-amber-400"
                    />
                    <span className="text-amber-200 font-bold">⭐ Unggulan</span>
                  </label>

                  {/* Search Input with Clear Button */}
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-blue-200 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Cari program / tugas / PIC..."
                      className="bg-white/10 hover:bg-white/15 focus:bg-white text-white focus:text-gray-900 placeholder-blue-200 focus:placeholder-gray-400 text-xs rounded-xl pl-8 pr-7 py-1.5 outline-none transition border border-white/20 focus:border-white w-40 sm:w-56 font-medium"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery('')}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-white/70 hover:text-white p-0.5 rounded transition"
                        title="Hapus pencarian"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>

                  {/* Buka Semua / Tutup Semua */}
                  <div className="flex items-center gap-1 bg-white/10 p-0.5 rounded-xl border border-white/20">
                    <button
                      type="button"
                      onClick={handleExpandAll}
                      className="px-2 py-1 rounded-lg text-[11px] font-bold text-white hover:bg-white/20 transition"
                      title="Buka semua bidang, sub-bidang dan program"
                    >
                      Buka Semua
                    </button>
                    <button
                      type="button"
                      onClick={handleCollapseAll}
                      className="px-2 py-1 rounded-lg text-[11px] font-bold text-white hover:bg-white/20 transition"
                    >
                      Tutup Semua
                    </button>
                  </div>

                  {/* Print Button */}
                  <button
                    type="button"
                    onClick={handlePrint}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-bold transition border border-white/30 shadow-xs select-none"
                    title="Cetak atau Simpan Dokumen ke Format PDF Resmi"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Cetak</span>
                  </button>

                  {/* Close Fullscreen Button */}
                  <button
                    type="button"
                    onClick={() => setIsFullscreen(false)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-bold transition border border-white/30 shadow-xs select-none"
                    title="Tutup Mode Layar Penuh (ESC)"
                  >
                    <Minimize2 className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Tutup</span>
                    <kbd className="hidden md:inline px-1 py-0.2 text-[9px] bg-black/20 rounded border border-white/30">ESC</kbd>
                  </button>
                </div>
              </div>

              {/* Table Fullscreen with Fluid Scrolling */}
              <div
                style={{
                  flex: '1 1 auto',
                  height: '100%',
                  minHeight: 0,
                  overflowY: 'auto',
                  overflowX: 'auto',
                }}
                className="bg-white"
              >
                {groupedProgramsHierarchy.length === 0 ? (
                  <div className="p-12 text-center space-y-3 bg-gray-50 m-6 rounded-2xl border border-gray-200">
                    <Sparkles className="w-12 h-12 text-gray-400 mx-auto" />
                    <h4 className="text-sm font-bold text-gray-800">
                      {isFilteringActive ? 'Tidak Ada Program yang Cocok' : 'Tidak Ada Program yang Dijadwalkan'}
                    </h4>
                    <p className="text-xs text-gray-500 max-w-md mx-auto">
                      {isFilteringActive
                        ? 'Tidak ada program kerja atau langkah tugas yang cocok dengan kata kunci pencarian.'
                        : 'Program pada tahun ajaran ini ditentukan dari RKJP & RKJM.'}
                    </p>
                    {isFilteringActive && (
                      <button
                        type="button"
                        onClick={() => {
                          setSearchQuery('');
                          setFilterDomain('all');
                          setFilterCategory('all');
                          setFilterStatus('all');
                          setFilterFlagshipOnly(false);
                        }}
                        className="mt-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition shadow-md"
                      >
                        Reset Pencarian
                      </button>
                    )}
                  </div>
                ) : (
                  <table className="w-full text-left border-collapse min-w-[950px]">
                    <thead className="sticky top-0 z-20 shadow-xs bg-[#F3F4F6] text-gray-800 uppercase text-[11px] font-bold tracking-wider border-b border-[#D1D5DB]">
                      <tr>
                        <th className="py-3 px-3 text-center border-r border-[#D1D5DB] w-24">Kode</th>
                        <th className="py-3 px-4 border-r border-[#D1D5DB] min-w-[280px]">Program Kerja / Langkah Tugas Kegiatan</th>
                        <th className="py-3 px-3 text-center border-r border-[#D1D5DB] w-32">Kategori / Tag</th>
                        <th className="py-3 px-3 text-center border-r border-[#D1D5DB] w-28">Jadwal Tgl</th>
                        <th className="py-3 px-3 text-center border-r border-[#D1D5DB] w-36">Pelaksana / Panitia</th>
                        <th className="py-3 px-3 text-center border-r border-[#D1D5DB] w-28">Status &amp; Progres</th>
                        <th className="py-3 px-3 text-center w-28">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {renderRktTableBody()}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* TAB 2: PUBLICATIONS */}
      {mainTab === 'publications' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <History className="w-4 h-4 text-indigo-400" />
                Daftar Freeze Snapshot Resmi RKT
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Dokumen RKT yang telah diterbitkan resmi dan dibekukan sebagai acuan pelaksanaan kerja tahunan
              </p>
            </div>
          </div>

          {publications.length === 0 ? (
            <div className="p-12 text-center text-slate-500 text-xs">
              Belum ada versi RKT yang diterbitkan resmi.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {publications.map((pub) => (
                <div key={pub.id} className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      Versi Resmi v{pub.version}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {new Date(pub.published_at).toLocaleDateString('id-ID')}
                    </span>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-white leading-snug">{pub.title}</h4>
                    <p className="text-xs text-slate-400 mt-0.5">No. Dokumen: {pub.document_number}</p>
                  </div>

                  {pub.change_summary && (
                    <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-[11px] text-slate-300">
                      {pub.change_summary}
                    </div>
                  )}

                  <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                    <span className="text-[11px] text-slate-400">
                      Diterbitkan oleh: <strong>{pub.published_by_name || 'Admin'}</strong>
                    </span>
                    <button
                      onClick={() => {
                        setSelectedPubSnapshot(pub.snapshot_data || {});
                        setModalType('view_pub');
                      }}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 text-xs font-bold transition"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Buka Snapshot
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* POPUP MODAL: DETAIL KEPANITIAAN PROGRAM */}
      {modalType === 'committee_detail' && currentProgramObj && (
        <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 shrink-0">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-indigo-400">
                    {currentProgramObj.program_code}
                  </span>
                  <h3 className="text-base font-bold text-white">
                    Susunan SK Kepanitiaan Program
                  </h3>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  {currentProgramObj.program_name} (TA {academicYear})
                </p>
              </div>
              <button
                onClick={() => setModalType(null)}
                className="text-slate-400 hover:text-white font-bold p-1"
              >
                ✕
              </button>
            </div>

            <div className="overflow-y-auto space-y-4 pr-1 text-xs">
              {currentProgramObj.committee?.status === 'disahkan' ? (
                <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs text-emerald-300 font-semibold">
                    <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
                    <div>
                      <div>Kepanitiaan Telah Disahkan Resmi</div>
                      <div className="text-[11px] text-emerald-400">
                        No. SK: <strong>{currentProgramObj.committee?.sk_number}</strong> (tgl {currentProgramObj.committee?.sk_date ? new Date(currentProgramObj.committee.sk_date).toLocaleDateString('id-ID') : '-'})
                      </div>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shrink-0">
                    TERKUNCI (READ-ONLY)
                  </span>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-slate-950 border border-slate-800">
                  <span className="text-slate-400 text-xs">
                    Kelola nama personil kepanitiaan sebelum disahkan dengan SK resmi.
                  </span>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => {
                        setFormData({
                          committee_position_type_id: positionTypes[0]?.id || '',
                          employee_id: employees[0]?.id || '',
                        });
                        setModalType('add_member');
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition shadow"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Tambah Anggota
                    </button>
                    {currentProgramObj.committee?.members?.length > 0 && (
                      <button
                        onClick={() => {
                          setFormData({
                            sk_number: `SK-PAN/${currentProgramObj.program_code}/${academicYear.replace('/', '-')}`,
                            sk_date: new Date().toISOString().substring(0, 10),
                            sk_file_url: '',
                          });
                          setModalType('sahkan_committee');
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow"
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        Sahkan SK
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Grid Susunan Anggota Kepanitiaan */}
              <div className="space-y-2">
                <h4 className="font-bold text-white text-xs">Daftar Anggota &amp; Jabatan:</h4>
                {!currentProgramObj.committee?.members || currentProgramObj.committee.members.length === 0 ? (
                  <div className="py-8 text-center text-slate-500 bg-slate-950/60 rounded-2xl border border-slate-800">
                    Belum ada susunan panitia. Klik tombol "Tambah Anggota" di atas.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {currentProgramObj.committee.members.map((mem) => {
                      const emp = employees.find((e) => e.id === Number(mem.employee_id));
                      const isDisahkan = currentProgramObj.committee?.status === 'disahkan';

                      return (
                        <div
                          key={mem.id}
                          className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3"
                        >
                          <div className="space-y-0.5 min-w-0">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 block w-fit">
                              {mem.position_name}
                            </span>
                            <div className="font-bold text-white truncate text-xs">
                              {emp ? (emp.name || emp.full_name) : `#${mem.employee_id}`}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              NIP: {emp?.nip || '-'}
                            </div>
                          </div>

                          {!isDisahkan && (
                            <button
                              onClick={() => handleRemoveMember(mem.id)}
                              className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition shrink-0"
                              title="Hapus anggota"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 flex justify-end shrink-0">
              <button
                onClick={() => setModalType(null)}
                className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: PUBLICATIONS HISTORY */}
      {mainTab === 'publications' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <History className="w-5 h-5 text-indigo-400" />
              Riwayat Penerbitan Dokumen Resmi RKT ({annualWorkPlan?.title})
            </h3>
            <p className="text-xs text-slate-400">
              Daftar snapshot freeze Rencana Kerja Tahunan yang telah diterbitkan dengan SK resmi
            </p>
          </div>

          <div className="space-y-4">
            {publications.length === 0 ? (
              <div className="py-8 text-center text-slate-500 text-xs">
                Belum ada versi resmi RKT yang diterbitkan untuk tahun ajaran {academicYear}.
              </div>
            ) : (
              publications.map((pub) => {
                let snapshot = null;
                try {
                  snapshot = typeof pub.snapshot_json === 'string' ? JSON.parse(pub.snapshot_json) : pub.snapshot_json;
                } catch (e) {}

                return (
                  <div
                    key={pub.id}
                    className="p-5 rounded-2xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 uppercase">
                          RKT v{pub.version_number}
                        </span>
                        <span className="font-mono text-xs font-semibold text-slate-300">
                          No. SK: {pub.document_number}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            pub.status === 'published'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {pub.status}
                        </span>
                      </div>

                      <h4 className="text-sm font-bold text-white">{pub.title}</h4>
                      <p className="text-xs text-slate-400">{pub.change_summary || 'Tidak ada catatan perubahan.'}</p>

                      <div className="flex items-center gap-4 text-[11px] text-slate-500 pt-1">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          Berlaku: {pub.effective_date ? new Date(pub.effective_date).toLocaleDateString('id-ID') : '-'}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          Diterbitkan: {new Date(pub.published_at || pub.created_at).toLocaleDateString('id-ID')}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end md:self-center">
                      <button
                        onClick={() => {
                          setSelectedPubSnapshot(snapshot);
                          setModalType('view_pub');
                        }}
                        className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition"
                      >
                        <Eye className="w-3.5 h-3.5 text-indigo-400" />
                        Lihat Snapshot
                      </button>

                      {pub.file_url && (
                        <a
                          href={pub.file_url}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition shadow"
                        >
                          <FileCheck className="w-3.5 h-3.5" />
                          Unduh SK
                        </a>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* MODAL 1: ADD / EDIT ACTIVITY */}
      {modalType === 'activity' && (
        <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white">
                {editingActivity ? 'Edit Langkah Tugas Kegiatan' : 'Tambah Langkah Tugas Kegiatan'}
              </h3>
              <button onClick={() => setModalType(null)} className="text-slate-400 hover:text-white font-bold">✕</button>
            </div>

            <form onSubmit={handleActivitySubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Judul Langkah Kegiatan / Tugas</label>
                <input
                  type="text"
                  value={formData.title || ''}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                  placeholder="Contoh: Rapat Koordinasi Panitia, Penyusunan Dokumen..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Tag / Tipe</label>
                  <SearchableSelect
                    value={formData.tag || 'kegiatan_utama'}
                    onChange={(val) => setFormData({ ...formData, tag: val })}
                    options={tagOptions}
                    placeholder="Pilih Tag / Tipe"
                    searchPlaceholder="Cari tipe/tag..."
                    allowClear={false}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Status Pelaksanaan</label>
                  <SearchableSelect
                    value={formData.status || 'planned'}
                    onChange={(val) => setFormData({ ...formData, status: val })}
                    options={statusOptions}
                    placeholder="Pilih Status"
                    searchPlaceholder="Cari status..."
                    allowClear={false}
                  />
                </div>
              </div>

              {/* Pilihan Jadwal Tanggal: 1 Hari vs Rentang Waktu */}
              <div className="space-y-2 p-3 bg-slate-950/70 border border-slate-800 rounded-2xl">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <label className="text-xs font-semibold text-slate-300">
                    Jadwal Pelaksanaan Tugas
                  </label>
                  <div className="inline-flex rounded-xl bg-slate-900 p-0.5 border border-slate-800 text-[11px] font-semibold">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, date_mode: 'single', end_date: formData.start_date || formData.activity_date || '' })}
                      className={`px-2.5 py-1 rounded-lg transition ${
                        formData.date_mode !== 'range'
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      📅 1 Hari (Spesifik)
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, date_mode: 'range' })}
                      className={`px-2.5 py-1 rounded-lg transition ${
                        formData.date_mode === 'range'
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      🗓️ Rentang Waktu (Mulai - Selesai)
                    </button>
                  </div>
                </div>

                {formData.date_mode === 'range' ? (
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-400 mb-1">
                        Tanggal Mulai (DD/MM/YY)
                      </label>
                      <IndonesianDateInput
                        value={formData.start_date || formData.activity_date || ''}
                        onChange={(iso) => setFormData({ ...formData, start_date: iso, activity_date: iso })}
                        placeholder="HH/BB/TTTT (DD/MM/YY)"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-400 mb-1">
                        Tanggal Selesai / Deadline (DD/MM/YY)
                      </label>
                      <IndonesianDateInput
                        value={formData.end_date || ''}
                        min={formData.start_date || formData.activity_date || ''}
                        onChange={(iso) => setFormData({ ...formData, end_date: iso })}
                        placeholder="HH/BB/TTTT (DD/MM/YY)"
                      />
                    </div>
                  </div>
                ) : (
                  <div>
                    <IndonesianDateInput
                      value={formData.start_date || formData.activity_date || ''}
                      onChange={(iso) => setFormData({ ...formData, start_date: iso, end_date: iso, activity_date: iso })}
                      placeholder="HH/BB/TTTT (DD/MM/YY)"
                    />
                  </div>
                )}
              </div>

              {/* PIC Pegawai (Multi-Select) */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Penanggung Jawab (PIC Pegawai - Bisa &gt; 1 Orang)
                </label>
                <SearchableSelect
                  value={formData.assignee_employee_ids || []}
                  onChange={(val) => setFormData({ ...formData, assignee_employee_ids: val })}
                  options={employeeOptions}
                  placeholder="-- Pilih 1 atau Lebih Pegawai Pelaksana --"
                  searchPlaceholder="Ketik nama atau NIP pegawai..."
                  isMulti={true}
                  allowClear={true}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Progres (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={formData.progress_percent !== undefined ? formData.progress_percent : 0}
                    onChange={(e) => setFormData({ ...formData, progress_percent: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Tautan Bukti / Dokumen</label>
                  <input
                    type="text"
                    value={formData.document_link || ''}
                    onChange={(e) => setFormData({ ...formData, document_link: e.target.value })}
                    placeholder="https://drive.google.com/..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Catatan Tambahan</label>
                <textarea
                  rows={2}
                  value={formData.notes || ''}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Detail instruksi atau kendala pelaksanaan..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 outline-none focus:border-indigo-500"
                />
              </div>

              <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setModalType(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition shadow-lg shadow-indigo-950/50"
                >
                  {formLoading ? 'Menyimpan...' : 'Simpan Tugas'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: ADD COMMITTEE MEMBER */}
      {modalType === 'add_member' && (
        <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white">Tambah Jabatan Kepanitiaan</h3>
              <button onClick={() => setModalType(null)} className="text-slate-400 hover:text-white font-bold">✕</button>
            </div>

            <form onSubmit={handleAddMemberSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Posisi / Jabatan Kepanitiaan</label>
                <SearchableSelect
                  value={formData.committee_position_type_id || ''}
                  onChange={(val) => setFormData({ ...formData, committee_position_type_id: Number(val) })}
                  options={positionTypeOptions}
                  placeholder="-- Pilih Posisi / Jabatan --"
                  searchPlaceholder="Cari jabatan panitia..."
                  required={true}
                  allowClear={false}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Pilih Pegawai Pelaksana</label>
                <SearchableSelect
                  value={formData.employee_id || ''}
                  onChange={(val) => setFormData({ ...formData, employee_id: Number(val) })}
                  options={employeeOptions}
                  placeholder="-- Pilih Pegawai Pelaksana --"
                  searchPlaceholder="Ketik nama atau NIP pegawai..."
                  required={true}
                  allowClear={true}
                />
              </div>

              <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setModalType(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition shadow-lg shadow-indigo-950/50"
                >
                  {formLoading ? 'Menambahkan...' : 'Tambahkan Anggota'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: SAHKAN KEPANITIAAN */}
      {modalType === 'sahkan_committee' && (
        <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                Sahkan SK Kepanitiaan Program
              </h3>
              <button onClick={() => setModalType(null)} className="text-slate-400 hover:text-white font-bold">✕</button>
            </div>

            <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200">
              ⚠️ Pengesahan ini akan mengunci susunan panitia menjadi <strong>read-only</strong>.
            </div>

            <form onSubmit={handleSahkanSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Nomor Surat Keputusan (SK)</label>
                <input
                  type="text"
                  value={formData.sk_number || ''}
                  onChange={(e) => setFormData({ ...formData, sk_number: e.target.value })}
                  required
                  placeholder="Contoh: SK-PAN/001/2026"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Tanggal Penetapan SK (DD/MM/YY)
                </label>
                <IndonesianDateInput
                  value={formData.sk_date || ''}
                  onChange={(iso) => setFormData({ ...formData, sk_date: iso })}
                  required={true}
                  placeholder="HH/BB/TTTT (DD/MM/YY)"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">URL File Dokumen SK (PDF Scan)</label>
                <input
                  type="text"
                  value={formData.sk_file_url || ''}
                  onChange={(e) => setFormData({ ...formData, sk_file_url: e.target.value })}
                  placeholder="https://... atau /uploads/..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none focus:border-indigo-500"
                />
              </div>

              <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setModalType(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-lg shadow-emerald-950/50"
                >
                  {formLoading ? 'Mengesahkan...' : 'Sahkan Kepanitiaan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: PUBLISH RKT */}
      {modalType === 'publish' && (
        <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Send className="w-5 h-5 text-emerald-400" />
                Terbitkan Dokumen Resmi RKT (Versi {annualWorkPlan?.current_version || 1})
              </h3>
              <button onClick={() => setModalType(null)} className="text-slate-400 hover:text-white font-bold">✕</button>
            </div>

            <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300">
              Penerbitan ini akan membekukan (snapshot) seluruh <strong>{programs.length} program</strong> beserta seluruh rincian langkah kegiatan dan susunan kepanitiaannya ke dalam repositori resmi (Document Publications).
            </div>

            <form onSubmit={handlePublishSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Nomor Dokumen / SK</label>
                <input
                  type="text"
                  value={formData.document_number || ''}
                  onChange={(e) => setFormData({ ...formData, document_number: e.target.value })}
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Judul Dokumen Publikasi</label>
                <input
                  type="text"
                  value={formData.title || ''}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Tanggal Berlaku Efektif (DD/MM/YY)
                </label>
                <IndonesianDateInput
                  value={formData.effective_date || ''}
                  onChange={(iso) => setFormData({ ...formData, effective_date: iso })}
                  required={true}
                  placeholder="HH/BB/TTTT (DD/MM/YY)"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Ringkasan Perubahan</label>
                <textarea
                  rows={3}
                  value={formData.change_summary || ''}
                  onChange={(e) => setFormData({ ...formData, change_summary: e.target.value })}
                  placeholder="Catatan rilis versi RKT ini..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 outline-none focus:border-indigo-500"
                />
              </div>

              <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setModalType(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-lg shadow-emerald-950/50"
                >
                  {formLoading ? 'Menerbitkan...' : 'Terbitkan Sekarang'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 5: VIEW SNAPSHOT */}
      {modalType === 'view_pub' && selectedPubSnapshot && (
        <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 shrink-0">
              <div>
                <h3 className="text-base font-bold text-white">Snapshot Freeze Dokumen RKT</h3>
                <p className="text-xs text-slate-400">
                  Diterbitkan pada: {new Date(selectedPubSnapshot.published_at).toLocaleString('id-ID')}
                </p>
              </div>
              <button onClick={() => setModalType(null)} className="text-slate-400 hover:text-white font-bold">✕</button>
            </div>

            <div className="overflow-y-auto space-y-4 pr-1 text-xs">
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                <span className="font-bold text-indigo-400 uppercase text-[10px]">Dokumen RKT</span>
                <h4 className="text-sm font-bold text-white">{selectedPubSnapshot.annual_work_plan?.title}</h4>
                <p className="text-slate-400">
                  Tahun Ajaran: {selectedPubSnapshot.annual_work_plan?.academic_year}
                </p>
              </div>

              <div>
                <h4 className="font-bold text-white mb-2">Daftar Program & Progres:</h4>
                <div className="space-y-2">
                  {selectedPubSnapshot.programs?.map((p) => (
                    <div key={p.program_id} className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white">{p.program_code} - {p.program_name}</span>
                        <span className="text-emerald-400 font-bold">Target TA: {p.target_percent}%</span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Kegiatan: {p.activities?.length || 0} langkah | Panitia: {p.committee?.members?.length || 0} orang
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 flex justify-end shrink-0">
              <button
                onClick={() => setModalType(null)}
                className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
