import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../../../shared/store/AuthContext';
import api from '../../../shared/services/api';
import SearchableSelect from '../../../shared/components/SearchableSelect';
import DatePickerField from '../components/shared/DatePickerField';
import {
  Compass,
  Building2,
  School,
  Plus,
  Edit2,
  Trash2,
  Send,
  History,
  FileText,
  CheckCircle2,
  Layers,
  Sparkles,
  SlidersHorizontal,
  Target,
  FileDown,
  Clock,
  Eye,
  Check,
  Tag,
  BookOpen,
  HelpCircle,
  BarChart3,
  Calendar,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Filter,
  Search,
  Maximize2,
  Minimize2,
  RefreshCw,
  FolderInput,
  X
} from 'lucide-react';
import MoveProgramModal from '../components/shared/MoveProgramModal';

export default function RipsPlanning() {
  const { user, schoolUnits, activeSchoolUnit } = useAuth();

  // Context Switcher: 'foundation' | 'school_unit'
  const [contextType, setContextType] = useState('foundation');
  const [selectedUnitId, setSelectedUnitId] = useState(activeSchoolUnit?.id || (schoolUnits?.[0]?.id || 1));

  // Active Main Tab: 'matrix' | 'programs' | 'publications'
  const [activeTab, setActiveTab] = useState('matrix');

  // Loading & Data States
  const [loading, setLoading] = useState(true);
  const [ripsDoc, setRipsDoc] = useState(null);
  const [goals, setGoals] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [domains, setDomains] = useState([]);
  const [bscAspects, setBscAspects] = useState([]);
  const [programCategories, setProgramCategories] = useState([]);
  const [publications, setPublications] = useState([]);

  // Filters & Search (Matrix Tab)
  const [filterDomain, setFilterDomain] = useState('all');
  const [filterSubdomain, setFilterSubdomain] = useState('all');
  const [filterBsc, setFilterBsc] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Filters & Search (Program & Upaya Strategis Tab)
  const [filterProgramDomain, setFilterProgramDomain] = useState('all');
  const [filterProgramSubdomain, setFilterProgramSubdomain] = useState('all');
  const [programSearchQuery, setProgramSearchQuery] = useState('');
  const [filterProgramFlagship, setFilterProgramFlagship] = useState(false);

  // Hierarchy Tree-View Expansion States
  const [expandedDomains, setExpandedDomains] = useState({});
  const [expandedSubdomains, setExpandedSubdomains] = useState({});
  const [expandedGoals, setExpandedGoals] = useState({}); // goal_id -> boolean (expanded or collapsed)
  const [expandedProgGoalIndicators, setExpandedProgGoalIndicators] = useState({}); // key -> boolean (prog_goal_indicators)
  const [isFullscreenPrograms, setIsFullscreenPrograms] = useState(false);
  const [isFullscreenMatrix, setIsFullscreenMatrix] = useState(false);

  // Inline Quick Add Indicator State
  const [addingIndicatorGoalId, setAddingIndicatorGoalId] = useState(null);
  const [inlineIndicatorForm, setInlineIndicatorForm] = useState({
    name: '',
    unit: '%',
    baseline_percent: 0,
    target_percent: 100,
  });

  // Modals
  const [modalType, setModalType] = useState(null); // 'goal' | 'program' | 'header' | 'publish' | 'view_pub' | 'manage_masters'
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({});
  const [formLoading, setFormLoading] = useState(false);
  const [selectedPubSnapshot, setSelectedPubSnapshot] = useState(null);

  // Program Form Goal & Indicator Live-Search Dropdown State
  const [progGoalSearch, setProgGoalSearch] = useState('');
  const [isGoalDropdownOpen, setIsGoalDropdownOpen] = useState(false);
  const goalDropdownRef = useRef(null);

  // Move Program Modal State
  const [isMoveProgramModalOpen, setIsMoveProgramModalOpen] = useState(false);
  const [programToMove, setProgramToMove] = useState(null);

  const handleOpenMoveProgramModal = (prog) => {
    setProgramToMove(prog);
    setIsMoveProgramModalOpen(true);
  };

  // Close goal dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (goalDropdownRef.current && !goalDropdownRef.current.contains(event.target)) {
        setIsGoalDropdownOpen(false);
      }
    };

    if (isGoalDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isGoalDropdownOpen]);

  // Master domain / subdomain edit states
  const [editingDomain, setEditingDomain] = useState(null);
  const [editingSubdomain, setEditingSubdomain] = useState(null);
  const [newDomainName, setNewDomainName] = useState('');
  const [newSubdomainData, setNewSubdomainData] = useState({ domain_id: '', name: '' });

  // Safe Delete Confirmation Modal State
  const [deleteConfirmModal, setDeleteConfirmModal] = useState({
    isOpen: false,
    type: null, // 'goal' | 'program' | 'domain' | 'subdomain'
    id: null,
    title: '',
    loading: false,
    impact: null,
    deleting: false,
  });

  // Master modal subtab: 'domain' | 'bsc'
  const [masterTab, setMasterTab] = useState('domain');

  // Lock body overflow when fullscreen is active and handle ESC key
  useEffect(() => {
    if (isFullscreenPrograms || isFullscreenMatrix) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';

      const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
          setIsFullscreenPrograms(false);
          setIsFullscreenMatrix(false);
        }
      };

      window.addEventListener('keydown', handleKeyDown);

      return () => {
        document.body.style.overflow = originalOverflow;
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [isFullscreenPrograms, isFullscreenMatrix]);

  // Sync activeSchoolUnit on mount if available, but keep contextType as foundation by default unless user switches
  useEffect(() => {
    if (activeSchoolUnit?.id) {
      setSelectedUnitId(activeSchoolUnit.id);
    }
  }, [activeSchoolUnit]);

  // Safe Delete Request - Analyzes Impact before Confirmation
  const requestDelete = async (type, id, title) => {
    setDeleteConfirmModal({
      isOpen: true,
      type,
      id,
      title,
      loading: true,
      impact: null,
      deleting: false,
    });

    try {
      let endpoint = '';
      if (type === 'domain') endpoint = `/manajemen/rips/domains/${id}/impact`;
      else if (type === 'subdomain') endpoint = `/manajemen/rips/subdomains/${id}/impact`;
      else if (type === 'goal') endpoint = `/manajemen/rips/goals/${id}/impact`;
      else if (type === 'program') endpoint = `/manajemen/rips/programs/${id}/impact`;

      const res = await api.get(endpoint);
      if (res.data?.success) {
        setDeleteConfirmModal((prev) => ({
          ...prev,
          loading: false,
          impact: res.data.data,
        }));
      }
    } catch (err) {
      console.error('Error checking delete impact:', err);
      setDeleteConfirmModal((prev) => ({
        ...prev,
        loading: false,
        impact: { error: err.response?.data?.message || 'Gagal menganalisis dampak penghapusan' },
      }));
    }
  };

  const executeDelete = async () => {
    const { type, id } = deleteConfirmModal;
    setDeleteConfirmModal((prev) => ({ ...prev, deleting: true }));
    try {
      if (type === 'goal') await api.delete(`/manajemen/rips/goals/${id}`);
      else if (type === 'program') await api.delete(`/manajemen/rips/programs/${id}`);
      else if (type === 'domain') await api.delete(`/manajemen/rips/domains/${id}`);
      else if (type === 'subdomain') await api.delete(`/manajemen/rips/subdomains/${id}`);

      setDeleteConfirmModal({ isOpen: false, type: null, id: null, title: '', loading: false, impact: null, deleting: false });
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menghapus data');
      setDeleteConfirmModal((prev) => ({ ...prev, deleting: false }));
    }
  };

  // Fetch all RIPS data
  const fetchData = async () => {
    try {
      setLoading(true);
      const schoolUnitParam = contextType === 'school_unit' && selectedUnitId ? selectedUnitId : '';
      const schoolUnitQuery = schoolUnitParam ? `?school_unit_id=${schoolUnitParam}` : '';
      
      // 1. Get RIPS Header Doc
      const docRes = await api.get(`/manajemen/rips/documents/current${schoolUnitQuery}`);
      let currentDoc = null;
      if (docRes.data?.success && docRes.data.data) {
        currentDoc = docRes.data.data;
        setRipsDoc(currentDoc);
      }

      // 2. Get Domains, BSC Aspects, & Program Categories
      const [domRes, bscRes, catRes] = await Promise.all([
        api.get('/manajemen/rips/domains'),
        api.get('/manajemen/rips/bsc-aspects'),
        api.get('/manajemen/rips/program-categories'),
      ]);
      if (domRes.data?.success) setDomains(domRes.data.data || []);
      if (bscRes.data?.success) setBscAspects(bscRes.data.data || []);
      if (catRes.data?.success) setProgramCategories(catRes.data.data || []);

      // 3. Get Goals & Programs & Publications if doc exists
      if (currentDoc?.id) {
        const [goalRes, progRes, pubRes] = await Promise.all([
          api.get(`/manajemen/rips/goals?rips_document_id=${currentDoc.id}`),
          api.get(`/manajemen/rips/programs?rips_document_id=${currentDoc.id}`),
          api.get(`/manajemen/rips/documents/${currentDoc.id}/publications`),
        ]);
        const fetchedGoals = Array.isArray(goalRes.data?.data) ? goalRes.data.data : (goalRes.data?.data?.items || []);
        const fetchedPrograms = Array.isArray(progRes.data?.data) ? progRes.data.data : (progRes.data?.data?.items || []);
        const fetchedPubs = Array.isArray(pubRes.data?.data) ? pubRes.data.data : (pubRes.data?.data?.items || []);
        setGoals(fetchedGoals);
        setPrograms(fetchedPrograms);
        setPublications(fetchedPubs);
      } else {
        setGoals([]);
        setPrograms([]);
        setPublications([]);
      }
    } catch (err) {
      console.error('Error fetching RIPS data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [contextType, selectedUnitId]);

  // Master Program Categories Handlers
  const handleSaveProgramCategory = async (payload) => {
    try {
      await api.post('/manajemen/rips/program-categories', payload);
      const res = await api.get('/manajemen/rips/program-categories');
      if (res.data?.success) setProgramCategories(res.data.data);
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menambah kategori program');
    }
  };

  const handleUpdateProgramCategory = async (id, payload) => {
    try {
      await api.put(`/manajemen/rips/program-categories/${id}`, payload);
      const res = await api.get('/manajemen/rips/program-categories');
      if (res.data?.success) setProgramCategories(res.data.data);
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal memperbarui kategori program');
    }
  };

  const handleDeleteProgramCategory = async (id) => {
    if (!confirm('Apakah Anda yakin ingin menghapus kategori program ini?')) return;
    try {
      await api.delete(`/manajemen/rips/program-categories/${id}`);
      const res = await api.get('/manajemen/rips/program-categories');
      if (res.data?.success) setProgramCategories(res.data.data);
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menghapus kategori program');
    }
  };

  // Handle Form Submit
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!ripsDoc?.id && modalType !== 'header') return;
    setFormLoading(true);

    try {
      if (modalType === 'header') {
        await api.put(`/manajemen/rips/documents/${ripsDoc.id}`, formData);
      } else if (modalType === 'goal') {
        const payload = { ...formData, rips_document_id: ripsDoc.id };
        if (editingItem) {
          await api.put(`/manajemen/rips/goals/${editingItem.id}`, payload);
        } else {
          await api.post('/manajemen/rips/goals', payload);
        }
      } else if (modalType === 'program') {
        const payload = { ...formData, rips_document_id: ripsDoc.id };
        if (editingItem) {
          await api.put(`/manajemen/rips/programs/${editingItem.id}`, payload);
        } else {
          await api.post('/manajemen/rips/programs', payload);
        }
      } else if (modalType === 'publish') {
        await api.post(`/manajemen/rips/documents/${ripsDoc.id}/publish`, formData);
      }

      setModalType(null);
      setEditingItem(null);
      fetchData();
    } catch (err) {
      console.error('Error saving RIPS item:', err);
      alert(err.response?.data?.message || 'Gagal menyimpan data');
    } finally {
      setFormLoading(false);
    }
  };

  // Delete Action
  const handleDelete = async (type, id) => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus data ini?')) return;
    try {
      if (type === 'goal') await api.delete(`/manajemen/rips/goals/${id}`);
      if (type === 'program') await api.delete(`/manajemen/rips/programs/${id}`);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menghapus data');
    }
  };

  // Master domain / subdomain / BSC handlers
  const handleSaveDomain = async (name, order_index) => {
    try {
      await api.post('/manajemen/rips/domains', { name, order_index });
      const res = await api.get('/manajemen/rips/domains');
      if (res.data?.success) setDomains(res.data.data);
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menambah bidang');
    }
  };

  const handleUpdateDomain = async (id, name, order_index) => {
    try {
      await api.put(`/manajemen/rips/domains/${id}`, { name, order_index });
      setEditingDomain(null);
      const res = await api.get('/manajemen/rips/domains');
      if (res.data?.success) setDomains(res.data.data);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal memperbarui bidang');
    }
  };

  const handleSaveSubdomain = async (domain_id, name, order_index) => {
    try {
      await api.post('/manajemen/rips/subdomains', { domain_id, name, order_index });
      const res = await api.get('/manajemen/rips/domains');
      if (res.data?.success) setDomains(res.data.data);
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menambah sub-bidang');
    }
  };

  const handleUpdateSubdomain = async (id, name, order_index) => {
    try {
      await api.put(`/manajemen/rips/subdomains/${id}`, { name, order_index });
      setEditingSubdomain(null);
      const res = await api.get('/manajemen/rips/domains');
      if (res.data?.success) setDomains(res.data.data);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal memperbarui sub-bidang');
    }
  };

  const handleSaveBscAspect = async (name, description, order_index) => {
    try {
      await api.post('/manajemen/rips/bsc-aspects', { name, description, order_index });
      const res = await api.get('/manajemen/rips/bsc-aspects');
      if (res.data?.success) setBscAspects(res.data.data);
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menambah aspek BSC');
    }
  };



  // Toggle helpers for hierarchy expand/collapse
  // Toggle helpers for hierarchy expand/collapse
  const toggleDomain = (domainKey) => {
    setExpandedDomains((prev) => ({
      ...prev,
      [domainKey]: !prev[domainKey],
    }));
  };

  const toggleSubdomain = (subdomainKey) => {
    setExpandedSubdomains((prev) => ({
      ...prev,
      [subdomainKey]: !prev[subdomainKey],
    }));
  };

  const toggleGoal = (goalId) => {
    setExpandedGoals((prev) => ({
      ...prev,
      [goalId]: !prev[goalId],
    }));
  };

  const toggleProgGoalIndicator = (key) => {
    setExpandedProgGoalIndicators((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // Expand / Collapse All for Tab 1 (Sasaran) & Tab 2 (Program)
  const handleExpandAll = () => {
    const allExpD = {};
    const allExpS = {};
    const allExpG = {};
    const allExpPGI = {};

    groupedHierarchy.forEach((d) => {
      allExpD[`dom_${d.id}`] = true;
      allExpD[`prog_dom_${d.id}`] = true;
      d.subdomainList.forEach((s) => {
        allExpS[`sub_${d.id}_${s.id}`] = true;
        allExpS[`prog_sub_${d.id}_${s.id}`] = true;
        s.goals.forEach((g) => {
          allExpG[g.id] = true;
        });
      });
    });

    groupedPrograms.forEach((d) => {
      allExpD[`dom_${d.id}`] = true;
      allExpD[`prog_dom_${d.id}`] = true;
      d.subdomainList.forEach((s) => {
        allExpS[`sub_${d.id}_${s.id}`] = true;
        allExpS[`prog_sub_${d.id}_${s.id}`] = true;
        s.programs.forEach((p) => {
          (p.linked_goals || []).forEach((g) => {
            allExpPGI[`pgi_${p.id}_${g.goal_id}`] = true;
          });
        });
      });
    });

    setExpandedDomains(allExpD);
    setExpandedSubdomains(allExpS);
    setExpandedGoals(allExpG);
    setExpandedProgGoalIndicators(allExpPGI);
  };

  const handleCollapseAll = () => {
    setExpandedDomains({});
    setExpandedSubdomains({});
    setExpandedGoals({});
    setExpandedProgGoalIndicators({});
  };

  const handleExpandDomainsOnly = () => {
    const allExpD = {};
    groupedHierarchy.forEach((d) => {
      allExpD[`dom_${d.id}`] = true;
      allExpD[`prog_dom_${d.id}`] = true;
    });
    groupedPrograms.forEach((d) => {
      allExpD[`dom_${d.id}`] = true;
      allExpD[`prog_dom_${d.id}`] = true;
    });
    setExpandedDomains(allExpD);
    setExpandedSubdomains({});
    setExpandedGoals({});
    setExpandedProgGoalIndicators({});
  };

  const handleExpandSubdomains = () => {
    const allExpD = {};
    const allExpS = {};
    groupedHierarchy.forEach((d) => {
      allExpD[`dom_${d.id}`] = true;
      allExpD[`prog_dom_${d.id}`] = true;
      d.subdomainList.forEach((s) => {
        allExpS[`sub_${d.id}_${s.id}`] = true;
        allExpS[`prog_sub_${d.id}_${s.id}`] = true;
      });
    });
    groupedPrograms.forEach((d) => {
      allExpD[`dom_${d.id}`] = true;
      allExpD[`prog_dom_${d.id}`] = true;
      d.subdomainList.forEach((s) => {
        allExpS[`sub_${d.id}_${s.id}`] = true;
        allExpS[`prog_sub_${d.id}_${s.id}`] = true;
      });
    });
    setExpandedDomains(allExpD);
    setExpandedSubdomains(allExpS);
    setExpandedGoals({});
    setExpandedProgGoalIndicators({});
  };

  // Inline Indicator Handlers (Direct Table Add & Delete)
  const handleInlineAddIndicator = async (goalId) => {
    if (!inlineIndicatorForm.name.trim()) {
      alert('Nama indikator kinerja wajib diisi');
      return;
    }
    try {
      await api.post(`/manajemen/rips/goals/${goalId}/indicators`, {
        name: inlineIndicatorForm.name.trim(),
        unit: inlineIndicatorForm.unit ? inlineIndicatorForm.unit.trim() : '%',
        baseline_percent: Number(inlineIndicatorForm.baseline_percent || 0),
        target_percent: Number(inlineIndicatorForm.target_percent || 100),
      });
      setInlineIndicatorForm({ name: '', unit: '%', baseline_percent: 0, target_percent: 100 });
      setAddingIndicatorGoalId(null);
      // Auto expand this goal to show the new indicator
      setExpandedGoals((prev) => ({ ...prev, [goalId]: true }));
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menambahkan indikator kinerja');
    }
  };

  const handleInlineDeleteIndicator = async (indicatorId) => {
    if (!confirm('Apakah Anda yakin ingin menghapus indikator kinerja ini?')) return;
    try {
      await api.delete(`/manajemen/rips/indicators/${indicatorId}`);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menghapus indikator kinerja');
    }
  };

  // All available subdomains across domains (used in MoveProgramModal and selects)
  const allSubdomains = React.useMemo(() => {
    const allSubs = [];
    domains.forEach((d) => {
      if (Array.isArray(d.subdomains)) {
        d.subdomains.forEach((s) => {
          allSubs.push({ ...s, domain_id: d.id, domainName: d.name });
        });
      }
    });
    return allSubs;
  }, [domains]);

  // Available Subdomains for Tab 1 (Sasaran Strategis)
  const availableGoalSubdomains = React.useMemo(() => {
    if (filterDomain === 'all') {
      return allSubdomains;
    }
    const d = domains.find((dom) => String(dom.id) === String(filterDomain));
    return d && Array.isArray(d.subdomains) ? d.subdomains : [];
  }, [domains, filterDomain, allSubdomains]);

  // Filtered Goals based on BSC Aspect & Search Query
  const filteredGoals = React.useMemo(() => {
    return goals.filter((g) => {
      // Filter BSC Aspect
      if (filterBsc !== 'all' && String(g.bsc_aspect_id) !== String(filterBsc)) {
        return false;
      }

      // Filter Domain
      if (filterDomain !== 'all' && String(g.domain_id) !== String(filterDomain)) {
        return false;
      }

      // Filter Subdomain
      if (filterSubdomain !== 'all' && String(g.subdomain_id) !== String(filterSubdomain)) {
        return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchTitle = (g.title || '').toLowerCase().includes(q);
        const matchCode = (g.code || '').toLowerCase().includes(q);
        const matchInd = (g.indicator_name || '').toLowerCase().includes(q);
        const matchDesc = (g.description || '').toLowerCase().includes(q);
        const matchBsc = (g.bsc_aspect_name || '').toLowerCase().includes(q);
        const matchDomain = (g.domain_name || '').toLowerCase().includes(q);
        const matchSubdomain = (g.subdomain_name || '').toLowerCase().includes(q);
        const matchIndicators = Array.isArray(g.indicators) && g.indicators.some(
          (ind) => (ind.name || '').toLowerCase().includes(q) || (ind.code || '').toLowerCase().includes(q)
        );
        const matchLinkedProg = Array.isArray(g.linked_programs) && g.linked_programs.some(
          (p) => (p.name || '').toLowerCase().includes(q) || (p.code || '').toLowerCase().includes(q)
        );

        if (!matchTitle && !matchCode && !matchInd && !matchDesc && !matchBsc && !matchDomain && !matchSubdomain && !matchIndicators && !matchLinkedProg) {
          return false;
        }
      }

      return true;
    });
  }, [goals, filterBsc, filterDomain, filterSubdomain, searchQuery]);

  const isFilteringActive = Boolean(
    searchQuery.trim() || filterDomain !== 'all' || filterSubdomain !== 'all' || filterBsc !== 'all'
  );
  const isProgramFilteringActive = Boolean(
    programSearchQuery.trim() || filterProgramDomain !== 'all' || filterProgramSubdomain !== 'all' || filterProgramFlagship
  );

  // Group goals into Bidang (Domain) -> Sub-Bidang (Subdomain) -> Goals (Hierarchy)
  const groupedHierarchy = React.useMemo(() => {
    const domainMap = new Map();

    // 1. Inisialisasi domain yang ada
    domains.forEach((d, dIdx) => {
      const domOrder = d.order_index || (dIdx + 1);
      const subMap = new Map();
      if (Array.isArray(d.subdomains)) {
        d.subdomains.forEach((s, sIdx) => {
          const subOrder = s.order_index || (sIdx + 1);
          subMap.set(s.id, {
            id: s.id,
            name: s.name,
            code: `SUB-${String(subOrder).padStart(2, '0')}`,
            order_index: subOrder,
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

    // 2. Masukkan goals ke domain & subdomain yang sesuai
    filteredGoals.forEach((g) => {
      const dId = g.domain_id || 'unassigned';
      if (!domainMap.has(dId)) {
        domainMap.set(dId, {
          id: dId,
          name: g.domain_name || 'Bidang Lainnya',
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
          name: g.subdomain_name || (subId === 'general' ? 'Umum / Program Operasional' : 'Sub-Bidang'),
          code: `SUB-${subId !== 'general' ? String(subId).padStart(2, '0') : '00'}`,
          order_index: 999,
          goals: [],
        });
      }
      const subObj = domainObj.subdomains.get(subId);
      subObj.goals.push(g);
    });

    // 3. Convert to structured array
    const result = [];
    domainMap.forEach((domainItem) => {
      // If user filtered by domain, only include that domain
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

      // Sembunyikan jika filter subdomain aktif atau search aktif dan tidak ada sasaran
      if ((searchQuery.trim() || filterSubdomain !== 'all' || filterBsc !== 'all') && totalGoalsCount === 0) {
        return;
      }

      result.push({
        ...domainItem,
        subdomainList: subList,
        totalGoals: totalGoalsCount,
      });
    });

    return result.sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
  }, [domains, filteredGoals, filterDomain, filterSubdomain, searchQuery, filterBsc]);

  // Auto-expand all when searching
  useEffect(() => {
    if (searchQuery.trim()) {
      const expD = {};
      const expS = {};
      groupedHierarchy.forEach((d) => {
        expD[`dom_${d.id}`] = true;
        d.subdomainList?.forEach((s) => {
          expS[`sub_${s.id}`] = true;
        });
      });
      setExpandedDomains((prev) => ({ ...prev, ...expD }));
      setExpandedSubdomains((prev) => ({ ...prev, ...expS }));
    }
  }, [searchQuery, groupedHierarchy]);

  // Available subdomains for the Program tab filter based on selected domain
  const availableProgramSubdomains = React.useMemo(() => {
    if (filterProgramDomain === 'all') {
      const allSubs = [];
      domains.forEach((d) => {
        if (Array.isArray(d.subdomains)) {
          d.subdomains.forEach((s) => {
            allSubs.push({ ...s, domainName: d.name });
          });
        }
      });
      return allSubs;
    }
    const d = domains.find((dom) => String(dom.id) === String(filterProgramDomain));
    return d && Array.isArray(d.subdomains) ? d.subdomains : [];
  }, [domains, filterProgramDomain]);

  // Group programs into Bidang (Domain) -> Sub-Bidang (Subdomain) -> Programs
  const groupedPrograms = React.useMemo(() => {
    const domainMap = new Map();

    // 1. Initialize with all existing domains & subdomains
    domains.forEach((d, dIdx) => {
      const domOrder = d.order_index || (dIdx + 1);
      const subMap = new Map();
      if (Array.isArray(d.subdomains)) {
        d.subdomains.forEach((s, sIdx) => {
          const subOrder = s.order_index || (sIdx + 1);
          subMap.set(s.id, {
            id: s.id,
            name: s.name,
            code: `SUB-${String(subOrder).padStart(2, '0')}`,
            order_index: subOrder,
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

    // 2. Filter programs by search query & flagship
    const filteredProgList = programs.filter((p) => {
      if (filterProgramFlagship && !p.is_flagship) return false;
      if (!programSearchQuery.trim()) return true;
      const q = programSearchQuery.toLowerCase();
      const matchName = p.name?.toLowerCase().includes(q);
      const matchCode = p.code?.toLowerCase().includes(q);
      const matchDesc = p.description?.toLowerCase().includes(q);
      const matchCat = p.category_name?.toLowerCase().includes(q);
      const matchGoal = p.linked_goals?.some(
        (g) => g.goal_title?.toLowerCase().includes(q) || g.goal_code?.toLowerCase().includes(q)
      );
      return matchName || matchCode || matchDesc || matchCat || matchGoal;
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

    // 4. Convert to array and filter by filterProgramDomain & filterProgramSubdomain
    const result = [];
    domainMap.forEach((domainItem) => {
      if (filterProgramDomain !== 'all' && String(filterProgramDomain) !== String(domainItem.id)) {
        return;
      }

      const subList = [];
      domainItem.subdomains.forEach((subItem) => {
        if (filterProgramSubdomain !== 'all' && String(filterProgramSubdomain) !== String(subItem.id)) {
          return;
        }
        subList.push(subItem);
      });

      subList.sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
      const totalProgramsCount = subList.reduce((acc, curr) => acc + curr.programs.length, 0);

      // If search or subdomain filter active, only show domains with matching programs or when explicitly selecting this domain
      if ((programSearchQuery.trim() || filterProgramSubdomain !== 'all' || filterProgramFlagship) && totalProgramsCount === 0) {
        return;
      }

      result.push({
        ...domainItem,
        subdomainList: subList,
        totalPrograms: totalProgramsCount,
      });
    });

    return result.sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
  }, [domains, programs, filterProgramDomain, filterProgramSubdomain, programSearchQuery, filterProgramFlagship]);

  const totalFilteredProgramsCount = React.useMemo(() => {
    return groupedPrograms.reduce((acc, d) => acc + (d.totalPrograms || 0), 0);
  }, [groupedPrograms]);

  return (
    <div className="space-y-6 pb-16">
      {/* Top Header Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 relative z-10">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-lg shadow-indigo-950/60 border border-indigo-400/30">
              <Compass className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-2xl font-bold text-white tracking-tight">Rencana Induk Pengembangan Sekolah (RIPS)</h1>
                {ripsDoc?.status === 'published' ? (
                  <div className="flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[10.5px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 uppercase shadow-xs">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Resmi Disahkan (Versi {ripsDoc.current_version})</span>
                    {ripsDoc.sk_number && (
                      <span className="font-mono text-emerald-200 border-l border-emerald-500/40 pl-1.5">
                        SK: {ripsDoc.sk_number}
                      </span>
                    )}
                  </div>
                ) : (
                  <span className="flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[10.5px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 uppercase">
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                    Status: Draf (Belum Disahkan)
                  </span>
                )}
              </div>
              <p className="text-slate-400 text-xs mt-0.5">
                Pengelolaan Visi, Misi, Tujuan Strategis, Matriks Sasaran & Program dengan pengesahan SK resmi dan arsip riwayat terintegrasi
              </p>
            </div>
          </div>

          {/* Controls: Context Selector & Actions */}
          <div className="flex flex-wrap items-center gap-3 self-start lg:self-auto">
            {/* Context Switcher */}
            <div className="flex items-center gap-1 bg-slate-950/80 p-1 rounded-xl border border-slate-800">
              <button
                onClick={() => setContextType('foundation')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  contextType === 'foundation'
                    ? 'bg-emerald-600 text-white shadow-md'
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
                    ? 'bg-emerald-600 text-white shadow-md'
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

            {/* Reload / Refresh Button */}
            <button
              type="button"
              onClick={fetchData}
              disabled={loading}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-semibold border border-slate-700 transition shadow-xs ${
                loading ? 'opacity-60 cursor-not-allowed' : 'active:scale-95'
              }`}
              title="Segarkan / Muat ulang data RIPS dari database"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-indigo-400' : 'text-slate-300'}`} />
              <span>Reload Data</span>
            </button>

            {/* Kelola Visi Misi & Tujuan Button */}
            <button
              onClick={() => {
                setEditingItem(ripsDoc);
                setFormData({
                  name: ripsDoc?.name || '',
                  vision: ripsDoc?.vision || '',
                  mission: ripsDoc?.mission || [],
                  objectives: ripsDoc?.objectives || [],
                  description: ripsDoc?.description || '',
                });
                setModalType('header');
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-semibold transition"
            >
              <Edit2 className="w-3.5 h-3.5" />
              Kelola Visi, Misi & Tujuan
            </button>

            {/* Manage Masters Button */}
            <button
              onClick={() => setModalType('manage_masters')}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold border border-slate-700 transition"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-400" />
              Kelola Master
            </button>

            {/* Publish / Ratify SK Button */}
            <button
              onClick={() => {
                const targetVer = publications.length + 1;
                setFormData({
                  document_number: `SK-RIPS/${new Date().getFullYear()}/V${targetVer}`,
                  title: `${ripsDoc?.name || 'RIPS'} (Versi Resmi ${targetVer})`,
                  effective_date: new Date().toISOString().substring(0, 10),
                  sk_signer_name: contextType === 'foundation' ? 'Ketua Yayasan Aldepos' : 'Kepala Sekolah',
                  sk_signer_position: contextType === 'foundation' ? 'Ketua Dewan Pembina / Pengurus Yayasan' : 'Kepala Satuan Pendidikan',
                  change_summary: '',
                });
                setModalType('publish');
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-600 hover:from-emerald-500 hover:to-emerald-500 text-white text-xs font-bold transition shadow-lg shadow-emerald-950/40"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Sahkan Dokumen Resmi (SK)
            </button>
          </div>
        </div>

        {/* Vision Mission Objectives Banner */}
        {ripsDoc && (
          <div className="mt-6 p-5 rounded-xl bg-slate-950/70 border border-slate-800 grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* VISI */}
            <div className="border-b lg:border-b-0 lg:border-r border-slate-800/80 pb-4 lg:pb-0 lg:pr-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" /> Visi Strategis Lembaga
                </span>
                <span className={`px-2 py-0.5 rounded text-[9.5px] font-extrabold ${ripsDoc.status === 'published' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'}`}>
                  {ripsDoc.status === 'published' ? 'DISAHKAN' : 'DRAF'}
                </span>
              </div>
              <p className="text-xs text-slate-200 font-medium italic leading-relaxed bg-slate-900/60 p-3 rounded-xl border border-slate-800/60">
                "{ripsDoc.vision || 'Visi belum ditentukan'}"
              </p>
              {ripsDoc.sk_number && (
                <div className="text-[11px] text-slate-400 flex items-center gap-1 pt-1">
                  <FileText className="w-3.5 h-3.5 text-indigo-400" />
                  <span>No. SK: <strong className="text-slate-200 font-mono">{ripsDoc.sk_number}</strong></span>
                </div>
              )}
            </div>

            {/* MISI */}
            <div className="border-b lg:border-b-0 lg:border-r border-slate-800/80 pb-4 lg:pb-0 lg:pr-4 space-y-2">
              <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5" /> Misi Kelembagaan ({Array.isArray(ripsDoc.mission) ? ripsDoc.mission.length : 0})
              </span>
              <ul className="space-y-1.5 text-xs text-slate-300 max-h-40 overflow-y-auto pr-1">
                {Array.isArray(ripsDoc.mission) && ripsDoc.mission.length > 0 ? (
                  ripsDoc.mission.map((m, idx) => (
                    <li key={idx} className="flex items-start gap-2 bg-slate-900/60 p-2 rounded-xl border border-slate-800/50">
                      <span className="w-4 h-4 rounded-full bg-indigo-500/20 text-indigo-300 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <span className="leading-snug">{m}</span>
                    </li>
                  ))
                ) : (
                  <li className="text-slate-500 italic">Misi belum ditentukan</li>
                )}
              </ul>
            </div>

            {/* TUJUAN */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5" /> Tujuan Strategis ({Array.isArray(ripsDoc.objectives) ? ripsDoc.objectives.length : 0})
              </span>
              <ul className="space-y-1.5 text-xs text-slate-300 max-h-40 overflow-y-auto pr-1">
                {Array.isArray(ripsDoc.objectives) && ripsDoc.objectives.length > 0 ? (
                  ripsDoc.objectives.map((obj, idx) => (
                    <li key={idx} className="flex items-start gap-2 bg-slate-900/60 p-2 rounded-xl border border-slate-800/50">
                      <span className="w-4 h-4 rounded-full bg-amber-500/20 text-amber-300 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <span className="leading-snug">{obj}</span>
                    </li>
                  ))
                ) : (
                  <li className="text-slate-500 italic">Tujuan strategis belum ditentukan</li>
                )}
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* Main Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('vision_mission')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
            activeTab === 'vision_mission'
              ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 shadow-md shadow-indigo-950/20'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
          }`}
        >
          <Sparkles className="w-4 h-4 text-indigo-400" />
          Visi, Misi & Tujuan
        </button>

        <button
          onClick={() => setActiveTab('matrix')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
            activeTab === 'matrix'
              ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 shadow-md shadow-indigo-950/20'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
          }`}
        >
          <Target className="w-4 h-4" />
          Matriks Sasaran & Indikator ({goals.length})
        </button>

        <button
          onClick={() => setActiveTab('programs')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
            activeTab === 'programs'
              ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 shadow-md shadow-indigo-950/20'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
          }`}
        >
          <Layers className="w-4 h-4" />
          Program & Upaya Strategis ({programs.length})
        </button>

        <button
          onClick={() => setActiveTab('publications')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
            activeTab === 'publications'
              ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 shadow-md shadow-indigo-950/20'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
          }`}
        >
          <History className="w-4 h-4" />
          Riwayat Pengesahan & SK Resmi ({publications.length})
        </button>
      </div>

      {/* TAB 0: KELOLA VISI, MISI & TUJUAN STRATEGIS */}
      {activeTab === 'vision_mission' && (
        <div className="space-y-6">
          {/* Status & Ratification Action Banner */}
          <div className="p-6 rounded-xl bg-slate-900 border border-slate-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-400 uppercase">Status Pengesahan:</span>
                {ripsDoc?.status === 'published' ? (
                  <span className="px-3 py-0.5 rounded-full text-xs font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 inline-flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    DISAHKAN (RESMI)
                  </span>
                ) : (
                  <span className="px-3 py-0.5 rounded-full text-xs font-extrabold bg-amber-500/20 text-amber-300 border border-amber-500/40 inline-flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                    DRAF (BELUM DISAHKAN)
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                {ripsDoc?.status === 'published' 
                  ? `Disahkan berdasarkan SK No: ${ripsDoc.sk_number || '-'} (Versi ${ripsDoc.current_version})` 
                  : 'Dokumen masih dalam tahap penyusunan draf. Lakukan pengesahan SK resmi untuk memberlakukannya.'}
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                onClick={() => {
                  setEditingItem(ripsDoc);
                  setFormData({
                    name: ripsDoc?.name || '',
                    vision: ripsDoc?.vision || '',
                    mission: ripsDoc?.mission || [],
                    objectives: ripsDoc?.objectives || [],
                    description: ripsDoc?.description || '',
                  });
                  setModalType('header');
                }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition shadow-md shadow-indigo-950/40"
              >
                <Edit2 className="w-3.5 h-3.5" />
                Ubah Visi, Misi & Tujuan
              </button>

              <button
                onClick={() => {
                  const targetVer = publications.length + 1;
                  setFormData({
                    document_number: `SK-RIPS/${new Date().getFullYear()}/V${targetVer}`,
                    title: `${ripsDoc?.name || 'RIPS'} (Versi Resmi ${targetVer})`,
                    effective_date: new Date().toISOString().substring(0, 10),
                    sk_signer_name: contextType === 'foundation' ? 'Ketua Yayasan Aldepos' : 'Kepala Sekolah',
                    sk_signer_position: contextType === 'foundation' ? 'Ketua Dewan Pembina / Pengurus Yayasan' : 'Kepala Satuan Pendidikan',
                    change_summary: '',
                  });
                  setModalType('publish');
                }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-md shadow-emerald-950/40"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Sahkan SK Resmi
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Visi Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-400" />
                  Visi Strategis Lembaga
                </h3>
              </div>
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/80">
                <p className="text-sm text-slate-100 font-medium italic leading-relaxed">
                  "{ripsDoc?.vision || 'Visi belum ditentukan'}"
                </p>
              </div>
              <p className="text-[11px] text-slate-400">
                Arah cita-cita luhur dan gambaran masa depan institusi pendidikan yang ingin dicapai bersama.
              </p>
            </div>

            {/* Misi Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-indigo-400" />
                  Misi Lembaga ({Array.isArray(ripsDoc?.mission) ? ripsDoc.mission.length : 0})
                </h3>
              </div>
              <ul className="space-y-2.5">
                {Array.isArray(ripsDoc?.mission) && ripsDoc.mission.length > 0 ? (
                  ripsDoc.mission.map((m, idx) => (
                    <li key={idx} className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-950 border border-slate-800/80 text-xs text-slate-200">
                      <span className="w-5 h-5 rounded-lg bg-indigo-500/20 text-indigo-300 flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <span className="leading-relaxed">{m}</span>
                    </li>
                  ))
                ) : (
                  <li className="text-xs text-slate-500 italic p-4 text-center">Belum ada misi yang ditentukan</li>
                )}
              </ul>
            </div>

            {/* Tujuan Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Target className="w-4 h-4 text-amber-400" />
                  Tujuan Strategis ({Array.isArray(ripsDoc?.objectives) ? ripsDoc.objectives.length : 0})
                </h3>
              </div>
              <ul className="space-y-2.5">
                {Array.isArray(ripsDoc?.objectives) && ripsDoc.objectives.length > 0 ? (
                  ripsDoc.objectives.map((obj, idx) => (
                    <li key={idx} className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-950 border border-slate-800/80 text-xs text-slate-200">
                      <span className="w-5 h-5 rounded-lg bg-amber-500/20 text-amber-300 flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <span className="leading-relaxed">{obj}</span>
                    </li>
                  ))
                ) : (
                  <li className="text-xs text-slate-500 italic p-4 text-center">Belum ada tujuan strategis yang ditentukan</li>
                )}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* TAB 1: MATRIKS SASARAN & INDIKATOR */}
      {activeTab === 'matrix' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl space-y-6">
          {/* Tree-View Hierarchical Matrix Table Card */}
          <div className="bg-white rounded-xl shadow-xl border border-slate-200">
            {/* Header Utama Tabel: Biru Solid (#3B82F6) */}
            <div className="bg-[#3B82F6] px-5 py-3.5 flex flex-col xl:flex-row xl:items-center justify-between gap-3 text-white shrink-0 shadow-md rounded-t-2xl relative z-20">
              {/* Sisi Kiri: Ikon & Judul Tabel */}
              <div className="flex items-center gap-3 shrink-0">
                <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center font-bold shadow-xs">
                  <Compass className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base tracking-wider uppercase">
                    MANAJEMEN STRATEGIS
                  </h3>
                  <p className="text-[11px] text-indigo-100 font-medium">
                    Hierarki Perencanaan: Bidang &gt; Sub-Bidang &gt; Sasaran &amp; Indikator ({filteredGoals.length} Sasaran Terpetakan)
                  </p>
                </div>
              </div>

              {/* Sisi Kanan: Filter Bidang, Filter Aspek BSC, Search, Tambah Bidang, Tambah Sub-Bidang, Tambah Sasaran, Layar Penuh */}
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
                  className="w-44 sm:w-52"
                  menuMinWidth="260px"
                  options={[
                    { value: 'all', label: `Semua Bidang (${domains.length})`, sublabel: 'Tampilkan seluruh bidang' },
                    ...domains.map((d) => ({
                      value: String(d.id),
                      label: d.name,
                      sublabel: `Kode: ${d.code || `BID-${d.order_index || d.id}`}`,
                      badge: d.code || `BID-${d.order_index || d.id}`
                    }))
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
                  className="w-48 sm:w-56"
                  menuMinWidth="260px"
                  options={[
                    {
                      value: 'all',
                      label: `Semua Sub-Bidang (${availableGoalSubdomains.length})`,
                      sublabel: filterDomain === 'all' ? 'Seluruh sub-bidang yayasan' : 'Semua sub-bidang pada bidang ini'
                    },
                    ...availableGoalSubdomains.map((s) => ({
                      value: String(s.id),
                      label: s.name,
                      sublabel: s.domainName ? `Bidang: ${s.domainName}` : `Sub-Bidang ${s.code || ''}`,
                      badge: s.code || undefined
                    }))
                  ]}
                />

                {/* Filter Aspek BSC dengan Live Search & High Visibility */}
                <SearchableSelect
                  value={filterBsc}
                  onChange={(val) => setFilterBsc(val || 'all')}
                  placeholder="Semua Aspek BSC"
                  searchPlaceholder="Cari aspek BSC..."
                  variant="header-white"
                  accentColor="blue"
                  className="w-48 sm:w-56"
                  menuMinWidth="260px"
                  options={[
                    { value: 'all', label: `Semua Aspek BSC (${bscAspects.length})`, sublabel: 'Tampilkan seluruh aspek BSC' },
                    ...bscAspects.map((b) => ({
                      value: String(b.id),
                      label: b.name,
                      sublabel: b.description || `Aspek BSC ${b.name}`,
                      badge: `BSC-${b.order_index || b.id}`
                    }))
                  ]}
                />

                {/* Live Search */}
                <div className="relative flex items-center group">
                  <Search className="w-3.5 h-3.5 text-indigo-200 group-focus-within:text-indigo-600 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none transition-colors duration-200 z-10" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Cari sasaran / bidang..."
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

                {/* Tombol Tambah Bidang */}
                <button
                  type="button"
                  onClick={() => {
                    setNewDomainName('');
                    setModalType('add_domain_quick');
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-bold transition border border-white/25 shadow-xs whitespace-nowrap"
                  title="Tambah Bidang Baru ke Matriks"
                >
                  <Plus className="w-3.5 h-3.5 text-indigo-100" />
                  <span>Tambah Bidang</span>
                </button>

                {/* Tombol Tambah Sub-Bidang */}
                <button
                  type="button"
                  onClick={() => {
                    setNewSubdomainData({ domain_id: domains[0]?.id || '', name: '' });
                    setModalType('add_subdomain_quick');
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-amber-950 text-xs font-bold transition border border-amber-300 shadow-xs whitespace-nowrap"
                  title="Tambah Sub-Bidang Baru ke Matriks"
                >
                  <Plus className="w-3.5 h-3.5 text-amber-900" />
                  <span>Tambah Sub-Bidang</span>
                </button>

                {/* Tombol Tambah Sasaran Baru */}
                <button
                  type="button"
                  onClick={() => {
                    setEditingItem(null);
                    setFormData({
                      domain_id: domains[0]?.id || '',
                      bsc_aspect_id: bscAspects[0]?.id || '',
                      title: '',
                      indicators: [
                        {
                          name: '',
                          unit: '%',
                          baseline_percent: 0,
                          target_percent: 100,
                        }
                      ],
                      status: 'active',
                    });
                    setModalType('goal');
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-extrabold transition shadow-md whitespace-nowrap"
                  title="Tambah Sasaran Baru"
                >
                  <Plus className="w-4 h-4" />
                  <span>Tambah Sasaran Baru</span>
                </button>

                {/* Kontrol Lipat / Buka Hirarki */}
                <div className="flex items-center gap-1 bg-white/15 p-1 rounded-xl border border-white/20">
                  <button
                    type="button"
                    onClick={handleCollapseAll}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/25 text-white text-[11px] font-bold transition shadow-2xs select-none"
                    title="Lipat Semua (Bidang, Sub-Bidang, Sasaran, & Indikator)"
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
                    title="Buka Semua Rincian (Bidang, Sub-Bidang, Sasaran, & Indikator)"
                  >
                    <ChevronDown className="w-3.5 h-3.5" />
                    <span>Buka Semua</span>
                  </button>
                </div>

                {/* Tombol Reload Data */}
                <button
                  type="button"
                  onClick={fetchData}
                  disabled={loading}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-bold transition border border-white/25 shadow-xs select-none whitespace-nowrap"
                  title="Reload / Segarkan Data dari Database"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                  <span className="hidden md:inline">Reload</span>
                </button>

                {/* Tombol Fullscreen */}
                <button
                  type="button"
                  onClick={() => setIsFullscreenMatrix(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-bold transition border border-white/25 shadow-xs select-none ml-1 whitespace-nowrap"
                  title="Tampilkan Matriks Manajemen Strategis dalam Layar Penuh"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Layar Penuh</span>
                </button>
              </div>
            </div>

            {/* Sub-Header Kolom & Isi Tabel */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-[#F3F4F6] text-slate-800 font-bold border-b border-[#D1D5DB]">
                  <tr>
                    <th className="py-2 px-3 w-28 text-center border-r border-[#D1D5DB] text-[11px]">Kode / Bidang</th>
                    <th className="py-2 px-3 border-r border-[#D1D5DB] text-[11px]">Sub-Bidang &amp; Sasaran Strategis</th>
                    <th className="py-2 px-3 w-40 border-r border-[#D1D5DB] text-[11px]">Aspek BSC</th>
                    <th className="py-2 px-3 w-24 text-right border-r border-[#D1D5DB] text-[11px]">Baseline</th>
                    <th className="py-2 px-3 w-24 text-right border-r border-[#D1D5DB] text-[11px]">Target</th>
                    <th className="py-2 px-2 w-16 text-center text-[11px]">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {groupedHierarchy.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-500 bg-white">
                        Belum ada sasaran strategis RIPS yang sesuai filter.
                      </td>
                    </tr>
                  ) : (
                    groupedHierarchy.map((domainItem) => {
                      const domainKey = `dom_${domainItem.id}`;
                      const isDomainExpanded = isFilteringActive ? true : Boolean(expandedDomains[domainKey]);

                      return (
                        <React.Fragment key={domainKey}>
                          {/* LEVEL 1: BIDANG (Padding-y 6-8px, compact badge & button) */}
                          <tr className="bg-[#E5E7EB] border-b border-slate-300 font-bold text-slate-900 transition-colors">
                            <td className="py-1.5 px-3 text-center border-r border-slate-300 font-mono text-[11px] text-indigo-800">
                              {domainItem.code}
                            </td>
                            <td colSpan={4} className="py-1.5 px-3 border-r border-slate-300">
                              <button
                                onClick={() => toggleDomain(domainKey)}
                                className="flex items-center gap-1.5 text-left w-full group focus:outline-none"
                              >
                                <span className="p-0.5 rounded bg-slate-300/70 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                  {isDomainExpanded ? (
                                    <ChevronDown className="w-3.5 h-3.5" />
                                  ) : (
                                    <ChevronRight className="w-3.5 h-3.5" />
                                  )}
                                </span>
                                <span className="text-xs uppercase tracking-wider font-extrabold text-slate-900 group-hover:text-indigo-700 transition-colors">
                                  BIDANG: {domainItem.name}
                                </span>
                                <span className="ml-1.5 px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-slate-300/80 text-slate-700 leading-tight">
                                  {domainItem.totalGoals} Sasaran / {domainItem.subdomainList.length} Sub-Bidang
                                </span>
                              </button>
                            </td>
                            <td className="py-1.5 px-2 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setNewDomainName('');
                                    setModalType('add_domain_quick');
                                  }}
                                  className="p-1 rounded bg-white hover:bg-indigo-100 text-indigo-700 transition shadow-2xs border border-slate-300"
                                  title="Tambah Bidang Baru"
                                >
                                  <Plus className="w-3.5 h-3.5 text-indigo-600" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setNewSubdomainData({ domain_id: domainItem.id !== 'unassigned' ? domainItem.id : (domains[0]?.id || ''), name: '' });
                                    setModalType('add_subdomain_quick');
                                  }}
                                  className="p-1 rounded bg-amber-100 hover:bg-amber-200 text-amber-900 transition shadow-2xs border border-amber-300"
                                  title="Tambah Sub-Bidang di Bidang ini"
                                >
                                  <Plus className="w-3.5 h-3.5 text-amber-800" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingItem(null);
                                    setFormData({
                                      domain_id: domainItem.id !== 'unassigned' ? domainItem.id : (domains[0]?.id || ''),
                                      bsc_aspect_id: bscAspects[0]?.id || '',
                                      title: '',
                                      indicators: [
                                        {
                                          name: '',
                                          unit: '%',
                                          baseline_percent: 0,
                                          target_percent: 100,
                                        }
                                      ],
                                      status: 'active',
                                    });
                                    setModalType('goal');
                                  }}
                                  className="p-1 rounded hover:bg-slate-300 text-slate-700 hover:text-indigo-700 transition"
                                  title="Tambah Sasaran di Bidang ini"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                </button>
                                {domainItem.id !== 'unassigned' && (
                                  <button
                                    onClick={() => requestDelete('domain', domainItem.id, `Bidang [${domainItem.code}] ${domainItem.name}`)}
                                    className="p-1 rounded hover:bg-rose-100 text-slate-400 hover:text-rose-600 transition"
                                    title="Hapus Bidang & Semua Data di Bawahnya"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>

                          {/* LEVEL 2: SUB-BIDANG (Padding-y 6-8px, indentasi rapi, compact badge) */}
                          {isDomainExpanded && (
                            domainItem.subdomainList.length === 0 ? (
                              <tr className="bg-slate-50/70 border-b border-slate-200 text-slate-400 italic text-[11px]">
                                <td className="py-2 px-3 text-center border-r border-slate-200">-</td>
                                <td colSpan={5} className="py-2 px-3 pl-7 border-r border-slate-200">
                                  Belum ada sub-bidang di bidang ini.{' '}
                                  <button
                                    onClick={() => {
                                      setNewSubdomainData({ domain_id: domainItem.id, name: '' });
                                      setModalType('add_subdomain_quick');
                                    }}
                                    className="text-indigo-600 hover:underline font-semibold not-italic ml-1 inline-flex items-center gap-1"
                                  >
                                    <Plus className="w-3 h-3" /> Tambah Sub-Bidang Sekarang
                                  </button>
                                </td>
                                <td className="py-2 px-2 text-center">-</td>
                              </tr>
                            ) : (
                              domainItem.subdomainList.map((subItem) => {
                                const subKey = `sub_${domainItem.id}_${subItem.id}`;
                                const isSubExpanded = isFilteringActive ? true : Boolean(expandedSubdomains[subKey]);

                                return (
                                  <React.Fragment key={subKey}>
                                    <tr className="bg-[#FEF3C7] border-b border-amber-200/80 font-semibold text-amber-950 transition-colors">
                                      <td className="py-1.5 px-3 text-center border-r border-amber-200/80 font-mono text-[11px] text-amber-800">
                                        {subItem.code}
                                      </td>
                                      <td colSpan={4} className="py-1.5 px-3 border-r border-amber-200/80 pl-7">
                                        <button
                                          onClick={() => toggleSubdomain(subKey)}
                                          className="flex items-center gap-1.5 text-left w-full group focus:outline-none"
                                        >
                                          <span className="p-0.5 rounded bg-amber-200 group-hover:bg-amber-600 group-hover:text-white transition-colors">
                                            {isSubExpanded ? (
                                              <ChevronDown className="w-3 h-3" />
                                            ) : (
                                              <ChevronRight className="w-3 h-3" />
                                            )}
                                          </span>
                                          <span className="text-xs font-bold text-amber-900 group-hover:text-amber-700 transition-colors">
                                            Sub-Bidang: {subItem.name}
                                          </span>
                                          <span className="ml-1 text-[10px] text-amber-800/80 font-normal">
                                            ({subItem.goals.length} sasaran program)
                                          </span>
                                        </button>
                                      </td>
                                      <td className="py-1.5 px-2 text-center">
                                        <div className="flex items-center justify-center gap-1">
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setEditingItem(null);
                                              setProgGoalSearch('');
                                              setIsGoalDropdownOpen(false);
                                              const subGoals = subItem.goals || [];
                                              const initialGoal = subGoals.length > 0 ? subGoals[0] : null;
                                              const initialInds = initialGoal ? (initialGoal.indicators || []).map((i) => i.id) : [];
                                              setFormData({
                                                is_flagship: 0,
                                                status: 'active',
                                                category_id: '',
                                                linked_goal_ids: initialGoal ? [initialGoal.id] : [],
                                                linked_indicator_ids: initialInds,
                                              });
                                              setModalType('program');
                                            }}
                                            className="p-1 rounded bg-indigo-100 hover:bg-indigo-200 text-indigo-900 transition shadow-2xs border border-indigo-300"
                                            title="Tambah Program Baru di Sub-Bidang ini"
                                          >
                                            <Plus className="w-3.5 h-3.5 text-indigo-700" />
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setEditingItem(null);
                                              setFormData({
                                                domain_id: domainItem.id !== 'unassigned' ? domainItem.id : (domains[0]?.id || ''),
                                                subdomain_id: subItem.id !== 'general' ? subItem.id : '',
                                                bsc_aspect_id: bscAspects[0]?.id || '',
                                                title: '',
                                                indicators: [
                                                  {
                                                    name: '',
                                                    unit: '%',
                                                    baseline_percent: 0,
                                                    target_percent: 100,
                                                  }
                                                ],
                                                status: 'active',
                                              });
                                              setModalType('goal');
                                            }}
                                            className="p-1 rounded hover:bg-amber-200 text-amber-900 transition"
                                            title="Tambah Sasaran di Sub-Bidang ini"
                                          >
                                            <Plus className="w-3.5 h-3.5" />
                                          </button>
                                          {subItem.id !== 'general' && (
                                            <button
                                              onClick={() => requestDelete('subdomain', subItem.id, `Sub-Bidang [${subItem.code}] ${subItem.name}`)}
                                              className="p-1 rounded hover:bg-rose-100 text-amber-800/60 hover:text-rose-600 transition"
                                              title="Hapus Sub-Bidang & Semua Sasaran di Dalamnya"
                                            >
                                              <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                          )}
                                        </div>
                                      </td>
                                    </tr>

                                    {/* LEVEL 3: PROGRAM & DETAIL INDIKATOR (Padding-y 6-8px, minimized margins, compact pills) */}
                                    {isSubExpanded && (
                                      subItem.goals.length === 0 ? (
                                        <tr className="bg-white border-b border-slate-200 text-slate-400 italic text-[11px]">
                                          <td className="py-2 px-3 text-center border-r border-slate-200">-</td>
                                          <td colSpan={4} className="py-2 px-3 pl-10 border-r border-slate-200">
                                            Belum ada sasaran / program di sub-bidang ini.{' '}
                                            <button
                                              onClick={() => {
                                                setEditingItem(null);
                                                setFormData({
                                                  domain_id: domainItem.id !== 'unassigned' ? domainItem.id : (domains[0]?.id || ''),
                                                  subdomain_id: subItem.id !== 'general' ? subItem.id : '',
                                                  bsc_aspect_id: bscAspects[0]?.id || '',
                                                  title: '',
                                                  indicators: [
                                                    {
                                                      name: '',
                                                      unit: '%',
                                                      baseline_percent: 0,
                                                      target_percent: 100,
                                                    }
                                                  ],
                                                  status: 'active',
                                                });
                                                setModalType('goal');
                                              }}
                                              className="text-indigo-600 hover:underline font-semibold not-italic ml-1 inline-flex items-center gap-1"
                                            >
                                              <Plus className="w-3 h-3" /> Tambah Sasaran
                                            </button>
                                          </td>
                                          <td className="py-2 px-2 text-center">-</td>
                                        </tr>
                                      ) : (
                                        subItem.goals.map((g) => {
                                          const baseVal = g.baseline_percent !== null && g.baseline_percent !== undefined
                                            ? Number(g.baseline_percent).toFixed(2)
                                            : null;
                                          const targetVal = g.target_percent !== null && g.target_percent !== undefined
                                            ? Number(g.target_percent).toFixed(2)
                                            : null;

                                          const hasIndicators = g.indicators && g.indicators.length > 0;
                                          const isGoalExpanded = isFilteringActive ? true : Boolean(expandedGoals[g.id]);
                                          const isAddingHere = addingIndicatorGoalId === g.id;

                                          return (
                                            <tr
                                              key={g.id}
                                              className="bg-white hover:bg-indigo-50/60 border-b border-slate-200 text-slate-800 transition-colors"
                                            >
                                              {/* Kolom Kode: Center Aligned */}
                                              <td className="py-2 px-3 text-center border-r border-slate-200 align-top">
                                                <span className="font-mono text-[10.5px] font-bold px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 inline-block">
                                                  {g.code}
                                                </span>
                                              </td>

                                              {/* Kolom Sasaran & Indikator: Left Aligned, Collapsible & Direct Indicator Add */}
                                              <td className="py-2 px-3 pl-10 border-r border-slate-200 align-top">
                                                <div className="flex items-start justify-between gap-2">
                                                  <div className="flex items-center gap-1.5 flex-1 min-w-0">
                                                    {hasIndicators && (
                                                      <button
                                                        onClick={() => toggleGoal(g.id)}
                                                        className="p-0.5 rounded hover:bg-indigo-100 text-indigo-600 transition shrink-0 mt-0.5"
                                                        title={isGoalExpanded ? 'Lipat Indikator' : 'Buka Indikator'}
                                                      >
                                                        {isGoalExpanded ? (
                                                          <ChevronDown className="w-3.5 h-3.5" />
                                                        ) : (
                                                          <ChevronRight className="w-3.5 h-3.5" />
                                                        )}
                                                      </button>
                                                    )}
                                                    <span className="font-semibold text-slate-900 block text-xs leading-snug">
                                                      {g.title}
                                                    </span>
                                                    {hasIndicators && (
                                                      <button
                                                        onClick={() => toggleGoal(g.id)}
                                                        className="px-1.5 py-0.2 rounded-md text-[9.5px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 leading-tight shrink-0 hover:bg-indigo-100 transition"
                                                      >
                                                        {g.indicators.length} Indikator {isGoalExpanded ? '▲' : '▼'}
                                                      </button>
                                                    )}
                                                  </div>

                                                  {/* Tombol Cepat Tambah Indikator Langsung di Baris Tabel */}
                                                  <button
                                                    onClick={() => {
                                                      if (isAddingHere) {
                                                        setAddingIndicatorGoalId(null);
                                                      } else {
                                                        setAddingIndicatorGoalId(g.id);
                                                        setInlineIndicatorForm({
                                                          name: '',
                                                          unit: '%',
                                                          baseline_percent: 0,
                                                          target_percent: 100,
                                                        });
                                                      }
                                                    }}
                                                    className={`px-2 py-0.5 rounded-md text-[10px] font-bold flex items-center gap-1 transition shrink-0 ${
                                                      isAddingHere
                                                        ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                                        : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200'
                                                    }`}
                                                    title="Tambah Indikator Langsung pada Sasaran ini"
                                                  >
                                                    <Plus className="w-3 h-3" />
                                                    {isAddingHere ? 'Batal' : 'Tambah Indikator'}
                                                  </button>
                                                </div>

                                                {/* Form Input Indikator Langsung di Tabel (Inline Form) */}
                                                {isAddingHere && (
                                                  <div className="mt-2 p-2.5 rounded-xl bg-indigo-50/80 border border-indigo-200 space-y-2 animate-fadeIn">
                                                    <div className="text-[11px] font-bold text-indigo-900 flex items-center justify-between">
                                                      <span>➕ Tambah Indikator Kinerja Baru Langsung di Sasaran Ini</span>
                                                      <span className="text-[10px] text-indigo-600 font-normal">Tekan Simpan untuk memperbarui tabel</span>
                                                    </div>
                                                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                                                      <div className="sm:col-span-6">
                                                        <input
                                                          type="text"
                                                          value={inlineIndicatorForm.name}
                                                          onChange={(e) => setInlineIndicatorForm({ ...inlineIndicatorForm, name: e.target.value })}
                                                          placeholder="Nama Indikator (mis. Persentase kelulusan tahfidz 3 juz)"
                                                          className="w-full bg-white border border-indigo-200 rounded-lg px-2.5 py-1 text-xs text-slate-900 outline-none focus:border-indigo-500 font-medium"
                                                          autoFocus
                                                        />
                                                      </div>
                                                      <div className="sm:col-span-2">
                                                        <input
                                                          type="text"
                                                          value={inlineIndicatorForm.unit}
                                                          onChange={(e) => setInlineIndicatorForm({ ...inlineIndicatorForm, unit: e.target.value })}
                                                          placeholder="Satuan (%)"
                                                          className="w-full bg-white border border-indigo-200 rounded-lg px-2 py-1 text-xs text-slate-900 outline-none focus:border-indigo-500 font-mono"
                                                        />
                                                      </div>
                                                      <div className="sm:col-span-2">
                                                        <input
                                                          type="number"
                                                          step="0.1"
                                                          value={inlineIndicatorForm.baseline_percent}
                                                          onChange={(e) => setInlineIndicatorForm({ ...inlineIndicatorForm, baseline_percent: e.target.value })}
                                                          placeholder="Base (%)"
                                                          title="Baseline Persentase (%)"
                                                          className="w-full bg-white border border-indigo-200 rounded-lg px-2 py-1 text-xs text-slate-900 outline-none focus:border-indigo-500 font-mono"
                                                        />
                                                      </div>
                                                      <div className="sm:col-span-2">
                                                        <input
                                                          type="number"
                                                          step="0.1"
                                                          value={inlineIndicatorForm.target_percent}
                                                          onChange={(e) => setInlineIndicatorForm({ ...inlineIndicatorForm, target_percent: e.target.value })}
                                                          placeholder="Target (%)"
                                                          title="Target Persentase (%)"
                                                          className="w-full bg-white border border-emerald-300 rounded-lg px-2 py-1 text-xs text-emerald-800 outline-none focus:border-emerald-500 font-mono font-bold"
                                                        />
                                                      </div>
                                                    </div>
                                                    <div className="flex justify-end gap-1.5 pt-1">
                                                      <button
                                                        type="button"
                                                        onClick={() => setAddingIndicatorGoalId(null)}
                                                        className="px-2.5 py-1 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 text-[11px] font-semibold transition"
                                                      >
                                                        Batal
                                                      </button>
                                                      <button
                                                        type="button"
                                                        onClick={() => handleInlineAddIndicator(g.id)}
                                                        className="px-3.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold transition shadow-sm"
                                                      >
                                                        Simpan Indikator
                                                      </button>
                                                    </div>
                                                  </div>
                                                )}

                                                {/* Detail Indikator Breakdown jika ada & tidak dilipat */}
                                                {hasIndicators && isGoalExpanded && (
                                                  <div className="mt-1.5 space-y-1 pl-2 border-l-2 border-indigo-200">
                                                    {g.indicators.map((ind, idx) => (
                                                      <div
                                                        key={ind.id || idx}
                                                        className="group/ind px-2 py-0.5 rounded bg-slate-50 hover:bg-indigo-50/80 border border-slate-200 flex items-center justify-between text-[11px] leading-tight transition"
                                                      >
                                                        <span className="text-slate-700 font-medium truncate mr-2 flex items-center gap-1.5">
                                                          <span className="font-mono text-[9.5px] text-indigo-600 font-bold">{ind.code || `IND-${idx + 1}`}</span>
                                                          <span>• {ind.name} ({ind.unit || '%'})</span>
                                                        </span>
                                                        <div className="flex items-center gap-2">
                                                          <span className="font-mono text-[10px] text-slate-500 whitespace-nowrap">
                                                            Base: <strong>{Number(ind.baseline_percent ?? 0).toFixed(2)}%</strong> → Target:{' '}
                                                            <strong className="text-emerald-600">{Number(ind.target_percent ?? 100).toFixed(2)}%</strong>
                                                          </span>
                                                          {ind.id && (
                                                            <button
                                                              type="button"
                                                              onClick={() => handleInlineDeleteIndicator(ind.id)}
                                                              className="opacity-0 group-hover/ind:opacity-100 p-0.5 text-rose-500 hover:text-rose-700 transition"
                                                              title="Hapus Indikator ini"
                                                            >
                                                              <Trash2 className="w-3 h-3" />
                                                            </button>
                                                          )}
                                                        </div>
                                                      </div>
                                                    ))}
                                                  </div>
                                                )}
                                              </td>

                                              {/* Kolom Aspek BSC */}
                                              <td className="py-2 px-3 border-r border-slate-200 align-top">
                                                <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 leading-tight">
                                                  {g.bsc_aspect_name || '-'}
                                                </span>
                                              </td>

                                              {/* Kolom Baseline: Right Aligned */}
                                              <td className="py-2 px-3 text-right font-mono text-xs font-semibold text-slate-700 border-r border-slate-200 align-top">
                                                {g.indicators?.length > 1 ? (
                                                  <span className="text-[10px] text-slate-500 italic">Multi-Indikator</span>
                                                ) : baseVal !== null ? (
                                                  g.indicator_unit && g.indicator_unit !== '%'
                                                    ? `${Number(g.baseline_percent ?? 0)} ${g.indicator_unit}`
                                                    : `${baseVal}%`
                                                ) : (
                                                  '-'
                                                )}
                                              </td>

                                              {/* Kolom Target: Right Aligned */}
                                              <td className="py-2 px-3 text-right font-mono text-xs font-bold text-emerald-700 border-r border-slate-200 align-top">
                                                {g.indicators?.length > 1 ? (
                                                  <span className="text-[10px] text-emerald-600 font-semibold">{g.indicators.length} Indikator</span>
                                                ) : targetVal !== null ? (
                                                  g.indicator_unit && g.indicator_unit !== '%'
                                                    ? `${Number(g.target_percent ?? 100)} ${g.indicator_unit}`
                                                    : `${targetVal}%`
                                                ) : (
                                                  '-'
                                                )}
                                              </td>

                                              {/* Kolom Aksi */}
                                              <td className="py-2 px-2 text-center align-top whitespace-nowrap">
                                                <div className="flex items-center justify-center gap-1">
                                                  <button
                                                    onClick={() => {
                                                      setEditingItem(g);
                                                      setFormData({
                                                        domain_id: g.domain_id,
                                                        subdomain_id: g.subdomain_id || '',
                                                        bsc_aspect_id: g.bsc_aspect_id,
                                                        code: g.code,
                                                        title: g.title,
                                                        indicators: g.indicators && g.indicators.length > 0
                                                          ? g.indicators.map((ind) => ({
                                                              id: ind.id,
                                                              code: ind.code,
                                                              name: ind.name,
                                                              unit: ind.unit || '%',
                                                              baseline_percent: ind.baseline_percent ?? 0,
                                                              target_percent: ind.target_percent ?? 100,
                                                            }))
                                                          : [
                                                              {
                                                                name: g.indicator_name || g.title,
                                                                unit: g.indicator_unit || '%',
                                                                baseline_percent: g.baseline_percent ?? 0,
                                                                target_percent: g.target_percent ?? 100,
                                                              }
                                                            ],
                                                        status: g.status,
                                                      });
                                                      setModalType('goal');
                                                    }}
                                                    className="p-1 rounded-lg bg-slate-100 hover:bg-indigo-100 text-slate-600 hover:text-indigo-700 transition"
                                                    title="Edit Sasaran & Indikator"
                                                  >
                                                    <Edit2 className="w-3.5 h-3.5" />
                                                  </button>
                                                  <button
                                                    onClick={() => requestDelete('goal', g.id, `[${g.code}] ${g.title}`)}
                                                    className="p-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 transition"
                                                    title="Hapus Sasaran"
                                                  >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                  </button>
                                                </div>
                                              </td>
                                            </tr>
                                          );
                                        })
                                      )
                                    )}
                                  </React.Fragment>
                                );
                              })
                            )
                          )}
                        </React.Fragment>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* FULLSCREEN OVERLAY VIA REACT PORTAL DIRECTLY TO DOCUMENT.BODY UNTUK TABEL MANAJEMEN STRATEGIS */}
          {isFullscreenMatrix &&
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
                  {/* Header Utama Tabel di Fullscreen */}
                  <div className="bg-[#3B82F6] px-5 py-3.5 flex flex-col xl:flex-row xl:items-center justify-between gap-3 text-white shrink-0 shadow-md relative z-50">
                    {/* Sisi Kiri: Ikon & Judul Tabel */}
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center font-bold shadow-xs">
                        <Compass className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-extrabold text-sm sm:text-base tracking-wider uppercase">
                            MANAJEMEN STRATEGIS
                          </h3>
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-white/20 text-white uppercase tracking-wider">
                            Full Screen Mode
                          </span>
                        </div>
                        <p className="text-[11px] text-indigo-100 font-medium">
                          Hierarki: Bidang &gt; Sub-Bidang &gt; Sasaran &amp; Indikator ({filteredGoals.length} Sasaran Terpetakan)
                        </p>
                      </div>
                    </div>

                    {/* Sisi Kanan: Filter Bidang, Filter Aspek BSC, Search, Tambah Bidang, Tambah Sub-Bidang, Tambah Sasaran, Tutup Fullscreen */}
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
                        className="w-44 sm:w-52"
                        menuMinWidth="260px"
                        options={[
                          { value: 'all', label: `Semua Bidang (${domains.length})`, sublabel: 'Tampilkan seluruh bidang' },
                          ...domains.map((d) => ({
                            value: String(d.id),
                            label: d.name,
                            sublabel: `Kode: ${d.code || `BID-${d.order_index || d.id}`}`,
                            badge: d.code || `BID-${d.order_index || d.id}`
                          }))
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
                        className="w-48 sm:w-56"
                        menuMinWidth="260px"
                        options={[
                          {
                            value: 'all',
                            label: `Semua Sub-Bidang (${availableGoalSubdomains.length})`,
                            sublabel: filterDomain === 'all' ? 'Seluruh sub-bidang yayasan' : 'Semua sub-bidang pada bidang ini'
                          },
                          ...availableGoalSubdomains.map((s) => ({
                            value: String(s.id),
                            label: s.name,
                            sublabel: s.domainName ? `Bidang: ${s.domainName}` : `Sub-Bidang ${s.code || ''}`,
                            badge: s.code || undefined
                          }))
                        ]}
                      />

                      {/* Filter Aspek BSC dengan Live Search & High Visibility */}
                      <SearchableSelect
                        value={filterBsc}
                        onChange={(val) => setFilterBsc(val || 'all')}
                        placeholder="Semua Aspek BSC"
                        searchPlaceholder="Cari aspek BSC..."
                        variant="header-white"
                        accentColor="blue"
                        className="w-48 sm:w-56"
                        menuMinWidth="260px"
                        options={[
                          { value: 'all', label: `Semua Aspek BSC (${bscAspects.length})`, sublabel: 'Tampilkan seluruh aspek BSC' },
                          ...bscAspects.map((b) => ({
                            value: String(b.id),
                            label: b.name,
                            sublabel: b.description || `Aspek BSC ${b.name}`,
                            badge: `BSC-${b.order_index || b.id}`
                          }))
                        ]}
                      />

                      {/* Live Search */}
                      <div className="relative flex items-center group">
                        <Search className="w-3.5 h-3.5 text-indigo-200 group-focus-within:text-indigo-600 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none transition-colors duration-200 z-10" />
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Cari sasaran / bidang..."
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

                      {/* Tombol Tambah Bidang */}
                      <button
                        type="button"
                        onClick={() => {
                          setNewDomainName('');
                          setModalType('add_domain_quick');
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-bold transition border border-white/25 shadow-xs whitespace-nowrap"
                        title="Tambah Bidang Baru ke Matriks"
                      >
                        <Plus className="w-3.5 h-3.5 text-indigo-100" />
                        <span>Tambah Bidang</span>
                      </button>

                      {/* Tombol Tambah Sub-Bidang */}
                      <button
                        type="button"
                        onClick={() => {
                          setNewSubdomainData({ domain_id: domains[0]?.id || '', name: '' });
                          setModalType('add_subdomain_quick');
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-amber-950 text-xs font-bold transition border border-amber-300 shadow-xs whitespace-nowrap"
                        title="Tambah Sub-Bidang Baru ke Matriks"
                      >
                        <Plus className="w-3.5 h-3.5 text-amber-900" />
                        <span>Tambah Sub-Bidang</span>
                      </button>

                      {/* Tombol Tambah Sasaran Baru */}
                      <button
                        type="button"
                        onClick={() => {
                          setEditingItem(null);
                          setFormData({
                            domain_id: domains[0]?.id || '',
                            bsc_aspect_id: bscAspects[0]?.id || '',
                            title: '',
                            indicators: [
                              {
                                name: '',
                                unit: '%',
                                baseline_percent: 0,
                                target_percent: 100,
                              }
                            ],
                            status: 'active',
                          });
                          setModalType('goal');
                        }}
                        className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-extrabold transition shadow-md whitespace-nowrap"
                        title="Tambah Sasaran Baru"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Tambah Sasaran Baru</span>
                      </button>

                      {/* Kontrol Lipat / Buka Hirarki in Fullscreen */}
                      <div className="flex items-center gap-1 bg-white/10 p-0.5 rounded-xl border border-white/20">
                        <button
                          type="button"
                          onClick={handleCollapseAll}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold text-white hover:bg-white/20 transition"
                          title="Lipat Semua (Bidang, Sub-Bidang, Sasaran, & Indikator)"
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
                          title="Buka Semua Rincian (Bidang, Sub-Bidang, Sasaran, & Indikator)"
                        >
                          <ChevronDown className="w-3 h-3" />
                          <span>Buka Semua</span>
                        </button>
                      </div>

                      {/* Tombol Reload Data */}
                      <button
                        type="button"
                        onClick={fetchData}
                        disabled={loading}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-bold transition border border-white/30 shadow-xs select-none whitespace-nowrap"
                        title="Reload / Segarkan Data dari Database"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                        <span className="hidden md:inline">Reload</span>
                      </button>

                      {/* Tombol Tutup Fullscreen */}
                      <button
                        type="button"
                        onClick={() => setIsFullscreenMatrix(false)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-bold transition border border-white/30 shadow-xs select-none ml-1 whitespace-nowrap"
                        title="Tutup Mode Layar Penuh (ESC)"
                      >
                        <Minimize2 className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Tutup Fullscreen</span>
                      </button>
                    </div>
                  </div>

                  {/* Tabel Fullscreen dengan Scroll Mulus sampai Dasar Viewport */}
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
                    <table className="w-full text-left text-xs border-collapse min-w-[900px]">
                      <thead className="sticky top-0 z-10 shadow-xs bg-[#F3F4F6] text-slate-800 font-bold border-b border-[#D1D5DB]">
                        <tr>
                          <th className="py-2.5 px-3 w-28 text-center border-r border-[#D1D5DB] text-[11px]">Kode / Bidang</th>
                          <th className="py-2.5 px-3 border-r border-[#D1D5DB] text-[11px] min-w-[280px]">Sub-Bidang &amp; Sasaran Strategis</th>
                          <th className="py-2.5 px-3 w-40 border-r border-[#D1D5DB] text-[11px]">Aspek BSC</th>
                          <th className="py-2.5 px-3 w-24 text-right border-r border-[#D1D5DB] text-[11px]">Baseline</th>
                          <th className="py-2.5 px-3 w-24 text-right border-r border-[#D1D5DB] text-[11px]">Target</th>
                          <th className="py-2.5 px-2 w-16 text-center text-[11px]">Aksi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {groupedHierarchy.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="py-8 text-center text-slate-500 bg-white">
                              Belum ada sasaran strategis RIPS yang sesuai filter.
                            </td>
                          </tr>
                        ) : (
                          groupedHierarchy.map((domainItem) => {
                            const domainKey = `dom_${domainItem.id}`;
                            const isDomainExpanded = isFilteringActive ? true : Boolean(expandedDomains[domainKey]);

                            return (
                              <React.Fragment key={domainKey}>
                                {/* LEVEL 1: BIDANG */}
                                <tr className="bg-[#E5E7EB] border-b border-slate-300 font-bold text-slate-900 transition-colors">
                                  <td className="py-1.5 px-3 text-center border-r border-slate-300 font-mono text-[11px] text-indigo-800">
                                    {domainItem.code}
                                  </td>
                                  <td colSpan={4} className="py-1.5 px-3 border-r border-slate-300">
                                    <button
                                      onClick={() => toggleDomain(domainKey)}
                                      className="flex items-center gap-1.5 text-left w-full group focus:outline-none"
                                    >
                                      <span className="p-0.5 rounded bg-slate-300/70 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                        {isDomainExpanded ? (
                                          <ChevronDown className="w-3.5 h-3.5" />
                                        ) : (
                                          <ChevronRight className="w-3.5 h-3.5" />
                                        )}
                                      </span>
                                      <span className="text-xs uppercase tracking-wider font-extrabold text-slate-900 group-hover:text-indigo-700 transition-colors">
                                        BIDANG: {domainItem.name}
                                      </span>
                                      <span className="ml-1.5 px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-slate-300/80 text-slate-700 leading-tight">
                                        {domainItem.totalGoals} Sasaran / {domainItem.subdomainList.length} Sub-Bidang
                                      </span>
                                    </button>
                                  </td>
                                  <td className="py-1.5 px-2 text-center">
                                    <div className="flex items-center justify-center gap-1">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setNewDomainName('');
                                          setModalType('add_domain_quick');
                                        }}
                                        className="p-1 rounded bg-white hover:bg-indigo-100 text-indigo-700 transition shadow-2xs border border-slate-300"
                                        title="Tambah Bidang Baru"
                                      >
                                        <Plus className="w-3.5 h-3.5 text-indigo-600" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setNewSubdomainData({ domain_id: domainItem.id !== 'unassigned' ? domainItem.id : (domains[0]?.id || ''), name: '' });
                                          setModalType('add_subdomain_quick');
                                        }}
                                        className="p-1 rounded bg-amber-100 hover:bg-amber-200 text-amber-900 transition shadow-2xs border border-amber-300"
                                        title="Tambah Sub-Bidang di Bidang ini"
                                      >
                                        <Plus className="w-3.5 h-3.5 text-amber-800" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setEditingItem(null);
                                          setFormData({
                                            domain_id: domainItem.id !== 'unassigned' ? domainItem.id : (domains[0]?.id || ''),
                                            bsc_aspect_id: bscAspects[0]?.id || '',
                                            title: '',
                                            indicators: [
                                              {
                                                name: '',
                                                unit: '%',
                                                baseline_percent: 0,
                                                target_percent: 100,
                                              }
                                            ],
                                            status: 'active',
                                          });
                                          setModalType('goal');
                                        }}
                                        className="p-1 rounded hover:bg-slate-300 text-slate-700 hover:text-indigo-700 transition"
                                        title="Tambah Sasaran di Bidang ini"
                                      >
                                        <Plus className="w-3.5 h-3.5" />
                                      </button>
                                      {domainItem.id !== 'unassigned' && (
                                        <button
                                          onClick={() => requestDelete('domain', domainItem.id, `Bidang [${domainItem.code}] ${domainItem.name}`)}
                                          className="p-1 rounded hover:bg-rose-100 text-slate-400 hover:text-rose-600 transition"
                                          title="Hapus Bidang & Semua Data di Bawahnya"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      )}
                                    </div>
                                  </td>
                                </tr>

                                {/* LEVEL 2: SUB-BIDANG */}
                                {isDomainExpanded && (
                                  domainItem.subdomainList.length === 0 ? (
                                    <tr className="bg-slate-50/70 border-b border-slate-200 text-slate-400 italic text-[11px]">
                                      <td className="py-2 px-3 text-center border-r border-slate-200">-</td>
                                      <td colSpan={5} className="py-2 px-3 pl-7 border-r border-slate-200">
                                        Belum ada sub-bidang di bidang ini.
                                      </td>
                                      <td className="py-2 px-2 text-center">-</td>
                                    </tr>
                                  ) : (
                                    domainItem.subdomainList.map((subItem) => {
                                      const subKey = `sub_${domainItem.id}_${subItem.id}`;
                                      const isSubExpanded = isFilteringActive ? true : Boolean(expandedSubdomains[subKey]);

                                      return (
                                        <React.Fragment key={subKey}>
                                          <tr className="bg-[#FEF3C7] border-b border-amber-200/80 font-semibold text-amber-950 transition-colors">
                                            <td className="py-1.5 px-3 text-center border-r border-amber-200/80 font-mono text-[11px] text-amber-800">
                                              {subItem.code}
                                            </td>
                                            <td colSpan={4} className="py-1.5 px-3 border-r border-amber-200/80 pl-7">
                                              <button
                                                onClick={() => toggleSubdomain(subKey)}
                                                className="flex items-center gap-1.5 text-left w-full group focus:outline-none"
                                              >
                                                <span className="p-0.5 rounded bg-amber-200 group-hover:bg-amber-600 group-hover:text-white transition-colors">
                                                  {isSubExpanded ? (
                                                    <ChevronDown className="w-3 h-3" />
                                                  ) : (
                                                    <ChevronRight className="w-3 h-3" />
                                                  )}
                                                </span>
                                                <span className="text-xs font-bold text-amber-900 group-hover:text-amber-700 transition-colors">
                                                  Sub-Bidang: {subItem.name}
                                                </span>
                                                <span className="ml-1 text-[10px] text-amber-800/80 font-normal">
                                                  ({subItem.goals.length} sasaran program)
                                                </span>
                                              </button>
                                            </td>
                                            <td className="py-1.5 px-2 text-center">
                                              <div className="flex items-center justify-center gap-1">
                                                <button
                                                  type="button"
                                                  onClick={() => {
                                                    setEditingItem(null);
                                                    setProgGoalSearch('');
                                                    setIsGoalDropdownOpen(false);
                                                    const subGoals = subItem.goals || [];
                                                    const initialGoal = subGoals.length > 0 ? subGoals[0] : null;
                                                    const initialInds = initialGoal ? (initialGoal.indicators || []).map((i) => i.id) : [];
                                                    setFormData({
                                                      is_flagship: 0,
                                                      status: 'active',
                                                      category_id: '',
                                                      linked_goal_ids: initialGoal ? [initialGoal.id] : [],
                                                      linked_indicator_ids: initialInds,
                                                    });
                                                    setModalType('program');
                                                  }}
                                                  className="p-1 rounded bg-indigo-100 hover:bg-indigo-200 text-indigo-900 transition shadow-2xs border border-indigo-300"
                                                  title="Tambah Program Baru di Sub-Bidang ini"
                                                >
                                                  <Plus className="w-3.5 h-3.5 text-indigo-700" />
                                                </button>
                                                <button
                                                  type="button"
                                                  onClick={() => {
                                                    setEditingItem(null);
                                                    setFormData({
                                                      domain_id: domainItem.id !== 'unassigned' ? domainItem.id : (domains[0]?.id || ''),
                                                      subdomain_id: subItem.id !== 'general' ? subItem.id : '',
                                                      bsc_aspect_id: bscAspects[0]?.id || '',
                                                      title: '',
                                                      indicators: [
                                                        {
                                                          name: '',
                                                          unit: '%',
                                                          baseline_percent: 0,
                                                          target_percent: 100,
                                                        }
                                                      ],
                                                      status: 'active',
                                                    });
                                                    setModalType('goal');
                                                  }}
                                                  className="p-1 rounded hover:bg-amber-200 text-amber-900 transition"
                                                  title="Tambah Sasaran di Sub-Bidang ini"
                                                >
                                                  <Plus className="w-3.5 h-3.5" />
                                                </button>
                                                {subItem.id !== 'general' && (
                                                  <button
                                                    onClick={() => requestDelete('subdomain', subItem.id, `Sub-Bidang [${subItem.code}] ${subItem.name}`)}
                                                    className="p-1 rounded hover:bg-rose-100 text-amber-800/60 hover:text-rose-600 transition"
                                                    title="Hapus Sub-Bidang & Semua Sasaran di Dalamnya"
                                                  >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                  </button>
                                                )}
                                              </div>
                                            </td>
                                          </tr>

                                          {/* LEVEL 3: PROGRAM & DETAIL INDIKATOR */}
                                          {isSubExpanded && (
                                            subItem.goals.length === 0 ? (
                                              <tr className="bg-white border-b border-slate-200 text-slate-400 italic text-[11px]">
                                                <td className="py-2 px-3 text-center border-r border-slate-200">-</td>
                                                <td colSpan={4} className="py-2 px-3 pl-10 border-r border-slate-200">
                                                  Belum ada sasaran / program di sub-bidang ini.
                                                </td>
                                                <td className="py-2 px-2 text-center">-</td>
                                              </tr>
                                            ) : (
                                              subItem.goals.map((g) => {
                                                const baseVal = g.baseline_percent !== null && g.baseline_percent !== undefined
                                                  ? Number(g.baseline_percent).toFixed(2)
                                                  : null;
                                                const targetVal = g.target_percent !== null && g.target_percent !== undefined
                                                  ? Number(g.target_percent).toFixed(2)
                                                  : null;

                                                const hasIndicators = g.indicators && g.indicators.length > 0;
                                                const isGoalExpanded = isFilteringActive ? true : Boolean(expandedGoals[g.id]);
                                                const isAddingHere = addingIndicatorGoalId === g.id;

                                                return (
                                                  <tr
                                                    key={g.id}
                                                    className="bg-white hover:bg-indigo-50/60 border-b border-slate-200 text-slate-800 transition-colors"
                                                  >
                                                    {/* Kolom Kode */}
                                                    <td className="py-2 px-3 text-center border-r border-slate-200 align-top">
                                                      <span className="font-mono text-[10.5px] font-bold px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 inline-block">
                                                        {g.code}
                                                      </span>
                                                    </td>

                                                    {/* Kolom Sasaran & Indikator */}
                                                    <td className="py-2 px-3 pl-10 border-r border-slate-200 align-top">
                                                      <div className="flex items-start justify-between gap-2">
                                                        <div className="flex items-center gap-1.5 flex-1 min-w-0">
                                                          {hasIndicators && (
                                                            <button
                                                              onClick={() => toggleGoal(g.id)}
                                                              className="p-0.5 rounded hover:bg-indigo-100 text-indigo-600 transition shrink-0 mt-0.5"
                                                              title={isGoalExpanded ? 'Lipat Indikator' : 'Buka Indikator'}
                                                            >
                                                              {isGoalExpanded ? (
                                                                <ChevronDown className="w-3.5 h-3.5" />
                                                              ) : (
                                                                <ChevronRight className="w-3.5 h-3.5" />
                                                              )}
                                                            </button>
                                                          )}
                                                          <span className="font-semibold text-slate-900 block text-xs leading-snug">
                                                            {g.title}
                                                          </span>
                                                          {hasIndicators && (
                                                            <button
                                                              onClick={() => toggleGoal(g.id)}
                                                              className="px-1.5 py-0.2 rounded-md text-[9.5px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 leading-tight shrink-0 hover:bg-indigo-100 transition"
                                                            >
                                                              {g.indicators.length} Indikator {isGoalExpanded ? '▲' : '▼'}
                                                            </button>
                                                          )}
                                                        </div>

                                                        {/* Tombol Cepat Tambah Indikator Langsung */}
                                                        <button
                                                          onClick={() => {
                                                            if (isAddingHere) {
                                                              setAddingIndicatorGoalId(null);
                                                            } else {
                                                              setAddingIndicatorGoalId(g.id);
                                                              setInlineIndicatorForm({
                                                                name: '',
                                                                unit: '%',
                                                                baseline_percent: 0,
                                                                target_percent: 100,
                                                              });
                                                            }
                                                          }}
                                                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold flex items-center gap-1 transition shrink-0 ${
                                                            isAddingHere
                                                              ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                                              : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200'
                                                          }`}
                                                          title="Tambah Indikator Langsung pada Sasaran ini"
                                                        >
                                                          <Plus className="w-3 h-3" />
                                                          {isAddingHere ? 'Batal' : 'Tambah Indikator'}
                                                        </button>
                                                      </div>

                                                      {/* Form Input Indikator Langsung */}
                                                      {isAddingHere && (
                                                        <div className="mt-2 p-2.5 rounded-xl bg-indigo-50/80 border border-indigo-200 space-y-2 animate-fadeIn">
                                                          <div className="text-[11px] font-bold text-indigo-900 flex items-center justify-between">
                                                            <span>➕ Tambah Indikator Kinerja Baru Langsung di Sasaran Ini</span>
                                                            <span className="text-[10px] text-indigo-600 font-normal">Tekan Simpan untuk memperbarui tabel</span>
                                                          </div>
                                                          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                                                            <div className="sm:col-span-6">
                                                              <input
                                                                type="text"
                                                                value={inlineIndicatorForm.name}
                                                                onChange={(e) => setInlineIndicatorForm({ ...inlineIndicatorForm, name: e.target.value })}
                                                                placeholder="Nama Indikator (mis. Persentase kelulusan tahfidz 3 juz)"
                                                                className="w-full bg-white border border-indigo-200 rounded-lg px-2.5 py-1 text-xs text-slate-900 outline-none focus:border-indigo-500 font-medium"
                                                                autoFocus
                                                              />
                                                            </div>
                                                            <div className="sm:col-span-2">
                                                              <input
                                                                type="text"
                                                                value={inlineIndicatorForm.unit}
                                                                onChange={(e) => setInlineIndicatorForm({ ...inlineIndicatorForm, unit: e.target.value })}
                                                                placeholder="Satuan (%)"
                                                                className="w-full bg-white border border-indigo-200 rounded-lg px-2 py-1 text-xs text-slate-900 outline-none focus:border-indigo-500 font-mono"
                                                              />
                                                            </div>
                                                            <div className="sm:col-span-2">
                                                              <input
                                                                type="number"
                                                                step="0.1"
                                                                value={inlineIndicatorForm.baseline_percent}
                                                                onChange={(e) => setInlineIndicatorForm({ ...inlineIndicatorForm, baseline_percent: e.target.value })}
                                                                placeholder="Base (%)"
                                                                title="Baseline Persentase (%)"
                                                                className="w-full bg-white border border-indigo-200 rounded-lg px-2 py-1 text-xs text-slate-900 outline-none focus:border-indigo-500 font-mono"
                                                              />
                                                            </div>
                                                            <div className="sm:col-span-2">
                                                              <input
                                                                type="number"
                                                                step="0.1"
                                                                value={inlineIndicatorForm.target_percent}
                                                                onChange={(e) => setInlineIndicatorForm({ ...inlineIndicatorForm, target_percent: e.target.value })}
                                                                placeholder="Target (%)"
                                                                title="Target Persentase (%)"
                                                                className="w-full bg-white border border-indigo-200 rounded-lg px-2 py-1 text-xs text-emerald-600 outline-none focus:border-indigo-500 font-mono font-bold"
                                                              />
                                                            </div>
                                                          </div>
                                                          <div className="flex items-center justify-end gap-2 pt-1">
                                                            <button
                                                              type="button"
                                                              onClick={() => setAddingIndicatorGoalId(null)}
                                                              className="px-2.5 py-1 rounded-md text-[11px] font-semibold text-slate-600 hover:bg-slate-200 transition"
                                                            >
                                                              Batal
                                                            </button>
                                                            <button
                                                              type="button"
                                                              onClick={() => handleSaveInlineIndicator(g.id)}
                                                              className="px-3 py-1 rounded-md text-[11px] font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow transition"
                                                            >
                                                              Simpan Indikator
                                                            </button>
                                                          </div>
                                                        </div>
                                                      )}

                                                      {/* Daftar Indikator Kuantitatif */}
                                                      {hasIndicators && isGoalExpanded && (
                                                        <div className="mt-1.5 space-y-1 pl-4 border-l-2 border-indigo-200">
                                                          {g.indicators.map((ind, iIdx) => (
                                                            <div
                                                              key={ind.id || iIdx}
                                                              className="flex items-center justify-between gap-2 py-0.5 text-[11px] text-slate-700 bg-slate-50/80 px-2 py-1 rounded border border-slate-200/60"
                                                            >
                                                              <div className="flex items-center gap-1.5 flex-1 min-w-0">
                                                                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
                                                                <span className="font-mono text-[9.5px] text-slate-500 font-semibold shrink-0">
                                                                  {ind.code || `IND-${iIdx + 1}`}:
                                                                </span>
                                                                <span className="truncate">{ind.name}</span>
                                                                <span className="text-[10px] text-slate-500 shrink-0">
                                                                  ({ind.unit || '%'})
                                                                </span>
                                                              </div>

                                                              <div className="flex items-center gap-2 shrink-0">
                                                                <div className="flex items-center gap-1 font-mono text-[10.5px]">
                                                                  <span className="text-slate-500" title="Baseline">
                                                                    {ind.baseline_percent ?? 0}%
                                                                  </span>
                                                                  <span className="text-slate-400">→</span>
                                                                  <span className="font-bold text-emerald-700" title="Target">
                                                                    {ind.target_percent ?? 100}%
                                                                  </span>
                                                                </div>
                                                                <button
                                                                  onClick={() => handleDeleteIndicator(ind.id)}
                                                                  className="text-slate-400 hover:text-rose-600 p-0.5 rounded transition"
                                                                  title="Hapus Indikator Ini"
                                                                >
                                                                  <Trash2 className="w-3 h-3" />
                                                                </button>
                                                              </div>
                                                            </div>
                                                          ))}
                                                        </div>
                                                      )}
                                                    </td>

                                                    {/* Kolom BSC */}
                                                    <td className="py-2 px-3 border-r border-slate-200 align-top">
                                                      <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 leading-snug">
                                                        {g.bsc_aspect_name || 'Umum'}
                                                      </span>
                                                    </td>

                                                    {/* Kolom Baseline */}
                                                    <td className="py-2 px-3 text-right font-mono text-xs border-r border-slate-200 align-top text-slate-600">
                                                      {baseVal ? `${baseVal}%` : '-'}
                                                    </td>

                                                    {/* Kolom Target */}
                                                    <td className="py-2 px-3 text-right font-mono text-xs font-bold text-emerald-700 border-r border-slate-200 align-top">
                                                      {targetVal ? `${targetVal}%` : '-'}
                                                    </td>



                                                    {/* Kolom Aksi */}
                                                    <td className="py-2 px-2 text-center align-top whitespace-nowrap">
                                                      <div className="flex items-center justify-center gap-1">
                                                        <button
                                                          onClick={() => {
                                                            setEditingItem(g);
                                                            setFormData({
                                                              domain_id: g.domain_id,
                                                              subdomain_id: g.subdomain_id || '',
                                                              bsc_aspect_id: g.bsc_aspect_id,
                                                              code: g.code,
                                                              title: g.title,
                                                              indicators: g.indicators && g.indicators.length > 0
                                                                ? g.indicators.map((ind) => ({
                                                                    id: ind.id,
                                                                    code: ind.code,
                                                                    name: ind.name,
                                                                    unit: ind.unit || '%',
                                                                    baseline_percent: ind.baseline_percent ?? 0,
                                                                    target_percent: ind.target_percent ?? 100,
                                                                  }))
                                                                : [
                                                                    {
                                                                      name: g.indicator_name || g.title,
                                                                      unit: g.indicator_unit || '%',
                                                                      baseline_percent: g.baseline_percent ?? 0,
                                                                      target_percent: g.target_percent ?? 100,
                                                                    }
                                                                  ],
                                                              status: g.status,
                                                            });
                                                            setModalType('goal');
                                                          }}
                                                          className="p-1 rounded-lg bg-slate-100 hover:bg-indigo-100 text-slate-600 hover:text-indigo-700 transition"
                                                          title="Edit Sasaran & Indikator"
                                                        >
                                                          <Edit2 className="w-3.5 h-3.5" />
                                                        </button>
                                                        <button
                                                          onClick={() => requestDelete('goal', g.id, `[${g.code}] ${g.title}`)}
                                                          className="p-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 transition"
                                                          title="Hapus Sasaran"
                                                        >
                                                          <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                      </div>
                                                    </td>
                                                  </tr>
                                                );
                                              })
                                            )
                                          )}
                                        </React.Fragment>
                                      );
                                    })
                                  )
                                )}
                              </React.Fragment>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>,
              document.body
            )}
        </div>
      )}

      {/* TAB 2: PROGRAM & UPAYA STRATEGIS (REDESIGNED AS HIGH-DENSITY TABLE) */}
      {activeTab === 'programs' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl space-y-6">
          {/* Program Table Card (Normal Inline Display) */}
          <div className="bg-white rounded-xl shadow-xl border border-slate-200">
            {/* Header Utama Tabel: Biru Solid (#3B82F6) */}
            <div className="bg-[#3B82F6] px-5 py-3.5 flex flex-col xl:flex-row xl:items-center justify-between gap-3 text-white shrink-0 shadow-md rounded-t-2xl relative z-20">
              {/* Sisi Kiri: Ikon & Judul Tabel */}
              <div className="flex items-center gap-3 shrink-0">
                <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center font-bold shadow-xs">
                  <Layers className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base tracking-wider uppercase">
                    PROGRAM STRATEGIS &amp; INISIATIF TEROBOSAN
                  </h3>
                  <p className="text-[11px] text-indigo-100 font-medium">
                    Menampilkan {totalFilteredProgramsCount} dari {programs.length} Program Operasional ({programs.filter(p => p.is_flagship).length} Unggulan)
                  </p>
                </div>
              </div>

              {/* Sisi Kanan: Filter Bidang, Filter Sub-Bidang, Toggle Unggulan, Search, Tambah Program, Layar Penuh */}
              <div className="flex flex-wrap items-center gap-2 text-xs">
                {/* Filter Bidang dengan Live Search & High Visibility */}
                <SearchableSelect
                  value={filterProgramDomain}
                  onChange={(val) => {
                    setFilterProgramDomain(val || 'all');
                    setFilterProgramSubdomain('all');
                  }}
                  placeholder="Semua Bidang"
                  searchPlaceholder="Cari bidang..."
                  variant="header-white"
                  accentColor="blue"
                  className="w-40 sm:w-48"
                  menuMinWidth="260px"
                  options={[
                    { value: 'all', label: `Semua Bidang (${domains.length})`, sublabel: 'Tampilkan seluruh bidang' },
                    ...domains.map((d) => ({
                      value: String(d.id),
                      label: d.name,
                      sublabel: `Kode: ${d.code || `BID-${d.order_index || d.id}`}`,
                      badge: d.code || `BID-${d.order_index || d.id}`
                    }))
                  ]}
                />

                {/* Filter Sub-Bidang dengan Live Search & High Visibility */}
                <SearchableSelect
                  value={filterProgramSubdomain}
                  onChange={(val) => setFilterProgramSubdomain(val || 'all')}
                  placeholder="Semua Sub-Bidang"
                  searchPlaceholder="Cari sub-bidang..."
                  variant="header-white"
                  accentColor="blue"
                  className="w-44 sm:w-52"
                  menuMinWidth="260px"
                  options={[
                    {
                      value: 'all',
                      label: `Semua Sub-Bidang (${availableProgramSubdomains.length})`,
                      sublabel: filterProgramDomain === 'all' ? 'Seluruh sub-bidang yayasan' : 'Semua sub-bidang pada bidang ini'
                    },
                    ...availableProgramSubdomains.map((s) => ({
                      value: String(s.id),
                      label: s.name,
                      sublabel: s.domainName ? `Bidang: ${s.domainName}` : `Sub-Bidang ${s.code || ''}`,
                      badge: s.code || undefined
                    }))
                  ]}
                />

                {/* Filter Tambahan: Flagship Toggle */}
                <button
                  type="button"
                  onClick={() => setFilterProgramFlagship((prev) => !prev)}
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold transition select-none border shadow-xs ${
                    filterProgramFlagship
                      ? 'bg-amber-400 text-amber-950 border-amber-300 shadow-md ring-2 ring-amber-300/40'
                      : 'bg-white/15 hover:bg-white/25 text-white border-white/20'
                  }`}
                  title="Filter hanya program unggulan (Flagship)"
                >
                  <span>⭐</span>
                  <span className="hidden sm:inline">Unggulan</span>
                </button>

                {/* Live Search */}
                <div className="relative flex items-center group">
                  <Search className="w-3.5 h-3.5 text-indigo-200 group-focus-within:text-indigo-600 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none transition-colors duration-200 z-10" />
                  <input
                    type="text"
                    value={programSearchQuery}
                    onChange={(e) => setProgramSearchQuery(e.target.value)}
                    placeholder="Cari program / sasaran..."
                    className="bg-white/15 hover:bg-white/25 focus:bg-white text-white focus:text-slate-800 placeholder-blue-100/70 focus:placeholder-slate-400 text-xs rounded-xl pl-9 pr-8 py-1.5 outline-none transition-all duration-200 border border-white/25 focus:border-white focus:ring-2 focus:ring-white/40 w-40 sm:w-56 font-medium shadow-inner focus:shadow-md"
                  />
                  {programSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setProgramSearchQuery('')}
                      className="absolute right-2 p-1 rounded-full text-indigo-200 hover:text-white focus:text-slate-700 hover:bg-white/20 transition-all z-10"
                      title="Hapus kata kunci pencarian"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {/* Tombol Tambah Program Baru */}
                <button
                  type="button"
                  onClick={() => {
                    setEditingItem(null);
                    setProgGoalSearch('');
                    setIsGoalDropdownOpen(false);
                    setFormData({
                      is_flagship: 0,
                      status: 'active',
                      category_id: '',
                      linked_goal_ids: [],
                      linked_indicator_ids: [],
                    });
                    setModalType('program');
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-extrabold transition shadow-md whitespace-nowrap"
                  title="Tambah Program Baru"
                >
                  <Plus className="w-4 h-4" />
                  <span>Tambah Program</span>
                </button>

                {/* Kontrol Lipat / Buka Hirarki */}
                <div className="flex items-center gap-1 bg-white/15 p-1 rounded-xl border border-white/20">
                  <button
                    type="button"
                    onClick={handleCollapseAll}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/25 text-white text-[11px] font-bold transition shadow-2xs select-none"
                    title="Lipat Semua (Bidang, Sub-Bidang, & Sasaran)"
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
                    title="Buka Semua Rincian (Bidang, Sub-Bidang, & Sasaran)"
                  >
                    <ChevronDown className="w-3.5 h-3.5" />
                    <span>Buka Semua</span>
                  </button>
                </div>

                {/* Tombol Reload Data */}
                <button
                  type="button"
                  onClick={fetchData}
                  disabled={loading}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-bold transition border border-white/30 shadow-xs select-none whitespace-nowrap"
                  title="Reload / Segarkan Data dari Database"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                  <span className="hidden md:inline">Reload</span>
                </button>

                {/* Tombol Layar Penuh */}
                <button
                  type="button"
                  onClick={() => setIsFullscreenPrograms(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-bold transition border border-white/30 shadow-xs select-none ml-1 whitespace-nowrap"
                  title="Mode Layar Penuh"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Layar Penuh</span>
                </button>
              </div>
            </div>

            {/* Table Element (Normal Card) */}
            <div className="overflow-x-auto bg-white">
              <table className="w-full text-left border-collapse min-w-[900px]">
                <thead className="sticky top-0 z-10 shadow-xs">
                  <tr className="bg-[#F3F4F6] text-slate-800 uppercase text-[11px] font-bold tracking-wider border-b border-[#D1D5DB]">
                    <th className="py-2.5 px-3 text-center border-r border-[#D1D5DB] w-24">Kode</th>
                    <th className="py-2.5 px-4 border-r border-[#D1D5DB] min-w-[240px]">Nama Program &amp; Deskripsi</th>
                    <th className="py-2.5 px-3 text-center border-r border-[#D1D5DB] w-32">Kategori</th>
                    <th className="py-2.5 px-4 border-r border-[#D1D5DB] min-w-[280px]">Sasaran Terkait (Linked Goals)</th>
                    <th className="py-2.5 px-3 text-center border-r border-[#D1D5DB] w-24">Status</th>
                    <th className="py-2.5 px-2 text-center w-20">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {groupedPrograms.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-10 text-center text-slate-500 bg-white">
                        Belum ada program strategis yang ditambahkan. Klik tombol <strong>"+ Tambah Program Baru"</strong> di atas.
                      </td>
                    </tr>
                  ) : (
                    groupedPrograms.map((domain) => {
                      const domainKey = `prog_dom_${domain.id}`;
                      const isDomainExpanded = isProgramFilteringActive ? true : Boolean(expandedDomains[domainKey]);

                      return (
                        <React.Fragment key={domain.id}>
                          {/* LEVEL 1: BIDANG (DOMAIN) */}
                          <tr className="bg-[#E5E7EB] hover:bg-[#D1D5DB]/80 transition-colors border-y-2 border-slate-300">
                            <td colSpan={6} className="py-2 px-3">
                              <div className="flex items-center justify-between">
                                <button
                                  type="button"
                                  onClick={() => toggleDomain(domainKey)}
                                  className="flex items-center gap-2 text-left text-xs font-bold text-slate-900 focus:outline-none select-none"
                                >
                                  {isDomainExpanded ? (
                                    <ChevronDown className="w-4 h-4 text-slate-700 shrink-0" />
                                  ) : (
                                    <ChevronRight className="w-4 h-4 text-slate-700 shrink-0" />
                                  )}
                                  <span className="font-mono text-indigo-700 text-[11px] bg-white px-1.5 py-0.5 rounded border border-slate-300">
                                    {domain.code}
                                  </span>
                                  <span className="tracking-wide uppercase font-extrabold">{domain.name}</span>
                                  <span className="text-[11px] font-medium text-slate-600 ml-1">
                                    ({domain.totalPrograms || 0} Program)
                                  </span>
                                </button>

                                {/* Direct Action Buttons on Domain Row */}
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setNewDomainName('');
                                      setModalType('add_domain_quick');
                                    }}
                                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/90 hover:bg-white text-indigo-900 border border-indigo-200 text-[11px] font-bold transition shadow-xs"
                                    title="Tambah Bidang Baru"
                                  >
                                    <Plus className="w-3.5 h-3.5 text-indigo-600" />
                                    <span>Tambah Bidang</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setNewSubdomainData({ domain_id: domain.id !== 'unassigned' ? domain.id : (domains[0]?.id || ''), name: '' });
                                      setModalType('add_subdomain_quick');
                                    }}
                                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-400 hover:bg-amber-300 text-amber-950 text-[11px] font-bold transition shadow-xs"
                                    title={`Tambah Sub-Bidang di bawah Bidang ${domain.name}`}
                                  >
                                    <Plus className="w-3.5 h-3.5 text-amber-900" />
                                    <span>Tambah Sub-Bidang</span>
                                  </button>
                                </div>
                              </div>
                            </td>
                          </tr>

                          {/* LEVEL 2 & 3: SUB-BIDANG & PROGRAMS */}
                          {isDomainExpanded && (
                            domain.subdomainList.length === 0 ? (
                              <tr className="bg-white">
                                <td colSpan={6} className="py-2 px-8 text-xs text-slate-400 italic">
                                  Belum ada sub-bidang atau program di bidang ini.
                                </td>
                              </tr>
                            ) : (
                              domain.subdomainList.map((sub) => {
                                const subKey = `prog_sub_${domain.id}_${sub.id}`;
                                const isSubExpanded = isProgramFilteringActive ? true : Boolean(expandedSubdomains[subKey]);

                                return (
                                  <React.Fragment key={sub.id}>
                                    {/* LEVEL 2: SUB-BIDANG (SUBDOMAIN) */}
                                    <tr className="bg-[#FEF3C7] hover:bg-[#FDE68A] transition-colors border-b border-amber-200/80">
                                      <td colSpan={6} className="py-1.5 px-3 pl-6">
                                        <div className="flex items-center justify-between">
                                          <button
                                            type="button"
                                            onClick={() => toggleSubdomain(subKey)}
                                            className="flex items-center gap-2 text-left text-xs font-bold text-amber-950 focus:outline-none select-none"
                                          >
                                            {isSubExpanded ? (
                                              <ChevronDown className="w-3.5 h-3.5 text-amber-800 shrink-0" />
                                            ) : (
                                              <ChevronRight className="w-3.5 h-3.5 text-amber-800 shrink-0" />
                                            )}
                                            <span className="font-mono text-[10px] text-amber-900 bg-amber-200/80 px-1.5 py-0.5 rounded font-semibold border border-amber-300">
                                              {sub.code}
                                            </span>
                                            <span>{sub.name}</span>
                                            <span className="text-[10px] font-medium text-amber-800/80 ml-1">
                                              ({sub.programs?.length || 0} Program)
                                            </span>
                                          </button>

                                          {/* Direct Action Button on Subdomain Row to Add Program */}
                                          <div className="flex items-center gap-1.5 shrink-0">
                                            <button
                                              type="button"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setEditingItem(null);
                                                setProgGoalSearch('');
                                                setIsGoalDropdownOpen(false);
                                                const domainGoals = goals.filter((g) => {
                                                  const matchDomain = g.domain_id === domain.id;
                                                  const matchSub = sub.id !== 'general' ? g.subdomain_id === sub.id : true;
                                                  return matchDomain && matchSub;
                                                });
                                                const initialGoal = domainGoals.length > 0 ? domainGoals[0] : null;
                                                const initialInds = initialGoal ? (initialGoal.indicators || []).map((i) => i.id) : [];
                                                setFormData({
                                                  is_flagship: 0,
                                                  status: 'active',
                                                  category_id: '',
                                                  linked_goal_ids: initialGoal ? [initialGoal.id] : [],
                                                  linked_indicator_ids: initialInds,
                                                });
                                                setModalType('program');
                                              }}
                                              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold transition shadow-xs"
                                              title={`Tambah Program Baru di Sub-Bidang ${sub.name}`}
                                            >
                                              <Plus className="w-3.5 h-3.5" />
                                              <span>Tambah Program</span>
                                            </button>
                                          </div>
                                        </div>
                                      </td>
                                    </tr>

                                    {/* LEVEL 3: PROGRAM LIST */}
                                    {isSubExpanded && (
                                      sub.programs.length === 0 ? (
                                        <tr className="bg-white">
                                          <td colSpan={6} className="py-2 px-12 text-xs text-slate-400 italic">
                                            Belum ada program strategis pada sub-bidang ini.
                                          </td>
                                        </tr>
                                      ) : (
                                        sub.programs.map((p) => {
                                          const isFlagship = p.is_flagship === 1 || p.is_flagship === true;
                                          const hasLinks = p.linked_goals && p.linked_goals.length > 0;

                                          return (
                                            <tr
                                              key={p.id}
                                              className={`hover:bg-indigo-50/50 transition-colors ${
                                                isFlagship ? 'bg-amber-50/30' : 'bg-white'
                                              }`}
                                            >
                                              {/* Kode Program */}
                                              <td className="py-2 px-3 text-center border-r border-slate-200 align-middle">
                                                <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 inline-block">
                                                  {p.code}
                                                </span>
                                              </td>

                                              {/* Nama Program (Satu Baris, Sejajar / Masuk dari Sub-Bidang) */}
                                              <td className="py-2 px-3 pl-8 sm:pl-9 border-r border-slate-200 align-middle">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                  <span className="font-bold text-slate-900 text-xs leading-snug">
                                                    {p.name}
                                                  </span>
                                                  {isFlagship && (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.2 rounded-full text-[9.5px] font-extrabold bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs shrink-0">
                                                      ⭐ Flagship
                                                    </span>
                                                  )}
                                                </div>
                                              </td>

                                              {/* Kategori */}
                                              <td className="py-2.5 px-3 text-center border-r border-slate-200 align-top">
                                                {p.category_name ? (
                                                  <span 
                                                    style={{ 
                                                      color: p.category_color || '#2563EB',
                                                      backgroundColor: p.category_bg_color || '#EFF6FF',
                                                      borderColor: p.category_border_color || '#BFDBFE'
                                                    }}
                                                    className="inline-block px-2.5 py-0.5 rounded-md text-[10px] font-bold border whitespace-nowrap shadow-2xs"
                                                  >
                                                    {p.category_name}
                                                  </span>
                                                ) : isFlagship ? (
                                                  <span className="inline-block px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 whitespace-nowrap">
                                                    Program Unggulan
                                                  </span>
                                                ) : (
                                                  <span className="inline-block px-2.5 py-0.5 rounded-md text-[10px] font-medium bg-slate-100 text-slate-700 border border-slate-200 whitespace-nowrap">
                                                    Reguler
                                                  </span>
                                                )}
                                              </td>

                                              {/* Sasaran Terkait & Indikator Terkait */}
                                              <td className="py-2.5 px-4 border-r border-slate-200 align-top">
                                                {hasLinks ? (
                                                  <div className="space-y-2">
                                                    {p.linked_goals.map((lg) => {
                                                      const indKey = `ind_${p.id}_${lg.goal_id}`;
                                                      const isIndExpanded = isProgramFilteringActive ? true : Boolean(expandedProgGoalIndicators[indKey]);
                                                      const indCount = lg.indicators?.length || 0;

                                                      return (
                                                        <div
                                                          key={lg.goal_id}
                                                          className="p-2 rounded-xl bg-slate-50 border border-slate-200/90 space-y-1.5"
                                                        >
                                                          {/* Sasaran Header */}
                                                          <div className="flex items-start justify-between gap-1.5">
                                                            <div className="flex items-start gap-1.5">
                                                              <span className="font-mono text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-800 border border-indigo-200 shrink-0">
                                                                {lg.goal_code}
                                                              </span>
                                                              <span className="text-[11px] font-bold text-slate-900 leading-snug">
                                                                {lg.goal_title}
                                                              </span>
                                                            </div>

                                                            {indCount > 0 && (
                                                              <button
                                                                type="button"
                                                                onClick={() => toggleProgGoalIndicator(indKey)}
                                                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9.5px] font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition shrink-0 select-none"
                                                                title={isIndExpanded ? 'Lipat Indikator' : 'Buka Indikator'}
                                                              >
                                                                <span>{indCount} Indikator</span>
                                                                {isIndExpanded ? (
                                                                  <ChevronDown className="w-3 h-3 text-indigo-600" />
                                                                ) : (
                                                                  <ChevronRight className="w-3 h-3 text-indigo-600" />
                                                                )}
                                                              </button>
                                                            )}
                                                          </div>

                                                          {/* Indikator Terkait (Collapsible) */}
                                                          {isIndExpanded && (
                                                            indCount > 0 ? (
                                                              <div className="pl-3 border-l-2 border-indigo-200 space-y-1 mt-1 animate-fadeIn">
                                                                <span className="text-[9.5px] uppercase font-bold text-slate-500 block">
                                                                  Indikator Kinerja Sasaran:
                                                                </span>
                                                                {lg.indicators.map((ind) => (
                                                                  <div
                                                                    key={ind.id}
                                                                    className="flex items-start justify-between gap-2 text-[10.5px] text-slate-700 bg-white px-2 py-1 rounded-md border border-gray-150 shadow-2xs"
                                                                  >
                                                                    <div className="flex items-start gap-1 leading-tight">
                                                                      <span className="text-indigo-600 font-bold">•</span>
                                                                      <span>{ind.name}</span>
                                                                    </div>
                                                                    <span className="font-mono text-[10px] text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 shrink-0">
                                                                      Target: {ind.target_percent}{ind.unit || '%'}
                                                                    </span>
                                                                  </div>
                                                                ))}
                                                              </div>
                                                            ) : (
                                                              <span className="text-[10px] text-slate-400 italic block pl-3">
                                                                (Belum ada indikator terdaftar)
                                                              </span>
                                                            )
                                                          )}
                                                        </div>
                                                      );
                                                    })}
                                                  </div>
                                                ) : (
                                                  <span className="text-slate-400 text-[11px] italic">
                                                    Belum terhubung ke sasaran strategis
                                                  </span>
                                                )}
                                              </td>

                                              {/* Status */}
                                              <td className="py-2.5 px-3 text-center border-r border-slate-200 align-top">
                                                <span
                                                  className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold capitalize ${
                                                    p.status === 'active'
                                                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                                      : 'bg-slate-100 text-slate-600 border border-slate-300'
                                                  }`}
                                                >
                                                  {p.status || 'Active'}
                                                </span>
                                              </td>

                                              {/* Aksi */}
                                              <td className="py-2.5 px-2 text-center align-top whitespace-nowrap">
                                                <div className="flex items-center justify-center gap-1">
                                                  <button
                                                    type="button"
                                                    onClick={() => handleOpenMoveProgramModal(p)}
                                                    className="p-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 transition"
                                                    title="Pindahkan Program ke Sub-Bidang Lain"
                                                  >
                                                    <FolderInput className="w-3.5 h-3.5" />
                                                  </button>
                                                  <button
                                                    onClick={() => {
                                                      setEditingItem(p);
                                                      setProgGoalSearch('');
                                                      setIsGoalDropdownOpen(false);
                                                      setFormData({
                                                        code: p.code,
                                                        name: p.name,
                                                        description: p.description,
                                                        category_id: p.category_id !== null && p.category_id !== undefined ? String(p.category_id) : '',
                                                        is_flagship: p.is_flagship,
                                                        status: p.status,
                                                        linked_goal_ids: p.linked_goals?.map((g) => g.goal_id) || [],
                                                        linked_indicator_ids: p.linked_indicator_ids || p.linked_goals?.flatMap((g) => (g.indicators || []).map((i) => i.id)) || [],
                                                      });
                                                      setModalType('program');
                                                    }}
                                                    className="p-1 rounded-lg bg-slate-100 hover:bg-indigo-100 text-slate-600 hover:text-indigo-700 transition"
                                                    title="Edit Program"
                                                  >
                                                    <Edit2 className="w-3.5 h-3.5" />
                                                  </button>
                                                  <button
                                                    onClick={() => requestDelete('program', p.id, `[${p.code}] ${p.name}`)}
                                                    className="p-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 transition"
                                                    title="Hapus Program"
                                                  >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                  </button>
                                                </div>
                                              </td>
                                            </tr>
                                          );
                                        })
                                      )
                                    )}
                                  </React.Fragment>
                                );
                              })
                            )
                          )}
                        </React.Fragment>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* FULLSCREEN OVERLAY VIA REACT PORTAL DIRECTLY TO DOCUMENT.BODY */}
          {isFullscreenPrograms &&
            typeof document !== 'undefined' &&
            (() => {
              console.log('[Portal Debug] Fullscreen Program Portal rendered at:', new Date().toISOString());
              return createPortal(
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
                    boxSizing: 'border-box'
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
                      minHeight: 0 
                    }}
                    className="bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden"
                  >
                    {/* Header Utama Tabel di Fullscreen */}
                    <div className="bg-[#3B82F6] px-5 py-3.5 flex flex-col xl:flex-row xl:items-center justify-between gap-3 text-white shrink-0 shadow-md relative z-50">
                      {/* Sisi Kiri: Ikon & Judul Tabel */}
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center font-bold shadow-xs">
                          <Layers className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-extrabold text-sm sm:text-base tracking-wider uppercase">
                              PROGRAM STRATEGIS &amp; INISIATIF TEROBOSAN
                            </h3>
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-white/20 text-white uppercase tracking-wider">
                              Full Screen Mode
                            </span>
                          </div>
                          <p className="text-[11px] text-indigo-100 font-medium">
                            Menampilkan {totalFilteredProgramsCount} dari {programs.length} Program Operasional ({programs.filter((p) => p.is_flagship).length} Unggulan)
                          </p>
                        </div>
                      </div>

                      {/* Sisi Kanan: Filter Bidang, Filter Sub-Bidang, Toggle Unggulan, Search, Tambah Program, Tutup Fullscreen */}
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        {/* Filter Bidang dengan Live Search & High Visibility */}
                        <SearchableSelect
                          value={filterProgramDomain}
                          onChange={(val) => {
                            setFilterProgramDomain(val || 'all');
                            setFilterProgramSubdomain('all');
                          }}
                          placeholder="Semua Bidang"
                          searchPlaceholder="Cari bidang..."
                          variant="header-white"
                          accentColor="blue"
                          className="w-40 sm:w-48"
                          menuMinWidth="260px"
                          options={[
                            { value: 'all', label: `Semua Bidang (${domains.length})`, sublabel: 'Tampilkan seluruh bidang' },
                            ...domains.map((d) => ({
                              value: String(d.id),
                              label: d.name,
                              sublabel: `Kode: ${d.code || `BID-${d.order_index || d.id}`}`,
                              badge: d.code || `BID-${d.order_index || d.id}`
                            }))
                          ]}
                        />

                        {/* Filter Sub-Bidang dengan Live Search & High Visibility */}
                        <SearchableSelect
                          value={filterProgramSubdomain}
                          onChange={(val) => setFilterProgramSubdomain(val || 'all')}
                          placeholder="Semua Sub-Bidang"
                          searchPlaceholder="Cari sub-bidang..."
                          variant="header-white"
                          accentColor="blue"
                          className="w-44 sm:w-52"
                          menuMinWidth="260px"
                          options={[
                            {
                              value: 'all',
                              label: `Semua Sub-Bidang (${availableProgramSubdomains.length})`,
                              sublabel: filterProgramDomain === 'all' ? 'Seluruh sub-bidang yayasan' : 'Semua sub-bidang pada bidang ini'
                            },
                            ...availableProgramSubdomains.map((s) => ({
                              value: String(s.id),
                              label: s.name,
                              sublabel: s.domainName ? `Bidang: ${s.domainName}` : `Sub-Bidang ${s.code || ''}`,
                              badge: s.code || undefined
                            }))
                          ]}
                        />

                        {/* Filter Tambahan: Flagship Toggle */}
                        <button
                          type="button"
                          onClick={() => setFilterProgramFlagship((prev) => !prev)}
                          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold transition select-none border shadow-xs ${
                            filterProgramFlagship
                              ? 'bg-amber-400 text-amber-950 border-amber-300 shadow-md ring-2 ring-amber-300/40'
                              : 'bg-white/15 hover:bg-white/25 text-white border-white/20'
                          }`}
                          title="Filter hanya program unggulan (Flagship)"
                        >
                          <span>⭐</span>
                          <span className="hidden sm:inline">Unggulan</span>
                        </button>

                        {/* Live Search */}
                        <div className="relative flex items-center group">
                          <Search className="w-3.5 h-3.5 text-indigo-200 group-focus-within:text-indigo-600 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none transition-colors duration-200 z-10" />
                          <input
                            type="text"
                            value={programSearchQuery}
                            onChange={(e) => setProgramSearchQuery(e.target.value)}
                            placeholder="Cari program / sasaran..."
                            className="bg-white/15 hover:bg-white/25 focus:bg-white text-white focus:text-slate-800 placeholder-blue-100/70 focus:placeholder-slate-400 text-xs rounded-xl pl-9 pr-8 py-1.5 outline-none transition-all duration-200 border border-white/25 focus:border-white focus:ring-2 focus:ring-white/40 w-40 sm:w-56 font-medium shadow-inner focus:shadow-md"
                          />
                          {programSearchQuery && (
                            <button
                              type="button"
                              onClick={() => setProgramSearchQuery('')}
                              className="absolute right-2 p-1 rounded-full text-indigo-200 hover:text-white focus:text-slate-700 hover:bg-white/20 transition-all z-10"
                              title="Hapus kata kunci pencarian"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          )}
                        </div>

                        {/* Tombol Tambah Program Baru */}
                        <button
                          type="button"
                          onClick={() => {
                            setEditingItem(null);
                            setProgGoalSearch('');
                            setIsGoalDropdownOpen(false);
                            setFormData({
                              is_flagship: 0,
                              status: 'active',
                              category_id: '',
                              linked_goal_ids: [],
                              linked_indicator_ids: [],
                            });
                            setModalType('program');
                          }}
                          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-extrabold transition shadow-md whitespace-nowrap"
                          title="Tambah Program Baru"
                        >
                          <Plus className="w-4 h-4" />
                          <span>Tambah Program</span>
                        </button>

                        {/* Kontrol Lipat / Buka Hirarki in Fullscreen */}
                        <div className="flex items-center gap-1 bg-white/10 p-0.5 rounded-xl border border-white/20">
                          <button
                            type="button"
                            onClick={handleCollapseAll}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold text-white hover:bg-white/20 transition"
                            title="Lipat Semua (Bidang, Sub-Bidang, & Sasaran)"
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
                            title="Buka Semua Rincian (Bidang, Sub-Bidang, & Sasaran)"
                          >
                            <ChevronDown className="w-3 h-3" />
                            <span>Buka Semua</span>
                          </button>
                        </div>

                        {/* Tombol Reload Data */}
                        <button
                          type="button"
                          onClick={fetchData}
                          disabled={loading}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-bold transition border border-white/30 shadow-xs select-none whitespace-nowrap"
                          title="Reload / Segarkan Data dari Database"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                          <span className="hidden md:inline">Reload</span>
                        </button>

                        {/* Tombol Tutup Fullscreen */}
                        <button
                          type="button"
                          onClick={() => setIsFullscreenPrograms(false)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-bold transition border border-white/30 shadow-xs select-none ml-1 whitespace-nowrap"
                          title="Tutup Mode Layar Penuh (ESC)"
                        >
                          <Minimize2 className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Tutup Fullscreen</span>
                        </button>
                      </div>
                    </div>

                    {/* Tabel Fullscreen dengan Scroll Mulus sampai Dasar Viewport */}
                    <div 
                      style={{ 
                        flex: '1 1 auto', 
                        height: '100%', 
                        minHeight: 0, 
                        overflowY: 'auto', 
                        overflowX: 'auto' 
                      }}
                      className="bg-white"
                    >
                    <table className="w-full text-left border-collapse min-w-[900px]">
                      <thead className="sticky top-0 z-10 shadow-xs">
                        <tr className="bg-[#F3F4F6] text-slate-800 uppercase text-[11px] font-bold tracking-wider border-b border-[#D1D5DB]">
                          <th className="py-2.5 px-3 text-center border-r border-[#D1D5DB] w-24">Kode</th>
                          <th className="py-2.5 px-4 border-r border-[#D1D5DB] min-w-[240px]">Nama Program &amp; Deskripsi</th>
                          <th className="py-2.5 px-3 text-center border-r border-[#D1D5DB] w-32">Kategori</th>
                          <th className="py-2.5 px-4 border-r border-[#D1D5DB] min-w-[280px]">Sasaran Terkait (Linked Goals)</th>
                          <th className="py-2.5 px-3 text-center border-r border-[#D1D5DB] w-24">Status</th>
                          <th className="py-2.5 px-2 text-center w-20">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {groupedPrograms.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="py-10 text-center text-slate-500 bg-white">
                              Belum ada program strategis yang ditambahkan.
                            </td>
                          </tr>
                        ) : (
                          groupedPrograms.map((domain) => {
                            const domainKey = `prog_dom_${domain.id}`;
                            const isDomainExpanded = isProgramFilteringActive ? true : Boolean(expandedDomains[domainKey]);

                            return (
                              <React.Fragment key={domain.id}>
                                {/* LEVEL 1: BIDANG */}
                                <tr className="bg-[#E5E7EB] hover:bg-[#D1D5DB]/80 transition-colors border-y-2 border-slate-300">
                                  <td colSpan={6} className="py-2 px-3">
                                    <div className="flex items-center justify-between">
                                      <button
                                        type="button"
                                        onClick={() => toggleDomain(domainKey)}
                                        className="flex items-center gap-2 text-left text-xs font-bold text-slate-900 focus:outline-none select-none"
                                      >
                                        {isDomainExpanded ? (
                                          <ChevronDown className="w-4 h-4 text-slate-700 shrink-0" />
                                        ) : (
                                          <ChevronRight className="w-4 h-4 text-slate-700 shrink-0" />
                                        )}
                                        <span className="font-mono text-indigo-700 text-[11px] bg-white px-1.5 py-0.5 rounded border border-slate-300">
                                          {domain.code}
                                        </span>
                                        <span className="tracking-wide uppercase font-extrabold">{domain.name}</span>
                                        <span className="text-[11px] font-medium text-slate-600 ml-1">
                                          ({domain.totalPrograms || 0} Program)
                                        </span>
                                      </button>
                                      
                                      {/* Direct Action Buttons on Domain Row */}
                                      <div className="flex items-center gap-1.5 shrink-0">
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setNewDomainName('');
                                            setModalType('add_domain_quick');
                                          }}
                                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/90 hover:bg-white text-indigo-900 border border-indigo-200 text-[11px] font-bold transition shadow-xs"
                                          title="Tambah Bidang Baru"
                                        >
                                          <Plus className="w-3.5 h-3.5 text-indigo-600" />
                                          <span>Tambah Bidang</span>
                                        </button>
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setNewSubdomainData({ domain_id: domain.id !== 'unassigned' ? domain.id : (domains[0]?.id || ''), name: '' });
                                            setModalType('add_subdomain_quick');
                                          }}
                                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-400 hover:bg-amber-300 text-amber-950 text-[11px] font-bold transition shadow-xs"
                                          title={`Tambah Sub-Bidang di bawah Bidang ${domain.name}`}
                                        >
                                          <Plus className="w-3.5 h-3.5 text-amber-900" />
                                          <span>Tambah Sub-Bidang</span>
                                        </button>
                                      </div>
                                    </div>
                                  </td>
                                </tr>

                                {/* LEVEL 2 & 3: SUB-BIDANG & PROGRAMS */}
                                {isDomainExpanded &&
                                  domain.subdomainList.map((sub) => {
                                    const subKey = `prog_sub_${domain.id}_${sub.id}`;
                                    const isSubExpanded = isProgramFilteringActive ? true : Boolean(expandedSubdomains[subKey]);

                                    return (
                                      <React.Fragment key={sub.id}>
                                        {/* LEVEL 2: SUB-BIDANG */}
                                        <tr className="bg-[#FEF3C7] hover:bg-[#FDE68A] transition-colors border-b border-amber-200/80">
                                          <td colSpan={6} className="py-1.5 px-3 pl-6">
                                            <div className="flex items-center justify-between">
                                              <button
                                                type="button"
                                                onClick={() => toggleSubdomain(subKey)}
                                                className="flex items-center gap-2 text-left text-xs font-bold text-amber-950 focus:outline-none select-none"
                                              >
                                                {isSubExpanded ? (
                                                  <ChevronDown className="w-3.5 h-3.5 text-amber-800 shrink-0" />
                                                ) : (
                                                  <ChevronRight className="w-3.5 h-3.5 text-amber-800 shrink-0" />
                                                )}
                                                <span className="font-mono text-[10px] text-amber-900 bg-amber-200/80 px-1.5 py-0.5 rounded font-semibold border border-amber-300">
                                                  {sub.code}
                                                </span>
                                                <span>{sub.name}</span>
                                                <span className="text-[10px] font-medium text-amber-800/80 ml-1">
                                                  ({sub.programs?.length || 0} Program)
                                                </span>
                                              </button>

                                              {/* Direct Action Button on Subdomain Row to Add Program */}
                                              <div className="flex items-center gap-1.5 shrink-0">
                                                <button
                                                  type="button"
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    setEditingItem(null);
                                                    setProgGoalSearch('');
                                                    setIsGoalDropdownOpen(false);
                                                    const domainGoals = goals.filter((g) => {
                                                      const matchDomain = g.domain_id === domain.id;
                                                      const matchSub = sub.id !== 'general' ? g.subdomain_id === sub.id : true;
                                                      return matchDomain && matchSub;
                                                    });
                                                    const initialGoal = domainGoals.length > 0 ? domainGoals[0] : null;
                                                    const initialInds = initialGoal ? (initialGoal.indicators || []).map((i) => i.id) : [];
                                                    setFormData({
                                                      is_flagship: 0,
                                                      status: 'active',
                                                      category_id: '',
                                                      linked_goal_ids: initialGoal ? [initialGoal.id] : [],
                                                      linked_indicator_ids: initialInds,
                                                    });
                                                    setModalType('program');
                                                  }}
                                                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold transition shadow-xs"
                                                  title={`Tambah Program Baru di Sub-Bidang ${sub.name}`}
                                                >
                                                  <Plus className="w-3.5 h-3.5" />
                                                  <span>Tambah Program</span>
                                                </button>
                                              </div>
                                            </div>
                                          </td>
                                        </tr>

                                        {/* LEVEL 3: PROGRAM LIST */}
                                        {isSubExpanded &&
                                          sub.programs.map((p) => {
                                            const isFlagship = p.is_flagship === 1 || p.is_flagship === true;
                                            const hasLinks = p.linked_goals && p.linked_goals.length > 0;

                                            return (
                                              <tr
                                                key={p.id}
                                                className={`hover:bg-indigo-50/50 transition-colors ${
                                                  isFlagship ? 'bg-amber-50/30' : 'bg-white'
                                                }`}
                                              >
                                                {/* Kode */}
                                                <td className="py-2.5 px-3 text-center border-r border-slate-200 align-top pl-8">
                                                  <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 inline-block">
                                                    {p.code}
                                                  </span>
                                                </td>

                                                {/* Nama Program */}
                                                <td className="py-2.5 px-4 border-r border-slate-200 align-top">
                                                  <div className="space-y-1">
                                                    <div className="flex items-center gap-2">
                                                      <span className="font-bold text-slate-900 text-xs leading-snug">
                                                        {p.name}
                                                      </span>
                                                      {isFlagship && (
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.2 rounded-full text-[9.5px] font-extrabold bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs shrink-0">
                                                          ⭐ Flagship
                                                        </span>
                                                      )}
                                                    </div>
                                                    {p.description && (
                                                      <p className="text-[11px] text-slate-600 leading-relaxed">
                                                        {p.description}
                                                      </p>
                                                    )}
                                                  </div>
                                                </td>

                                                {/* Kategori */}
                                                <td className="py-2.5 px-3 text-center border-r border-slate-200 align-top">
                                                  {p.category_name ? (
                                                    <span 
                                                      style={{ 
                                                        color: p.category_color || '#2563EB',
                                                        backgroundColor: p.category_bg_color || '#EFF6FF',
                                                        borderColor: p.category_border_color || '#BFDBFE'
                                                      }}
                                                      className="inline-block px-2.5 py-0.5 rounded-md text-[10px] font-bold border whitespace-nowrap shadow-2xs"
                                                    >
                                                      {p.category_name}
                                                    </span>
                                                  ) : isFlagship ? (
                                                    <span className="inline-block px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 whitespace-nowrap">
                                                      Program Unggulan
                                                    </span>
                                                  ) : (
                                                    <span className="inline-block px-2.5 py-0.5 rounded-md text-[10px] font-medium bg-slate-100 text-slate-700 border border-slate-200 whitespace-nowrap">
                                                      Reguler
                                                    </span>
                                                  )}
                                                </td>

                                                {/* Sasaran & Indikator (Collapsible) */}
                                                <td className="py-2.5 px-4 border-r border-slate-200 align-top">
                                                  {hasLinks ? (
                                                    <div className="space-y-2">
                                                      {p.linked_goals.map((lg) => {
                                                        const indKey = `ind_${p.id}_${lg.goal_id}`;
                                                        const isIndExpanded = isProgramFilteringActive ? true : Boolean(expandedProgGoalIndicators[indKey]);
                                                        const indCount = lg.indicators?.length || 0;

                                                        return (
                                                          <div
                                                            key={lg.goal_id}
                                                            className="p-2 rounded-xl bg-slate-50 border border-slate-200/90 space-y-1.5"
                                                          >
                                                            <div className="flex items-start justify-between gap-1.5">
                                                              <div className="flex items-start gap-1.5">
                                                                <span className="font-mono text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-800 border border-indigo-200 shrink-0">
                                                                  {lg.goal_code}
                                                                </span>
                                                                <span className="text-[11px] font-bold text-slate-900 leading-snug">
                                                                  {lg.goal_title}
                                                                </span>
                                                              </div>

                                                              {indCount > 0 && (
                                                                <button
                                                                  type="button"
                                                                  onClick={() => toggleProgGoalIndicator(indKey)}
                                                                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9.5px] font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition shrink-0 select-none"
                                                                  title={isIndExpanded ? 'Lipat Indikator' : 'Buka Indikator'}
                                                                >
                                                                  <span>{indCount} Indikator</span>
                                                                  {isIndExpanded ? (
                                                                    <ChevronDown className="w-3 h-3 text-indigo-600" />
                                                                  ) : (
                                                                    <ChevronRight className="w-3 h-3 text-indigo-600" />
                                                                  )}
                                                                </button>
                                                              )}
                                                            </div>

                                                            {/* Indikator Terkait */}
                                                            {isIndExpanded && (
                                                              indCount > 0 ? (
                                                                <div className="pl-3 border-l-2 border-indigo-200 space-y-1 mt-1 animate-fadeIn">
                                                                  <span className="text-[9.5px] uppercase font-bold text-slate-500 block">
                                                                    Indikator Kinerja Sasaran:
                                                                  </span>
                                                                  {lg.indicators.map((ind) => (
                                                                    <div
                                                                      key={ind.id}
                                                                      className="flex items-start justify-between gap-2 text-[10.5px] text-slate-700 bg-white px-2 py-1 rounded-md border border-gray-150 shadow-2xs"
                                                                    >
                                                                      <div className="flex items-start gap-1 leading-tight">
                                                                        <span className="text-indigo-600 font-bold">•</span>
                                                                        <span>{ind.name}</span>
                                                                      </div>
                                                                      <span className="font-mono text-[10px] text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 shrink-0">
                                                                        Target: {ind.target_percent}{ind.unit || '%'}
                                                                      </span>
                                                                    </div>
                                                                  ))}
                                                                </div>
                                                              ) : (
                                                                <span className="text-[10px] text-slate-400 italic block pl-3">
                                                                  (Belum ada indikator terdaftar)
                                                                </span>
                                                              )
                                                            )}
                                                          </div>
                                                        );
                                                      })}
                                                    </div>
                                                  ) : (
                                                    <span className="text-slate-400 text-[11px] italic">
                                                      Belum terhubung ke sasaran strategis
                                                    </span>
                                                  )}
                                                </td>

                                                {/* Status */}
                                                <td className="py-2.5 px-3 text-center border-r border-slate-200 align-top">
                                                  <span
                                                    className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold capitalize ${
                                                      p.status === 'active'
                                                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                                        : 'bg-slate-100 text-slate-600 border border-slate-300'
                                                    }`}
                                                  >
                                                    {p.status || 'Active'}
                                                  </span>
                                                </td>
                                                {/* Aksi */}
                                                <td className="py-2.5 px-2 text-center align-top whitespace-nowrap">
                                                  <div className="flex items-center justify-center gap-1">
                                                    <button
                                                      type="button"
                                                      onClick={() => handleOpenMoveProgramModal(p)}
                                                      className="p-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 transition"
                                                      title="Pindahkan Program ke Sub-Bidang Lain"
                                                    >
                                                      <FolderInput className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button
                                                      onClick={() => {
                                                        setEditingItem(p);
                                                        setProgGoalSearch('');
                                                        setIsGoalDropdownOpen(false);
                                                        setFormData({
                                                          code: p.code,
                                                          name: p.name,
                                                          description: p.description,
                                                          domain_id: p.domain_id ? String(p.domain_id) : '',
                                                          subdomain_id: p.subdomain_id ? String(p.subdomain_id) : '',
                                                          category_id: p.category_id !== null && p.category_id !== undefined ? String(p.category_id) : '',
                                                          is_flagship: p.is_flagship,
                                                          status: p.status,
                                                          linked_goal_ids: p.linked_goals?.map((g) => g.goal_id) || [],
                                                          linked_indicator_ids: p.linked_indicator_ids || p.linked_goals?.flatMap((g) => (g.indicators || []).map((i) => i.id)) || [],
                                                        });
                                                        setModalType('program');
                                                      }}
                                                      className="p-1 rounded-lg bg-slate-100 hover:bg-indigo-100 text-slate-600 hover:text-indigo-700 transition"
                                                      title="Edit Program"
                                                    >
                                                      <Edit2 className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button
                                                      onClick={() => requestDelete('program', p.id, `[${p.code}] ${p.name}`)}
                                                      className="p-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 transition"
                                                      title="Hapus Program"
                                                    >
                                                      <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                  </div>
                                                </td>
                                              </tr>
                                            );
                                          })}
                                      </React.Fragment>
                                    );
                                  })}
                              </React.Fragment>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>,
              document.body
            );
          })()}
        </div>
      )}

      {/* TAB 3: RIWAYAT PENERBITAN RESMI */}
      {activeTab === 'publications' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <History className="w-5 h-5 text-indigo-400" />
                Riwayat Penerbitan & Versi Resmi Dokumen RIPS
              </h2>
              <p className="text-xs text-slate-400">
                Arsip snapshot freeze seluruh matriks sasaran dan program saat diterbitkan menjadi SK Resmi
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {publications.length === 0 ? (
              <div className="py-8 text-center text-slate-500">
                Belum ada versi resmi RIPS yang diterbitkan. Klik tombol "Terbitkan Dokumen Resmi" di atas untuk membuat rilis versi pertama.
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
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                          Versi {pub.version_number}
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

      {/* ALL MODALS & POPUPS RENDERED IN PORTAL ON TOP OF FULLSCREEN OVERLAY (Z-INDEX 100000) */}
      {typeof document !== 'undefined' &&
        createPortal(
          <div className="rips-modals-portal" style={{ position: 'relative', zIndex: 100000 }}>
            {/* MODAL 1: GOAL FORM */}
            {modalType === 'goal' && (
              <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white">
                {editingItem ? 'Edit Sasaran RIPS' : 'Tambah Sasaran RIPS Baru'}
              </h3>
              <button onClick={() => setModalType(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Bidang (Domain) *</label>
                  <SearchableSelect
                    value={formData.domain_id || ''}
                    placeholder="-- Pilih Bidang --"
                    onChange={(val) => setFormData({ ...formData, domain_id: Number(val) })}
                    options={domains.map((d) => ({
                      value: d.id,
                      label: d.name,
                    }))}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Sub-Bidang (Opsional)</label>
                  <SearchableSelect
                    value={formData.subdomain_id || ''}
                    placeholder="-- Tanpa Sub-Bidang --"
                    onChange={(val) => setFormData({ ...formData, subdomain_id: val ? Number(val) : null })}
                    options={[
                      { value: '', label: '-- Tanpa Sub-Bidang --' },
                      ...(domains.find((d) => d.id === Number(formData.domain_id))?.subdomains?.map((s) => ({
                        value: s.id,
                        label: s.name,
                      })) || []),
                    ]}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Aspek Balanced Scorecard (BSC) *</label>
                <SearchableSelect
                  value={formData.bsc_aspect_id || ''}
                  placeholder="-- Pilih Aspek BSC --"
                  onChange={(val) => setFormData({ ...formData, bsc_aspect_id: Number(val) })}
                  options={bscAspects.map((b) => ({
                    value: b.id,
                    label: b.name,
                  }))}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Nama Sasaran Strategis</label>
                <input
                  type="text"
                  value={formData.title || ''}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                  placeholder="Contoh: Penerapan Kurikulum Integratif Cambridge & Kepesantrenan"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none focus:border-indigo-500"
                />
              </div>

              {/* Multi-Indicator Repeater */}
              <div className="space-y-3 pt-2 border-t border-slate-800">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="block text-xs font-bold text-white">Indikator Kinerja Kuantitatif Sasaran</label>
                    <p className="text-[11px] text-slate-400">Tentukan 1 atau lebih indikator konkret untuk mengukur ketercapaian sasaran ini</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const currentInds = formData.indicators || [];
                      setFormData({
                        ...formData,
                        indicators: [
                          ...currentInds,
                          {
                            name: '',
                            unit: '%',
                            baseline_percent: 0,
                            target_percent: 100,
                          }
                        ]
                      });
                    }}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-semibold transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Tambah Indikator
                  </button>
                </div>

                <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                  {(formData.indicators || []).map((ind, idx) => (
                    <div key={idx} className="p-3.5 rounded-xl bg-slate-950/90 border border-slate-800 space-y-2.5 relative">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">
                          Indikator #{idx + 1}
                        </span>
                        {(formData.indicators?.length || 0) > 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              const newInds = formData.indicators.filter((_, i) => i !== idx);
                              setFormData({ ...formData, indicators: newInds });
                            }}
                            className="text-rose-400 hover:text-rose-300 p-1 rounded-lg hover:bg-rose-500/10 transition"
                            title="Hapus Indikator Ini"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      <div>
                        <input
                          type="text"
                          value={ind.name || ''}
                          onChange={(e) => {
                            const newInds = [...(formData.indicators || [])];
                            newInds[idx] = { ...newInds[idx], name: e.target.value };
                            setFormData({ ...formData, indicators: newInds });
                          }}
                          required
                          placeholder="Nama Indikator (Cth: Persentase kelulusan sertifikasi bahasa santri)"
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none focus:border-indigo-500 font-medium"
                        />
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="block text-[10px] text-slate-400 font-semibold mb-1">Satuan</label>
                          <input
                            type="text"
                            value={ind.unit || ''}
                            onChange={(e) => {
                              const newInds = [...(formData.indicators || [])];
                              newInds[idx] = { ...newInds[idx], unit: e.target.value };
                              setFormData({ ...formData, indicators: newInds });
                            }}
                            placeholder="% santri"
                            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 outline-none focus:border-indigo-500 font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-slate-400 font-semibold mb-1">Baseline (%)</label>
                          <input
                            type="number"
                            step="0.1"
                            value={ind.baseline_percent !== undefined ? ind.baseline_percent : 0}
                            onChange={(e) => {
                              const newInds = [...(formData.indicators || [])];
                              newInds[idx] = { ...newInds[idx], baseline_percent: Number(e.target.value) };
                              setFormData({ ...formData, indicators: newInds });
                            }}
                            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 outline-none focus:border-indigo-500 font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-emerald-400 font-semibold mb-1">Target (%)</label>
                          <input
                            type="number"
                            step="0.1"
                            value={ind.target_percent !== undefined ? ind.target_percent : 100}
                            onChange={(e) => {
                              const newInds = [...(formData.indicators || [])];
                              newInds[idx] = { ...newInds[idx], target_percent: Number(e.target.value) };
                              setFormData({ ...formData, indicators: newInds });
                            }}
                            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-emerald-300 outline-none focus:border-indigo-500 font-mono font-bold"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
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
                  {formLoading ? 'Menyimpan...' : 'Simpan Sasaran'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: PROGRAM FORM (LIVE SEARCH SASARAN & CHECKLIST INDIKATOR) */}
      {modalType === 'program' && (
        <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-2xl space-y-5 max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 shrink-0">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-400" />
                {editingItem ? 'Edit Program RIPS' : 'Tambah Program & Upaya Baru'}
              </h3>
              <button onClick={() => setModalType(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-4 overflow-y-auto pr-1 flex-1 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Nama Program</label>
                  <input
                    type="text"
                    value={formData.name || ''}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    placeholder="Contoh: Program Akselerasi Smart Classroom & Laboratorium Bahasa"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Kategori Program</label>
                  <SearchableSelect
                    value={formData.category_id || ''}
                    placeholder="-- Pilih Kategori --"
                    onChange={(val) => setFormData({ ...formData, category_id: val ? Number(val) : null })}
                    options={[
                      { value: '', label: '-- Pilih Kategori --' },
                      ...programCategories.map((cat) => ({
                        value: cat.id,
                        label: cat.name,
                      })),
                    ]}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Deskripsi & Ruang Lingkup</label>
                <textarea
                  rows={2}
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Uraian ringkas implementasi program..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 outline-none focus:border-indigo-500"
                />
              </div>

              {/* SELEKSI SASARAN STRATEGIS DENGAN LIVE SEARCH DROPDOWN */}
              <div className="space-y-2 pt-1 border-t border-slate-800/80">
                <label className="block text-xs font-bold text-indigo-300">
                  1. Pilih Sasaran Strategis
                </label>
                
                <div className="relative" ref={goalDropdownRef}>
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={progGoalSearch}
                      onChange={(e) => {
                        setProgGoalSearch(e.target.value);
                        setIsGoalDropdownOpen(true);
                      }}
                      onFocus={() => setIsGoalDropdownOpen(true)}
                      placeholder="Ketik kode sasaran / judul sasaran untuk mencari..."
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-8 py-2 text-xs text-slate-200 outline-none focus:border-indigo-500 font-medium"
                    />
                    {progGoalSearch && (
                      <button
                        type="button"
                        onClick={() => setProgGoalSearch('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  {/* Dropdown Menu Hasil Pencarian */}
                  {isGoalDropdownOpen && (
                    <div className="absolute z-30 left-0 right-0 mt-1 max-h-52 overflow-y-auto bg-slate-950 border border-slate-700 rounded-xl shadow-2xl p-1.5 divide-y divide-slate-800">
                      {(() => {
                        const filteredGoals = goals.filter((g) => {
                          if (!progGoalSearch.trim()) return true;
                          const q = progGoalSearch.toLowerCase();
                          return (
                            g.code?.toLowerCase().includes(q) ||
                            g.title?.toLowerCase().includes(q) ||
                            g.domain_name?.toLowerCase().includes(q)
                          );
                        });

                        if (filteredGoals.length === 0) {
                          return (
                            <div className="p-3 text-center text-slate-500 text-xs italic">
                              Tidak ada sasaran strategis yang cocok dengan kata kunci "{progGoalSearch}".
                            </div>
                          );
                        }

                        return filteredGoals.map((g) => {
                          const isSelected = formData.linked_goal_ids?.includes(g.id);
                          return (
                            <div
                              key={g.id}
                              onClick={() => {
                                const currentGoalIds = formData.linked_goal_ids || [];
                                const currentIndIds = formData.linked_indicator_ids || [];
                                const goalIndIds = (g.indicators && g.indicators.length > 0
                                  ? g.indicators
                                  : [{ id: `fallback_${g.id}` }]
                                ).map((i) => i.id);

                                if (isSelected) {
                                  setFormData({
                                    ...formData,
                                    linked_goal_ids: currentGoalIds.filter((id) => id !== g.id),
                                    linked_indicator_ids: currentIndIds.filter((id) => !goalIndIds.includes(id)),
                                  });
                                } else {
                                  setFormData({
                                    ...formData,
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
                                    {g.domain_name || 'Bidang'} &bull; {g.bsc_aspect_name || 'BSC'} &bull; {g.indicators?.length || 1} Indikator
                                  </p>
                                </div>
                              </div>
                              <div className="shrink-0 flex items-center">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => {}} // handled by parent div
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

              {/* DAFTAR CEKLIST INDIKATOR DARI SASARAN YANG DIPILIH */}
              <div className="space-y-2 pt-1 border-t border-slate-800/80">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="block text-xs font-bold text-emerald-300">
                      2. Pilih Indikator Kinerja yang Terkait dengan Program Ini
                    </label>
                    <p className="text-[10.5px] text-slate-400">
                      Centang satu atau lebih indikator spesifik yang ingin dihubungkan ke program ini:
                    </p>
                  </div>
                  <span className="text-[10px] text-slate-400 shrink-0 bg-slate-950 px-2 py-1 rounded-lg border border-slate-800">
                    {formData.linked_indicator_ids?.length || 0} Indikator Terpilih
                  </span>
                </div>

                {(!formData.linked_goal_ids || formData.linked_goal_ids.length === 0) ? (
                  <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 text-center text-slate-400 text-xs">
                    💡 Pilih sasaran strategis terlebih dahulu pada kolom pencarian di atas untuk memilih indikator kinerjanya.
                  </div>
                ) : (
                  <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                    {formData.linked_goal_ids.map((goalId) => {
                      const g = goals.find((item) => item.id === goalId);
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
                      const selectedGoalInds = allGoalIndIds.filter((id) => (formData.linked_indicator_ids || []).includes(id));
                      const isAllSelected = selectedGoalInds.length === allGoalIndIds.length;

                      return (
                        <div key={g.id} className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2.5 shadow-xs">
                          <div className="flex items-center justify-between pb-2 border-b border-slate-850 gap-2">
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
                                  const currentInds = formData.linked_indicator_ids || [];
                                  if (isAllSelected) {
                                    // Unselect all for this goal
                                    setFormData({
                                      ...formData,
                                      linked_indicator_ids: currentInds.filter((id) => !allGoalIndIds.includes(id)),
                                    });
                                  } else {
                                    // Select all for this goal
                                    setFormData({
                                      ...formData,
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
                                  const currentGoals = formData.linked_goal_ids || [];
                                  const currentInds = formData.linked_indicator_ids || [];
                                  setFormData({
                                    ...formData,
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

                          {/* Daftar Indikator Checkbox */}
                          <div className="space-y-1.5 pl-0.5">
                            {gIndicators.map((ind) => {
                              const isIndChecked = (formData.linked_indicator_ids || []).includes(ind.id);
                              return (
                                <div
                                  key={ind.id}
                                  onClick={() => {
                                    const currentInds = formData.linked_indicator_ids || [];
                                    if (isIndChecked) {
                                      setFormData({
                                        ...formData,
                                        linked_indicator_ids: currentInds.filter((id) => id !== ind.id),
                                      });
                                    } else {
                                      setFormData({
                                        ...formData,
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
                                      onChange={() => {}} // handled by parent div
                                      className="w-3.5 h-3.5 rounded border-slate-700 text-emerald-500 focus:ring-emerald-500 mt-0.5 pointer-events-none shrink-0"
                                    />
                                    <div className="space-y-0.5 min-w-0">
                                      {ind.code && (
                                        <span className="font-mono text-[9px] font-bold text-slate-400 block">
                                          {ind.code}
                                        </span>
                                      )}
                                      <span className={`leading-snug block ${isIndChecked ? 'font-medium text-slate-100' : 'text-slate-400'}`}>
                                        {ind.name}
                                      </span>
                                    </div>
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
                )}
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-slate-800/80">
                <input
                  type="checkbox"
                  id="flagship_cb"
                  checked={formData.is_flagship === 1 || formData.is_flagship === true}
                  onChange={(e) => setFormData({ ...formData, is_flagship: e.target.checked ? 1 : 0 })}
                  className="rounded border-slate-700 text-amber-500 focus:ring-amber-500"
                />
                <label htmlFor="flagship_cb" className="text-xs text-amber-300 font-medium cursor-pointer">
                  Tandai sebagai Program Unggulan (Flagship Program)
                </label>
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3 shrink-0">
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
                  {formLoading ? 'Menyimpan...' : 'Simpan Program'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: HEADER VISI MISI & TUJUAN */}
      {modalType === 'header' && (
        <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-2xl space-y-5 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 shrink-0">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                Kelola Visi, Misi & Tujuan Strategis
              </h3>
              <button onClick={() => setModalType(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-4 overflow-y-auto pr-1 flex-1 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Nama / Judul Dokumen RIPS</label>
                <input
                  type="text"
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none focus:border-indigo-500 font-medium"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Visi Strategis Lembaga</label>
                <textarea
                  rows={3}
                  value={formData.vision || ''}
                  onChange={(e) => setFormData({ ...formData, vision: e.target.value })}
                  placeholder="Mewujudkan institusi pendidikan berkualitas prima..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 outline-none focus:border-indigo-500 leading-relaxed"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Daftar Misi Lembaga (Pisahkan tiap misi dengan baris baru)</label>
                <textarea
                  rows={4}
                  value={Array.isArray(formData.mission) ? formData.mission.join('\n') : (formData.mission || '')}
                  onChange={(e) => setFormData({ ...formData, mission: e.target.value.split('\n').filter(Boolean) })}
                  placeholder="Meningkatkan mutu pembelajaran terpadu&#10;Membangun karakter santri beradab&#10;Menyediakan tata kelola transparan"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 outline-none focus:border-indigo-500 font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Daftar Tujuan Strategis (Pisahkan tiap tujuan dengan baris baru)</label>
                <textarea
                  rows={4}
                  value={Array.isArray(formData.objectives) ? formData.objectives.join('\n') : (formData.objectives || '')}
                  onChange={(e) => setFormData({ ...formData, objectives: e.target.value.split('\n').filter(Boolean) })}
                  placeholder="Mencapai 100% kelulusan santri dengan kompetensi unggul&#10;Mewujudkan iklim pesantren aman dan ramah anak&#10;Meningkatkan efisiensi sarana prasarana sekolah"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 outline-none focus:border-indigo-500 font-mono"
                />
              </div>

              <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3 shrink-0">
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
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition shadow"
                >
                  {formLoading ? 'Menyimpan...' : 'Simpan Perubahan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: PUBLISH / SK PENGESAHAN DOKUMEN */}
      {modalType === 'publish' && (
        <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-2xl space-y-5 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 shrink-0">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                Pengesahan Dokumen RIPS Resmi (SK Pengesahan)
              </h3>
              <button onClick={() => setModalType(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 shrink-0">
              Pengesahan ini akan menerbitkan <strong>Surat Keputusan (SK) Resmi</strong> dan membekukan (freeze snapshot) seluruh <strong>{goals.length} sasaran</strong>, <strong>{programs.length} program</strong>, serta <strong>Visi, Misi & Tujuan</strong> ke dalam arsip riwayat resmi.
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-4 overflow-y-auto pr-1 flex-1 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Nomor Surat Keputusan (SK)</label>
                <input
                  type="text"
                  value={formData.document_number || ''}
                  onChange={(e) => setFormData({ ...formData, document_number: e.target.value })}
                  required
                  placeholder="Contoh: SK-YAYASAN/2026/RIPS/001"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none focus:border-indigo-500 font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Judul Penetapan / Pengesahan</label>
                <input
                  type="text"
                  value={formData.title || ''}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Tanggal Penetapan SK</label>
                  <DatePickerField
                    value={formData.effective_date || ''}
                    onChange={(iso) => setFormData({ ...formData, effective_date: iso })}
                    required={true}
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Nama Pejabat Pengesah</label>
                  <input
                    type="text"
                    value={formData.sk_signer_name || ''}
                    onChange={(e) => setFormData({ ...formData, sk_signer_name: e.target.value })}
                    placeholder="Nama Penandatangan SK"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Jabatan Pejabat Pengesah</label>
                <input
                  type="text"
                  value={formData.sk_signer_position || ''}
                  onChange={(e) => setFormData({ ...formData, sk_signer_position: e.target.value })}
                  placeholder="Contoh: Ketua Yayasan / Kepala Sekolah"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Ringkasan Penetapan / Catatan Perubahan</label>
                <textarea
                  rows={3}
                  value={formData.change_summary || ''}
                  onChange={(e) => setFormData({ ...formData, change_summary: e.target.value })}
                  placeholder="Pengesahan Rencana Induk Pengembangan Sekolah periode jangka panjang..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 outline-none focus:border-indigo-500"
                />
              </div>

              <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3 shrink-0">
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
                  {formLoading ? 'Mengesahkan...' : 'Sahkan & Terbitkan SK'}
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
                <h3 className="text-base font-bold text-white">Snapshot Freeze Dokumen RIPS</h3>
                <p className="text-xs text-slate-400">
                  Diterbitkan pada: {new Date(selectedPubSnapshot.published_at).toLocaleString('id-ID')}
                </p>
              </div>
              <button onClick={() => setModalType(null)} className="text-slate-400 hover:text-white font-bold">✕</button>
            </div>

            <div className="overflow-y-auto space-y-4 pr-1 text-xs">
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <span className="font-bold text-indigo-400 uppercase text-[10px]">Visi Lembaga</span>
                <p className="text-slate-200 italic font-medium">"{selectedPubSnapshot.document?.vision}"</p>
              </div>

              <div>
                <h4 className="font-bold text-white mb-2">Daftar Sasaran ({selectedPubSnapshot.goals?.length || 0}):</h4>
                <div className="overflow-x-auto rounded-xl border border-slate-800">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-950 text-slate-400 text-[10px] uppercase">
                      <tr>
                        <th className="p-2.5">Kode</th>
                        <th className="p-2.5">Bidang / BSC</th>
                        <th className="p-2.5">Sasaran</th>
                        <th className="p-2.5 text-center">Baseline</th>
                        <th className="p-2.5 text-center">Target</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {selectedPubSnapshot.goals?.map((g) => (
                        <tr key={g.id}>
                          <td className="p-2.5 font-mono font-bold text-indigo-400">{g.code}</td>
                          <td className="p-2.5">{g.domain_name} ({g.bsc_aspect_name})</td>
                          <td className="p-2.5 font-medium text-white">{g.title}</td>
                          <td className="p-2.5 text-center">{g.baseline_percent}%</td>
                          <td className="p-2.5 text-center text-emerald-400 font-bold">{g.target_percent}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
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

      {/* MODAL 6: KELOLA MASTER BIDANG, BSC & KATEGORI PROGRAM */}
      {modalType === 'manage_masters' && (
        <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-2xl space-y-5 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 shrink-0">
              <h3 className="text-base font-bold text-white">Kelola Master Custom RIPS</h3>
              <button onClick={() => setModalType(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="flex items-center gap-2 border-b border-slate-800 pb-2 shrink-0">
              <button
                onClick={() => setMasterTab('domain')}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition ${
                  masterTab === 'domain' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Bidang &amp; Sub-Bidang
              </button>
              <button
                onClick={() => setMasterTab('categories')}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 ${
                  masterTab === 'categories' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Tag className="w-3.5 h-3.5" />
                Kategori Program
              </button>
              <button
                onClick={() => setMasterTab('bsc')}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition ${
                  masterTab === 'bsc' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Aspek BSC
              </button>
            </div>

            <div className="overflow-y-auto space-y-4 pr-1 text-xs">
              {/* TAB 1: BIDANG & SUB-BIDANG */}
              {masterTab === 'domain' && (
                <div className="space-y-4">
                  {/* Add Domain Form */}
                  <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex gap-2">
                    <input
                      type="text"
                      id="new_domain_input"
                      placeholder="Nama Bidang Baru (mis. Keasramaan & Kedisiplinan)"
                      className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-indigo-500"
                    />
                    <button
                      onClick={() => {
                        const input = document.getElementById('new_domain_input');
                        if (input && input.value.trim()) {
                          handleSaveDomain(input.value.trim(), domains.length + 1);
                          input.value = '';
                        }
                      }}
                      className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition"
                    >
                      Tambah Bidang
                    </button>
                  </div>

                  {/* List Domains */}
                  <div className="space-y-3">
                    {domains.map((d) => (
                      <div key={d.id} className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                        <div className="flex items-center justify-between">
                          {editingDomain?.id === d.id ? (
                            <div className="flex items-center gap-2 flex-1 mr-2">
                              <input
                                type="text"
                                value={editingDomain.name}
                                onChange={(e) => setEditingDomain({ ...editingDomain, name: e.target.value })}
                                className="flex-1 bg-slate-900 border border-indigo-500 rounded-lg px-2.5 py-1 text-xs text-white outline-none"
                              />
                              <button
                                onClick={() => handleUpdateDomain(d.id, editingDomain.name, d.order_index)}
                                className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold"
                              >
                                Simpan
                              </button>
                              <button
                                onClick={() => setEditingDomain(null)}
                                className="px-2 py-1 rounded-lg bg-slate-800 text-slate-400 text-xs"
                              >
                                Batal
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-white text-sm">{d.name}</span>
                              <span className="text-[10px] text-slate-500">Order: {d.order_index}</span>
                            </div>
                          )}

                          <div className="flex items-center gap-1">
                            {editingDomain?.id !== d.id && (
                              <button
                                onClick={() => setEditingDomain(d)}
                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white"
                                title="Edit Bidang"
                              >
                                <Edit2 className="w-3 h-3" />
                              </button>
                            )}
                            <button
                              onClick={() => requestDelete('domain', d.id, d.name)}
                              className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400"
                              title="Hapus Bidang"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>

                        {/* Subdomains */}
                        <div className="pl-4 border-l-2 border-slate-800 space-y-2 mt-2">
                          <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Sub-Bidang:</span>
                          {d.subdomains?.map((s) => (
                            <div key={s.id} className="flex items-center justify-between text-slate-300 text-xs py-1 px-2 rounded-lg bg-slate-900/60 border border-slate-850">
                              {editingSubdomain?.id === s.id ? (
                                <div className="flex items-center gap-2 flex-1 mr-2">
                                  <input
                                    type="text"
                                    value={editingSubdomain.name}
                                    onChange={(e) => setEditingSubdomain({ ...editingSubdomain, name: e.target.value })}
                                    className="flex-1 bg-slate-950 border border-indigo-500 rounded px-2 py-0.5 text-xs text-white"
                                  />
                                  <button
                                    onClick={() => handleUpdateSubdomain(s.id, editingSubdomain.name, s.order_index)}
                                    className="px-2 py-0.5 rounded bg-emerald-600 text-white text-[10px] font-bold"
                                  >
                                    OK
                                  </button>
                                  <button
                                    onClick={() => setEditingSubdomain(null)}
                                    className="px-2 py-0.5 rounded bg-slate-800 text-slate-400 text-[10px]"
                                  >
                                    ✕
                                  </button>
                                </div>
                              ) : (
                                <span className="font-medium">• {s.name}</span>
                              )}

                              <div className="flex items-center gap-1">
                                {editingSubdomain?.id !== s.id && (
                                  <button
                                    onClick={() => setEditingSubdomain(s)}
                                    className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
                                    title="Edit Sub-Bidang"
                                  >
                                    <Edit2 className="w-2.5 h-2.5" />
                                  </button>
                                )}
                                <button
                                  onClick={() => requestDelete('subdomain', s.id, s.name)}
                                  className="p-1 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-400"
                                  title="Hapus Sub-Bidang"
                                >
                                  <Trash2 className="w-2.5 h-2.5" />
                                </button>
                              </div>
                            </div>
                          ))}

                          <div className="flex items-center gap-2 pt-2">
                            <input
                              type="text"
                              id={`sub_input_${d.id}`}
                              placeholder="Tambah Sub-Bidang..."
                              className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-white outline-none"
                            />
                            <button
                              onClick={() => {
                                const input = document.getElementById(`sub_input_${d.id}`);
                                if (input && input.value.trim()) {
                                  handleSaveSubdomain(d.id, input.value.trim(), (d.subdomains?.length || 0) + 1);
                                  input.value = '';
                                }
                              }}
                              className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-indigo-300 text-xs font-semibold"
                            >
                              + Sub
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 2: KATEGORI PROGRAM (CUSTOM MANAGEMENT DENGAN WARNA OTOMATIS) */}
              {masterTab === 'categories' && (
                <div className="space-y-4">
                  {/* Add Program Category Form */}
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                    <h4 className="font-bold text-white text-xs flex items-center gap-1.5">
                      <Plus className="w-3.5 h-3.5 text-indigo-400" />
                      Tambah Kategori Program Baru
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <input
                        type="text"
                        id="new_cat_name"
                        placeholder="Nama Kategori (mis. Pelatihan & Workshop)"
                        className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-indigo-500"
                      />
                      <input
                        type="text"
                        id="new_cat_desc"
                        placeholder="Deskripsi Kategori (opsional)"
                        className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div className="flex items-center justify-between pt-1">
                      <div className="flex items-center gap-2 text-slate-400 text-[11px]">
                        <span>Pilihan Warna:</span>
                        <div className="flex items-center gap-1.5">
                          {[
                            { color: '#2563EB', bg: '#EFF6FF', border: '#93C5FD', label: 'Biru' },
                            { color: '#7C3AED', bg: '#F5F3FF', border: '#C4B5FD', label: 'Ungu' },
                            { color: '#D97706', bg: '#FFFBEB', border: '#FCD34D', label: 'Kuning/Emas' },
                            { color: '#059669', bg: '#ECFDF5', border: '#6EE7B7', label: 'Hijau' },
                            { color: '#DC2626', bg: '#FEF2F2', border: '#FCA5A5', label: 'Merah' },
                            { color: '#0891B2', bg: '#ECFEFF', border: '#67E8F9', label: 'Cyan' },
                            { color: '#D946EF', bg: '#FDF4FF', border: '#F0ABFC', label: 'Fuchsia' },
                            { color: '#4F46E5', bg: '#EEF2FF', border: '#A5B4FC', label: 'Indigo' },
                          ].map((pal, pIdx) => (
                            <button
                              key={pIdx}
                              type="button"
                              onClick={() => {
                                window._selectedCatPalette = pal;
                                document.querySelectorAll('.cat-pal-btn').forEach(b => b.classList.remove('ring-2', 'ring-white'));
                                document.getElementById(`pal_btn_${pIdx}`)?.classList.add('ring-2', 'ring-white');
                              }}
                              id={`pal_btn_${pIdx}`}
                              className={`w-5 h-5 rounded-full cat-pal-btn transition hover:scale-110 ${pIdx === 0 ? 'ring-2 ring-white' : ''}`}
                              style={{ backgroundColor: pal.color }}
                              title={pal.label}
                            />
                          ))}
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          const nameInput = document.getElementById('new_cat_name');
                          const descInput = document.getElementById('new_cat_desc');
                          const pal = window._selectedCatPalette || { color: '#2563EB', bg: '#EFF6FF', border: '#93C5FD' };

                          if (nameInput && nameInput.value.trim()) {
                            handleSaveProgramCategory({
                              name: nameInput.value.trim(),
                              description: descInput?.value?.trim() || null,
                              color: pal.color,
                              bg_color: pal.bg,
                              border_color: pal.border,
                              order_index: programCategories.length + 1,
                            });
                            nameInput.value = '';
                            if (descInput) descInput.value = '';
                          }
                        }}
                        className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition text-xs shadow-md"
                      >
                        Simpan Kategori
                      </button>
                    </div>
                  </div>

                  {/* List Program Categories with Distinct Color Badges */}
                  <div className="space-y-2.5">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                      Daftar Kategori Tersedia ({programCategories.length}):
                    </span>
                    {programCategories.map((cat) => (
                      <div
                        key={cat.id}
                        className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3 hover:border-slate-700 transition"
                      >
                        <div className="flex items-center gap-3">
                          {/* Color Badge Indicator */}
                          <span
                            className="px-3 py-1 rounded-lg text-xs font-bold border shadow-xs inline-flex items-center gap-1.5"
                            style={{
                              color: cat.color || '#2563EB',
                              backgroundColor: cat.bg_color || '#EFF6FF',
                              borderColor: cat.border_color || '#BFDBFE',
                            }}
                          >
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color || '#2563EB' }} />
                            {cat.name}
                          </span>

                          {cat.description && (
                            <span className="text-slate-400 text-xs truncate max-w-[280px]">
                              {cat.description}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono text-slate-500">
                            Urutan: {cat.order_index}
                          </span>
                          <button
                            onClick={() => handleDeleteProgramCategory(cat.id)}
                            className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition"
                            title="Hapus Kategori"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 3: ASPEK BSC */}
              {masterTab === 'bsc' && (
                <div className="space-y-4">
                  {/* Add BSC Form */}
                  <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex gap-2">
                    <input
                      type="text"
                      id="new_bsc_input"
                      placeholder="Nama Aspek BSC Baru"
                      className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-indigo-500"
                    />
                    <button
                      onClick={() => {
                        const input = document.getElementById('new_bsc_input');
                        if (input && input.value.trim()) {
                          handleSaveBscAspect(input.value.trim(), '', bscAspects.length + 1);
                          input.value = '';
                        }
                      }}
                      className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition"
                    >
                      Tambah Aspek
                    </button>
                  </div>

                  <div className="space-y-2">
                    {bscAspects.map((b) => (
                      <div key={b.id} className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                        <div>
                          <h4 className="font-bold text-white">{b.name}</h4>
                          <p className="text-xs text-slate-400">{b.description || 'Tidak ada deskripsi'}</p>
                        </div>
                        <span className="text-[10px] text-slate-500">Order: {b.order_index}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-800 flex justify-end shrink-0">
              <button
                onClick={() => setModalType(null)}
                className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition"
              >
                Selesai
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SAFE DELETE CONFIRMATION MODAL WITH DEPENDENCY BREAKDOWN */}
      {deleteConfirmModal.isOpen && (
        <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-lg bg-slate-900 border border-rose-500/30 rounded-xl p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Trash2 className="w-5 h-5 text-rose-400" />
                Konfirmasi Penghapusan Data
              </h3>
              <button
                onClick={() => setDeleteConfirmModal({ isOpen: false, type: null, id: null, title: '', loading: false, impact: null, deleting: false })}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-slate-300">
                Anda akan menghapus data <strong className="text-white">{deleteConfirmModal.title}</strong>.
              </p>

              {deleteConfirmModal.loading ? (
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-center text-slate-400">
                  Menganalisis keterkaitan data...
                </div>
              ) : deleteConfirmModal.impact ? (
                <div className="space-y-3">
                  {/* Warning / Error if cannot delete */}
                  {deleteConfirmModal.impact.can_delete === false ? (
                    <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 space-y-2">
                      <div className="font-bold flex items-center gap-1.5">
                        ⚠️ Data Tidak Dapat Dihapus Langsung
                      </div>
                      <p>
                        Data ini masih digunakan pada <strong>{deleteConfirmModal.impact.goals_count} sasaran strategis RIPS</strong>. Silakan pindahkan atau hapus sasaran terkait terlebih dahulu.
                      </p>
                      {deleteConfirmModal.impact.goals && deleteConfirmModal.impact.goals.length > 0 && (
                        <ul className="space-y-1.5 text-[11px] text-rose-200 mt-2 bg-rose-950/40 p-2.5 rounded-xl border border-rose-500/20">
                          {deleteConfirmModal.impact.goals.map((g) => (
                            <li key={g.id} className="flex flex-col">
                              <span className="font-bold">[{g.code}] {g.title}</span>
                              <span className="text-[10px] text-rose-300/80">Lokasi: {g.document_name}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-slate-300">
                      <span className="font-bold text-slate-200 block">Informasi Data Terkait yang Terdampak:</span>
                      
                      {/* For Domain Deletion */}
                      {deleteConfirmModal.type === 'domain' && (
                        <div className="space-y-2">
                          <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-200">
                            <span className="font-bold text-rose-300 block mb-1">⚠️ Perhatian (Penghapusan Bertingkat / Cascade):</span>
                            Menghapus bidang ini akan <strong>secara permanen menghapus seluruh data di bawahnya</strong>, meliputi:
                          </div>
                          <div className="space-y-1.5 pl-1">
                            <div className="flex justify-between py-1 border-b border-slate-850">
                              <span>Sub-Bidang terkait yang akan dihapus:</span>
                              <span className="font-bold text-amber-400">{deleteConfirmModal.impact.subdomains_count || 0} Sub-Bidang</span>
                            </div>
                            <div className="flex justify-between py-1 border-b border-slate-850">
                              <span>Sasaran Strategis &amp; Indikator yang akan dihapus:</span>
                              <span className="font-bold text-rose-400">{deleteConfirmModal.impact.goals_count || 0} Sasaran</span>
                            </div>
                          </div>
                          {deleteConfirmModal.impact.goals && deleteConfirmModal.impact.goals.length > 0 && (
                            <div className="mt-2 space-y-1 max-h-32 overflow-y-auto bg-slate-950 p-2 rounded-xl border border-slate-800">
                              <span className="text-[10px] text-slate-400 font-semibold block">Daftar sasaran yang terdampak:</span>
                              {deleteConfirmModal.impact.goals.map((g) => (
                                <div key={g.id} className="text-[11px] text-slate-300 truncate">
                                  • <strong className="text-indigo-400 font-mono">[{g.code}]</strong> {g.title}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* For Subdomain Deletion */}
                      {deleteConfirmModal.type === 'subdomain' && (
                        <div className="space-y-2">
                          <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-200">
                            <span className="font-bold text-rose-300 block mb-1">⚠️ Perhatian (Penghapusan Bertingkat / Cascade):</span>
                            Menghapus sub-bidang ini akan <strong>secara permanen menghapus seluruh sasaran dan indikator kinerja</strong> di dalamnya.
                          </div>
                          <div className="space-y-1.5 pl-1">
                            <div className="flex justify-between py-1 border-b border-slate-850">
                              <span>Sasaran Strategis &amp; Indikator yang akan dihapus:</span>
                              <span className="font-bold text-rose-400">{deleteConfirmModal.impact.goals_count || 0} Sasaran</span>
                            </div>
                          </div>
                          {deleteConfirmModal.impact.goals && deleteConfirmModal.impact.goals.length > 0 && (
                            <div className="mt-2 space-y-1 max-h-32 overflow-y-auto bg-slate-950 p-2 rounded-xl border border-slate-800">
                              <span className="text-[10px] text-slate-400 font-semibold block">Daftar sasaran yang terdampak:</span>
                              {deleteConfirmModal.impact.goals.map((g) => (
                                <div key={g.id} className="text-[11px] text-slate-300 truncate">
                                  • <strong className="text-indigo-400 font-mono">[{g.code}]</strong> {g.title}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* For Goal Deletion */}
                      {deleteConfirmModal.type === 'goal' && (
                        <div className="space-y-1.5">
                          <div className="flex justify-between py-1 border-b border-slate-850">
                            <span>Program RIPS yang terhubung:</span>
                            <span className="font-bold text-indigo-400">{deleteConfirmModal.impact.linked_programs_count || 0} Program</span>
                          </div>
                          <div className="flex justify-between py-1 border-b border-slate-850">
                            <span>Riwayat Evaluasi EVADIR:</span>
                            <span className="font-bold text-amber-400">{deleteConfirmModal.impact.evadir_evaluations_count || 0} Periode</span>
                          </div>
                        </div>
                      )}

                      {/* For Program Deletion */}
                      {deleteConfirmModal.type === 'program' && (
                        <div className="space-y-1.5">
                          <div className="flex justify-between py-1 border-b border-slate-850">
                            <span>Target Tahunan (Shared Matrix):</span>
                            <span className="font-bold text-indigo-400">{deleteConfirmModal.impact.annual_targets_count || 0} Tahun</span>
                          </div>
                          <div className="flex justify-between py-1 border-b border-slate-850">
                            <span>Langkah Kegiatan RKT (Activities):</span>
                            <span className="font-bold text-indigo-400">{deleteConfirmModal.impact.activities_count || 0} Kegiatan</span>
                          </div>
                          <div className="flex justify-between py-1 border-b border-slate-850">
                            <span>Kepanitiaan Program:</span>
                            <span className="font-bold text-indigo-400">{deleteConfirmModal.impact.committees_count || 0} Panitia</span>
                          </div>
                          <div className="flex justify-between py-1 border-b border-slate-850">
                            <span>Pesan Diskusi Program:</span>
                            <span className="font-bold text-indigo-400">{deleteConfirmModal.impact.discussions_count || 0} Pesan Chat</span>
                          </div>
                        </div>
                      )}

                      <p className="text-amber-400 text-[11px] mt-2 italic">
                        ⚠️ Tindakan ini tidak dapat dibatalkan.
                      </p>
                    </div>
                  )}
                </div>
              ) : null}
            </div>

            <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteConfirmModal({ isOpen: false, type: null, id: null, title: '', loading: false, impact: null, deleting: false })}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
              >
                Batal
              </button>
              
              {deleteConfirmModal.impact?.can_delete !== false && (
                <button
                  type="button"
                  onClick={executeDelete}
                  disabled={deleteConfirmModal.deleting || deleteConfirmModal.loading}
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition shadow-lg shadow-rose-950/50"
                >
                  {deleteConfirmModal.deleting ? 'Menghapus...' : 'Ya, Hapus Data'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* QUICK MODAL: TAMBAH BIDANG */}
      {modalType === 'add_domain_quick' && (
        <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-indigo-400" />
                Tambah Bidang Baru
              </h3>
              <button onClick={() => setModalType(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nama Bidang / Area Strategis
                </label>
                <input
                  type="text"
                  value={newDomainName}
                  onChange={(e) => setNewDomainName(e.target.value)}
                  placeholder="Contoh: Kurikulum & Akademik, Keasramaan, Sarpras..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none focus:border-indigo-500"
                  autoFocus
                />
              </div>

              <p className="text-[11px] text-slate-400">
                Bidang baru akan langsung terdaftar di matriks dan siap untuk ditambahkan sub-bidang &amp; sasaran.
              </p>
            </div>

            <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setModalType(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (!newDomainName.trim()) {
                    alert('Nama bidang wajib diisi');
                    return;
                  }
                  await handleSaveDomain(newDomainName.trim(), domains.length + 1);
                  setNewDomainName('');
                  setModalType(null);
                }}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition shadow-lg shadow-indigo-950/50"
              >
                Simpan Bidang
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QUICK MODAL: TAMBAH SUB-BIDANG */}
      {modalType === 'add_subdomain_quick' && (
        <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-amber-400" />
                Tambah Sub-Bidang Baru
              </h3>
              <button onClick={() => setModalType(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Pilih Bidang Induk *
                </label>
                <SearchableSelect
                  value={newSubdomainData.domain_id}
                  placeholder="-- Pilih Bidang --"
                  onChange={(val) => setNewSubdomainData({ ...newSubdomainData, domain_id: val })}
                  options={domains.map((d) => ({
                    value: d.id,
                    label: d.name,
                  }))}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nama Sub-Bidang / Fokus Operasional
                </label>
                <input
                  type="text"
                  value={newSubdomainData.name}
                  onChange={(e) => setNewSubdomainData({ ...newSubdomainData, name: e.target.value })}
                  placeholder="Contoh: Kurikulum Terpadu & Standar Kelulusan"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none focus:border-amber-500"
                  autoFocus
                />
              </div>

              <p className="text-[11px] text-slate-400">
                Sub-bidang akan langsung muncul terkelompok di bawah bidang terkait pada matriks tabel.
              </p>
            </div>

            <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setModalType(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (!newSubdomainData.domain_id) {
                    alert('Silakan pilih bidang induk');
                    return;
                  }
                  if (!newSubdomainData.name.trim()) {
                    alert('Nama sub-bidang wajib diisi');
                    return;
                  }
                  await handleSaveSubdomain(newSubdomainData.domain_id, newSubdomainData.name.trim(), 99);
                  setNewSubdomainData({ domain_id: '', name: '' });
                  setModalType(null);
                }}
                className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition shadow-lg shadow-amber-950/50"
              >
                Simpan Sub-Bidang
              </button>
            </div>
          </div>
        </div>
      )}
    </div>,
    document.body
  )}

      {/* Modal Pindahkan Program ke Sub-Bidang Lain */}
      <MoveProgramModal
        isOpen={isMoveProgramModalOpen}
        onClose={() => {
          setIsMoveProgramModalOpen(false);
          setProgramToMove(null);
        }}
        program={programToMove}
        domains={domains}
        subdomains={allSubdomains}
        onSuccess={() => {
          fetchData();
        }}
      />
    </div>
  );
}

