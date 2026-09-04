import React, { useState, useEffect, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { useAuth } from '../../../shared/store/AuthContext';
import api from '../../../shared/services/api';
import DatePickerField from '../components/shared/DatePickerField';
import SearchableSelect from '../../../shared/components/SearchableSelect';
import {
  CalendarRange,
  School,
  Building2,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Plus,
  Save,
  Send,
  History,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Sparkles,
  Target,
  FileDown,
  Clock,
  Eye,
  Calendar,
  RefreshCw,
  FileText,
  Search,
  Filter,
  Maximize2,
  Minimize2,
  Trash2,
  Edit3,
  Printer,
  Download,
  FileSpreadsheet,
  CheckSquare,
  ListChecks,
  BarChart3,
  Check,
  FolderInput,
  X
} from 'lucide-react';
import { createPortal } from 'react-dom';
import MoveProgramModal from '../components/shared/MoveProgramModal';

export default function LongTermPlanning() {
  const { user, schoolUnits, activeSchoolUnit } = useAuth();

  // Context Type: 'foundation' (Yayasan/Gabungan) | 'school_unit' (Per Satuan Pendidikan)
  const [contextType, setContextType] = useState('foundation');

  // Selected School Unit (used when contextType === 'school_unit')
  const [selectedUnitId, setSelectedUnitId] = useState(
    activeSchoolUnit?.id || (schoolUnits?.[0]?.id || 1)
  );

  // Active Tab: 'rkjp' | 'rkjm_1' | 'rkjm_2' | 'publications'
  const [activeTab, setActiveTab] = useState('rkjp');

  // Sub-Tab View Mode: 'plan_checklist' (Tabel Penerapan Rencana Program) | 'strategic_targets' (Tabel Target Sasaran / Manajemen Strategis)
  const [subViewMode, setSubViewMode] = useState('plan_checklist');

  // Loading & Data States
  const [loading, setLoading] = useState(true);
  const [rkjpList, setRkjpList] = useState([]);
  const [activeRkjp, setActiveRkjp] = useState(null);
  const [targetsData, setTargetsData] = useState(null); // { plan, academic_years, matrix, domains, subdomains, goals, bsc_aspects }
  // Input States:
  // 1. Program Checklist: { [program_id]: { [academic_year]: boolean } } -> Untuk Tabel Penerapan Rencana Program
  const [programChecklistState, setProgramChecklistState] = useState({});
  // 2. Goal Trajectory Inputs: { [goal_id]: { [academic_year]: number | string } } -> Untuk Tabel Target Sasaran (%)
  const [goalTrajectoryInputs, setGoalTrajectoryInputs] = useState({});

  const [saveLoading, setSaveLoading] = useState(false);
  const [publications, setPublications] = useState([]);

  // Filters & Search
  const [filterDomain, setFilterDomain] = useState('all');
  const [filterSubdomain, setFilterSubdomain] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedDomains, setExpandedDomains] = useState({});
  const [expandedSubdomains, setExpandedSubdomains] = useState({});
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Modals
  const [modalType, setModalType] = useState(null); // 'create_rkjp' | 'edit_rkjp' | 'publish' | 'view_pub'
  const [editingRkjp, setEditingRkjp] = useState(null);
  const [formData, setFormData] = useState({});
  const [formLoading, setFormLoading] = useState(false);
  const [selectedPubSnapshot, setSelectedPubSnapshot] = useState(null);

  // Move Program Modal State
  const [isMoveProgramModalOpen, setIsMoveProgramModalOpen] = useState(false);
  const [programToMove, setProgramToMove] = useState(null);

  const handleOpenMoveProgramModal = (prog) => {
    setProgramToMove(prog);
    setIsMoveProgramModalOpen(true);
  };

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

  // Sync with activeSchoolUnit
  useEffect(() => {
    if (activeSchoolUnit?.id) {
      setSelectedUnitId(activeSchoolUnit.id);
    }
  }, [activeSchoolUnit]);

  // Fetch list of RKJP plans
  const fetchRkjpPlans = async () => {
    try {
      setLoading(true);
      const unitQuery = contextType === 'school_unit' && selectedUnitId 
        ? `school_unit_id=${selectedUnitId}` 
        : `context=foundation`;
      
      const res = await api.get(`/manajemen/long-term-work-plans?${unitQuery}&plan_type=rkjp`);
      if (res.data?.success) {
        const list = res.data.data || [];
        setRkjpList(list);
        if (list.length > 0) {
          // Default to the first (latest) RKJP
          const cur = list[0];
          fetchPlanDetails(cur.id);
        } else {
          setActiveRkjp(null);
          setTargetsData(null);
          setLoading(false);
        }
      }
    } catch (err) {
      console.error('Error fetching RKJP plans:', err);
      setLoading(false);
    }
  };

  // Fetch plan targets & details
  const fetchPlanDetails = async (planId) => {
    try {
      setLoading(true);
      const [planRes, targetsRes, pubRes] = await Promise.all([
        api.get(`/manajemen/long-term-work-plans/${planId}`),
        api.get(`/manajemen/long-term-work-plans/${planId}/targets`),
        api.get(`/manajemen/long-term-work-plans/${planId}/publications`),
      ]);

      if (planRes.data?.success) {
        setActiveRkjp(planRes.data.data);
      }

      if (targetsRes.data?.success) {
        const tData = targetsRes.data.data;
        setTargetsData(tData);

        // 1. Pre-fill Program Checklist states (is_active)
        const initialChecklists = {};
        tData.matrix?.forEach((row) => {
          initialChecklists[row.program_id] = {};
          tData.academic_years?.forEach((year) => {
            const isActive = row.yearly_targets?.[year]?.is_active;
            initialChecklists[row.program_id][year] = !!isActive;
          });
        });
        setProgramChecklistState(initialChecklists);

        // 2. Pre-fill Goal Trajectory Targets (%)
        const initialGoalTrajectories = {};
        tData.goals?.forEach((g) => {
          initialGoalTrajectories[g.id] = {};
          tData.academic_years?.forEach((year) => {
            const targetVal = g.yearly_goal_targets?.[year]?.target_percent;
            initialGoalTrajectories[g.id][year] = targetVal !== null && targetVal !== undefined ? targetVal : '';
          });
        });
        setGoalTrajectoryInputs(initialGoalTrajectories);
      }

      if (pubRes.data?.success) {
        setPublications(pubRes.data.data || []);
      }
    } catch (err) {
      console.error('Error fetching plan targets:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRkjpPlans();
  }, [contextType, selectedUnitId]);

  // Handle cell target input change
  const handleCellChange = (programId, year, val) => {
    // Legacy mapping if needed, otherwise ignore if replaced by programChecklistState
  };

  // Handle Goal Trajectory target percent input change
  const handleGoalTrajectoryChange = (goalId, year, val) => {
    setGoalTrajectoryInputs((prev) => ({
      ...prev,
      [goalId]: {
        ...(prev[goalId] || {}),
        [year]: val,
      },
    }));
  };

  // Toggle Domain / Subdomain accordion
  const toggleDomain = (key) => {
    setExpandedDomains((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const toggleSubdomain = (key) => {
    setExpandedSubdomains((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // Available Subdomains based on selected filterDomain
  const availableSubdomains = useMemo(() => {
    const domains = targetsData?.domains || [];
    const subdomains = targetsData?.subdomains || [];
    if (filterDomain === 'all') {
      return subdomains.map((s) => {
        const d = domains.find((dom) => Number(dom.id) === Number(s.domain_id));
        return { ...s, domainName: d?.name };
      });
    }
    return subdomains.filter((s) => Number(s.domain_id) === Number(filterDomain));
  }, [targetsData, filterDomain]);

  // Grouping Programs by Domain and Subdomain (matching RipsPlanning Tab 2)
  const groupedPrograms = useMemo(() => {
    if (!targetsData?.matrix) return [];

    const domains = targetsData.domains || [];
    const subdomains = targetsData.subdomains || [];
    const matrix = targetsData.matrix || [];

    // 1. Build Domain & Subdomain Map
    const domainMap = new Map();

    domains.forEach((d, dIdx) => {
      const domOrder = d.order_index ?? (dIdx + 1);
      const subMap = new Map();

      const matchedSubs = subdomains.filter((s) => Number(s.domain_id) === Number(d.id));
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

    // 2. Filter matrix rows by search query
    const filteredProgList = matrix.filter((p) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const matchName = p.program_name?.toLowerCase().includes(q);
      const matchCode = p.program_code?.toLowerCase().includes(q);
      const matchCategory = p.category_name?.toLowerCase().includes(q);
      const matchGoal = p.linked_goals?.some(
        (g) => g.goal_title?.toLowerCase().includes(q) || g.goal_code?.toLowerCase().includes(q)
      );
      return matchName || matchCode || matchCategory || matchGoal;
    });

    // 3. Place each program into domain and subdomain
    filteredProgList.forEach((p) => {
      const dId = p.domain_id || 'unassigned';
      if (!domainMap.has(dId)) {
        domainMap.set(dId, {
          id: dId,
          name: p.domain_name || 'Bidang Lainnya',
          code: `BID-${dId !== 'unassigned' ? String(dId).padStart(2, '0') : '00'}`,
          order_index: 999,
          subdomains: new Map(),
        });
      }
      const domainObj = domainMap.get(dId);

      const subId = p.subdomain_id || 'general';
      if (!domainObj.subdomains.has(subId)) {
        domainObj.subdomains.set(subId, {
          id: subId,
          name: p.subdomain_name || (subId === 'general' ? 'Umum / Lintas Sub-Bidang' : 'Sub-Bidang'),
          code: `SUB-${subId !== 'general' ? String(subId).padStart(2, '0') : '00'}`,
          order_index: 999,
          programs: [],
        });
      }
      const subObj = domainObj.subdomains.get(subId);
      subObj.programs.push(p);
    });

    // 4. Convert to array
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

      // If search or subdomain filter active, only show domains with matching programs
      if ((searchQuery.trim() || filterSubdomain !== 'all') && totalProgramsCount === 0) {
        return;
      }

      result.push({
        ...domainItem,
        subdomainList: subList,
        totalPrograms: totalProgramsCount,
      });
    });

    return result.sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
  }, [targetsData, filterDomain, filterSubdomain, searchQuery]);

  // Grouping Goals by Domain and Subdomain for Tabel Target Sasaran (MANAJEMEN STRATEGIS style)
  const groupedGoalsHierarchy = useMemo(() => {
    if (!targetsData?.goals) return [];

    const domains = targetsData.domains || [];
    const subdomains = targetsData.subdomains || [];
    const goals = targetsData.goals || [];

    const domainMap = new Map();
    domains.forEach((d, dIdx) => {
      const domOrder = d.order_index ?? (dIdx + 1);
      const subMap = new Map();

      const matchedSubs = subdomains.filter((s) => Number(s.domain_id) === Number(d.id));
      if (matchedSubs.length > 0) {
        matchedSubs.forEach((s, sIdx) => {
          subMap.set(s.id, {
            id: s.id,
            name: s.name,
            code: `SUB-${String(s.order_index ?? sIdx + 1).padStart(2, '0')}`,
            order_index: s.order_index ?? (sIdx + 1),
            goals: [],
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

    // Filter goals by search query
    const filteredGoals = goals.filter((g) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const matchTitle = g.title?.toLowerCase().includes(q);
      const matchCode = g.code?.toLowerCase().includes(q);
      const matchAspect = g.bsc_aspect_name?.toLowerCase().includes(q);
      const matchProgs = g.linked_programs?.some(
        (lp) => lp.name?.toLowerCase().includes(q) || lp.code?.toLowerCase().includes(q)
      );
      return matchTitle || matchCode || matchAspect || matchProgs;
    });

    // Place goals into domain and subdomain
    filteredGoals.forEach((g) => {
      const dId = g.domain_id || 'unassigned';
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

      const subId = g.subdomain_id || 'general';
      if (!domainObj.subdomains.has(subId)) {
        domainObj.subdomains.set(subId, {
          id: subId,
          name: subId === 'general' ? 'Umum / Lintas Sub-Bidang' : 'Sub-Bidang',
          code: `SUB-${subId !== 'general' ? String(subId).padStart(2, '0') : '00'}`,
          order_index: 999,
          goals: [],
        });
      }
      const subObj = domainObj.subdomains.get(subId);
      subObj.goals.push(g);
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
      const totalGoalsCount = subList.reduce((acc, curr) => acc + curr.goals.length, 0);

      if ((searchQuery.trim() || filterSubdomain !== 'all') && totalGoalsCount === 0) {
        return;
      }

      result.push({
        ...domainItem,
        subdomainList: subList,
        totalGoals: totalGoalsCount,
      });
    });

    return result.sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
  }, [targetsData, filterDomain, filterSubdomain, searchQuery]);

  // Checklist Toggle Helper (murni menandai pelaksanaan program di tahun bersangkutan: true / false)
  const handleChecklistToggle = (programId, year) => {
    setProgramChecklistState((prev) => {
      const progInputs = prev[programId] || {};
      const isCurrentlyChecked = !!progInputs[year];
      return {
        ...prev,
        [programId]: {
          ...progInputs,
          [year]: !isCurrentlyChecked,
        },
      };
    });
  };

  const isFilteringActive = Boolean(
    searchQuery.trim() || filterDomain !== 'all' || filterSubdomain !== 'all'
  );

  // Expand / Collapse All Hierarchies
  const handleExpandAll = () => {
    const allExpD = {};
    const allExpS = {};

    groupedPrograms.forEach((d) => {
      allExpD[`dom_${d.id}`] = true;
      d.subdomainList.forEach((s) => {
        allExpS[`sub_${d.id}_${s.id}`] = true;
      });
    });

    groupedGoalsHierarchy.forEach((d) => {
      allExpD[`dom_${d.id}`] = true;
      d.subdomainList.forEach((s) => {
        allExpS[`sub_${d.id}_${s.id}`] = true;
      });
    });

    setExpandedDomains(allExpD);
    setExpandedSubdomains(allExpS);
  };

  const handleCollapseAll = () => {
    setExpandedDomains({});
    setExpandedSubdomains({});
  };

  const handleExpandDomainsOnly = () => {
    const allExpD = {};
    groupedPrograms.forEach((d) => {
      allExpD[`dom_${d.id}`] = true;
    });
    groupedGoalsHierarchy.forEach((d) => {
      allExpD[`dom_${d.id}`] = true;
    });
    setExpandedDomains(allExpD);
    setExpandedSubdomains({});
  };

  const handleExpandSubdomains = () => {
    const allExpD = {};
    const allExpS = {};
    groupedPrograms.forEach((d) => {
      allExpD[`dom_${d.id}`] = true;
      d.subdomainList.forEach((s) => {
        allExpS[`sub_${d.id}_${s.id}`] = true;
      });
    });
    groupedGoalsHierarchy.forEach((d) => {
      allExpD[`dom_${d.id}`] = true;
      d.subdomainList.forEach((s) => {
        allExpS[`sub_${d.id}_${s.id}`] = true;
      });
    });
    setExpandedDomains(allExpD);
    setExpandedSubdomains(allExpS);
  };

  // Toggle "Pilih Semua" (Select All / Deselect All) untuk Satu Kolom Tahun Ajaran
  const toggleSelectAllYear = (year) => {
    if (!groupedPrograms || groupedPrograms.length === 0) return;

    // Collect all visible programs based on current grouping & search filter
    const visibleProgramIds = [];
    groupedPrograms.forEach((domain) => {
      domain.subdomainList.forEach((sub) => {
        sub.programs.forEach((prog) => {
          visibleProgramIds.push(prog.program_id);
        });
      });
    });

    if (visibleProgramIds.length === 0) return;

    // Check if all currently visible programs are already checked for this year
    const allChecked = visibleProgramIds.every((pId) => !!programChecklistState[pId]?.[year]);

    // If all are checked, uncheck all. Otherwise, check all.
    const newActiveVal = !allChecked;

    setProgramChecklistState((prev) => {
      const nextState = { ...prev };
      visibleProgramIds.forEach((pId) => {
        nextState[pId] = {
          ...(nextState[pId] || {}),
          [year]: newActiveVal,
        };
      });
      return nextState;
    });
  };

  // Save targets & trajectories in bulk
  const handleSaveTargets = async () => {
    if (!activeRkjp) return;
    setSaveLoading(true);

    // 1. Program checklist items (is_active)
    const programItems = [];
    Object.keys(programChecklistState).forEach((pId) => {
      Object.keys(programChecklistState[pId]).forEach((yr) => {
        const isActive = !!programChecklistState[pId][yr];
        programItems.push({
          rips_program_id: Number(pId),
          academic_year: yr,
          is_active: isActive,
        });
      });
    });

    // 2. Goal Trajectory items (Target % Sasaran Strategis)
    const goalItems = [];
    Object.keys(goalTrajectoryInputs).forEach((gId) => {
      Object.keys(goalTrajectoryInputs[gId]).forEach((yr) => {
        const val = goalTrajectoryInputs[gId][yr];
        goalItems.push({
          rips_goal_id: Number(gId),
          academic_year: yr,
          target_percent: val !== '' && val !== null && val !== undefined ? Number(val) : null,
        });
      });
    });

    try {
      const targetUnitId = contextType === 'school_unit' ? selectedUnitId : null;
      await api.put('/manajemen/annual-program-targets/bulk', {
        school_unit_id: targetUnitId,
        items: programItems,
        goal_items: goalItems,
      });

      alert('Data penerapan rencana program & target sasaran berhasil disimpan.');
      fetchPlanDetails(activeRkjp.id);
    } catch (err) {
      console.error('Save targets error:', err);
      alert(err.response?.data?.message || 'Gagal menyimpan target');
    } finally {
      setSaveLoading(false);
    }
  };

  // Helper: Roman Numerals (1 -> I, 2 -> II, 3 -> III, dst.)
  const toRoman = (num) => {
    const roman = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX', 'XX'];
    return roman[num - 1] || `${num}`;
  };

  // Handle Create RKJP
  const handleCreateRkjp = async (e) => {
    e.preventDefault();
    const sYear = Number(formData.start_year);
    const eYear = Number(formData.end_year);
    if (!sYear || !eYear) {
      alert('Tahun awal dan tahun akhir wajib diisi');
      return;
    }
    if (eYear < sYear) {
      alert('Tahun akhir tidak boleh lebih kecil dari tahun awal');
      return;
    }

    setFormLoading(true);
    try {
      const targetUnitId = contextType === 'school_unit' ? selectedUnitId : null;
      await api.post('/manajemen/long-term-work-plans', {
        school_unit_id: targetUnitId,
        start_year: sYear,
        end_year: eYear,
        title: formData.title || undefined,
      });
      setModalType(null);
      setFormData({});
      fetchRkjpPlans();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal membuat dokumen RKJP');
    } finally {
      setFormLoading(false);
    }
  };

  // Handle Update RKJP
  const handleUpdateRkjp = async (e) => {
    e.preventDefault();
    if (!editingRkjp) return;
    const sYear = Number(formData.start_year);
    const eYear = Number(formData.end_year);
    if (!sYear || !eYear) {
      alert('Tahun awal dan tahun akhir wajib diisi');
      return;
    }
    if (eYear < sYear) {
      alert('Tahun akhir tidak boleh lebih kecil dari tahun awal');
      return;
    }

    setFormLoading(true);
    try {
      await api.put(`/manajemen/long-term-work-plans/${editingRkjp.id}`, {
        title: formData.title,
        status: formData.status,
        start_year: sYear,
        end_year: eYear,
      });
      setModalType(null);
      setEditingRkjp(null);
      setFormData({});
      fetchRkjpPlans();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal memperbarui dokumen');
    } finally {
      setFormLoading(false);
    }
  };

  // Handle Delete RKJP
  const handleDeleteRkjp = async (planId) => {
    try {
      setLoading(true);
      await api.delete(`/manajemen/long-term-work-plans/${planId}`);
      alert('Dokumen RKJP dan seluruh RKJM turunannya berhasil dihapus!');
      fetchRkjpPlans();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menghapus dokumen');
      setLoading(false);
    }
  };

  // Handle Export to Native Spreadsheet Excel (.xlsx)
  const handleExportSpreadsheet = () => {
    if (subViewMode === 'plan_checklist') {
      if (!groupedPrograms || groupedPrograms.length === 0) {
        alert('Tidak ada data program untuk diekspor');
        return;
      }

      try {
        // Sheet 1: Penerapan Rencana Program (Checklist TA)
        const matrixAoa = [
          ['DOKUMEN PERENCANAAN JANGKA PANJANG - TABEL PENERAPAN RENCANA PROGRAM'],
          [`Judul: ${currentTabPlan?.title || 'RKJP'}`],
          [`Konteks: ${currentLevelLabel}`],
          [`Periode: ${currentTabPlan?.start_year} - ${currentTabPlan?.end_year}`],
          [`Tanggal Unduh: ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`],
          [],
          [
            'Kode Bidang',
            'Nama Bidang',
            'Kode Sub-Bidang',
            'Nama Sub-Bidang',
            'Kode Program',
            'Nama Program & Kegiatan',
            'Program Unggulan',
            'Kategori Program',
            'Deskripsi / Catatan',
            ...displayedYears.map((yr) => `Jadwal TA ${yr}`),
          ],
        ];

        groupedPrograms.forEach((domain) => {
          domain.subdomainList.forEach((sub) => {
            sub.programs.forEach((prog) => {
              const rowData = [
                domain.code,
                domain.name || '',
                sub.code,
                sub.name || '',
                prog.program_code,
                prog.program_name || '',
                prog.is_flagship ? '⭐ Unggulan' : 'Reguler',
                prog.category_name || '-',
                prog.description || '',
                ...displayedYears.map((yr) => {
                  const isChecked = !!programChecklistState[prog.program_id]?.[yr];
                  return isChecked ? '✓ Dilaksanakan (RKT)' : '-';
                }),
              ];
              matrixAoa.push(rowData);
            });
          });
        });

        const wsMatrix = XLSX.utils.aoa_to_sheet(matrixAoa);
        wsMatrix['!cols'] = [
          { wch: 12 }, { wch: 28 }, { wch: 14 }, { wch: 30 }, { wch: 14 },
          { wch: 45 }, { wch: 14 }, { wch: 24 }, { wch: 40 },
          ...displayedYears.map(() => ({ wch: 18 })),
        ];

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, wsMatrix, 'Penerapan_Rencana_Program');

        const filename = `${currentTabPlan?.title || 'RKJP'}_Penerapan_Rencana_${contextType === 'foundation' ? 'Yayasan' : (selectedUnit?.name || 'Satuan')}.xlsx`.replace(/[/\\?%*:|"<>]/g, '_');
        XLSX.writeFile(wb, filename);
      } catch (err) {
        console.error('Spreadsheet export error:', err);
        alert('Gagal mengekspor dokumen spreadsheet Excel: ' + (err.message || err));
      }
    } else {
      // subViewMode === 'strategic_targets'
      if (!groupedGoalsHierarchy || groupedGoalsHierarchy.length === 0) {
        alert('Tidak ada data sasaran strategis untuk diekspor');
        return;
      }

      try {
        const matrixAoa = [
          ['DOKUMEN PERENCANAAN JANGKA PANJANG - TABEL TARGET SASARAN STRATEGIS'],
          [`Judul: ${currentTabPlan?.title || 'RKJP'}`],
          [`Konteks: ${currentLevelLabel}`],
          [`Periode: ${currentTabPlan?.start_year} - ${currentTabPlan?.end_year}`],
          [`Tanggal Unduh: ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`],
          [],
          [
            'Kode Bidang',
            'Nama Bidang',
            'Kode Sub-Bidang',
            'Nama Sub-Bidang',
            'Kode Sasaran',
            'Sasaran Strategis',
            'Aspek BSC',
            'Baseline (%)',
            'Target (%)',
            ...displayedYears.map((yr) => `Target ${yr} (%)`),
          ],
        ];

        groupedGoalsHierarchy.forEach((domain) => {
          domain.subdomainList.forEach((sub) => {
            sub.goals.forEach((g) => {
              const rowData = [
                domain.code,
                domain.name || '',
                sub.code,
                sub.name || '',
                g.code,
                g.title || '',
                g.bsc_aspect_name || 'Internal Process',
                g.baseline_calc !== null && g.baseline_calc !== undefined ? Number(g.baseline_calc) : 0,
                g.target_calc !== null && g.target_calc !== undefined ? Number(g.target_calc) : 100,
                ...displayedYears.map((yr) => {
                  const val = goalTrajectoryInputs[g.id]?.[yr];
                  return val !== undefined && val !== null && val !== '' ? Number(val) : '';
                }),
              ];
              matrixAoa.push(rowData);
            });
          });
        });

        const wsMatrix = XLSX.utils.aoa_to_sheet(matrixAoa);
        wsMatrix['!cols'] = [
          { wch: 12 }, { wch: 28 }, { wch: 14 }, { wch: 30 }, { wch: 14 },
          { wch: 45 }, { wch: 20 }, { wch: 14 }, { wch: 14 },
          ...displayedYears.map(() => ({ wch: 16 })),
        ];

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, wsMatrix, 'Target_Sasaran_Strategis');

        const filename = `${currentTabPlan?.title || 'RKJP'}_Target_Sasaran_${contextType === 'foundation' ? 'Yayasan' : (selectedUnit?.name || 'Satuan')}.xlsx`.replace(/[/\\?%*:|"<>]/g, '_');
        XLSX.writeFile(wb, filename);
      } catch (err) {
        console.error('Spreadsheet export error:', err);
        alert('Gagal mengekspor dokumen spreadsheet Excel: ' + (err.message || err));
      }
    }
  };

  // Handle Export to CSV / Excel Text
  const handleExportCSV = () => {
    if (!groupedPrograms || groupedPrograms.length === 0) {
      alert('Tidak ada data program untuk diekspor');
      return;
    }

    const headers = [
      'Kode Bidang',
      'Nama Bidang',
      'Kode Sub-Bidang',
      'Nama Sub-Bidang',
      'Kode Program',
      'Nama Program',
      'Program Unggulan',
      'Kategori',
      'Deskripsi',
      ...displayedYears.map((yr) => `Target ${yr} (%)`),
    ];

    const rows = [];
    if (subViewMode === 'plan_checklist') {
      groupedPrograms.forEach((domain) => {
        domain.subdomainList.forEach((sub) => {
          sub.programs.forEach((prog) => {
            const rowData = [
              domain.code,
              `"${(domain.name || '').replace(/"/g, '""')}"`,
              sub.code,
              `"${(sub.name || '').replace(/"/g, '""')}"`,
              prog.program_code,
              `"${(prog.program_name || '').replace(/"/g, '""')}"`,
              prog.is_flagship ? 'Ya' : 'Tidak',
              `"${(prog.category_name || '-').replace(/"/g, '""')}"`,
              `"${(prog.description || '').replace(/"/g, '""')}"`,
              ...displayedYears.map((yr) => {
                const isChecked = !!programChecklistState[prog.program_id]?.[yr];
                return isChecked ? 'Ya' : 'Tidak';
              }),
            ];
            rows.push(rowData.join(','));
          });
        });
      });
    } else {
      groupedGoalsHierarchy.forEach((domain) => {
        domain.subdomainList.forEach((sub) => {
          sub.goals.forEach((g) => {
            const rowData = [
              domain.code,
              `"${(domain.name || '').replace(/"/g, '""')}"`,
              sub.code,
              `"${(sub.name || '').replace(/"/g, '""')}"`,
              g.code,
              `"${(g.title || '').replace(/"/g, '""')}"`,
              g.bsc_aspect_name || 'Internal Process',
              g.baseline_calc || 0,
              g.target_calc || 100,
              ...displayedYears.map((yr) => {
                const val = goalTrajectoryInputs[g.id]?.[yr];
                return val !== undefined && val !== null && val !== '' ? val : '';
              }),
            ];
            rows.push(rowData.join(','));
          });
        });
      });
    }

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const filename = `${currentTabPlan?.title || 'Perencanaan_Jangka_Panjang'}_${contextType === 'foundation' ? 'Yayasan' : (selectedUnit?.name || 'Satuan')}.csv`.replace(/\s+/g, '_');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Handle Export / Print to Official PDF / Printer
  const handleExportPrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Popup blocker aktif. Mohon izinkan popup untuk mencetak dokumen.');
      return;
    }

    const yearsHeaderTh = displayedYears
      .map(
        (yr) =>
          `<th style="border: 1px solid #cbd5e1; padding: 6px 8px; text-align: center; background-color: #f1f5f9; font-size: 11px; width: 75px;">${yr}</th>`
      )
      .join('');

    let tableBodyHtml = '';
    groupedPrograms.forEach((domain) => {
      tableBodyHtml += `
        <tr style="background-color: #e2e8f0; font-weight: bold;">
          <td style="border: 1px solid #cbd5e1; padding: 5px 8px; text-align: center; font-family: monospace; font-size: 11px; color: #1e3a8a;">${domain.code}</td>
          <td colspan="${displayedYears.length + 2}" style="border: 1px solid #cbd5e1; padding: 5px 8px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px;">
            BIDANG: ${domain.name} (${domain.totalPrograms} Program)
          </td>
        </tr>
      `;

      domain.subdomainList.forEach((sub) => {
        tableBodyHtml += `
          <tr style="background-color: #fef3c7; font-weight: 600;">
            <td style="border: 1px solid #cbd5e1; padding: 4px 8px; text-align: center; font-family: monospace; font-size: 10.5px; color: #92400e;">${sub.code}</td>
            <td colspan="${displayedYears.length + 2}" style="border: 1px solid #cbd5e1; padding: 4px 8px; font-size: 11px; padding-left: 20px; color: #78350f;">
              Sub-Bidang: ${sub.name} (${sub.programs.length} Program)
            </td>
          </tr>
        `;

        sub.programs.forEach((p) => {
          const yearsCells = displayedYears
            .map((yr) => {
              const isChecked = !!programChecklistState[p.program_id]?.[yr];
              const displayVal = isChecked ? '✓ Ya' : '-';
              return `<td style="border: 1px solid #cbd5e1; padding: 5px 6px; text-align: center; font-family: monospace; font-size: 11px; font-weight: bold; color: ${isChecked ? '#047857' : '#94a3b8'};">${displayVal}</td>`;
            })
            .join('');

          tableBodyHtml += `
            <tr style="page-break-inside: avoid;">
              <td style="border: 1px solid #cbd5e1; padding: 6px 8px; text-align: center; font-family: monospace; font-size: 11px; font-weight: bold; color: #2563eb;">${p.program_code}</td>
              <td style="border: 1px solid #cbd5e1; padding: 6px 8px; font-size: 11px;">
                <div style="font-weight: 600; color: #0f172a;">${p.program_name} ${p.is_flagship ? '<span style="color: #b45309; font-size: 9.5px; font-weight: bold; background-color: #fef3c7; border: 1px solid #fde68a; padding: 1px 4px; border-radius: 4px; margin-left: 4px;">⭐ Unggulan</span>' : ''}</div>
                ${p.description ? `<div style="font-size: 10px; color: #64748b; margin-top: 2px;">${p.description}</div>` : ''}
              </td>
              <td style="border: 1px solid #cbd5e1; padding: 6px 8px; text-align: center; font-size: 10px;">${p.category_name || '-'}</td>
              ${yearsCells}
            </tr>
          `;
        });
      });
    });

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${currentTabPlan?.title || 'Dokumen Perencanaan Jangka Panjang'}</title>
          <style>
            body { font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 25px; color: #1e293b; margin: 0; }
            h1 { font-size: 18px; margin: 0 0 4px 0; color: #0f172a; text-align: center; }
            h2 { font-size: 13px; margin: 0 0 16px 0; color: #475569; text-align: center; font-weight: normal; }
            .header-box { border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 16px; text-align: center; }
            .meta-grid { display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 12px; color: #334155; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 11px; }
            @media print {
              body { padding: 0; }
              @page { size: landscape; margin: 15mm; }
            }
          </style>
        </head>
        <body>
          <div class="header-box">
            <h1>${currentTabPlan?.title?.toUpperCase() || 'DOKUMEN PERENCANAAN JANGKA PANJANG'}</h1>
            <h2>${currentLevelLabel} &bull; Matriks Trajectory Target Tahunan Terpadu</h2>
          </div>
          <div class="meta-grid">
            <div><strong>Tingkat:</strong> ${currentLevelLabel}</div>
            <div><strong>Periode Dokumen:</strong> ${currentTabPlan?.start_year} - ${currentTabPlan?.end_year} (${displayedYears.length} Tahun Ajaran)</div>
            <div><strong>Tanggal Cetak:</strong> ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
          </div>
          <table>
            <thead>
              <tr>
                <th style="border: 1px solid #cbd5e1; padding: 6px 8px; text-align: center; background-color: #f1f5f9; font-size: 11px; width: 70px;">Kode</th>
                <th style="border: 1px solid #cbd5e1; padding: 6px 8px; text-align: left; background-color: #f1f5f9; font-size: 11px;">Program Strategis & Upaya RIPS</th>
                <th style="border: 1px solid #cbd5e1; padding: 6px 8px; text-align: center; background-color: #f1f5f9; font-size: 11px; width: 130px;">Kategori</th>
                ${yearsHeaderTh}
              </tr>
            </thead>
            <tbody>
              ${tableBodyHtml}
            </tbody>
          </table>
          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  // Handle Publish Document (RKJP or RKJM)
  const handlePublishPlan = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    const targetPlanId = formData.plan_id;
    try {
      await api.post(`/manajemen/long-term-work-plans/${targetPlanId}/publish`, {
        document_number: formData.document_number,
        title: formData.title,
        effective_date: formData.effective_date,
        change_summary: formData.change_summary,
      });
      setModalType(null);
      setFormData({});
      fetchPlanDetails(activeRkjp.id);
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menerbitkan dokumen');
    } finally {
      setFormLoading(false);
    }
  };

  // Helper render badge kategori
  const renderCategoryBadge = (categoryName) => {
    if (!categoryName) return <span className="text-gray-400 italic text-[10px]">-</span>;

    const cat = categoryName.trim();
    let badgeClass = 'bg-gray-100 text-gray-700 border-gray-300';
    if (cat.includes('Pengembangan Program')) {
      badgeClass = 'bg-blue-50 text-blue-700 border-blue-200';
    } else if (cat.includes('Penyusunan Dokumen')) {
      badgeClass = 'bg-emerald-50 text-emerald-700 border-emerald-200';
    } else if (cat.includes('Pengadaan Sarpras')) {
      badgeClass = 'bg-amber-50 text-amber-700 border-amber-200';
    } else if (cat.includes('Kegiatan Siswa')) {
      badgeClass = 'bg-purple-50 text-purple-700 border-purple-200';
    } else if (cat.includes('Forum/Rapat')) {
      badgeClass = 'bg-indigo-50 text-indigo-700 border-indigo-200';
    } else if (cat.includes('Sosialisasi')) {
      badgeClass = 'bg-rose-50 text-rose-700 border-rose-200';
    }

    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold border ${badgeClass} whitespace-nowrap`}>
        {cat}
      </span>
    );
  };

  // Determine which years and plan apply to active tab
  let currentTabPlan = activeRkjp;
  let displayedYears = targetsData?.academic_years || [];

  if (activeTab.startsWith('rkjm_')) {
    const rkjmKey = activeTab.replace('rkjm_', '');
    const matchedRkjm = activeRkjp?.rkjm_list?.find(
      (r) => String(r.id) === rkjmKey || String(r.sequence_order) === rkjmKey
    );
    if (matchedRkjm) {
      currentTabPlan = matchedRkjm;
      const rkjmAcademicYears = [];
      for (let y = Number(matchedRkjm.start_year); y <= Number(matchedRkjm.end_year); y++) {
        rkjmAcademicYears.push(`${y}/${y + 1}`);
      }
      displayedYears = (targetsData?.academic_years || []).filter((ay) =>
        rkjmAcademicYears.includes(ay)
      );
    }
  }

  const selectedUnit = schoolUnits?.find((u) => u.id === Number(selectedUnitId));
  const currentLevelLabel = contextType === 'foundation' 
    ? 'Tingkat Yayasan (Gabungan)' 
    : (selectedUnit ? `${selectedUnit.name} (${selectedUnit.level})` : 'Satuan Pendidikan');

  // Shared Table JSX generator: 1. TABEL PENERAPAN RENCANA PROGRAM (Checklist per Tahun Ajaran)
  const renderChecklistTableBody = () => {
    if (groupedPrograms.length === 0) {
      return (
        <tr>
          <td colSpan={displayedYears.length + 3} className="py-10 text-center text-gray-500 bg-white">
            Belum ada program strategis yang sesuai kriteria filter.
          </td>
        </tr>
      );
    }

    return groupedPrograms.map((domain) => {
      const domainKey = `dom_${domain.id}`;
      const isDomainExpanded = isFilteringActive ? true : Boolean(expandedDomains[domainKey]);

      return (
        <React.Fragment key={domain.id}>
          {/* LEVEL 1: BIDANG (DOMAIN) */}
          <tr className="bg-[#E5E7EB] border-b border-gray-300 font-bold text-gray-900 transition-colors">
            <td className="py-1.5 px-3 text-center border-r border-gray-300 font-mono text-[11px] text-blue-800">
              {domain.code}
            </td>
            <td colSpan={displayedYears.length + 2} className="py-1.5 px-3">
              <button
                type="button"
                onClick={() => toggleDomain(domainKey)}
                className="flex items-center gap-1.5 text-left w-full group focus:outline-none"
              >
                <span className="p-0.5 rounded bg-gray-300/70 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  {isDomainExpanded ? (
                    <ChevronDown className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5" />
                  )}
                </span>
                <span className="text-xs uppercase tracking-wider font-extrabold text-gray-900 group-hover:text-blue-700 transition-colors">
                  BIDANG: {domain.name}
                </span>
                <span className="ml-1.5 px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-gray-300/80 text-gray-700 leading-tight">
                  {domain.totalPrograms} Program Terdaftar
                </span>
              </button>
            </td>
          </tr>

          {/* LEVEL 2: SUB-BIDANG (SUBDOMAIN) */}
          {isDomainExpanded &&
            domain.subdomainList.map((sub) => {
              const subKey = `sub_${domain.id}_${sub.id}`;
              const isSubExpanded = isFilteringActive ? true : Boolean(expandedSubdomains[subKey]);

              return (
                <React.Fragment key={sub.id}>
                  <tr className="bg-[#FEF3C7] border-b border-amber-200/80 font-semibold text-amber-950 transition-colors">
                    <td className="py-1.5 px-3 text-center border-r border-amber-200/80 font-mono text-[11px] text-amber-800">
                      {sub.code}
                    </td>
                    <td colSpan={displayedYears.length + 2} className="py-1.5 px-3 pl-7">
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
                        <span className="ml-1 text-[10px] text-amber-800/80 font-normal">
                          ({sub.programs.length} program)
                        </span>
                      </button>
                    </td>
                  </tr>

                  {/* LEVEL 3: PROGRAM LIST WITH CHECKLIST PER TAHUN AJARAN */}
                  {isSubExpanded &&
                    sub.programs.map((row) => (
                      <tr
                        key={row.program_id}
                        className="bg-white hover:bg-blue-50/60 border-b border-gray-200 text-gray-800 transition-colors"
                      >
                        {/* Kode Program */}
                        <td className="py-2 px-3 text-center border-r border-gray-200 font-mono text-[11px] font-bold text-blue-700 align-middle">
                          {row.program_code}
                        </td>

                        {/* Nama Program (Satu Baris, Sejajar / Masuk dari Sub-Bidang) */}
                        <td className="py-2 px-3 pl-8 sm:pl-9 border-r border-gray-200 align-middle min-w-[240px]">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-bold text-gray-900 leading-snug">
                                {row.program_name}
                              </span>
                              {row.is_flagship === 1 && (
                                <span className="px-1.5 py-0.5 rounded-full text-[9px] font-extrabold bg-amber-100 text-amber-800 border border-amber-300 shrink-0">
                                  ⭐ Unggulan
                                </span>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => handleOpenMoveProgramModal(row)}
                              className="p-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 transition shrink-0 cursor-pointer"
                              title="Pindahkan Program ke Sub-Bidang Lain"
                            >
                              <FolderInput className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>

                        {/* Kategori Program */}
                        <td className="py-2.5 px-3 text-center border-r border-gray-200 align-top w-32">
                          {renderCategoryBadge(row.category_name)}
                        </td>

                        {/* Kolom Checklist Penerapan Tahun Ajaran (Murni Penjadwalan Pelaksanaan RKT) */}
                        {displayedYears.map((yr) => {
                          const isChecked = !!programChecklistState[row.program_id]?.[yr];

                          return (
                            <td
                              key={yr}
                              onClick={() => handleChecklistToggle(row.program_id, yr)}
                              className={`py-2 px-2 text-center border-r border-gray-200 align-middle cursor-pointer transition-colors select-none ${
                                isChecked ? 'bg-emerald-50 hover:bg-emerald-100/80' : 'hover:bg-gray-100'
                              }`}
                              title={isChecked ? `Program dijadwalkan dilaksanakan di TA ${yr}. Klik untuk batalkan.` : `Klik untuk jadwalkan pelaksanaan di TA ${yr}`}
                            >
                              <div className="flex flex-col items-center justify-center gap-0.5">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => {}} // Handled by td click
                                  className="w-4 h-4 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500 cursor-pointer pointer-events-none"
                                />
                                {isChecked ? (
                                  <span className="text-[9.5px] font-bold text-emerald-700">
                                    Aktif di RKT
                                  </span>
                                ) : (
                                  <span className="text-[9px] text-gray-400">
                                    -
                                  </span>
                                )}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                </React.Fragment>
              );
            })}
        </React.Fragment>
      );
    });
  };

  // Shared Table JSX generator: 2. TABEL TARGET SASARAN (Tabel Manajemen Strategis dengan Input Target Persen Indikator/Sasaran)
  const renderStrategicTargetsTableBody = () => {
    if (groupedGoalsHierarchy.length === 0) {
      return (
        <tr>
          <td colSpan={displayedYears.length + 5} className="py-10 text-center text-gray-500 bg-white">
            Belum ada sasaran strategis RIPS yang sesuai filter.
          </td>
        </tr>
      );
    }

    return groupedGoalsHierarchy.map((domain) => {
      const domainKey = `dom_${domain.id}`;
      const isDomainExpanded = isFilteringActive ? true : Boolean(expandedDomains[domainKey]);

      return (
        <React.Fragment key={domain.id}>
          {/* LEVEL 1: BIDANG */}
          <tr className="bg-[#E5E7EB] border-b border-gray-300 font-bold text-gray-900 transition-colors">
            <td className="py-1.5 px-3 text-center border-r border-gray-300 font-mono text-[11px] text-blue-800">
              {domain.code}
            </td>
            <td colSpan={displayedYears.length + 4} className="py-1.5 px-3">
              <button
                type="button"
                onClick={() => toggleDomain(domainKey)}
                className="flex items-center gap-1.5 text-left w-full group focus:outline-none"
              >
                <span className="p-0.5 rounded bg-gray-300/70 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  {isDomainExpanded ? (
                    <ChevronDown className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5" />
                  )}
                </span>
                <span className="text-xs uppercase tracking-wider font-extrabold text-gray-900 group-hover:text-blue-700 transition-colors">
                  BIDANG: {domain.name}
                </span>
                <span className="ml-1.5 px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-gray-300/80 text-gray-700 leading-tight">
                  {domain.totalGoals} Sasaran Strategis / {domain.subdomainList.length} Sub-Bidang
                </span>
              </button>
            </td>
          </tr>

          {/* LEVEL 2: SUB-BIDANG */}
          {isDomainExpanded &&
            domain.subdomainList.map((sub) => {
              const subKey = `sub_${domain.id}_${sub.id}`;
              const isSubExpanded = isFilteringActive ? true : Boolean(expandedSubdomains[subKey]);

              return (
                <React.Fragment key={sub.id}>
                  <tr className="bg-[#FEF3C7] border-b border-amber-200/80 font-semibold text-amber-950 transition-colors">
                    <td className="py-1.5 px-3 text-center border-r border-amber-200/80 font-mono text-[11px] text-amber-800">
                      {sub.code}
                    </td>
                    <td colSpan={displayedYears.length + 4} className="py-1.5 px-3 pl-7">
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
                        <span className="ml-1 text-[10px] text-amber-800/80 font-normal">
                          ({sub.goals.length} sasaran strategis)
                        </span>
                      </button>
                    </td>
                  </tr>

                  {/* LEVEL 3: SASARAN STRATEGIS RIPS DENGAN ASPEK BSC, BASELINE, TARGET & TARGET TRAJECTORY TAHUNAN (%) */}
                  {isSubExpanded &&
                    sub.goals.map((g) => {
                      return (
                        <tr
                          key={g.id}
                          className="bg-white hover:bg-blue-50/60 border-b border-gray-200 text-gray-800 transition-colors"
                        >
                          {/* Kode Sasaran */}
                          <td className="py-2.5 px-3 text-center border-r border-gray-200 font-mono text-[11px] font-bold text-indigo-700 align-top">
                            {g.code}
                          </td>

                          {/* Sub-Bidang & Sasaran Strategis */}
                          <td className="py-2.5 px-4 border-r border-gray-200 align-top min-w-[220px]">
                            <div className="text-xs font-bold text-gray-900 leading-snug">
                              {g.title}
                            </div>
                            {g.indicators && g.indicators.length > 0 && (
                              <div className="mt-1 space-y-0.5">
                                {g.indicators.map((ind, iIdx) => (
                                  <div key={ind.id || iIdx} className="text-[10.5px] text-gray-500 flex items-center gap-1">
                                    <span className="text-indigo-400">&bull;</span>
                                    <span>{ind.name} ({ind.baseline_percent || 0}% &rarr; {ind.target_percent || 100}%)</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </td>

                          {/* Aspek BSC */}
                          <td className="py-2.5 px-3 text-center border-r border-gray-200 align-top w-28">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                              {g.bsc_aspect_name || 'Internal Process'}
                            </span>
                          </td>

                          {/* Baseline */}
                          <td className="py-2.5 px-3 text-right border-r border-gray-200 font-mono text-xs font-bold text-gray-600 align-top w-20">
                            {g.baseline_calc !== null && g.baseline_calc !== undefined ? `${Number(g.baseline_calc).toFixed(0)}%` : '0%'}
                          </td>

                          {/* Target */}
                          <td className="py-2.5 px-3 text-right border-r border-gray-200 font-mono text-xs font-extrabold text-blue-700 align-top w-20">
                            {g.target_calc !== null && g.target_calc !== undefined ? `${Number(g.target_calc).toFixed(0)}%` : '100%'}
                          </td>

                          {/* Kolom Target Capaian Persen (%) Per Tahun Ajaran untuk Sasaran Ini */}
                          {displayedYears.map((yr) => {
                            const val = goalTrajectoryInputs[g.id]?.[yr];

                            return (
                              <td key={yr} className="py-2 px-2 text-center border-r border-gray-200 align-middle">
                                <input
                                  type="number"
                                  step="0.1"
                                  min="0"
                                  max="100"
                                  placeholder="-"
                                  value={val ?? ''}
                                  onChange={(e) => handleGoalTrajectoryChange(g.id, yr, e.target.value)}
                                  className="w-16 bg-slate-50 border border-gray-300 rounded-lg py-1 px-1.5 text-center text-xs text-emerald-700 font-bold outline-none focus:border-indigo-500 focus:bg-white transition shadow-inner font-mono"
                                  title={`Target capaian indikator sasaran [${g.code}] pada TA ${yr} (%)`}
                                />
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                </React.Fragment>
              );
            })}
        </React.Fragment>
      );
    });
  };

  // Shared Table JSX generator for inline and fullscreen display
  const renderMatrixTableBody = () => {
    if (subViewMode === 'plan_checklist') {
      return renderChecklistTableBody();
    }
    return renderStrategicTargetsTableBody();
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Top Header Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 relative z-10">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-500 to-violet-600 flex items-center justify-center text-white shadow-lg shadow-indigo-950/60 border border-indigo-400/30">
              <CalendarRange className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-bold text-white tracking-tight">Perencanaan Jangka Menengah &amp; Panjang</h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  {currentLevelLabel}
                </span>
                {activeRkjp && (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                    Periode {activeRkjp.start_year}-{activeRkjp.end_year} ({activeRkjp.end_year - activeRkjp.start_year + 1} Tahun)
                  </span>
                )}
              </div>
              <p className="text-slate-400 text-xs mt-0.5">
                Perencanaan RKJP &amp; RKJM berbasis target tahunan bersama (Single Source of Truth)
              </p>
            </div>
          </div>

          {/* Context Switcher & Actions */}
          <div className="flex flex-wrap items-center gap-3 self-start lg:self-auto">
            {/* Context Switcher: Yayasan vs Satuan */}
            <div className="flex items-center gap-1 bg-slate-950/80 p-1 rounded-2xl border border-slate-800">
              <button
                onClick={() => setContextType('foundation')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  contextType === 'foundation'
                    ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Building2 className="w-3.5 h-3.5" />
                Yayasan
              </button>
              <button
                onClick={() => setContextType('school_unit')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  contextType === 'school_unit'
                    ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <School className="w-3.5 h-3.5" />
                Satuan
              </button>

              {contextType === 'school_unit' && (
                <SearchableSelect
                  value={selectedUnitId}
                  onChange={(val) => setSelectedUnitId(Number(val))}
                  className="w-56"
                  options={schoolUnits?.map((unit) => ({
                    value: unit.id,
                    label: `${unit.name} (${unit.level})`,
                  })) || []}
                />
              )}
            </div>

            {/* Create RKJP Button (Always accessible) */}
            <button
              onClick={() => {
                const currentYear = new Date().getFullYear();
                const defaultTitle = contextType === 'foundation'
                  ? `RKJP Gabungan Yayasan ${currentYear}-${currentYear + 7}`
                  : `RKJP ${selectedUnit?.name || 'Satuan'} ${currentYear}-${currentYear + 7}`;
                setFormData({
                  start_year: currentYear,
                  end_year: currentYear + 7,
                  title: defaultTitle,
                });
                setModalType('create_rkjp');
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-xs font-bold transition shadow-lg shadow-indigo-950/50"
            >
              <Plus className="w-4 h-4" />
              Buat RKJP Baru
            </button>

            {/* Save Targets Button */}
            {activeRkjp && (
              <button
                onClick={handleSaveTargets}
                disabled={saveLoading}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition shadow-lg shadow-indigo-950/40 disabled:opacity-50"
              >
                {saveLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-white" />
                    <span>Menyimpan Target...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Simpan Perubahan Angka</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* RKJP Switcher banner with Document Management (Edit / Delete) */}
        <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between gap-3 text-xs flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-slate-400 font-semibold">Pilih Dokumen RKJP:</span>
            {rkjpList.map((plan) => (
              <div
                key={plan.id}
                className={`inline-flex items-center rounded-xl transition ${
                  activeRkjp?.id === plan.id
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <button
                  onClick={() => fetchPlanDetails(plan.id)}
                  className="px-3 py-1 font-medium text-left"
                >
                  {plan.title} ({plan.start_year}-{plan.end_year})
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingRkjp(plan);
                    setFormData({
                      title: plan.title,
                      status: plan.status,
                      start_year: plan.start_year,
                      end_year: plan.end_year
                    });
                    setModalType('edit_rkjp');
                  }}
                  className="px-1.5 py-1 text-slate-300 hover:text-white hover:bg-white/10 rounded transition"
                  title="Ubah Dokumen & Rentang Tahun"
                >
                  <Edit3 className="w-3 h-3" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (
                      window.confirm(
                        `Apakah Anda yakin ingin menghapus dokumen "${plan.title}"?\n\nPerhatian: Seluruh periode RKJM turunan dan publikasi yang terkait dengan dokumen ini akan ikut dihapus.`
                      )
                    ) {
                      handleDeleteRkjp(plan.id);
                    }
                  }}
                  className="px-1.5 py-1 text-rose-300 hover:text-rose-100 hover:bg-rose-600/30 rounded transition mr-1"
                  title="Hapus Dokumen RKJP & RKJM Turunannya"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>

          <div className="text-[11px] text-slate-500">
            Total {rkjpList.length} Dokumen Perencanaan Terdaftar
          </div>
        </div>
      </div>

      {/* Global Loading Spinner for Page Fetch */}
      {loading && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center space-y-4 shadow-xl animate-fadeIn">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center mx-auto border border-indigo-500/30">
            <RefreshCw className="w-6 h-6 animate-spin text-indigo-400" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-white">Memuat Data Perencanaan RKJP &amp; RKJM...</h3>
            <p className="text-xs text-slate-400">Menghubungkan target tahunan seluruh program kerja strategis</p>
          </div>
        </div>
      )}

      {/* Main Tabs Navigation & Content (When not loading) */}
      {!loading && activeRkjp ? (
        <>
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2 overflow-x-auto">
              <button
                onClick={() => setActiveTab('rkjp')}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-semibold whitespace-nowrap transition-all ${
                  activeTab === 'rkjp'
                    ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <CalendarRange className="w-4 h-4" />
                RKJP ({activeRkjp.end_year - activeRkjp.start_year + 1} Tahun: {activeRkjp.start_year}-{activeRkjp.end_year})
              </button>

              {activeRkjp.rkjm_list?.map((rkjm) => {
                const tabKey = `rkjm_${rkjm.id}`;
                const isActive = activeTab === tabKey || activeTab === `rkjm_${rkjm.sequence_order}`;
                return (
                  <button
                    key={rkjm.id}
                    onClick={() => setActiveTab(tabKey)}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-semibold whitespace-nowrap transition-all ${
                      isActive
                        ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 shadow-md'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Layers className="w-4 h-4" />
                    {rkjm.title || `RKJM ${toRoman(rkjm.sequence_order)} (${rkjm.start_year}-${rkjm.end_year})`}
                  </button>
                );
              })}

              <button
                onClick={() => setActiveTab('publications')}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-semibold whitespace-nowrap transition-all ${
                  activeTab === 'publications'
                    ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <History className="w-4 h-4" />
                Riwayat Penerbitan ({publications.length})
              </button>
            </div>

            {/* Publish Action for Current Tab Plan */}
            {activeTab !== 'publications' && currentTabPlan && (
              <button
                onClick={() => {
                  const docType = currentTabPlan.plan_type.toUpperCase();
                  setFormData({
                    plan_id: currentTabPlan.id,
                    plan_type: currentTabPlan.plan_type,
                    document_number: `SK-${docType}/${new Date().getFullYear()}/V${currentTabPlan.current_version || 1}`,
                    title: `${currentTabPlan.title} (Versi Resmi ${currentTabPlan.current_version || 1})`,
                    effective_date: new Date().toISOString().substring(0, 10),
                    change_summary: '',
                  });
                  setModalType('publish');
                }}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-xs font-bold transition shrink-0"
              >
                <Send className="w-3.5 h-3.5" />
                Terbitkan {currentTabPlan.plan_type.toUpperCase()} Ini
              </button>
            )}
          </div>

          {/* TAB CONTENT: MATRIX */}
          {activeTab !== 'publications' && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
              {/* Sub-Tab Navigation Bar: 2 View Modes */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
                <div className="flex items-center gap-2 bg-slate-950 p-1.5 rounded-2xl border border-slate-800 shadow-inner">
                  <button
                    onClick={() => setSubViewMode('plan_checklist')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                      subViewMode === 'plan_checklist'
                        ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <ListChecks className="w-4 h-4" />
                    1. Penerapan Rencana Program (Checklist TA)
                  </button>

                  <button
                    onClick={() => setSubViewMode('strategic_targets')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                      subViewMode === 'strategic_targets'
                        ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <BarChart3 className="w-4 h-4" />
                    2. Target Sasaran (Manajemen Strategis)
                  </button>
                </div>

                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <span>Mode:</span>
                  <span className="font-semibold text-slate-200">
                    {subViewMode === 'plan_checklist'
                      ? 'Centang tahun pelaksanaan agar program otomatis muncul di RKT'
                      : 'Isi angka target persentase (%) sasaran strategis per tahun'}
                  </span>
                </div>
              </div>

              {/* Filter and Actions Bar */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800 relative z-30">
                <div className="flex flex-wrap items-center gap-3">
                  <div>
                    <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1.5 flex items-center gap-1">
                      <Filter className="w-3 h-3 text-indigo-400" /> Filter Bidang
                    </label>
                    <SearchableSelect
                      value={filterDomain}
                      onChange={(val) => {
                        setFilterDomain(val || 'all');
                        setFilterSubdomain('all');
                      }}
                      className="w-52"
                      placeholder="Semua Bidang"
                      options={[
                        { value: 'all', label: `Semua Bidang (${targetsData?.domains?.length || 0})`, sublabel: 'Tampilkan seluruh bidang' },
                        ...(targetsData?.domains?.map((d) => ({
                          value: String(d.id),
                          label: d.name,
                          sublabel: `Kode: ${d.code || `BID-${d.order_index || d.id}`}`,
                          badge: d.code || `BID-${d.order_index || d.id}`
                        })) || []),
                      ]}
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1.5 flex items-center gap-1">
                      Filter Sub-Bidang
                    </label>
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
                  </div>

                  <div className="self-end pb-0.5">
                    <div className="relative flex items-center group">
                      <Search className="w-3.5 h-3.5 text-indigo-400 group-focus-within:text-indigo-300 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none transition-colors duration-200 z-10" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Cari program / sasaran..."
                        className="bg-slate-950/90 hover:bg-slate-950 focus:bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 rounded-xl pl-9 pr-8 py-2 text-xs text-slate-100 placeholder-slate-500 focus:placeholder-slate-400 outline-none w-48 sm:w-64 transition-all duration-200 font-medium shadow-inner"
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
                  </div>
                </div>

                <div className="flex items-center gap-3 self-start md:self-auto">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-slate-400">Status:</span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        currentTabPlan?.status === 'published'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      }`}
                    >
                      {currentTabPlan?.status} (v{currentTabPlan?.current_version})
                    </span>
                  </div>

                  <button
                    onClick={handleSaveTargets}
                    disabled={saveLoading}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition shadow-lg shadow-indigo-950/40"
                  >
                    <Save className="w-3.5 h-3.5" />
                    {saveLoading ? 'Menyimpan...' : 'Simpan Data'}
                  </button>
                </div>
              </div>

              {/* Tree-View Hierarchical Matrix Table Card (Matching RIPS Style) */}
              <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden flex flex-col">
                {/* Header Utama Tabel: Biru Solid (#3B82F6) */}
                <div className="bg-[#3B82F6] px-6 py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 text-white shrink-0 shadow-md">
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center font-bold">
                      {subViewMode === 'plan_checklist' ? <ListChecks className="w-4 h-4 text-white" /> : <Layers className="w-4 h-4 text-white" />}
                    </div>
                    <div>
                      <h3 className="font-extrabold text-sm sm:text-base tracking-wider uppercase">
                        {subViewMode === 'plan_checklist'
                          ? `TABEL PENERAPAN RENCANA PROGRAM (${currentTabPlan?.title})`
                          : `TABEL TARGET SASARAN STRATEGIS (${currentTabPlan?.title})`}
                      </h3>
                      <p className="text-[11px] text-blue-100 font-medium">
                        {subViewMode === 'plan_checklist'
                          ? 'Daftar program kerja yang direncanakan & dijadwalkan pada masing-masing tahun ajaran'
                          : 'Matriks sasaran strategis, aspek BSC, baseline, dan angka target (%) per tahun ajaran'}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
                    <span className="px-2.5 py-1 rounded-full bg-blue-700/60 border border-blue-400/30">
                      {subViewMode === 'plan_checklist' ? `${targetsData?.matrix?.length || 0} Total Program` : `${targetsData?.goals?.length || 0} Sasaran Strategis`}
                    </span>

                    {/* Kontrol Lipat / Buka Hirarki */}
                    <div className="flex items-center gap-1 bg-white/15 p-1 rounded-xl border border-white/20">
                      <button
                        type="button"
                        onClick={handleCollapseAll}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/25 text-white text-[11px] font-bold transition shadow-2xs select-none"
                        title="Lipat Semua (Bidang & Sub-Bidang)"
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
                        onClick={handleExpandAll}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/20 hover:bg-white/30 text-white text-[11px] font-bold transition shadow-2xs select-none"
                        title="Buka Semua Rincian (Bidang & Sub-Bidang)"
                      >
                        <ChevronDown className="w-3.5 h-3.5" />
                        <span>Buka Semua</span>
                      </button>
                    </div>

                    {/* Export Spreadsheet (.xlsx) Button */}
                    <button
                      type="button"
                      onClick={handleExportSpreadsheet}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition border border-emerald-400/40 shadow-xs"
                      title="Ekspor Seluruh Matriks ke Dokumen Spreadsheet Asli (.xlsx)"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Spreadsheet (.xlsx)</span>
                    </button>

                    {/* Export CSV Button */}
                    <button
                      type="button"
                      onClick={handleExportCSV}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-bold transition border border-white/30 shadow-xs"
                      title="Ekspor ke Format CSV (Teks Terpisah Koma)"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">CSV</span>
                    </button>

                    {/* Export / Print PDF Button */}
                    <button
                      type="button"
                      onClick={handleExportPrint}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-bold transition border border-white/30 shadow-xs"
                      title="Cetak atau Simpan Dokumen ke Format PDF Resmi"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Cetak / PDF</span>
                    </button>

                    {/* Fullscreen Button */}
                    <button
                      type="button"
                      onClick={() => setIsFullscreen(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-bold transition border border-white/30 shadow-xs select-none"
                      title="Tampilkan Matriks dalam Layar Penuh"
                    >
                      <Maximize2 className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Layar Penuh</span>
                    </button>
                  </div>
                </div>

                {/* Sub-Header Kolom & Isi Tabel */}
                <div className="overflow-x-auto bg-white">
                  <table className="w-full text-left border-collapse min-w-[900px]">
                    <thead className="sticky top-0 z-10 shadow-xs">
                      {subViewMode === 'plan_checklist' ? (
                        <tr className="bg-[#F3F4F6] text-gray-800 uppercase text-[11px] font-bold tracking-wider border-b border-[#D1D5DB]">
                          <th className="py-2.5 px-3 text-center border-r border-[#D1D5DB] w-24">Kode</th>
                          <th className="py-2.5 px-4 border-r border-[#D1D5DB] min-w-[260px]">Program Strategis &amp; Inisiatif Terobosan</th>
                          <th className="py-2.5 px-3 text-center border-r border-[#D1D5DB] w-32">Kategori</th>
                          {displayedYears.map((yr) => {
                            // Check if all visible programs are checked for this year
                            const visibleProgramIds = [];
                            groupedPrograms.forEach((domain) => {
                              domain.subdomainList.forEach((sub) => {
                                sub.programs.forEach((prog) => {
                                  visibleProgramIds.push(prog.program_id);
                                });
                              });
                            });
                            const isAllYearChecked = visibleProgramIds.length > 0 && visibleProgramIds.every((pId) => !!programChecklistState[pId]?.[yr]);

                            return (
                              <th
                                key={yr}
                                className="py-2 px-1 text-center border-r border-[#D1D5DB] w-28 bg-[#F9FAFB] hover:bg-[#F3F4F6] transition-colors"
                              >
                                <div className="flex flex-col items-center justify-center gap-1">
                                  <span className="font-mono font-bold text-gray-900 text-xs">{yr}</span>
                                  <button
                                    type="button"
                                    onClick={() => toggleSelectAllYear(yr)}
                                    className={`flex items-center gap-1 px-2 py-0.5 rounded text-[9.5px] font-bold transition select-none ${
                                      isAllYearChecked
                                        ? 'bg-emerald-600 text-white shadow-xs'
                                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                    }`}
                                    title={isAllYearChecked ? `Hapus centang semua untuk TA ${yr}` : `Centang semua program untuk TA ${yr}`}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={isAllYearChecked}
                                      onChange={() => {}}
                                      className="w-3 h-3 text-emerald-600 rounded pointer-events-none"
                                    />
                                    <span>{isAllYearChecked ? 'Semua' : 'Pilih'}</span>
                                  </button>
                                </div>
                              </th>
                            );
                          })}
                        </tr>
                      ) : (
                        <tr className="bg-[#F3F4F6] text-gray-800 uppercase text-[11px] font-bold tracking-wider border-b border-[#D1D5DB]">
                          <th className="py-2.5 px-3 text-center border-r border-[#D1D5DB] w-24">Kode</th>
                          <th className="py-2.5 px-4 border-r border-[#D1D5DB] min-w-[240px]">Sub-Bidang &amp; Sasaran Strategis</th>
                          <th className="py-2.5 px-3 text-center border-r border-[#D1D5DB] w-28">Aspek BSC</th>
                          <th className="py-2.5 px-3 text-right border-r border-[#D1D5DB] w-20">Baseline</th>
                          <th className="py-2.5 px-3 text-right border-r border-[#D1D5DB] w-20">Target</th>
                          {displayedYears.map((yr) => (
                            <th key={yr} className="py-2.5 px-2 text-center border-r border-[#D1D5DB] w-24 font-mono font-bold text-gray-900">
                              {yr} (%)
                            </th>
                          ))}
                        </tr>
                      )}
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {renderMatrixTableBody()}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-200 flex items-center justify-between">
                <span>
                  💡 <strong>Catatan Penjadwalan &amp; Target:</strong> Centang pada <em>Tabel Penerapan Rencana Program</em> menandai program akan dilaksanakan pada tahun tersebut sehingga muncul di <strong>RKT</strong>. Adapun isian angka persen pada <em>Tabel Target Sasaran</em> merupakan trajectory target indikator untuk evaluasi mutu.
                </span>
                <button
                  onClick={handleSaveTargets}
                  disabled={saveLoading}
                  className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition shrink-0 ml-3"
                >
                  {saveLoading ? 'Menyimpan...' : 'Simpan Perubahan'}
                </button>
              </div>
            </div>
          )}

          {/* FULLSCREEN OVERLAY VIA REACT PORTAL UNTUK RKJP & RKJM */}
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
                  <div className="bg-[#3B82F6] px-6 py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 text-white shrink-0 shadow-md relative z-50">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center font-bold">
                        {subViewMode === 'plan_checklist' ? <ListChecks className="w-5 h-5 text-white" /> : <Layers className="w-5 h-5 text-white" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-extrabold text-sm sm:text-base tracking-wider uppercase">
                            {subViewMode === 'plan_checklist'
                              ? `TABEL PENERAPAN RENCANA PROGRAM (${currentTabPlan?.title})`
                              : `TABEL TARGET SASARAN STRATEGIS (${currentTabPlan?.title})`}
                          </h3>
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-white/20 text-white uppercase tracking-wider">
                            Full Screen Mode
                          </span>
                        </div>
                        <p className="text-[11px] text-blue-100 font-medium">
                          {currentLevelLabel} &bull; {subViewMode === 'plan_checklist' ? 'Checklist Penjadwalan Pelaksanaan RKT' : 'Matriks Sasaran Strategis & Target %'}
                        </p>
                      </div>
                    </div>

                    {/* Quick Search & Save in Fullscreen */}
                    <div className="flex items-center gap-2">
                      {/* Sub-View Switcher in Fullscreen */}
                      <div className="flex items-center gap-1 bg-white/10 p-1 rounded-xl border border-white/20 mr-1">
                        <button
                          type="button"
                          onClick={() => setSubViewMode('plan_checklist')}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                            subViewMode === 'plan_checklist' ? 'bg-white text-blue-800 shadow-xs' : 'text-blue-100 hover:text-white'
                          }`}
                        >
                          Checklist TA
                        </button>
                        <button
                          type="button"
                          onClick={() => setSubViewMode('strategic_targets')}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                            subViewMode === 'strategic_targets' ? 'bg-white text-blue-800 shadow-xs' : 'text-blue-100 hover:text-white'
                          }`}
                        >
                          Target Sasaran
                        </button>
                      </div>

                      {/* Filter Bidang di Fullscreen */}
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
                          { value: 'all', label: `Semua Bidang (${targetsData?.domains?.length || 0})`, sublabel: 'Tampilkan seluruh bidang' },
                          ...(targetsData?.domains?.map((d) => ({
                            value: String(d.id),
                            label: d.name,
                            sublabel: `Kode: ${d.code || `BID-${d.order_index || d.id}`}`,
                            badge: d.code || `BID-${d.order_index || d.id}`
                          })) || [])
                        ]}
                      />

                      {/* Filter Sub-Bidang di Fullscreen */}
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

                      <div className="relative flex items-center group">
                        <Search className="w-3.5 h-3.5 text-blue-200 group-focus-within:text-blue-600 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none transition-colors duration-200 z-10" />
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Cari program / sasaran..."
                          className="bg-white/15 hover:bg-white/25 focus:bg-white text-white focus:text-slate-800 placeholder-blue-100/70 focus:placeholder-slate-400 text-xs rounded-xl pl-9 pr-8 py-1.5 outline-none transition-all duration-200 border border-white/25 focus:border-white focus:ring-2 focus:ring-white/40 w-40 sm:w-56 font-medium shadow-inner focus:shadow-md"
                        />
                        {searchQuery && (
                          <button
                            type="button"
                            onClick={() => setSearchQuery('')}
                            className="absolute right-2 p-1 rounded-full text-blue-200 hover:text-white focus:text-slate-700 hover:bg-white/20 transition-all z-10"
                            title="Hapus kata kunci pencarian"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>

                      {/* Kontrol Lipat / Buka Hirarki in Fullscreen */}
                      <div className="flex items-center gap-1 bg-white/10 p-0.5 rounded-xl border border-white/20">
                        <button
                          type="button"
                          onClick={handleCollapseAll}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold text-white hover:bg-white/20 transition"
                          title="Lipat Semua (Bidang & Sub-Bidang)"
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
                          onClick={handleExpandAll}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold text-white bg-white/20 hover:bg-white/30 transition shadow-2xs"
                          title="Buka Semua Rincian (Bidang & Sub-Bidang)"
                        >
                          <ChevronDown className="w-3 h-3" />
                          <span>Buka Semua</span>
                        </button>
                      </div>

                      {/* Export Spreadsheet (.xlsx) Button */}
                      <button
                        type="button"
                        onClick={handleExportSpreadsheet}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition border border-emerald-400/40 shadow-xs select-none"
                        title="Ekspor ke Dokumen Spreadsheet (.xlsx)"
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Spreadsheet</span>
                      </button>

                      {/* Export CSV Button */}
                      <button
                        type="button"
                        onClick={handleExportCSV}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-bold transition border border-white/30 shadow-xs select-none"
                        title="Ekspor ke CSV"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">CSV</span>
                      </button>

                      {/* Export Print Button */}
                      <button
                        type="button"
                        onClick={handleExportPrint}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-bold transition border border-white/30 shadow-xs select-none"
                        title="Cetak Dokumen"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Cetak</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleSaveTargets}
                        disabled={saveLoading}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-bold transition shadow-xs select-none"
                      >
                        <Save className="w-3.5 h-3.5" />
                        <span>{saveLoading ? 'Menyimpan...' : 'Simpan'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setIsFullscreen(false)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-bold transition border border-white/20 shadow-xs select-none"
                        title="Tutup Mode Layar Penuh (ESC)"
                      >
                        <Minimize2 className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Tutup</span>
                      </button>
                    </div>
                  </div>

                  {/* Table Fullscreen */}
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
                    <table className="w-full text-left border-collapse min-w-[900px]">
                      <thead className="sticky top-0 z-10 shadow-xs bg-[#F3F4F6] text-gray-800 uppercase text-[11px] font-bold tracking-wider border-b border-[#D1D5DB]">
                        {subViewMode === 'plan_checklist' ? (
                          <tr>
                            <th className="py-2.5 px-3 text-center border-r border-[#D1D5DB] w-24">Kode</th>
                            <th className="py-2.5 px-4 border-r border-[#D1D5DB] min-w-[280px]">Program Strategis &amp; Inisiatif Terobosan</th>
                            <th className="py-2.5 px-3 text-center border-r border-[#D1D5DB] w-32">Kategori</th>
                            {displayedYears.map((yr) => {
                              const visibleProgramIds = [];
                              groupedPrograms.forEach((domain) => {
                                domain.subdomainList.forEach((sub) => {
                                  sub.programs.forEach((prog) => {
                                    visibleProgramIds.push(prog.program_id);
                                  });
                                });
                              });
                              const isAllYearChecked = visibleProgramIds.length > 0 && visibleProgramIds.every((pId) => !!programChecklistState[pId]?.[yr]);

                              return (
                                <th
                                  key={yr}
                                  className="py-2 px-1 text-center border-r border-[#D1D5DB] w-28 bg-[#F9FAFB] hover:bg-[#F3F4F6] transition-colors"
                                >
                                  <div className="flex flex-col items-center justify-center gap-1">
                                    <span className="font-mono font-bold text-gray-900 text-xs">{yr}</span>
                                    <button
                                      type="button"
                                      onClick={() => toggleSelectAllYear(yr)}
                                      className={`flex items-center gap-1 px-2 py-0.5 rounded text-[9.5px] font-bold transition select-none ${
                                        isAllYearChecked
                                          ? 'bg-emerald-600 text-white shadow-xs'
                                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                      }`}
                                      title={isAllYearChecked ? `Hapus centang semua untuk TA ${yr}` : `Centang semua program untuk TA ${yr}`}
                                    >
                                      <input
                                        type="checkbox"
                                        checked={isAllYearChecked}
                                        onChange={() => {}}
                                        className="w-3 h-3 text-emerald-600 rounded pointer-events-none"
                                      />
                                      <span>{isAllYearChecked ? 'Semua' : 'Pilih'}</span>
                                    </button>
                                  </div>
                                </th>
                              );
                            })}
                          </tr>
                        ) : (
                          <tr>
                            <th className="py-2.5 px-3 text-center border-r border-[#D1D5DB] w-24">Kode</th>
                            <th className="py-2.5 px-4 border-r border-[#D1D5DB] min-w-[260px]">Sub-Bidang &amp; Sasaran Strategis</th>
                            <th className="py-2.5 px-3 text-center border-r border-[#D1D5DB] w-28">Aspek BSC</th>
                            <th className="py-2.5 px-3 text-right border-r border-[#D1D5DB] w-20">Baseline</th>
                            <th className="py-2.5 px-3 text-right border-r border-[#D1D5DB] w-20">Target</th>
                            {displayedYears.map((yr) => (
                              <th key={yr} className="py-2.5 px-2 text-center border-r border-[#D1D5DB] w-24 font-mono font-bold text-gray-900">
                                {yr} (%)
                              </th>
                            ))}
                          </tr>
                        )}
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {renderMatrixTableBody()}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>,
              document.body
            )}

          {/* TAB CONTENT: PUBLICATIONS HISTORY */}
          {activeTab === 'publications' && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <History className="w-5 h-5 text-indigo-400" />
                  Riwayat Penerbitan Resmi RKJP ({activeRkjp.title})
                </h3>
                <p className="text-xs text-slate-400">
                  Daftar snapshot SK penerbitan resmi yang telah dibekukan
                </p>
              </div>

              <div className="space-y-4">
                {publications.length === 0 ? (
                  <div className="py-8 text-center text-slate-500">
                    Belum ada versi resmi RKJP yang diterbitkan.
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
                              {pub.document_type} v{pub.version_number}
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
                              <FileDown className="w-3.5 h-3.5" />
                              Unduh Dokumen
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
        </>
      ) : (
        /* Empty State */
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center space-y-4 shadow-xl">
          <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto">
            <CalendarRange className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-white">
            Belum Ada Dokumen RKJP untuk {contextType === 'foundation' ? 'Tingkat Yayasan (Gabungan)' : (selectedUnit?.name || 'Satuan Pendidikan')}
          </h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Buat rencana kerja jangka panjang (8 tahun) untuk mengawali pemetaan target tahunan dan otomatis menghasilkan 2 periode RKJM (4 tahun).
          </p>
          <button
            onClick={() => {
              const defaultTitle = contextType === 'foundation'
                ? `RKJP Gabungan Yayasan ${new Date().getFullYear()}-${new Date().getFullYear() + 7}`
                : `RKJP ${selectedUnit?.name || 'Satuan'} ${new Date().getFullYear()}-${new Date().getFullYear() + 7}`;
              setFormData({
                start_year: new Date().getFullYear(),
                title: defaultTitle,
              });
              setModalType('create_rkjp');
            }}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-xs font-bold transition shadow-lg shadow-indigo-950/50"
          >
            <Plus className="w-4 h-4" />
            Buat RKJP Sekarang
          </button>
        </div>
      )}

      {/* MODAL 1: CREATE RKJP */}
      {modalType === 'create_rkjp' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-base font-bold text-white">Buat Dokumen RKJP Baru</h3>
                <p className="text-xs text-slate-400">Atur periode tahun perencanaan (durasi fleksibel)</p>
              </div>
              <button onClick={() => setModalType(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleCreateRkjp} className="space-y-4">
              {/* Rentang Tahun */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Tahun Awal *</label>
                  <input
                    type="number"
                    min="2000"
                    max="2100"
                    value={formData.start_year || ''}
                    onChange={(e) => {
                      const s = Number(e.target.value);
                      const currentDiff = (Number(formData.end_year) || (s + 7)) - (Number(formData.start_year) || s);
                      const newEnd = s + Math.max(0, currentDiff);
                      setFormData(prev => ({
                        ...prev,
                        start_year: s,
                        end_year: newEnd,
                        title: (!prev.title || prev.title.startsWith('RKJP'))
                          ? (contextType === 'foundation' ? `RKJP Gabungan Yayasan ${s}-${newEnd}` : `RKJP ${selectedUnit?.name || 'Satuan'} ${s}-${newEnd}`)
                          : prev.title
                      }));
                    }}
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none focus:border-indigo-500 font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Tahun Akhir *</label>
                  <input
                    type="number"
                    min={formData.start_year || 2000}
                    max="2100"
                    value={formData.end_year || ''}
                    onChange={(e) => {
                      const eVal = Number(e.target.value);
                      const sVal = Number(formData.start_year) || 2026;
                      setFormData(prev => ({
                        ...prev,
                        end_year: eVal,
                        title: (!prev.title || prev.title.startsWith('RKJP'))
                          ? (contextType === 'foundation' ? `RKJP Gabungan Yayasan ${sVal}-${eVal}` : `RKJP ${selectedUnit?.name || 'Satuan'} ${sVal}-${eVal}`)
                          : prev.title
                      }));
                    }}
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none focus:border-indigo-500 font-mono font-bold"
                  />
                </div>
              </div>

              {/* Quick Preset Duration Chips */}
              <div className="space-y-1.5">
                <span className="text-[11px] text-slate-400 font-medium">Pilihan Cepat Durasi:</span>
                <div className="flex flex-wrap items-center gap-1.5">
                  {[4, 5, 6, 7, 8, 10, 12].map((dur) => {
                    const s = Number(formData.start_year) || new Date().getFullYear();
                    const eTarget = s + dur - 1;
                    const isSelected = Number(formData.end_year) === eTarget;
                    return (
                      <button
                        key={dur}
                        type="button"
                        onClick={() => {
                          setFormData(prev => ({
                            ...prev,
                            end_year: eTarget,
                            title: (!prev.title || prev.title.startsWith('RKJP'))
                              ? (contextType === 'foundation' ? `RKJP Gabungan Yayasan ${s}-${eTarget}` : `RKJP ${selectedUnit?.name || 'Satuan'} ${s}-${eTarget}`)
                              : prev.title
                          }));
                        }}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition border ${
                          isSelected
                            ? 'bg-indigo-600 text-white border-indigo-500 shadow-xs'
                            : 'bg-slate-950 text-slate-300 border-slate-800 hover:bg-slate-800 hover:text-white'
                        }`}
                      >
                        {dur} Tahun
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Dynamic RKJM Breakdown Preview */}
              {(() => {
                const s = Number(formData.start_year) || 0;
                const e = Number(formData.end_year) || 0;
                const totalYears = e >= s ? (e - s + 1) : 0;
                const rkjmCount = Math.ceil(totalYears / 4);

                if (totalYears <= 0) return null;

                return (
                  <div className="p-3.5 bg-indigo-950/40 border border-indigo-800/60 rounded-2xl space-y-2 text-xs text-indigo-300">
                    <div className="flex items-center justify-between font-bold text-white">
                      <span>Total Periode: {totalYears} Tahun ({s} - {e})</span>
                      <span className="text-[11px] bg-indigo-600/40 px-2.5 py-0.5 rounded-full border border-indigo-500/40 text-indigo-200">
                        {rkjmCount} Periode RKJM
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                      {Array.from({ length: rkjmCount }).map((_, idx) => {
                        const rStart = s + idx * 4;
                        const rEnd = Math.min(rStart + 3, e);
                        const dur = rEnd - rStart + 1;
                        return (
                          <span key={idx} className="px-2.5 py-1 rounded-lg bg-slate-900 border border-indigo-700/50 text-[11px] font-semibold text-indigo-200">
                            RKJM {toRoman(idx + 1)} ({rStart}-{rEnd} &bull; {dur} Thn)
                          </span>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Judul Dokumen RKJP *</label>
                <input
                  type="text"
                  value={formData.title || ''}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                  placeholder="Contoh: RKJP SMP Aldepos 2026-2033"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none focus:border-indigo-500"
                />
              </div>

              <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setModalType(null)}
                  disabled={formLoading}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition disabled:opacity-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={formLoading || !formData.start_year || !formData.end_year || Number(formData.end_year) < Number(formData.start_year)}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-xs font-bold transition shadow-lg shadow-indigo-950/50 disabled:opacity-60"
                >
                  {formLoading ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-white" />
                      <span>Sedang Memproses RKJP &amp; RKJM...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-3.5 h-3.5" />
                      <span>Buat RKJP &amp; RKJM</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 1.5: EDIT RKJP (TITLE, STATUS & YEAR RANGE) */}
      {modalType === 'edit_rkjp' && editingRkjp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Edit3 className="w-4 h-4 text-indigo-400" />
                  Ubah Dokumen RKJP &amp; Periode Tahun
                </h3>
                <p className="text-xs text-slate-400">Sesuaikan nama, status, atau tambah/kurangi tahun RKJP</p>
              </div>
              <button
                onClick={() => {
                  setModalType(null);
                  setEditingRkjp(null);
                }}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateRkjp} className="space-y-4">
              {/* Rentang Tahun Baru */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Tahun Awal *</label>
                  <input
                    type="number"
                    min="2000"
                    max="2100"
                    value={formData.start_year || ''}
                    onChange={(e) => setFormData({ ...formData, start_year: Number(e.target.value) })}
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none focus:border-indigo-500 font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Tahun Akhir *</label>
                  <input
                    type="number"
                    min={formData.start_year || 2000}
                    max="2100"
                    value={formData.end_year || ''}
                    onChange={(e) => setFormData({ ...formData, end_year: Number(e.target.value) })}
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none focus:border-indigo-500 font-mono font-bold"
                  />
                </div>
              </div>

              {/* Quick Preset Duration Chips */}
              <div className="space-y-1.5">
                <span className="text-[11px] text-slate-400 font-medium">Pilihan Cepat Durasi:</span>
                <div className="flex flex-wrap items-center gap-1.5">
                  {[4, 5, 6, 7, 8, 10, 12].map((dur) => {
                    const s = Number(formData.start_year) || editingRkjp.start_year;
                    const eTarget = s + dur - 1;
                    const isSelected = Number(formData.end_year) === eTarget;
                    return (
                      <button
                        key={dur}
                        type="button"
                        onClick={() => {
                          setFormData(prev => ({
                            ...prev,
                            end_year: eTarget
                          }));
                        }}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition border ${
                          isSelected
                            ? 'bg-indigo-600 text-white border-indigo-500 shadow-xs'
                            : 'bg-slate-950 text-slate-300 border-slate-800 hover:bg-slate-800 hover:text-white'
                        }`}
                      >
                        {dur} Tahun
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Dynamic RKJM Breakdown Preview */}
              {(() => {
                const s = Number(formData.start_year) || 0;
                const e = Number(formData.end_year) || 0;
                const totalYears = e >= s ? (e - s + 1) : 0;
                const rkjmCount = Math.ceil(totalYears / 4);

                if (totalYears <= 0) return null;

                return (
                  <div className="p-3.5 bg-indigo-950/40 border border-indigo-800/60 rounded-2xl space-y-2 text-xs text-indigo-300">
                    <div className="flex items-center justify-between font-bold text-white">
                      <span>Total Periode Baru: {totalYears} Tahun ({s} - {e})</span>
                      <span className="text-[11px] bg-indigo-600/40 px-2.5 py-0.5 rounded-full border border-indigo-500/40 text-indigo-200">
                        {rkjmCount} Periode RKJM
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                      {Array.from({ length: rkjmCount }).map((_, idx) => {
                        const rStart = s + idx * 4;
                        const rEnd = Math.min(rStart + 3, e);
                        const dur = rEnd - rStart + 1;
                        return (
                          <span key={idx} className="px-2.5 py-1 rounded-lg bg-slate-900 border border-indigo-700/50 text-[11px] font-semibold text-indigo-200">
                            RKJM {toRoman(idx + 1)} ({rStart}-{rEnd} &bull; {dur} Thn)
                          </span>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-[11px] text-amber-300 space-y-1">
                <span className="font-bold">Info Sinkronisasi:</span>
                <p>
                  Jika Anda menambah atau mengurangi tahun RKJP, sistem akan otomatis menyesuaikan jumlah dan periode RKJM turunan. Target rencana tahunan yang sudah ada pada tahun yang tetap aktif tidak akan hilang.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Judul Dokumen RKJP *</label>
                <input
                  type="text"
                  value={formData.title || ''}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Status Dokumen</label>
                <SearchableSelect
                  value={formData.status || 'draft'}
                  onChange={(val) => setFormData({ ...formData, status: val })}
                  options={[
                    { value: 'draft', label: 'Draft (Dapat diedit)' },
                    { value: 'published', label: 'Published (Resmi)' },
                    { value: 'archived', label: 'Archived (Arsip)' },
                  ]}
                />
              </div>

              <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setModalType(null);
                    setEditingRkjp(null);
                  }}
                  disabled={formLoading}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition disabled:opacity-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={formLoading || !formData.start_year || !formData.end_year || Number(formData.end_year) < Number(formData.start_year)}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition shadow-lg shadow-indigo-950/50 disabled:opacity-60"
                >
                  {formLoading ? 'Menyimpan...' : 'Simpan Perubahan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: PUBLISH DOCUMENT */}
      {modalType === 'publish' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Send className="w-5 h-5 text-emerald-400" />
                Terbitkan Dokumen Resmi ({formData.plan_type?.toUpperCase()})
              </h3>
              <button onClick={() => setModalType(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300">
              Penerbitan ini akan membekukan (snapshot) target tahunan program pada rentang tahun dokumen ini ke dalam repositori resmi (Document Publications).
            </div>

            <form onSubmit={handlePublishPlan} className="space-y-4">
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
                <label className="block text-xs font-semibold text-slate-300 mb-1">Tanggal Berlaku Efektif</label>
                <DatePickerField
                  value={formData.effective_date || ''}
                  onChange={(iso) => setFormData({ ...formData, effective_date: iso })}
                  required={true}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Ringkasan Perubahan</label>
                <textarea
                  rows={3}
                  value={formData.change_summary || ''}
                  onChange={(e) => setFormData({ ...formData, change_summary: e.target.value })}
                  placeholder="Catatan rilis versi ini..."
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

      {/* MODAL 3: VIEW SNAPSHOT */}
      {modalType === 'view_pub' && selectedPubSnapshot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-5 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 shrink-0">
              <div>
                <h3 className="text-base font-bold text-white">Snapshot Freeze Perencanaan</h3>
                <p className="text-xs text-slate-400">
                  Diterbitkan pada: {new Date(selectedPubSnapshot.published_at).toLocaleString('id-ID')}
                </p>
              </div>
              <button onClick={() => setModalType(null)} className="text-slate-400 hover:text-white font-bold">✕</button>
            </div>

            <div className="overflow-y-auto space-y-4 pr-1 text-xs">
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                <span className="font-bold text-indigo-400 uppercase text-[10px]">Dokumen</span>
                <h4 className="text-sm font-bold text-white">{selectedPubSnapshot.plan?.title}</h4>
                <p className="text-slate-400">
                  Periode: {selectedPubSnapshot.plan?.start_year} - {selectedPubSnapshot.plan?.end_year}
                </p>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-800">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950 text-slate-400 text-[10px] uppercase">
                    <tr>
                      <th className="p-2.5">Program</th>
                      {selectedPubSnapshot.academic_years?.map((yr) => (
                        <th key={yr} className="p-2.5 text-center">{yr}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {selectedPubSnapshot.matrix?.map((row) => (
                      <tr key={row.program_id}>
                        <td className="p-2.5 font-medium text-white">{row.program_code} - {row.program_name}</td>
                        {selectedPubSnapshot.academic_years?.map((yr) => (
                          <td key={yr} className="p-2.5 text-center font-bold text-emerald-400">
                            {row.yearly_targets?.[yr]?.target_percent !== null && row.yearly_targets?.[yr]?.target_percent !== undefined
                              ? `${row.yearly_targets[yr].target_percent}%`
                              : '-'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
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

      {/* Modal Pindahkan Program ke Sub-Bidang Lain */}
      <MoveProgramModal
        isOpen={isMoveProgramModalOpen}
        onClose={() => {
          setIsMoveProgramModalOpen(false);
          setProgramToMove(null);
        }}
        program={programToMove}
        domains={targetsData?.domains || []}
        subdomains={targetsData?.subdomains || []}
        onSuccess={() => {
          if (activeRkjp?.id) fetchPlanDetails(activeRkjp.id);
        }}
      />
    </div>
  );
}
