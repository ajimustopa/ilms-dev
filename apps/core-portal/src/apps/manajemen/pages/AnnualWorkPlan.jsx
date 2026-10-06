import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../../../shared/store/AuthContext';
import api from '../../../shared/services/api';
import {
  CalendarDays,
  School,
  Building2,
  Plus,
  Pencil,
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
  FolderInput,
  Maximize2,
  Minimize2,
  Printer,
  Eye,
  BookOpen,
  X
} from 'lucide-react';
import { useManajemenTheme } from '../theme/ManajemenThemeContext';
import DatePickerField, { isoToDmy, dmyToIso } from '../components/shared/DatePickerField';
import SearchableSelect from '../../../shared/components/SearchableSelect';
import MoveProgramModal from '../components/shared/MoveProgramModal';

// Alias DatePickerField sebagai DateInput berdesain modern bertema
const IndonesianDateInput = DatePickerField;

// Clean & Compact Live-Search Academic Year Dropdown Component based on Master Data Akademik
function AcademicYearDropdown({
  value,
  onChange,
  academicYears = [],
  className = '',
}) {
  const { isDark } = useManajemenTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const containerRef = useRef(null);
  const searchInputRef = useRef(null);
  const optionRefs = useRef([]);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Filtered academic years by search query
  const filteredYears = useMemo(() => {
    if (!search.trim()) return academicYears;
    const q = search.toLowerCase().trim();
    return academicYears.filter((ay) => ay.name.toLowerCase().includes(q));
  }, [academicYears, search]);

  useEffect(() => {
    setHighlightedIndex(0);
  }, [filteredYears.length, search]);

  useEffect(() => {
    if (isOpen && optionRefs.current[highlightedIndex]) {
      optionRefs.current[highlightedIndex]?.scrollIntoView({ block: 'nearest' });
    }
  }, [highlightedIndex, isOpen]);

  const handleKeyDown = (e) => {
    if (!isOpen) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev < filteredYears.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : Math.max(0, filteredYears.length - 1)));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredYears[highlightedIndex]) {
        onChange(filteredYears[highlightedIndex].name);
        setIsOpen(false);
      }
    }
  };

  const selectedItem = academicYears.find((ay) => ay.name === value);

  return (
    <div ref={containerRef} className={`relative inline-block ${isOpen ? 'z-[500]' : 'z-10'} ${className}`} onKeyDown={handleKeyDown}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all shadow-xs border ${
          isOpen
            ? isDark
              ? 'bg-slate-900 text-indigo-400 border-indigo-500/60 ring-1 ring-indigo-500/30'
              : 'bg-white text-indigo-700 border-indigo-500 ring-1 ring-indigo-500/30 shadow-sm'
            : isDark
              ? 'bg-slate-950 hover:bg-slate-900 text-slate-200 border-slate-800 hover:border-slate-700'
              : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-300'
        }`}
      >
        <CalendarDays className={`w-3.5 h-3.5 ${selectedItem?.isActive ? 'text-emerald-500' : 'text-slate-400'}`} />
        <span className="font-mono text-xs">
          TA {value || 'Pilih Tahun'}
        </span>
        {selectedItem?.isActive && (
          <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-500/15 text-emerald-500 border border-emerald-500/25">
            Aktif
          </span>
        )}
        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-150 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Popover Menu */}
      {isOpen && (
        <div className={`absolute right-0 mt-1.5 w-60 border rounded-xl shadow-2xl z-[1000] p-1.5 space-y-1 ${
          isDark
            ? 'bg-slate-900 border-slate-800 text-white'
            : 'bg-white border-slate-200 text-slate-900 shadow-slate-200/80'
        }`}>
          {/* Live Search Input */}
          <div className="relative p-1">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none z-10" />
            <input
              ref={searchInputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari tahun ajaran..."
              className={`w-full border rounded-lg pl-9 pr-6 py-1.5 text-xs outline-none focus:border-indigo-500 font-mono ${
                isDark
                  ? 'bg-slate-950 border-slate-800 text-slate-200 placeholder:text-slate-500'
                  : 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400'
              }`}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 p-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* List of Academic Years from Master Akademik */}
          <div className="max-h-48 overflow-y-auto space-y-0.5 p-0.5 custom-scrollbar">
            {filteredYears.length === 0 ? (
              <div className="py-4 text-center text-slate-400 text-xs">
                Tahun ajaran tidak ditemukan
              </div>
            ) : (
              filteredYears.map((ay, idx) => {
                const isSelected = ay.name === value;
                const isHighlighted = idx === highlightedIndex;

                return (
                  <button
                    key={ay.name}
                    ref={(el) => (optionRefs.current[idx] = el)}
                    type="button"
                    onClick={() => {
                      onChange(ay.name);
                      setIsOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left text-xs transition ${
                      isSelected
                        ? isDark ? 'bg-indigo-600/90 text-white font-bold' : 'bg-indigo-50 text-indigo-700 font-bold border border-indigo-200'
                        : isHighlighted
                          ? isDark ? 'bg-slate-800 text-slate-100' : 'bg-slate-100 text-slate-900'
                          : isDark ? 'hover:bg-slate-800/60 text-slate-300' : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono">{ay.name}</span>
                      {ay.isActive && (
                        <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                          isSelected
                            ? isDark ? 'bg-white/20 text-white' : 'bg-emerald-600 text-white'
                            : 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/25'
                        }`}>
                          Aktif
                        </span>
                      )}
                    </div>
                    {isSelected && (
                      <Check className={`w-3.5 h-3.5 ${isDark ? 'text-white' : 'text-indigo-600'}`} />
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

export default function AnnualWorkPlan() {
  const { user, schoolUnits, activeSchoolUnit } = useAuth();

  // Context Type: 'foundation' (Yayasan/Gabungan) | 'school_unit' (Per Satuan Pendidikan)
  const [contextType, setContextType] = useState('foundation');

  // Filters & Context
  const [selectedUnitId, setSelectedUnitId] = useState(
    activeSchoolUnit?.id || (schoolUnits?.[0]?.id || 1)
  );
  const [academicYear, setAcademicYear] = useState(() => {
    try {
      const saved = localStorage.getItem('core_rkt_academic_year');
      if (saved) return saved;
    } catch (_) {}
    return '2026/2027';
  });
  const [academicYearsList, setAcademicYearsList] = useState([]);

  // Auto-sync academicYear selection to localStorage
  useEffect(() => {
    if (academicYear) {
      try {
        localStorage.setItem('core_rkt_academic_year', academicYear);
      } catch (_) {}
    }
  }, [academicYear]);
  const [filterFlagshipOnly, setFilterFlagshipOnly] = useState(false);
  const [filterDomain, setFilterDomain] = useState('all');
  const [filterSubdomain, setFilterSubdomain] = useState('all');
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

  // Subdomain Addition Modal States
  const [isAddSubdomainModalOpen, setIsAddSubdomainModalOpen] = useState(false);
  const [selectedDomainForSubdomain, setSelectedDomainForSubdomain] = useState(null);
  const [newSubdomainName, setNewSubdomainName] = useState('');
  const [subdomainFormLoading, setSubdomainFormLoading] = useState(false);

  // Edit Domain & Edit Subdomain Modal States
  const [isEditDomainModalOpen, setIsEditDomainModalOpen] = useState(false);
  const [editingDomainObj, setEditingDomainObj] = useState(null);
  const [editDomainForm, setEditDomainForm] = useState({ name: '', order_index: 1 });

  const [isEditSubdomainModalOpen, setIsEditSubdomainModalOpen] = useState(false);
  const [editingSubdomainObj, setEditingSubdomainObj] = useState(null);
  const [editSubdomainForm, setEditSubdomainForm] = useState({ name: '', order_index: 1 });

  // Move Program Modal States
  const [isMoveProgramModalOpen, setIsMoveProgramModalOpen] = useState(false);
  const [programToMove, setProgramToMove] = useState(null);

  const handleOpenMoveProgramModal = (prog) => {
    setProgramToMove(prog);
    setIsMoveProgramModalOpen(true);
  };

  // Program Addition Modal States for RKT
  const [isAddProgramModalOpen, setIsAddProgramModalOpen] = useState(false);
  const [addProgramTab, setAddProgramTab] = useState('existing'); // 'existing' | 'new'
  const [targetAddContext, setTargetAddContext] = useState(null); // { domainId, subdomainId, domainName, subdomainName }
  const [availableRipsPrograms, setAvailableRipsPrograms] = useState([]);
  const [availableRipsGoals, setAvailableRipsGoals] = useState([]);
  const [availableRipsCategories, setAvailableRipsCategories] = useState([]);
  const [selectedRipsProg, setSelectedRipsProg] = useState(null);
  const [existingProgSearch, setExistingProgSearch] = useState('');
  const [isExistingDropdownOpen, setIsExistingDropdownOpen] = useState(false);
  const [existingTargetPercent, setExistingTargetPercent] = useState(100);
  const [existingNotes, setExistingNotes] = useState('');

  // Form state for creating a brand new program directly in RKT & RIPS
  const [newProgFormData, setNewProgFormData] = useState({
    code: '',
    name: '',
    category_id: '',
    domain_id: '',
    subdomain_id: '',
    description: '',
    is_flagship: 0,
    linked_goal_ids: [],
    linked_indicator_ids: [],
    target_percent: 100,
    notes: '',
  });
  const [newProgGoalSearch, setNewProgGoalSearch] = useState('');
  const [isNewProgGoalDropdownOpen, setIsNewProgGoalDropdownOpen] = useState(false);
  const existingDropdownRef = useRef(null);
  const newProgGoalDropdownRef = useRef(null);

  // Program Edit Modal States for RKT (Sync to RIPS & RKT)
  const [isEditProgramModalOpen, setIsEditProgramModalOpen] = useState(false);
  const [editingProgramObj, setEditingProgramObj] = useState(null);
  const [editProgFormData, setEditProgFormData] = useState({
    code: '',
    name: '',
    category_id: '',
    domain_id: '',
    subdomain_id: '',
    description: '',
    is_flagship: 0,
    linked_goal_ids: [],
    linked_indicator_ids: [],
    target_percent: 100,
    notes: '',
  });
  const [editProgGoalSearch, setEditProgGoalSearch] = useState('');
  const [isEditProgGoalDropdownOpen, setIsEditProgGoalDropdownOpen] = useState(false);
  const editProgGoalDropdownRef = useRef(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (existingDropdownRef.current && !existingDropdownRef.current.contains(e.target)) {
        setIsExistingDropdownOpen(false);
      }
      if (newProgGoalDropdownRef.current && !newProgGoalDropdownRef.current.contains(e.target)) {
        setIsNewProgGoalDropdownOpen(false);
      }
      if (editProgGoalDropdownRef.current && !editProgGoalDropdownRef.current.contains(e.target)) {
        setIsEditProgGoalDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

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
            <mark key={i} className="bg-amber-300 text-slate-950 font-bold px-0.5 rounded shadow-xs">
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

  // Available Subdomains based on selected filterDomain
  const availableSubdomains = useMemo(() => {
    if (filterDomain === 'all') {
      return (subdomainsData || []).map((s) => {
        const d = (domainsData || []).find((dom) => Number(dom.id) === Number(s.domain_id));
        return { ...s, domainName: d?.name };
      });
    }
    return (subdomainsData || []).filter((s) => Number(s.domain_id) === Number(filterDomain));
  }, [domainsData, subdomainsData, filterDomain]);

  // Status apakah sedang ada pencarian atau filter aktif
  const isFilteringActive = Boolean(
    searchQuery.trim() || filterFlagshipOnly || filterDomain !== 'all' || filterSubdomain !== 'all' || filterCategory !== 'all' || filterStatus !== 'all'
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

  // Load master academic years from Akademik module master data
  useEffect(() => {
    const loadAcademicYears = async () => {
      try {
        const res = await api.get('/akademik/academic-years').catch(() => null);
        const masterYears = res?.data?.data || [];

        const yearMap = new Map();
        masterYears.forEach((ay) => {
          const name = ay.name || ay.academic_year || ay.code;
          if (name) {
            const isAct = ay.is_active === 1 || ay.is_active === true || ay.status === 'active';
            if (!yearMap.has(name) || isAct) {
              yearMap.set(name, {
                name,
                id: ay.id,
                isActive: isAct,
                startDate: ay.start_date,
                endDate: ay.end_date,
              });
            }
          }
        });

        // Sort descending by start year (newest first)
        const sorted = Array.from(yearMap.values()).sort((a, b) => {
          const yA = parseInt(a.name.split('/')[0]) || 0;
          const yB = parseInt(b.name.split('/')[0]) || 0;
          return yB - yA;
        });

        if (sorted.length > 0) {
          setAcademicYearsList(sorted);
          // Only fallback if saved/current academicYear is not found in master list
          const savedYear = (() => {
            try { return localStorage.getItem('core_rkt_academic_year'); } catch (_) { return null; }
          })();
          const currentYear = savedYear || academicYear;
          const isCurrentValid = sorted.some((s) => s.name === currentYear);

          if (!isCurrentValid) {
            const activeItem = sorted.find((y) => y.isActive) || sorted[0];
            if (activeItem) {
              setAcademicYear(activeItem.name);
            }
          } else if (savedYear && savedYear !== academicYear) {
            setAcademicYear(savedYear);
          }
        }
      } catch (err) {
        console.error('Failed to load academic years:', err);
      }
    };

    loadAcademicYears();
  }, []);

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

          // Default: semuanya terlipat (collapsed)
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
  const toggleDomain = (key, domainObj) => {
    setExpandedDomains((prev) => {
      const isCurrentlyExpanded = Boolean(prev[key]);
      const nextExpanded = !isCurrentlyExpanded;

      // Saat membuka bidang, otomatis buka seluruh sub-bidang & program di dalamnya agar data langsung tampil lengkap
      if (nextExpanded && domainObj?.subdomainList) {
        setExpandedSubdomains((prevSub) => {
          const nextSub = { ...prevSub };
          domainObj.subdomainList.forEach((s) => {
            nextSub[`sub_${domainObj.id}_${s.id}`] = true;
          });
          return nextSub;
        });

        if (domainObj.subdomainList.some((s) => s.programs?.length > 0)) {
          setExpandedPrograms((prevProg) => {
            const nextProg = { ...prevProg };
            domainObj.subdomainList.forEach((s) => {
              s.programs?.forEach((p) => {
                nextProg[p.program_id] = true;
              });
            });
            return nextProg;
          });
        }
      }

      return {
        ...prev,
        [key]: nextExpanded,
      };
    });
  };

  const toggleSubdomain = (key, subObj) => {
    setExpandedSubdomains((prev) => {
      const isCurrentlyExpanded = Boolean(prev[key]);
      const nextExpanded = !isCurrentlyExpanded;

      // Saat membuka sub-bidang, otomatis buka seluruh program di dalamnya
      if (nextExpanded && subObj?.programs) {
        setExpandedPrograms((prevProg) => {
          const nextProg = { ...prevProg };
          subObj.programs.forEach((p) => {
            nextProg[p.program_id] = true;
          });
          return nextProg;
        });
      }

      return {
        ...prev,
        [key]: nextExpanded,
      };
    });
  };

  const toggleProgram = (pId) => {
    setExpandedPrograms((prev) => ({
      ...prev,
      [pId]: !prev[pId],
    }));
  };

  // Group Programs by Domain and Subdomain (Hierarchy Tree with Enhanced Search & Filtering)
  const groupedProgramsHierarchy = useMemo(() => {
    if (!programs || programs.length === 0) return [];

    const domainMap = new Map();

    // 1. Initialize Domains & Subdomains
    domainsData.forEach((d, dIdx) => {
      const domOrder = d.order_index ?? (dIdx + 1);
      const subMap = new Map();

      const matchedSubs = subdomainsData.filter((s) => String(s.domain_id) === String(d.id));
      if (matchedSubs.length > 0) {
        matchedSubs.forEach((s, sIdx) => {
          subMap.set(String(s.id), {
            id: s.id,
            name: s.name,
            code: `SUB-${String(s.order_index ?? sIdx + 1).padStart(2, '0')}`,
            order_index: s.order_index ?? (sIdx + 1),
            programs: [],
          });
        });
      }

      domainMap.set(String(d.id), {
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
      const dId = prog.domain_id ? String(prog.domain_id) : 'unassigned';
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

      const subId = prog.subdomain_id ? String(prog.subdomain_id) : 'general';
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
        if (filterSubdomain !== 'all' && String(filterSubdomain) !== String(subItem.id)) {
          return;
        }
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
  }, [programs, domainsData, subdomainsData, filterDomain, filterSubdomain, filterCategory, filterStatus, filterFlagshipOnly, searchQuery, employees, isFilteringActive]);

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
    const allExpD = {};
    const allExpS = {};
    const allExpP = {};
    groupedProgramsHierarchy.forEach((d) => {
      allExpD[`dom_${d.id}`] = true;
      d.subdomainList.forEach((s) => {
        allExpS[`sub_${d.id}_${s.id}`] = true;
      });
    });
    programs.forEach((p) => {
      allExpP[p.program_id] = true;
    });
    setExpandedDomains(allExpD);
    setExpandedSubdomains(allExpS);
    setExpandedPrograms(allExpP);
  };

  const handleCollapseAll = () => {
    setExpandedDomains({});
    setExpandedSubdomains({});
    setExpandedPrograms({});
  };

  const handleExpandDomainsOnly = () => {
    const allExpD = {};
    groupedProgramsHierarchy.forEach((d) => {
      allExpD[`dom_${d.id}`] = true;
    });
    setExpandedDomains(allExpD);
    setExpandedSubdomains({});
    setExpandedPrograms({});
  };

  const handleExpandSubdomains = () => {
    const allExpD = {};
    const allExpS = {};
    groupedProgramsHierarchy.forEach((d) => {
      allExpD[`dom_${d.id}`] = true;
      d.subdomainList.forEach((s) => {
        allExpS[`sub_${d.id}_${s.id}`] = true;
      });
    });
    setExpandedDomains(allExpD);
    setExpandedSubdomains(allExpS);
    setExpandedPrograms({});
  };

  const handleExpandProgramsOnly = () => {
    const allExpD = {};
    const allExpS = {};
    const allExpP = {};
    groupedProgramsHierarchy.forEach((d) => {
      allExpD[`dom_${d.id}`] = true;
      d.subdomainList.forEach((s) => {
        allExpS[`sub_${d.id}_${s.id}`] = true;
      });
    });
    programs.forEach((p) => {
      allExpP[p.program_id] = true;
    });
    setExpandedDomains(allExpD);
    setExpandedSubdomains(allExpS);
    setExpandedPrograms(allExpP);
  };

  const handlePrint = () => {
    window.print();
  };

  // Open Add Program Modal
  const handleOpenAddProgramModal = async (targetContext = null) => {
    if (!annualWorkPlan?.id) return;
    setTargetAddContext(targetContext);
    setIsAddProgramModalOpen(true);
    // Jika dibuka langsung dari tombol baris sub-bidang, arahkan langsung ke tab Buat Program Baru dengan penempatan sub-bidang terpilih
    setAddProgramTab(targetContext ? 'new' : 'existing');
    setSelectedRipsProg(null);
    setExistingProgSearch('');
    setIsExistingDropdownOpen(false);
    setExistingTargetPercent(100);
    setExistingNotes('');

    try {
      // 1. Fetch available RIPS programs for this RKT
      const availRes = await api.get(`/manajemen/annual-work-plans/${annualWorkPlan.id}/available-programs`).catch((err) => {
        console.warn('Could not fetch available programs:', err);
        return { data: { success: true, data: [] } };
      });
      if (availRes.data?.success) {
        setAvailableRipsPrograms(availRes.data.data || []);
      }

      // 2. Fetch RIPS goals & categories for creating new programs
      const unitQuery = annualWorkPlan?.school_unit_id ? `?school_unit_id=${annualWorkPlan.school_unit_id}` : '';
      const [goalsRes, catsRes] = await Promise.all([
        api.get(`/manajemen/rips/goals${unitQuery}`).catch(() => ({ data: { data: [] } })),
        api.get('/manajemen/rips/program-categories').catch(() => ({ data: { data: [] } })),
      ]);

      let allGoals = goalsRes.data?.data || [];
      if (annualWorkPlan?.school_unit_id) {
        allGoals = allGoals.filter((g) => g.school_unit_id === annualWorkPlan.school_unit_id || g.rips_document_id === (annualWorkPlan.school_unit_id === 1 ? 2 : 3));
      } else {
        allGoals = allGoals.filter((g) => !g.school_unit_id || g.rips_document_id === 1);
      }
      setAvailableRipsGoals(allGoals);
      setAvailableRipsCategories(catsRes.data?.data || []);

      const defaultDomainId = targetContext?.domainId ? String(targetContext.domainId) : (domainsData[0]?.id ? String(domainsData[0].id) : '');
      const defaultSubdomainId = targetContext?.subdomainId ? String(targetContext.subdomainId) : '';

      let maxNum = 0;
      (availRes.data?.data || []).concat(programs).forEach((p) => {
        const match = (p.code || p.program_code)?.match(/PRG-(?:UNG-)?(\d+)/i);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num > maxNum) maxNum = num;
        }
      });
      const suggestedCode = `PRG-${String(maxNum + 1).padStart(3, '0')}`;

      setNewProgFormData({
        code: suggestedCode,
        name: '',
        category_id: catsRes.data?.data?.[0]?.id ? String(catsRes.data.data[0].id) : '',
        domain_id: defaultDomainId,
        subdomain_id: defaultSubdomainId,
        description: '',
        is_flagship: 0,
        linked_goal_ids: [],
        linked_indicator_ids: [],
        target_percent: 100,
        notes: '',
      });
      setNewProgGoalSearch('');
      setIsNewProgGoalDropdownOpen(false);
    } catch (err) {
      console.error('Error fetching data for add program modal:', err);
    }
  };

  // Submit: Tambahkan program yang sudah ada di RIPS ke RKT
  const handleAddExistingProgramToRkt = async (e) => {
    e.preventDefault();
    if (!selectedRipsProg?.id) {
      alert('Silakan pilih salah satu program RIPS dari daftar pencarian.');
      return;
    }
    setFormLoading(true);
    try {
      await api.post(`/manajemen/annual-work-plans/${annualWorkPlan.id}/programs`, {
        rips_program_id: selectedRipsProg.id,
        target_percent: existingTargetPercent,
        notes: existingNotes,
        domain_id: targetAddContext?.domainId || undefined,
        subdomain_id: targetAddContext?.subdomainId || undefined,
      });

      const targetDomId = targetAddContext?.domainId;
      const targetSubId = targetAddContext?.subdomainId;
      if (targetDomId) {
        setExpandedDomains((prev) => ({
          ...prev,
          [targetDomId]: true,
          [`dom_${targetDomId}`]: true,
        }));
      }
      if (targetSubId) {
        setExpandedSubdomains((prev) => ({
          ...prev,
          [targetSubId]: true,
          [`sub_${targetDomId}_${targetSubId}`]: true,
        }));
      }

      setIsAddProgramModalOpen(false);
      await fetchData();
      alert(`Program "${selectedRipsProg.name}" berhasil dimasukkan ke RKT TA ${academicYear}!`);
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menambahkan program ke RKT');
    } finally {
      setFormLoading(false);
    }
  };

  // Submit: Buat program baru di RIPS dan langsung masukkan ke RKT
  const handleCreateNewProgramInRkt = async (e) => {
    e.preventDefault();
    if (!newProgFormData.name?.trim()) {
      alert('Nama program kerja wajib diisi');
      return;
    }
    setFormLoading(true);
    try {
      await api.post(`/manajemen/annual-work-plans/${annualWorkPlan.id}/programs/new`, {
        ...newProgFormData,
        target_percent: newProgFormData.target_percent,
        notes: newProgFormData.notes,
      });

      const activeDomainId = newProgFormData.domain_id || targetAddContext?.domainId;
      const activeSubId = newProgFormData.subdomain_id || targetAddContext?.subdomainId;
      if (activeDomainId) {
        setExpandedDomains((prev) => ({
          ...prev,
          [activeDomainId]: true,
          [`dom_${activeDomainId}`]: true,
        }));
      }
      if (activeSubId) {
        setExpandedSubdomains((prev) => ({
          ...prev,
          [activeSubId]: true,
          [`sub_${activeDomainId}_${activeSubId}`]: true,
        }));
      }

      setIsAddProgramModalOpen(false);
      await fetchData();
      alert(`Program baru "${newProgFormData.name}" berhasil dibuat di RIPS dan dimasukkan ke RKT TA ${academicYear}!`);
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal membuat program baru');
    } finally {
      setFormLoading(false);
    }
  };

  // Open Add Subdomain Modal for a specific Domain
  const handleOpenAddSubdomainModal = (domain) => {
    setSelectedDomainForSubdomain(domain);
    setNewSubdomainName('');
    setIsAddSubdomainModalOpen(true);
  };

  // Submit: Tambah Sub-Bidang Baru ke Domain
  const handleSaveSubdomainSubmit = async (e) => {
    e.preventDefault();
    if (!selectedDomainForSubdomain || !newSubdomainName.trim()) {
      alert('Mohon masukkan nama sub-bidang.');
      return;
    }
    setSubdomainFormLoading(true);
    try {
      await api.post('/manajemen/rips/subdomains', {
        domain_id: selectedDomainForSubdomain.id,
        name: newSubdomainName.trim(),
        order_index: (selectedDomainForSubdomain.subdomainList?.length || 0) + 1,
      });
      await fetchData();
      setIsAddSubdomainModalOpen(false);
      setNewSubdomainName('');
      setSelectedDomainForSubdomain(null);
      alert('Sub-Bidang baru berhasil ditambahkan!');
    } catch (err) {
      console.error('Error adding subdomain:', err);
      alert(err.response?.data?.message || 'Gagal menambahkan sub-bidang baru.');
    } finally {
      setSubdomainFormLoading(false);
    }
  };

  // Open Edit Domain Modal (Berlaku untuk seluruh TA)
  const handleOpenEditDomainModal = (domain) => {
    setEditingDomainObj(domain);
    setEditDomainForm({
      name: domain.name || '',
      order_index: domain.order_index || 1,
    });
    setIsEditDomainModalOpen(true);
  };

  // Submit: Edit Domain
  const handleSaveEditDomain = async (e) => {
    e.preventDefault();
    if (!editingDomainObj?.id || !editDomainForm.name.trim()) {
      alert('Nama bidang wajib diisi.');
      return;
    }
    setFormLoading(true);
    try {
      await api.put(`/manajemen/rips/domains/${editingDomainObj.id}`, {
        name: editDomainForm.name.trim(),
        order_index: Number(editDomainForm.order_index || 1),
      });
      await fetchData();
      setIsEditDomainModalOpen(false);
      setEditingDomainObj(null);
      alert('Bidang berhasil diperbarui dan berlaku untuk seluruh tahun ajaran!');
    } catch (err) {
      console.error('Error updating domain:', err);
      alert(err.response?.data?.message || 'Gagal memperbarui bidang.');
    } finally {
      setFormLoading(false);
    }
  };

  // Open Edit Subdomain Modal (Berlaku untuk seluruh TA)
  const handleOpenEditSubdomainModal = (domain, sub) => {
    setEditingSubdomainObj({ ...sub, domain_id: domain.id, domain_name: domain.name });
    setEditSubdomainForm({
      name: sub.name || '',
      order_index: sub.order_index || 1,
    });
    setIsEditSubdomainModalOpen(true);
  };

  // Submit: Edit Subdomain
  const handleSaveEditSubdomain = async (e) => {
    e.preventDefault();
    if (!editingSubdomainObj?.id || !editSubdomainForm.name.trim()) {
      alert('Nama sub-bidang wajib diisi.');
      return;
    }
    setFormLoading(true);
    try {
      await api.put(`/manajemen/rips/subdomains/${editingSubdomainObj.id}`, {
        name: editSubdomainForm.name.trim(),
        order_index: Number(editSubdomainForm.order_index || 1),
      });
      await fetchData();
      setIsEditSubdomainModalOpen(false);
      setEditingSubdomainObj(null);
      alert('Sub-bidang berhasil diperbarui dan berlaku untuk seluruh tahun ajaran!');
    } catch (err) {
      console.error('Error updating subdomain:', err);
      alert(err.response?.data?.message || 'Gagal memperbarui sub-bidang.');
    } finally {
      setFormLoading(false);
    }
  };

  // Remove program from RKT
  const handleRemoveProgramFromRkt = async (prog) => {
    if (!window.confirm(`Keluarkan program "[${prog.program_code}] ${prog.program_name}" dari RKT TA ${academicYear}?`)) return;
    try {
      await api.delete(`/manajemen/annual-work-plans/${annualWorkPlan.id}/programs/${prog.program_id}`);
      fetchData();
      alert('Program berhasil dikeluarkan dari RKT');
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal mengeluarkan program dari RKT');
    }
  };

  // Open Edit Program Modal (Sync to RIPS & RKT)
  const handleOpenEditProgramModal = async (prog) => {
    setEditingProgramObj(prog);

    // Fetch RIPS goals & categories if not yet loaded
    let allGoals = availableRipsGoals;
    let allCats = availableRipsCategories;
    if (!allCats || allCats.length === 0 || !allGoals || allGoals.length === 0) {
      try {
        const unitQuery = annualWorkPlan?.school_unit_id ? `?school_unit_id=${annualWorkPlan.school_unit_id}` : '';
        const [goalsRes, catsRes] = await Promise.all([
          api.get(`/manajemen/rips/goals${unitQuery}`).catch(() => ({ data: { data: [] } })),
          api.get('/manajemen/rips/program-categories').catch(() => ({ data: { data: [] } })),
        ]);
        allGoals = goalsRes.data?.data || [];
        if (annualWorkPlan?.school_unit_id) {
          allGoals = allGoals.filter((g) => g.school_unit_id === annualWorkPlan.school_unit_id || g.rips_document_id === (annualWorkPlan.school_unit_id === 1 ? 2 : 3));
        } else {
          allGoals = allGoals.filter((g) => !g.school_unit_id || g.rips_document_id === 1);
        }
        allCats = catsRes.data?.data || [];
        setAvailableRipsGoals(allGoals);
        setAvailableRipsCategories(allCats);
      } catch (err) {
        console.error('Failed to load goals/categories for edit modal:', err);
      }
    }

    const existingGoalIds = (prog.linked_goals || []).map((g) => g.goal_id);
    setEditProgFormData({
      code: prog.program_code || '',
      name: prog.program_name || '',
      category_id: prog.category_id ? String(prog.category_id) : '',
      domain_id: prog.domain_id ? String(prog.domain_id) : '',
      subdomain_id: prog.subdomain_id ? String(prog.subdomain_id) : '',
      description: prog.program_description || '',
      is_flagship: prog.is_flagship === 1 ? 1 : 0,
      target_percent: prog.target_percent !== null && prog.target_percent !== undefined ? Number(prog.target_percent) : 100,
      notes: prog.target_notes || '',
      linked_goal_ids: existingGoalIds,
      linked_indicator_ids: [],
    });
    setEditProgGoalSearch('');
    setIsEditProgGoalDropdownOpen(false);
    setIsEditProgramModalOpen(true);
  };

  // Submit: Simpan Edit Program (Otomatis Sync ke RIPS & RKT)
  const handleSaveEditedProgram = async (e) => {
    e.preventDefault();
    if (!editingProgramObj?.program_id || !editProgFormData.name?.trim()) {
      alert('Nama program kerja wajib diisi');
      return;
    }
    setFormLoading(true);
    try {
      // 1. Update RIPS Program Master
      await api.put(`/manajemen/rips/programs/${editingProgramObj.program_id}`, {
        name: editProgFormData.name.trim(),
        code: editProgFormData.code ? editProgFormData.code.trim() : undefined,
        category_id: editProgFormData.category_id ? Number(editProgFormData.category_id) : null,
        domain_id: editProgFormData.domain_id ? Number(editProgFormData.domain_id) : null,
        subdomain_id: editProgFormData.subdomain_id ? Number(editProgFormData.subdomain_id) : null,
        description: editProgFormData.description || null,
        is_flagship: editProgFormData.is_flagship ? 1 : 0,
        linked_goal_ids: editProgFormData.linked_goal_ids,
        linked_indicator_ids: editProgFormData.linked_indicator_ids,
      });

      // 2. Update RKT Target & Notes
      if (annualWorkPlan?.id) {
        await api.post(`/manajemen/annual-work-plans/${annualWorkPlan.id}/programs`, {
          rips_program_id: editingProgramObj.program_id,
          target_percent: editProgFormData.target_percent,
          notes: editProgFormData.notes,
          domain_id: editProgFormData.domain_id || undefined,
          subdomain_id: editProgFormData.subdomain_id || undefined,
        });
      }

      const activeDomainId = editProgFormData.domain_id;
      const activeSubId = editProgFormData.subdomain_id;
      if (activeDomainId) {
        setExpandedDomains((prev) => ({
          ...prev,
          [activeDomainId]: true,
          [`dom_${activeDomainId}`]: true,
        }));
      }
      if (activeSubId) {
        setExpandedSubdomains((prev) => ({
          ...prev,
          [activeSubId]: true,
          [`sub_${activeDomainId}_${activeSubId}`]: true,
        }));
      }

      setIsEditProgramModalOpen(false);
      setEditingProgramObj(null);
      await fetchData();
      alert(`Program "${editProgFormData.name}" berhasil diperbarui di RKT dan RIPS!`);
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal memperbarui program');
    } finally {
      setFormLoading(false);
    }
  };

  // Render RKT Table Body (Hierarki: Bidang -> Sub-Bidang -> Program -> Tugas)
  const renderRktTableBody = () => {
    return groupedProgramsHierarchy.map((domain) => {
      const domKey = `dom_${domain.id}`;
      const isDomExpanded = isFilteringActive ? true : Boolean(expandedDomains[domKey]);

      return (
        <React.Fragment key={domain.id}>
          {/* LEVEL 1: BIDANG */}
          <tr className="bg-[#E5E7EB] border-b border-slate-300 font-bold text-slate-900 transition-colors">
            <td className="py-2 px-3 text-center border-r border-slate-300 font-mono text-[11px] text-indigo-800">
              {domain.code}
            </td>
            <td colSpan={6} className="py-2 px-3">
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => toggleDomain(domKey, domain)}
                  className="flex items-center gap-1.5 text-left group focus:outline-none flex-1 min-w-0"
                >
                  <span className="p-0.5 rounded bg-slate-300 group-hover:bg-indigo-600 group-hover:text-white transition-colors shrink-0">
                    {isDomExpanded ? (
                      <ChevronDown className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5" />
                    )}
                  </span>
                  <span className="text-xs uppercase tracking-wider font-extrabold text-slate-900 group-hover:text-indigo-700 transition-colors truncate">
                    BIDANG: {domain.name}
                  </span>
                  <span className="ml-1.5 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-300 text-slate-700 leading-tight shrink-0">
                    {domain.totalPrograms} Program Kerja / {domain.subdomainList.length} Sub-Bidang
                  </span>
                </button>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenEditDomainModal(domain);
                    }}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/90 hover:bg-white text-slate-700 hover:text-indigo-700 text-[10.5px] font-bold transition border border-slate-300 shadow-2xs select-none cursor-pointer"
                    title={`Edit Nama / Urutan Bidang ${domain.name} (Berlaku untuk seluruh TA)`}
                  >
                    <Pencil className="w-3 h-3 text-amber-600" />
                    <span>Edit Bidang</span>
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenAddSubdomainModal(domain);
                    }}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-[10.5px] font-bold transition shadow-xs select-none cursor-pointer"
                    title={`Tambah Sub-Bidang baru di Bidang ${domain.name}`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Tambah Sub-Bidang</span>
                  </button>
                </div>
              </div>
            </td>
          </tr>

          {/* LEVEL 2: SUB-BIDANG */}
          {isDomExpanded &&
            domain.subdomainList.map((sub) => {
              const subKey = `sub_${domain.id}_${sub.id}`;
              const isSubExpanded = isFilteringActive ? true : Boolean(expandedSubdomains[subKey]);

              return (
                <React.Fragment key={sub.id}>
                  <tr className="bg-[#FEF3C7] border-b border-amber-200/80 font-semibold text-amber-950 transition-colors">
                    <td className="py-2 px-3 text-center border-r border-amber-200/80 font-mono text-[11px] text-amber-800">
                      {sub.code}
                    </td>
                    <td colSpan={6} className="py-2 px-3 pl-7">
                      <div className="flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => toggleSubdomain(subKey, sub)}
                          className="flex items-center gap-1.5 text-left group focus:outline-none"
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
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenEditSubdomainModal(domain, sub);
                            }}
                            className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-white/90 hover:bg-white text-amber-900 hover:text-amber-700 text-[10.5px] font-bold transition border border-amber-300 shadow-2xs cursor-pointer"
                            title={`Edit Nama / Urutan Sub-Bidang ${sub.name} (Berlaku untuk seluruh TA)`}
                          >
                            <Pencil className="w-3 h-3 text-amber-700" />
                            <span>Edit Sub-Bidang</span>
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenAddProgramModal({
                                domainId: domain.id,
                                subdomainId: sub.id,
                                domainName: domain.name,
                                subdomainName: sub.name,
                              });
                            }}
                            className="flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[10.5px] font-bold transition shadow-xs cursor-pointer"
                            title={`Tambah Program ke RKT pada Sub-Bidang ${sub.name}`}
                          >
                            <Plus className="w-3 h-3" />
                            <span>Tambah Program</span>
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>

                  {/* LEVEL 3: PROGRAM ROW & LEVEL 4: TASKS / ACTIVITIES */}
                  {isSubExpanded &&
                    sub.programs.map((prog) => {
                      const isProgExpanded = isFilteringActive ? true : Boolean(expandedPrograms[prog.program_id]);
                      const actCount = prog.activities?.length || 0;
                      const commMembersCount = prog.committee?.members?.length || 0;
                      const isCommDisahkan = prog.committee?.status === 'disahkan';

                      return (
                        <React.Fragment key={prog.program_id}>
                          {/* BARIS PROGRAM (SEJAJAR / LEBIH KE DALAM DARI SUB-BIDANG, TEKS SATU BARIS) */}
                          <tr className="bg-slate-50/80 hover:bg-indigo-50/70 border-b border-slate-200 font-medium transition-colors">
                            {/* Kode Program */}
                            <td className="py-2 px-3 text-center border-r border-slate-200 font-mono text-[11px] font-bold text-indigo-700 align-middle">
                              {highlightMatch(prog.program_code, searchQuery)}
                            </td>

                            {/* Nama Program (Satu Baris, Indentasi Sejajar / Masuk dari Sub-Bidang) */}
                            <td className="py-2 px-3 pl-8 sm:pl-9 border-r border-slate-200 align-middle">
                              <div className="flex items-center gap-2 flex-wrap">
                                <button
                                  type="button"
                                  onClick={() => toggleProgram(prog.program_id)}
                                  className="p-1 rounded bg-slate-200 hover:bg-slate-300 text-slate-700 transition shrink-0 cursor-pointer"
                                  title={isProgExpanded ? 'Sembunyikan rincian tugas' : 'Tampilkan rincian tugas'}
                                >
                                  {isProgExpanded ? (
                                    <ChevronDown className="w-3.5 h-3.5" />
                                  ) : (
                                    <ChevronRight className="w-3.5 h-3.5" />
                                  )}
                                </button>
                                <span className="text-xs font-bold text-slate-900 leading-snug">
                                  {highlightMatch(prog.program_name, searchQuery)}
                                </span>
                                {prog.is_flagship === 1 && (
                                  <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-amber-100 text-amber-800 border border-amber-300 shrink-0">
                                    ⭐ Unggulan
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* Kategori Program */}
                            <td className="py-2.5 px-3 text-center border-r border-slate-200 align-middle">
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
                            <td className="py-2.5 px-3 text-center border-r border-slate-200 align-middle text-xs font-bold text-slate-700 font-mono">
                              TA {academicYear}
                            </td>

                            {/* Kepanitiaan (Pop up trigger button) */}
                            <td className="py-2.5 px-3 text-center border-r border-slate-200 align-middle">
                              <button
                                type="button"
                                onClick={() => handleOpenCommitteeModal(prog)}
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition shadow-xs ${
                                  commMembersCount > 0
                                    ? isCommDisahkan
                                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 hover:bg-emerald-200'
                                      : 'bg-indigo-100 text-indigo-800 border border-indigo-300 hover:bg-indigo-200'
                                    : 'bg-slate-100 text-slate-600 border border-slate-300 hover:bg-slate-200'
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
                            <td className="py-2.5 px-3 border-r border-slate-200 align-middle">
                              <div className="space-y-1">
                                <div className="flex items-center justify-between text-[10px]">
                                  <span className="font-semibold text-slate-600">
                                    {prog.stats?.completed_activities || 0}/{actCount} Tugas
                                  </span>
                                  <span className="font-bold text-indigo-700">
                                    {prog.stats?.avg_progress_percent || 0}%
                                  </span>
                                </div>
                                <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                                  <div
                                    className="bg-indigo-600 h-full rounded-full transition-all duration-300"
                                    style={{ width: `${prog.stats?.avg_progress_percent || 0}%` }}
                                  />
                                </div>
                              </div>
                            </td>

                            {/* Aksi Tambah Tugas & Kelola Program */}
                            <td className="py-2.5 px-3 text-center align-middle whitespace-nowrap">
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleOpenAddActivity(prog)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold transition shadow-xs"
                                  title="Tambah baris langkah tugas kegiatan baru pada program ini"
                                >
                                  <Plus className="w-3 h-3" />
                                  <span>Tugas</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditProgramModal(prog)}
                                  className="p-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 transition shadow-2xs"
                                  title="Edit Program Kerja (Otomatis sinkron ke RIPS & RKT)"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleOpenMoveProgramModal(prog)}
                                  className="p-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition shadow-2xs"
                                  title="Pindahkan program ke Sub-Bidang lainnya"
                                >
                                  <FolderInput className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveProgramFromRkt(prog)}
                                  className="p-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 transition shadow-2xs"
                                  title="Keluarkan program ini dari RKT tahun ajaran ini"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>

                          {/* LEVEL 4: DAFTAR BARIS LANGKAH KEGIATAN / TUGAS OPERASIONAL */}
                          {isProgExpanded && (
                            <>
                              {actCount === 0 ? (
                                <tr className="bg-white border-b border-slate-200">
                                  <td className="py-2 px-3 text-center border-r border-slate-200 text-slate-400 font-mono text-[10px]">
                                    -
                                  </td>
                                  <td colSpan={5} className="py-2 px-8 text-xs text-slate-400 italic">
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
                                      className="bg-white hover:bg-amber-50/40 border-b border-slate-100 text-slate-800 transition-colors"
                                    >
                                      {/* Penomoran Sub-Tugas */}
                                      <td className="py-2 px-3 text-center border-r border-slate-200 font-mono text-[10.5px] text-slate-500 align-middle">
                                        {prog.program_code}.{actIdx + 1}
                                      </td>

                                      {/* Judul Langkah Tugas & Catatan */}
                                      <td className="py-2 px-3 pl-12 sm:pl-14 border-r border-slate-200 align-middle">
                                        <div className="flex items-center gap-2">
                                          <CheckSquare className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                                          <span className="text-xs font-semibold text-slate-900 leading-snug">
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
                                          <p className="text-[10.5px] text-slate-500 mt-0.5 pl-5">
                                            {highlightMatch(act.notes, searchQuery)}
                                          </p>
                                        )}
                                      </td>

                                      {/* Tag / Tipe Tugas */}
                                      <td className="py-2 px-3 text-center border-r border-slate-200 align-middle">
                                        <span
                                          className={`inline-flex items-center px-2 py-0.5 rounded text-[9.5px] font-bold border uppercase ${getTagBadge(
                                            act.tag
                                          )}`}
                                        >
                                          {act.tag.replace('_', ' ')}
                                        </span>
                                      </td>

                                      {/* Jadwal Tanggal (Single Day / Rentang Waktu) */}
                                      <td className="py-2 px-3 text-center border-r border-slate-200 align-middle text-[11px] text-slate-600">
                                        {(() => {
                                          const sDate = act.start_date || act.activity_date;
                                          const eDate = act.end_date || sDate;

                                          if (!sDate && !eDate) {
                                            return <span className="text-slate-400 text-[11px]">-</span>;
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
                                      <td className="py-2 px-3 text-center border-r border-slate-200 align-middle text-xs text-slate-700">
                                        {(() => {
                                          let empIds = [];
                                          if (Array.isArray(act.assignee_employee_ids) && act.assignee_employee_ids.length > 0) {
                                            empIds = act.assignee_employee_ids;
                                          } else if (act.assignee_employee_id) {
                                            empIds = [act.assignee_employee_id];
                                          }

                                          if (empIds.length === 0) {
                                            return <span className="text-slate-400 text-[11px]">-</span>;
                                          }

                                          const matchedEmps = empIds
                                            .map((id) => employees.find((e) => e.id === Number(id)))
                                            .filter(Boolean);

                                          if (matchedEmps.length === 0) {
                                            return <span className="text-slate-400 text-[11px]">-</span>;
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
                                      <td className="py-2 px-3 border-r border-slate-200 align-middle">
                                        <div className="space-y-1">
                                          <div className="flex items-center justify-between text-[10px]">
                                            <span className="capitalize font-semibold text-slate-600">
                                              {act.status.replace('_', ' ')}
                                            </span>
                                            <span className="font-bold text-emerald-600">
                                              {act.progress_percent}%
                                            </span>
                                          </div>
                                          <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
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
                                          className="p-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
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
    <div className="space-y-6 pb-40 pt-2">
      {/* Top Header Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl relative overflow-visible">
        <div className="absolute inset-0 rounded-xl overflow-hidden pointer-events-none">
          <div className="absolute -right-10 -bottom-10 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        </div>

        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 relative z-40">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-lg shadow-indigo-950/60 border border-indigo-400/30">
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
          <div className="flex flex-wrap items-center gap-3 self-start lg:self-auto relative z-50">
            {/* Context Switcher: Yayasan vs Satuan */}
            <div className="flex items-center gap-1 bg-slate-950/80 p-1 rounded-xl border border-slate-800">
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
              <SearchableSelect
                value={selectedUnitId}
                onChange={(val) => setSelectedUnitId(Number(val))}
                className="w-56"
                options={schoolUnits?.map((u) => ({
                  value: u.id,
                  label: `${u.name} (${u.level})`,
                })) || []}
              />
            )}

            {/* Live-Search Academic Year Dropdown */}
            <AcademicYearDropdown
              value={academicYear}
              onChange={setAcademicYear}
              academicYears={academicYearsList}
            />

            {/* Reload Data Button */}
            <button
              type="button"
              onClick={fetchData}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold rounded-xl shadow-xs transition disabled:opacity-60"
              title="Muat ulang seluruh data RKT dari database"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-indigo-400' : 'text-slate-400'}`} />
              <span>{loading ? 'Memuat...' : 'Muat Ulang'}</span>
            </button>

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
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-600 hover:from-emerald-500 hover:to-emerald-500 text-white text-xs font-bold transition shadow-lg shadow-emerald-950/40"
              >
                <Send className="w-3.5 h-3.5" />
                Terbitkan RKT Ini
              </button>
            )}
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="mt-4 pt-3 border-t border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-3 text-xs relative z-20">
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Filter Domain */}
            <SearchableSelect
              value={filterDomain}
              onChange={(val) => {
                setFilterDomain(val || 'all');
                setFilterSubdomain('all');
              }}
              className="w-52"
              placeholder="Semua Bidang"
              options={[
                { value: 'all', label: `Semua Bidang (${domainsData?.length || 0})`, sublabel: 'Tampilkan seluruh bidang' },
                ...(domainsData?.map((d) => ({
                  value: String(d.id),
                  label: d.name,
                  sublabel: `Kode: ${d.code || `BID-${d.order_index || d.id}`}`,
                  badge: d.code || `BID-${d.order_index || d.id}`
                })) || []),
              ]}
            />

            {/* Filter Sub-Bidang */}
            <SearchableSelect
              value={filterSubdomain}
              onChange={(val) => setFilterSubdomain(val || 'all')}
              className="w-56"
              placeholder="Semua Sub-Bidang"
              options={[
                {
                  value: 'all',
                  label: `Semua Sub-Bidang (${availableSubdomains.length})`,
                  sublabel: filterDomain === 'all' ? 'Seluruh sub-bidang yayasan' : 'Semua sub-bidang pada bidang ini'
                },
                ...availableSubdomains.map((s) => ({
                  value: String(s.id),
                  label: s.name,
                  sublabel: s.domainName ? `Bidang: ${s.domainName}` : `Sub-Bidang ${s.code || ''}`,
                  badge: s.code || undefined
                }))
              ]}
            />

            {/* Filter Kategori (jika ada) */}
            {programCategories.length > 0 && (
              <SearchableSelect
                value={filterCategory}
                onChange={(val) => setFilterCategory(val)}
                className="w-48"
                options={[
                  { value: 'all', label: `Semua Kategori (${programCategories.length})` },
                  ...programCategories.map((cat) => ({
                    value: cat.name,
                    label: cat.name,
                  })),
                ]}
              />
            )}

            {/* Filter Status Progres */}
            <SearchableSelect
              value={filterStatus}
              onChange={(val) => setFilterStatus(val)}
              className="w-48"
              options={[
                { value: 'all', label: 'Semua Status' },
                { value: 'not_started', label: 'Belum Mulai (0%)' },
                { value: 'in_progress', label: 'Sedang Berjalan (1-99%)' },
                { value: 'completed', label: 'Selesai (100%)' },
              ]}
            />

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
            <div className="relative flex items-center group flex-1 sm:flex-initial">
              <Search className="w-3.5 h-3.5 text-indigo-400 group-focus-within:text-indigo-300 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none transition-colors duration-200 z-10" />
              <input
                type="text"
                placeholder="Cari kode, nama, deskripsi, tugas, panitia..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-slate-950/90 hover:bg-slate-950 focus:bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 rounded-xl pl-9 pr-8 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:placeholder-slate-400 outline-none w-full sm:w-72 transition-all duration-200 font-medium shadow-inner"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 p-0.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-all z-10"
                  title="Hapus kata kunci pencarian"
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
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
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
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
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
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl space-y-4">
          {/* Header Utama Tabel: Biru Solid (#3B82F6) seperti di RIPS */}
          <div className="bg-[#3B82F6] px-5 py-3.5 flex flex-col xl:flex-row xl:items-center justify-between gap-3 text-white shrink-0 shadow-md rounded-xl relative z-50">
            {/* Sisi Kiri: Ikon & Judul Tabel */}
            <div className="flex items-center gap-3 shrink-0">
              <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center font-bold shadow-xs">
                <FolderOpen className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm sm:text-base tracking-wider uppercase">
                  MATRIKS OPERASIONAL PROGRAM KERJA TAHUNAN ({academicYear})
                </h3>
                <p className="text-[11px] text-indigo-100 font-medium">
                  {currentLevelLabel} &bull; Menampilkan {totalFilteredPrograms} dari {programs.length} Program Operasional &amp; Tugas
                </p>
              </div>
            </div>

            {/* Sisi Kanan: Filter Bidang, Filter Sub-Bidang, Filter Status, Search, Tambah Program, Cetak, Layar Penuh */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              {/* Filter Bidang dengan Live Search & High Visibility */}
              <SearchableSelect
                value={filterDomain}
                onChange={(val) => {
                  setFilterDomain(val || 'all');
                  setFilterSubdomain('all');
                }}
                placeholder="Semua Bidang"
                searchPlaceholder="Cari bidang..."
                variant="header-white"
                accentColor="blue"
                className="w-40 sm:w-48"
                menuMinWidth="240px"
                options={[
                  { value: 'all', label: `Semua Bidang (${domainsData?.length || 0})`, sublabel: 'Tampilkan seluruh bidang' },
                  ...(domainsData?.map((d) => ({
                    value: String(d.id),
                    label: d.name,
                    sublabel: `Kode: ${d.code || `BID-${d.order_index || d.id}`}`,
                    badge: d.code || `BID-${d.order_index || d.id}`
                  })) || [])
                ]}
              />

              {/* Filter Sub-Bidang dengan Live Search & High Visibility */}
              <SearchableSelect
                value={filterSubdomain}
                onChange={(val) => setFilterSubdomain(val || 'all')}
                placeholder="Semua Sub-Bidang"
                searchPlaceholder="Cari sub-bidang..."
                variant="header-white"
                accentColor="blue"
                className="w-44 sm:w-52"
                menuMinWidth="240px"
                options={[
                  {
                    value: 'all',
                    label: `Semua Sub-Bidang (${availableSubdomains.length})`,
                    sublabel: filterDomain === 'all' ? 'Seluruh sub-bidang yayasan' : 'Semua sub-bidang pada bidang ini'
                  },
                  ...availableSubdomains.map((s) => ({
                    value: String(s.id),
                    label: s.name,
                    sublabel: s.domainName ? `Bidang: ${s.domainName}` : `Sub-Bidang ${s.code || ''}`,
                    badge: s.code || undefined
                  }))
                ]}
              />

              {/* Filter Status */}
              <SearchableSelect
                value={filterStatus}
                onChange={(val) => setFilterStatus(val || 'all')}
                placeholder="Semua Status"
                variant="header-white"
                accentColor="blue"
                className="w-36 sm:w-40"
                menuMinWidth="180px"
                options={[
                  { value: 'all', label: 'Semua Status' },
                  { value: 'not_started', label: 'Belum Mulai' },
                  { value: 'in_progress', label: 'Sedang Berjalan' },
                  { value: 'completed', label: 'Selesai' },
                ]}
              />

              {/* Search Box */}
              <div className="relative flex items-center group">
                <Search className="w-3.5 h-3.5 text-indigo-200 group-focus-within:text-indigo-600 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none transition-colors duration-200 z-10" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari program / tugas..."
                  className="bg-white/15 hover:bg-white/25 focus:bg-white text-white focus:text-slate-800 placeholder-blue-100/70 focus:placeholder-slate-400 text-xs rounded-xl pl-9 pr-8 py-1.5 outline-none transition-all duration-200 border border-white/25 focus:border-white focus:ring-2 focus:ring-white/40 w-40 sm:w-56 font-medium shadow-inner focus:shadow-md"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 p-1 rounded-full text-indigo-200 hover:text-white focus:text-slate-700 hover:bg-white/20 transition-all z-10"
                    title="Hapus kata kunci pencarian"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Tambah Program */}
              <button
                type="button"
                onClick={handleOpenAddProgramModal}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-bold transition shadow-xs select-none"
                title="Tambah Program Baru atau Pilih dari RIPS ke RKT Ini"
              >
                <Plus className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Tambah Program</span>
              </button>

              {/* Kontrol Lipat / Buka Hirarki */}
              <div className="flex items-center gap-1 bg-white/15 p-1 rounded-xl border border-white/20">
                <button
                  type="button"
                  onClick={handleCollapseAll}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/25 text-white text-[11px] font-bold transition shadow-2xs select-none"
                  title="Lipat Semua (Bidang, Sub-Bidang, & Program)"
                >
                  <ChevronUp className="w-3.5 h-3.5" />
                  <span>Lipat Semua</span>
                </button>
                <button
                  type="button"
                  onClick={handleExpandDomainsOnly}
                  className="hidden lg:flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-white/20 text-white text-[11px] font-medium transition select-none"
                  title="Buka Level Bidang Saja"
                >
                  <span>Bidang</span>
                </button>
                <button
                  type="button"
                  onClick={handleExpandSubdomains}
                  className="hidden lg:flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-white/20 text-white text-[11px] font-medium transition select-none"
                  title="Buka Level Bidang & Sub-Bidang"
                >
                  <span>Sub-Bidang</span>
                </button>
                <button
                  type="button"
                  onClick={handleExpandAll}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/20 hover:bg-white/30 text-white text-[11px] font-bold transition shadow-2xs select-none"
                  title="Buka Semua Rincian (Bidang, Sub-Bidang, & Program)"
                >
                  <ChevronDown className="w-3.5 h-3.5" />
                  <span>Buka Semua</span>
                </button>
              </div>

              <button
                type="button"
                onClick={fetchData}
                disabled={loading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-bold transition border border-white/30 shadow-xs select-none disabled:opacity-60"
                title="Muat ulang tabel RKT dari database"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Muat Ulang</span>
              </button>

              <button
                type="button"
                onClick={handlePrint}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-bold transition border border-white/30 shadow-xs select-none"
                title="Cetak Dokumen RKT"
              >
                <Printer className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Cetak</span>
              </button>

              <button
                type="button"
                onClick={() => setIsFullscreen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-bold transition border border-white/30 shadow-xs select-none"
                title="Tampilkan Matriks RKT dalam Mode Layar Penuh (Fullscreen)"
              >
                <Maximize2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Layar Penuh</span>
              </button>
            </div>
          </div>

          {/* Banner Hasil Pencarian / Filter Aktif */}
          {isFilteringActive && (
            <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-indigo-950/60 border border-indigo-500/30 text-xs text-indigo-200 animate-fadeIn">
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
            <div className="p-12 text-center space-y-3 bg-slate-950/60 rounded-xl border border-slate-800">
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
            <div className="overflow-x-auto rounded-xl border border-slate-300 bg-white shadow-sm min-h-[160px]">
              <table className="w-full text-left border-collapse min-w-[950px]">
                <thead>
                  <tr className="bg-[#F3F4F6] text-slate-800 uppercase text-[11px] font-bold tracking-wider border-b border-[#D1D5DB]">
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
                <tfoot>
                  <tr className="bg-[#F9FAFB] text-slate-600 text-[11px] font-semibold border-t-2 border-slate-300">
                    <td colSpan={7} className="py-3 px-4 text-center">
                      <span className="inline-flex items-center gap-2">
                        <span>Menampilkan</span>
                        <strong className="text-indigo-700">{totalFilteredPrograms}</strong>
                        <span>dari</span>
                        <strong className="text-slate-800">{programs.length}</strong>
                        <span>Program Kerja Terjadwal ({academicYear})</span>
                      </span>
                    </td>
                  </tr>
                </tfoot>
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
              className="bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden"
            >
              {/* Header Fullscreen */}
              <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 px-6 py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 text-white shrink-0 shadow-md relative z-50">
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
                    <p className="text-[11px] text-indigo-100 font-medium">
                      {currentLevelLabel} &bull; Rincian langkah operasional, susunan panitia SK &amp; progres tugas
                    </p>
                  </div>
                </div>

                {/* Quick Filters & Controls in Fullscreen */}
                <div className="flex flex-wrap items-center gap-2">
                  {/* Filter Domain in Fullscreen */}
                  <SearchableSelect
                    value={filterDomain}
                    onChange={(val) => {
                      setFilterDomain(val || 'all');
                      setFilterSubdomain('all');
                    }}
                    className="w-52"
                    placeholder="Semua Bidang"
                    options={[
                      { value: 'all', label: `Semua Bidang (${domainsData?.length || 0})`, sublabel: 'Tampilkan seluruh bidang' },
                      ...(domainsData?.map((d) => ({
                        value: String(d.id),
                        label: d.name,
                        sublabel: `Kode: ${d.code || `BID-${d.order_index || d.id}`}`,
                        badge: d.code || `BID-${d.order_index || d.id}`
                      })) || []),
                    ]}
                  />

                  {/* Filter Sub-Bidang in Fullscreen */}
                  <SearchableSelect
                    value={filterSubdomain}
                    onChange={(val) => setFilterSubdomain(val || 'all')}
                    className="w-56"
                    placeholder="Semua Sub-Bidang"
                    options={[
                      {
                        value: 'all',
                        label: `Semua Sub-Bidang (${availableSubdomains.length})`,
                        sublabel: filterDomain === 'all' ? 'Seluruh sub-bidang yayasan' : 'Semua sub-bidang pada bidang ini'
                      },
                      ...availableSubdomains.map((s) => ({
                        value: String(s.id),
                        label: s.name,
                        sublabel: s.domainName ? `Bidang: ${s.domainName}` : `Sub-Bidang ${s.code || ''}`,
                        badge: s.code || undefined
                      }))
                    ]}
                  />

                  {/* Filter Status in Fullscreen */}
                  <SearchableSelect
                    value={filterStatus}
                    onChange={(val) => setFilterStatus(val)}
                    className="w-44"
                    options={[
                      { value: 'all', label: 'Semua Status' },
                      { value: 'not_started', label: 'Belum Mulai' },
                      { value: 'in_progress', label: 'Sedang Berjalan' },
                      { value: 'completed', label: 'Selesai' },
                    ]}
                  />

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
                  <div className="relative flex items-center group">
                    <Search className="w-3.5 h-3.5 text-indigo-200 group-focus-within:text-indigo-600 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none transition-colors duration-200 z-10" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Cari program / tugas / PIC..."
                      className="bg-white/15 hover:bg-white/25 focus:bg-white text-white focus:text-slate-800 placeholder-blue-100/70 focus:placeholder-slate-400 text-xs rounded-xl pl-9 pr-8 py-1.5 outline-none transition-all duration-200 border border-white/25 focus:border-white focus:ring-2 focus:ring-white/40 w-40 sm:w-56 font-medium shadow-inner focus:shadow-md"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery('')}
                        className="absolute right-2 p-1 rounded-full text-indigo-200 hover:text-white focus:text-slate-700 hover:bg-white/20 transition-all z-10"
                        title="Hapus kata kunci pencarian"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>

                  {/* Tambah Program Button in Fullscreen */}
                  <button
                    type="button"
                    onClick={handleOpenAddProgramModal}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-extrabold transition shadow-md select-none whitespace-nowrap"
                    title="Tambah Program Baru atau Pilih dari RIPS ke RKT Ini"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Tambah Program</span>
                  </button>

                  {/* Kontrol Lipat / Buka Hirarki in Fullscreen */}
                  <div className="flex items-center gap-1 bg-white/10 p-0.5 rounded-xl border border-white/20">
                    <button
                      type="button"
                      onClick={handleCollapseAll}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold text-white hover:bg-white/20 transition"
                      title="Lipat Semua (Bidang, Sub-Bidang, & Program)"
                    >
                      <ChevronUp className="w-3 h-3" />
                      <span>Lipat Semua</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleExpandDomainsOnly}
                      className="hidden sm:inline px-2 py-1 rounded-lg text-[11px] font-medium text-white hover:bg-white/20 transition"
                      title="Buka Level Bidang Saja"
                    >
                      Bidang
                    </button>
                    <button
                      type="button"
                      onClick={handleExpandSubdomains}
                      className="hidden sm:inline px-2 py-1 rounded-lg text-[11px] font-medium text-white hover:bg-white/20 transition"
                      title="Buka Level Bidang & Sub-Bidang"
                    >
                      Sub-Bidang
                    </button>
                    <button
                      type="button"
                      onClick={handleExpandAll}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold text-white bg-white/20 hover:bg-white/30 transition shadow-2xs"
                      title="Buka Semua Rincian (Bidang, Sub-Bidang, & Program)"
                    >
                      <ChevronDown className="w-3 h-3" />
                      <span>Buka Semua</span>
                    </button>
                  </div>

                  {/* Reload Data Button in Fullscreen */}
                  <button
                    type="button"
                    onClick={fetchData}
                    disabled={loading}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-bold transition border border-white/30 shadow-xs select-none disabled:opacity-60"
                    title="Muat ulang tabel RKT dari database"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                    <span className="hidden sm:inline">Muat Ulang</span>
                  </button>

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
                  <div className="p-12 text-center space-y-3 bg-slate-50 m-6 rounded-xl border border-slate-200">
                    <Sparkles className="w-12 h-12 text-slate-400 mx-auto" />
                    <h4 className="text-sm font-bold text-slate-800">
                      {isFilteringActive ? 'Tidak Ada Program yang Cocok' : 'Tidak Ada Program yang Dijadwalkan'}
                    </h4>
                    <p className="text-xs text-slate-500 max-w-md mx-auto">
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
                    <thead className="sticky top-0 z-10 shadow-xs bg-[#F3F4F6] text-slate-800 uppercase text-[11px] font-bold tracking-wider border-b border-[#D1D5DB]">
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
                    <tfoot>
                      <tr className="bg-[#F9FAFB] text-slate-600 text-[11px] font-semibold border-t-2 border-slate-300">
                        <td colSpan={7} className="py-3 px-4 text-center">
                          <span className="inline-flex items-center gap-2">
                            <span>Menampilkan</span>
                            <strong className="text-indigo-700">{totalFilteredPrograms}</strong>
                            <span>dari</span>
                            <strong className="text-slate-800">{programs.length}</strong>
                            <span>Program Kerja Terjadwal ({academicYear})</span>
                          </span>
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                )}
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* TAB 2: PUBLICATIONS */}
      {mainTab === 'publications' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl space-y-4">
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
                <div key={pub.id} className="p-5 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
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
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-2xl space-y-5 max-h-[90vh] flex flex-col">
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
                <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between">
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
                <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-950 border border-slate-800">
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
                  <div className="py-8 text-center text-slate-500 bg-slate-950/60 rounded-xl border border-slate-800">
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
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl space-y-6">
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
                    className="p-5 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition flex flex-col md:flex-row md:items-center justify-between gap-4"
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
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-2xl space-y-5">
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
              <div className="space-y-2 p-3 bg-slate-950/70 border border-slate-800 rounded-xl">
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
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-2xl space-y-5">
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
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                Sahkan SK Kepanitiaan Program
              </h3>
              <button onClick={() => setModalType(null)} className="text-slate-400 hover:text-white font-bold">✕</button>
            </div>

            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200">
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
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Send className="w-5 h-5 text-emerald-400" />
                Terbitkan Dokumen Resmi RKT (Versi {annualWorkPlan?.current_version || 1})
              </h3>
              <button onClick={() => setModalType(null)} className="text-slate-400 hover:text-white font-bold">✕</button>
            </div>

            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300">
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
          <div className="w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-2xl space-y-5 max-h-[90vh] flex flex-col">
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
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
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

      {/* MODAL 6: TAMBAH PROGRAM KE RKT (PILIH DARI RIPS / BUAT BARU) */}
      {isAddProgramModalOpen && (
        <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 shrink-0">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                  Tambah Program ke RKT (TA {academicYear})
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Pilih program yang sudah terdaftar di RIPS atau buat program baru yang otomatis tersinkron ke RIPS &amp; RKT.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddProgramModalOpen(false)}
                className="text-slate-400 hover:text-white font-bold p-1 rounded-lg hover:bg-slate-800 transition"
              >
                ✕
              </button>
            </div>

            {/* Mode Switcher Tabs */}
            <div className="flex items-center gap-2 p-1 rounded-xl bg-slate-950 border border-slate-800 shrink-0">
              <button
                type="button"
                onClick={() => setAddProgramTab('existing')}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                  addProgramTab === 'existing'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                Pilih Program dari RIPS ({availableRipsPrograms.length} Tersedia)
              </button>
              <button
                type="button"
                onClick={() => setAddProgramTab('new')}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                  addProgramTab === 'new'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Plus className="w-3.5 h-3.5" />
                Buat Program Baru di RIPS &amp; RKT
              </button>
            </div>

            {/* Target Context Banner */}
            {targetAddContext && (
              <div className="p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-[11px] flex items-center justify-between gap-2 shrink-0">
                <div className="flex items-center gap-2 min-w-0">
                  <Sparkles className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
                  <span className="truncate">
                    Target Penempatan: <strong>{targetAddContext.domainName}</strong> › <strong>{targetAddContext.subdomainName}</strong>
                  </span>
                </div>
                <span className="px-1.5 py-0.5 rounded text-[9.5px] font-bold bg-emerald-900/60 text-emerald-200 border border-emerald-700/50 shrink-0">
                  Terpilih Otomatis
                </span>
              </div>
            )}

            {/* TAB 1: PILIH DARI PROGRAM RIPS */}
            {addProgramTab === 'existing' && (
              <form onSubmit={handleAddExistingProgramToRkt} className="space-y-4 overflow-y-auto pr-1 flex-1 text-xs">
                {/* Live Search Program Dropdown */}
                <div className="space-y-1.5" ref={existingDropdownRef}>
                  <label className="block font-semibold text-slate-200 text-xs">
                    Pilih Program RIPS <span className="text-rose-400">*</span>
                  </label>

                  {selectedRipsProg ? (
                    <div className="p-3.5 rounded-xl bg-indigo-950/40 border border-indigo-500/40 flex items-start justify-between gap-3 animate-fadeIn">
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-indigo-950 text-indigo-400 border border-indigo-800">
                            {selectedRipsProg.code}
                          </span>
                          <span className="font-bold text-white text-xs">{selectedRipsProg.name}</span>
                          {selectedRipsProg.is_flagship === 1 && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-950/60 text-amber-300 border border-amber-800/60">
                              ⭐ Unggulan
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-300">
                          {selectedRipsProg.domain_name || 'Bidang'} {selectedRipsProg.subdomain_name ? `> ${selectedRipsProg.subdomain_name}` : ''}
                        </p>
                        {selectedRipsProg.description && (
                          <p className="text-[10.5px] text-slate-400 line-clamp-2 italic">
                            {selectedRipsProg.description}
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedRipsProg(null);
                          setIsExistingDropdownOpen(true);
                        }}
                        className="text-[10px] text-indigo-300 hover:text-white font-semibold px-2.5 py-1 rounded-xl bg-indigo-900/60 border border-indigo-700/60 transition shrink-0"
                      >
                        Ganti Program
                      </button>
                    </div>
                  ) : (
                    <div className="relative">
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 text-indigo-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                          type="text"
                          value={existingProgSearch}
                          onChange={(e) => {
                            setExistingProgSearch(e.target.value);
                            setIsExistingDropdownOpen(true);
                          }}
                          onFocus={() => setIsExistingDropdownOpen(true)}
                          placeholder="Ketik kode, nama program, bidang, atau kategori..."
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-8 py-2 text-xs text-slate-200 outline-none focus:border-indigo-500 font-medium"
                        />
                        {existingProgSearch && (
                          <button
                            type="button"
                            onClick={() => setExistingProgSearch('')}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs"
                          >
                            ✕
                          </button>
                        )}
                      </div>

                      {/* Dropdown Menu Hasil Pencarian */}
                      {isExistingDropdownOpen && (
                        <div className="absolute z-30 left-0 right-0 mt-1 max-h-56 overflow-y-auto bg-slate-950 border border-slate-700 rounded-xl shadow-2xl p-1.5 divide-y divide-slate-800 animate-fadeIn">
                          {(() => {
                            const filtered = availableRipsPrograms.filter((p) => {
                              if (!existingProgSearch.trim()) return true;
                              const q = existingProgSearch.toLowerCase();
                              return (
                                p.code?.toLowerCase().includes(q) ||
                                p.name?.toLowerCase().includes(q) ||
                                p.domain_name?.toLowerCase().includes(q) ||
                                p.subdomain_name?.toLowerCase().includes(q) ||
                                p.category_name?.toLowerCase().includes(q)
                              );
                            });

                            if (filtered.length === 0) {
                              return (
                                <div className="p-3.5 text-center text-slate-400 text-xs italic space-y-1">
                                  <p>Tidak ada program RIPS yang cocok atau seluruh program sudah dimasukkan ke RKT TA {academicYear}.</p>
                                  <p className="text-[10px] text-indigo-400 font-normal">
                                    💡 Anda dapat membuat program baru di tab "Buat Program Baru".
                                  </p>
                                </div>
                              );
                            }

                            return filtered.map((p) => (
                              <div
                                key={p.id}
                                onClick={() => {
                                  setSelectedRipsProg(p);
                                  setIsExistingDropdownOpen(false);
                                  setExistingProgSearch('');
                                }}
                                className="p-2.5 rounded-xl flex items-center justify-between gap-3 cursor-pointer hover:bg-slate-850 text-slate-200 hover:text-white transition"
                              >
                                <div className="flex items-start gap-2.5 min-w-0">
                                  <span className="font-mono text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-indigo-950 text-indigo-400 border border-indigo-800 shrink-0">
                                    {p.code}
                                  </span>
                                  <div className="min-w-0">
                                    <p className="text-xs font-semibold leading-tight truncate">{p.name}</p>
                                    <p className="text-[10px] text-slate-400 truncate">
                                      {p.domain_name || 'Bidang'} &bull; {p.category_name || 'Reguler'}
                                    </p>
                                  </div>
                                </div>
                                <div className="shrink-0 flex items-center gap-1">
                                  {p.is_flagship === 1 && (
                                    <span className="text-[9px] font-bold text-amber-400 bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-800/60">
                                      ⭐ Unggulan
                                    </span>
                                  )}
                                  <span className="text-[11px] text-indigo-400 font-bold px-2 py-0.5 rounded bg-indigo-950/40 border border-indigo-800/40">
                                    Pilih
                                  </span>
                                </div>
                              </div>
                            ));
                          })()}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Target & Catatan */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-1">
                    <label className="block font-semibold text-slate-300 mb-1">Target Capaian RKT (%)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={existingTargetPercent}
                      onChange={(e) => setExistingTargetPercent(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none focus:border-indigo-500 font-bold"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block font-semibold text-slate-300 mb-1">Catatan Pelaksanaan (Opsional)</label>
                    <input
                      type="text"
                      value={existingNotes}
                      onChange={(e) => setExistingNotes(e.target.value)}
                      placeholder="Contoh: Fokus semester ganjil / prioritas sarana..."
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none focus:border-indigo-500 font-medium"
                    />
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3 shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsAddProgramModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={formLoading || !selectedRipsProg}
                    className={`px-5 py-2 rounded-xl text-xs font-bold transition shadow-lg ${
                      selectedRipsProg
                        ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-950/50'
                        : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    }`}
                  >
                    {formLoading ? 'Memproses...' : 'Masukkan ke RKT'}
                  </button>
                </div>
              </form>
            )}

            {/* TAB 2: BUAT PROGRAM BARU (LANGSUNG TERSINKRON KE RIPS & RKT) */}
            {addProgramTab === 'new' && (
              <form onSubmit={handleCreateNewProgramInRkt} className="space-y-4 overflow-y-auto pr-1 flex-1 text-xs">
                {/* Penempatan Bidang & Sub-Bidang */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">Bidang Penempatan *</label>
                    <SearchableSelect
                      value={newProgFormData.domain_id || ''}
                      placeholder="-- Pilih Bidang --"
                      onChange={(val) => setNewProgFormData({ ...newProgFormData, domain_id: val ? Number(val) : '', subdomain_id: '' })}
                      options={domainsData.map((d) => ({
                        value: d.id,
                        label: d.name,
                      }))}
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">Sub-Bidang Penempatan *</label>
                    <SearchableSelect
                      value={newProgFormData.subdomain_id || ''}
                      placeholder="-- Pilih Sub-Bidang --"
                      onChange={(val) => setNewProgFormData({ ...newProgFormData, subdomain_id: val ? Number(val) : '' })}
                      options={subdomainsData
                        .filter((s) => !newProgFormData.domain_id || Number(s.domain_id) === Number(newProgFormData.domain_id))
                        .map((s) => ({
                          value: s.id,
                          label: s.name,
                        }))}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">Kode Program *</label>
                    <input
                      type="text"
                      value={newProgFormData.code || ''}
                      onChange={(e) => setNewProgFormData({ ...newProgFormData, code: e.target.value })}
                      required
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none focus:border-indigo-500 font-mono font-bold"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block font-semibold text-slate-300 mb-1">Kategori Program</label>
                    <SearchableSelect
                      value={newProgFormData.category_id || ''}
                      placeholder="-- Pilih Kategori --"
                      onChange={(val) => setNewProgFormData({ ...newProgFormData, category_id: val ? Number(val) : '' })}
                      options={[
                        { value: '', label: '-- Pilih Kategori --' },
                        ...availableRipsCategories.map((c) => ({
                          value: c.id,
                          label: c.name,
                        })),
                      ]}
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Nama Program Kerja *</label>
                  <input
                    type="text"
                    value={newProgFormData.name || ''}
                    onChange={(e) => setNewProgFormData({ ...newProgFormData, name: e.target.value })}
                    required
                    placeholder="Contoh: Pengadaan ATK Bulanan Sekolah..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none focus:border-indigo-500 font-medium"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Deskripsi / Inisiatif Strategis</label>
                  <textarea
                    rows={2}
                    value={newProgFormData.description || ''}
                    onChange={(e) => setNewProgFormData({ ...newProgFormData, description: e.target.value })}
                    placeholder="Deskripsi operasional program kerja..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none focus:border-indigo-500"
                  />
                </div>

                {/* Pilih Sasaran Strategis RIPS Terkait */}
                <div className="space-y-1.5" ref={newProgGoalDropdownRef}>
                  <div className="flex items-center justify-between">
                    <label className="block font-semibold text-indigo-300 text-xs">
                      1. Hubungkan ke Sasaran Strategis RIPS Terkait
                    </label>
                    <span className="text-[10px] text-slate-400">
                      {newProgFormData.linked_goal_ids?.length || 0} Sasaran Terpilih
                    </span>
                  </div>

                  <div className="relative">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-indigo-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="text"
                        value={newProgGoalSearch}
                        onChange={(e) => {
                          setNewProgGoalSearch(e.target.value);
                          setIsNewProgGoalDropdownOpen(true);
                        }}
                        onFocus={() => setIsNewProgGoalDropdownOpen(true)}
                        placeholder="Ketik kode, nama sasaran, atau bidang untuk mencari..."
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-8 py-2 text-xs text-slate-200 outline-none focus:border-indigo-500 font-medium"
                      />
                      {newProgGoalSearch && (
                        <button
                          type="button"
                          onClick={() => setNewProgGoalSearch('')}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs"
                        >
                          ✕
                        </button>
                      )}
                    </div>

                    {/* Dropdown Menu Sasaran */}
                    {isNewProgGoalDropdownOpen && (
                      <div className="absolute z-30 left-0 right-0 mt-1 max-h-52 overflow-y-auto bg-slate-950 border border-slate-700 rounded-xl shadow-2xl p-1.5 divide-y divide-slate-800 animate-fadeIn">
                        {(() => {
                          const filteredGoals = availableRipsGoals.filter((g) => {
                            if (!newProgGoalSearch.trim()) return true;
                            const q = newProgGoalSearch.toLowerCase();
                            return (
                              g.code?.toLowerCase().includes(q) ||
                              g.title?.toLowerCase().includes(q) ||
                              g.domain_name?.toLowerCase().includes(q)
                            );
                          });

                          if (filteredGoals.length === 0) {
                            return (
                              <div className="p-3 text-center text-slate-500 text-xs italic">
                                Tidak ada sasaran strategis yang cocok dengan kata kunci "{newProgGoalSearch}".
                              </div>
                            );
                          }

                          return filteredGoals.map((g) => {
                            const isSelected = newProgFormData.linked_goal_ids?.includes(g.id);
                            return (
                              <div
                                key={g.id}
                                onClick={() => {
                                  const currentGoalIds = newProgFormData.linked_goal_ids || [];
                                  const currentIndIds = newProgFormData.linked_indicator_ids || [];
                                  const goalIndIds = (g.indicators && g.indicators.length > 0
                                    ? g.indicators
                                    : [{ id: `fallback_${g.id}` }]
                                  ).map((i) => i.id);

                                  if (isSelected) {
                                    setNewProgFormData({
                                      ...newProgFormData,
                                      linked_goal_ids: currentGoalIds.filter((id) => id !== g.id),
                                      linked_indicator_ids: currentIndIds.filter((id) => !goalIndIds.includes(id)),
                                    });
                                  } else {
                                    setNewProgFormData({
                                      ...newProgFormData,
                                      linked_goal_ids: [...currentGoalIds, g.id],
                                      linked_indicator_ids: Array.from(new Set([...currentIndIds, ...goalIndIds])),
                                    });
                                  }
                                }}
                                className={`p-2 rounded-xl flex items-center justify-between gap-3 cursor-pointer transition ${
                                  isSelected
                                    ? 'bg-indigo-600/20 border border-indigo-500/40 text-white'
                                    : 'hover:bg-slate-850 text-slate-300 hover:text-white'
                                }`}
                              >
                                <div className="flex items-start gap-2 min-w-0">
                                  <span className="font-mono text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-indigo-950 text-indigo-400 border border-indigo-800 shrink-0">
                                    {g.code}
                                  </span>
                                  <div className="min-w-0">
                                    <p className="text-xs font-semibold leading-tight truncate">{g.title}</p>
                                    <p className="text-[10px] text-slate-400 truncate">
                                      {g.domain_name || 'Bidang'} &bull; {g.indicators?.length || 1} Indikator
                                    </p>
                                  </div>
                                </div>
                                <div className="shrink-0 flex items-center">
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => {}}
                                    className="w-4 h-4 rounded border-slate-700 text-indigo-600 pointer-events-none"
                                  />
                                </div>
                              </div>
                            );
                          });
                        })()}
                      </div>
                    )}
                  </div>
                </div>

                {/* Indikator Checkboxes */}
                {newProgFormData.linked_goal_ids && newProgFormData.linked_goal_ids.length > 0 && (
                  <div className="space-y-2 pt-1 border-t border-slate-800/80">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-bold text-emerald-300">
                        2. Pilih Indikator Kinerja yang Terkait
                      </label>
                      <span className="text-[10px] text-slate-400 shrink-0 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                        {newProgFormData.linked_indicator_ids?.length || 0} Indikator Terpilih
                      </span>
                    </div>

                    <div className="space-y-3 max-h-48 overflow-y-auto pr-1">
                      {newProgFormData.linked_goal_ids.map((goalId) => {
                        const g = availableRipsGoals.find((item) => item.id === goalId);
                        if (!g) return null;
                        const gIndicators = g.indicators && g.indicators.length > 0
                          ? g.indicators
                          : [
                              {
                                id: `fallback_${g.id}`,
                                name: g.indicator_name || g.title,
                                unit: g.indicator_unit || '%',
                                baseline_percent: g.baseline_percent ?? 0,
                                target_percent: g.target_percent ?? 100,
                              }
                            ];

                        const allGoalIndIds = gIndicators.map((i) => i.id);
                        const selectedGoalInds = allGoalIndIds.filter((id) => (newProgFormData.linked_indicator_ids || []).includes(id));
                        const isAllSelected = selectedGoalInds.length === allGoalIndIds.length;

                        return (
                          <div key={g.id} className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                            <div className="flex items-center justify-between pb-1.5 border-b border-slate-850 gap-2">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span className="font-mono text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-indigo-950 text-indigo-400 border border-indigo-800 shrink-0">
                                  {g.code}
                                </span>
                                <span className="text-xs font-bold text-white truncate">{g.title}</span>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const currentInds = newProgFormData.linked_indicator_ids || [];
                                    if (isAllSelected) {
                                      setNewProgFormData({
                                        ...newProgFormData,
                                        linked_indicator_ids: currentInds.filter((id) => !allGoalIndIds.includes(id)),
                                      });
                                    } else {
                                      setNewProgFormData({
                                        ...newProgFormData,
                                        linked_indicator_ids: Array.from(new Set([...currentInds, ...allGoalIndIds])),
                                      });
                                    }
                                  }}
                                  className="text-[10px] text-indigo-300 hover:text-white font-medium px-2 py-0.5 rounded bg-indigo-950/60 border border-indigo-800/60 transition"
                                >
                                  {isAllSelected ? 'Batal Semua' : 'Pilih Semua'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const currentGoals = newProgFormData.linked_goal_ids || [];
                                    const currentInds = newProgFormData.linked_indicator_ids || [];
                                    setNewProgFormData({
                                      ...newProgFormData,
                                      linked_goal_ids: currentGoals.filter((id) => id !== g.id),
                                      linked_indicator_ids: currentInds.filter((id) => !allGoalIndIds.includes(id)),
                                    });
                                  }}
                                  className="text-[10px] text-rose-400 hover:text-rose-300 font-semibold px-2 py-0.5 rounded bg-rose-950/40 border border-rose-900/60 transition"
                                >
                                  ✕ Hapus
                                </button>
                              </div>
                            </div>

                            <div className="space-y-1.5 pl-0.5">
                              {gIndicators.map((ind) => {
                                const isIndChecked = (newProgFormData.linked_indicator_ids || []).includes(ind.id);
                                return (
                                  <div
                                    key={ind.id}
                                    onClick={() => {
                                      const currentInds = newProgFormData.linked_indicator_ids || [];
                                      if (isIndChecked) {
                                        setNewProgFormData({
                                          ...newProgFormData,
                                          linked_indicator_ids: currentInds.filter((id) => id !== ind.id),
                                        });
                                      } else {
                                        setNewProgFormData({
                                          ...newProgFormData,
                                          linked_indicator_ids: [...currentInds, ind.id],
                                        });
                                      }
                                    }}
                                    className={`flex items-start justify-between gap-2.5 p-2 rounded-xl border text-[11px] cursor-pointer transition select-none ${
                                      isIndChecked
                                        ? 'bg-slate-900/90 border-emerald-500/50 text-slate-100 shadow-xs ring-1 ring-emerald-500/20'
                                        : 'bg-slate-950/50 border-slate-800/80 text-slate-400 hover:bg-slate-900/50 hover:text-slate-300'
                                    }`}
                                  >
                                    <div className="flex items-start gap-2 min-w-0">
                                      <input
                                        type="checkbox"
                                        checked={isIndChecked}
                                        onChange={() => {}}
                                        className="w-3.5 h-3.5 rounded border-slate-700 text-emerald-500 focus:ring-emerald-500 mt-0.5 pointer-events-none shrink-0"
                                      />
                                      <span className={`leading-snug block ${isIndChecked ? 'font-medium text-slate-100' : 'text-slate-400'}`}>
                                        {ind.name}
                                      </span>
                                    </div>
                                    <span className={`font-mono text-[10px] font-bold px-2 py-0.5 rounded border shrink-0 ${
                                      isIndChecked
                                        ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800/80'
                                        : 'bg-slate-900 text-slate-500 border-slate-800'
                                    }`}>
                                      Target: {ind.target_percent}{ind.unit || '%'}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2 pt-2 border-t border-slate-800/80">
                  <input
                    type="checkbox"
                    id="rkt_flagship_cb"
                    checked={newProgFormData.is_flagship === 1 || newProgFormData.is_flagship === true}
                    onChange={(e) => setNewProgFormData({ ...newProgFormData, is_flagship: e.target.checked ? 1 : 0 })}
                    className="rounded border-slate-700 text-amber-500 focus:ring-amber-500"
                  />
                  <label htmlFor="rkt_flagship_cb" className="text-xs text-amber-300 font-medium cursor-pointer">
                    Tandai sebagai Program Unggulan (Flagship Program)
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-800/80">
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">Target Capaian RKT (%)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={newProgFormData.target_percent}
                      onChange={(e) => setNewProgFormData({ ...newProgFormData, target_percent: Number(e.target.value) })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none focus:border-indigo-500 font-bold"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block font-semibold text-slate-300 mb-1">Catatan Pelaksanaan (Opsional)</label>
                    <input
                      type="text"
                      value={newProgFormData.notes || ''}
                      onChange={(e) => setNewProgFormData({ ...newProgFormData, notes: e.target.value })}
                      placeholder="Catatan pelaksanaan tahunan..."
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3 shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsAddProgramModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={formLoading}
                    className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-lg shadow-emerald-950/50"
                  >
                    {formLoading ? 'Menyimpan...' : 'Simpan & Masukkan ke RKT'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* MODAL 8: EDIT PROGRAM KERJA (SYNC OTOMATIS RIPS & RKT) */}
      {isEditProgramModalOpen && editingProgramObj && (
        <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 shrink-0">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Pencil className="w-4 h-4 text-amber-400" />
                  Edit Program Kerja
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Perubahan nama, kategori, bidang, atau sasaran akan otomatis tersinkronisasi ke master RIPS &amp; target RKT.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsEditProgramModalOpen(false);
                  setEditingProgramObj(null);
                }}
                className="text-slate-400 hover:text-white font-bold p-1 rounded-lg hover:bg-slate-800 transition"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEditedProgram} className="space-y-4 overflow-y-auto pr-1 flex-1 text-xs">
              {/* Penempatan Bidang & Sub-Bidang */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Bidang Penempatan *</label>
                  <SearchableSelect
                    value={editProgFormData.domain_id || ''}
                    placeholder="-- Pilih Bidang --"
                    onChange={(val) => setEditProgFormData({ ...editProgFormData, domain_id: val ? Number(val) : '', subdomain_id: '' })}
                    options={domainsData.map((d) => ({
                      value: d.id,
                      label: d.name,
                    }))}
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Sub-Bidang Penempatan *</label>
                  <SearchableSelect
                    value={editProgFormData.subdomain_id || ''}
                    placeholder="-- Pilih Sub-Bidang --"
                    onChange={(val) => setEditProgFormData({ ...editProgFormData, subdomain_id: val ? Number(val) : '' })}
                    options={subdomainsData
                      .filter((s) => !editProgFormData.domain_id || Number(s.domain_id) === Number(editProgFormData.domain_id))
                      .map((s) => ({
                        value: s.id,
                        label: s.name,
                      }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Kode Program *</label>
                  <input
                    type="text"
                    value={editProgFormData.code || ''}
                    onChange={(e) => setEditProgFormData({ ...editProgFormData, code: e.target.value })}
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none focus:border-amber-500 font-mono font-bold"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-300 mb-1">Kategori Program</label>
                  <SearchableSelect
                    value={editProgFormData.category_id || ''}
                    placeholder="-- Pilih Kategori --"
                    onChange={(val) => setEditProgFormData({ ...editProgFormData, category_id: val ? Number(val) : '' })}
                    options={[
                      { value: '', label: '-- Pilih Kategori --' },
                      ...availableRipsCategories.map((c) => ({
                        value: c.id,
                        label: c.name,
                      })),
                    ]}
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Nama Program Kerja *</label>
                <input
                  type="text"
                  value={editProgFormData.name || ''}
                  onChange={(e) => setEditProgFormData({ ...editProgFormData, name: e.target.value })}
                  required
                  placeholder="Contoh: Pengadaan ATK Bulanan Sekolah..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none focus:border-amber-500 font-medium"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Deskripsi / Inisiatif Strategis</label>
                <textarea
                  rows={2}
                  value={editProgFormData.description || ''}
                  onChange={(e) => setEditProgFormData({ ...editProgFormData, description: e.target.value })}
                  placeholder="Deskripsi operasional program kerja..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none focus:border-amber-500"
                />
              </div>

              {/* Hubungkan Sasaran Strategis RIPS */}
              <div className="space-y-2 pt-2 border-t border-slate-800/80">
                <div className="flex items-center justify-between">
                  <label className="block font-semibold text-indigo-300">
                    Keterkaitan Sasaran Strategis RIPS
                  </label>
                  <span className="text-[11px] text-indigo-400 font-mono">
                    {editProgFormData.linked_goal_ids?.length || 0} Sasaran Terpilih
                  </span>
                </div>

                {/* Dropdown Pencarian Sasaran */}
                <div className="relative" ref={editProgGoalDropdownRef}>
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      value={editProgGoalSearch}
                      onChange={(e) => {
                        setEditProgGoalSearch(e.target.value);
                        setIsEditProgGoalDropdownOpen(true);
                      }}
                      onFocus={() => setIsEditProgGoalDropdownOpen(true)}
                      placeholder="Cari kode atau judul sasaran strategis RIPS..."
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-8 py-2 text-xs text-slate-200 outline-none focus:border-amber-500"
                    />
                    {editProgGoalSearch && (
                      <button
                        type="button"
                        onClick={() => setEditProgGoalSearch('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  {isEditProgGoalDropdownOpen && (
                    <div className="absolute z-30 left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-slate-950 border border-slate-700 rounded-xl shadow-2xl p-1.5 divide-y divide-slate-800 animate-fadeIn">
                      {(() => {
                        const filtered = availableRipsGoals.filter((g) => {
                          if (!editProgGoalSearch.trim()) return true;
                          const q = editProgGoalSearch.toLowerCase();
                          return g.code?.toLowerCase().includes(q) || g.title?.toLowerCase().includes(q) || g.domain_name?.toLowerCase().includes(q);
                        });

                        if (filtered.length === 0) {
                          return (
                            <div className="p-3 text-center text-slate-400 text-xs italic">
                              Tidak ada sasaran strategis yang cocok.
                            </div>
                          );
                        }

                        return filtered.map((g) => {
                          const isSelected = editProgFormData.linked_goal_ids?.includes(g.id);
                          return (
                            <div
                              key={g.id}
                              onClick={() => {
                                const currentGoalIds = editProgFormData.linked_goal_ids || [];
                                if (isSelected) {
                                  setEditProgFormData({
                                    ...editProgFormData,
                                    linked_goal_ids: currentGoalIds.filter((id) => id !== g.id),
                                  });
                                } else {
                                  setEditProgFormData({
                                    ...editProgFormData,
                                    linked_goal_ids: [...currentGoalIds, g.id],
                                  });
                                }
                              }}
                              className={`p-2 rounded-xl flex items-center justify-between gap-2.5 cursor-pointer transition ${
                                isSelected ? 'bg-indigo-950/50 text-indigo-200' : 'hover:bg-slate-850 text-slate-300'
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => {}}
                                  className="rounded border-slate-700 text-indigo-500 pointer-events-none"
                                />
                                <span className="font-mono text-[10px] font-bold text-indigo-400 shrink-0">{g.code}</span>
                                <span className="text-xs truncate">{g.title}</span>
                              </div>
                              <span className="text-[10px] text-slate-400 shrink-0">{g.domain_name || 'Bidang'}</span>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  )}
                </div>

                {/* Badge Tag Sasaran yang Terpilih */}
                {editProgFormData.linked_goal_ids && editProgFormData.linked_goal_ids.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {editProgFormData.linked_goal_ids.map((goalId) => {
                      const g = availableRipsGoals.find((goal) => goal.id === goalId);
                      return (
                        <span
                          key={goalId}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-medium bg-indigo-950/70 text-indigo-300 border border-indigo-700/60"
                        >
                          <strong>{g?.code || `SAS-${goalId}`}</strong>: <span className="max-w-[160px] truncate">{g?.title || 'Sasaran'}</span>
                          <button
                            type="button"
                            onClick={() => {
                              setEditProgFormData({
                                ...editProgFormData,
                                linked_goal_ids: editProgFormData.linked_goal_ids.filter((id) => id !== goalId),
                              });
                            }}
                            className="hover:text-white ml-0.5"
                          >
                            ✕
                          </button>
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-slate-800/80">
                <input
                  type="checkbox"
                  id="rkt_edit_flagship_cb"
                  checked={editProgFormData.is_flagship === 1 || editProgFormData.is_flagship === true}
                  onChange={(e) => setEditProgFormData({ ...editProgFormData, is_flagship: e.target.checked ? 1 : 0 })}
                  className="rounded border-slate-700 text-amber-500 focus:ring-amber-500"
                />
                <label htmlFor="rkt_edit_flagship_cb" className="text-xs text-amber-300 font-medium cursor-pointer">
                  Tandai sebagai Program Unggulan (Flagship Program ⭐)
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-800/80">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Target Capaian RKT (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={editProgFormData.target_percent}
                    onChange={(e) => setEditProgFormData({ ...editProgFormData, target_percent: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none focus:border-amber-500 font-bold"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-300 mb-1">Catatan Pelaksanaan RKT</label>
                  <input
                    type="text"
                    value={editProgFormData.notes || ''}
                    onChange={(e) => setEditProgFormData({ ...editProgFormData, notes: e.target.value })}
                    placeholder="Catatan pelaksanaan tahunan..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditProgramModalOpen(false);
                    setEditingProgramObj(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition shadow-lg shadow-amber-950/50"
                >
                  {formLoading ? 'Menyimpan...' : 'Simpan Perubahan Program'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: TAMBAH SUB-BIDANG BARU */}
      {isAddSubdomainModalOpen && selectedDomainForSubdomain && (
        <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-amber-400" />
                Tambah Sub-Bidang Baru
              </h3>
              <button
                type="button"
                onClick={() => {
                  setIsAddSubdomainModalOpen(false);
                  setSelectedDomainForSubdomain(null);
                }}
                className="text-slate-400 hover:text-white font-bold p-1 transition"
              >
                ✕
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200">
              Menambahkan sub-bidang baru di bawah <strong>BIDANG: {selectedDomainForSubdomain.name}</strong> ({selectedDomainForSubdomain.code}).
            </div>

            <form onSubmit={handleSaveSubdomainSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Nama Sub-Bidang <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={newSubdomainName}
                  onChange={(e) => setNewSubdomainName(e.target.value)}
                  placeholder="Contoh: Kurikulum & Pembelajaran, Sarana Prasarana, dll."
                  required
                  autoFocus
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 placeholder:text-slate-600 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddSubdomainModalOpen(false);
                    setSelectedDomainForSubdomain(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={subdomainFormLoading || !newSubdomainName.trim()}
                  className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-xs font-bold transition shadow-lg shadow-amber-950/50"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{subdomainFormLoading ? 'Menyimpan...' : 'Simpan Sub-Bidang'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDIT BIDANG (DOMAIN) */}
      {isEditDomainModalOpen && editingDomainObj && (
        <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Pencil className="w-5 h-5 text-indigo-400" />
                Edit Bidang (Domain)
              </h3>
              <button
                type="button"
                onClick={() => {
                  setIsEditDomainModalOpen(false);
                  setEditingDomainObj(null);
                }}
                className="text-slate-400 hover:text-white font-bold p-1 transition"
              >
                ✕
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-200">
              Perubahan nama bidang ini akan <strong>tersimpan permanen di master RIPS</strong> dan berlaku untuk <strong>seluruh tahun ajaran</strong> lainnya.
            </div>

            <form onSubmit={handleSaveEditDomain} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Nama Bidang <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={editDomainForm.name}
                  onChange={(e) => setEditDomainForm({ ...editDomainForm, name: e.target.value })}
                  placeholder="Contoh: Kurikulum & Pembelajaran, Kesiswaan, dll."
                  required
                  autoFocus
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 placeholder:text-slate-600 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Nomor Urut Tampilan
                </label>
                <input
                  type="number"
                  min="1"
                  value={editDomainForm.order_index}
                  onChange={(e) => setEditDomainForm({ ...editDomainForm, order_index: parseInt(e.target.value, 10) || 1 })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditDomainModalOpen(false);
                    setEditingDomainObj(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={formLoading || !editDomainForm.name.trim()}
                  className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold transition shadow-lg shadow-blue-950/50"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{formLoading ? 'Menyimpan...' : 'Simpan Perubahan'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDIT SUB-BIDANG */}
      {isEditSubdomainModalOpen && editingSubdomainObj && (
        <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Pencil className="w-5 h-5 text-amber-400" />
                Edit Sub-Bidang
              </h3>
              <button
                type="button"
                onClick={() => {
                  setIsEditSubdomainModalOpen(false);
                  setEditingSubdomainObj(null);
                }}
                className="text-slate-400 hover:text-white font-bold p-1 transition"
              >
                ✕
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200">
              Sub-Bidang di bawah <strong>BIDANG: {editingSubdomainObj.domain_name}</strong>. Perubahan akan <strong>tersimpan permanen di master RIPS</strong> dan berlaku untuk <strong>seluruh tahun ajaran</strong>.
            </div>

            <form onSubmit={handleSaveEditSubdomain} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Nama Sub-Bidang <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={editSubdomainForm.name}
                  onChange={(e) => setEditSubdomainForm({ ...editSubdomainForm, name: e.target.value })}
                  placeholder="Contoh: Pemenuhan Sarpras, Administrasi, dll."
                  required
                  autoFocus
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 placeholder:text-slate-600 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Nomor Urut Tampilan
                </label>
                <input
                  type="number"
                  min="1"
                  value={editSubdomainForm.order_index}
                  onChange={(e) => setEditSubdomainForm({ ...editSubdomainForm, order_index: parseInt(e.target.value, 10) || 1 })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditSubdomainModalOpen(false);
                    setEditingSubdomainObj(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={formLoading || !editSubdomainForm.name.trim()}
                  className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-xs font-bold transition shadow-lg shadow-amber-950/50"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{formLoading ? 'Menyimpan...' : 'Simpan Perubahan'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Pindahkan Program ke Sub-Bidang Lain */}
      <MoveProgramModal
        isOpen={isMoveProgramModalOpen}
        onClose={() => {
          setIsMoveProgramModalOpen(false);
          setProgramToMove(null);
        }}
        program={programToMove}
        domains={domainsData}
        subdomains={subdomainsData}
        onSuccess={() => {
          fetchData();
        }}
      />
    </div>
  );
}
