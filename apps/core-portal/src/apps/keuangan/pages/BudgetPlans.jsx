import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../../shared/store/AuthContext';
import api from '../../../shared/services/api';
import SearchableSelect from '../../../shared/components/SearchableSelect';
import {
  FileSpreadsheet,
  Plus,
  Send,
  Eye,
  TrendingUp,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  XCircle,
  Calendar,
  X,
  History,
  RotateCw,
  Search,
  Sliders,
  Edit2,
  Power,
  Layers,
  BookOpen,
  Building2,
  School,
  FileCheck,
  Tag,
  Wallet,
  Coins,
  ShieldCheck,
  ExternalLink,
  Info,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  FolderOpen,
  Trash2,
  Sparkles,
  ArrowRightLeft
} from 'lucide-react';

const MONTHS = [
  { key: 'm1', label: 'Juli', short: 'Jul', q: 'Q1' },
  { key: 'm2', label: 'Agustus', short: 'Ags', q: 'Q1' },
  { key: 'm3', label: 'September', short: 'Sep', q: 'Q1' },
  { key: 'm4', label: 'Oktober', short: 'Okt', q: 'Q2' },
  { key: 'm5', label: 'November', short: 'Nov', q: 'Q2' },
  { key: 'm6', label: 'Desember', short: 'Des', q: 'Q2' },
  { key: 'm7', label: 'Januari', short: 'Jan', q: 'Q3' },
  { key: 'm8', label: 'Februari', short: 'Feb', q: 'Q3' },
  { key: 'm9', label: 'Maret', short: 'Mar', q: 'Q3' },
  { key: 'm10', label: 'April', short: 'Apr', q: 'Q4' },
  { key: 'm11', label: 'Mei', short: 'Mei', q: 'Q4' },
  { key: 'm12', label: 'Juni', short: 'Jun', q: 'Q4' }
];

export default function BudgetPlans() {
  const { activeSchoolUnit } = useAuth();
  const isYayasan = !activeSchoolUnit || activeSchoolUnit.id === 'all' || activeSchoolUnit.is_foundation || activeSchoolUnit.id === null;

  // Main Tab State: 'rapbs' | 'catalog'
  const [activeMainTab, setActiveMainTab] = useState('rapbs');
  const [budgetViewMode, setBudgetViewMode] = useState('monthly'); // 'summary' | 'monthly'
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // ==========================================
  // STATE TAB 1: RAPBS (BUDGET PLANS)
  // ==========================================
  const [academicYears, setAcademicYears] = useState([]);
  const [selectedYearId, setSelectedYearId] = useState(() => {
    try {
      const saved = localStorage.getItem('core_budget_academic_year_id');
      if (saved) return saved;
    } catch (_) {}
    return '';
  });
  const [ayLoansSummary, setAyLoansSummary] = useState(null);
  const [plans, setPlans] = useState([]);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [budgetPrograms, setBudgetPrograms] = useState([]);
  const [feeTypes, setFeeTypes] = useState([]);
  const [realizationData, setRealizationData] = useState(null);
  const [generatingIncome, setGeneratingIncome] = useState(false);

  // Filter Belanja Berdasarkan Bidang & Sub-Bidang RIPS / RKT
  const [filterExpenseDomain, setFilterExpenseDomain] = useState('all');
  const [filterExpenseSubdomain, setFilterExpenseSubdomain] = useState('all');
  const [filterExpenseSearch, setFilterExpenseSearch] = useState('');
  const [syncingPrograms, setSyncingPrograms] = useState(false);

  // Auto-sync selectedYearId selection to localStorage
  useEffect(() => {
    if (selectedYearId) {
      try {
        localStorage.setItem('core_budget_academic_year_id', String(selectedYearId));
      } catch (_) {}
    }
  }, [selectedYearId]);

  // Modal RAPBS & Dokumen
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [revisionModalOpen, setRevisionModalOpen] = useState(false);
  const [realizationModalOpen, setRealizationModalOpen] = useState(false);
  const [planDocListModalOpen, setPlanDocListModalOpen] = useState(false);
  const [editTitleModalOpen, setEditTitleModalOpen] = useState(false);
  const [editPlanTarget, setEditPlanTarget] = useState(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [submittingTitle, setSubmittingTitle] = useState(false);

  // Modal 1: Pemetaan Rencana Pendapatan per Bulan
  const [incomeModalOpen, setIncomeModalOpen] = useState(false);
  const [editingIncomeItem, setEditingIncomeItem] = useState(null);
  const [incomeFormName, setIncomeFormName] = useState('');
  const [incomeFormMaxCap, setIncomeFormMaxCap] = useState(0);
  const [incomeMonthlyDist, setIncomeMonthlyDist] = useState({
    m1: 0, m2: 0, m3: 0, m4: 0, m5: 0, m6: 0, m7: 0, m8: 0, m9: 0, m10: 0, m11: 0, m12: 0
  });
  const [incomeFormFeeTypeId, setIncomeFormFeeTypeId] = useState('');

  // Proyeksi Arus Kas per Jenis Tagihan: Sub-tab, Filter, dan Baris Rincian
  const [cashFlowSubTab, setCashFlowSubTab] = useState('all'); // 'all' | 'consolidated' | 'by_fee_type'
  const [selectedCashFlowFeeTypeFilter, setSelectedCashFlowFeeTypeFilter] = useState('all');
  const [expandedCashFlowRows, setExpandedCashFlowRows] = useState({});
  const [initialCashBalance, setInitialCashBalance] = useState(0);

  const toggleCashFlowRow = (key) => {
    setExpandedCashFlowRows(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  // Modal 2: Input / Edit Rencana Pengeluaran (Belanja Program)
  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  const [editingExpenseItem, setEditingExpenseItem] = useState(null);
  const [expenseForm, setExpenseForm] = useState({
    entry_mode: 'itemized', // 'itemized' | 'lump_sum'
    name: '',
    lump_sum_description: '',
    budget_program_id: '',
    catalog_item_id: '',
    fund_source_fee_type_id: '',
    fund_source_income_item_id: '',
    fund_sources: [{ income_item_id: '', amount: 0 }],
    unit: 'Unit',
    unit_price: 0,
    planned_amount: 0,
    catalog_reference_price: null,
    monthly_distribution: {
      m1: 0, m2: 0, m3: 0, m4: 0, m5: 0, m6: 0, m7: 0, m8: 0, m9: 0, m10: 0, m11: 0, m12: 0
    }
  });

  // Inline Quick Add Catalog Item (di dalam modal belanja)
  const [quickCatalogOpen, setQuickCatalogOpen] = useState(false);
  const [quickCatalogForm, setQuickCatalogForm] = useState({
    name: '',
    unit: 'Unit',
    reference_price: 50000,
    expense_category_id: ''
  });
  const [submittingQuickCatalog, setSubmittingQuickCatalog] = useState(false);

  // Form RAPBS Creation
  const [title, setTitle] = useState('');
  const [academicYearId, setAcademicYearId] = useState(1);
  const [revisionReason, setRevisionReason] = useState('');

  // ==========================================
  // STATE TAB 2: STANDAR BIAYA / KATALOG HARGA
  // ==========================================
  const [catalogItems, setCatalogItems] = useState([]);
  const [expenseCategories, setExpenseCategories] = useState([]);
  const [catalogSearch, setCatalogSearch] = useState('');
  const [selectedExpenseCatFilter, setSelectedExpenseCatFilter] = useState('');
  const [catalogModalOpen, setCatalogModalOpen] = useState(false);
  const [catalogModalMode, setCatalogModalMode] = useState('create'); // 'create' | 'edit'
  const [selectedCatalogItem, setSelectedCatalogItem] = useState(null);
  const [catalogFormData, setCatalogFormData] = useState({
    name: '',
    unit: '',
    reference_price: 0,
    expense_category_id: '',
    academic_year_id: 1,
    reason: ''
  });

  // Modal Riwayat Harga
  const [priceHistoryModalOpen, setPriceHistoryModalOpen] = useState(false);
  const [priceHistoryLogs, setPriceHistoryLogs] = useState([]);
  const [priceHistoryLoading, setPriceHistoryLoading] = useState(false);
  const [selectedItemHistory, setSelectedItemHistory] = useState(null);

  // ==========================================
  // DATA FETCHING
  // ==========================================
  const fetchAcademicYears = async () => {
    try {
      const ayParams = {};
      if (activeSchoolUnit && activeSchoolUnit.id && activeSchoolUnit.id !== 'all' && !activeSchoolUnit.is_foundation) {
        ayParams.satuan_pendidikan_id = activeSchoolUnit.id;
      }
      const ayRes = await api.get('/akademik/academic-years', { params: ayParams });
      const yearsList = ayRes.data?.data || ayRes.data?.academic_years || [];

      const uniqueYearsMap = new Map();
      yearsList.forEach((y) => {
        const nameKey = (y.name || '').trim();
        if (!nameKey) return;
        const existing = uniqueYearsMap.get(nameKey);
        if (!existing) {
          uniqueYearsMap.set(nameKey, y);
        } else if (y.is_active && !existing.is_active) {
          uniqueYearsMap.set(nameKey, y);
        }
      });

      const uniqueYears = Array.from(uniqueYearsMap.values()).sort((a, b) => {
        if (a.is_active && !b.is_active) return -1;
        if (!a.is_active && b.is_active) return 1;
        return (b.name || '').localeCompare(a.name || '');
      });

      setAcademicYears(uniqueYears);
      if (uniqueYears.length > 0) {
        const savedYearId = (() => {
          try { return localStorage.getItem('core_budget_academic_year_id'); } catch (_) { return null; }
        })();
        const savedYearName = (() => {
          try { return localStorage.getItem('core_rkt_academic_year'); } catch (_) { return null; }
        })();

        let targetYear = null;
        if (savedYearId && uniqueYears.some(y => String(y.id) === String(savedYearId))) {
          targetYear = uniqueYears.find(y => String(y.id) === String(savedYearId));
        } else if (savedYearName && uniqueYears.some(y => y.name === savedYearName)) {
          targetYear = uniqueYears.find(y => y.name === savedYearName);
        } else if (selectedYearId && uniqueYears.some(y => String(y.id) === String(selectedYearId))) {
          targetYear = uniqueYears.find(y => String(y.id) === String(selectedYearId));
        } else {
          targetYear = uniqueYears.find(y => y.is_active) || uniqueYears[0];
        }

        if (targetYear) {
          setSelectedYearId(String(targetYear.id));
          setAcademicYearId(targetYear.id);
        }
      }
    } catch (e) {
      console.error('Error fetching academic years:', e);
    }
  };

  // Available Domains derived from budget programs
  const availableDomains = useMemo(() => {
    const map = new Map();
    budgetPrograms.forEach((bp) => {
      if (bp.domain_id && bp.domain_name) {
        if (!map.has(String(bp.domain_id))) {
          map.set(String(bp.domain_id), {
            id: String(bp.domain_id),
            name: bp.domain_name,
            code: bp.domain_code || (bp.domain_order_index ? `BID-${String(bp.domain_order_index).padStart(2, '0')}` : 'BDG'),
            order_index: bp.domain_order_index ?? 999,
          });
        }
      }
    });
    return Array.from(map.values()).sort((a, b) => (a.order_index - b.order_index) || (a.code || '').localeCompare(b.code || '') || a.name.localeCompare(b.name));
  }, [budgetPrograms]);

  // Available Subdomains derived from budget programs and filtered by selected domain
  const availableSubdomains = useMemo(() => {
    const map = new Map();
    budgetPrograms.forEach((bp) => {
      if (bp.subdomain_id && bp.subdomain_name) {
        if (filterExpenseDomain === 'all' || String(bp.domain_id) === String(filterExpenseDomain)) {
          if (!map.has(String(bp.subdomain_id))) {
            map.set(String(bp.subdomain_id), {
              id: String(bp.subdomain_id),
              name: bp.subdomain_name,
              code: bp.subdomain_code || (bp.subdomain_order_index ? `SUB-${String(bp.subdomain_order_index).padStart(2, '0')}` : 'SUB'),
              order_index: bp.subdomain_order_index ?? 999,
              domainName: bp.domain_name
            });
          }
        }
      }
    });
    return Array.from(map.values()).sort((a, b) => (a.order_index - b.order_index) || (a.code || '').localeCompare(b.code || '') || a.name.localeCompare(b.name));
  }, [budgetPrograms, filterExpenseDomain]);

  // Filtered Expense Items
  const filteredExpenseItems = useMemo(() => {
    if (!selectedPlan?.expense_items) return [];
    return selectedPlan.expense_items.filter((item) => {
      const prog = budgetPrograms.find((p) => p.id === item.budget_program_id);

      // Domain filter
      if (filterExpenseDomain !== 'all') {
        if (!prog || String(prog.domain_id) !== String(filterExpenseDomain)) {
          return false;
        }
      }

      // Subdomain filter
      if (filterExpenseSubdomain !== 'all') {
        if (!prog || String(prog.subdomain_id) !== String(filterExpenseSubdomain)) {
          return false;
        }
      }

      // Search query
      if (filterExpenseSearch.trim()) {
        const q = filterExpenseSearch.toLowerCase().trim();
        const matchesName = (item.name || '').toLowerCase().includes(q);
        const matchesProg = (item.budget_program_name || prog?.name || '').toLowerCase().includes(q);
        const matchesCat = (item.catalog_item_name || '').toLowerCase().includes(q);
        const matchesFund = (item.fund_source_name || '').toLowerCase().includes(q);
        const matchesDesc = (item.lump_sum_description || '').toLowerCase().includes(q);
        if (!matchesName && !matchesProg && !matchesCat && !matchesFund && !matchesDesc) {
          return false;
        }
      }

      return true;
    });
  }, [selectedPlan?.expense_items, budgetPrograms, filterExpenseDomain, filterExpenseSubdomain, filterExpenseSearch]);

  // Folding / Expanding Bidang, Sub-Bidang, dan Program Rencana Belanja
  const [expandedDomains, setExpandedDomains] = useState({});
  const [expandedSubdomains, setExpandedSubdomains] = useState({});
  const [expandedPrograms, setExpandedPrograms] = useState({});

  const toggleDomain = (domainKey) => {
    setExpandedDomains((prev) => ({
      ...prev,
      [domainKey]: prev[domainKey] === false ? true : false,
    }));
  };

  const toggleSubdomain = (subdomainKey) => {
    setExpandedSubdomains((prev) => ({
      ...prev,
      [subdomainKey]: prev[subdomainKey] === false ? true : false,
    }));
  };

  const toggleProgram = (progKey) => {
    setExpandedPrograms((prev) => ({
      ...prev,
      [progKey]: !prev[progKey],
    }));
  };

  // Grouped Expense Hierarchy: Bidang (Domain) -> Sub-Bidang (Subdomain) -> Program Kerja -> Pos Belanja (Items)
  const groupedExpenseHierarchy = useMemo(() => {
    if (!filteredExpenseItems || filteredExpenseItems.length === 0) return [];

    const domainMap = new Map();

    filteredExpenseItems.forEach((item) => {
      const progMeta = budgetPrograms.find((p) => p.id === item.budget_program_id || p.rks_reference_id === item.budget_program_id);
      const progId = item.budget_program_id || 'no_program';
      const progKey = `prog_${progId}`;
      const rawProgName = progMeta?.name || progMeta?.raw_name || item.budget_program_name || 'Program Lainnya / Tanpa RKT';
      let rawProgCode = progMeta?.code || progMeta?.program_code || '';
      const domainId = progMeta?.domain_id || 'no_domain';
      const domainName = progMeta?.domain_name || 'Bidang Umum / Operasional';
      const domainOrder = progMeta?.domain_order_index ?? 999;
      const domainCode = progMeta?.domain_code || (domainOrder !== 999 ? `BID-${String(domainOrder).padStart(2, '0')}` : 'BDG');
      const subdomainId = progMeta?.subdomain_id || 'no_subdomain';
      const subdomainName = progMeta?.subdomain_name || 'Sub-Bidang Umum';
      const subdomainOrder = progMeta?.subdomain_order_index ?? 999;
      const subdomainCode = progMeta?.subdomain_code || (subdomainOrder !== 999 ? `SUB-${String(subdomainOrder).padStart(2, '0')}` : 'SUB');
      const progOrder = progMeta?.order_index ?? 999;

      // Normalize and extract code
      let cleanCode = rawProgCode;
      let cleanName = (rawProgName || '').trim();
      const bracketMatch = cleanName.match(/^\[([^\]]+)\]\s*(.*)$/);
      if (bracketMatch) {
        if (!cleanCode) cleanCode = bracketMatch[1].trim();
        cleanName = bracketMatch[2].trim();
      } else if (cleanCode && cleanName.startsWith(cleanCode)) {
        cleanName = cleanName.replace(new RegExp(`^${cleanCode}\\s*[:-]?\\s*`), '').trim();
      }

      // 1. Ensure Domain in map
      const domKey = `dom_${domainId}`;
      if (!domainMap.has(domKey)) {
        domainMap.set(domKey, {
          key: domKey,
          id: domainId,
          name: domainName,
          code: domainCode,
          order_index: domainOrder,
          subdomainsMap: new Map(),
        });
      }
      const domObj = domainMap.get(domKey);

      // 2. Ensure Subdomain in domain's subdomainsMap
      const subKey = `sub_${domainId}_${subdomainId}`;
      if (!domObj.subdomainsMap.has(subKey)) {
        domObj.subdomainsMap.set(subKey, {
          key: subKey,
          id: subdomainId,
          name: subdomainName,
          code: subdomainCode,
          order_index: subdomainOrder,
          programsMap: new Map(),
        });
      }
      const subObj = domObj.subdomainsMap.get(subKey);

      // 3. Ensure Program in subdomain's programsMap
      if (!subObj.programsMap.has(progKey)) {
        subObj.programsMap.set(progKey, {
          key: progKey,
          id: progId,
          name: cleanName || rawProgName,
          code: cleanCode,
          order_index: progOrder,
          domain_name: domainName,
          subdomain_name: subdomainName,
          items: [],
        });
      }
      subObj.programsMap.get(progKey).items.push(item);
    });

    // 4. Compute summaries for each level & sort systematically
    const domainsList = [];
    domainMap.forEach((dom) => {
      let domTotalPlafon = 0;
      let domTotalItems = 0;
      const domMonthlyTotals = {};
      MONTHS.forEach((m) => { domMonthlyTotals[m.key] = 0; });

      const subdomainsList = [];
      dom.subdomainsMap.forEach((sub) => {
        let subTotalPlafon = 0;
        let subTotalItems = 0;
        const subMonthlyTotals = {};
        MONTHS.forEach((m) => { subMonthlyTotals[m.key] = 0; });

        const programsList = [];
        sub.programsMap.forEach((prog) => {
          const isAllNonItemized = prog.items.length > 0 && prog.items.every((it) => it.entry_mode === 'lump_sum');
          const isSingleNonItemized = prog.items.length === 1 && prog.items[0].entry_mode === 'lump_sum';

          const totalPlafon = prog.items.reduce((sum, it) => {
            const isLump = it.entry_mode === 'lump_sum';
            const q = parseFloat(it.quantity || 0);
            const p = parseFloat(it.unit_price || 0);
            return sum + parseFloat(it.planned_amount || (isLump ? it.planned_amount : q * p) || 0);
          }, 0);

          const monthlyTotals = {};
          MONTHS.forEach((m) => {
            const mSum = prog.items.reduce((sum, it) => {
              const isLump = it.entry_mode === 'lump_sum';
              const rawVal = parseFloat(it.monthly_distribution?.[m.key] || 0);
              const p = parseFloat(it.unit_price || 0);
              const monthVal = isLump ? rawVal : (rawVal * p);
              return sum + monthVal;
            }, 0);
            monthlyTotals[m.key] = mSum;
            subMonthlyTotals[m.key] += mSum;
            domMonthlyTotals[m.key] += mSum;
          });

          const totalQty = prog.items.reduce((sum, it) => sum + parseFloat(it.quantity || 0), 0);

          subTotalPlafon += totalPlafon;
          subTotalItems += prog.items.length;

          programsList.push({
            ...prog,
            isAllNonItemized,
            isSingleNonItemized,
            totalPlafon,
            monthlyTotals,
            totalQty,
          });
        });

        // Urutkan program berdasarkan order_index atau kode program secara sistematis
        programsList.sort((a, b) => {
          if (a.order_index !== b.order_index) return (a.order_index ?? 999) - (b.order_index ?? 999);
          if (a.code && b.code) return a.code.localeCompare(b.code, undefined, { numeric: true, sensitivity: 'base' });
          return a.name.localeCompare(b.name);
        });

        domTotalPlafon += subTotalPlafon;
        domTotalItems += subTotalItems;

        subdomainsList.push({
          ...sub,
          programs: programsList,
          totalPlafon: subTotalPlafon,
          totalItems: subTotalItems,
          monthlyTotals: subMonthlyTotals,
        });
      });

      // Urutkan sub-bidang berdasarkan order_index atau kode sub-bidang (SUB-01, SUB-02, dst)
      subdomainsList.sort((a, b) => {
        if (a.order_index !== b.order_index) return (a.order_index ?? 999) - (b.order_index ?? 999);
        if (a.code && b.code) return a.code.localeCompare(b.code, undefined, { numeric: true, sensitivity: 'base' });
        return a.name.localeCompare(b.name);
      });

      domainsList.push({
        ...dom,
        subdomains: subdomainsList,
        totalPrograms: subdomainsList.reduce((sum, s) => sum + s.programs.length, 0),
        totalItems: domTotalItems,
        totalPlafon: domTotalPlafon,
        monthlyTotals: domMonthlyTotals,
      });
    });

    // Urutkan bidang berdasarkan order_index atau kode bidang (BID-01, BID-02, dst)
    domainsList.sort((a, b) => {
      if (a.order_index !== b.order_index) return (a.order_index ?? 999) - (b.order_index ?? 999);
      if (a.code && b.code) return a.code.localeCompare(b.code, undefined, { numeric: true, sensitivity: 'base' });
      return a.name.localeCompare(b.name);
    });

    return domainsList;
  }, [filteredExpenseItems, budgetPrograms]);

  const handleExpandAllPrograms = () => {
    const allD = {};
    const allS = {};
    const allP = {};
    groupedExpenseHierarchy.forEach((dom) => {
      allD[dom.key] = true;
      dom.subdomains.forEach((sub) => {
        allS[sub.key] = true;
        sub.programs.forEach((p) => {
          allP[p.key] = true;
        });
      });
    });
    setExpandedDomains(allD);
    setExpandedSubdomains(allS);
    setExpandedPrograms(allP);
  };

  const handleCollapseAllPrograms = () => {
    const allD = {};
    const allS = {};
    groupedExpenseHierarchy.forEach((dom) => {
      allD[dom.key] = false;
      dom.subdomains.forEach((sub) => {
        allS[sub.key] = false;
      });
    });
    setExpandedDomains(allD);
    setExpandedSubdomains(allS);
    setExpandedPrograms({});
  };

  // Flattened programs count for toolbar indicator
  const totalGroupedProgramsCount = useMemo(() => {
    return groupedExpenseHierarchy.reduce((sum, d) => sum + d.totalPrograms, 0);
  }, [groupedExpenseHierarchy]);

  // Proyeksi Arus Kas & Surplus/Defisit per Sumber Pendapatan RAPBS
  // Mengintegrasikan rencana pemasukan (Nama Sumber Pendapatan) dan beban belanja (Pos Sumber Dana & Multi-Sumber Dana)
  const cashFlowByFeeType = useMemo(() => {
    if (!selectedPlan?.income_items || !selectedPlan?.expense_items) return [];

    const emptyMonths = { m1: 0, m2: 0, m3: 0, m4: 0, m5: 0, m6: 0, m7: 0, m8: 0, m9: 0, m10: 0, m11: 0, m12: 0 };
    const map = new Map();

    // 1. Inisialisasi setiap Sumber Pendapatan dari RAPBS tahun ajaran ini
    selectedPlan.income_items.forEach((inc) => {
      const mInc = { ...emptyMonths };
      MONTHS.forEach((m) => {
        mInc[m.key] = parseFloat(inc.monthly_distribution?.[m.key] || 0);
      });

      map.set(String(inc.id), {
        id: inc.id,
        key: `inc_${inc.id}`,
        name: inc.name,
        fee_type_id: inc.fee_type_id,
        fee_type_name: inc.fee_type_name || null,
        billing_pattern: inc.fee_type_billing_pattern || 'custom',
        category: 'Sumber Pendapatan RAPBS',
        income_items: [inc],
        expense_items: [],
        monthly_income: mInc,
        monthly_expense: { ...emptyMonths },
        monthly_net: { ...emptyMonths },
        total_income: parseFloat(inc.planned_amount || 0),
        total_expense: 0,
        total_net: 0,
      });
    });

    const unmappedGroup = {
      id: 'unmapped',
      key: 'inc_unmapped',
      name: 'Belanja Belum Terpetakan / Non-Sumber Pendapatan',
      billing_pattern: 'flexible',
      category: 'Sumber Dana Belanja',
      income_items: [],
      expense_items: [],
      monthly_income: { ...emptyMonths },
      monthly_expense: { ...emptyMonths },
      monthly_net: { ...emptyMonths },
      total_income: 0,
      total_expense: 0,
      total_net: 0,
    };

    // 2. Petakan Rencana Pengeluaran ke masing-masing Sumber Pendapatan
    selectedPlan.expense_items.forEach((item) => {
      const isLump = item.entry_mode === 'lump_sum';
      const itemTotalPrice = parseFloat(item.planned_amount || (item.quantity * item.unit_price) || 0);

      // Hitung nominal belanja bulanan untuk item ini
      const itemMonthlyNominal = {};
      MONTHS.forEach((m) => {
        if (isLump) {
          itemMonthlyNominal[m.key] = parseFloat(item.monthly_distribution?.[m.key] || 0);
        } else {
          const q = parseFloat(item.monthly_distribution?.[m.key] || 0);
          const p = parseFloat(item.unit_price || item.planned_amount || 0);
          itemMonthlyNominal[m.key] = q * p;
        }
      });

      // Periksa apakah item memiliki multi-sumber dana (fund_sources)
      let parsedSources = [];
      if (item.fund_sources) {
        try {
          parsedSources = typeof item.fund_sources === 'string' ? JSON.parse(item.fund_sources) : item.fund_sources;
        } catch (e) { parsedSources = []; }
      }

      if (Array.isArray(parsedSources) && parsedSources.length > 0) {
        // Multi-sumber dana: alokasikan ke masing-masing Sumber Pendapatan secara proporsional
        parsedSources.forEach((src) => {
          let grp = null;
          if (src.income_item_id && map.has(String(src.income_item_id))) {
            grp = map.get(String(src.income_item_id));
          } else {
            const matchedInc = selectedPlan.income_items.find(i =>
              (src.income_item_id && i.id === Number(src.income_item_id)) ||
              (src.fee_type_id && i.fee_type_id === Number(src.fee_type_id)) ||
              (src.name && i.name.toLowerCase() === src.name.toLowerCase())
            );
            if (matchedInc && map.has(String(matchedInc.id))) {
              grp = map.get(String(matchedInc.id));
            } else {
              grp = unmappedGroup;
            }
          }

          const allocAmount = parseFloat(src.amount || 0);
          const ratio = itemTotalPrice > 0 ? (allocAmount / itemTotalPrice) : (1 / parsedSources.length);

          grp.expense_items.push({
            ...item,
            allocated_amount: allocAmount,
            allocation_ratio: ratio
          });
          grp.total_expense += allocAmount;

          MONTHS.forEach((m) => {
            grp.monthly_expense[m.key] += (itemMonthlyNominal[m.key] * ratio);
          });
        });
      } else {
        // Single sumber dana
        let grp = null;
        if (item.fund_source_income_item_id && map.has(String(item.fund_source_income_item_id))) {
          grp = map.get(String(item.fund_source_income_item_id));
        } else if (item.fund_source_fee_type_id) {
          const matchedInc = selectedPlan.income_items.find(i => i.fee_type_id === Number(item.fund_source_fee_type_id));
          if (matchedInc && map.has(String(matchedInc.id))) {
            grp = map.get(String(matchedInc.id));
          }
        }

        if (!grp) {
          const matchedInc = selectedPlan.income_items.find(i =>
            (item.fund_source_income_name && i.name.toLowerCase().includes(item.fund_source_income_name.toLowerCase())) ||
            (item.fund_source_name && i.name.toLowerCase().includes(item.fund_source_name.toLowerCase())) ||
            (item.fund_source_fee_type_name && i.name.toLowerCase().includes(item.fund_source_fee_type_name.toLowerCase()))
          );
          grp = (matchedInc && map.has(String(matchedInc.id))) ? map.get(String(matchedInc.id)) : unmappedGroup;
        }

        grp.expense_items.push({
          ...item,
          allocated_amount: itemTotalPrice,
          allocation_ratio: 1
        });
        grp.total_expense += itemTotalPrice;

        MONTHS.forEach((m) => {
          grp.monthly_expense[m.key] += itemMonthlyNominal[m.key];
        });
      }
    });

    // 3. Hitung Net Surplus / (Defisit) Bulanan & Tahunan
    const result = [];
    map.forEach((grp) => {
      MONTHS.forEach((m) => {
        grp.monthly_net[m.key] = grp.monthly_income[m.key] - grp.monthly_expense[m.key];
      });
      grp.total_net = grp.total_income - grp.total_expense;
      result.push(grp);
    });

    if (unmappedGroup.total_expense > 0 || unmappedGroup.expense_items.length > 0) {
      MONTHS.forEach((m) => {
        unmappedGroup.monthly_net[m.key] = unmappedGroup.monthly_income[m.key] - unmappedGroup.monthly_expense[m.key];
      });
      unmappedGroup.total_net = unmappedGroup.total_income - unmappedGroup.total_expense;
      result.push(unmappedGroup);
    }

    // Urutkan: Sumber Pendapatan dengan anggaran terbesar di urutan atas
    result.sort((a, b) => (b.total_income + b.total_expense) - (a.total_income + a.total_expense));

    return result;
  }, [selectedPlan?.income_items, selectedPlan?.expense_items]);

  // Pos tagihan terfilter berdasarkan dropdown filter
  const filteredCashFlowByFeeType = useMemo(() => {
    if (selectedCashFlowFeeTypeFilter === 'all') return cashFlowByFeeType;
    return cashFlowByFeeType.filter((grp) => String(grp.id) === String(selectedCashFlowFeeTypeFilter));
  }, [cashFlowByFeeType, selectedCashFlowFeeTypeFilter]);

  const fetchPlans = async () => {
    setLoading(true);
    try {
      const planParams = {};
      if (selectedYearId) {
        planParams.academic_year_id = selectedYearId;
      }

      const [plansRes, programsRes, feesRes, catRes, catalogRes, loansRes] = await Promise.all([
        api.get('/keuangan/budget-plans', { params: planParams }),
        api.get('/keuangan/budget-programs', { params: planParams }),
        api.get('/keuangan/fee-types'),
        api.get('/keuangan/transaction-categories', { params: { category_kind: 'expense' } }),
        api.get('/keuangan/catalog-items'),
        api.get('/keuangan/fund-balances/academic-year-loans-summary', { params: planParams }).catch(() => null)
      ]);

      const planList = plansRes.data?.data || [];
      setPlans(planList);
      setBudgetPrograms(programsRes.data?.data || []);
      setFeeTypes(feesRes.data?.data || []);

      const rawCats = catRes.data?.data || [];
      const seenCatNames = new Set();
      const uniqueCats = [];
      rawCats.forEach(c => {
        const nameKey = (c.name || '').trim().toLowerCase();
        if (!seenCatNames.has(nameKey)) {
          seenCatNames.add(nameKey);
          uniqueCats.push(c);
        }
      });
      setExpenseCategories(uniqueCats);
      setCatalogItems(catalogRes.data?.data || []);
      setAyLoansSummary(loansRes?.data?.data || null);

      if (planList.length > 0) {
        if (selectedPlan) {
          const fresh = planList.find(p => p.id === selectedPlan.id) || planList[0];
          handleSelectPlan(fresh);
        } else {
          handleSelectPlan(planList[0]);
        }
      } else {
        setSelectedPlan(null);
      }
    } catch (err) {
      console.error('Error fetching RAPBS data:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCatalogItems = async () => {
    try {
      const res = await api.get('/keuangan/catalog-items');
      setCatalogItems(res.data?.data || []);
    } catch (err) {
      console.error('Error fetching catalog items:', err);
    }
  };

  useEffect(() => {
    fetchAcademicYears();
  }, [activeSchoolUnit]);

  useEffect(() => {
    if (selectedYearId) {
      fetchPlans();
    }
  }, [activeSchoolUnit, selectedYearId]);

  // Listener untuk reload database dari layout tanpa refresh halaman
  useEffect(() => {
    const handleReload = () => {
      fetchAcademicYears();
      if (selectedYearId) {
        fetchPlans();
      }
    };
    window.addEventListener('keuangan:reload', handleReload);
    return () => {
      window.removeEventListener('keuangan:reload', handleReload);
    };
  }, [selectedYearId, activeSchoolUnit]);

  const handleSelectPlan = async (plan) => {
    try {
      const res = await api.get(`/keuangan/budget-plans/${plan.id}`);
      setSelectedPlan(res.data?.data || plan);
    } catch (err) {
      setSelectedPlan(plan);
    }
  };

  // Handler: Generate Rencana Penerimaan dari Penetapan Biaya Santri
  const handleGenerateIncomeFromFees = async () => {
    if (!selectedPlan) return;
    if (selectedPlan.status === 'published') {
      alert('Dokumen RAPBS ini telah disahkan resmi. Buat versi revisi (draft) terlebih dahulu jika ingin memperbarui.');
      return;
    }

    if (!window.confirm(`Konfirmasi: Generate otomatis seluruh pos penerimaan RAPBS dari penetapan biaya santri pada tahun ajaran ini? Pos bulanan (seperti SPP) akan dikalikan 12 bulan.`)) {
      return;
    }

    setGeneratingIncome(true);
    try {
      const res = await api.post(`/keuangan/budget-plans/${selectedPlan.id}/generate-income-from-fees`);
      alert(res.data?.message || 'Rencana penerimaan berhasil digenerate dari penetapan biaya');
      fetchPlans();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal generate rencana penerimaan');
    } finally {
      setGeneratingIncome(false);
    }
  };

  const handleOpenEditTitle = (plan) => {
    setEditPlanTarget(plan);
    setEditingTitle(plan.title || `RAPBS Versi ${plan.version}.0`);
    setEditTitleModalOpen(true);
  };

  const handleSaveTitle = async (e) => {
    e.preventDefault();
    if (!editPlanTarget) return;

    setSubmittingTitle(true);
    try {
      await api.patch(`/keuangan/budget-plans/${editPlanTarget.id}/title`, {
        title: editingTitle
      });
      alert('Nama dokumen RAPBS berhasil diperbarui');
      setEditTitleModalOpen(false);
      fetchPlans();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal memperbarui nama dokumen RAPBS');
    } finally {
      setSubmittingTitle(false);
    }
  };

  // ==========================================
  // HANDLERS: RAPBS
  // ==========================================
  const handleCreateDraft = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await api.post('/keuangan/budget-plans', {
        academic_year_id: academicYearId,
        title: title || 'RAPBS Tahun Ajaran 2026/2027'
      });
      setCreateModalOpen(false);
      setTitle('');
      await fetchPlans();
      if (res.data?.data) setSelectedPlan(res.data.data);
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal membuat draft RAPBS');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePublish = async (id) => {
    if (!window.confirm('Konfirmasi: Apakah Anda yakin ingin Menerbitkan & Mengesahkan RAPBS ini? Setelah disahkan, versi ini menjadi acuan resmi dan terkunci.')) return;
    try {
      await api.patch(`/keuangan/budget-plans/${id}/publish`);
      await fetchPlans();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menerbitkan RAPBS');
    }
  };

  const handleCreateRevision = async (e) => {
    e.preventDefault();
    if (!revisionReason.trim()) {
      alert('Mohon isi alasan revisi RAPBS');
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.post(`/keuangan/budget-plans/${selectedPlan.id}/new-version`, {
        revision_reason: revisionReason
      });
      setRevisionModalOpen(false);
      setRevisionReason('');
      await fetchPlans();
      if (res.data?.data) setSelectedPlan(res.data.data);
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal membuat versi revisi RAPBS');
    } finally {
      setSubmitting(false);
    }
  };

  // ==========================================
  // HANDLERS: PEMETAAN RENCANA PENDAPATAN (INCOME)
  // ==========================================
  const handleOpenAddIncome = () => {
    setEditingIncomeItem(null);
    setIncomeFormName('');
    setIncomeFormFeeTypeId('');
    setIncomeFormMaxCap(0);
    setIncomeMonthlyDist({
      m1: 0, m2: 0, m3: 0, m4: 0, m5: 0, m6: 0, m7: 0, m8: 0, m9: 0, m10: 0, m11: 0, m12: 0
    });
    setIncomeModalOpen(true);
  };

  const handleOpenEditIncome = (item) => {
    setEditingIncomeItem(item);
    setIncomeFormName(item.name || '');
    setIncomeFormFeeTypeId(item.fee_type_id || '');
    const cap = parseFloat(item.max_cap_amount || item.planned_amount || 0);
    setIncomeFormMaxCap(cap);

    // Parse existing monthly distribution
    let dist = { m1: 0, m2: 0, m3: 0, m4: 0, m5: 0, m6: 0, m7: 0, m8: 0, m9: 0, m10: 0, m11: 0, m12: 0 };
    if (item.monthly_distribution && typeof item.monthly_distribution === 'object') {
      MONTHS.forEach(m => {
        dist[m.key] = parseFloat(item.monthly_distribution[m.key] || 0);
      });
    } else {
      // Default bagi rata
      const perMonth = Math.round(cap / 12);
      MONTHS.forEach((m, idx) => {
        dist[m.key] = idx === 11 ? (cap - perMonth * 11) : perMonth;
      });
    }
    setIncomeMonthlyDist(dist);
    setIncomeModalOpen(true);
  };

  const handleDistributeEvenlyIncome = () => {
    const totalToDistribute = incomeFormMaxCap > 0 ? incomeFormMaxCap : Object.values(incomeMonthlyDist).reduce((a, b) => a + (parseFloat(b) || 0), 0);
    if (totalToDistribute <= 0) return;
    const perMonth = Math.round(totalToDistribute / 12);
    const newDist = {};
    MONTHS.forEach((m, idx) => {
      newDist[m.key] = idx === 11 ? (totalToDistribute - perMonth * 11) : perMonth;
    });
    setIncomeMonthlyDist(newDist);
  };

  const handleResetIncomeMonths = () => {
    const newDist = {};
    MONTHS.forEach(m => { newDist[m.key] = 0; });
    setIncomeMonthlyDist(newDist);
  };

  const handleSaveIncomeMonthly = async (e) => {
    e.preventDefault();
    if (!selectedPlan) return;

    const sumMonths = Object.values(incomeMonthlyDist).reduce((acc, val) => acc + (parseFloat(val) || 0), 0);
    if (incomeFormMaxCap > 0 && sumMonths > incomeFormMaxCap) {
      alert(`Total pemetaan bulanan (Rp ${sumMonths.toLocaleString('id-ID')}) tidak boleh melebihi batas penetapan setahun (Rp ${incomeFormMaxCap.toLocaleString('id-ID')}).`);
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name: incomeFormName,
        fee_type_id: incomeFormFeeTypeId ? Number(incomeFormFeeTypeId) : null,
        planned_amount: sumMonths,
        max_cap_amount: incomeFormMaxCap > 0 ? incomeFormMaxCap : sumMonths,
        monthly_distribution: incomeMonthlyDist
      };

      if (editingIncomeItem) {
        await api.put(`/keuangan/budget-plans/${selectedPlan.id}/income-items/${editingIncomeItem.id}`, payload);
      } else {
        await api.post(`/keuangan/budget-plans/${selectedPlan.id}/income-items`, payload);
      }

      setIncomeModalOpen(false);
      await handleSelectPlan(selectedPlan);
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menyimpan pemetaan rencana penerimaan');
    } finally {
      setSubmitting(false);
    }
  };

  // ==========================================
  // HANDLERS: RENCANA PENGELUARAN (EXPENSE)
  // ==========================================
  // HANDLERS: EXPENSE ITEMS (ITEMIZED & LUMP SUM)
  // ==========================================
  const handleOpenAddExpense = (defaultProgramId = null) => {
    setEditingExpenseItem(null);
    setQuickCatalogOpen(false);
    const chosenProgId = defaultProgramId !== null && defaultProgramId !== undefined
      ? (typeof defaultProgramId === 'number' ? defaultProgramId : Number(defaultProgramId) || '')
      : (budgetPrograms[0]?.id || '');

    const defaultIncomeItemId = selectedPlan?.income_items?.[0]?.id || '';
    const defaultFeeTypeId = selectedPlan?.income_items?.[0]?.fee_type_id || feeTypes[0]?.id || '';

    setExpenseForm({
      entry_mode: 'itemized',
      name: '',
      lump_sum_description: '',
      budget_program_id: chosenProgId,
      catalog_item_id: '',
      fund_source_income_item_id: defaultIncomeItemId,
      fund_source_fee_type_id: defaultFeeTypeId,
      fund_sources: defaultIncomeItemId ? [{ income_item_id: defaultIncomeItemId, amount: 0 }] : [],
      unit: 'Unit',
      unit_price: 0,
      planned_amount: 0,
      catalog_reference_price: null,
      monthly_distribution: {
        m1: 0, m2: 0, m3: 0, m4: 0, m5: 0, m6: 0, m7: 0, m8: 0, m9: 0, m10: 0, m11: 0, m12: 0
      }
    });
    setExpenseModalOpen(true);
  };

  const handleSyncPrograms = async () => {
    try {
      setSyncingPrograms(true);
      const planParams = {};
      if (selectedYearId) {
        planParams.academic_year_id = selectedYearId;
      }
      const res = await api.get('/keuangan/budget-programs', { params: planParams });
      const updatedProgs = res.data?.data || [];
      setBudgetPrograms(updatedProgs);

      if (selectedPlan) {
        await handleSelectPlan(selectedPlan);
      }
      alert(`Sinkronisasi berhasil! ${updatedProgs.length} Program RKT/RIPS dari Modul Manajemen telah diperbarui.`);
    } catch (err) {
      console.error('Gagal sinkronisasi program:', err);
      alert(err.response?.data?.message || 'Gagal sinkronisasi program RKT/RIPS');
    } finally {
      setSyncingPrograms(false);
    }
  };

  const handleOpenEditExpense = (item) => {
    setEditingExpenseItem(item);
    setQuickCatalogOpen(false);

    let dist = { m1: 0, m2: 0, m3: 0, m4: 0, m5: 0, m6: 0, m7: 0, m8: 0, m9: 0, m10: 0, m11: 0, m12: 0 };
    if (item.monthly_distribution && typeof item.monthly_distribution === 'object') {
      MONTHS.forEach(m => {
        dist[m.key] = parseFloat(item.monthly_distribution[m.key] || 0);
      });
    } else {
      dist.m1 = item.entry_mode === 'lump_sum' ? parseFloat(item.planned_amount || 0) : parseFloat(item.quantity || 1);
    }

    let refPrice = null;
    if (item.catalog_item_id) {
      const cat = catalogItems.find(c => c.id === item.catalog_item_id);
      if (cat) refPrice = parseFloat(cat.reference_price || 0);
    }

    let initialFundSources = [];
    if (item.fund_sources && Array.isArray(item.fund_sources) && item.fund_sources.length > 0) {
      initialFundSources = item.fund_sources.map(s => ({
        income_item_id: s.income_item_id || '',
        amount: parseFloat(s.amount || 0)
      }));
    } else if (item.fund_source_income_item_id) {
      initialFundSources = [{
        income_item_id: item.fund_source_income_item_id,
        amount: parseFloat(item.planned_amount || 0)
      }];
    } else if (item.fund_source_fee_type_id) {
      const matchedInc = selectedPlan?.income_items?.find(i => i.fee_type_id === item.fund_source_fee_type_id);
      initialFundSources = [{
        income_item_id: matchedInc ? matchedInc.id : (selectedPlan?.income_items?.[0]?.id || ''),
        amount: parseFloat(item.planned_amount || 0)
      }];
    } else {
      initialFundSources = selectedPlan?.income_items?.[0]?.id
        ? [{ income_item_id: selectedPlan.income_items[0].id, amount: parseFloat(item.planned_amount || 0) }]
        : [];
    }

    setExpenseForm({
      entry_mode: item.entry_mode || 'itemized',
      name: item.name || '',
      lump_sum_description: item.lump_sum_description || '',
      budget_program_id: item.budget_program_id || budgetPrograms[0]?.id || '',
      catalog_item_id: item.catalog_item_id || '',
      fund_source_income_item_id: item.fund_source_income_item_id || (initialFundSources[0]?.income_item_id || ''),
      fund_source_fee_type_id: item.fund_source_fee_type_id || '',
      fund_sources: initialFundSources,
      unit: item.unit || 'Unit',
      unit_price: parseFloat(item.unit_price || 0),
      planned_amount: parseFloat(item.planned_amount || 0),
      catalog_reference_price: refPrice,
      monthly_distribution: dist
    });
    setExpenseModalOpen(true);
  };

  const handleDistributeEvenlyLumpSum = () => {
    const total = parseFloat(expenseForm.planned_amount || 0);
    if (total <= 0) return;
    const perMonth = Math.round(total / 12);
    const newDist = {};
    MONTHS.forEach((m, idx) => {
      newDist[m.key] = idx === 11 ? (total - perMonth * 11) : perMonth;
    });
    setExpenseForm(prev => ({
      ...prev,
      monthly_distribution: newDist
    }));
  };

  const handleCatalogSelectInExpense = (catalogId) => {
    if (!catalogId) {
      setExpenseForm(prev => ({
        ...prev,
        catalog_item_id: '',
        catalog_reference_price: null
      }));
      return;
    }

    const cat = catalogItems.find(c => c.id === Number(catalogId));
    if (cat) {
      const refPrice = parseFloat(cat.reference_price || 0);
      setExpenseForm(prev => ({
        ...prev,
        catalog_item_id: cat.id,
        name: cat.name,
        unit: cat.unit || prev.unit,
        catalog_reference_price: refPrice,
        unit_price: (prev.unit_price <= 0 || prev.unit_price > refPrice) ? refPrice : prev.unit_price
      }));
    }
  };

  const handleQuickAddCatalogSubmit = async (e) => {
    e.preventDefault();
    if (!quickCatalogForm.name.trim()) return;

    setSubmittingQuickCatalog(true);
    try {
      const res = await api.post('/keuangan/catalog-items', {
        name: quickCatalogForm.name,
        unit: quickCatalogForm.unit || 'Unit',
        reference_price: parseFloat(quickCatalogForm.reference_price || 0),
        expense_category_id: quickCatalogForm.expense_category_id ? Number(quickCatalogForm.expense_category_id) : (expenseCategories[0]?.id || null),
        academic_year_id: selectedPlan?.academic_year_id || selectedYearId || 1
      });

      const newItem = res.data?.data;
      await fetchCatalogItems();

      if (newItem) {
        setExpenseForm(prev => ({
          ...prev,
          catalog_item_id: newItem.id,
          name: newItem.name,
          unit: newItem.unit,
          catalog_reference_price: parseFloat(newItem.reference_price),
          unit_price: parseFloat(newItem.reference_price)
        }));
      }

      setQuickCatalogOpen(false);
      setQuickCatalogForm({
        name: '',
        unit: 'Unit',
        reference_price: 50000,
        expense_category_id: ''
      });
      alert('Item baru berhasil ditambahkan ke Standar Biaya & Katalog!');
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menambahkan item katalog');
    } finally {
      setSubmittingQuickCatalog(false);
    }
  };

  const handleSaveExpense = async (e) => {
    e.preventDefault();
    if (!selectedPlan) return;

    if (expenseForm.entry_mode === 'lump_sum') {
      if (!expenseForm.lump_sum_description.trim()) {
        alert('Uraian kegiatan / keperluan (lump sum) wajib diisi.');
        return;
      }
      if (!expenseForm.fund_sources || expenseForm.fund_sources.length === 0) {
        alert('Minimal satu Pos Sumber Dana dari Rencana Pendapatan RAPBS wajib dipilih.');
        return;
      }
      const hasEmptySource = expenseForm.fund_sources.some(s => !s.income_item_id);
      if (hasEmptySource) {
        alert('Semua baris Sumber Dana harus dipilih.');
        return;
      }

      const sumMonths = Object.values(expenseForm.monthly_distribution).reduce((acc, val) => acc + (parseFloat(val) || 0), 0);
      const plannedAmount = parseFloat(expenseForm.planned_amount || 0);
      if (plannedAmount <= 0) {
        alert('Total pagu anggaran belanja lump sum harus lebih dari Rp 0.');
        return;
      }
      if (sumMonths !== plannedAmount) {
        alert(`Total sebaran 12 bulan (Rp ${sumMonths.toLocaleString('id-ID')}) harus sama dengan Total Pagu Anggaran (Rp ${plannedAmount.toLocaleString('id-ID')}). Silakan sesuaikan atau klik tombol "Bagi Rata 12 Bulan".`);
        return;
      }

      const totalAllocated = expenseForm.fund_sources.reduce((acc, s) => acc + (parseFloat(s.amount) || 0), 0);
      if (Math.abs(totalAllocated - plannedAmount) > 1) {
        alert(`Total alokasi sumber dana (Rp ${totalAllocated.toLocaleString('id-ID')}) harus sama dengan Total Pagu Anggaran Belanja (Rp ${plannedAmount.toLocaleString('id-ID')}).`);
        return;
      }

      setSubmitting(true);
      try {
        const selectedProg = budgetPrograms.find(p => p.id === Number(expenseForm.budget_program_id));
        const finalName = expenseForm.name.trim() || selectedProg?.name || 'Kegiatan Lump Sum';
        const formattedSources = expenseForm.fund_sources.map(s => {
          const incObj = selectedPlan.income_items.find(i => i.id === Number(s.income_item_id));
          return {
            income_item_id: Number(s.income_item_id),
            name: incObj ? incObj.name : 'Sumber Pendapatan',
            fee_type_id: incObj?.fee_type_id || null,
            amount: parseFloat(s.amount || 0)
          };
        });

        const payload = {
          entry_mode: 'lump_sum',
          name: finalName,
          lump_sum_description: expenseForm.lump_sum_description,
          budget_program_id: Number(expenseForm.budget_program_id),
          fund_source_income_item_id: formattedSources[0]?.income_item_id || null,
          fund_source_fee_type_id: formattedSources[0]?.fee_type_id || null,
          fund_sources: formattedSources,
          planned_amount: plannedAmount,
          monthly_distribution: expenseForm.monthly_distribution
        };

        if (editingExpenseItem) {
          await api.put(`/keuangan/budget-plans/${selectedPlan.id}/expense-items/${editingExpenseItem.id}`, payload);
        } else {
          await api.post(`/keuangan/budget-plans/${selectedPlan.id}/expense-items`, payload);
        }

        setExpenseModalOpen(false);
        await handleSelectPlan(selectedPlan);
      } catch (err) {
        alert(err.response?.data?.message || 'Gagal menyimpan item belanja');
      } finally {
        setSubmitting(false);
      }
    } else {
      // Validasi harga acuan katalog
      if (expenseForm.catalog_item_id && expenseForm.catalog_reference_price !== null) {
        if (parseFloat(expenseForm.unit_price) > parseFloat(expenseForm.catalog_reference_price)) {
          alert(`Harga satuan (Rp ${Number(expenseForm.unit_price).toLocaleString('id-ID')}) tidak boleh melebihi harga tertinggi katalog (Rp ${Number(expenseForm.catalog_reference_price).toLocaleString('id-ID')}).`);
          return;
        }
      }

      if (!expenseForm.fund_source_income_item_id) {
        alert('Pos Sumber Dana dari Rencana Pendapatan RAPBS wajib dipilih.');
        return;
      }

      const sumQty = Object.values(expenseForm.monthly_distribution).reduce((acc, val) => acc + (parseFloat(val) || 0), 0);
      if (sumQty <= 0) {
        alert('Total kuantitas / volume belanja pada 12 bulan tidak boleh 0. Silakan isi kuantitas pada bulan yang diinginkan.');
        return;
      }

      const unitPrice = parseFloat(expenseForm.unit_price || 0);
      const plannedAmount = sumQty * unitPrice;

      setSubmitting(true);
      try {
        const incObj = selectedPlan.income_items.find(i => i.id === Number(expenseForm.fund_source_income_item_id));
        const payload = {
          entry_mode: 'itemized',
          name: expenseForm.name,
          budget_program_id: Number(expenseForm.budget_program_id),
          catalog_item_id: expenseForm.catalog_item_id ? Number(expenseForm.catalog_item_id) : null,
          fund_source_income_item_id: Number(expenseForm.fund_source_income_item_id),
          fund_source_fee_type_id: incObj?.fee_type_id || null,
          fund_sources: [{
            income_item_id: Number(expenseForm.fund_source_income_item_id),
            name: incObj ? incObj.name : 'Sumber Pendapatan',
            fee_type_id: incObj?.fee_type_id || null,
            amount: plannedAmount
          }],
          unit: expenseForm.unit || 'Unit',
          quantity: sumQty,
          unit_price: unitPrice,
          planned_amount: plannedAmount,
          monthly_distribution: expenseForm.monthly_distribution
        };

        if (editingExpenseItem) {
          await api.put(`/keuangan/budget-plans/${selectedPlan.id}/expense-items/${editingExpenseItem.id}`, payload);
        } else {
          await api.post(`/keuangan/budget-plans/${selectedPlan.id}/expense-items`, payload);
        }

        setExpenseModalOpen(false);
        await handleSelectPlan(selectedPlan);
      } catch (err) {
        alert(err.response?.data?.message || 'Gagal menyimpan item belanja');
      } finally {
        setSubmitting(false);
      }
    }
  };

  const handleDeleteItem = async (itemId, kind) => {
    if (!window.confirm('Hapus item pos anggaran ini?')) return;
    try {
      const endpoint = kind === 'income'
        ? `/keuangan/budget-plans/${selectedPlan.id}/income-items/${itemId}`
        : `/keuangan/budget-plans/${selectedPlan.id}/expense-items/${itemId}`;
      await api.delete(endpoint);
      handleSelectPlan(selectedPlan);
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menghapus item anggaran');
    }
  };

  const handleViewRealization = async (id) => {
    try {
      setLoading(true);
      const res = await api.get(`/keuangan/budget-plans/${id}/realization`);
      setRealizationData(res.data?.data);
      setRealizationModalOpen(true);
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menghitung realisasi anggaran');
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // HANDLERS: KATALOG STANDAR BIAYA
  // ==========================================
  const handleOpenCreateCatalog = () => {
    setCatalogModalMode('create');
    setSelectedCatalogItem(null);
    setCatalogFormData({
      name: '',
      unit: 'Unit',
      reference_price: 50000,
      expense_category_id: expenseCategories[0]?.id || '',
      academic_year_id: 1,
      reason: ''
    });
    setCatalogModalOpen(true);
  };

  const handleOpenEditCatalog = (item) => {
    setCatalogModalMode('edit');
    setSelectedCatalogItem(item);
    setCatalogFormData({
      name: item.name,
      unit: item.unit,
      reference_price: item.reference_price,
      expense_category_id: item.expense_category_id || '',
      academic_year_id: item.academic_year_id || 1,
      reason: ''
    });
    setCatalogModalOpen(true);
  };

  const handleSubmitCatalog = async (e) => {
    e.preventDefault();
    if (catalogModalMode === 'edit' && (!catalogFormData.reason || !catalogFormData.reason.trim())) {
      alert('Mohon isi Catatan / Alasan Perubahan Harga Acuan untuk riwayat audit.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name: catalogFormData.name,
        unit: catalogFormData.unit,
        reference_price: parseFloat(catalogFormData.reference_price),
        expense_category_id: catalogFormData.expense_category_id ? Number(catalogFormData.expense_category_id) : null,
        academic_year_id: Number(catalogFormData.academic_year_id || selectedYearId || 1),
        reason: catalogFormData.reason
      };

      if (catalogModalMode === 'create') {
        await api.post('/keuangan/catalog-items', payload);
      } else {
        await api.put(`/keuangan/catalog-items/${selectedCatalogItem.id}`, payload);
      }
      setCatalogModalOpen(false);
      fetchCatalogItems();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menyimpan item katalog standar biaya');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleCatalogStatus = async (item) => {
    const nextStatus = !item.is_active;
    const actionText = nextStatus ? 'mengaktifkan' : 'menonaktifkan';
    if (!window.confirm(`Konfirmasi: Apakah Anda yakin ingin ${actionText} item katalog "${item.name}"?`)) return;

    try {
      await api.patch(`/keuangan/catalog-items/${item.id}/status`, { is_active: nextStatus });
      fetchCatalogItems();
    } catch (err) {
      alert(err.response?.data?.message || `Gagal ${actionText} item katalog`);
    }
  };

  const handleOpenPriceHistory = async (item) => {
    setSelectedItemHistory(item);
    setPriceHistoryModalOpen(true);
    setPriceHistoryLoading(true);
    try {
      const res = await api.get(`/keuangan/catalog-items/${item.id}/price-history`);
      setPriceHistoryLogs(res.data?.data || []);
    } catch (err) {
      console.warn('Gagal mengambil riwayat harga:', err);
    } finally {
      setPriceHistoryLoading(false);
    }
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val || 0);
  };

  const formatDateTime = (dateVal) => {
    if (!dateVal) return '-';
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return String(dateVal);
    return d.toLocaleString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const filteredCatalog = catalogItems.filter(item => {
    const matchesSearch = !catalogSearch.trim() ||
      item.name.toLowerCase().includes(catalogSearch.toLowerCase()) ||
      (item.expense_category_name && item.expense_category_name.toLowerCase().includes(catalogSearch.toLowerCase()));
    const matchesCat = !selectedExpenseCatFilter || item.expense_category_id === Number(selectedExpenseCatFilter);
    return matchesSearch && matchesCat;
  });

  return (
    <div className="space-y-6">
      {/* Header Halaman RAPBS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold text-slate-800 tracking-tight">Rencana Anggaran Pendapatan &amp; Belanja (RAPBS)</h1>
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                isYayasan
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                  : 'bg-indigo-100 text-indigo-800 border border-indigo-200'
              }`}
            >
              {isYayasan ? <Building2 className="w-3 h-3 text-emerald-600" /> : <School className="w-3 h-3 text-indigo-600" />}
              <span>{isYayasan ? 'Konteks: Pusat Yayasan' : `Konteks: ${activeSchoolUnit?.name || 'Satuan'}`}</span>
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Penyusunan anggaran rencana kerja sekolah, katalog standar biaya acuan, pengesahan dokumen resmi &amp; pelacakan serapan real-time
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 relative z-20">
          {/* Dropdown Pilihan Tahun Ajaran dengan Live Search */}
          <div className="w-56">
            <SearchableSelect
              options={academicYears.map((ay) => ({
                value: String(ay.id),
                label: `T.A. ${ay.name} ${ay.is_active ? '(Aktif)' : ''}`,
                sublabel: ay.is_active ? 'Tahun Ajaran Berjalan' : undefined
              }))}
              value={String(selectedYearId)}
              onChange={(val) => {
                setSelectedYearId(val);
                setAcademicYearId(Number(val));
              }}
              placeholder="Pilih Tahun Ajaran..."
              searchPlaceholder="Cari tahun ajaran..."
            />
          </div>

          <button
            type="button"
            onClick={fetchPlans}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl shadow-2xs transition disabled:opacity-60"
            title="Muat ulang RAPBS dari database"
          >
            <RotateCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-emerald-600' : 'text-slate-500'}`} />
            <span>{loading ? 'Memuat...' : 'Muat Ulang'}</span>
          </button>
          {activeMainTab === 'rapbs' ? (
            <button
              type="button"
              onClick={() => {
                setAcademicYearId(Number(selectedYearId) || 1);
                setCreateModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-xs transition self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>Buat Draft RAPBS</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleOpenCreateCatalog}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-xs transition self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Item Katalog</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="flex items-center justify-between border-b border-slate-200 gap-2 overflow-x-auto">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setActiveMainTab('rapbs')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition whitespace-nowrap ${
              activeMainTab === 'rapbs'
                ? 'border-emerald-600 text-emerald-700 bg-emerald-50/60 rounded-t-xl shadow-2xs'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>RAPBS</span>
            <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-bold">
              {plans.length} Versi
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveMainTab('catalog')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition whitespace-nowrap ${
              activeMainTab === 'catalog'
                ? 'border-indigo-600 text-indigo-700 bg-indigo-50/60 rounded-t-xl shadow-2xs'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>Katalog Standar Biaya &amp; Plafon Harga</span>
            <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-bold">
              {catalogItems.length} Item
            </span>
          </button>
        </div>

        {activeMainTab === 'rapbs' && (
          <button
            type="button"
            onClick={() => setPlanDocListModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition shadow-2xs border border-slate-200/60"
            title="Buka daftar versi dokumen RAPBS untuk beralih atau mengelola"
          >
            <Layers className="w-3.5 h-3.5 text-emerald-600" />
            <span>Kelola Dokumen RAPBS ({plans.length})</span>
          </button>
        )}
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: RAPBS (FULL WIDTH & MODERN) */}
      {/* ========================================================================= */}
      {activeMainTab === 'rapbs' && (
        <div className="space-y-6">
          {/* Banner Validasi Silang: Pinjaman Antar Tahun Ajaran */}
          {ayLoansSummary?.lent_out?.has_active_loans && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-900 shadow-2xs">
              <div className="flex items-start gap-2.5">
                <ArrowRightLeft className="w-4.5 h-4.5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Perhatian Realokasi Kas Antar Tahun Ajaran:</span> Tahun ajaran ini memiliki pinjaman dana keluar sebesar <strong>Rp {Number(ayLoansSummary.lent_out.total_outstanding || 0).toLocaleString('id-ID')}</strong> yang sedang dipakai untuk menutup kebutuhan operasional tahun lain.
                  <p className="text-[11px] text-amber-700 mt-0.5">
                    Saldo kantong kas riil saat ini lebih tipis dari akumulasi penetapan anggaran sampai dana tersebut dikembalikan ke pos sumber.
                  </p>
                </div>
              </div>
              <Link
                to="/keuangan/fund-balances"
                className="self-start sm:self-center px-3 py-1.5 bg-amber-200/80 hover:bg-amber-300 text-amber-900 font-bold rounded-xl text-xs shrink-0 transition"
              >
                Lihat Saldo Dana &rarr;
              </Link>
            </div>
          )}

          {/* Rincian Anggaran RAPBS Terpilih (Full Width) */}
          <div className="space-y-6">
            {selectedPlan ? (
              <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-6">
                {/* Detail Header & Action Buttons */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-base font-bold text-slate-800">
                        {selectedPlan.title || `RAPBS Versi ${selectedPlan.version}.0`}
                      </h2>

                      {/* Tombol Edit Nama Dokumen */}
                      <button
                        type="button"
                        onClick={() => handleOpenEditTitle(selectedPlan)}
                        title="Ubah Nama Dokumen RAPBS"
                        className="p-1 text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 ${
                        selectedPlan.status === 'published' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-amber-100 text-amber-800 border border-amber-200'
                      }`}>
                        {selectedPlan.status === 'published' ? (
                          <><FileCheck className="w-3 h-3" /> Disahkan Resmi (Published)</>
                        ) : (
                          <><Edit2 className="w-3 h-3" /> Draft Penyusunan</>
                        )}
                      </span>

                      {/* Tombol Ganti / Kelola Versi Dokumen */}
                      <button
                        type="button"
                        onClick={() => setPlanDocListModalOpen(true)}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded-lg transition"
                      >
                        <Layers className="w-3 h-3" />
                        <span>Pilih / Ganti Dokumen</span>
                      </button>
                    </div>
                    <div className="text-xs text-slate-500 mt-1 flex flex-wrap items-center gap-3">
                      <span>Versi: <strong className="text-slate-700">{selectedPlan.version}.0</strong></span>
                      {selectedPlan.published_at && (
                        <span>Disahkan Pada: <strong className="text-slate-700">{formatDateTime(selectedPlan.published_at)}</strong></span>
                      )}
                      {selectedPlan.approved_by && (
                        <span>Oleh User ID: <strong className="text-slate-700">#{selectedPlan.approved_by}</strong></span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleViewRealization(selectedPlan.id)}
                      className="flex items-center gap-1.5 px-3 py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-semibold rounded-xl transition"
                    >
                      <TrendingUp className="w-3.5 h-3.5" />
                      <span>Realisasi Serapan</span>
                    </button>

                    {selectedPlan.status === 'published' ? (
                      <button
                        type="button"
                        onClick={() => setRevisionModalOpen(true)}
                        className="flex items-center gap-1.5 px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-700 text-xs font-semibold rounded-xl transition"
                      >
                        <RotateCw className="w-3.5 h-3.5" />
                        <span>Buat Revisi (Versi Baru)</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handlePublish(selectedPlan.id)}
                        className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-xs transition"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Terbitkan &amp; Sahkan RAPBS</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Banner Status Pengesahan */}
                {selectedPlan.status === 'published' ? (
                  <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3.5 flex items-center justify-between text-xs text-emerald-900">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>
                        Dokumen RAPBS ini telah <strong>Disahkan Secara Resmi</strong>. Struktur anggaran terkunci untuk menjaga konsistensi audit penyerapan.
                      </span>
                    </div>
                    <span className="text-[10px] font-mono font-bold uppercase bg-emerald-200/60 px-2 py-0.5 rounded text-emerald-800">
                      Terkunci
                    </span>
                  </div>
                ) : (
                  <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3.5 flex items-center justify-between text-xs text-amber-900">
                    <div className="flex items-center gap-2">
                      <Info className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>
                        Dokumen masih dalam status <strong>Draft Penyusunan</strong>. Anda dapat menambah, mengubah, atau menghapus pos rencana pendapatan dan belanja.
                      </span>
                    </div>
                  </div>
                )}

                {/* Ringkasan Anggaran (Income vs Expense vs Balance) */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-emerald-50/60 border border-emerald-200/80 rounded-2xl p-4">
                    <div className="text-[11px] text-emerald-700 font-semibold uppercase tracking-wider">Total Rencana Penerimaan</div>
                    <div className="text-lg font-bold text-emerald-900 mt-1">
                      {formatCurrency(selectedPlan.total_planned_income || 0)}
                    </div>
                  </div>
                  <div className="bg-rose-50/60 border border-rose-200/80 rounded-2xl p-4">
                    <div className="text-[11px] text-rose-700 font-semibold uppercase tracking-wider">Total Rencana Belanja</div>
                    <div className="text-lg font-bold text-rose-900 mt-1">
                      {formatCurrency(selectedPlan.total_planned_expense || 0)}
                    </div>
                  </div>
                  <div className="bg-indigo-50/60 border border-indigo-200/80 rounded-2xl p-4">
                    <div className="text-[11px] text-indigo-700 font-semibold uppercase tracking-wider">Surplus / (Defisit) Anggaran</div>
                    <div className={`text-lg font-bold mt-1 ${
                      (selectedPlan.total_planned_income - selectedPlan.total_planned_expense) >= 0 ? 'text-indigo-900' : 'text-amber-700'
                    }`}>
                      {formatCurrency((selectedPlan.total_planned_income || 0) - (selectedPlan.total_planned_expense || 0))}
                    </div>
                  </div>
                </div>

                {/* View Mode Switcher: Ringkas Tahunan vs Matriks Bulanan */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/80 p-3 rounded-2xl border border-slate-200/80">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-emerald-600" />
                    <div>
                      <div className="text-xs font-bold text-slate-800">Mode Tampilan RAPBS</div>
                      <div className="text-[11px] text-slate-500">Pilih format tampilan ringkas tahunan atau matriks sebaran 12 bulan (Juli - Juni)</div>
                    </div>
                  </div>

                  <div className="flex items-center bg-white p-1 rounded-xl border border-slate-200 shadow-2xs self-start sm:self-auto">
                    <button
                      type="button"
                      onClick={() => setBudgetViewMode('monthly')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                        budgetViewMode === 'monthly'
                          ? 'bg-emerald-600 text-white shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                      }`}
                    >
                      <Calendar className="w-3.5 h-3.5" />
                      <span>Pemetaan 12 Bulan (Matriks)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setBudgetViewMode('summary')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                        budgetViewMode === 'summary'
                          ? 'bg-emerald-600 text-white shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                      }`}
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5" />
                      <span>Ringkas (Tahunan)</span>
                    </button>
                  </div>
                </div>

                {/* 1. Rencana Pendapatan */}
                <div className="space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                        <Coins className="w-3.5 h-3.5 text-emerald-600" />
                        <span>1. Rencana Penerimaan &amp; Pendapatan</span>
                      </h3>
                      <span className="text-[10px] text-slate-400 font-medium">
                        (Alokasi target penerimaan kas per bulan)
                      </span>
                    </div>

                    {selectedPlan.status !== 'published' && (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleGenerateIncomeFromFees}
                          disabled={generatingIncome}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200/80 rounded-xl text-xs font-bold transition shadow-2xs disabled:opacity-50"
                          title="Generate otomatis seluruh rencana penerimaan dari penetapan biaya santri tahun ajaran ini"
                        >
                          <Sparkles className={`w-3.5 h-3.5 ${generatingIncome ? 'animate-spin text-purple-600' : 'text-purple-600'}`} />
                          <span>{generatingIncome ? 'Menghitung...' : 'Generate dari Penetapan Biaya'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={handleOpenAddIncome}
                          className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-3 py-1.5 rounded-xl flex items-center gap-1 transition"
                        >
                          <Plus className="w-3.5 h-3.5" /> Tambah Pos Manual
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="border border-slate-200/80 rounded-2xl overflow-hidden shadow-2xs bg-white">
                    <div className="overflow-auto max-h-[75vh] max-w-full relative">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 sticky top-0 z-20 shadow-2xs">
                          <tr>
                            <th className="px-3.5 py-3 whitespace-nowrap sticky top-0 left-0 bg-slate-50 z-30">
                              Nama Sumber Pendapatan
                            </th>
                            {budgetViewMode === 'monthly' ? (
                              <>
                                {MONTHS.map(m => (
                                  <th key={m.key} className="px-2.5 py-3 text-right whitespace-nowrap min-w-[95px] text-[11px] bg-slate-50">
                                    <span className="text-slate-700">{m.label}</span>
                                    <span className="block text-[9px] text-slate-400 font-normal">{m.q}</span>
                                  </th>
                                ))}
                                <th className="px-3 py-3 text-right whitespace-nowrap text-emerald-800 bg-emerald-50 font-bold min-w-[110px] sticky top-0 right-0 z-30 shadow-2xs">
                                  Total Setahun
                                </th>
                              </>
                            ) : (
                              <th className="px-4 py-3 text-right whitespace-nowrap text-emerald-800 font-bold bg-emerald-50 sticky top-0 right-0 z-30 shadow-2xs">
                                Target Anggaran Tahunan
                              </th>
                            )}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {selectedPlan.income_items && selectedPlan.income_items.length > 0 ? (
                            selectedPlan.income_items.map((item, idx) => {
                              const itemTotal = parseFloat(item.planned_amount || 0);
                              return (
                                <tr key={idx} className="hover:bg-slate-50/80 transition group">
                                  <td className="px-3.5 py-2.5 font-semibold text-slate-800 whitespace-nowrap sticky left-0 bg-white group-hover:bg-slate-50 transition z-10">
                                    <div className="flex items-center gap-2">
                                      <span className="text-slate-800 font-semibold text-xs">{item.name}</span>
                                      {selectedPlan.status !== 'published' && (
                                        <div className="flex items-center gap-0.5 shrink-0 opacity-80 group-hover:opacity-100 transition ml-1">
                                          <button
                                            type="button"
                                            onClick={() => handleOpenEditIncome(item)}
                                            className="p-1 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded transition cursor-pointer"
                                            title="Petakan Sebaran Bulanan"
                                          >
                                            <Edit2 className="w-3.5 h-3.5" />
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => handleDeleteItem(item.id, 'income')}
                                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition cursor-pointer"
                                            title="Hapus Pos"
                                          >
                                            <Trash2 className="w-3.5 h-3.5" />
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  </td>

                                  {budgetViewMode === 'monthly' ? (
                                    <>
                                      {MONTHS.map(m => {
                                        const val = item.monthly_distribution?.[m.key] || 0;
                                        return (
                                          <td key={m.key} className="px-2.5 py-2.5 text-right font-mono text-[11px] whitespace-nowrap text-slate-700">
                                            {val > 0 ? (
                                              <span className="text-emerald-700 font-medium">{formatCurrency(val)}</span>
                                            ) : (
                                              <span className="text-slate-300">-</span>
                                            )}
                                          </td>
                                        );
                                      })}
                                      <td className="px-3 py-2.5 text-right font-bold font-mono text-emerald-700 bg-emerald-50/90 group-hover:bg-emerald-100/90 whitespace-nowrap sticky right-0 z-10">
                                        {formatCurrency(itemTotal)}
                                      </td>
                                    </>
                                  ) : (
                                    <td className="px-4 py-2.5 text-right font-bold font-mono text-emerald-700 bg-emerald-50/90 group-hover:bg-emerald-100/90 whitespace-nowrap sticky right-0 z-10">
                                      {formatCurrency(itemTotal)}
                                    </td>
                                  )}
                                </tr>
                              );
                            })
                          ) : (
                            <tr>
                              <td colSpan={budgetViewMode === 'monthly' ? 14 : 2} className="px-4 py-6 text-center text-slate-400 italic">
                                Belum ada item rencana penerimaan. Klik &quot;Generate dari Penetapan Biaya&quot; atau &quot;Tambah Pos Manual&quot;.
                              </td>
                            </tr>
                          )}
                        </tbody>

                        {/* Footer Total Akumulasi Penerimaan */}
                        {selectedPlan.income_items && selectedPlan.income_items.length > 0 && (
                          <tfoot className="bg-emerald-50/90 border-t-2 border-emerald-200 text-slate-800 font-bold sticky bottom-0 z-20 shadow-2xs">
                            <tr>
                              <td className="px-3.5 py-3 sticky bottom-0 left-0 bg-emerald-50 z-30 text-emerald-950 uppercase text-[11px] tracking-wider font-extrabold">
                                Total Penerimaan Kas
                              </td>
                              {budgetViewMode === 'monthly' ? (
                                <>
                                  {MONTHS.map(m => {
                                    const sumMonth = selectedPlan.income_items.reduce((acc, item) => {
                                      return acc + parseFloat(item.monthly_distribution?.[m.key] || 0);
                                    }, 0);
                                    return (
                                      <td key={m.key} className="px-2.5 py-3 text-right font-mono text-[11px] whitespace-nowrap text-emerald-900 font-bold">
                                        {formatCurrency(sumMonth)}
                                      </td>
                                    );
                                  })}
                                  <td className="px-3 py-3 text-right font-mono font-black text-emerald-950 bg-emerald-100 whitespace-nowrap text-xs sticky bottom-0 right-0 z-30">
                                    {formatCurrency(selectedPlan.total_planned_income || 0)}
                                  </td>
                                </>
                              ) : (
                                <td className="px-4 py-3 text-right font-mono font-black text-emerald-950 bg-emerald-100 whitespace-nowrap text-xs sticky bottom-0 right-0 z-30">
                                  {formatCurrency(selectedPlan.total_planned_income || 0)}
                                </td>
                              )}
                            </tr>
                          </tfoot>
                        )}
                      </table>
                    </div>
                  </div>
                </div>

                {/* 2. Rencana Belanja & Kegiatan Program */}
                <div className="space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                        <Wallet className="w-3.5 h-3.5 text-rose-600" />
                        <span>2. Rencana Belanja &amp; Kegiatan Program</span>
                      </h3>
                      <span className="text-[10px] text-slate-400 font-medium">
                        (Alokasi belanja berdasarkan plafon harga katalog dan sebaran volume bulanan)
                      </span>
                    </div>

                    {selectedPlan.status !== 'published' && (
                      <button
                        type="button"
                        onClick={handleOpenAddExpense}
                        className="text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 px-3.5 py-1.5 rounded-xl flex items-center gap-1.5 shadow-2xs transition self-start sm:self-auto"
                      >
                        <Plus className="w-3.5 h-3.5" /> Tambah Pos Belanja Program
                      </button>
                    )}
                  </div>

                  {/* Filter Toolbar: Bidang, Sub-Bidang, Search */}
                  <div className="flex flex-wrap items-center justify-between gap-2.5 p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs relative z-10">
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Filter Bidang */}
                      <SearchableSelect
                        value={filterExpenseDomain}
                        onChange={(val) => {
                          setFilterExpenseDomain(val || 'all');
                          setFilterExpenseSubdomain('all');
                        }}
                        className="w-44 sm:w-52"
                        placeholder="Semua Bidang"
                        searchPlaceholder="Cari bidang..."
                        options={[
                          { value: 'all', label: `Semua Bidang (${availableDomains.length})`, sublabel: 'Tampilkan seluruh bidang' },
                          ...availableDomains.map((d) => ({
                            value: String(d.id),
                            label: d.name,
                            sublabel: d.code ? `Kode: ${d.code}` : undefined,
                            badge: d.code || undefined
                          }))
                        ]}
                      />

                      {/* Filter Sub-Bidang */}
                      <SearchableSelect
                        value={filterExpenseSubdomain}
                        onChange={(val) => setFilterExpenseSubdomain(val || 'all')}
                        className="w-48 sm:w-56"
                        placeholder="Semua Sub-Bidang"
                        searchPlaceholder="Cari sub-bidang..."
                        options={[
                          {
                            value: 'all',
                            label: `Semua Sub-Bidang (${availableSubdomains.length})`,
                            sublabel: filterExpenseDomain === 'all' ? 'Seluruh sub-bidang yayasan' : 'Semua sub-bidang pada bidang ini'
                          },
                          ...availableSubdomains.map((s) => ({
                            value: String(s.id),
                            label: s.name,
                            sublabel: s.domainName ? `Bidang: ${s.domainName}` : undefined,
                            badge: s.code || undefined
                          }))
                        ]}
                      />

                      {/* Search Belanja / Program */}
                      <div className="relative flex items-center group">
                        <Search className="w-3.5 h-3.5 text-slate-400 group-focus-within:text-emerald-600 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none transition-colors duration-200 z-10" />
                        <input
                          type="text"
                          value={filterExpenseSearch}
                          onChange={(e) => setFilterExpenseSearch(e.target.value)}
                          placeholder="Cari item belanja / program..."
                          className="w-48 sm:w-64 bg-white hover:bg-slate-50/50 focus:bg-white border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 rounded-xl pl-9 pr-8 py-1.5 text-xs text-slate-800 placeholder-slate-400 outline-none transition-all duration-200 font-medium shadow-2xs"
                        />
                        {filterExpenseSearch && (
                          <button
                            type="button"
                            onClick={() => setFilterExpenseSearch('')}
                            className="absolute right-2.5 p-0.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all z-10"
                            title="Hapus kata kunci pencarian"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>

                      {(filterExpenseDomain !== 'all' || filterExpenseSubdomain !== 'all' || filterExpenseSearch.trim()) && (
                        <button
                          type="button"
                          onClick={() => {
                            setFilterExpenseDomain('all');
                            setFilterExpenseSubdomain('all');
                            setFilterExpenseSearch('');
                          }}
                          className="px-2.5 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-semibold transition flex items-center gap-1"
                        >
                          <X className="w-3 h-3" /> Reset Filter
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleSyncPrograms}
                        disabled={syncingPrograms}
                        className="px-2.5 py-1 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[11px] font-semibold transition flex items-center gap-1.5 border border-indigo-200 cursor-pointer shadow-2xs disabled:opacity-50"
                        title="Sinkronkan ulang data Bidang, Sub-Bidang, dan Program Kerja dari Modul RKT & RIPS Manajemen"
                      >
                        <RotateCw className={`w-3.5 h-3.5 text-indigo-600 ${syncingPrograms ? 'animate-spin' : ''}`} />
                        <span>{syncingPrograms ? 'Menyinkronkan...' : 'Sinkronkan Program'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleExpandAllPrograms}
                        className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold transition flex items-center gap-1 border border-slate-200 cursor-pointer shadow-2xs"
                        title="Buka semua rincian belanja program"
                      >
                        <FolderOpen className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Buka Semua</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleCollapseAllPrograms}
                        className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold transition flex items-center gap-1 border border-slate-200 cursor-pointer shadow-2xs"
                        title="Tutup semua rincian belanja program"
                      >
                        <ChevronUp className="w-3.5 h-3.5 text-slate-600" />
                        <span>Tutup Semua</span>
                      </button>
                      <span className="text-[11px] text-slate-500 font-medium whitespace-nowrap ml-1">
                        Menampilkan <strong className="text-emerald-700 font-bold">{groupedExpenseHierarchy.length}</strong> bidang, <strong className="text-indigo-700 font-bold">{totalGroupedProgramsCount}</strong> program ({filteredExpenseItems.length} pos belanja)
                      </span>
                    </div>
                  </div>

                  <div className="border border-slate-200/80 rounded-2xl overflow-hidden shadow-2xs bg-white">
                    <div className="overflow-auto max-h-[75vh] max-w-full relative">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 sticky top-0 z-20 shadow-2xs">
                          <tr>
                            <th className="px-3.5 py-3 whitespace-nowrap sticky top-0 left-0 bg-slate-50 z-30 min-w-[240px]">
                              Program &amp; Item Belanja
                            </th>
                            <th className="px-3 py-3 text-right whitespace-nowrap min-w-[90px] bg-slate-50">
                              Harga Satuan
                            </th>
                            {budgetViewMode === 'monthly' ? (
                              <>
                                {MONTHS.map(m => (
                                  <th key={m.key} className="px-2 py-3 text-center whitespace-nowrap min-w-[70px] text-[11px] bg-slate-50">
                                    <span className="text-slate-700">{m.short}</span>
                                    <span className="block text-[9px] text-rose-600 font-semibold">(Rp)</span>
                                  </th>
                                ))}
                                <th className="px-3 py-3 text-right whitespace-nowrap text-rose-800 bg-rose-50 font-bold min-w-[110px] sticky top-0 right-0 z-30 shadow-2xs">
                                  Total Anggaran
                                </th>
                              </>
                            ) : (
                              <>
                                <th className="px-3 py-3 text-right whitespace-nowrap bg-slate-50">Volume</th>
                                <th className="px-4 py-3 text-right whitespace-nowrap text-rose-800 font-bold bg-rose-50 sticky top-0 right-0 z-30 shadow-2xs">
                                  Total Plafon
                                </th>
                              </>
                            )}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {(() => {
                            const totalTableCols = budgetViewMode === 'monthly' ? 15 : 4;

                            if (groupedExpenseHierarchy.length === 0) {
                              return (
                                <tr>
                                  <td colSpan={totalTableCols} className="px-4 py-6 text-center text-slate-400 italic">
                                    {selectedPlan.expense_items?.length > 0
                                      ? 'Tidak ada pos belanja yang cocok dengan filter atau kata kunci pencarian.'
                                      : 'Belum ada item belanja program. Klik "Tambah Pos Belanja Program" di atas.'}
                                  </td>
                                </tr>
                              );
                            }

                            return groupedExpenseHierarchy.map((domain) => {
                              const isDomExpanded = expandedDomains[domain.key] !== false;

                              return (
                                <React.Fragment key={domain.key}>
                                  {/* LEVEL 1: BIDANG (DOMAIN) */}
                                  <tr className="bg-[#E2E8F0] hover:bg-slate-300/80 border-y-2 border-slate-300 font-extrabold text-slate-900 transition-colors">
                                    <td className="px-3.5 py-2 whitespace-nowrap sticky left-0 bg-[#E2E8F0] z-10 min-w-[240px]">
                                      <button
                                        type="button"
                                        onClick={() => toggleDomain(domain.key)}
                                        className="flex items-center gap-2 text-left group focus:outline-none cursor-pointer whitespace-nowrap"
                                      >
                                        <span className="p-0.5 rounded bg-slate-300 group-hover:bg-indigo-600 group-hover:text-white transition-colors shrink-0">
                                          {isDomExpanded ? (
                                            <ChevronDown className="w-3.5 h-3.5" />
                                          ) : (
                                            <ChevronRight className="w-3.5 h-3.5" />
                                          )}
                                        </span>
                                        {domain.code && (
                                          <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-800 border border-indigo-300 shrink-0">
                                            {domain.code}
                                          </span>
                                        )}
                                        <span className="text-xs uppercase tracking-wider font-extrabold text-slate-900 group-hover:text-indigo-700 transition-colors">
                                          BIDANG: {domain.name}
                                        </span>
                                      </button>
                                    </td>
                                    {/* Harga Satuan */}
                                    <td className="px-3 py-2 text-right font-mono text-[10px] text-slate-400 italic whitespace-nowrap bg-[#E2E8F0]">
                                      -
                                    </td>

                                    {budgetViewMode === 'monthly' ? (
                                      <>
                                        {MONTHS.map(m => {
                                          const mTotal = domain.monthlyTotals?.[m.key] || 0;
                                          return (
                                            <td
                                              key={m.key}
                                              className="px-2 py-2 text-center font-mono text-[11px] font-extrabold whitespace-nowrap text-slate-900 bg-[#E2E8F0]"
                                            >
                                              {mTotal > 0 ? (
                                                <span className="px-1.5 py-0.5 rounded font-extrabold text-[10px] bg-slate-300 text-slate-900">
                                                  {formatCurrency(mTotal)}
                                                </span>
                                              ) : (
                                                <span className="text-slate-400">-</span>
                                              )}
                                            </td>
                                          );
                                        })}
                                        <td className="px-3 py-2 text-right font-extrabold font-mono text-rose-900 bg-rose-200/80 whitespace-nowrap sticky right-0 z-10">
                                          {formatCurrency(domain.totalPlafon)}
                                        </td>
                                      </>
                                    ) : (
                                      <>
                                        <td className="px-3 py-2 text-right text-slate-400 font-mono text-[10px] whitespace-nowrap bg-[#E2E8F0]">
                                          -
                                        </td>
                                        <td className="px-4 py-2 text-right font-extrabold font-mono text-rose-900 bg-rose-200/80 whitespace-nowrap sticky right-0 z-10">
                                          {formatCurrency(domain.totalPlafon)}
                                        </td>
                                      </>
                                    )}
                                  </tr>

                                  {/* LEVEL 2: SUB-BIDANG (SUBDOMAIN) */}
                                  {isDomExpanded &&
                                    domain.subdomains.map((sub) => {
                                      const isSubExpanded = expandedSubdomains[sub.key] !== false;

                                      return (
                                        <React.Fragment key={sub.key}>
                                          <tr className="bg-[#FEF3C7] hover:bg-[#FDE68A] border-b border-amber-200/80 font-semibold text-amber-950 transition-colors">
                                            <td className="px-3.5 py-2 pl-7 whitespace-nowrap sticky left-0 bg-[#FEF3C7] z-10 min-w-[240px]">
                                              <button
                                                type="button"
                                                onClick={() => toggleSubdomain(sub.key)}
                                                className="flex items-center gap-1.5 text-left group focus:outline-none cursor-pointer whitespace-nowrap"
                                              >
                                                <span className="p-0.5 rounded bg-amber-200 group-hover:bg-amber-600 group-hover:text-white transition-colors shrink-0">
                                                  {isSubExpanded ? (
                                                    <ChevronDown className="w-3.5 h-3.5" />
                                                  ) : (
                                                    <ChevronRight className="w-3.5 h-3.5" />
                                                  )}
                                                </span>
                                                {sub.code && (
                                                  <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300 shrink-0">
                                                    {sub.code}
                                                  </span>
                                                )}
                                                <span className="text-xs font-bold text-amber-900 group-hover:text-amber-700 transition-colors">
                                                  Sub-Bidang: {sub.name}
                                                </span>
                                              </button>
                                            </td>

                                            {/* Harga Satuan */}
                                            <td className="px-3 py-2 text-right font-mono text-[10px] text-amber-400 italic whitespace-nowrap bg-[#FEF3C7]">
                                              -
                                            </td>

                                            {budgetViewMode === 'monthly' ? (
                                              <>
                                                {MONTHS.map(m => {
                                                  const mTotal = sub.monthlyTotals?.[m.key] || 0;
                                                  return (
                                                    <td
                                                      key={m.key}
                                                      className="px-2 py-2 text-center font-mono text-[11px] font-bold whitespace-nowrap text-amber-950 bg-[#FEF3C7]"
                                                    >
                                                      {mTotal > 0 ? (
                                                        <span className="px-1.5 py-0.5 rounded font-bold text-[10px] bg-amber-200 text-amber-950">
                                                          {formatCurrency(mTotal)}
                                                        </span>
                                                      ) : (
                                                        <span className="text-amber-300">-</span>
                                                      )}
                                                    </td>
                                                  );
                                                })}
                                                <td className="px-3 py-2 text-right font-bold font-mono text-amber-950 bg-amber-200/80 whitespace-nowrap sticky right-0 z-10">
                                                  {formatCurrency(sub.totalPlafon)}
                                                </td>
                                              </>
                                            ) : (
                                              <>
                                                <td className="px-3 py-2 text-right text-amber-400 font-mono text-[10px] whitespace-nowrap bg-[#FEF3C7]">
                                                  -
                                                </td>
                                                <td className="px-4 py-2 text-right font-bold font-mono text-amber-950 bg-amber-200/80 whitespace-nowrap sticky right-0 z-10">
                                                  {formatCurrency(sub.totalPlafon)}
                                                </td>
                                              </>
                                            )}
                                          </tr>

                                          {/* LEVEL 3: PROGRAM KERJA */}
                                          {isSubExpanded &&
                                            sub.programs.map((prog) => {
                                              const isExpanded = !!expandedPrograms[prog.key];

                                              return (
                                                <React.Fragment key={prog.key}>
                                                  {/* BARIS UTAMA PROGRAM (LEVEL 3) */}
                                                  <tr className="bg-slate-100/95 hover:bg-slate-200/90 border-b border-slate-200 font-semibold text-slate-900 transition-colors">
                                                    <td className="px-3.5 py-2 whitespace-nowrap sticky left-0 bg-slate-100/95 hover:bg-slate-200/90 transition z-10 min-w-[240px] pl-8 sm:pl-9">
                                                      <div className="flex items-center gap-2">
                                                        {prog.code && (
                                                          <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-800 border border-indigo-300 shrink-0">
                                                            {prog.code}
                                                          </span>
                                                        )}
                                                        <span className="text-xs font-bold text-slate-900 leading-snug">
                                                          {prog.name}
                                                        </span>
                                                        {prog.isAllNonItemized && (
                                                          <span className="px-1.5 py-0.2 rounded text-[9.5px] font-bold bg-purple-100 text-purple-800 border border-purple-200 shrink-0">
                                                            Lump Sum
                                                          </span>
                                                        )}
                                                        {selectedPlan.status !== 'published' && (
                                                          <button
                                                            type="button"
                                                            onClick={(e) => {
                                                              e.stopPropagation();
                                                              handleOpenAddExpense(prog.id !== 'no_program' ? prog.id : undefined);
                                                            }}
                                                            className="inline-flex items-center justify-center w-5 h-5 rounded bg-emerald-600 hover:bg-emerald-500 text-white shadow-2xs text-[10px] font-bold transition cursor-pointer shrink-0"
                                                            title={`Tambah Item Belanja ke Program ${prog.name}`}
                                                          >
                                                            <Plus className="w-3 h-3" />
                                                          </button>
                                                        )}
                                                        {prog.items.length > 0 && (
                                                          <button
                                                            type="button"
                                                            onClick={() => toggleProgram(prog.key)}
                                                            className="inline-flex items-center justify-center px-1.5 py-0.5 rounded bg-white hover:bg-emerald-600 hover:text-white text-slate-600 hover:border-emerald-600 border border-slate-300 shadow-2xs text-[11px] font-bold font-mono transition cursor-pointer shrink-0"
                                                            title={isExpanded ? `Tutup ${prog.items.length} rincian belanja` : `Buka ${prog.items.length} rincian belanja`}
                                                          >
                                                            {isExpanded ? 'v' : '>'}
                                                          </button>
                                                        )}
                                                      </div>
                                                    </td>

                                                    {/* Harga Satuan Header Program */}
                                                    <td className="px-3 py-2.5 text-right font-mono text-[10px] text-slate-400 italic whitespace-nowrap">
                                                      -
                                                    </td>

                                                    {budgetViewMode === 'monthly' ? (
                                                      <>
                                                        {MONTHS.map(m => {
                                                          const mTotal = prog.monthlyTotals[m.key] || 0;
                                                          return (
                                                            <td
                                                              key={m.key}
                                                              className="px-2 py-2.5 text-center font-mono text-[11px] font-bold whitespace-nowrap text-slate-800"
                                                            >
                                                              {mTotal > 0 ? (
                                                                <span className="px-1.5 py-0.5 rounded font-bold text-[10px] bg-slate-200/80 text-slate-800">
                                                                  {formatCurrency(mTotal)}
                                                                </span>
                                                              ) : (
                                                                <span className="text-slate-300">-</span>
                                                              )}
                                                            </td>
                                                          );
                                                        })}
                                                        <td className="px-3 py-2.5 text-right font-bold font-mono text-rose-800 bg-rose-100/90 whitespace-nowrap sticky right-0 z-10">
                                                          {formatCurrency(prog.totalPlafon)}
                                                        </td>
                                                      </>
                                                    ) : (
                                                      <>
                                                        <td className="px-3 py-2.5 text-right text-slate-700 font-bold whitespace-nowrap">
                                                          {prog.items.length} item
                                                        </td>
                                                        <td className="px-4 py-2.5 text-right font-bold text-rose-800 bg-rose-100/90 whitespace-nowrap sticky right-0 z-10">
                                                          {formatCurrency(prog.totalPlafon)}
                                                        </td>
                                                      </>
                                                    )}
                                                  </tr>

                                                  {/* BARIS RINCIAN ITEM BELANJA (LEVEL 4: ANAK DARI PROGRAM) */}
                                                  {isExpanded &&
                                                    prog.items.map((item, itemIdx) => {
                                                      const isLumpSum = item.entry_mode === 'lump_sum';
                                                      const unitPrice = parseFloat(item.unit_price || 0);
                                                      const totalQty = parseFloat(item.quantity || 0);
                                                      const totalPlafon = parseFloat(item.planned_amount || (totalQty * unitPrice));

                                                      return (
                                                        <tr key={itemIdx} className="hover:bg-emerald-50/40 bg-white border-b border-slate-100 transition group">
                                                          <td className="px-3.5 py-2 pl-12 sm:pl-14 font-medium text-slate-800 whitespace-nowrap sticky left-0 bg-white group-hover:bg-emerald-50/40 transition z-10 min-w-[240px]">
                                                            <div className="flex items-center gap-2 flex-wrap">
                                                              <span className="text-slate-300 font-mono text-xs select-none">↳</span>
                                                              <span className="font-semibold text-slate-800 text-xs">{item.name}</span>
                                                              {isLumpSum && (
                                                                <span className="px-1.5 py-0.2 rounded text-[9.5px] font-bold bg-purple-100 text-purple-800 border border-purple-200 shrink-0">
                                                                  Lump Sum
                                                                </span>
                                                              )}
                                                              {item.fund_sources && item.fund_sources.length > 1 ? (
                                                                <span
                                                                  className="text-[9.5px] bg-purple-50 text-purple-700 px-1.5 py-0.2 rounded font-semibold border border-purple-200/60 shrink-0 cursor-help"
                                                                  title={item.fund_sources.map(s => `${s.name}: ${formatCurrency(s.amount)}`).join('\n')}
                                                                >
                                                                  {item.fund_sources.length} Sumber Dana
                                                                </span>
                                                              ) : (
                                                                (item.fund_source_name || item.fund_source_income_name) && (
                                                                  <span className="text-[9.5px] bg-emerald-50 text-emerald-700 px-1.5 py-0.2 rounded font-semibold border border-emerald-200/60 shrink-0">
                                                                    {item.fund_source_income_name || item.fund_source_name}
                                                                  </span>
                                                                )
                                                              )}
                                                              {selectedPlan.status !== 'published' && (
                                                                <div className="flex items-center gap-0.5 shrink-0 opacity-80 group-hover:opacity-100 transition ml-1">
                                                                  <button
                                                                    type="button"
                                                                    onClick={() => handleOpenEditExpense(item)}
                                                                    className="p-1 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded transition cursor-pointer"
                                                                    title="Ubah Belanja"
                                                                  >
                                                                    <Edit2 className="w-3.5 h-3.5" />
                                                                  </button>
                                                                  <button
                                                                    type="button"
                                                                    onClick={() => handleDeleteItem(item.id, 'expense')}
                                                                    className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition cursor-pointer"
                                                                    title="Hapus Belanja"
                                                                  >
                                                                    <Trash2 className="w-3.5 h-3.5" />
                                                                  </button>
                                                                </div>
                                                              )}
                                                            </div>
                                                          </td>

                                                          <td className="px-3 py-2 text-right font-mono text-[11px] text-slate-700 whitespace-nowrap">
                                                            {isLumpSum ? <span className="text-slate-400 font-normal">-</span> : formatCurrency(unitPrice)}
                                                          </td>

                                                          {budgetViewMode === 'monthly' ? (
                                                            <>
                                                              {MONTHS.map(m => {
                                                                const rawVal = parseFloat(item.monthly_distribution?.[m.key] || 0);
                                                                const monthVal = isLumpSum ? rawVal : (rawVal * unitPrice);

                                                                return (
                                                                  <td
                                                                    key={m.key}
                                                                    className="px-2 py-2.5 text-center font-mono text-[11px] whitespace-nowrap text-slate-700"
                                                                  >
                                                                    {monthVal > 0 ? (
                                                                      <span
                                                                        className={`px-1.5 py-0.5 rounded font-bold text-[10px] ${
                                                                          isLumpSum
                                                                            ? 'bg-purple-50 text-purple-800 border border-purple-200/60'
                                                                            : 'bg-rose-50 text-rose-700 border border-rose-200/60'
                                                                        }`}
                                                                      >
                                                                        {formatCurrency(monthVal)}
                                                                      </span>
                                                                    ) : (
                                                                      <span className="text-slate-300">-</span>
                                                                    )}
                                                                  </td>
                                                                );
                                                              })}
                                                              <td className="px-3 py-2.5 text-right font-semibold font-mono text-rose-700 bg-rose-50/90 group-hover:bg-rose-100/90 whitespace-nowrap sticky right-0 z-10">
                                                                {formatCurrency(totalPlafon)}
                                                              </td>
                                                            </>
                                                          ) : (
                                                            <>
                                                              <td className="px-3 py-2.5 text-right text-slate-700 whitespace-nowrap">
                                                                {isLumpSum ? <span className="text-slate-400 font-normal">-</span> : `${totalQty} ${item.unit || ''}`}
                                                              </td>
                                                              <td className="px-4 py-2.5 text-right font-semibold text-rose-700 bg-rose-50/90 group-hover:bg-rose-100/90 whitespace-nowrap sticky right-0 z-10">
                                                                {formatCurrency(totalPlafon)}
                                                              </td>
                                                            </>
                                                          )}
                                                        </tr>
                                                      );
                                                    })}
                                                </React.Fragment>
                                              );
                                            })}
                                        </React.Fragment>
                                      );
                                    })}
                                </React.Fragment>
                              );
                            });
                          })()}
                        </tbody>

                        {/* Footer Total Akumulasi Belanja */}
                        {filteredExpenseItems.length > 0 && (
                          <tfoot className="bg-rose-50/90 border-t-2 border-rose-200 text-slate-800 font-bold sticky bottom-0 z-20 shadow-2xs">
                            <tr>
                              <td className="px-3.5 py-3 sticky bottom-0 left-0 bg-rose-50 z-30 text-rose-950 uppercase text-[11px] tracking-wider font-extrabold">
                                Total Rencana Pengeluaran Kas
                              </td>
                              <td className="px-3 py-3"></td>
                              {budgetViewMode === 'monthly' ? (
                                <>
                                  {MONTHS.map(m => {
                                    const sumExpenseMonth = filteredExpenseItems.reduce((acc, item) => {
                                      if (item.entry_mode === 'lump_sum') {
                                        return acc + parseFloat(item.monthly_distribution?.[m.key] || 0);
                                      }
                                      const q = parseFloat(item.monthly_distribution?.[m.key] || 0);
                                      const p = parseFloat(item.unit_price || item.planned_amount || 0);
                                      return acc + (q * p);
                                    }, 0);
                                    return (
                                      <td key={m.key} className="px-2 py-3 text-center font-mono text-[11px] whitespace-nowrap text-rose-900 font-bold">
                                        {sumExpenseMonth > 0 ? (
                                          <span className="text-[10px]">{formatCurrency(sumExpenseMonth)}</span>
                                        ) : (
                                          <span className="text-slate-300">-</span>
                                        )}
                                      </td>
                                    );
                                  })}
                                  <td className="px-3 py-3 text-right font-mono font-black text-rose-950 bg-rose-100 whitespace-nowrap text-xs sticky bottom-0 right-0 z-30">
                                    {formatCurrency(filteredExpenseItems.reduce((acc, it) => acc + parseFloat(it.planned_amount || (it.quantity * it.unit_price) || 0), 0))}
                                  </td>
                                </>
                              ) : (
                                <>
                                  <td className="px-3 py-3"></td>
                                  <td className="px-4 py-3 text-right font-black text-rose-950 text-xs sticky bottom-0 right-0 bg-rose-100 z-30">
                                    {formatCurrency(filteredExpenseItems.reduce((acc, it) => acc + parseFloat(it.planned_amount || (it.quantity * it.unit_price) || 0), 0))}
                                  </td>
                                </>
                              )}
                            </tr>
                          </tfoot>
                        )}
                      </table>
                    </div>
                  </div>
                </div>

                {/* 3. Ringkasan Cash Flow Bulanan (Surplus / Defisit Kas per Bulan) */}
                {budgetViewMode === 'monthly' && selectedPlan.income_items && selectedPlan.expense_items && (
                  <div className="bg-slate-900 text-white rounded-2xl p-5 shadow-sm space-y-4">
                    {/* Header Bagian Arus Kas */}
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-slate-800">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                          <TrendingUp className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-100 flex items-center gap-2">
                            <span>Proyeksi Arus Kas &amp; Surplus/Defisit per Bulan (Cash Flow Forecast)</span>
                          </h4>
                          <p className="text-[11px] text-slate-400">
                            Simulasi likuiditas 12 bulan menghubungkan rencana pemasukan (Sumber Pendapatan) dan beban pengeluaran (Pos Sumber Dana)
                          </p>
                        </div>
                      </div>

                      {/* View Switcher: Semua / Konsolidasi / Per Jenis Tagihan */}
                      <div className="flex items-center gap-1.5 p-1 bg-slate-800/90 rounded-xl border border-slate-700/80 self-start lg:self-auto text-xs">
                        <button
                          type="button"
                          onClick={() => setCashFlowSubTab('all')}
                          className={`px-3 py-1.5 rounded-lg font-semibold transition flex items-center gap-1.5 ${
                            cashFlowSubTab === 'all'
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
                          }`}
                        >
                          <Layers className="w-3.5 h-3.5" /> Semua Tampilan
                        </button>
                        <button
                          type="button"
                          onClick={() => setCashFlowSubTab('consolidated')}
                          className={`px-3 py-1.5 rounded-lg font-semibold transition flex items-center gap-1.5 ${
                            cashFlowSubTab === 'consolidated'
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
                          }`}
                        >
                          Konsolidasi Total
                        </button>
                        <button
                          type="button"
                          onClick={() => setCashFlowSubTab('by_fee_type')}
                          className={`px-3 py-1.5 rounded-lg font-semibold transition flex items-center gap-1.5 ${
                            cashFlowSubTab === 'by_fee_type'
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
                          }`}
                        >
                          <Tag className="w-3.5 h-3.5" />
                          <span>Per Jenis Pemasukan</span>
                          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-700 text-emerald-300 font-bold ml-0.5">
                            {cashFlowByFeeType.length}
                          </span>
                        </button>
                      </div>
                    </div>

                    {/* KPI Highlights Bar */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 bg-slate-800/50 rounded-xl border border-slate-800 text-xs">
                      <div>
                        <div className="text-[10px] uppercase font-bold text-slate-400">Total Pemasukan (1 Thn)</div>
                        <div className="text-xs sm:text-sm font-black font-mono text-emerald-400 mt-0.5">
                          {formatCurrency(selectedPlan.total_planned_income || 0)}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase font-bold text-slate-400">Total Pengeluaran (1 Thn)</div>
                        <div className="text-xs sm:text-sm font-black font-mono text-rose-400 mt-0.5">
                          {formatCurrency(selectedPlan.total_planned_expense || 0)}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase font-bold text-slate-400">Net Surplus / (Defisit)</div>
                        <div className={`text-xs sm:text-sm font-black font-mono mt-0.5 ${
                          (selectedPlan.total_planned_income - selectedPlan.total_planned_expense) >= 0
                            ? 'text-emerald-400'
                            : 'text-amber-400'
                        }`}>
                          {formatCurrency((selectedPlan.total_planned_income || 0) - (selectedPlan.total_planned_expense || 0))}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase font-bold text-slate-400">Status Jenis Pemasukan</div>
                        <div className="flex items-center gap-1.5 mt-0.5 text-[11px] font-bold">
                          <span className="text-emerald-400">
                            {cashFlowByFeeType.filter(g => g.total_net >= 0).length} Surplus
                          </span>
                          <span className="text-slate-500">•</span>
                          <span className={`${cashFlowByFeeType.some(g => g.total_net < 0) ? 'text-amber-400' : 'text-slate-400'}`}>
                            {cashFlowByFeeType.filter(g => g.total_net < 0).length} Defisit
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* 3.A. TAMPILAN 1: KONSOLIDASI ARUS KAS TOTAL */}
                    {(cashFlowSubTab === 'consolidated' || cashFlowSubTab === 'all') && (
                      <div className="space-y-2 pt-1">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div>
                            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                              <Layers className="w-3.5 h-3.5 text-emerald-400" />
                              Ringkasan Konsolidasi Arus Kas Keseluruhan
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              Arus Saldo Awal, Pemasukan, Pengeluaran, dan Saldo Akhir Kumulatif (12 Bulan)
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <label className="text-[11px] text-slate-300 font-medium whitespace-nowrap">
                              Saldo Kas Awal Tahun:
                            </label>
                            <div className="relative">
                              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-mono">Rp</span>
                              <input
                                type="number"
                                min="0"
                                value={initialCashBalance === 0 ? '' : initialCashBalance}
                                onChange={(e) => setInitialCashBalance(parseFloat(e.target.value || 0))}
                                placeholder="0"
                                className="w-36 pl-7 pr-2.5 py-1 bg-slate-900 border border-slate-700 rounded-lg text-xs font-mono font-bold text-sky-300 focus:outline-none focus:ring-1 focus:ring-sky-500 text-right"
                                title="Saldo kas awal tahun ajaran (sisa SiLPA / kas periode sebelumnya)"
                              />
                            </div>
                          </div>
                        </div>

                        <div className="overflow-x-auto rounded-xl border border-slate-800">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="text-slate-400 border-b border-slate-800 text-[11px] bg-slate-800/40">
                                <th className="py-2.5 px-3 text-left min-w-[170px]">Indikator Konsolidasi</th>
                                {MONTHS.map(m => (
                                  <th key={m.key} className="py-2.5 px-2 text-right font-medium min-w-[80px]">{m.label}</th>
                                ))}
                                <th className="py-2.5 px-3 text-right font-bold text-white min-w-[105px] bg-slate-800/80">Total 1 Thn</th>
                              </tr>
                            </thead>
                            {(() => {
                              let runningBal = parseFloat(initialCashBalance) || 0;
                              const flowMonths = MONTHS.map(m => {
                                const inc = selectedPlan.income_items.reduce((acc, i) => acc + parseFloat(i.monthly_distribution?.[m.key] || 0), 0);
                                const exp = selectedPlan.expense_items.reduce((acc, i) => {
                                  if (i.entry_mode === 'lump_sum') {
                                    return acc + parseFloat(i.monthly_distribution?.[m.key] || 0);
                                  }
                                  const q = parseFloat(i.monthly_distribution?.[m.key] || 0);
                                  const p = parseFloat(i.unit_price || i.planned_amount || 0);
                                  return acc + (q * p);
                                }, 0);
                                const startBal = runningBal;
                                const net = inc - exp;
                                const endBal = startBal + net;
                                runningBal = endBal;
                                return {
                                  key: m.key,
                                  startBal,
                                  inc,
                                  exp,
                                  net,
                                  endBal
                                };
                              });

                              const totalInc = selectedPlan.total_planned_income || 0;
                              const totalExp = selectedPlan.total_planned_expense || 0;
                              const totalNet = totalInc - totalExp;
                              const initialStart = parseFloat(initialCashBalance) || 0;
                              const finalEnd = flowMonths.length > 0 ? flowMonths[flowMonths.length - 1].endBal : initialStart;

                              return (
                                <tbody className="divide-y divide-slate-800 font-mono text-[11px]">
                                  {/* Row 1: Saldo Awal Kas */}
                                  <tr className="bg-slate-900/40">
                                    <td className="py-2.5 px-3 text-sky-400 font-bold whitespace-nowrap flex items-center gap-1.5">
                                      <span className="w-1.5 h-1.5 rounded-full bg-sky-400"></span>
                                      <span>Saldo Awal Kas</span>
                                    </td>
                                    {flowMonths.map(m => (
                                      <td key={m.key} className="py-2.5 px-2 text-right text-sky-300 font-semibold">
                                        {formatCurrency(m.startBal)}
                                      </td>
                                    ))}
                                    <td className="py-2.5 px-3 text-right font-bold text-sky-400 bg-slate-800/60">
                                      {formatCurrency(initialStart)}
                                    </td>
                                  </tr>

                                  {/* Row 2: Rencana Pemasukan (+) */}
                                  <tr>
                                    <td className="py-2.5 px-3 text-emerald-400 font-bold whitespace-nowrap">
                                      (+) Rencana Pemasukan
                                    </td>
                                    {flowMonths.map(m => (
                                      <td key={m.key} className="py-2.5 px-2 text-right text-emerald-300">
                                        {formatCurrency(m.inc)}
                                      </td>
                                    ))}
                                    <td className="py-2.5 px-3 text-right font-bold text-emerald-400 bg-slate-800/40">
                                      {formatCurrency(totalInc)}
                                    </td>
                                  </tr>

                                  {/* Row 3: Rencana Pengeluaran (-) */}
                                  <tr>
                                    <td className="py-2.5 px-3 text-rose-400 font-bold whitespace-nowrap">
                                      (-) Rencana Pengeluaran
                                    </td>
                                    {flowMonths.map(m => (
                                      <td key={m.key} className="py-2.5 px-2 text-right text-rose-300">
                                        {formatCurrency(m.exp)}
                                      </td>
                                    ))}
                                    <td className="py-2.5 px-3 text-right font-bold text-rose-400 bg-slate-800/40">
                                      {formatCurrency(totalExp)}
                                    </td>
                                  </tr>

                                  {/* Row 4: Net Surplus / (Defisit) Bulan Berjalan */}
                                  <tr className="bg-slate-800/20 text-slate-300 font-medium">
                                    <td className="py-2.5 px-3 text-slate-300 whitespace-nowrap">
                                      (=) Surplus/(Defisit) Bulan Ini
                                    </td>
                                    {flowMonths.map(m => (
                                      <td
                                        key={m.key}
                                        className={`py-2.5 px-2 text-right font-semibold ${m.net >= 0 ? 'text-emerald-400' : 'text-amber-400'}`}
                                      >
                                        {m.net >= 0 ? `+${formatCurrency(m.net)}` : formatCurrency(m.net)}
                                      </td>
                                    ))}
                                    <td className={`py-2.5 px-3 text-right font-bold ${totalNet >= 0 ? 'text-emerald-400' : 'text-amber-400'} bg-slate-800/40`}>
                                      {totalNet >= 0 ? `+${formatCurrency(totalNet)}` : formatCurrency(totalNet)}
                                    </td>
                                  </tr>

                                  {/* Row 5: Saldo Akhir Kas Kumulatif */}
                                  <tr className="border-t-2 border-slate-700 font-bold bg-slate-800/60 text-white">
                                    <td className="py-3 px-3 text-amber-300 whitespace-nowrap flex items-center gap-1.5 font-bold">
                                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                                      <span>Saldo Akhir Kas Kumulatif</span>
                                    </td>
                                    {flowMonths.map(m => (
                                      <td
                                        key={m.key}
                                        className={`py-3 px-2 text-right font-black ${m.endBal >= 0 ? 'text-amber-300' : 'text-rose-400'}`}
                                      >
                                        {formatCurrency(m.endBal)}
                                      </td>
                                    ))}
                                    <td className={`py-3 px-3 text-right text-xs font-black bg-slate-800/90 ${finalEnd >= 0 ? 'text-amber-300' : 'text-rose-400'}`}>
                                      {formatCurrency(finalEnd)}
                                    </td>
                                  </tr>
                                </tbody>
                              );
                            })()}
                          </table>
                        </div>
                      </div>
                    )}

                    {/* 3.B. TAMPILAN 2: RINCIAN PROYEKSI PER JENIS PEMASUKAN BERDASARKAN KOLOM NAMA SUMBER PENDAPATAN */}
                    {(cashFlowSubTab === 'by_fee_type' || cashFlowSubTab === 'all') && (
                      <div className="space-y-3 pt-2">
                        {/* Filter Bar Per Jenis Pemasukan */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-slate-800/60 rounded-xl border border-slate-700/70">
                          <div className="flex items-center gap-2">
                            <Tag className="w-4 h-4 text-emerald-400 shrink-0" />
                            <div>
                              <h5 className="text-xs font-bold text-slate-100 uppercase tracking-wider">
                                Proyeksi per Jenis Pemasukan berdasarkan kolom Nama Sumber Pendapatan
                              </h5>
                              <p className="text-[10.5px] text-slate-400">
                                Berdasarkan Rencana Pemasukan per Sumber Pendapatan dan Alokasi Pos Sumber Dana pada Rencana Pengeluaran Tahun Ajaran Ini
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 self-start sm:self-auto">
                            <span className="text-[11px] text-slate-400 font-medium">Filter:</span>
                            <select
                              value={selectedCashFlowFeeTypeFilter}
                              onChange={(e) => setSelectedCashFlowFeeTypeFilter(e.target.value)}
                              className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-lg px-2.5 py-1.5 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                            >
                              <option value="all">Semua Jenis Pemasukan ({cashFlowByFeeType.length})</option>
                              {cashFlowByFeeType.map((grp) => (
                                <option key={grp.id} value={grp.id}>
                                  {grp.name} {grp.total_net < 0 ? '⚠️ (Defisit)' : `(+${formatCurrency(grp.total_net)})`}
                                </option>
                              ))}
                            </select>

                            <button
                              type="button"
                              onClick={() => {
                                const allExp = {};
                                const hasAnyOpen = Object.values(expandedCashFlowRows).some(Boolean);
                                if (!hasAnyOpen) {
                                  cashFlowByFeeType.forEach(g => { allExp[g.key] = true; });
                                }
                                setExpandedCashFlowRows(allExp);
                              }}
                              className="px-2.5 py-1.5 rounded-lg bg-slate-700/80 hover:bg-slate-700 text-[11px] font-semibold text-slate-200 transition"
                            >
                              {Object.values(expandedCashFlowRows).some(Boolean) ? 'Tutup Rincian' : 'Buka Semua Rincian'}
                            </button>
                          </div>
                        </div>

                        {/* Cards / Tables per Jenis Pemasukan */}
                        <div className="space-y-3">
                          {filteredCashFlowByFeeType.length > 0 ? (
                            filteredCashFlowByFeeType.map((grp) => {
                              const isExpanded = !!expandedCashFlowRows[grp.key];
                              const isSurplus = grp.total_net >= 0;
                              const hasNoExpense = grp.total_expense === 0;

                              return (
                                <div
                                  key={grp.key}
                                  className="bg-slate-950/60 border border-slate-800 rounded-xl overflow-hidden shadow-2xs hover:border-slate-700 transition"
                                >
                                  {/* Header Jenis Pemasukan */}
                                  <div className="p-3 bg-slate-800/70 flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-slate-800">
                                    <div className="flex items-center gap-2.5">
                                      <div className={`p-1.5 rounded-lg font-bold text-xs ${
                                        isSurplus ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                                      }`}>
                                        <Coins className="w-4 h-4" />
                                      </div>
                                      <div>
                                        <div className="flex items-center gap-2">
                                          <span className="text-xs font-bold text-white tracking-wide">{grp.name}</span>
                                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-700 text-slate-300">
                                            {grp.billing_pattern === 'monthly' ? 'Bulanan (SPP)' : (grp.billing_pattern === 'yearly' ? 'Tahunan' : 'Insidental / Rencana Khusus')}
                                          </span>
                                        </div>
                                        <div className="text-[10.5px] text-slate-400 flex items-center gap-2 mt-0.5">
                                          <span>Sumber Pendapatan RAPBS</span>
                                          <span>•</span>
                                          <span>{grp.expense_items.length} Kegiatan Belanja Dialokasikan</span>
                                        </div>
                                      </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                      {/* Status Badge */}
                                      <div className={`px-2.5 py-1 rounded-lg text-xs font-bold font-mono flex items-center gap-1.5 ${
                                        hasNoExpense
                                          ? 'bg-slate-800 text-slate-400 border border-slate-700'
                                          : isSurplus
                                          ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/80'
                                          : 'bg-rose-950/80 text-rose-300 border border-rose-800/80'
                                      }`}>
                                        {hasNoExpense ? (
                                          <span>Belum Ada Alokasi Belanja</span>
                                        ) : isSurplus ? (
                                          <span>Surplus: +{formatCurrency(grp.total_net)}</span>
                                        ) : (
                                          <span>Defisit: {formatCurrency(grp.total_net)}</span>
                                        )}
                                      </div>

                                      {/* Expand Details Button */}
                                      <button
                                        type="button"
                                        onClick={() => toggleCashFlowRow(grp.key)}
                                        className="px-2.5 py-1 rounded-lg bg-slate-700/60 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1 transition"
                                      >
                                        <span>Rincian Alokasi</span>
                                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                      </button>
                                    </div>
                                  </div>

                                  {/* 12-Month Flow Table for this Fee Type */}
                                  <div className="overflow-x-auto">
                                    <table className="w-full text-xs">
                                      <thead>
                                        <tr className="text-slate-400 border-b border-slate-800/80 text-[10.5px] bg-slate-900/50">
                                          <th className="py-2 px-3 text-left min-w-[150px]">Aliran Kas Jenis Pemasukan</th>
                                          {MONTHS.map(m => (
                                            <th key={m.key} className="py-2 px-2 text-right font-medium min-w-[75px]">{m.short}</th>
                                          ))}
                                          <th className="py-2 px-3 text-right font-bold text-slate-200 min-w-[100px] bg-slate-900/90">Total 1 Thn</th>
                                        </tr>
                                      </thead>
                                      {(() => {
                                         let runningPosBal = 0;
                                         const flowPosMonths = MONTHS.map(m => {
                                           const inc = grp.monthly_income[m.key] || 0;
                                           const exp = grp.monthly_expense[m.key] || 0;
                                           const startBal = runningPosBal;
                                           const net = inc - exp;
                                           const endBal = startBal + net;
                                           runningPosBal = endBal;
                                           return {
                                             key: m.key,
                                             startBal,
                                             inc,
                                             exp,
                                             net,
                                             endBal
                                           };
                                         });

                                         const finalPosEnd = flowPosMonths.length > 0 ? flowPosMonths[flowPosMonths.length - 1].endBal : 0;

                                         return (
                                           <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                                             {/* Row 1: Saldo Awal Pos */}
                                             <tr className="bg-slate-900/40">
                                               <td className="py-2 px-3 text-sky-400 font-bold whitespace-nowrap flex items-center gap-1">
                                                 <span className="w-1.5 h-1.5 rounded-full bg-sky-400"></span>
                                                 <span>Saldo Awal Kas Pos</span>
                                               </td>
                                               {flowPosMonths.map(m => (
                                                 <td key={m.key} className="py-2 px-2 text-right text-sky-300/90 font-medium">
                                                   {formatCurrency(m.startBal)}
                                                 </td>
                                               ))}
                                               <td className="py-2 px-3 text-right font-bold text-sky-400 bg-slate-900/60">
                                                 Rp 0
                                               </td>
                                             </tr>

                                             {/* Row 2: Rencana Pemasukan */}
                                             <tr>
                                               <td className="py-2 px-3 text-emerald-400 font-semibold whitespace-nowrap">
                                                 (+) Penerimaan ({grp.name})
                                               </td>
                                               {flowPosMonths.map(m => (
                                                 <td key={m.key} className="py-2 px-2 text-right text-emerald-300">
                                                   {m.inc > 0 ? formatCurrency(m.inc) : <span className="text-slate-600">-</span>}
                                                 </td>
                                               ))}
                                               <td className="py-2 px-3 text-right font-bold text-emerald-400 bg-slate-900/60">
                                                 {formatCurrency(grp.total_income)}
                                               </td>
                                             </tr>

                                             {/* Row 3: Rencana Pengeluaran */}
                                             <tr>
                                               <td className="py-2 px-3 text-rose-400 font-semibold whitespace-nowrap">
                                                 (-) Belanja Pos ({grp.name})
                                               </td>
                                               {flowPosMonths.map(m => (
                                                 <td key={m.key} className="py-2 px-2 text-right text-rose-300">
                                                   {m.exp > 0 ? formatCurrency(m.exp) : <span className="text-slate-600">-</span>}
                                                 </td>
                                               ))}
                                               <td className="py-2 px-3 text-right font-bold text-rose-400 bg-slate-900/60">
                                                 {formatCurrency(grp.total_expense)}
                                               </td>
                                             </tr>

                                             {/* Row 4: Net Surplus / (Defisit) Bulan Ini */}
                                             <tr className="bg-slate-900/30 text-slate-300">
                                               <td className="py-2 px-3 text-slate-300 whitespace-nowrap">
                                                 (=) Surplus/(Defisit) Bulan Ini
                                               </td>
                                               {flowPosMonths.map(m => (
                                                 <td
                                                   key={m.key}
                                                   className={`py-2 px-2 text-right font-medium ${
                                                     m.net > 0 ? 'text-emerald-400' : m.net < 0 ? 'text-amber-400' : 'text-slate-500'
                                                   }`}
                                                 >
                                                   {m.net !== 0 ? (m.net > 0 ? `+${formatCurrency(m.net)}` : formatCurrency(m.net)) : '0'}
                                                 </td>
                                               ))}
                                               <td className={`py-2 px-3 text-right font-bold bg-slate-900/60 ${
                                                 grp.total_net >= 0 ? 'text-emerald-400' : 'text-amber-400'
                                               }`}>
                                                 {grp.total_net >= 0 ? `+${formatCurrency(grp.total_net)}` : formatCurrency(grp.total_net)}
                                               </td>
                                             </tr>

                                             {/* Row 5: Saldo Akhir Kumulatif Pos */}
                                             <tr className="border-t-2 border-slate-700 font-bold bg-slate-900/70">
                                               <td className="py-2.5 px-3 text-amber-300 whitespace-nowrap font-bold flex items-center gap-1">
                                                 <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                                                 <span>Saldo Akhir Kas ({grp.name})</span>
                                               </td>
                                               {flowPosMonths.map(m => (
                                                 <td
                                                   key={m.key}
                                                   className={`py-2.5 px-2 text-right font-black ${
                                                     m.endBal > 0 ? 'text-amber-300' : m.endBal < 0 ? 'text-rose-400' : 'text-slate-400'
                                                   }`}
                                                 >
                                                   {formatCurrency(m.endBal)}
                                                 </td>
                                               ))}
                                               <td className={`py-2.5 px-3 text-right font-black bg-slate-900/90 ${
                                                 finalPosEnd >= 0 ? 'text-amber-300' : 'text-rose-400'
                                               }`}>
                                                 {formatCurrency(finalPosEnd)}
                                               </td>
                                             </tr>
                                           </tbody>
                                         );
                                       })()}
                                    </table>
                                  </div>

                                  {/* Rincian Expandable Sub-items (Pemasukan & Pengeluaran) */}
                                  {isExpanded && (
                                    <div className="p-3 bg-slate-900/90 border-t border-slate-800 space-y-3 text-xs animate-in fade-in duration-150">
                                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                        {/* Kolom Kiri: Rincian Sumber Pendapatan */}
                                        <div className="space-y-2">
                                          <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
                                            <span className="font-bold text-emerald-400 flex items-center gap-1.5 text-[11px] uppercase tracking-wide">
                                              <TrendingUp className="w-3.5 h-3.5" />
                                              Sumber Pendapatan ({grp.income_items.length})
                                            </span>
                                            <span className="text-[11px] font-mono text-emerald-300 font-bold">
                                              {formatCurrency(grp.total_income)}
                                            </span>
                                          </div>
                                          {grp.income_items.length > 0 ? (
                                            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                                              {grp.income_items.map((inc, iIdx) => (
                                                <div
                                                  key={iIdx}
                                                  className="p-2 rounded-lg bg-slate-800/60 border border-slate-700/60 flex items-center justify-between gap-2 text-[11px]"
                                                >
                                                  <span className="font-medium text-slate-200">{inc.name}</span>
                                                  <span className="font-mono text-emerald-300 font-bold shrink-0">
                                                    {formatCurrency(inc.planned_amount)}
                                                  </span>
                                                </div>
                                              ))}
                                            </div>
                                          ) : (
                                            <div className="p-3 rounded-lg bg-slate-800/30 text-slate-500 italic text-[11px] text-center">
                                              Belum ada item rencana pemasukan untuk pos ini
                                            </div>
                                          )}
                                        </div>

                                        {/* Kolom Kanan: Rincian Beban Belanja Program */}
                                        <div className="space-y-2">
                                          <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
                                            <span className="font-bold text-rose-400 flex items-center gap-1.5 text-[11px] uppercase tracking-wide">
                                              <Wallet className="w-3.5 h-3.5" />
                                              Kegiatan Belanja Program ({grp.expense_items.length})
                                            </span>
                                            <span className="text-[11px] font-mono text-rose-300 font-bold">
                                              {formatCurrency(grp.total_expense)}
                                            </span>
                                          </div>
                                          {grp.expense_items.length > 0 ? (
                                            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                                              {grp.expense_items.map((exp, eIdx) => {
                                                const amount = parseFloat(exp.planned_amount || (exp.quantity * exp.unit_price) || 0);
                                                return (
                                                  <div
                                                    key={eIdx}
                                                    className="p-2 rounded-lg bg-slate-800/60 border border-slate-700/60 flex items-center justify-between gap-2 text-[11px]"
                                                  >
                                                    <div className="truncate">
                                                      <div className="font-medium text-slate-200 truncate">{exp.name}</div>
                                                      <div className="text-[10px] text-slate-400 truncate">
                                                        Program: {exp.budget_program_name || 'Program Umum'}
                                                      </div>
                                                    </div>
                                                    <span className="font-mono text-rose-300 font-bold shrink-0">
                                                      {formatCurrency(amount)}
                                                    </span>
                                                  </div>
                                                );
                                              })}
                                            </div>
                                          ) : (
                                            <div className="p-3 rounded-lg bg-slate-800/30 text-slate-500 italic text-[11px] text-center">
                                              Belum ada kegiatan belanja yang dibebankan ke pos sumber dana ini
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })
                          ) : (
                            <div className="p-6 bg-slate-950/40 rounded-xl border border-slate-800 text-center text-slate-400 text-xs italic">
                              Tidak ada pos tagihan yang cocok dengan filter yang dipilih.
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center text-slate-400 italic">
                Pilih dokumen RAPBS dari daftar untuk melihat detail anggaran
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: KATALOG STANDAR BIAYA */}
      {/* ========================================================================= */}
      {activeMainTab === 'catalog' && (
        <div className="space-y-4">
          {/* Explanation Banner */}
          <div className="bg-indigo-50/70 border border-indigo-200 rounded-xl px-4 py-2.5 flex items-center justify-between text-xs text-indigo-950">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-indigo-600 shrink-0" />
              <span>
                <strong>Standar Biaya &amp; Plafon Harga:</strong> Daftar acuan harga tertinggi pengadaan barang/jasa per tahun ajaran. Item belanja RAPBS divalidasi tidak boleh melebihi harga acuan ini.
              </span>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 bg-indigo-100/80 px-2 py-0.5 rounded">
              Standard Cost Catalog
            </span>
          </div>

          {/* Search & Filters */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3 flex-1">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={catalogSearch}
                  onChange={(e) => setCatalogSearch(e.target.value)}
                  placeholder="Cari nama barang / jasa..."
                  className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>
              <select
                value={selectedExpenseCatFilter}
                onChange={(e) => setSelectedExpenseCatFilter(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700"
              >
                <option value="">Semua Kategori Belanja</option>
                {expenseCategories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
            <div className="text-xs text-slate-500">
              Menampilkan <strong className="text-slate-800 font-bold">{filteredCatalog.length}</strong> item katalog
            </div>
          </div>

          {/* Table Katalog */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="overflow-auto max-h-[75vh] max-w-full relative">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 sticky top-0 z-20 shadow-2xs">
                  <tr>
                    <th className="px-5 py-3 sticky top-0 left-0 bg-slate-50 z-30">Nama Barang / Jasa</th>
                    <th className="px-5 py-3 bg-slate-50">Satuan</th>
                    <th className="px-5 py-3 bg-slate-50">Kategori Pengeluaran</th>
                    <th className="px-5 py-3 text-right bg-slate-50">Harga Acuan Plafon (Rp)</th>
                    <th className="px-5 py-3 bg-slate-50">Status</th>
                    <th className="px-5 py-3 text-right sticky top-0 right-0 bg-slate-50 z-30">Aksi &amp; Riwayat</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredCatalog.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="px-5 py-8 text-center text-slate-400">
                        Tidak ada data item katalog standar biaya.
                      </td>
                    </tr>
                  ) : (
                    filteredCatalog.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/60 transition">
                        <td className="px-5 py-3.5 font-bold text-slate-800">
                          <div className="flex items-center gap-2">
                            <Tag className="w-3.5 h-3.5 text-indigo-600" />
                            <span>{item.name}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-slate-600">
                          <span className="font-mono bg-slate-100 px-2 py-0.5 rounded text-[11px] font-semibold">{item.unit}</span>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-pink-50 text-pink-700 border border-pink-200">
                            {item.expense_category_name || 'Beban Operasional'}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-right font-bold text-slate-800">
                          {formatCurrency(item.reference_price)}
                        </td>
                        <td className="px-5 py-3.5">
                          {item.is_active ? (
                            <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md text-[10px] font-bold">
                              <CheckCircle2 className="w-3 h-3" /> Aktif
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md text-[10px] font-bold">
                              <XCircle className="w-3 h-3" /> Non-aktif
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenEditCatalog(item)}
                              title="Ubah Item Standar Biaya"
                              className="p-1.5 text-slate-500 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleToggleCatalogStatus(item)}
                              title={item.is_active ? 'Nonaktifkan Item Katalog' : 'Aktifkan Item Katalog'}
                              className={`p-1.5 rounded-lg transition ${
                                item.is_active
                                  ? 'text-amber-600 hover:bg-amber-50 hover:text-amber-700'
                                  : 'text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700'
                              }`}
                            >
                              <Power className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenPriceHistory(item)}
                              title="Lihat Riwayat Perubahan Harga Acuan"
                              className="p-1.5 text-slate-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition"
                            >
                              <History className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODALS */}
      {/* ========================================================================= */}

      {/* Modal Realisasi Anggaran Real-Time (Fitur #12) */}
      {realizationModalOpen && realizationData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full p-6 border border-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div>
                <h2 className="text-sm font-bold text-slate-800">Realisasi Anggaran RAPBS (Real-Time)</h2>
                <p className="text-[11px] text-slate-400">Dihitung secara dinamis dari catatan pengeluaran kas aktual</p>
              </div>
              <button type="button" onClick={() => setRealizationModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Overall Summary Bar */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex items-center justify-between">
                <div>
                  <div className="text-xs text-slate-500">Total Penyerapan Anggaran</div>
                  <div className="text-xl font-extrabold text-slate-800 mt-0.5">
                    {realizationData.overall_absorption_percentage}%
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-slate-500">Realisasi / Anggaran</div>
                  <div className="text-xs font-bold text-slate-700 mt-0.5">
                    {formatCurrency(realizationData.total_realized_expense)} / {formatCurrency(realizationData.total_planned_expense)}
                  </div>
                </div>
              </div>

              {/* Rincian per Program */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-slate-700">Rincian Penyerapan per Program Kerja</h3>
                <div className="space-y-2">
                  {realizationData.programs?.map((prog, i) => (
                    <div key={i} className="p-3.5 bg-white border border-slate-200 rounded-xl space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-800">{prog.program_name}</span>
                        <span className={`font-bold px-2 py-0.5 rounded text-[10px] ${prog.is_over_budget ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                          {prog.absorption_percentage}% {prog.is_over_budget && '(Over-Budget)'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-500">
                        <span>Plafon: {formatCurrency(prog.planned_amount)}</span>
                        <span>Realisasi: <strong className="text-slate-800">{formatCurrency(prog.realized_amount)}</strong></span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                        <div
                          className={`h-1.5 rounded-full ${prog.is_over_budget ? 'bg-red-500' : 'bg-emerald-500'}`}
                          style={{ width: `${Math.min(100, prog.absorption_percentage)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Buat Draft RAPBS Baru */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 border border-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h2 className="text-sm font-bold text-slate-800">Buat Draft Dokumen RAPBS Baru</h2>
              <button type="button" onClick={() => setCreateModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreateDraft} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Judul Dokumen RAPBS *</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Contoh: RAPBS Tahun Ajaran 2026/2027"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button type="button" onClick={() => setCreateModalOpen(false)} className="px-3 py-1.5 text-xs text-slate-600">Batal</button>
                <button type="submit" disabled={submitting} className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-semibold">
                  {submitting ? 'Membuat...' : 'Buat Draft'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Buat Revisi (Versi Baru) */}
      {revisionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 border border-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div>
                <h2 className="text-sm font-bold text-slate-800">Buat Revisi RAPBS (Versi Baru)</h2>
                <p className="text-[11px] text-slate-400">Seluruh rincian pendapatan &amp; belanja akan disalin ke versi baru</p>
              </div>
              <button type="button" onClick={() => setRevisionModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreateRevision} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Alasan Revisi Anggaran *</label>
                <textarea
                  required
                  rows={3}
                  value={revisionReason}
                  onChange={(e) => setRevisionReason(e.target.value)}
                  placeholder="Contoh: Penyesuaian kenaikan tarif listrik dan penambahan program beasiswa santri berprestasi"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button type="button" onClick={() => setRevisionModalOpen(false)} className="px-3 py-1.5 text-xs text-slate-600">Batal</button>
                <button type="submit" disabled={submitting} className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold">
                  {submitting ? 'Memproses...' : 'Buat Versi Revisi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: PEMETAAN RENCANA PENERIMAAN PER BULAN (INCOME) */}
      {/* ========================================================================= */}
      {incomeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 border border-slate-100 max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Coins className="w-5 h-5 text-emerald-600" />
                <div>
                  <h2 className="text-sm font-bold text-slate-800">
                    {editingIncomeItem ? 'Pemetaan Alokasi Bulanan' : 'Tambah Pos Penerimaan'}
                  </h2>
                  <p className="text-[11px] text-slate-400">Petakan target rencana penerimaan kas per bulan (Juli s.d. Juni)</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIncomeModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveIncomeMonthly} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Pos Jenis Tagihan Biaya Pendidikan <span className="text-[10px] text-slate-400 font-normal">(Opsional)</span>
                </label>
                <SearchableSelect
                  value={incomeFormFeeTypeId}
                  onChange={(val) => {
                    setIncomeFormFeeTypeId(val ? Number(val) : '');
                    if (val && !incomeFormName.trim()) {
                      const selectedFt = feeTypes.find(f => f.id === Number(val));
                      if (selectedFt) {
                        setIncomeFormName(`Penerimaan ${selectedFt.name}`);
                      }
                    }
                  }}
                  placeholder="-- Pilih Jenis Tagihan (SPP, DSP, BOS, dll) --"
                  searchPlaceholder="Cari jenis tagihan..."
                  options={[
                    { value: '', label: '-- Tanpa Jenis Tagihan / Sumber Dana Lainnya --' },
                    ...feeTypes.map(f => ({
                      value: f.id,
                      label: f.name,
                      sublabel: f.billing_pattern ? `Pola: ${f.billing_pattern === 'monthly' ? 'Bulanan' : 'Non-Bulanan'}` : undefined
                    }))
                  ]}
                />
                <span className="text-[10.5px] text-slate-400 font-medium block mt-1">
                  * Menghubungkan penerimaan ini dengan pos tagihan santri &amp; proyeksi arus kas sumber dana belanja
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nama Sumber Penerimaan *</label>
                <input
                  type="text"
                  required
                  value={incomeFormName}
                  onChange={(e) => setIncomeFormName(e.target.value)}
                  placeholder="Contoh: Penerimaan SPP Santri Reguler"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              {/* Summary Indicator: Plafon vs Terpetakan vs Sisa */}
              {(() => {
                const sumMonths = Object.values(incomeMonthlyDist).reduce((a, b) => a + (parseFloat(b) || 0), 0);
                const isOver = incomeFormMaxCap > 0 && sumMonths > incomeFormMaxCap;
                const diff = (incomeFormMaxCap || sumMonths) - sumMonths;

                return (
                  <div className="space-y-2">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                      <div>
                        <div className="text-[10px] uppercase font-bold text-slate-500">Plafon / Penetapan Setahun</div>
                        <div className="text-xs font-black text-slate-800 mt-0.5">
                          {incomeFormMaxCap > 0 ? formatCurrency(incomeFormMaxCap) : 'Manual / Fleksibel'}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase font-bold text-slate-500">Total Terpetakan (12 Bln)</div>
                        <div className={`text-xs font-black mt-0.5 ${isOver ? 'text-rose-600' : 'text-emerald-700'}`}>
                          {formatCurrency(sumMonths)}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase font-bold text-slate-500">Sisa Belum Dipetakan</div>
                        <div className={`text-xs font-black mt-0.5 ${isOver ? 'text-rose-600 font-extrabold' : 'text-indigo-700'}`}>
                          {incomeFormMaxCap > 0 ? formatCurrency(diff) : '0'}
                        </div>
                      </div>
                    </div>

                    {isOver && (
                      <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 font-semibold flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                        <span>
                          Total alokasi bulanan (Rp {sumMonths.toLocaleString('id-ID')}) melebihi batas penetapan setahun (Rp {incomeFormMaxCap.toLocaleString('id-ID')}) sebesar Rp {Math.abs(diff).toLocaleString('id-ID')}.
                        </span>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Quick Action Toolbar */}
              <div className="flex items-center justify-between gap-2 pt-1">
                <span className="text-xs font-bold text-slate-700">Rincian Nominal per Bulan (Tahun Ajaran):</span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleDistributeEvenlyIncome}
                    className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-[11px] font-bold transition flex items-center gap-1"
                  >
                    <Sparkles className="w-3 h-3" /> Bagi Rata 12 Bulan
                  </button>
                  <button
                    type="button"
                    onClick={handleResetIncomeMonths}
                    className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-[11px] font-semibold transition"
                  >
                    Kosongkan
                  </button>
                </div>
              </div>

              {/* 12 Bulan Input Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {MONTHS.map((m) => {
                  const val = incomeMonthlyDist[m.key] || 0;
                  return (
                    <div key={m.key} className="bg-slate-50/70 p-2.5 rounded-xl border border-slate-200/80 space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-bold text-slate-700">{m.label}</label>
                        <span className="text-[9px] text-slate-400 font-mono">{m.q}</span>
                      </div>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={val === 0 ? '' : val}
                        onChange={(e) => {
                          const num = parseFloat(e.target.value || 0);
                          setIncomeMonthlyDist(prev => ({ ...prev, [m.key]: num }));
                        }}
                        placeholder="0"
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />
                      {val > 0 && (
                        <div className="text-[10px] font-bold text-purple-700 truncate" title={formatCurrency(val)}>
                          {Number(val).toLocaleString('id-ID')}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIncomeModalOpen(false)}
                  className="px-3.5 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting || (incomeFormMaxCap > 0 && Object.values(incomeMonthlyDist).reduce((a, b) => a + (parseFloat(b) || 0), 0) > incomeFormMaxCap)}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition disabled:opacity-50"
                >
                  {submitting ? 'Menyimpan...' : 'Simpan Pemetaan Bulanan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: INPUT / UBAH RENCANA PENGELUARAN RAPBS (EXPENSE) */}
      {/* ========================================================================= */}
      {expenseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 border border-slate-100 max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Wallet className="w-5 h-5 text-rose-600" />
                <div>
                  <h2 className="text-sm font-bold text-slate-800">
                    {editingExpenseItem ? 'Ubah Pos Belanja RAPBS' : 'Tambah Pos Belanja RAPBS'}
                  </h2>
                  <p className="text-[11px] text-slate-400">Pilih mode penganggaran: Rincian per Item Katalog atau Lump Sum per Kegiatan</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setExpenseModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveExpense} className="space-y-4">
              {/* Toggle Mode Penganggaran: Itemized vs Lump Sum */}
              <div className="p-1 bg-slate-100 rounded-xl flex items-center gap-1 border border-slate-200/80">
                <button
                  type="button"
                  onClick={() => setExpenseForm(prev => ({ ...prev, entry_mode: 'itemized' }))}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                    expenseForm.entry_mode === 'itemized'
                      ? 'bg-white text-slate-800 shadow-xs'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <Tag className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Rincian per Item (Katalog)</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setExpenseForm(prev => {
                      const prog = budgetPrograms.find(p => p.id === Number(prev.budget_program_id));
                      return {
                        ...prev,
                        entry_mode: 'lump_sum',
                        name: (!prev.name.trim() || prev.catalog_item_id) ? (prog?.name || '') : prev.name
                      };
                    });
                  }}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                    expenseForm.entry_mode === 'lump_sum'
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Anggaran Lump Sum per Kegiatan</span>
                </button>
              </div>

              {/* Program Kerja & Sumber Dana (Wajib untuk kedua mode) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700">Program Kerja RAPBS *</label>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={handleSyncPrograms}
                        disabled={syncingPrograms}
                        className="inline-flex items-center gap-1 text-[10px] text-indigo-700 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 px-1.5 py-0.5 rounded border border-indigo-200 cursor-pointer"
                        title="Sinkronkan ulang daftar program dari RKT/RIPS Manajemen"
                      >
                        <RotateCw className={`w-2.5 h-2.5 ${syncingPrograms ? 'animate-spin' : ''}`} />
                        <span>{syncingPrograms ? 'Menyinkronkan...' : 'Sinkron RKT'}</span>
                      </button>
                      <span className="text-[10px] text-indigo-700 font-semibold bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200">
                        RKT Modul Manajemen
                      </span>
                    </div>
                  </div>
                    <SearchableSelect
                      value={expenseForm.budget_program_id}
                      onChange={(val) => {
                        const pId = val ? Number(val) : '';
                        const prog = budgetPrograms.find(p => p.id === pId);
                        setExpenseForm(prev => ({
                          ...prev,
                          budget_program_id: pId,
                          name: (prev.entry_mode === 'lump_sum' && (!prev.name.trim() || budgetPrograms.some(p => p.name === prev.name.trim()))) ? (prog?.name || '') : prev.name
                        }));
                      }}
                      placeholder="-- Pilih Program Kerja RKT / RAPBS --"
                      searchPlaceholder="Cari program, bidang, sub-bidang, atau kode..."
                      options={(() => {
                        const seen = new Set();
                        return budgetPrograms
                          .filter(p => {
                            const key = `${p.id}_${p.name}`;
                            if (seen.has(key)) return false;
                            seen.add(key);
                            return true;
                          })
                          .sort((a, b) => {
                            if (a.domain_order_index !== b.domain_order_index) return (a.domain_order_index ?? 999) - (b.domain_order_index ?? 999);
                            if (a.subdomain_order_index !== b.subdomain_order_index) return (a.subdomain_order_index ?? 999) - (b.subdomain_order_index ?? 999);
                            if (a.order_index !== b.order_index) return (a.order_index ?? 999) - (b.order_index ?? 999);
                            if (a.code && b.code) return a.code.localeCompare(b.code, undefined, { numeric: true });
                            return a.name.localeCompare(b.name);
                          })
                          .map(p => ({
                            value: p.id,
                            label: p.name,
                            sublabel: p.domain_name
                              ? `Bidang: ${p.domain_name}${p.subdomain_name ? ` > ${p.subdomain_name}` : ''}`
                              : (p.category_name ? `Kategori: ${p.category_name}` : 'Program RKT'),
                            badge: p.domain_code || p.code || undefined
                          }));
                      })()}
                    />
                  {!expenseForm.budget_program_id && (
                    <span className="text-[10.5px] text-amber-600 font-medium block mt-1">
                      * Pilih program kerja untuk mengelompokkan pos belanja ini
                    </span>
                  )}
                </div>

                {expenseForm.entry_mode === 'itemized' ? (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Pos Sumber Dana (Rencana Pendapatan RAPBS) *
                    </label>
                    <SearchableSelect
                      value={expenseForm.fund_source_income_item_id}
                      onChange={(val) => {
                        const chosenInc = selectedPlan?.income_items?.find(i => i.id === Number(val));
                        setExpenseForm({
                          ...expenseForm,
                          fund_source_income_item_id: val ? Number(val) : '',
                          fund_source_fee_type_id: chosenInc?.fee_type_id || ''
                        });
                      }}
                      placeholder="-- Pilih Sumber Pendapatan RAPBS --"
                      searchPlaceholder="Cari sumber pendapatan RAPBS..."
                      options={(selectedPlan?.income_items || []).map(inc => ({
                        value: inc.id,
                        label: inc.name,
                        sublabel: `Target/Plafon: ${formatCurrency(inc.planned_amount || 0)}`
                      }))}
                    />
                    {!expenseForm.fund_source_income_item_id && (
                      <span className="text-[10.5px] text-amber-600 font-medium block mt-1">
                        * Tentukan sumber pendapatan RAPBS untuk membiayai item belanja ini
                      </span>
                    )}
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Pos Sumber Dana Belanja
                    </label>
                    <div className="p-2.5 bg-purple-50/80 border border-purple-200 rounded-xl flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <Coins className="w-4 h-4 text-purple-600 shrink-0" />
                        <div>
                          <span className="font-bold text-purple-950 block">Multi-Sumber Dana</span>
                          <span className="text-[10.5px] text-purple-700">
                            {expenseForm.fund_sources?.length || 0} sumber dana ditentukan pada rincian alokasi di bawah
                          </span>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-200/80 text-purple-900">
                        Lump Sum
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* ============================================================== */}
              {/* KONTEN MODE A: ANGGARAN LUMP SUM PER KEGIATAN */}
              {/* ============================================================== */}
              {expenseForm.entry_mode === 'lump_sum' ? (
                <div className="space-y-4 animate-in fade-in duration-100">
                  <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl text-xs text-purple-900 flex items-start gap-2">
                    <Info className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold">Mode Belanja Lump Sum:</span> Digunakan untuk paket kegiatan atau pengeluaran gabungan tanpa rincian item &amp; harga satuan. Uraian keperluan wajib diisi sebagai penjelasan ke auditor &amp; yayasan.
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-bold text-slate-700">
                        Nama Pos / Sub-Kegiatan <span className="text-[10px] text-slate-400 font-normal">(Opsional)</span>
                      </label>
                      <span className="text-[10px] text-purple-700 font-semibold bg-purple-50 px-2 py-0.2 rounded-full border border-purple-200">
                        Default: Nama Program Kerja
                      </span>
                    </div>
                    <input
                      type="text"
                      value={expenseForm.name}
                      onChange={(e) => setExpenseForm({ ...expenseForm, name: e.target.value })}
                      placeholder={
                        budgetPrograms.find(p => p.id === Number(expenseForm.budget_program_id))?.name || "Otomatis menggunakan Nama Program Kerja"
                      }
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-purple-500 focus:outline-none"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">
                      * Dikosongkan jika anggaran mewakili program kerja secara langsung. Isi jika ingin menentukan nama sub-kegiatan tertentu.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Uraian Keperluan / Penjelasan Kegiatan *</label>
                    <textarea
                      required
                      rows={3}
                      value={expenseForm.lump_sum_description}
                      onChange={(e) => setExpenseForm({ ...expenseForm, lump_sum_description: e.target.value })}
                      placeholder="Jelaskan ruang lingkup anggaran, peruntukan dana, dan alasan penganggaran secara gelondongan (contoh: Termasuk hadiah piala, konsumsi 150 santri, sewa panggung, dan operasional dewan juri)."
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-purple-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Total Pagu Anggaran (Rp) *</label>
                    <input
                      type="number"
                      min="1"
                      step="any"
                      required
                      value={expenseForm.planned_amount === 0 ? '' : expenseForm.planned_amount}
                      onChange={(e) => setExpenseForm({ ...expenseForm, planned_amount: parseFloat(e.target.value || 0) })}
                      placeholder="Contoh: 5000000"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-purple-900 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                    />
                    {expenseForm.planned_amount > 0 && (
                      <span className="text-[11px] font-bold text-purple-700 block mt-1">
                        {Number(expenseForm.planned_amount).toLocaleString('id-ID')}
                      </span>
                    )}
                  </div>

                  {/* Multi-Source Funding Allocator for Lump Sum */}
                  <div className="bg-purple-900/5 border border-purple-200 rounded-xl p-3.5 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <div className="text-xs font-bold text-purple-950 flex items-center gap-1.5">
                          <Coins className="w-4 h-4 text-purple-600" />
                          <span>Alokasi Pos Sumber Dana (Bisa Multi-Sumber Dana) *</span>
                        </div>
                        <p className="text-[11px] text-purple-700 mt-0.5">
                          Tentukan satu atau beberapa Sumber Pendapatan RAPBS untuk mendanai kegiatan lump sum ini beserta nominal alokasinya.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setExpenseForm(prev => ({
                            ...prev,
                            fund_sources: [
                              ...prev.fund_sources,
                              { income_item_id: selectedPlan?.income_items?.[0]?.id || '', amount: 0 }
                            ]
                          }));
                        }}
                        className="px-2.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1 self-start sm:self-auto transition shrink-0"
                      >
                        <Plus className="w-3.5 h-3.5" /> Tambah Sumber Dana
                      </button>
                    </div>

                    <div className="space-y-2">
                      {expenseForm.fund_sources.map((fs, fIdx) => {
                        return (
                          <div key={fIdx} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 p-2.5 bg-white border border-purple-100 rounded-xl shadow-2xs">
                            <div className="flex-1 min-w-[200px]">
                              <SearchableSelect
                                value={fs.income_item_id}
                                onChange={(val) => {
                                  const updated = [...expenseForm.fund_sources];
                                  updated[fIdx] = { ...updated[fIdx], income_item_id: val ? Number(val) : '' };
                                  setExpenseForm(prev => ({ ...prev, fund_sources: updated }));
                                }}
                                placeholder="-- Pilih Sumber Pendapatan RAPBS --"
                                searchPlaceholder="Cari sumber pendapatan RAPBS..."
                                options={(selectedPlan?.income_items || []).map(inc => ({
                                  value: inc.id,
                                  label: inc.name,
                                  sublabel: `Target: ${formatCurrency(inc.planned_amount || 0)}`
                                }))}
                              />
                            </div>
                            <div className="w-full sm:w-48 relative">
                              <span className="text-[11px] text-slate-400 font-semibold absolute left-2.5 top-1/2 -translate-y-1/2">Rp</span>
                              <input
                                type="number"
                                min="0"
                                value={fs.amount === 0 ? '' : fs.amount}
                                onChange={(e) => {
                                  const val = parseFloat(e.target.value || 0);
                                  const updated = [...expenseForm.fund_sources];
                                  updated[fIdx] = { ...updated[fIdx], amount: val };
                                  setExpenseForm(prev => ({ ...prev, fund_sources: updated }));
                                }}
                                placeholder="Nominal Alokasi"
                                className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 text-right"
                              />
                            </div>
                            {expenseForm.fund_sources.length > 1 && (
                              <button
                                type="button"
                                onClick={() => {
                                  const updated = expenseForm.fund_sources.filter((_, idx) => idx !== fIdx);
                                  setExpenseForm(prev => ({ ...prev, fund_sources: updated }));
                                }}
                                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition shrink-0 self-center"
                                title="Hapus Sumber Dana Ini"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Summary Bar Alokasi vs Pagu */}
                    {(() => {
                      const totalAllocated = expenseForm.fund_sources.reduce((acc, s) => acc + (parseFloat(s.amount) || 0), 0);
                      const pagu = parseFloat(expenseForm.planned_amount || 0);
                      const diff = pagu - totalAllocated;
                      const isMatched = Math.abs(diff) <= 1 && pagu > 0;

                      return (
                        <div className="p-2.5 rounded-xl bg-purple-100/70 border border-purple-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                          <div className="flex items-center gap-3">
                            <div>
                              <span className="text-[10px] uppercase font-bold text-purple-700 block">Total Pagu Kegiatan:</span>
                              <span className="font-mono font-bold text-slate-800">{formatCurrency(pagu)}</span>
                            </div>
                            <div>
                              <span className="text-[10px] uppercase font-bold text-purple-700 block">Total Alokasi Sumber:</span>
                              <span className="font-mono font-bold text-purple-900">{formatCurrency(totalAllocated)}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {isMatched ? (
                              <span className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white font-bold text-[11px] flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Alokasi Sesuai 100%
                              </span>
                            ) : diff > 0 ? (
                              <div className="flex items-center gap-1.5">
                                <span className="px-2.5 py-1 rounded-lg bg-amber-100 text-amber-800 border border-amber-300 font-bold text-[11px]">
                                  Kurang: {formatCurrency(diff)}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updated = [...expenseForm.fund_sources];
                                    const lastIdx = updated.length - 1;
                                    updated[lastIdx].amount = (parseFloat(updated[lastIdx].amount) || 0) + diff;
                                    setExpenseForm(prev => ({ ...prev, fund_sources: updated }));
                                  }}
                                  className="px-2 py-1 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-[10.5px] font-semibold transition"
                                >
                                  Penuhi Sisa Alokasi
                                </button>
                              </div>
                            ) : (
                              <span className="px-2.5 py-1 rounded-lg bg-rose-100 text-rose-800 border border-rose-300 font-bold text-[11px]">
                                Kelebihan Alokasi: {formatCurrency(Math.abs(diff))}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Summary Sebaran Bulanan Lump Sum */}
                  {(() => {
                    const sumMonths = Object.values(expenseForm.monthly_distribution).reduce((a, b) => a + (parseFloat(b) || 0), 0);
                    const planned = parseFloat(expenseForm.planned_amount || 0);
                    const diff = planned - sumMonths;
                    const isMismatched = planned > 0 && sumMonths !== planned;

                    return (
                      <div className="space-y-2 pt-2 border-t border-slate-100">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                          <div>
                            <div className="text-[10px] uppercase font-bold text-slate-500">Pagu Total Kegiatan</div>
                            <div className="text-xs font-black text-slate-800 mt-0.5">
                              {planned > 0 ? formatCurrency(planned) : 'Rp 0'}
                            </div>
                          </div>
                          <div>
                            <div className="text-[10px] uppercase font-bold text-slate-500">Total Terpetakan (12 Bln)</div>
                            <div className={`text-xs font-black mt-0.5 ${isMismatched ? 'text-rose-600' : 'text-purple-700'}`}>
                              {formatCurrency(sumMonths)}
                            </div>
                          </div>
                          <div>
                            <div className="text-[10px] uppercase font-bold text-slate-500">Selisih</div>
                            <div className={`text-xs font-black mt-0.5 ${diff !== 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                              {formatCurrency(diff)}
                            </div>
                          </div>
                        </div>

                        {isMismatched && (
                          <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 font-semibold flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                            <span>
                              Total alokasi 12 bulan ({formatCurrency(sumMonths)}) harus sama persis dengan Total Pagu Anggaran ({formatCurrency(planned)}).
                            </span>
                          </div>
                        )}

                        <div className="flex items-center justify-between gap-2 pt-1">
                          <span className="text-xs font-bold text-slate-700">Rincian Alokasi Kas per Bulan:</span>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={handleDistributeEvenlyLumpSum}
                              disabled={!expenseForm.planned_amount || expenseForm.planned_amount <= 0}
                              className="px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-lg text-[11px] font-bold transition flex items-center gap-1 disabled:opacity-50"
                            >
                              <Sparkles className="w-3 h-3" /> Bagi Rata 12 Bulan
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const dist = {};
                                MONTHS.forEach(m => { dist[m.key] = 0; });
                                setExpenseForm(prev => ({ ...prev, monthly_distribution: dist }));
                              }}
                              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-[11px] font-semibold transition"
                            >
                              Kosongkan
                            </button>
                          </div>
                        </div>

                        {/* 12 Bulan Input Nominal Grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                          {MONTHS.map((m) => {
                            const val = expenseForm.monthly_distribution[m.key] || 0;
                            return (
                              <div key={m.key} className="bg-slate-50/80 p-2.5 rounded-xl border border-slate-200 space-y-1">
                                <div className="flex items-center justify-between">
                                  <label className="text-[11px] font-bold text-slate-700">{m.label}</label>
                                  <span className="text-[9px] text-slate-400 font-mono">{m.q}</span>
                                </div>
                                <input
                                  type="number"
                                  min="0"
                                  step="any"
                                  value={val === 0 ? '' : val}
                                  onChange={(e) => {
                                    const num = parseFloat(e.target.value || 0);
                                    setExpenseForm(prev => ({
                                      ...prev,
                                      monthly_distribution: {
                                        ...prev.monthly_distribution,
                                        [m.key]: num
                                      }
                                    }));
                                  }}
                                  placeholder="0"
                                  className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-mono font-medium text-center focus:ring-2 focus:ring-purple-500 focus:outline-none"
                                />
                                {val > 0 && (
                                  <div className="text-[9px] font-bold text-purple-700 truncate text-center" title={formatCurrency(val)}>
                                    {Number(val).toLocaleString('id-ID')}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              ) : (
                /* ============================================================== */
                /* KONTEN MODE B: RINCIAN PER ITEM KATALOG (ITEMIZED) */
                /* ============================================================== */
                <div className="space-y-4 animate-in fade-in duration-100">
                  {/* Standar Biaya & Katalog dengan tombol Tambah Cepat */}
                  <div className="bg-indigo-50/50 p-3.5 rounded-2xl border border-indigo-100 space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <label className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                        <Tag className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Pilih dari Standar Biaya &amp; Katalog Plafon</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => setQuickCatalogOpen(!quickCatalogOpen)}
                        className="text-[11px] font-bold text-indigo-700 hover:text-indigo-900 bg-white hover:bg-indigo-50 border border-indigo-200 px-2.5 py-1 rounded-lg transition shadow-2xs flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" />
                        <span>{quickCatalogOpen ? 'Tutup Form Katalog' : '+ Tambah Item Baru ke Katalog'}</span>
                      </button>
                    </div>

                    {/* Inline Quick Add Catalog Form */}
                    {quickCatalogOpen && (
                      <div className="p-3 bg-white rounded-xl border border-indigo-200 shadow-2xs space-y-3 animate-in fade-in duration-100">
                        <div className="text-[11px] font-bold text-indigo-900 border-b border-slate-100 pb-1.5 flex items-center justify-between">
                          <span>Tambah Item Standar Biaya Baru Langsung</span>
                          <span className="text-[10px] text-slate-400 font-normal">Tersimpan permanen ke master katalog</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Nama Barang / Jasa *</label>
                            <input
                              type="text"
                              required
                              value={quickCatalogForm.name}
                              onChange={(e) => setQuickCatalogForm({ ...quickCatalogForm, name: e.target.value })}
                              placeholder="Contoh: Buku Rapor Siswa K13"
                              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Satuan *</label>
                            <input
                              type="text"
                              required
                              value={quickCatalogForm.unit}
                              onChange={(e) => setQuickCatalogForm({ ...quickCatalogForm, unit: e.target.value })}
                              placeholder="Contoh: Buah, Rim, Paket"
                              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Kategori Belanja</label>
                            <SearchableSelect
                              value={quickCatalogForm.expense_category_id}
                              onChange={(val) => setQuickCatalogForm({ ...quickCatalogForm, expense_category_id: val ? Number(val) : '' })}
                              placeholder="-- Pilih Kategori Belanja --"
                              searchPlaceholder="Cari kategori..."
                              options={expenseCategories.map(c => ({
                                value: c.id,
                                label: c.name,
                                sublabel: 'Kategori Belanja'
                              }))}
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Harga Acuan Tertinggi (Rp) *</label>
                            <input
                              type="number"
                              min="0"
                              required
                              value={quickCatalogForm.reference_price}
                              onChange={(e) => setQuickCatalogForm({ ...quickCatalogForm, reference_price: parseFloat(e.target.value || 0) })}
                              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-medium"
                            />
                            {quickCatalogForm.reference_price > 0 && (
                              <span className="text-[10px] font-bold text-purple-700 block mt-0.5">
                                {Number(quickCatalogForm.reference_price).toLocaleString('id-ID')}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                          <button
                            type="button"
                            onClick={() => setQuickCatalogOpen(false)}
                            className="px-2.5 py-1 text-[11px] text-slate-600 hover:bg-slate-100 rounded-lg"
                          >
                            Batal
                          </button>
                          <button
                            type="button"
                            onClick={handleQuickAddCatalogSubmit}
                            disabled={submittingQuickCatalog || !quickCatalogForm.name.trim()}
                            className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[11px] font-bold shadow-2xs disabled:opacity-50"
                          >
                            {submittingQuickCatalog ? 'Menyimpan...' : 'Simpan & Pilih Item'}
                          </button>
                        </div>
                      </div>
                    )}

                    <SearchableSelect
                      value={expenseForm.catalog_item_id}
                      onChange={(val) => handleCatalogSelectInExpense(val)}
                      placeholder="-- Cari & Pilih dari Standar Biaya / Katalog Plafon --"
                      searchPlaceholder="Ketik nama item barang/jasa, satuan, atau kategori..."
                      options={catalogItems.filter(c => c.is_active).map(c => ({
                        value: c.id,
                        label: `${c.name} (${c.unit})`,
                        sublabel: `Plafon Tertinggi: ${formatCurrency(c.reference_price)} ${c.expense_category_name ? `• ${c.expense_category_name}` : ''}`
                      }))}
                    />

                    {expenseForm.catalog_reference_price !== null && (
                      <div className="text-[11px] text-indigo-800 flex items-center justify-between">
                        <span className="flex items-center gap-1">
                          <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                          Harga Acuan Tertinggi: <strong>{formatCurrency(expenseForm.catalog_reference_price)} / {expenseForm.unit}</strong>
                        </span>
                        <span className="text-[10px] text-slate-500">Harga satuan tidak boleh melebihi batas ini</span>
                      </div>
                    )}
                  </div>

                  {/* Nama Item & Satuan */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-slate-700 mb-1">Nama Item Belanja *</label>
                      <input
                        type="text"
                        required
                        value={expenseForm.name}
                        onChange={(e) => setExpenseForm({ ...expenseForm, name: e.target.value })}
                        placeholder="Contoh: Pengadaan Kertas HVS A4"
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Satuan *</label>
                      <input
                        type="text"
                        required
                        value={expenseForm.unit}
                        onChange={(e) => setExpenseForm({ ...expenseForm, unit: e.target.value })}
                        placeholder="Contoh: Rim, Box, Paket"
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
                      />
                    </div>
                  </div>

                  {/* Harga Satuan dengan Validasi Plafon */}
                  {(() => {
                    const isPriceExceeded = expenseForm.catalog_reference_price !== null && parseFloat(expenseForm.unit_price) > parseFloat(expenseForm.catalog_reference_price);
                    return (
                      <div className="space-y-1">
                        <label className="block text-xs font-bold text-slate-700">
                          Harga Satuan (Rp) *
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          required
                          value={expenseForm.unit_price === 0 ? '' : expenseForm.unit_price}
                          onChange={(e) => setExpenseForm({ ...expenseForm, unit_price: parseFloat(e.target.value || 0) })}
                          placeholder="0"
                          className={`w-full px-3.5 py-2.5 bg-slate-50 border rounded-xl text-xs font-mono font-bold focus:outline-none transition ${
                            isPriceExceeded
                              ? 'border-rose-500 bg-rose-50/50 text-rose-800 focus:ring-2 focus:ring-rose-500'
                              : 'border-slate-200 text-slate-800 focus:ring-2 focus:ring-emerald-500'
                          }`}
                        />
                        <div className="flex items-center justify-between">
                          {expenseForm.unit_price > 0 ? (
                            <span className="text-[11px] font-bold text-purple-700">
                              {Number(expenseForm.unit_price).toLocaleString('id-ID')}
                            </span>
                          ) : <span></span>}

                          {isPriceExceeded ? (
                            <span className="text-[11px] font-bold text-rose-600 flex items-center gap-1">
                              <AlertTriangle className="w-3.5 h-3.5" />
                              Melebihi batas tertinggi katalog ({formatCurrency(expenseForm.catalog_reference_price)})!
                            </span>
                          ) : expenseForm.catalog_reference_price !== null ? (
                            <span className="text-[10px] text-emerald-700 font-semibold flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              Sesuai plafon acuan (Maks. {formatCurrency(expenseForm.catalog_reference_price)})
                            </span>
                          ) : null}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Penetapan Quantity / Volume pada Masing-masing Bulan (12 Bulan) */}
                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <span className="text-xs font-bold text-slate-800">Sebaran Quantity / Volume per Bulan:</span>
                        <p className="text-[10px] text-slate-400">Isi 0 jika tidak ada penganggaran pada bulan tertentu</p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            const firstQty = expenseForm.monthly_distribution.m1 || 1;
                            const dist = {};
                            MONTHS.forEach(m => { dist[m.key] = firstQty; });
                            setExpenseForm(prev => ({ ...prev, monthly_distribution: dist }));
                          }}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-semibold transition"
                        >
                          Samakan Semua Bulan
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const dist = {};
                            MONTHS.forEach(m => { dist[m.key] = 0; });
                            setExpenseForm(prev => ({ ...prev, monthly_distribution: dist }));
                          }}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-[11px] font-semibold transition"
                        >
                          Kosongkan
                        </button>
                      </div>
                    </div>

                    {/* 12 Bulan Quantity Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                      {MONTHS.map((m) => {
                        const q = expenseForm.monthly_distribution[m.key] || 0;
                        const subtotal = q * (parseFloat(expenseForm.unit_price) || 0);

                        return (
                          <div key={m.key} className="bg-slate-50/80 p-2.5 rounded-xl border border-slate-200 space-y-1">
                            <div className="flex items-center justify-between">
                              <label className="text-[11px] font-bold text-slate-700">{m.label}</label>
                              <span className="text-[9px] text-slate-400 font-mono">{m.q}</span>
                            </div>
                            <input
                              type="number"
                              min="0"
                              step="any"
                              value={q === 0 ? '' : q}
                              onChange={(e) => {
                                const num = parseFloat(e.target.value || 0);
                                setExpenseForm(prev => ({
                                  ...prev,
                                  monthly_distribution: {
                                    ...prev.monthly_distribution,
                                    [m.key]: num
                                  }
                                }));
                              }}
                              placeholder="0"
                              className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-mono font-bold text-center focus:ring-2 focus:ring-rose-500 focus:outline-none"
                            />
                            <div className="text-[9px] text-slate-500 truncate text-center">
                              {q > 0 ? (
                                <span className="font-semibold text-rose-700">{formatCurrency(subtotal)}</span>
                              ) : (
                                <span className="text-slate-300">-</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Live Plafon & Volume Total Summary */}
                    {(() => {
                      const totalQty = Object.values(expenseForm.monthly_distribution).reduce((a, b) => a + (parseFloat(b) || 0), 0);
                      const totalPlafon = totalQty * (parseFloat(expenseForm.unit_price) || 0);

                      return (
                        <div className="bg-rose-50/70 p-3 rounded-xl border border-rose-200 flex items-center justify-between text-xs">
                          <div>
                            <span className="text-slate-600">Total Akumulasi Volume: </span>
                            <strong className="text-rose-900 font-black">{totalQty} {expenseForm.unit}</strong>
                          </div>
                          <div>
                            <span className="text-slate-600">Total Anggaran Belanja: </span>
                            <strong className="text-sm font-black text-rose-800">
                              {formatCurrency(totalPlafon)}
                            </strong>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setExpenseModalOpen(false)}
                  className="px-3.5 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={
                    submitting ||
                    (expenseForm.entry_mode === 'lump_sum'
                      ? (
                          parseFloat(expenseForm.planned_amount || 0) <= 0 ||
                          !expenseForm.lump_sum_description.trim() ||
                          !expenseForm.budget_program_id ||
                          !expenseForm.fund_sources ||
                          expenseForm.fund_sources.length === 0 ||
                          expenseForm.fund_sources.some(s => !s.income_item_id || parseFloat(s.amount || 0) <= 0) ||
                          Math.abs(expenseForm.fund_sources.reduce((a, b) => a + (parseFloat(b.amount) || 0), 0) - parseFloat(expenseForm.planned_amount || 0)) > 1 ||
                          Object.values(expenseForm.monthly_distribution).reduce((a, b) => a + (parseFloat(b) || 0), 0) !== parseFloat(expenseForm.planned_amount || 0)
                        )
                      : (
                          !expenseForm.name.trim() ||
                          !expenseForm.fund_source_income_item_id ||
                          !expenseForm.budget_program_id ||
                          (expenseForm.catalog_reference_price !== null && parseFloat(expenseForm.unit_price) > parseFloat(expenseForm.catalog_reference_price)) ||
                          Object.values(expenseForm.monthly_distribution).reduce((a, b) => a + (parseFloat(b) || 0), 0) <= 0
                        )
                    )
                  }
                  className={`px-4 py-2 text-white rounded-xl text-xs font-bold shadow-xs transition disabled:opacity-50 ${
                    expenseForm.entry_mode === 'lump_sum'
                      ? 'bg-purple-600 hover:bg-purple-700'
                      : 'bg-emerald-600 hover:bg-emerald-700'
                  }`}
                >
                  {submitting ? 'Menyimpan...' : (expenseForm.entry_mode === 'lump_sum' ? 'Simpan Anggaran Lump Sum' : 'Simpan Rencana Belanja')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Tambah / Edit Standar Biaya Katalog */}
      {catalogModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 border border-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h2 className="text-sm font-bold text-slate-800">
                {catalogModalMode === 'create' ? 'Tambah Item Standar Biaya Baru' : 'Ubah Item Standar Biaya'}
              </h2>
              <button type="button" onClick={() => setCatalogModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSubmitCatalog} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Barang / Jasa *</label>
                <input
                  type="text"
                  required
                  value={catalogFormData.name}
                  onChange={(e) => setCatalogFormData({ ...catalogFormData, name: e.target.value })}
                  placeholder="Contoh: Kertas HVS A4 80gr Sinar Dunia"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Satuan *</label>
                  <input
                    type="text"
                    required
                    value={catalogFormData.unit}
                    onChange={(e) => setCatalogFormData({ ...catalogFormData, unit: e.target.value })}
                    placeholder="Contoh: rim, pcs, kotak"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Harga Acuan Plafon (Rp) *</label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    required
                    value={catalogFormData.reference_price}
                    onChange={(e) => setCatalogFormData({ ...catalogFormData, reference_price: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Jenis Kategori Pengeluaran *</label>
                <select
                  required
                  value={catalogFormData.expense_category_id}
                  onChange={(e) => setCatalogFormData({ ...catalogFormData, expense_category_id: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                >
                  <option value="">-- Pilih Kategori Pengeluaran --</option>
                  {expenseCategories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>
              {catalogModalMode === 'edit' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Catatan / Alasan Perubahan Harga *</label>
                  <input
                    type="text"
                    required
                    value={catalogFormData.reason}
                    onChange={(e) => setCatalogFormData({ ...catalogFormData, reason: e.target.value })}
                    placeholder="Contoh: Penyesuaian harga pasar dari supplier toko kertas"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  />
                </div>
              )}
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button type="button" onClick={() => setCatalogModalOpen(false)} className="px-3 py-1.5 text-xs text-slate-600">Batal</button>
                <button type="submit" disabled={submitting} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold">
                  {submitting ? 'Menyimpan...' : 'Simpan Item Katalog'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Riwayat Perubahan Harga Acuan */}
      {priceHistoryModalOpen && selectedItemHistory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 border border-slate-100 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div>
                <h2 className="text-sm font-bold text-slate-800">Riwayat Perubahan Harga Acuan</h2>
                <p className="text-[11px] text-slate-500">{selectedItemHistory.name} &bull; Satuan: {selectedItemHistory.unit}</p>
              </div>
              <button type="button" onClick={() => setPriceHistoryModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            {priceHistoryLoading ? (
              <div className="flex items-center justify-center py-8 gap-2 text-xs text-slate-400">
                <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                <span>Memuat riwayat harga...</span>
              </div>
            ) : priceHistoryLogs.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-400">Belum ada catatan riwayat harga.</div>
            ) : (
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="px-3.5 py-2.5">Waktu</th>
                      <th className="px-3.5 py-2.5">Harga Lama</th>
                      <th className="px-3.5 py-2.5">Harga Baru</th>
                      <th className="px-3.5 py-2.5">Keterangan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {priceHistoryLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50">
                        <td className="px-3.5 py-2.5 text-slate-500 whitespace-nowrap">{formatDateTime(log.created_at)}</td>
                        <td className="px-3.5 py-2.5 text-slate-600 line-through">{formatCurrency(log.old_price)}</td>
                        <td className="px-3.5 py-2.5 font-bold text-indigo-700">{formatCurrency(log.new_price)}</td>
                        <td className="px-3.5 py-2.5 text-slate-600">{log.reason || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal Kelola / Daftar Dokumen RAPBS */}
      {planDocListModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full p-6 border border-slate-100 max-h-[85vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-emerald-600" />
                <div>
                  <h2 className="text-sm font-bold text-slate-800">Kelola Versi Dokumen RAPBS</h2>
                  <p className="text-[11px] text-slate-400">Pilih atau kelola versi dokumen anggaran sekolah</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPlanDocListModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-semibold text-slate-600">
                Total Tersedia: <strong>{plans.length} Dokumen</strong>
              </span>
              <button
                type="button"
                onClick={() => {
                  setPlanDocListModalOpen(false);
                  setCreateModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Buat Draft Baru</span>
              </button>
            </div>

            <div className="space-y-2.5">
              {plans.length === 0 ? (
                <div className="text-center py-10 text-xs text-slate-400 border-2 border-dashed border-slate-200 rounded-2xl">
                  Belum ada dokumen RAPBS yang dibuat.
                </div>
              ) : (
                plans.map((p) => {
                  const isSelected = selectedPlan?.id === p.id;
                  return (
                    <div
                      key={p.id}
                      className={`p-4 rounded-xl border transition flex items-center justify-between gap-4 ${
                        isSelected
                          ? 'border-emerald-500 bg-emerald-50/50 shadow-xs ring-1 ring-emerald-400'
                          : 'border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold text-slate-800">
                            {p.title || `RAPBS TA #${p.academic_year_id}`}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                              p.status === 'published'
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                : 'bg-amber-100 text-amber-800 border border-amber-200'
                            }`}
                          >
                            {p.status === 'published' ? 'Disahkan (Published)' : 'Draft'}
                          </span>
                          {isSelected && (
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">
                              Sedang Aktif
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-1 flex flex-wrap items-center gap-3">
                          <span>Versi: <strong>{p.version}.0</strong></span>
                          <span>Total Anggaran: <strong className="text-slate-700">{formatCurrency(p.total_planned_expense || 0)}</strong></span>
                          {p.published_at && (
                            <span>Disahkan: {formatDateTime(p.published_at)}</span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            setPlanDocListModalOpen(false);
                            handleOpenEditTitle(p);
                          }}
                          title="Ubah Nama Dokumen"
                          className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            handleSelectPlan(p);
                            setPlanDocListModalOpen(false);
                          }}
                          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition ${
                            isSelected
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                          }`}
                        >
                          {isSelected ? 'Terpilih' : 'Buka Dokumen'}
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Ubah Nama Dokumen RAPBS */}
      {editTitleModalOpen && editPlanTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-emerald-600" />
                <div>
                  <h2 className="text-sm font-bold text-slate-800">Ubah Nama Dokumen RAPBS</h2>
                  <p className="text-[11px] text-slate-400">Versi {editPlanTarget.version}.0 &bull; TA #{editPlanTarget.academic_year_id}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditTitleModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveTitle} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Nama / Judul Dokumen RAPBS
                </label>
                <input
                  type="text"
                  required
                  value={editingTitle}
                  onChange={(e) => setEditingTitle(e.target.value)}
                  placeholder="Contoh: RAPBS Induk TA 2026/2027 (Revisi Final)"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none transition"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Nama ini akan ditampilkan sebagai identitas dokumen pada seluruh laporan anggaran dan audit.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditTitleModalOpen(false)}
                  className="px-3.5 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submittingTitle}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition disabled:opacity-50"
                >
                  {submittingTitle ? 'Menyimpan...' : 'Simpan Nama Dokumen'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
