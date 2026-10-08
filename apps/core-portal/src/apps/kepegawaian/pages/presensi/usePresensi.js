import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../../../shared/store/AuthContext';
import presensiService from './presensiService';

const TODAY_STR = new Date().toISOString().split('T')[0];

export function usePresensi() {
  const { user, activeSchoolUnit, schoolUnits } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  // 1. Sync Active Tab from URL
  const initialTab = searchParams.get('tab') || 'today';
  const [activeTab, setActiveTabState] = useState(initialTab);

  const setActiveTab = useCallback((newTab) => {
    setActiveTabState(newTab);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('tab', newTab);
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  // 2. Filters
  const [dateFrom, setDateFrom] = useState(searchParams.get('date_from') || TODAY_STR);
  const [dateTo, setDateTo] = useState(searchParams.get('date_to') || TODAY_STR);
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '');
  const [sourceFilter, setSourceFilter] = useState(searchParams.get('source') || '');
  const [unitFilter, setUnitFilter] = useState(searchParams.get('unit') || '');
  const [positionFilter, setPositionFilter] = useState(searchParams.get('position') || '');
  const [isAnomalyOnly, setIsAnomalyOnly] = useState(searchParams.get('anomaly') === 'true');

  // Month & Year filter for Monthly Recap tab
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();
  const [rekapMonth, setRekapMonth] = useState(searchParams.get('month') || String(currentMonth));
  const [rekapYear, setRekapYear] = useState(searchParams.get('year') || String(currentYear));

  // 3. Pagination & Data States
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(50);
  const [pagination, setPagination] = useState({ total: 0, page: 1, per_page: 50, total_pages: 1 });

  const [summary, setSummary] = useState({
    total_active: 0,
    present_count: 0,
    late_count: 0,
    permission_sick_count: 0,
    leave_duty_count: 0,
    absent_count: 0,
    not_checked_in_count: 0,
    on_time_percentage: 0
  });

  const [attendances, setAttendances] = useState([]);
  const [absentCandidates, setAbsentCandidates] = useState([]);
  const [anomalies, setAnomalies] = useState([]);
  const [anomalySummary, setAnomalySummary] = useState({
    repeated_late: 0,
    repeated_absent: 0,
    outside_radius: 0,
    fake_gps: 0,
    unusual_device: 0,
    missing_checkout: 0,
    leave_conflict: 0,
    total_active_cases: 0
  });
  const [clarifications, setClarifications] = useState([]);
  const [clarificationCounts, setClarificationCounts] = useState({ all: 0, pending: 0, approved: 0, rejected: 0 });
  const [monthlySummary, setMonthlySummary] = useState({ kpi_totals: {}, items: [] });
  const [monthlyMatrix, setMonthlyMatrix] = useState({ total_days: 30, days_header: [], matrix: [] });
  const [monthlyTrends, setMonthlyTrends] = useState({ summary: {}, items: [] });
  const [employeesMaster, setEmployeesMaster] = useState([]);

  // 4. Status & UI States
  const [loading, setLoading] = useState(true);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // 5. Modals & Drawer States
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [isCorrectModalOpen, setIsCorrectModalOpen] = useState(false);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [isLockModalOpen, setIsLockModalOpen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const [selectedAttendance, setSelectedAttendance] = useState(null);
  const [selectedClarification, setSelectedClarification] = useState(null);
  const [drawerData, setDrawerData] = useState(null);
  const [drawerLoading, setDrawerLoading] = useState(false);

  // Effective school unit ID: active context or global dropdown
  const effectiveSchoolUnitId = useMemo(() => {
    if (activeSchoolUnit && activeSchoolUnit.id !== 'all') {
      return activeSchoolUnit.id;
    }
    return null;
  }, [activeSchoolUnit]);

  const [periodReadiness, setPeriodReadiness] = useState(null);

  // Fetch KPI Summary
  const fetchSummary = useCallback(async () => {
    setSummaryLoading(true);
    try {
      const params = {
        date: dateFrom === dateTo ? dateFrom : TODAY_STR
      };
      if (effectiveSchoolUnitId) params.school_unit_id = effectiveSchoolUnitId;
      const res = await presensiService.getDashboardSummary(params);
      if (res?.success) {
        setSummary(res.data);
      }
    } catch (err) {
      console.error('Error fetching dashboard summary:', err);
    } finally {
      setSummaryLoading(false);
    }
  }, [dateFrom, dateTo, effectiveSchoolUnitId]);

  // Fetch Period Readiness & Lock Lifecycle
  const fetchPeriodReadiness = useCallback(async () => {
    try {
      const params = {
        month: rekapMonth,
        year: rekapYear
      };
      if (effectiveSchoolUnitId) params.school_unit_id = effectiveSchoolUnitId;
      const res = await presensiService.getPeriodReadiness(params);
      if (res?.success) {
        setPeriodReadiness(res.data);
      }
    } catch (err) {
      console.error('Error fetching period readiness:', err);
    }
  }, [rekapMonth, rekapYear, effectiveSchoolUnitId]);

  // Fetch Master Employees for modals & dropdowns
  const fetchEmployeesMaster = useCallback(async () => {
    try {
      const params = {};
      if (effectiveSchoolUnitId) params.school_unit_id = effectiveSchoolUnitId;
      const res = await presensiService.getEmployeesMaster(params);
      if (res?.success) {
        setEmployeesMaster(res.data?.items || []);
      }
    } catch (err) {
      console.error('Error fetching employees master:', err);
    }
  }, [effectiveSchoolUnitId]);

  // Fetch Main Tab Data
  const fetchData = useCallback(async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const baseParams = {
        date_from: dateFrom,
        date_to: dateTo,
        search: searchQuery || undefined,
        status: statusFilter || undefined,
        entry_type: sourceFilter || undefined,
        is_anomaly: isAnomalyOnly ? true : undefined,
        page,
        per_page: perPage
      };
      if (effectiveSchoolUnitId) baseParams.school_unit_id = effectiveSchoolUnitId;

      if (activeTab === 'today') {
        const res = await presensiService.getAttendances(baseParams);
        if (res?.success) {
          const raw = res.data;
          if (Array.isArray(raw)) {
            setAttendances(raw);
            setPagination({ total: raw.length, page: 1, per_page: raw.length || 50, total_pages: 1 });
          } else if (raw && typeof raw === 'object') {
            setAttendances(raw.items || []);
            setPagination(raw.pagination || { total: (raw.items || []).length, page: 1, per_page: perPage, total_pages: 1 });
          }
        }
      } else if (activeTab === 'absent') {
        const res = await presensiService.getAbsentCandidates({
          date: dateFrom,
          school_unit_id: effectiveSchoolUnitId || undefined,
          search: searchQuery || undefined
        });
        if (res?.success) {
          setAbsentCandidates(res.data || []);
        }
      } else if (activeTab === 'anomalies') {
        const res = await presensiService.getAnomalies({
          date_from: dateFrom,
          date_to: dateTo,
          school_unit_id: effectiveSchoolUnitId || undefined,
          search: searchQuery || undefined
        });
        if (res?.success) {
          const raw = res.data;
          setAnomalies(Array.isArray(raw) ? raw : (raw?.items || []));
          if (raw?.summary) {
            setAnomalySummary(raw.summary);
          }
        }
      } else if (activeTab === 'clarifications') {
        const res = await presensiService.getClarifications({
          school_unit_id: effectiveSchoolUnitId || undefined,
          status: 'all',
          search: searchQuery || undefined
        });
        if (res?.success) {
          const raw = res.data;
          setClarifications(Array.isArray(raw) ? raw : (raw?.items || []));
          if (raw?.counts) {
            setClarificationCounts(raw.counts);
          }
        }
      } else if (activeTab === 'monthly') {
        const [sumRes, matRes, trnRes] = await Promise.all([
          presensiService.getMonthlySummary({
            month: rekapMonth,
            year: rekapYear,
            school_unit_id: effectiveSchoolUnitId || undefined,
            search: searchQuery || undefined
          }),
          presensiService.getMonthlyMatrix({
            month: rekapMonth,
            year: rekapYear,
            school_unit_id: effectiveSchoolUnitId || undefined,
            search: searchQuery || undefined
          }),
          presensiService.getMonthlyTrends({
            month: rekapMonth,
            year: rekapYear,
            school_unit_id: effectiveSchoolUnitId || undefined
          })
        ]);
        if (sumRes?.success) setMonthlySummary(sumRes.data || { kpi_totals: {}, items: [] });
        if (matRes?.success) setMonthlyMatrix(matRes.data || { total_days: 30, days_header: [], matrix: [] });
        if (trnRes?.success) setMonthlyTrends(trnRes.data || { summary: {}, items: [] });
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Gagal memuat data presensi');
    } finally {
      setLoading(false);
    }
  }, [activeTab, dateFrom, dateTo, searchQuery, statusFilter, sourceFilter, isAnomalyOnly, effectiveSchoolUnitId, rekapMonth, rekapYear, page, perPage]);

  // Initial and reactive effects
  useEffect(() => {
    fetchSummary();
    fetchEmployeesMaster();
    fetchPeriodReadiness();
  }, [fetchSummary, fetchEmployeesMaster, fetchPeriodReadiness]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Reload data listener from KepegawaianLayout
  useEffect(() => {
    const handleReload = () => {
      fetchSummary();
      fetchData();
      fetchEmployeesMaster();
      fetchPeriodReadiness();
    };
    window.addEventListener('app:reload-data', handleReload);
    return () => window.removeEventListener('app:reload-data', handleReload);
  }, [fetchSummary, fetchData, fetchEmployeesMaster, fetchPeriodReadiness]);

  // Preset Date Range helper
  const applyDatePreset = (preset) => {
    const now = new Date();
    let from = TODAY_STR;
    let to = TODAY_STR;

    if (preset === 'today') {
      from = TODAY_STR;
      to = TODAY_STR;
    } else if (preset === 'yesterday') {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      from = y.toISOString().split('T')[0];
      to = from;
    } else if (preset === 'this_week') {
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Monday
      const monday = new Date(now.setDate(diff));
      from = monday.toISOString().split('T')[0];
      to = TODAY_STR;
    } else if (preset === 'this_month') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      from = firstDay.toISOString().split('T')[0];
      to = TODAY_STR;
    }

    setDateFrom(from);
    setDateTo(to);
  };

  // Reset Filters
  const resetFilters = () => {
    setDateFrom(TODAY_STR);
    setDateTo(TODAY_STR);
    setSearchQuery('');
    setStatusFilter('');
    setSourceFilter('');
    setUnitFilter('');
    setPositionFilter('');
    setIsAnomalyOnly(false);
  };

  // Open Drawer with detailed telemetry
  const openDetailDrawer = async (att) => {
    setIsDrawerOpen(true);
    setDrawerLoading(true);
    setDrawerData(att);
    try {
      const res = await presensiService.getAttendanceDetail(att.id);
      if (res?.success) {
        setDrawerData(res.data);
      }
    } catch (err) {
      console.error('Error fetching attendance detail:', err);
    } finally {
      setDrawerLoading(false);
    }
  };

  // Notification helpers
  const notifySuccess = (msg) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const notifyError = (msg) => {
    setErrorMsg(msg);
    setTimeout(() => setErrorMsg(''), 5000);
  };

  return {
    user,
    activeSchoolUnit,
    schoolUnits,
    effectiveSchoolUnitId,
    activeTab,
    setActiveTab,
    // Filters
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    sourceFilter,
    setSourceFilter,
    unitFilter,
    setUnitFilter,
    positionFilter,
    setPositionFilter,
    isAnomalyOnly,
    setIsAnomalyOnly,
    rekapMonth,
    setRekapMonth,
    rekapYear,
    setRekapYear,
    applyDatePreset,
    resetFilters,
    // Data & Pagination
    summary,
    summaryLoading,
    periodReadiness,
    attendances,
    absentCandidates,
    anomalies,
    anomalySummary,
    setAnomalySummary,
    clarifications,
    setClarifications,
    clarificationCounts,
    setClarificationCounts,
    monthlySummary,
    monthlyMatrix,
    monthlyTrends,
    employeesMaster,
    pagination,
    page,
    setPage,
    perPage,
    setPerPage,
    loading,
    submitting,
    setSubmitting,
    errorMsg,
    successMsg,
    notifySuccess,
    notifyError,
    // Modals
    isManualModalOpen,
    setIsManualModalOpen,
    isCorrectModalOpen,
    setIsCorrectModalOpen,
    isReviewModalOpen,
    setIsReviewModalOpen,
    isLockModalOpen,
    setIsLockModalOpen,
    isDrawerOpen,
    setIsDrawerOpen,
    selectedAttendance,
    setSelectedAttendance,
    selectedClarification,
    setSelectedClarification,
    drawerData,
    drawerLoading,
    openDetailDrawer,
    // Refetch triggers
    fetchData,
    fetchSummary,
    fetchPeriodReadiness
  };
}

export default usePresensi;
