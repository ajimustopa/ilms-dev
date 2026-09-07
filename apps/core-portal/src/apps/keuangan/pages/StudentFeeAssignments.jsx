import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../shared/store/AuthContext';
import api from '../../../shared/services/api';
import SearchableSelect from '../../../shared/components/SearchableSelect';
import {
  UserCheck,
  Users,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  RotateCw,
  Plus,
  Edit3,
  Sliders,
  History,
  X,
  Loader2,
  CheckSquare,
  Square,
  Layers,
  Sparkles,
  Info,
  Building2,
  School,
  GraduationCap,
  Calendar,
  ArrowUpDown,
  ArrowUp,
  ArrowDown
} from 'lucide-react';

export default function StudentFeeAssignments() {
  const { activeSchoolUnit } = useAuth();
  const [academicYears, setAcademicYears] = useState([]);
  const [selectedYearId, setSelectedYearId] = useState(() => {
    try {
      const saved = localStorage.getItem('keuangan_fee_assignments_selected_ay') || localStorage.getItem('keuangan_fee_schemes_selected_ay');
      return saved || '';
    } catch {
      return '';
    }
  });
  const [students, setStudents] = useState([]);
  const [schemes, setSchemes] = useState([]);
  const [feeTypes, setFeeTypes] = useState([]);
  const [classes, setClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedSchemeFilter, setSelectedSchemeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'assigned' | 'custom' | 'unassigned'
  const [registrationTypeFilter, setRegistrationTypeFilter] = useState('all'); // 'all' | 'siswa_baru' | 'pindahan'
  const [searchQuery, setSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'student_name', direction: 'asc' });
  const [loading, setLoading] = useState(false);
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);

  // Modal State: Single Assign
  const [singleAssignModalOpen, setSingleAssignModalOpen] = useState(false);
  const [targetStudent, setTargetStudent] = useState(null);
  const [selectedSchemeId, setSelectedSchemeId] = useState('');
  const [assignReason, setAssignReason] = useState('');
  const [submittingSingle, setSubmittingSingle] = useState(false);

  // Modal State: Bulk Assign
  const [bulkAssignModalOpen, setBulkAssignModalOpen] = useState(false);
  const [bulkSchemeId, setBulkSchemeId] = useState('');
  const [bulkReason, setBulkReason] = useState('');
  const [submittingBulk, setSubmittingBulk] = useState(false);

  // Modal State: Custom Adjustment
  const [customModalOpen, setCustomModalOpen] = useState(false);
  const [customStudent, setCustomStudent] = useState(null);
  const [customItems, setCustomItems] = useState([]);
  const [customReason, setCustomReason] = useState('');
  const [submittingCustom, setSubmittingCustom] = useState(false);

  // Modal State: History Audit
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [historyStudent, setHistoryStudent] = useState(null);
  const [historyLogs, setHistoryLogs] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const isYayasan = !activeSchoolUnit || activeSchoolUnit.id === 'all' || activeSchoolUnit.is_foundation || activeSchoolUnit.id === null;

  // Persist selectedYearId to localStorage
  useEffect(() => {
    if (selectedYearId) {
      try {
        localStorage.setItem('keuangan_fee_assignments_selected_ay', String(selectedYearId));
      } catch (e) {
        console.warn(e);
      }
    }
  }, [selectedYearId]);

  useEffect(() => {
    fetchInitialMeta();
  }, [activeSchoolUnit]);

  useEffect(() => {
    if (selectedYearId) {
      fetchYearScopedMeta();
    }
  }, [activeSchoolUnit, selectedYearId]);

  useEffect(() => {
    if (selectedYearId) {
      fetchStudentAssignments();
    }
  }, [activeSchoolUnit, selectedYearId, selectedClassId, selectedSchemeFilter, registrationTypeFilter]);

  const fetchInitialMeta = async () => {
    try {
      // 1. Ambil Tahun Ajaran dari modul akademik
      let yearsList = [];
      try {
        const ayParams = {};
        if (activeSchoolUnit && activeSchoolUnit.id && activeSchoolUnit.id !== 'all' && !activeSchoolUnit.is_foundation) {
          ayParams.satuan_pendidikan_id = activeSchoolUnit.id;
        }
        const ayRes = await api.get('/akademik/academic-years', { params: ayParams });
        yearsList = ayRes.data?.data || ayRes.data?.academic_years || (Array.isArray(ayRes.data) ? ayRes.data : []);
      } catch (e) {
        console.error('Error fetching academic years:', e);
      }

      if (yearsList.length === 0) {
        try {
          const fallbackRes = await api.get('/keuangan/academic-years').catch(() => api.get('/keuangan/master-data/academic-years'));
          yearsList = fallbackRes?.data?.data || [];
        } catch (e) {
          console.warn('Fallback AY error:', e);
        }
      }

      // Deduplikasi berdasarkan nama dan sort descending
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
      yearsList = Array.from(uniqueYearsMap.values());
      yearsList.sort((a, b) => (b.name || '').localeCompare(a.name || ''));

      if (yearsList.length === 0) {
        yearsList = [
          { id: 2, name: '2026/2027', is_active: 1 },
          { id: 1, name: '2025/2026', is_active: 0 },
          { id: 3, name: '2024/2025', is_active: 0 }
        ];
      }
      setAcademicYears(yearsList);

      const savedY = localStorage.getItem('keuangan_fee_assignments_selected_ay') || localStorage.getItem('keuangan_fee_schemes_selected_ay');
      const matchedCurrent = yearsList.find(y => String(y.id) === String(selectedYearId));
      const matchedSaved = yearsList.find(y => String(y.id) === String(savedY));

      let targetYearId = '';
      if (matchedCurrent) {
        targetYearId = String(matchedCurrent.id);
      } else if (matchedSaved) {
        targetYearId = String(matchedSaved.id);
      } else {
        const activeY = yearsList.find(y => y.is_active) || yearsList[0];
        if (activeY) {
          targetYearId = String(activeY.id);
        }
      }

      if (targetYearId && String(targetYearId) !== String(selectedYearId)) {
        setSelectedYearId(String(targetYearId));
      }

      // 2. Ambil Pos Biaya (Fee Types) dan urutkan: Tunggakan Tahun Lalu -> Sekali Bayar -> Tahunan -> Bulanan
      const feeTypesRes = await api.get('/keuangan/fee-types');
      const rawFeeTypes = feeTypesRes.data?.data || [];
      const sortedFeeTypes = [...rawFeeTypes].sort((a, b) => {
        const isArrear = (ft) => {
          const code = (ft.code || '').toLowerCase();
          const name = (ft.name || '').toLowerCase();
          return code === 'arrears_previous_year' || name.includes('tunggakan');
        };

        const getRank = (ft) => {
          if (isArrear(ft)) return 0; // Tunggakan tahun lalu di posisi paling awal (Rank 0)
          const bp = (ft.billing_pattern || '').toLowerCase();
          const name = (ft.name || '').toLowerCase();
          if (bp === 'monthly' || name.includes('spp')) return 3;
          if (bp === 'yearly' || name.includes('tahunan') || name.includes('daftar ulang')) return 2;
          return 1; // Sekali bayar / incidental / one_time
        };
        const rankDiff = getRank(a) - getRank(b);
        if (rankDiff !== 0) return rankDiff;
        return Number(a.id || 0) - Number(b.id || 0);
      });
      setFeeTypes(sortedFeeTypes);
    } catch (err) {
      console.error('Error fetching initial meta:', err);
    }
  };

  const fetchYearScopedMeta = async () => {
    try {
      const params = {};
      if (activeSchoolUnit && activeSchoolUnit.id && activeSchoolUnit.id !== 'all' && !activeSchoolUnit.is_foundation) {
        params.satuan_pendidikan_id = activeSchoolUnit.id;
      }
      if (selectedYearId && selectedYearId !== 'all') {
        params.academic_year_id = selectedYearId;
      }

      // 1. Ambil Skema Biaya per Tahun Ajaran
      const schemesRes = await api.get('/keuangan/fee-schemes', { params });
      setSchemes(schemesRes.data?.data || []);

      // 2. Ambil Daftar Rombel / Kelas Reguler per Tahun Ajaran
      try {
        const classesRes = await api.get('/akademik/class-groups', { params: { ...params, type: 'reguler' } });
        setClasses(classesRes.data?.data || []);
      } catch (e) {
        try {
          const altClassesRes = await api.get('/akademik/classes', { params: { ...params, type: 'reguler' } });
          setClasses(altClassesRes.data?.data || []);
        } catch (err2) {
          // Fallback
        }
      }
    } catch (err) {
      console.error('Error fetching year scoped meta:', err);
    }
  };

  const fetchStudentAssignments = async () => {
    setLoading(true);
    setSelectedStudentIds([]);
    try {
      const res = await api.get('/keuangan/student-fee-assignments', {
        params: {
          academic_year_id: selectedYearId || undefined,
          class_id: selectedClassId || undefined,
          fee_scheme_id: selectedSchemeFilter || undefined,
          registration_type: registrationTypeFilter !== 'all' ? registrationTypeFilter : undefined
        }
      });
      setStudents(res.data?.data || []);
    } catch (err) {
      console.error('Error fetching assignments:', err);
    } finally {
      setLoading(false);
    }
  };

  // Selection Handlers
  const handleSelectAll = () => {
    if (selectedStudentIds.length === sortedAndFilteredStudents.length) {
      setSelectedStudentIds([]);
    } else {
      setSelectedStudentIds(sortedAndFilteredStudents.map(s => s.student_id));
    }
  };

  const handleToggleSelect = (studentId) => {
    if (selectedStudentIds.includes(studentId)) {
      setSelectedStudentIds(selectedStudentIds.filter(id => id !== studentId));
    } else {
      setSelectedStudentIds([...selectedStudentIds, studentId]);
    }
  };

  // Sorting Handler
  const handleSort = (key) => {
    setSortConfig((prev) => {
      if (prev.key === key) {
        return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { key, direction: 'asc' };
    });
  };

  // Open Single Assign
  const openSingleAssign = (student) => {
    setTargetStudent(student);
    setSelectedSchemeId(student.assignment?.fee_scheme_id || (schemes[0]?.id || ''));
    setAssignReason(student.assignment?.id ? '' : 'Penetapan awal skema biaya santri');
    setSingleAssignModalOpen(true);
  };

  const handleSaveSingleAssign = async (e) => {
    e.preventDefault();
    if (!selectedSchemeId) {
      alert('Silakan pilih skema biaya');
      return;
    }
    if (targetStudent.assignment?.id && !assignReason) {
      alert('Alasan perubahan wajib diisi untuk audit trail');
      return;
    }

    setSubmittingSingle(true);
    try {
      await api.post('/keuangan/student-fee-assignments', {
        student_id: targetStudent.student_id,
        fee_scheme_id: selectedSchemeId,
        academic_year_id: Number(selectedYearId) || 1,
        reason: assignReason
      });
      alert(`Berhasil menetapkan skema biaya untuk ${targetStudent.student_name}`);
      setSingleAssignModalOpen(false);
      fetchStudentAssignments();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menyimpan penetapan biaya');
    } finally {
      setSubmittingSingle(false);
    }
  };

  // Open Bulk Assign
  const openBulkAssign = () => {
    if (selectedStudentIds.length === 0) {
      alert('Pilih minimal satu santri untuk penetapan massal');
      return;
    }
    setBulkSchemeId(schemes[0]?.id || '');
    setBulkReason('');
    setBulkAssignModalOpen(true);
  };

  const handleSaveBulkAssign = async (e) => {
    e.preventDefault();
    if (!bulkSchemeId) {
      alert('Silakan pilih skema biaya');
      return;
    }
    if (!bulkReason) {
      alert('Alasan penetapan massal wajib diisi untuk audit trail');
      return;
    }

    setSubmittingBulk(true);
    try {
      await api.post('/keuangan/student-fee-assignments/bulk', {
        student_ids: selectedStudentIds,
        fee_scheme_id: bulkSchemeId,
        academic_year_id: Number(selectedYearId) || 1,
        reason: bulkReason
      });
      alert(`Berhasil menetapkan skema ke ${selectedStudentIds.length} santri`);
      setBulkAssignModalOpen(false);
      setSelectedStudentIds([]);
      fetchStudentAssignments();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menetapkan skema massal');
    } finally {
      setSubmittingBulk(false);
    }
  };

  // Open Custom / Manual Input Adjustment (Langsung Nominal Angka)
  const openCustomModal = (student) => {
    setCustomStudent(student);
    setCustomReason('');

    // Ambil data breakdown yang sudah pernah ada (baik dari skema maupun manual)
    const breakdown = student.assignment?.fee_breakdown || {};
    const currentAdjustments = {};
    student.custom_adjustments?.forEach(ca => {
      currentAdjustments[ca.fee_type_id] = ca;
    });

    const items = feeTypes.map(ft => {
      const existingAdj = currentAdjustments[ft.id];
      const existingBreakdown = breakdown[ft.id];
      const isArrears = ft.code === 'arrears_previous_year' || String(ft.name).toLowerCase().includes('tunggakan') || ft.id === 11;
      const autoArrearsAmt = (existingBreakdown?.is_auto_arrears ? existingBreakdown?.final_amount : 0) || 0;

      // Tentukan nilai awal:
      // 1. Jika ada override_amount eksplisit di penyesuaian khusus, pakai itu
      // 2. Jika pos biasa (bukan tunggakan) dan ada di fee_breakdown, pakai itu
      // 3. Jika pos tunggakan dan belum pernah di-override manual, biarkan '' (kosong) agar tetap otomatis dari sistem
      let initialAmount = '';
      if (existingAdj && existingAdj.override_amount !== null && existingAdj.override_amount !== undefined) {
        initialAmount = existingAdj.override_amount;
      } else if (existingBreakdown && existingBreakdown.final_amount !== undefined && existingBreakdown.final_amount !== null && !isArrears) {
        initialAmount = existingBreakdown.final_amount;
      }

      return {
        fee_type_id: ft.id,
        fee_type_name: ft.name,
        fee_type_code: ft.code,
        adjustment_kind: 'override_amount',
        override_amount: initialAmount,
        is_arrears: isArrears,
        auto_arrears: autoArrearsAmt,
        reason: existingAdj?.reason || ''
      };
    });

    setCustomItems(items);
    setCustomModalOpen(true);
  };

  const handleCustomItemChange = (index, field, val) => {
    const next = [...customItems];
    next[index][field] = val;
    setCustomItems(next);
  };

  const handleSaveCustomAssign = async (e) => {
    e.preventDefault();
    if (!customReason) {
      alert('Alasan penetapan biaya khusus wajib diisi untuk audit trail');
      return;
    }

    setSubmittingCustom(true);
    try {
      await api.post('/keuangan/student-fee-assignments/custom', {
        student_id: customStudent.student_id,
        academic_year_id: Number(selectedYearId) || 1,
        reason: customReason,
        custom_items: customItems
      });
      alert(`Berhasil mengatur biaya khusus untuk ${customStudent.student_name}`);
      setCustomModalOpen(false);
      fetchStudentAssignments();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal mengatur biaya khusus');
    } finally {
      setSubmittingCustom(false);
    }
  };

  // Open History Audit
  const openHistoryModal = async (student) => {
    setHistoryStudent(student);
    setHistoryModalOpen(true);
    setHistoryLoading(true);
    setHistoryLogs([]);

    try {
      const res = await api.get('/keuangan/finance-audit-logs', {
        params: {
          entity_type: 'student_fee_scheme_assignment',
          entity_id: student.assignment?.id || undefined
        }
      });
      setHistoryLogs(res.data?.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setHistoryLoading(false);
    }
  };

  // Filtering
  const filteredStudents = students.filter(st => {
    const matchSearch =
      st.student_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      st.nis?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      st.nisn?.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchSearch) return false;

    if (registrationTypeFilter && registrationTypeFilter !== 'all') {
      const isTransfer = st.registration_type === 'pindahan' || st.entry_type === 'pindahan' || String(st.registration_type_display || '').toLowerCase().includes('pindah');
      if (registrationTypeFilter === 'pindahan' && !isTransfer) return false;
      if (registrationTypeFilter === 'siswa_baru' && isTransfer) return false;
    }

    if (statusFilter === 'assigned') {
      return st.assignment?.fee_scheme_id && !st.assignment?.is_custom;
    }
    if (statusFilter === 'custom') {
      return st.assignment?.is_custom;
    }
    if (statusFilter === 'unassigned') {
      return !st.assignment?.id;
    }

    return true;
  });

  // Format currency helper
  const formatRupiah = (val) => {
    if (val === null || val === undefined || val === '') return 'Rp 0';
    return `Rp ${Number(val).toLocaleString('id-ID')}`;
  };

  // Sorting
  const sortedAndFilteredStudents = [...filteredStudents].sort((a, b) => {
    let valA = '';
    let valB = '';

    if (sortConfig.key === 'student_name') {
      valA = a.student_name || '';
      valB = b.student_name || '';
    } else if (sortConfig.key === 'nis') {
      valA = a.nis || '';
      valB = b.nis || '';
    } else if (sortConfig.key === 'class_name') {
      valA = a.class_name || '';
      valB = b.class_name || '';
    } else if (sortConfig.key === 'scheme_name') {
      valA = a.assignment?.scheme_name || (a.assignment?.is_custom ? 'ZZ_Custom' : 'ZZ_Belum');
      valB = b.assignment?.scheme_name || (b.assignment?.is_custom ? 'ZZ_Custom' : 'ZZ_Belum');
    } else if (sortConfig.key === 'total_amount') {
      valA = Number(a.assignment?.total_amount || 0);
      valB = Number(b.assignment?.total_amount || 0);
      return sortConfig.direction === 'asc' ? valA - valB : valB - valA;
    } else if (sortConfig.key === 'status') {
      const getStatusRank = (st) => {
        if (st.assignment?.is_custom) return 2;
        if (st.assignment?.id) return 1;
        return 3;
      };
      valA = getStatusRank(a);
      valB = getStatusRank(b);
      return sortConfig.direction === 'asc' ? valA - valB : valB - valA;
    } else if (sortConfig.key.startsWith('fee_type_')) {
      const ftId = sortConfig.key.replace('fee_type_', '');
      valA = Number(a.assignment?.fee_breakdown?.[ftId]?.final_amount || 0);
      valB = Number(b.assignment?.fee_breakdown?.[ftId]?.final_amount || 0);
      return sortConfig.direction === 'asc' ? valA - valB : valB - valA;
    }

    const cmp = String(valA).localeCompare(String(valB), undefined, { numeric: true, sensitivity: 'base' });
    return sortConfig.direction === 'asc' ? cmp : -cmp;
  });

  // Stats calculation
  const totalStudents = students.length;
  const assignedStandardCount = students.filter(s => s.assignment?.fee_scheme_id && !s.assignment?.is_custom).length;
  const assignedCustomCount = students.filter(s => s.assignment?.is_custom).length;
  const unassignedCount = students.filter(s => !s.assignment?.id).length;

  const currentYearObj = academicYears.find(y => String(y.id) === String(selectedYearId));
  const selectedSchemeObj = schemes.find(s => String(s.id) === String(selectedSchemeId));
  const bulkSchemeObj = schemes.find(s => String(s.id) === String(bulkSchemeId));

  return (
    <div className="space-y-6">
      {/* Header & Stats Cards */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                <UserCheck className="w-5 h-5" />
              </div>
              <h1 className="text-xl font-bold text-slate-800">Penetapan Biaya Siswa</h1>
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
              <span className="inline-flex items-center gap-1 text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 rounded-full text-[11px] font-bold">
                <Calendar className="w-3 h-3 text-indigo-600" />
                {currentYearObj ? `T.A. ${currentYearObj.name} ${currentYearObj.is_active ? '(Aktif)' : ''}` : 'Pilih T.A.'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Langkah awal alur keuangan: Tetapkan skema tarif biaya per santri (perorangan) maupun serentak (massal per kelas/rombongan) dengan rincian nominal per pos tagihan.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={fetchStudentAssignments}
              title="Sinkronkan Data"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl text-xs font-semibold transition"
            >
              <RotateCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Muat Ulang
            </button>
            <button
              type="button"
              onClick={openBulkAssign}
              disabled={selectedStudentIds.length === 0}
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-xl text-xs font-semibold shadow-sm transition"
            >
              <Layers className="w-4 h-4" />
              Tetapkan Massal ({selectedStudentIds.length} Santri)
            </button>
          </div>
        </div>

        {/* 4 Stat Mini Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-4 border-t border-slate-100">
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
            <span className="text-[10px] font-semibold text-slate-500 uppercase">Total Santri T.A. Ini</span>
            <p className="text-lg font-bold text-slate-800 mt-0.5">{totalStudents}</p>
          </div>
          <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3">
            <span className="text-[10px] font-semibold text-emerald-700 uppercase">Skema Standar</span>
            <p className="text-lg font-bold text-emerald-800 mt-0.5">{assignedStandardCount}</p>
          </div>
          <div className="bg-purple-50/70 border border-purple-200 rounded-xl p-3">
            <span className="text-[10px] font-semibold text-purple-700 uppercase">Khusus / Custom</span>
            <p className="text-lg font-bold text-purple-800 mt-0.5">{assignedCustomCount}</p>
          </div>
          <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3">
            <span className="text-[10px] font-semibold text-amber-700 uppercase">Belum Ditetapkan</span>
            <p className="text-lg font-bold text-amber-800 mt-0.5">{unassignedCount}</p>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="mt-5 flex flex-col md:flex-row items-stretch md:items-center gap-3 pt-4 border-t border-slate-100">
          {/* Selector Context Tahun Ajaran */}
          <div className="w-full md:w-64">
            <SearchableSelect
              options={academicYears.map((ay) => ({
                value: String(ay.id),
                label: `T.A. ${ay.name} ${ay.is_active ? '(Aktif)' : ''}`,
                sublabel: ay.is_active ? 'Tahun Ajaran Berjalan' : undefined
              }))}
              value={String(selectedYearId || '')}
              onChange={(val) => {
                if (val) {
                  setSelectedYearId(String(val));
                  setSelectedClassId('');
                  setSelectedSchemeFilter('');
                  setSelectedStudentIds([]);
                }
              }}
              allowClear={false}
              placeholder="Pilih Tahun Ajaran..."
              searchPlaceholder="Cari tahun ajaran..."
            />
          </div>

          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari santri berdasarkan Nama atau NIS..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none transition"
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto flex-wrap">
            {/* Filter Rombel */}
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700"
            >
              <option value="">Semua Rombel / Kelas</option>
              {classes.map(c => (
                <option key={c.id} value={c.id}>{c.name || `Kelas ${c.id}`}</option>
              ))}
            </select>

            {/* Filter Skema */}
            <select
              value={selectedSchemeFilter}
              onChange={(e) => setSelectedSchemeFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700"
            >
              <option value="">Semua Skema Biaya</option>
              {schemes.map(s => (
                <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
              ))}
            </select>

            {/* Filter Jenis Pendaftaran (Siswa Baru / Siswa Pindahan) */}
            <select
              value={registrationTypeFilter}
              onChange={(e) => setRegistrationTypeFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700"
            >
              <option value="all">Semua Jenis Pendaftaran</option>
              <option value="siswa_baru">Siswa Baru</option>
              <option value="pindahan">Siswa Pindahan</option>
            </select>

            {/* Filter Status */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700"
            >
              <option value="all">Semua Status</option>
              <option value="assigned">Skema Standar</option>
              <option value="custom">Khusus (Custom)</option>
              <option value="unassigned">Belum Ditetapkan</option>
            </select>
          </div>
        </div>
      </div>

      {/* Student List Table with Breakdown Columns */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="py-16 text-center text-slate-400 flex flex-col items-center gap-2">
            <Loader2 className="w-7 h-7 animate-spin text-emerald-600" />
            <span className="text-xs">Memuat daftar penetapan santri &amp; rincian tarif...</span>
          </div>
        ) : sortedAndFilteredStudents.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <Users className="w-10 h-10 mx-auto mb-2 text-slate-300" />
            <p className="text-sm font-semibold text-slate-600">Tidak Ada Data Santri</p>
            <p className="text-xs text-slate-400 mt-1">Coba sesuaikan kata kunci pencarian atau filter rombel/skema.</p>
          </div>
        ) : (
          <div className="overflow-x-auto max-h-[calc(100vh-320px)] min-h-[400px] overflow-y-auto relative border border-slate-200/80 rounded-b-2xl">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200 select-none sticky top-0 z-30 shadow-xs">
                <tr>
                  {/* Checkbox Column */}
                  <th className="px-3 py-3 w-10 text-center sticky left-0 bg-slate-50 z-20 shadow-[1px_0_0_0_#e2e8f0]">
                    <button
                      type="button"
                      onClick={handleSelectAll}
                      className="p-1 hover:text-emerald-700"
                      title="Pilih Semua"
                    >
                      {selectedStudentIds.length > 0 && selectedStudentIds.length === sortedAndFilteredStudents.length ? (
                        <CheckSquare className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-400" />
                      )}
                    </button>
                  </th>

                  {/* Student Info */}
                  <th
                    onClick={() => handleSort('student_name')}
                    className="px-4 py-3 min-w-[200px] cursor-pointer hover:bg-slate-100 transition group sticky left-10 bg-slate-50 z-20 shadow-[1px_0_0_0_#e2e8f0]"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Santri (NIS / Nama)</span>
                      {sortConfig.key === 'student_name' ? (
                        sortConfig.direction === 'asc' ? (
                          <ArrowUp className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <ArrowDown className="w-3.5 h-3.5 text-emerald-600" />
                        )
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-40 group-hover:opacity-100" />
                      )}
                    </div>
                  </th>

                  {/* Rombel / Kelas */}
                  <th
                    onClick={() => handleSort('class_name')}
                    className="px-3.5 py-3 min-w-[130px] cursor-pointer hover:bg-slate-100 transition group"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Rombel</span>
                      {sortConfig.key === 'class_name' ? (
                        sortConfig.direction === 'asc' ? (
                          <ArrowUp className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <ArrowDown className="w-3.5 h-3.5 text-emerald-600" />
                        )
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-40 group-hover:opacity-100" />
                      )}
                    </div>
                  </th>

                  {/* Scheme Status */}
                  <th
                    onClick={() => handleSort('scheme_name')}
                    className="px-4 py-3 min-w-[160px] cursor-pointer hover:bg-slate-100 transition group"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Skema Biaya</span>
                      {sortConfig.key === 'scheme_name' ? (
                        sortConfig.direction === 'asc' ? (
                          <ArrowUp className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <ArrowDown className="w-3.5 h-3.5 text-emerald-600" />
                        )
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-40 group-hover:opacity-100" />
                      )}
                    </div>
                  </th>

                  {/* Dynamic Fee Type Columns (Tunggakan di awal dengan warna khusus) */}
                  {feeTypes.map((ft) => {
                    const isArrears = (ft.code || '').toLowerCase() === 'arrears_previous_year' || (ft.name || '').toLowerCase().includes('tunggakan');

                    return (
                      <th
                        key={ft.id}
                        onClick={() => handleSort(`fee_type_${ft.id}`)}
                        className={`px-3 py-3 text-right min-w-[125px] cursor-pointer transition group select-none ${
                          isArrears
                            ? 'bg-amber-100/90 hover:bg-amber-200/90 text-amber-950 font-bold border-x border-amber-300 shadow-2xs'
                            : 'bg-slate-50/50 hover:bg-slate-100 text-slate-700 font-semibold'
                        }`}
                        title={isArrears ? `Pos Biaya Khusus Tunggakan: ${ft.name}` : `Pos Biaya: ${ft.name}`}
                      >
                        <div className="flex items-center justify-end gap-1">
                          {isArrears && (
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-600 animate-pulse mr-0.5" />
                          )}
                          <span className={`truncate max-w-[120px] ${isArrears ? 'text-amber-950 font-bold' : ''}`}>
                            {isArrears ? 'Tunggakan T.A. Lalu' : ft.name}
                          </span>
                          {sortConfig.key === `fee_type_${ft.id}` ? (
                            sortConfig.direction === 'asc' ? (
                              <ArrowUp className={`w-3 h-3 ${isArrears ? 'text-amber-800' : 'text-emerald-600'}`} />
                            ) : (
                              <ArrowDown className={`w-3 h-3 ${isArrears ? 'text-amber-800' : 'text-emerald-600'}`} />
                            )
                          ) : (
                            <ArrowUpDown className={`w-2.5 h-2.5 opacity-0 group-hover:opacity-100 ${isArrears ? 'text-amber-700' : 'text-slate-300'}`} />
                          )}
                        </div>
                      </th>
                    );
                  })}

                  {/* Total Biaya + Aksi Penetapan (Selalu di Paling Kanan, Solid BG) */}
                  <th
                    onClick={() => handleSort('total_amount')}
                    className="px-4 py-3 text-right min-w-[260px] sticky right-0 bg-emerald-50 z-20 shadow-[-1px_0_0_0_#e2e8f0] font-bold text-emerald-950 cursor-pointer hover:bg-emerald-100 transition group"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <span>Total Biaya</span>
                        {sortConfig.key === 'total_amount' ? (
                          sortConfig.direction === 'asc' ? (
                            <ArrowUp className="w-3.5 h-3.5 text-emerald-700" />
                          ) : (
                            <ArrowDown className="w-3.5 h-3.5 text-emerald-700" />
                          )
                        ) : (
                          <ArrowUpDown className="w-3 h-3 text-emerald-600/40 group-hover:opacity-100" />
                        )}
                      </div>
                      <span className="text-[10px] font-medium text-emerald-800 uppercase tracking-wider">Aksi</span>
                    </div>
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {sortedAndFilteredStudents.map((st) => {
                  const isSelected = selectedStudentIds.includes(st.student_id);
                  const asg = st.assignment;
                  const isAssigned = Boolean(asg?.id);
                  const isCustom = Boolean(asg?.is_custom);
                  const breakdown = asg?.fee_breakdown || {};

                  // Calculate monthly and non-monthly totals
                  let stMonthly = 0;
                  let stNonMonthly = 0;
                  feeTypes.forEach((ft) => {
                    const item = breakdown[ft.id];
                    const amount = Number(item?.final_amount || 0);
                    const isMonthly = ft.billing_pattern === 'monthly' || String(ft.name).toLowerCase().includes('spp') || String(ft.code || '').toLowerCase().includes('spp');
                    if (isMonthly) {
                      stMonthly += amount;
                    } else {
                      stNonMonthly += amount;
                    }
                  });

                  // Determine Siswa Baru vs Siswa Pindahan (Synchronized with Akademik Module)
                  const isTransfer = st.registration_type === 'pindahan' || st.entry_type === 'pindahan' || String(st.registration_type_display || '').toLowerCase().includes('pindah');

                  return (
                    <tr
                      key={st.student_id}
                      className={`hover:bg-slate-50 transition ${isSelected ? 'bg-emerald-50' : ''}`}
                    >
                      {/* Checkbox Column (Solid BG) */}
                      <td className={`px-3 py-2.5 text-center sticky left-0 z-10 shadow-[1px_0_0_0_#e2e8f0] ${isSelected ? 'bg-emerald-100' : 'bg-white'}`}>
                        <button
                          type="button"
                          onClick={() => handleToggleSelect(st.student_id)}
                          className="p-1"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-emerald-600" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-300 hover:text-slate-400" />
                          )}
                        </button>
                      </td>

                      {/* Student Info with "Siswa Baru" / "Siswa Pindahan" (Solid BG) */}
                      <td className={`px-4 py-2.5 sticky left-10 z-10 shadow-[1px_0_0_0_#e2e8f0] ${isSelected ? 'bg-emerald-100' : 'bg-white'}`}>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-semibold text-slate-800">{st.student_name}</span>
                          <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-bold ${
                            isTransfer
                              ? 'bg-amber-100 text-amber-800 border border-amber-200'
                              : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          }`}>
                            {isTransfer ? 'Siswa Pindahan' : 'Siswa Baru'}
                          </span>
                        </div>
                        <div className="text-[11px] font-mono text-slate-400 flex items-center gap-2 mt-0.5">
                          <span>NIS: {st.nis || '-'}</span>
                          {st.nisn && <span className="text-slate-300">/ {st.nisn}</span>}
                        </div>
                      </td>

                      {/* Rombel / Kelas Dedicated Column */}
                      <td className="px-3.5 py-2.5">
                        {st.class_name ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                            {st.class_name}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">Tanpa Rombel</span>
                        )}
                      </td>

                      {/* Scheme Column */}
                      <td className="px-4 py-2.5">
                        {isCustom ? (
                          <div className="flex flex-col">
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded w-max">
                              <Sparkles className="w-2.5 h-2.5" /> Khusus (Custom)
                            </span>
                            <span className="text-[10px] text-slate-400 mt-0.5">
                              {st.custom_adjustments?.length || 0} penyesuaian khusus
                            </span>
                          </div>
                        ) : isAssigned ? (
                          <div>
                            <span className="font-semibold text-slate-800">{asg.scheme_name}</span>
                            <span className="ml-1.5 text-[10px] font-mono text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                              {asg.scheme_code}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">Belum Ditetapkan</span>
                        )}
                      </td>

                      {/* Dynamic Fee Type Columns Breakdown (Tunggakan dengan highlight warna khusus) */}
                      {feeTypes.map((ft) => {
                        const isArrears = (ft.code || '').toLowerCase() === 'arrears_previous_year' || (ft.name || '').toLowerCase().includes('tunggakan');
                        const item = breakdown[ft.id];
                        const amount = item ? item.final_amount : 0;
                        const hasVal = Number(amount) > 0;
                        const isAdj = item?.has_adjustment;
                        const isAuto = item?.is_auto_arrears;

                        return (
                          <td
                            key={ft.id}
                            className={`px-3 py-2.5 text-right font-mono text-[11px] ${
                              isArrears
                                ? `${isSelected ? 'bg-amber-100/80' : 'bg-amber-50/50'} border-x border-amber-200/70`
                                : ''
                            }`}
                          >
                            {!isAssigned && !hasVal ? (
                              <span className="text-slate-300">-</span>
                            ) : hasVal ? (
                              <div className="flex flex-col items-end">
                                <span
                                  className={`font-bold ${
                                    isArrears
                                      ? 'text-amber-900 bg-amber-100/90 px-1.5 py-0.5 rounded border border-amber-300 shadow-2xs'
                                      : isAdj
                                      ? 'text-purple-700'
                                      : 'text-slate-700 font-semibold'
                                  }`}
                                  title={item?.adjustment_note || (isArrears && isAuto ? 'Sisa tunggakan tahun sebelumnya (Otomatis)' : '')}
                                >
                                  {formatRupiah(amount)}
                                </span>
                                {isArrears && isAuto && (
                                  <span className="text-[9px] text-amber-700 font-sans font-medium">
                                    (Otomatis)
                                  </span>
                                )}
                                {isArrears && isAdj && (
                                  <span className="text-[9px] text-purple-700 font-sans font-medium">
                                    (Manual)
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className={isArrears ? 'text-amber-700/50' : 'text-slate-400'}>Rp 0</span>
                            )}
                          </td>
                        );
                      })}

                      {/* Total Biaya Paling Kanan (Bulanan & Non Bulanan) + Icon Aksi Penetapan (Solid BG) */}
                      <td className={`px-4 py-2.5 text-right sticky right-0 z-10 shadow-[-1px_0_0_0_#e2e8f0] ${isSelected ? 'bg-emerald-100' : 'bg-emerald-50'}`}>
                        <div className="flex items-center justify-between gap-3">
                          {/* Rincian Bulanan & Non-Bulanan */}
                          <div className="flex flex-col items-start text-left text-[11px] font-mono">
                            {isAssigned || (stMonthly + stNonMonthly > 0) ? (
                              <>
                                <div className="flex items-center gap-1">
                                  <span className="text-[10px] font-sans text-slate-500 font-semibold">Bln:</span>
                                  <span className="font-bold text-slate-800">{formatRupiah(stMonthly)}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <span className="text-[10px] font-sans text-slate-500 font-semibold">Non-Bln:</span>
                                  <span className="font-bold text-slate-800">{formatRupiah(stNonMonthly)}</span>
                                </div>
                              </>
                            ) : (
                              <span className="text-slate-400 italic font-sans text-[11px]">-</span>
                            )}
                          </div>

                          {/* Tombol Aksi Cukup Icon Saja */}
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => openSingleAssign(st)}
                              title={isAssigned && !isCustom ? 'Ganti Skema Biaya' : 'Pilih Skema Biaya'}
                              className="p-1.5 text-slate-600 hover:text-emerald-700 hover:bg-emerald-200/60 rounded-lg transition"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => openCustomModal(st)}
                              title="Input Manual / Tarif Khusus"
                              className={`p-1.5 rounded-lg transition ${
                                isCustom
                                  ? 'bg-purple-600 text-white hover:bg-purple-700 shadow-xs'
                                  : 'text-purple-700 hover:bg-purple-100'
                              }`}
                            >
                              <Sliders className="w-3.5 h-3.5" />
                            </button>
                            {isAssigned && (
                              <button
                                type="button"
                                onClick={() => openHistoryModal(st)}
                                title="Riwayat Perubahan Penetapan"
                                className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-100 rounded-lg transition"
                              >
                                <History className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>

              {/* Table Footer: Total Akumulasi Keseluruhan Santri (Selalu Sticky di Bawah) */}
              <tfoot className="bg-slate-100 text-slate-800 font-bold border-t-2 border-slate-300 select-none sticky bottom-0 z-30 shadow-[0_-4px_10px_rgba(0,0,0,0.05)]">
                <tr>
                  <td colSpan={4} className="px-4 py-3 text-left sticky left-0 bg-slate-100 z-30 shadow-[1px_0_0_0_#cbd5e1]">
                    <div className="flex items-center gap-2">
                      <span className="uppercase text-[11px] tracking-wider text-slate-700 font-extrabold">
                        Total Akumulasi ({sortedAndFilteredStudents.length} Santri):
                      </span>
                    </div>
                  </td>

                  {/* Total per Pos Biaya (Highlight khusus untuk Tunggakan) */}
                  {feeTypes.map((ft) => {
                    const isArrears = (ft.code || '').toLowerCase() === 'arrears_previous_year' || (ft.name || '').toLowerCase().includes('tunggakan');
                    const colTotal = sortedAndFilteredStudents.reduce((sum, st) => {
                      const amount = st.assignment?.fee_breakdown?.[ft.id]?.final_amount || 0;
                      return sum + Number(amount);
                    }, 0);

                    return (
                      <td
                        key={ft.id}
                        className={`px-3 py-3 text-right font-mono text-[11px] font-bold ${
                          isArrears
                            ? 'bg-amber-100 text-amber-950 border-x border-amber-300'
                            : 'bg-slate-100 text-slate-900'
                        }`}
                      >
                        {colTotal > 0 ? (
                          <span className={isArrears ? 'text-amber-950 font-bold' : ''}>
                            {formatRupiah(colTotal)}
                          </span>
                        ) : (
                          <span className={isArrears ? 'text-amber-700/50' : 'text-slate-400'}>Rp 0</span>
                        )}
                      </td>
                    );
                  })}

                  {/* Grand Total All Assigned Fees (Bln & Non-Bln) di Kolom Paling Kanan */}
                  {(() => {
                    let totalMonthlyAll = 0;
                    let totalNonMonthlyAll = 0;
                    sortedAndFilteredStudents.forEach((st) => {
                      const breakdown = st.assignment?.fee_breakdown || {};
                      feeTypes.forEach((ft) => {
                        const amount = Number(breakdown[ft.id]?.final_amount || 0);
                        const isMonthly = ft.billing_pattern === 'monthly' || String(ft.name).toLowerCase().includes('spp') || String(ft.code || '').toLowerCase().includes('spp');
                        if (isMonthly) {
                          totalMonthlyAll += amount;
                        } else {
                          totalNonMonthlyAll += amount;
                        }
                      });
                    });

                    return (
                      <td className="px-4 py-2.5 text-right sticky right-0 bg-emerald-100 z-30 shadow-[-1px_0_0_0_#cbd5e1] text-emerald-950 font-mono font-extrabold">
                        <div className="flex flex-col items-start text-left text-[11px]">
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] font-sans text-emerald-800 font-semibold">Bln:</span>
                            <span>{formatRupiah(totalMonthlyAll)}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] font-sans text-emerald-800 font-semibold">Non-Bln:</span>
                            <span>{formatRupiah(totalNonMonthlyAll)}</span>
                          </div>
                        </div>
                      </td>
                    );
                  })()}
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Modal Single Assign (Per Orangan) */}
      {singleAssignModalOpen && targetStudent && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg shadow-xl">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2 flex-wrap">
                <UserCheck className="w-4 h-4 text-emerald-600" />
                <h2 className="text-sm font-bold text-slate-800">
                  Penetapan Biaya Per Orangan: {targetStudent.student_name}
                </h2>
                <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-md">
                  {currentYearObj ? `T.A. ${currentYearObj.name}` : ''}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSingleAssignModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveSingleAssign} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Pilih Skema Biaya Pendidikan *</label>
                <select
                  required
                  value={selectedSchemeId}
                  onChange={(e) => setSelectedSchemeId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800"
                >
                  <option value="">-- Pilih Skema Biaya --</option>
                  {schemes.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.code}) - Total: {formatRupiah(s.total_amount)}</option>
                  ))}
                </select>
              </div>

              {/* Preview Rincian Skema yang Dipilih */}
              {selectedSchemeObj && selectedSchemeObj.items && (
                <div className="bg-slate-50/70 border border-slate-200 rounded-xl p-3.5 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-800 pb-2 border-b border-slate-200">
                    <span>Rincian Nominal Skema</span>
                    <span className="text-emerald-700">Total: {formatRupiah(selectedSchemeObj.total_amount)}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    {selectedSchemeObj.items.map((it) => (
                      <div key={it.id} className="flex justify-between py-0.5 text-slate-600 border-b border-slate-100">
                        <span className="truncate max-w-[120px]">{it.fee_type_name}:</span>
                        <span className="font-mono font-semibold text-slate-800">{formatRupiah(it.value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Alasan Penetapan / Perubahan *
                </label>
                <textarea
                  required
                  rows="2"
                  value={assignReason}
                  onChange={(e) => setAssignReason(e.target.value)}
                  placeholder="Wajib jelaskan alasan penetapan atau penggantian skema santri untuk audit trail..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSingleAssignModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submittingSingle}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition disabled:opacity-50"
                >
                  {submittingSingle && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Simpan Penetapan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Bulk Assign (Massal) */}
      {bulkAssignModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg shadow-xl">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2 flex-wrap">
                <Layers className="w-4 h-4 text-emerald-600" />
                <h2 className="text-sm font-bold text-slate-800">
                  Penetapan Biaya Massal ({selectedStudentIds.length} Santri Terpilih)
                </h2>
                <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-md">
                  {currentYearObj ? `T.A. ${currentYearObj.name}` : ''}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setBulkAssignModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveBulkAssign} className="p-6 space-y-4">
              <div className="p-3 bg-emerald-50/60 border border-emerald-200 rounded-xl text-xs text-emerald-800">
                Skema biaya yang dipilih akan diterapkan secara serentak ke seluruh <strong>{selectedStudentIds.length}</strong> santri yang dicentang.
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Pilih Skema Biaya Pendidikan *</label>
                <select
                  required
                  value={bulkSchemeId}
                  onChange={(e) => setBulkSchemeId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800"
                >
                  <option value="">-- Pilih Skema Biaya --</option>
                  {schemes.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.code}) - Total: {formatRupiah(s.total_amount)}</option>
                  ))}
                </select>
              </div>

              {/* Preview Rincian Skema Massal */}
              {bulkSchemeObj && bulkSchemeObj.items && (
                <div className="bg-slate-50/70 border border-slate-200 rounded-xl p-3.5 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-800 pb-2 border-b border-slate-200">
                    <span>Rincian Nominal per Santri</span>
                    <span className="text-emerald-700">Total: {formatRupiah(bulkSchemeObj.total_amount)}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    {bulkSchemeObj.items.map((it) => (
                      <div key={it.id} className="flex justify-between py-0.5 text-slate-600 border-b border-slate-100">
                        <span className="truncate max-w-[120px]">{it.fee_type_name}:</span>
                        <span className="font-mono font-semibold text-slate-800">{formatRupiah(it.value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Alasan Penetapan Massal (Wajib Audit Trail) *
                </label>
                <textarea
                  required
                  rows="2"
                  value={bulkReason}
                  onChange={(e) => setBulkReason(e.target.value)}
                  placeholder="Contoh: Penetapan serentak Skema Reguler santri baru TA 2026/2027..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setBulkAssignModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submittingBulk}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition disabled:opacity-50"
                >
                  {submittingBulk && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Terapkan Massal ({selectedStudentIds.length})
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Custom / Manual Input Langsung Nominal Angka */}
      {customModalOpen && customStudent && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <div className="flex items-center gap-2 flex-wrap">
                <Sliders className="w-4 h-4 text-purple-600" />
                <h2 className="text-sm font-bold text-slate-800">
                  Penetapan Biaya Manual: {customStudent.student_name}
                </h2>
                <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-md">
                  {currentYearObj ? `T.A. ${currentYearObj.name}` : ''}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setCustomModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCustomAssign} className="p-6 space-y-4">
              <div className="p-3.5 bg-purple-50/70 border border-purple-200 rounded-xl text-xs text-purple-900 flex items-start gap-2.5">
                <Info className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Input Langsung Nominal Angka Biaya:</p>
                  <p className="text-[11px] text-purple-700 mt-0.5">
                    Data nominal yang telah ditetapkan sebelumnya (dari skema atau manual) telah terisi otomatis di bawah. Anda dapat langsung mengedit nilai rupiah untuk masing-masing pos tagihan.
                  </p>
                </div>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3">Nama Pos Tagihan</th>
                      <th className="px-4 py-3 text-right w-56">Nominal Penetapan (Rp)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {customItems.map((item, idx) => {
                      const isArrears = item.is_arrears || item.fee_type_code === 'arrears_previous_year' || item.fee_type_name?.toLowerCase().includes('tunggakan') || item.fee_type_id === 11;
                      const hasAutoArrears = isArrears && (item.auto_arrears > 0);
                      const isAutoUsed = isArrears && (item.override_amount === '' || item.override_amount === null || item.override_amount === undefined);
                      const effectiveDisplayAmount = isAutoUsed ? (item.auto_arrears || 0) : Number(item.override_amount || 0);

                      return (
                        <tr key={idx} className={`transition ${isArrears ? 'bg-amber-50/40 hover:bg-amber-50/70 border-l-4 border-l-amber-500' : 'hover:bg-slate-50/60'}`}>
                          <td className="px-4 py-2.5">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-semibold text-slate-800">{item.fee_type_name}</span>
                              {isArrears && (
                                <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${isAutoUsed ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-amber-100 text-amber-900 border border-amber-300'}`}>
                                  {isAutoUsed ? '⚡ Otomatis Sistem' : '✏️ Override Manual'}
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              {isArrears ? (
                                <span className="text-amber-700 font-medium">
                                  {hasAutoArrears
                                    ? `Tunggakan otomatis dari sistem: ${formatRupiah(item.auto_arrears)}. Boleh dikosongkan jika tidak ingin diubah.`
                                    : 'Boleh dikosongkan jika otomatis dari tahun ajaran sebelumnya yang masih ada tunggakan.'}
                                </span>
                              ) : (
                                `ID Pos: #${item.fee_type_id}`
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            <div className="flex flex-col items-end gap-1">
                              <div className="flex items-center justify-end gap-1.5">
                                <span className="text-xs font-bold text-slate-400">Rp</span>
                                <input
                                  type="number"
                                  min="0"
                                  step="1000"
                                  value={item.override_amount}
                                  onChange={(e) => handleCustomItemChange(idx, 'override_amount', e.target.value)}
                                  placeholder={isArrears ? (hasAutoArrears ? `${item.auto_arrears} (Otomatis)` : 'Otomatis (kosongkan)') : '0'}
                                  className={`w-44 px-3 py-1.5 bg-slate-50 focus:bg-white border rounded-xl text-xs font-mono font-bold text-right text-slate-900 focus:ring-2 outline-none transition ${isArrears ? 'border-amber-300 focus:border-amber-500 focus:ring-amber-200' : 'border-slate-200 focus:border-purple-500 focus:ring-purple-200'}`}
                                />
                              </div>
                              <div className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded border shadow-2xs ${isArrears ? (isAutoUsed ? 'text-emerald-800 bg-emerald-50 border-emerald-300' : 'text-amber-800 bg-amber-100/70 border-amber-300') : 'text-purple-700 bg-purple-50/80 border-purple-200/60'}`}>
                                {effectiveDisplayAmount.toLocaleString('id-ID')} {isAutoUsed && isArrears ? '(Otomatis)' : ''}
                              </div>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="bg-purple-50/60 border-t-2 border-purple-200 font-bold text-slate-900">
                    <tr>
                      <td className="px-4 py-3 text-purple-950 font-bold">
                        Total Akumulasi Biaya Santri:
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-purple-950 text-sm font-extrabold">
                        {formatRupiah(
                          customItems.reduce((sum, it) => {
                            const isArrears = it.is_arrears || it.fee_type_code === 'arrears_previous_year' || it.fee_type_name?.toLowerCase().includes('tunggakan') || it.fee_type_id === 11;
                            const isAutoUsed = isArrears && (it.override_amount === '' || it.override_amount === null || it.override_amount === undefined);
                            const val = isAutoUsed ? (it.auto_arrears || 0) : Number(it.override_amount || 0);
                            return sum + val;
                          }, 0)
                        )}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Alasan Penetapan / Perubahan Manual (Wajib Audit Trail) *
                </label>
                <textarea
                  required
                  rows="2"
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  placeholder="Contoh: Penetapan nominal khusus santri jalur khusus / penyesuaian biaya mandiri..."
                  className="w-full px-3.5 py-2.5 bg-purple-50/20 border border-purple-200 rounded-xl text-xs focus:ring-2 focus:ring-purple-300 outline-none"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setCustomModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submittingCustom}
                  className="inline-flex items-center gap-1.5 px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-semibold transition disabled:opacity-50 shadow-sm"
                >
                  {submittingCustom && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Simpan Penetapan Manual
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal History Audit */}
      {historyModalOpen && historyStudent && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-xl max-h-[85vh] overflow-y-auto shadow-xl">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-indigo-600" />
                <h2 className="text-sm font-bold text-slate-800">
                  Riwayat Penetapan: {historyStudent.student_name}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setHistoryModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6">
              {historyLoading ? (
                <div className="py-12 text-center text-slate-400 flex flex-col items-center gap-2">
                  <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
                  <span className="text-xs">Memuat log penetapan...</span>
                </div>
              ) : historyLogs.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-8">Belum ada catatan riwayat perubahan penetapan.</p>
              ) : (
                <div className="space-y-4 relative before:absolute before:inset-0 before:left-3.5 before:w-0.5 before:bg-slate-200">
                  {historyLogs.map((log) => (
                    <div key={log.id} className="relative flex items-start gap-4 pl-8">
                      <div className="absolute left-2 top-1.5 w-3.5 h-3.5 bg-indigo-600 rounded-full border-2 border-white -translate-x-1/2" />
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 w-full text-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-indigo-700 uppercase font-mono text-[10px]">
                            {log.action}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {new Date(log.occurred_at || log.created_at).toLocaleString('id-ID')}
                          </span>
                        </div>
                        {log.data_after?.reason && (
                          <p className="text-slate-700 bg-white p-2 rounded border border-slate-100 mt-1">
                            <span className="font-semibold text-slate-500">Alasan: </span>
                            {log.data_after.reason}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
