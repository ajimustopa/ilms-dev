import React, { useState, useEffect } from 'react';
import api from '../../../shared/services/api';
import SearchableSelect from '../../../shared/components/SearchableSelect';
import {
  BookOpen,
  Activity,
  UserCheck,
  Plus,
  Trash2,
  Edit2,
  Calendar,
  CheckCircle,
  AlertCircle,
  Loader2,
  RotateCw,
  X,
  History,
  Users,
  User,
  ShieldAlert,
  Search,
  Target,
  SlidersHorizontal,
  CheckCircle2,
  Save,
  GraduationCap,
  ListPlus,
  FileText,
  ChevronDown,
  ChevronRight,
  Check,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Clock
} from 'lucide-react';

import { useAuth } from '../../../shared/store/AuthContext';

export default function Kurikulum() {
  const { activeSchoolUnit } = useAuth();
  const [activeTab, setActiveTab] = useState('subjects'); // 'subjects' | 'kkm_matrix' | 'learning_objectives' | 'extracurriculars' | 'teaching_duties'
  const [loading, setLoading] = useState(false);
  const [dataList, setDataList] = useState([]);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // State toggle accordion/expand sub-mapel pada Tab Struktur Kurikulum
  const [expandedParents, setExpandedParents] = useState({});

  const toggleParentExpand = (parentId) => {
    setExpandedParents(prev => {
      const isCurrentlyExpanded = prev[parentId] !== false; // default true (terbuka)
      return {
        ...prev,
        [parentId]: !isCurrentlyExpanded
      };
    });
  };

  // Dropdown master data
  const [academicYears, setAcademicYears] = useState([]);
  const [selectedAcademicYearId, setSelectedAcademicYearId] = useState('');
  const [gradeLevels, setGradeLevels] = useState([]);
  const [classGroups, setClassGroups] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [schoolUnitsList, setSchoolUnitsList] = useState([]);
  const [subjectsList, setSubjectsList] = useState([]);
  const [extrasList, setExtrasList] = useState([]);
  const [semestersList, setSemestersList] = useState([]);

  // Filter khusus tab Tujuan Pembelajaran
  const [tpGradeFilter, setTpGradeFilter] = useState('');
  const [tpSubjectFilter, setTpSubjectFilter] = useState('');

  // State khusus Tab KKM Matrix per Kelas & TA
  const [kkmGradeFilter, setKkmGradeFilter] = useState('');
  const [kkmItemsMap, setKkmItemsMap] = useState({}); // { [subject_id]: { kkm, threshold_c, threshold_b, threshold_a, description } }
  const [savingKkm, setSavingKkm] = useState(false);

  // State khusus Tab Struktur Kurikulum (Grid Matriks Mapel x Jenjang Kelas)
  const [minutesPerJp, setMinutesPerJp] = useState(40);
  const [currStructMatrixMap, setCurrStructMatrixMap] = useState({}); // { [`${subId}_${glId}`]: { hours_per_week: 2, session_duration: 2 } }
  const [savingCurrStruct, setSavingCurrStruct] = useState(false);

  // Modals state
  const [subjectModalOpen, setSubjectModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState(null);
  const [subjectForm, setSubjectForm] = useState({ name: '', code: '', grade_level_id: '', kkm: 75, is_active: true, reason: '' });

  // Modal Toggle Status & Riwayat Status Mapel
  const [subjectToggleModalOpen, setSubjectToggleModalOpen] = useState(false);
  const [subjectToToggle, setSubjectToToggle] = useState(null);
  const [subjectToggleReason, setSubjectToggleReason] = useState('');
  const [savingSubjectToggle, setSavingSubjectToggle] = useState(false);

  const [subjectLogsModalOpen, setSubjectLogsModalOpen] = useState(false);
  const [subjectLogs, setSubjectLogs] = useState([]);
  const [loadingSubjectLogs, setLoadingSubjectLogs] = useState(false);

  const [extraModalOpen, setExtraModalOpen] = useState(false);
  const [editingExtra, setEditingExtra] = useState(null);
  const [extraForm, setExtraForm] = useState({ name: '', schedule: 'Setiap Sabtu 08.00 - 10.00' });

  const [dutyModalOpen, setDutyModalOpen] = useState(false);
  const [crossUnitTeacher, setCrossUnitTeacher] = useState(true); // default true: tampilkan semua guru lintas yayasan
  const [dutyForm, setDutyForm] = useState({
    type: 'mapel',
    subject_id: '',
    extracurricular_id: '',
    class_group_ids: [],
    teacher_employee_id: '',
    allocated_hours: 2,
    role_description: 'Guru Pengampu',
    sk_number: '',
    reason: 'Penetapan tugas awal tahun ajaran',
    notes: ''
  });

  // State Modal Cepat Penetapan / Pergantian Guru per Pembelajaran (Quick Assign)
  const [quickAssignModalOpen, setQuickAssignModalOpen] = useState(false);
  const [quickAssignPair, setQuickAssignPair] = useState(null);
  const [quickAssignForm, setQuickAssignForm] = useState({
    assign_mode: 'single', // 'single' (1 Guru Tunggal) | 'split' (2 Guru / Pembagian JP)
    teacher_employee_id: '',
    allocated_hours: 2,
    role_description: 'Guru Pengampu',
    teacher_employee_id_1: '',
    allocated_hours_1: 2,
    role_description_1: 'Guru Pengampu 1',
    teacher_employee_id_2: '',
    allocated_hours_2: 2,
    role_description_2: 'Guru Pengampu 2',
    sk_number: '',
    reason: '',
    notes: ''
  });

  // State Searchable Dropdown untuk Penugasan Guru
  const [teacherSearch, setTeacherSearch] = useState('');
  const [teacherDropdownOpen, setTeacherDropdownOpen] = useState(false);
  const [subjectSearch, setSubjectSearch] = useState('');
  const [subjectDropdownOpen, setSubjectDropdownOpen] = useState(false);
  const [extraSearch, setExtraSearch] = useState('');
  const [extraDropdownOpen, setExtraDropdownOpen] = useState(false);


  // Modal Tujuan Pembelajaran (TP) & Mode Massal
  const [tpModalOpen, setTpModalOpen] = useState(false);
  const [editingTp, setEditingTp] = useState(null);
  const [tpInputMode, setTpInputMode] = useState('single'); // 'single' | 'bulk_text' | 'bulk_table'
  const [tpForm, setTpForm] = useState({
    grade_level_id: '',
    subject_id: '',
    semester_id: '',
    code: '',
    description: '',
    order_index: 1
  });

  // State untuk Input Massal TP
  const [bulkTpText, setBulkTpText] = useState('');
  const [bulkTpRows, setBulkTpRows] = useState([
    { code: 'TP 1', description: '', order_index: 1, semester_id: '' },
    { code: 'TP 2', description: '', order_index: 2, semester_id: '' },
    { code: 'TP 3', description: '', order_index: 3, semester_id: '' }
  ]);


  const [deleteDutyModalOpen, setDeleteDutyModalOpen] = useState(false);
  const [dutyToDelete, setDutyToDelete] = useState(null);
  const [deleteReason, setDeleteReason] = useState('');

  const [logsModalOpen, setLogsModalOpen] = useState(false);
  const [dutyLogs, setDutyLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

  // --- TAB-SPECIFIC SORTING STATES ---
  const [sortField, setSortField] = useState({
    subjects: 'name',
    kkm_matrix: 'name',
    curriculum_structures: 'name',
    learning_objectives: 'order_index',
    extracurriculars: 'name',
    teaching_duties: 'subject_name'
  });

  const [sortDirection, setSortDirection] = useState({
    subjects: 'asc',
    kkm_matrix: 'asc',
    curriculum_structures: 'asc',
    learning_objectives: 'asc',
    extracurriculars: 'asc',
    teaching_duties: 'asc'
  });

  const handleTabSort = (tabKey, field) => {
    setSortField(prev => ({
      ...prev,
      [tabKey]: field
    }));
    setSortDirection(prev => ({
      ...prev,
      [tabKey]: prev[tabKey] === 'asc' && sortField[tabKey] === field ? 'desc' : 'asc'
    }));
  };

  // --- TAB-SPECIFIC COLUMN FILTER STATES ---
  const [columnFilters, setColumnFilters] = useState({
    subjects: { code: '', name: '', grade_level_id: '', kkm: '', is_active: '' },
    kkm_matrix: { code: '', name: '', kkm: '' },
    curriculum_structures: { code: '', name: '', hours_per_week: '' },
    learning_objectives: { order_index: '', code: '', subject_name: '', grade_level_name: '', description: '', semester_name: '' },
    extracurriculars: { name: '', schedule: '' },
    teaching_duties: { type: '', subject_name: '', class_name: '', teacher_name: '', role_description: '', sk_number: '', status: '' }
  });

  const handleColumnFilterChange = (tabKey, field, value) => {
    setColumnFilters(prev => ({
      ...prev,
      [tabKey]: {
        ...prev[tabKey],
        [field]: value
      }
    }));
  };

  const fetchInitialMaster = async () => {
    try {
      const params = activeSchoolUnit?.id ? { satuan_pendidikan_id: activeSchoolUnit.id } : {};
      const [ayRes, glRes, cgRes, empRes, subRes, exRes, semRes, suRes] = await Promise.all([
        api.get('/akademik/academic-years', { params }),
        api.get('/akademik/grade-levels', { params }),
        api.get('/akademik/class-groups', { params }).catch(() => ({ data: { data: [] } })),
        api.get('/kepegawaian/employees', { params: { per_page: 300 } }).catch(() => ({ data: { data: [] } })),
        api.get('/akademik/subjects', { params: { ...params, include_inactive: 'true' } }),
        api.get('/akademik/extracurriculars', { params }).catch(() => ({ data: { data: [] } })),
        api.get('/akademik/semesters', { params }).catch(() => ({ data: { data: [] } })),
        api.get('/core/school-units').catch(() => ({ data: { data: [] } }))
      ]);

      const ays = ayRes.data?.data || [];
      setAcademicYears(ays);
      const activeAy = ays.find(y => y.is_active) || ays[0];
      if (activeAy && !selectedAcademicYearId) {
        setSelectedAcademicYearId(activeAy.id);
      }

      const gls = glRes.data?.data || [];
      setGradeLevels(gls);
      if (gls.length > 0 && !kkmGradeFilter) {
        setKkmGradeFilter(gls[0].id);
      }
      // Assuming currStructGradeFilter state exists or is handled
      // if (gls.length > 0 && !currStructGradeFilter) {
      //   setCurrStructGradeFilter(gls[0].id);
      // }

      setClassGroups(cgRes.data?.data || []);
      const empList = empRes.data?.data?.items || (Array.isArray(empRes.data?.data) ? empRes.data.data : []);
      setEmployees(empList);
      const unitsList = suRes.data?.data?.items || (Array.isArray(suRes.data?.data) ? suRes.data.data : []);
      setSchoolUnitsList(Array.isArray(unitsList) ? unitsList : []);
      setSubjectsList(subRes.data?.data || []);
      setExtrasList(exRes.data?.data || []);
      setSemestersList(semRes.data?.data || []);
    } catch (err) {
      console.error('Error fetching master:', err);
    }
  };

  useEffect(() => {
    fetchInitialMaster();
  }, [activeSchoolUnit]);

  useEffect(() => {
    fetchTabData();
  }, [activeTab, activeSchoolUnit, selectedAcademicYearId, tpGradeFilter, tpSubjectFilter, kkmGradeFilter]);

  const fetchTabData = async () => {
    try {
      setLoading(true);
      const params = {};
      if (activeSchoolUnit?.id) params.satuan_pendidikan_id = activeSchoolUnit.id;

      if (activeTab === 'subjects') {
        // Pada tab master mata pelajaran, tampilkan semua (aktif & nonaktif) dengan badge status
        const res = await api.get('/akademik/subjects', { params: { ...params, include_inactive: 'true' } });
        const list = res.data?.data || [];
        setDataList(list);
        setSubjectsList(list);
      } else if (activeTab === 'kkm_matrix') {
        if (selectedAcademicYearId) params.academic_year_id = selectedAcademicYearId;
        if (kkmGradeFilter) params.grade_level_id = kkmGradeFilter;
        
        const [kkmRes, subRes] = await Promise.all([
          api.get('/akademik/subject-grade-kkms', { params }),
          api.get('/akademik/subjects', { params: { satuan_pendidikan_id: activeSchoolUnit?.id } })
        ]);
        
        const kkms = kkmRes.data?.data || [];
        const subs = subRes.data?.data || [];
        setDataList(kkms);
        setSubjectsList(subs);

        // Build KKM items map for editing
        const map = {};
        for (const sub of subs) {
          const matched = kkms.find(k => String(k.subject_id) === String(sub.id));
          const defaultKkm = sub.kkm !== null && sub.kkm !== undefined ? sub.kkm : 75;
          const kkmVal = matched ? matched.kkm : defaultKkm;
          map[sub.id] = {
            id: matched ? matched.id : null,
            subject_id: sub.id,
            kkm: kkmVal,
            threshold_c: matched ? matched.threshold_c : kkmVal,
            threshold_b: matched ? matched.threshold_b : Math.round(kkmVal + (100 - kkmVal) / 3),
            threshold_a: matched ? matched.threshold_a : Math.round(kkmVal + 2 * (100 - kkmVal) / 3),
            description: matched ? (matched.description || '') : ''
          };
        }
        setKkmItemsMap(map);
      } else if (activeTab === 'curriculum_structures') {
        if (selectedAcademicYearId) params.academic_year_id = selectedAcademicYearId;

        const [structRes, subRes, ayRes] = await Promise.all([
          api.get('/akademik/curriculum-structures', { params }),
          api.get('/akademik/subjects', { params: { satuan_pendidikan_id: activeSchoolUnit?.id } }),
          api.get('/akademik/academic-years', { params })
        ]);

        const structs = structRes.data?.data || [];
        const subs = subRes.data?.data || [];
        const ays = ayRes.data?.data || [];
        setDataList(structs);
        setSubjectsList(subs);

        const currentAy = ays.find(y => String(y.id) === String(selectedAcademicYearId)) || academicYears.find(y => String(y.id) === String(selectedAcademicYearId));
        if (currentAy && currentAy.minutes_per_jp) {
          setMinutesPerJp(currentAy.minutes_per_jp);
        } else if (structs.length > 0 && structs[0].minutes_per_jp) {
          setMinutesPerJp(structs[0].minutes_per_jp);
        }

        // Build 2D Matrix map: key is `${subject_id}_${grade_level_id}`
        const map = {};
        for (const s of structs) {
          map[`${s.subject_id}_${s.grade_level_id}`] = {
            hours_per_week: s.hours_per_week || 0,
            session_duration: s.session_duration || 2,
            notes: s.notes || ''
          };
        }
        setCurrStructMatrixMap(map);
      } else if (activeTab === 'extracurriculars') {
        const res = await api.get('/akademik/extracurriculars', { params });
        const list = res.data?.data || [];
        setDataList(list);
        setExtrasList(list);
      } else if (activeTab === 'teaching_duties') {
        if (selectedAcademicYearId) params.academic_year_id = selectedAcademicYearId;
        const [dutiesRes, structRes] = await Promise.all([
          api.get('/akademik/teaching-duties', { params }),
          api.get('/akademik/curriculum-structures', { params })
        ]);
        const duties = dutiesRes.data?.data || [];
        const structs = structRes.data?.data || [];
        setDataList(duties);
        const structMap = {};
        for (const s of structs) {
          structMap[`${s.subject_id}_${s.grade_level_id}`] = {
            hours_per_week: s.hours_per_week || 0,
            session_duration: s.session_duration || 2
          };
        }
        setCurrStructMatrixMap(structMap);
      } else if (activeTab === 'learning_objectives') {
        if (selectedAcademicYearId) params.academic_year_id = selectedAcademicYearId;
        if (tpGradeFilter) params.grade_level_id = tpGradeFilter;
        if (tpSubjectFilter) params.subject_id = tpSubjectFilter;
        const res = await api.get('/akademik/learning-objectives', { params });
        setDataList(res.data?.data || []);
      }
    } catch (err) {
      console.error('Error fetching tab data:', err);
    } finally {
      setLoading(false);
    }
  };

  // --- CURRICULUM STRUCTURES MATRIX HANDLERS ---
  const handleCurrStructMatrixChange = (subjectId, gradeLevelId, value) => {
    const numVal = value === '' ? '' : Math.max(0, parseInt(value, 10) || 0);
    setCurrStructMatrixMap(prev => ({
      ...prev,
      [`${subjectId}_${gradeLevelId}`]: {
        ...(prev[`${subjectId}_${gradeLevelId}`] || { session_duration: 2 }),
        hours_per_week: numVal
      }
    }));
  };

  const handleSaveCurriculumStructure = async (e) => {
    if (e) e.preventDefault();
    if (!selectedAcademicYearId) {
      setErrorMsg('Pilih Tahun Ajaran terlebih dahulu.');
      return;
    }

    setSavingCurrStruct(true);
    setErrorMsg('');
    try {
      const items = [];
      subjectsList.forEach(sub => {
        gradeLevels.forEach(gl => {
          const key = `${sub.id}_${gl.id}`;
          const cell = currStructMatrixMap[key];
          const hpw = cell && cell.hours_per_week !== '' && cell.hours_per_week !== undefined
            ? parseInt(cell.hours_per_week, 10)
            : 0;

          items.push({
            subject_id: sub.id,
            grade_level_id: gl.id,
            hours_per_week: hpw,
            session_duration: cell?.session_duration || (hpw >= 2 ? 2 : 1),
            notes: cell?.notes || null
          });
        });
      });

      const payload = {
        satuan_pendidikan_id: activeSchoolUnit?.id || 1,
        academic_year_id: Number(selectedAcademicYearId),
        minutes_per_jp: parseInt(minutesPerJp, 10) || 40,
        items
      };

      await api.post('/akademik/curriculum-structures', payload);
      setSuccessMsg('Struktur Kurikulum (matriks alokasi JP per jenjang) berhasil disimpan dan menjadi batasan alokasi jadwal!');
      fetchTabData();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Gagal menyimpan Struktur Kurikulum');
    } finally {
      setSavingCurrStruct(false);
    }
  };

  // --- KKM / KKTP MATRIX HANDLERS ---
  const handleKkmInputChange = (subjectId, field, value) => {
    setKkmItemsMap(prev => {
      const current = prev[subjectId] || { subject_id: subjectId, kkm: 75 };
      const updated = { ...current, [field]: value };
      
      // Auto compute intervals if KKM changes
      if (field === 'kkm') {
        const numKkm = parseFloat(value) || 75;
        updated.threshold_c = numKkm;
        updated.threshold_b = Math.round(numKkm + (100 - numKkm) / 3);
        updated.threshold_a = Math.round(numKkm + 2 * (100 - numKkm) / 3);
      }
      
      return {
        ...prev,
        [subjectId]: updated
      };
    });
  };

  const handleSaveKkmMatrix = async (e) => {
    if (e) e.preventDefault();
    if (!kkmGradeFilter) {
      setErrorMsg('Pilih Tingkat Kelas terlebih dahulu untuk menyimpan penetapan KKM.');
      return;
    }
    if (!selectedAcademicYearId) {
      setErrorMsg('Pilih Tahun Ajaran terlebih dahulu.');
      return;
    }

    setSavingKkm(true);
    setErrorMsg('');
    try {
      const items = Object.values(kkmItemsMap).map(item => ({
        subject_id: Number(item.subject_id),
        kkm: parseFloat(item.kkm) || 75,
        threshold_c: parseFloat(item.threshold_c) || parseFloat(item.kkm) || 75,
        threshold_b: parseFloat(item.threshold_b) || 83,
        threshold_a: parseFloat(item.threshold_a) || 92,
        description: item.description || null
      }));

      await api.post('/akademik/subject-grade-kkms', {
        satuan_pendidikan_id: activeSchoolUnit?.id || 1,
        academic_year_id: Number(selectedAcademicYearId),
        grade_level_id: Number(kkmGradeFilter),
        items
      });

      setSuccessMsg(`Standar KKM / KKTP untuk tingkat kelas terpilih berhasil disimpan!`);
      fetchTabData();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Gagal menyimpan standar KKM');
    } finally {
      setSavingKkm(false);
    }
  };


  // --- MATA PELAJARAN ---
  const handleOpenAddSubject = () => {
    setEditingSubject(null);
    setSubjectForm({
      name: '',
      code: '',
      grade_level_id: '',
      kkm: 75,
      parent_subject_id: '',
      jp_allocation_mode: 'standalone',
      is_active: true,
      reason: ''
    });
    setErrorMsg('');
    setSubjectModalOpen(true);
  };

  const handleOpenEditSubject = (s) => {
    setEditingSubject(s);
    setSubjectForm({
      name: s.name || '',
      code: s.code || '',
      grade_level_id: s.grade_level_id || '',
      kkm: s.kkm !== null && s.kkm !== undefined ? s.kkm : 75,
      parent_subject_id: s.parent_subject_id || '',
      jp_allocation_mode: s.jp_allocation_mode || (s.parent_subject_id ? 'included_in_parent' : 'standalone'),
      is_active: s.is_active !== undefined ? Boolean(s.is_active) : true,
      reason: ''
    });
    setErrorMsg('');
    setSubjectModalOpen(true);
  };

  const handleSaveSubject = async (e) => {
    e.preventDefault();
    if (!subjectForm.name.trim()) {
      setErrorMsg('Nama mata pelajaran wajib diisi');
      return;
    }
    setSaving(true);
    setErrorMsg('');
    try {
      const payload = {
        satuan_pendidikan_id: activeSchoolUnit?.id || 1,
        name: subjectForm.name.trim(),
        code: subjectForm.code ? subjectForm.code.trim() : null,
        grade_level_id: subjectForm.grade_level_id || null,
        kkm: subjectForm.kkm !== '' ? parseFloat(subjectForm.kkm) : null,
        parent_subject_id: subjectForm.parent_subject_id ? parseInt(subjectForm.parent_subject_id, 10) : null,
        jp_allocation_mode: subjectForm.parent_subject_id ? (subjectForm.jp_allocation_mode || 'included_in_parent') : 'standalone',
        is_active: subjectForm.is_active !== undefined ? subjectForm.is_active : true,
        reason: subjectForm.reason?.trim() || undefined
      };

      if (editingSubject) {
        await api.put(`/akademik/subjects/${editingSubject.id}`, payload);
        setSuccessMsg('Mata pelajaran berhasil diperbarui!');
      } else {
        await api.post('/akademik/subjects', payload);
        setSuccessMsg('Mata pelajaran baru berhasil ditambahkan!');
      }

      setSubjectModalOpen(false);
      fetchTabData();
      fetchInitialMaster();
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Gagal menyimpan mata pelajaran');
    } finally {
      setSaving(false);
    }
  };

  // --- SUBJECT STATUS TOGGLE & LOGS HANDLERS ---
  const handleOpenSubjectToggle = (s) => {
    setSubjectToToggle(s);
    setSubjectToggleReason('');
    setSubjectToggleModalOpen(true);
  };

  const handleConfirmSubjectToggle = async (e) => {
    if (e) e.preventDefault();
    if (!subjectToToggle) return;
    if (!subjectToggleReason.trim()) {
      setErrorMsg('Alasan/keterangan perubahan status mata pelajaran wajib diisi.');
      return;
    }

    setSavingSubjectToggle(true);
    setErrorMsg('');
    try {
      const newStatus = !subjectToToggle.is_active;
      await api.put(`/akademik/subjects/${subjectToToggle.id}/toggle-status`, {
        is_active: newStatus,
        reason: subjectToggleReason.trim()
      });

      setSuccessMsg(`Mata pelajaran "${subjectToToggle.name}" berhasil ${newStatus ? 'diaktifkan' : 'dinonaktifkan'}!`);
      setSubjectToggleModalOpen(false);
      setSubjectToToggle(null);
      setSubjectToggleReason('');
      fetchTabData();
      fetchInitialMaster();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Gagal mengubah status mata pelajaran');
    } finally {
      setSavingSubjectToggle(false);
    }
  };

  const handleOpenSubjectLogs = async (subjectId = null) => {
    setLoadingSubjectLogs(true);
    setSubjectLogsModalOpen(true);
    try {
      const params = {};
      if (activeSchoolUnit?.id) params.satuan_pendidikan_id = activeSchoolUnit.id;
      if (subjectId) params.subject_id = subjectId;

      const res = await api.get('/akademik/subjects/logs', { params });
      setSubjectLogs(res.data?.data || []);
    } catch (err) {
      console.error('Error fetching subject logs:', err);
    } finally {
      setLoadingSubjectLogs(false);
    }
  };

  const handleDeleteSubject = async (id, name) => {
    if (!window.confirm(`Yakin ingin menghapus mata pelajaran "${name}"?`)) return;
    try {
      await api.delete(`/akademik/subjects/${id}`);
      setSuccessMsg('Mata pelajaran berhasil dihapus!');
      fetchTabData();
      fetchInitialMaster();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menghapus mata pelajaran');
    }
  };

  // --- EKSTRAKURIKULER ---
  const handleOpenAddExtra = () => {
    setEditingExtra(null);
    setExtraForm({ name: '', schedule: 'Setiap Sabtu 08.00 - 10.00' });
    setErrorMsg('');
    setExtraModalOpen(true);
  };

  const handleSaveExtra = async (e) => {
    e.preventDefault();
    if (!extraForm.name.trim()) {
      setErrorMsg('Nama cabang ekstrakurikuler wajib diisi');
      return;
    }
    setSaving(true);
    setErrorMsg('');
    try {
      const payload = {
        satuan_pendidikan_id: activeSchoolUnit?.id || 1,
        name: extraForm.name.trim(),
        schedule: extraForm.schedule ? extraForm.schedule.trim() : null
      };

      await api.post('/akademik/extracurriculars', payload);
      setSuccessMsg('Cabang ekstrakurikuler berhasil ditambahkan!');
      setExtraModalOpen(false);
      fetchTabData();
      fetchInitialMaster();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Gagal menyimpan ekstrakurikuler');
    } finally {
      setSaving(false);
    }
  };

  // --- PEMBAGIAN TUGAS MENGAJAR & EKSKUL ---
  const handleOpenAddDuty = () => {
    setDutyForm({
      type: 'mapel',
      subject_id: subjectsList.length > 0 ? subjectsList[0].id : '',
      extracurricular_id: extrasList.length > 0 ? extrasList[0].id : '',
      class_group_ids: [],
      teacher_employee_id: employees.length > 0 ? employees[0].id : '',
      role_description: 'Guru Pengampu',
      sk_number: '',
      reason: 'Penetapan tugas awal tahun ajaran',
      notes: ''
    });
    setTeacherSearch('');
    setTeacherDropdownOpen(false);
    setSubjectSearch('');
    setSubjectDropdownOpen(false);
    setExtraSearch('');
    setExtraDropdownOpen(false);
    setErrorMsg('');
    setDutyModalOpen(true);
  };

  const handleOpenQuickAssign = (pair) => {
    setQuickAssignPair(pair);
    const duties = pair.duties || (pair.duty ? [pair.duty] : []);
    const isMulti = duties.length >= 2;
    const curriculumJp = pair.curriculumJp || 2;

    const teacher1 = duties[0];
    const teacher2 = duties[1];

    const splitJp1 = teacher1?.allocated_hours !== undefined && teacher1?.allocated_hours !== null
      ? teacher1.allocated_hours
      : Math.ceil(curriculumJp / 2);
    const splitJp2 = teacher2?.allocated_hours !== undefined && teacher2?.allocated_hours !== null
      ? teacher2.allocated_hours
      : Math.max(1, curriculumJp - splitJp1);

    setQuickAssignForm({
      assign_mode: isMulti ? 'split' : 'single',
      // Single mode
      teacher_employee_id: teacher1 ? String(teacher1.teacher_employee_id) : '',
      allocated_hours: teacher1?.allocated_hours || curriculumJp,
      role_description: teacher1?.role_description || 'Guru Pengampu',
      // Split mode (2 guru)
      teacher_employee_id_1: teacher1 ? String(teacher1.teacher_employee_id) : '',
      allocated_hours_1: splitJp1,
      role_description_1: teacher1?.role_description || 'Guru Pengampu 1',
      teacher_employee_id_2: teacher2 ? String(teacher2.teacher_employee_id) : '',
      allocated_hours_2: splitJp2,
      role_description_2: teacher2?.role_description || 'Guru Pengampu 2',
      sk_number: teacher1?.sk_number || '',
      reason: duties.length > 0 ? 'Penyesuaian / pembagian tugas mengajar' : 'Penetapan tugas guru pengampu',
      notes: teacher1?.notes || ''
    });
    setTeacherSearch('');
    setTeacherDropdownOpen(false);
    setErrorMsg('');
    setQuickAssignModalOpen(true);
  };

  const handleSaveQuickAssign = async (e) => {
    e.preventDefault();
    if (quickAssignForm.assign_mode === 'single') {
      if (!quickAssignForm.teacher_employee_id) {
        setErrorMsg('Pilih guru / pengampu yang ditugaskan');
        return;
      }
    } else {
      if (!quickAssignForm.teacher_employee_id_1 && !quickAssignForm.teacher_employee_id_2) {
        setErrorMsg('Pilih minimal 1 guru pengampu untuk pembagian JP');
        return;
      }
    }
    if (!quickAssignForm.reason.trim()) {
      setErrorMsg('Keterangan / alasan penetapan wajib diisi untuk pencatatan riwayat');
      return;
    }

    setSaving(true);
    setErrorMsg('');
    try {
      const isMapel = quickAssignPair.type === 'mapel';
      const curriculumJp = quickAssignPair.curriculumJp || 2;

      let payload = {
        satuan_pendidikan_id: activeSchoolUnit?.id || 1,
        academic_year_id: selectedAcademicYearId,
        type: quickAssignPair.type,
        subject_id: isMapel ? quickAssignPair.subject.id : null,
        extracurricular_id: !isMapel ? quickAssignPair.extra.id : null,
        class_group_id: quickAssignPair.class_group ? quickAssignPair.class_group.id : null,
        sk_number: quickAssignForm.sk_number ? quickAssignForm.sk_number.trim() : null,
        reason: quickAssignForm.reason.trim(),
        notes: quickAssignForm.notes ? quickAssignForm.notes.trim() : null
      };

      if (quickAssignForm.assign_mode === 'single') {
        payload.teacher_employee_id = Number(quickAssignForm.teacher_employee_id);
        payload.allocated_hours = parseInt(quickAssignForm.allocated_hours, 10) || curriculumJp;
        payload.role_description = quickAssignForm.role_description;
      } else {
        const teachers = [];
        if (quickAssignForm.teacher_employee_id_1) {
          teachers.push({
            teacher_employee_id: Number(quickAssignForm.teacher_employee_id_1),
            allocated_hours: parseInt(quickAssignForm.allocated_hours_1, 10) || Math.ceil(curriculumJp / 2),
            role_description: quickAssignForm.role_description_1 || 'Guru Pengampu 1'
          });
        }
        if (quickAssignForm.teacher_employee_id_2) {
          teachers.push({
            teacher_employee_id: Number(quickAssignForm.teacher_employee_id_2),
            allocated_hours: parseInt(quickAssignForm.allocated_hours_2, 10) || Math.floor(curriculumJp / 2),
            role_description: quickAssignForm.role_description_2 || 'Guru Pengampu 2'
          });
        }
        payload.teachers = teachers;
      }

      await api.post('/akademik/teaching-duties', payload);

      setSuccessMsg('Penugasan guru berhasil disimpan dan dicatat ke riwayat!');
      setQuickAssignModalOpen(false);
      fetchTabData();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Gagal menyimpan penugasan guru');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleClassGroup = (cgId) => {
    setDutyForm(prev => {
      const exists = prev.class_group_ids.includes(cgId);
      if (exists) {
        return { ...prev, class_group_ids: prev.class_group_ids.filter(id => id !== cgId) };
      } else {
        return { ...prev, class_group_ids: [...prev.class_group_ids, cgId] };
      }
    });
  };

  const handleSelectAllClassGroups = (availableIds) => {
    setDutyForm(prev => {
      const allSelected = availableIds.every(id => prev.class_group_ids.includes(id));
      return {
        ...prev,
        class_group_ids: allSelected ? [] : availableIds
      };
    });
  };

  const handleSaveDuty = async (e) => {
    e.preventDefault();
    if (!dutyForm.teacher_employee_id) {
      setErrorMsg('Pilih guru / pengampu');
      return;
    }
    if (dutyForm.type === 'mapel' && !dutyForm.subject_id) {
      setErrorMsg('Pilih mata pelajaran');
      return;
    }
    if (dutyForm.type === 'ekskul' && !dutyForm.extracurricular_id) {
      setErrorMsg('Pilih ekstrakurikuler');
      return;
    }
    if (dutyForm.class_group_ids.length === 0) {
      setErrorMsg('Pilih minimal satu rombel / kelas yang diajarkan');
      return;
    }
    if (!dutyForm.reason.trim()) {
      setErrorMsg('Keterangan / alasan penugasan wajib diisi');
      return;
    }

    setSaving(true);
    setErrorMsg('');
    try {
      await api.post('/akademik/teaching-duties', {
        satuan_pendidikan_id: activeSchoolUnit?.id || 1,
        academic_year_id: selectedAcademicYearId,
        type: dutyForm.type,
        subject_id: dutyForm.type === 'mapel' ? dutyForm.subject_id : null,
        extracurricular_id: dutyForm.type === 'ekskul' ? dutyForm.extracurricular_id : null,
        class_group_ids: dutyForm.class_group_ids,
        teacher_employee_id: dutyForm.teacher_employee_id,
        allocated_hours: parseInt(dutyForm.allocated_hours, 10) || 2,
        role_description: dutyForm.role_description,
        sk_number: dutyForm.sk_number ? dutyForm.sk_number.trim() : null,
        reason: dutyForm.reason.trim(),
        notes: dutyForm.notes ? dutyForm.notes.trim() : null
      });

      setSuccessMsg('Penugasan guru berhasil ditambahkan untuk rombel yang dipilih!');
      setDutyModalOpen(false);
      fetchTabData();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Gagal menyimpan penugasan guru');
    } finally {
      setSaving(false);
    }
  };

  const handleOpenDeleteDuty = (duty) => {
    setDutyToDelete(duty);
    setDeleteReason('');
    setDeleteDutyModalOpen(true);
  };

  const handleConfirmDeleteDuty = async (e) => {
    e.preventDefault();
    if (!deleteReason.trim()) {
      alert('Alasan penghapusan penugasan wajib diisi');
      return;
    }
    setSaving(true);
    try {
      await api.delete(`/akademik/teaching-duties/${dutyToDelete.id}`, {
        data: { reason: deleteReason.trim() }
      });
      setSuccessMsg('Penugasan guru berhasil dihapus dan riwayatnya telah dicatat!');
      setDeleteDutyModalOpen(false);
      fetchTabData();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menghapus penugasan');
    } finally {
      setSaving(false);
    }
  };

  const handleOpenLogsModal = async () => {
    setLogsModalOpen(true);
    setLoadingLogs(true);
    try {
      const params = {};
      if (activeSchoolUnit?.id) params.satuan_pendidikan_id = activeSchoolUnit.id;
      if (selectedAcademicYearId) params.academic_year_id = selectedAcademicYearId;
      const res = await api.get('/akademik/teaching-duties/logs', { params });
      setDutyLogs(res.data?.data || []);
    } catch (err) {
      console.error('Error fetching duty logs:', err);
    } finally {
      setLoadingLogs(false);
    }
  };

  // --- TUJUAN PEMBELAJARAN (TP) ---
  const handleOpenAddTp = () => {
    setEditingTp(null);
    setTpInputMode('single');
    setTpForm({
      grade_level_id: tpGradeFilter || (gradeLevels[0]?.id || ''),
      subject_id: tpSubjectFilter || (subjectsList[0]?.id || ''),
      semester_id: semestersList[0]?.id || '',
      code: `TP ${dataList.length + 1}`,
      description: '',
      order_index: dataList.length + 1
    });
    setBulkTpText('');
    setBulkTpRows([
      { code: 'TP 1', description: '', order_index: 1, semester_id: semestersList[0]?.id || '' },
      { code: 'TP 2', description: '', order_index: 2, semester_id: semestersList[0]?.id || '' },
      { code: 'TP 3', description: '', order_index: 3, semester_id: semestersList[0]?.id || '' }
    ]);
    setErrorMsg('');
    setTpModalOpen(true);
  };

  const handleOpenEditTp = (tp) => {
    setEditingTp(tp);
    setTpInputMode('single');
    setTpForm({
      grade_level_id: tp.grade_level_id || '',
      subject_id: tp.subject_id || '',
      semester_id: tp.semester_id || '',
      code: tp.code || '',
      description: tp.description || '',
      order_index: tp.order_index || 1
    });
    setErrorMsg('');
    setTpModalOpen(true);
  };

  const handleAddBulkTpRow = () => {
    setBulkTpRows(prev => [
      ...prev,
      { code: `TP ${prev.length + 1}`, description: '', order_index: prev.length + 1, semester_id: tpForm.semester_id || '' }
    ]);
  };

  const handleRemoveBulkTpRow = (index) => {
    setBulkTpRows(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpdateBulkTpRow = (index, field, val) => {
    setBulkTpRows(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: val };
      return copy;
    });
  };

  const handleSaveTp = async (e) => {
    e.preventDefault();
    if (!tpForm.grade_level_id || !tpForm.subject_id) {
      setErrorMsg('Tingkat kelas dan mata pelajaran wajib dipilih');
      return;
    }

    setSaving(true);
    setErrorMsg('');
    try {
      if (editingTp) {
        if (!tpForm.code.trim() || !tpForm.description.trim()) {
          setErrorMsg('Kode TP dan deskripsi tujuan pembelajaran wajib diisi');
          setSaving(false);
          return;
        }

        const payload = {
          satuan_pendidikan_id: activeSchoolUnit?.id || 1,
          academic_year_id: selectedAcademicYearId,
          grade_level_id: Number(tpForm.grade_level_id),
          subject_id: Number(tpForm.subject_id),
          semester_id: tpForm.semester_id ? Number(tpForm.semester_id) : null,
          code: tpForm.code.trim(),
          description: tpForm.description.trim(),
          order_index: parseInt(tpForm.order_index, 10) || 1
        };

        await api.put(`/akademik/learning-objectives/${editingTp.id}`, payload);
        setSuccessMsg('Tujuan Pembelajaran berhasil diperbarui!');
      } else if (tpInputMode === 'bulk_text') {
        // Parse bulk text per baris
        const lines = bulkTpText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
        if (lines.length === 0) {
          setErrorMsg('Masukkan minimal 1 baris Tujuan Pembelajaran');
          setSaving(false);
          return;
        }

        const items = lines.map((line, idx) => {
          // Cek jika format ada separator titik dua/titik/titik koma (cth: "TP 1: Memahami...")
          let code = `TP ${idx + 1}`;
          let desc = line;

          const match = line.match(/^([A-Za-z0-9\.\-\_\s]{2,15})[:;.\-]\s*(.+)$/);
          if (match && match[1] && match[2]) {
            code = match[1].trim();
            desc = match[2].trim();
          }

          return {
            code,
            description: desc,
            order_index: idx + 1,
            semester_id: tpForm.semester_id ? Number(tpForm.semester_id) : null
          };
        });

        await api.post('/akademik/learning-objectives/bulk', {
          satuan_pendidikan_id: activeSchoolUnit?.id || 1,
          academic_year_id: selectedAcademicYearId,
          grade_level_id: Number(tpForm.grade_level_id),
          subject_id: Number(tpForm.subject_id),
          semester_id: tpForm.semester_id ? Number(tpForm.semester_id) : null,
          items
        });

        setSuccessMsg(`Berhasil menambahkan ${items.length} Tujuan Pembelajaran secara massal!`);
      } else if (tpInputMode === 'bulk_table') {
        const validRows = bulkTpRows.filter(r => r.description && r.description.trim().length > 0);
        if (validRows.length === 0) {
          setErrorMsg('Isi minimal 1 baris deskripsi Tujuan Pembelajaran');
          setSaving(false);
          return;
        }

        const items = validRows.map((r, idx) => ({
          code: r.code ? r.code.trim() : `TP ${idx + 1}`,
          description: r.description.trim(),
          order_index: r.order_index ? parseInt(r.order_index, 10) : (idx + 1),
          semester_id: r.semester_id ? Number(r.semester_id) : (tpForm.semester_id ? Number(tpForm.semester_id) : null)
        }));

        await api.post('/akademik/learning-objectives/bulk', {
          satuan_pendidikan_id: activeSchoolUnit?.id || 1,
          academic_year_id: selectedAcademicYearId,
          grade_level_id: Number(tpForm.grade_level_id),
          subject_id: Number(tpForm.subject_id),
          semester_id: tpForm.semester_id ? Number(tpForm.semester_id) : null,
          items
        });

        setSuccessMsg(`Berhasil menambahkan ${items.length} Tujuan Pembelajaran secara massal!`);
      } else {
        // Single mode
        if (!tpForm.code.trim() || !tpForm.description.trim()) {
          setErrorMsg('Kode TP dan deskripsi tujuan pembelajaran wajib diisi');
          setSaving(false);
          return;
        }

        const payload = {
          satuan_pendidikan_id: activeSchoolUnit?.id || 1,
          academic_year_id: selectedAcademicYearId,
          grade_level_id: Number(tpForm.grade_level_id),
          subject_id: Number(tpForm.subject_id),
          semester_id: tpForm.semester_id ? Number(tpForm.semester_id) : null,
          code: tpForm.code.trim(),
          description: tpForm.description.trim(),
          order_index: parseInt(tpForm.order_index, 10) || 1
        };

        await api.post('/akademik/learning-objectives', payload);
        setSuccessMsg('Tujuan Pembelajaran baru berhasil ditambahkan!');
      }

      setTpModalOpen(false);
      fetchTabData();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Gagal menyimpan Tujuan Pembelajaran');
    } finally {
      setSaving(false);
    }
  };


  const handleDeleteTp = async (tpId) => {
    if (!window.confirm('Yakin ingin menghapus Tujuan Pembelajaran (TP) ini?')) return;
    try {
      await api.delete(`/akademik/learning-objectives/${tpId}`);
      setSuccessMsg('Tujuan Pembelajaran berhasil dihapus!');
      fetchTabData();
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menghapus Tujuan Pembelajaran');
    }
  };

  const tabs = [
    { id: 'subjects', label: '1. Mata Pelajaran', icon: BookOpen },
    { id: 'kkm_matrix', label: '2. Standar KKM / KKTP Per Kelas', icon: SlidersHorizontal },
    { id: 'curriculum_structures', label: '3. Struktur Kurikulum (Alokasi JP)', icon: Calendar },
    { id: 'learning_objectives', label: '4. Tujuan Pembelajaran (TP)', icon: Target },
    { id: 'extracurriculars', label: '5. Ekstrakurikuler', icon: Activity },
    { id: 'teaching_duties', label: '6. Pembagian Tugas Mengajar & Ekskul', icon: UserCheck }
  ];

  const filteredData = dataList.filter(item => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      (item.name && item.name.toLowerCase().includes(s)) ||
      (item.code && item.code.toLowerCase().includes(s)) ||
      (item.subject_name && item.subject_name.toLowerCase().includes(s)) ||
      (item.extracurricular_name && item.extracurricular_name.toLowerCase().includes(s)) ||
      (item.teacher_name && item.teacher_name.toLowerCase().includes(s))
    );
  });

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Kurikulum, Mapel & Standar KKM</h1>
          <p className="text-xs text-slate-500 mt-1">
            Kelola master mata pelajaran, standar KKM / KKTP per tingkat kelas & tahun ajaran, cabang ekskul, dan penugasan guru.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={fetchTabData}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold border border-slate-200 shadow-2xs transition active:scale-95"
            title="Segarkan Data dari Database"
          >
            <RotateCw className={`w-3.5 h-3.5 text-slate-600 ${loading ? 'animate-spin' : ''}`} />
            <span>Reload Data</span>
          </button>

          {activeTab === 'subjects' && (
            <>
              <button
                onClick={() => handleOpenSubjectLogs()}
                className="flex items-center gap-2 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 shadow-2xs transition active:scale-95"
                title="Lihat Catatan Alasan & Riwayat Status Mata Pelajaran"
              >
                <History className="w-4 h-4 text-teal-600" />
                <span>Riwayat Status Mapel</span>
              </button>
              <button
                onClick={handleOpenAddSubject}
                className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold rounded-xl shadow-sm transition active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Mata Pelajaran</span>
              </button>
            </>
          )}

          {activeTab === 'kkm_matrix' && (
            <button
              onClick={handleSaveKkmMatrix}
              disabled={savingKkm || subjectsList.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white text-xs font-semibold rounded-xl shadow-sm transition active:scale-95"
            >
              {savingKkm ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>Simpan Penetapan KKM</span>
            </button>
          )}

          {activeTab === 'curriculum_structures' && (
            <button
              onClick={handleSaveCurriculumStructure}
              disabled={savingCurrStruct || subjectsList.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-sm transition active:scale-95"
            >
              {savingCurrStruct ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>Simpan Struktur Kurikulum</span>
            </button>
          )}

          {activeTab === 'learning_objectives' && (
            <button
              onClick={handleOpenAddTp}
              className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold rounded-xl shadow-sm transition active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Tujuan Pembelajaran</span>
            </button>
          )}


          {activeTab === 'extracurriculars' && (
            <button
              onClick={handleOpenAddExtra}
              className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold rounded-xl shadow-sm transition active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Cabang Ekskul</span>
            </button>
          )}

          {activeTab === 'teaching_duties' && (
            <>
              <button
                onClick={handleOpenLogsModal}
                className="flex items-center gap-2 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 transition active:scale-95"
                title="Lihat Catatan Alasan & Riwayat Mutasi Penugasan Guru"
              >
                <History className="w-4 h-4 text-indigo-600" />
                <span>Riwayat Penugasan</span>
              </button>
              <button
                onClick={handleOpenAddDuty}
                className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold rounded-xl shadow-sm transition active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>Tugaskan Guru</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-xs flex items-center gap-2">
          <CheckCircle className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Tabs Navigasi */}
      <div className="flex items-center gap-2 border-b border-slate-200 overflow-x-auto pb-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setSearch(''); }}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-xl transition whitespace-nowrap ${
                isActive
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Toolbar Filter & Pencarian */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        {activeTab === 'teaching_duties' ? (
          <div className="flex flex-col md:flex-row md:items-center gap-3 w-full sm:w-auto flex-1">
            <div className="relative w-full sm:w-72">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari mapel, ekskul, atau guru..."
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            </div>

            {/* RINGKASAN PEMBAGIAN TUGAS DI SAMPING PENCARIAN */}
            {(() => {
              const regulerClassGroups = classGroups.filter(cg => !cg.type || cg.type === 'reguler');
              let totalPairsCount = 0;
              let assignedCount = 0;

              const assignmentMap = {};
              (Array.isArray(dataList) ? dataList : []).forEach(d => {
                if (d.type === 'mapel' && d.subject_id && d.class_group_id) {
                  assignmentMap[`mapel_${d.subject_id}_${d.class_group_id}`] = true;
                }
              });

              subjectsList.forEach(sub => {
                regulerClassGroups.forEach(cg => {
                  if (sub.grade_level_id && cg.grade_level_id && String(sub.grade_level_id) !== String(cg.grade_level_id)) return;
                  totalPairsCount++;
                  if (assignmentMap[`mapel_${sub.id}_${cg.id}`]) assignedCount++;
                });
              });

              const unassignedCount = Math.max(0, totalPairsCount - assignedCount);

              return (
                <div className="flex items-center gap-2 flex-wrap text-xs">
                  <span className="px-2.5 py-1.5 rounded-xl bg-teal-50 border border-teal-200 text-teal-800 font-bold text-[11px] flex items-center gap-1 shadow-2xs">
                    <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
                    <span><b>{assignedCount}</b> Terisi Guru</span>
                  </span>
                  <span className={`px-2.5 py-1.5 rounded-xl font-bold text-[11px] border flex items-center gap-1 shadow-2xs ${
                    unassignedCount > 0
                      ? 'bg-amber-50 border-amber-200 text-amber-800'
                      : 'bg-slate-50 border-slate-200 text-slate-600'
                  }`}>
                    <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                    <span><b>{unassignedCount}</b> Belum Ada Guru</span>
                  </span>
                  <span className="text-[11px] text-slate-500 italic hidden xl:inline">
                    * Beban JP mengacu Struktur Kurikulum. Mapel 2 guru, JP dibagi & jadi rujukan jadwal.
                  </span>
                </div>
              );
            })()}
          </div>
        ) : activeTab !== 'curriculum_structures' ? (
          <div className="relative w-full sm:w-80">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={
                activeTab === 'learning_objectives'
                  ? 'Cari kode atau deskripsi TP...'
                  : 'Cari mapel, ekskul, atau nama guru...'
              }
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          </div>
        ) : (
          <div className="flex items-center gap-2 text-xs text-slate-800">
            <SlidersHorizontal className="w-4 h-4 text-teal-600 shrink-0" />
            <span className="font-bold">Matriks Alokasi Jam Pelajaran (JP) Kurikulum Sekolah</span>
          </div>
        )}

        {/* Filter Toolbar untuk KKM, TP, Struktur Kurikulum & Tugas Mengajar */}
        <div className="flex items-center gap-2.5 w-full sm:w-auto flex-wrap justify-end">
          {/* Konfigurasi Waktu JP khusus Tab Struktur Kurikulum */}
          {activeTab === 'curriculum_structures' && (
            <div className="flex items-center gap-1.5 bg-amber-50/80 border border-amber-200 px-3 py-1.5 rounded-xl shadow-2xs">
              <Clock className="w-3.5 h-3.5 text-amber-700 shrink-0" />
              <span className="text-[11px] font-bold text-amber-950 shrink-0">1 JP =</span>
              <input
                type="number"
                min="15"
                max="120"
                value={minutesPerJp}
                onChange={(e) => setMinutesPerJp(Math.max(1, parseInt(e.target.value, 10) || 40))}
                className="w-14 px-1.5 py-0.5 text-center text-xs font-black text-amber-950 bg-white border border-amber-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
              <span className="text-[11px] font-bold text-amber-900">Menit</span>
            </div>
          )}

          {activeTab === 'kkm_matrix' && (
            <div className="flex items-center gap-1.5 bg-indigo-50/70 border border-indigo-200 px-3 py-1.5 rounded-xl">
              <GraduationCap className="w-3.5 h-3.5 text-indigo-700 shrink-0" />
              <span className="text-[11px] font-bold text-indigo-900 shrink-0">Tingkat Kelas:</span>
              <select
                value={kkmGradeFilter}
                onChange={(e) => setKkmGradeFilter(e.target.value)}
                className="text-xs bg-transparent font-bold text-indigo-900 focus:outline-none cursor-pointer"
              >
                {gradeLevels.map((gl) => (
                  <option key={gl.id} value={gl.id}>
                    {gl.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {activeTab === 'learning_objectives' && (
            <>
              <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
                <span className="text-[11px] font-semibold text-slate-500">Tingkat:</span>
                <select
                  value={tpGradeFilter}
                  onChange={(e) => setTpGradeFilter(e.target.value)}
                  className="text-xs bg-transparent font-bold text-slate-800 focus:outline-none cursor-pointer"
                >
                  <option value="">Semua Tingkat</option>
                  {gradeLevels.map(gl => (
                    <option key={gl.id} value={gl.id}>{gl.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
                <span className="text-[11px] font-semibold text-slate-500">Mapel:</span>
                <select
                  value={tpSubjectFilter}
                  onChange={(e) => setTpSubjectFilter(e.target.value)}
                  className="text-xs bg-transparent font-bold text-slate-800 focus:outline-none cursor-pointer max-w-[140px] truncate"
                >
                  <option value="">Semua Mapel</option>
                  {subjectsList.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
            </>
          )}

          {(activeTab === 'teaching_duties' || activeTab === 'learning_objectives' || activeTab === 'kkm_matrix' || activeTab === 'curriculum_structures') && (
            <div className="flex items-center gap-1.5 bg-teal-50/70 border border-teal-200 px-3 py-1.5 rounded-xl">
              <Calendar className="w-3.5 h-3.5 text-teal-700 shrink-0" />
              <span className="text-[11px] font-bold text-teal-900 shrink-0">Tahun Ajaran:</span>
              <select
                value={selectedAcademicYearId}
                onChange={(e) => setSelectedAcademicYearId(e.target.value)}
                className="text-xs bg-transparent font-bold text-teal-900 focus:outline-none cursor-pointer"
              >
                {academicYears.map((ay) => (
                  <option key={ay.id} value={ay.id}>
                    {ay.name} {ay.is_active ? '(Aktif)' : ''}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Table Data Container */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-5">
{loading ? (
          <div className="py-12 text-center text-slate-400">
            <Loader2 className="w-7 h-7 animate-spin mx-auto mb-2 text-teal-600" />
            <p className="text-xs">Memuat data kurikulum...</p>
          </div>
        ) : (activeTab !== 'kkm_matrix' && activeTab !== 'curriculum_structures' && activeTab !== 'teaching_duties' && filteredData.length === 0) ? (
          <div className="py-12 text-center text-slate-400 text-xs">
            Belum ada data untuk kategori ini. Klik tombol Tambah di pojok kanan atas.
          </div>
        ) : (
          <div className="overflow-x-auto max-h-[calc(100vh-320px)] overflow-y-auto">
            {/* 1. TAB MATA PELAJARAN */}
            {activeTab === 'subjects' && (
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 sticky top-0 z-10 shadow-2xs select-none">
                  <tr>
                    <th
                      onClick={() => handleTabSort('subjects', 'code')}
                      className="py-3 px-4 w-28 cursor-pointer hover:bg-slate-100 transition"
                    >
                      <div className="flex items-center gap-1.5">
                        <span>Kode Mapel</span>
                        {sortField.subjects === 'code' ? (
                          sortDirection.subjects === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-teal-600" /> : <ArrowDown className="w-3.5 h-3.5 text-teal-600" />
                        ) : (
                          <ArrowUpDown className="w-3 h-3 opacity-40" />
                        )}
                      </div>
                    </th>
                    <th
                      onClick={() => handleTabSort('subjects', 'name')}
                      className="py-3 px-4 cursor-pointer hover:bg-slate-100 transition"
                    >
                      <div className="flex items-center gap-1.5">
                        <span>Nama Mata Pelajaran</span>
                        {sortField.subjects === 'name' ? (
                          sortDirection.subjects === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-teal-600" /> : <ArrowDown className="w-3.5 h-3.5 text-teal-600" />
                        ) : (
                          <ArrowUpDown className="w-3 h-3 opacity-40" />
                        )}
                      </div>
                    </th>
                    <th
                      onClick={() => handleTabSort('subjects', 'grade_level_name')}
                      className="py-3 px-4 cursor-pointer hover:bg-slate-100 transition"
                    >
                      <div className="flex items-center gap-1.5">
                        <span>Peruntukan Tingkat</span>
                        {sortField.subjects === 'grade_level_name' ? (
                          sortDirection.subjects === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-teal-600" /> : <ArrowDown className="w-3.5 h-3.5 text-teal-600" />
                        ) : (
                          <ArrowUpDown className="w-3 h-3 opacity-40" />
                        )}
                      </div>
                    </th>
                    <th
                      onClick={() => handleTabSort('subjects', 'is_active')}
                      className="py-3 px-4 w-28 text-center cursor-pointer hover:bg-slate-100 transition"
                    >
                      <div className="flex items-center justify-center gap-1.5">
                        <span>Status</span>
                        {sortField.subjects === 'is_active' ? (
                          sortDirection.subjects === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-teal-600" /> : <ArrowDown className="w-3.5 h-3.5 text-teal-600" />
                        ) : (
                          <ArrowUpDown className="w-3 h-3 opacity-40" />
                        )}
                      </div>
                    </th>
                    <th className="py-3 px-4 text-right w-28">Aksi</th>
                  </tr>
                  {/* Header Filter Row */}
                  <tr className="bg-slate-100/70 border-t border-slate-200">
                    <th className="py-1 px-2">
                      <input
                        type="text"
                        placeholder="Filter kode..."
                        value={columnFilters.subjects.code}
                        onChange={(e) => handleColumnFilterChange('subjects', 'code', e.target.value)}
                        className="w-full px-2 py-1 text-[11px] bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-teal-500 font-normal"
                      />
                    </th>
                    <th className="py-1 px-2">
                      <input
                        type="text"
                        placeholder="Filter nama..."
                        value={columnFilters.subjects.name}
                        onChange={(e) => handleColumnFilterChange('subjects', 'name', e.target.value)}
                        className="w-full px-2 py-1 text-[11px] bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-teal-500 font-normal"
                      />
                    </th>
                    <th className="py-1 px-2">
                      <select
                        value={columnFilters.subjects.grade_level_id}
                        onChange={(e) => handleColumnFilterChange('subjects', 'grade_level_id', e.target.value)}
                        className="w-full px-2 py-1 text-[11px] bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-teal-500 font-normal"
                      >
                        <option value="">Semua Tingkat</option>
                        {gradeLevels.map(gl => (
                          <option key={gl.id} value={gl.id}>{gl.name}</option>
                        ))}
                      </select>
                    </th>
                    <th className="py-1 px-2">
                      <select
                        value={columnFilters.subjects.is_active}
                        onChange={(e) => handleColumnFilterChange('subjects', 'is_active', e.target.value)}
                        className="w-full px-2 py-1 text-[11px] bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-teal-500 font-normal"
                      >
                        <option value="">Semua Status</option>
                        <option value="active">Aktif Saja</option>
                        <option value="inactive">Nonaktif Saja</option>
                      </select>
                    </th>
                    <th className="py-1 px-2 text-right">
                      {(columnFilters.subjects.code || columnFilters.subjects.name || columnFilters.subjects.grade_level_id || columnFilters.subjects.is_active) && (
                        <button
                          onClick={() => setColumnFilters(prev => ({ ...prev, subjects: { code: '', name: '', grade_level_id: '', kkm: '', is_active: '' } }))}
                          className="text-[10px] text-teal-600 hover:text-teal-800 font-bold"
                        >
                          Reset
                        </button>
                      )}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(() => {
                    const filtered = filteredData.filter(s => {
                      const f = columnFilters.subjects;
                      if (f.code && !s.code?.toLowerCase().includes(f.code.toLowerCase())) return false;
                      if (f.name && !s.name?.toLowerCase().includes(f.name.toLowerCase())) return false;
                      if (f.grade_level_id && String(s.grade_level_id) !== String(f.grade_level_id)) return false;
                      if (f.is_active === 'active' && s.is_active === false) return false;
                      if (f.is_active === 'inactive' && s.is_active !== false) return false;
                      return true;
                    });

                    // Susun hierarki: Mapel Utama diurutkan sesuai sortField, kemudian tepat di bawahnya diletakkan Sub-Mapel miliknya
                    const parentSubjects = filtered.filter(s => !s.parent_subject_id);
                    const subSubjects = filtered.filter(s => Boolean(s.parent_subject_id));

                    parentSubjects.sort((a, b) => {
                      const field = sortField.subjects;
                      let valA = a[field] ?? '';
                      let valB = b[field] ?? '';
                      if (typeof valA === 'string') valA = valA.toLowerCase();
                      if (typeof valB === 'string') valB = valB.toLowerCase();
                      if (valA < valB) return sortDirection.subjects === 'asc' ? -1 : 1;
                      if (valA > valB) return sortDirection.subjects === 'asc' ? 1 : -1;
                      return 0;
                    });

                    const hierarchicalList = [];
                    parentSubjects.forEach(parent => {
                      // Cari seluruh sub-mapel dari parent ini
                      const children = subSubjects.filter(sub => String(sub.parent_subject_id) === String(parent.id));
                      const hasChildren = children.length > 0;
                      const isExpanded = expandedParents[parent.id] !== false; // default true/terbuka atau toggle

                      hierarchicalList.push({
                        ...parent,
                        _hasChildren: hasChildren,
                        _isExpanded: isExpanded,
                        _childrenCount: children.length
                      });

                      if (hasChildren && isExpanded) {
                        children.sort((a, b) => {
                          const field = sortField.subjects;
                          let valA = a[field] ?? '';
                          let valB = b[field] ?? '';
                          if (typeof valA === 'string') valA = valA.toLowerCase();
                          if (typeof valB === 'string') valB = valB.toLowerCase();
                          if (valA < valB) return sortDirection.subjects === 'asc' ? -1 : 1;
                          if (valA > valB) return sortDirection.subjects === 'asc' ? 1 : -1;
                          return 0;
                        });
                        hierarchicalList.push(...children);
                      }
                    });

                    // Masukkan hanya sub-mapel yang parent-nya benar-benar tidak ada di parentSubjects (karena parent terfilter query dsb)
                    const parentIdsSet = new Set(parentSubjects.map(p => String(p.id)));
                    const orphanSubs = subSubjects.filter(sub => !parentIdsSet.has(String(sub.parent_subject_id)));
                    hierarchicalList.push(...orphanSubs);

                    return hierarchicalList.map((s) => {
                    const isActive = s.is_active !== false;
                    const isSubSubject = Boolean(s.parent_subject_id);
                    return (
                    <tr key={s.id} className={`transition ${isActive ? 'hover:bg-slate-50/70' : 'bg-slate-50/60 opacity-65 hover:opacity-100'}`}>
                      <td className="py-3 px-4 font-mono font-bold text-slate-700">{s.code || '-'}</td>
                      <td className="py-3 px-4 font-bold text-slate-800">
                        <div className="flex items-start gap-2">
                          {isSubSubject && (
                            <span className="text-teal-600 font-mono text-sm leading-none shrink-0 mt-0.5 pl-3">↳</span>
                          )}
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              {s._hasChildren && (
                                <button
                                  type="button"
                                  onClick={() => toggleParentExpand(s.id)}
                                  className="p-1 rounded-md bg-teal-50 hover:bg-teal-100 text-teal-700 transition flex items-center gap-1 shadow-2xs border border-teal-200/80 mr-0.5"
                                  title={s._isExpanded ? 'Lipat sub-mapel' : 'Buka sub-mapel'}
                                >
                                  {s._isExpanded ? (
                                    <ChevronDown className="w-3.5 h-3.5 text-teal-700 shrink-0" />
                                  ) : (
                                    <ChevronRight className="w-3.5 h-3.5 text-teal-700 shrink-0" />
                                  )}
                                  <span className="text-[10px] font-bold text-teal-800 px-1">
                                    {s._childrenCount} Sub
                                  </span>
                                </button>
                              )}
                              <span>{s.name}</span>
                              {isSubSubject && (
                                <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md ${
                                  s.jp_allocation_mode === 'included_in_parent'
                                    ? 'bg-amber-100 text-amber-900 border border-amber-200'
                                    : 'bg-indigo-100 text-indigo-900 border border-indigo-200'
                                }`}>
                                  Sub-Mapel ({s.jp_allocation_mode === 'included_in_parent' ? 'JP Inklusif Induk' : 'JP Mandiri'})
                                </span>
                              )}
                              {!isActive && (
                                <span className="px-1.5 py-0.5 bg-rose-100 text-rose-700 text-[10px] font-bold rounded">
                                  Nonaktif
                                </span>
                              )}
                            </div>
                            {isSubSubject && s.parent_subject_name && (
                              <div className="text-[11px] font-normal text-slate-400 mt-0.5 pl-0.5">
                                Induk: <span className="text-slate-600 font-semibold">{s.parent_subject_name}</span> ({s.parent_subject_code || '-'})
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md font-semibold text-[11px]">
                          {s.grade_level_name || 'Semua Tingkat'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleOpenSubjectToggle(s)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold transition shadow-2xs ${
                            isActive
                              ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                              : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                          }`}
                          title={`Klik untuk ${isActive ? 'menonaktifkan' : 'mengaktifkan'} mata pelajaran`}
                        >
                          <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                          <span>{isActive ? 'Aktif' : 'Nonaktif'}</span>
                        </button>
                      </td>
                      <td className="py-3 px-4 text-right space-x-1 whitespace-nowrap">
                        <button
                          onClick={() => handleOpenSubjectLogs(s.id)}
                          title="Lihat Riwayat Perubahan Status Mapel"
                          className="p-1 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                        >
                          <History className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleOpenEditSubject(s)}
                          title="Edit Mata Pelajaran"
                          className="p-1 text-slate-500 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteSubject(s.id, s.name)}
                          title="Hapus Mata Pelajaran"
                          className="p-1 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                    );
                  });
                })()}
                </tbody>
              </table>
            )}

            {/* 2. TAB KKM / KKTP MATRIX PER KELAS & TAHUN AJARAN */}
            {activeTab === 'kkm_matrix' && (
              <div className="space-y-4">
                <table className="w-full text-left text-xs border border-slate-200 rounded-xl overflow-hidden">
                  <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200 sticky top-0 z-10 shadow-2xs select-none">
                    <tr>
                      <th className="py-3 px-4 w-12 text-center">No</th>
                      <th
                        onClick={() => handleTabSort('kkm_matrix', 'code')}
                        className="py-3 px-4 w-28 cursor-pointer hover:bg-slate-100 transition"
                      >
                        <div className="flex items-center gap-1.5">
                          <span>Kode</span>
                          {sortField.kkm_matrix === 'code' ? (
                            sortDirection.kkm_matrix === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-teal-600" /> : <ArrowDown className="w-3.5 h-3.5 text-teal-600" />
                          ) : (
                            <ArrowUpDown className="w-3 h-3 opacity-40" />
                          )}
                        </div>
                      </th>
                      <th
                        onClick={() => handleTabSort('kkm_matrix', 'name')}
                        className="py-3 px-4 cursor-pointer hover:bg-slate-100 transition"
                      >
                        <div className="flex items-center gap-1.5">
                          <span>Mata Pelajaran</span>
                          {sortField.kkm_matrix === 'name' ? (
                            sortDirection.kkm_matrix === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-teal-600" /> : <ArrowDown className="w-3.5 h-3.5 text-teal-600" />
                          ) : (
                            <ArrowUpDown className="w-3 h-3 opacity-40" />
                          )}
                        </div>
                      </th>
                      <th className="py-3 px-4 w-28 text-center bg-teal-50/50">Nilai KKM / KKTP</th>
                      <th className="py-3 px-4 w-32 text-center bg-amber-50/40">Cukup (C)</th>
                      <th className="py-3 px-4 w-32 text-center bg-blue-50/40">Baik (B)</th>
                      <th className="py-3 px-4 w-32 text-center bg-emerald-50/40">Sangat Baik (A)</th>
                      <th className="py-3 px-4 w-56">Catatan Deskripsi</th>
                    </tr>

                    {/* Filter Row */}
                    <tr className="bg-slate-100/70 border-t border-slate-200 font-normal">
                      <th className="py-1 px-2"></th>
                      <th className="py-1 px-2">
                        <input
                          type="text"
                          placeholder="Filter kode..."
                          value={columnFilters.kkm_matrix.code}
                          onChange={(e) => handleColumnFilterChange('kkm_matrix', 'code', e.target.value)}
                          className="w-full px-2 py-1 text-[11px] bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-teal-500 font-normal"
                        />
                      </th>
                      <th className="py-1 px-2">
                        <input
                          type="text"
                          placeholder="Filter nama..."
                          value={columnFilters.kkm_matrix.name}
                          onChange={(e) => handleColumnFilterChange('kkm_matrix', 'name', e.target.value)}
                          className="w-full px-2 py-1 text-[11px] bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-teal-500 font-normal"
                        />
                      </th>
                      <th colSpan={5} className="py-1 px-2 text-right">
                        {(columnFilters.kkm_matrix.code || columnFilters.kkm_matrix.name) && (
                          <button
                            onClick={() => setColumnFilters(prev => ({ ...prev, kkm_matrix: { code: '', name: '', kkm: '' } }))}
                            className="text-[10px] text-teal-600 hover:text-teal-800 font-bold"
                          >
                            Reset Filter
                          </button>
                        )}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {subjectsList
                      .filter(sub => {
                        const f = columnFilters.kkm_matrix;
                        if (f.code && !sub.code?.toLowerCase().includes(f.code.toLowerCase())) return false;
                        if (f.name && !sub.name?.toLowerCase().includes(f.name.toLowerCase())) return false;
                        return true;
                      })
                      .sort((a, b) => {
                        const field = sortField.kkm_matrix;
                        let valA = a[field] ?? '';
                        let valB = b[field] ?? '';
                        if (typeof valA === 'string') valA = valA.toLowerCase();
                        if (typeof valB === 'string') valB = valB.toLowerCase();
                        if (valA < valB) return sortDirection.kkm_matrix === 'asc' ? -1 : 1;
                        if (valA > valB) return sortDirection.kkm_matrix === 'asc' ? 1 : -1;
                        return 0;
                      })
                      .map((sub, idx) => {
                        const item = kkmItemsMap[sub.id] || { kkm: 75, threshold_c: 75, threshold_b: 83, threshold_a: 92, description: '' };
                        return (
                          <tr key={sub.id} className="hover:bg-slate-50/60 transition">
                            <td className="py-3 px-4 text-center font-medium text-slate-400">{idx + 1}</td>
                            <td className="py-3 px-4 font-mono font-bold text-slate-700">{sub.code || '-'}</td>
                            <td className="py-3 px-4 font-bold text-slate-800">{sub.name}</td>
                            <td className="py-2.5 px-3 text-center bg-teal-50/30 border-x border-teal-100">
                              <input
                                type="number"
                                value={item.kkm !== undefined ? item.kkm : 75}
                                onChange={(e) => handleKkmInputChange(sub.id, 'kkm', e.target.value)}
                                className="w-20 px-2 py-1 text-center text-xs font-black text-teal-800 bg-white border border-teal-300 rounded-lg shadow-2xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
                              />
                            </td>
                            <td className="py-2.5 px-3 text-center bg-amber-50/20 text-[11px] font-bold text-amber-700">
                              {item.threshold_c || item.kkm || 75} - {((parseFloat(item.threshold_b) || 83) - 1)}
                            </td>
                            <td className="py-2.5 px-3 text-center bg-blue-50/20 text-[11px] font-bold text-blue-700">
                              {item.threshold_b || 83} - {((parseFloat(item.threshold_a) || 92) - 1)}
                            </td>
                            <td className="py-2.5 px-3 text-center bg-emerald-50/20 text-[11px] font-bold text-emerald-700">
                              {item.threshold_a || 92} - 100
                            </td>
                            <td className="py-2.5 px-3">
                              <input
                                type="text"
                                value={item.description || ''}
                                onChange={(e) => handleKkmInputChange(sub.id, 'description', e.target.value)}
                                placeholder="Opsional catatan..."
                                className="w-full px-2 py-1 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500"
                              />
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            )}

            {/* 3. TAB STRUKTUR KURIKULUM (MATRIKS ALOKASI JP MAPEL X JENJANG KELAS) */}
            {activeTab === 'curriculum_structures' && (
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 sticky top-0 z-20 shadow-xs select-none">
                  <tr>
                    <th className="py-3 px-4 w-12 text-center bg-slate-100">#</th>
                          <th
                            onClick={() => handleTabSort('curriculum_structures', 'code')}
                            className="py-3 px-4 w-28 cursor-pointer hover:bg-slate-200 transition bg-slate-100"
                          >
                            <div className="flex items-center gap-1.5">
                              <span>Kode</span>
                              {sortField.curriculum_structures === 'code' ? (
                                sortDirection.curriculum_structures === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-teal-600" /> : <ArrowDown className="w-3.5 h-3.5 text-teal-600" />
                              ) : (
                                <ArrowUpDown className="w-3 h-3 opacity-40" />
                              )}
                            </div>
                          </th>
                          <th
                            onClick={() => handleTabSort('curriculum_structures', 'name')}
                            className="py-3 px-4 min-w-[200px] cursor-pointer hover:bg-slate-200 transition bg-slate-100"
                          >
                            <div className="flex items-center gap-1.5">
                              <span>Mata Pelajaran</span>
                              {sortField.curriculum_structures === 'name' ? (
                                sortDirection.curriculum_structures === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-teal-600" /> : <ArrowDown className="w-3.5 h-3.5 text-teal-600" />
                              ) : (
                                <ArrowUpDown className="w-3 h-3 opacity-40" />
                              )}
                            </div>
                          </th>
                          {gradeLevels.map((gl) => (
                            <th
                              key={gl.id}
                              className="py-3 px-4 text-center bg-teal-50/90 border-x border-teal-100 font-extrabold text-teal-900 min-w-[130px]"
                            >
                              <div className="flex flex-col items-center">
                                <span>{gl.name}</span>
                                <span className="text-[10px] font-normal text-teal-700">(JP / Pekan)</span>
                              </div>
                            </th>
                          ))}

                          <th className="py-3 px-4 text-center bg-slate-200/90 font-black text-slate-800 w-28">
                            Total Rata-rata
                          </th>
                        </tr>

                        {/* Header Filter Row */}
                        <tr className="bg-slate-50 border-t border-slate-200 font-normal">
                        <th className="py-1 px-2"></th>
                        <th className="py-1 px-2">
                          <input
                            type="text"
                            placeholder="Filter kode..."
                            value={columnFilters.curriculum_structures.code}
                            onChange={(e) => handleColumnFilterChange('curriculum_structures', 'code', e.target.value)}
                            className="w-full px-2 py-1 text-[11px] bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-teal-500 font-normal"
                          />
                        </th>
                        <th className="py-1 px-2">
                          <input
                            type="text"
                            placeholder="Filter nama mapel..."
                            value={columnFilters.curriculum_structures.name}
                            onChange={(e) => handleColumnFilterChange('curriculum_structures', 'name', e.target.value)}
                            className="w-full px-2 py-1 text-[11px] bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-teal-500 font-normal"
                          />
                        </th>
                        <th colSpan={gradeLevels.length + 1} className="py-1 px-2 text-right">
                          {(columnFilters.curriculum_structures.code || columnFilters.curriculum_structures.name) && (
                            <button
                              onClick={() => setColumnFilters(prev => ({ ...prev, curriculum_structures: { code: '', name: '', hours_per_week: '' } }))}
                              className="text-[10px] text-teal-600 hover:text-teal-800 font-bold"
                            >
                              Reset Filter
                            </button>
                          )}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {subjectsList.length === 0 ? (
                        <tr>
                          <td colSpan={gradeLevels.length + 4} className="py-12 text-center text-slate-400">
                            Belum ada mata pelajaran terdaftar. Silakan tambahkan mata pelajaran di Tab 1.
                          </td>
                        </tr>
                      ) : (() => {
                        const filtered = subjectsList.filter(sub => {
                          if (search) {
                            const s = search.toLowerCase();
                            if (!sub.name.toLowerCase().includes(s) && !(sub.code && sub.code.toLowerCase().includes(s))) return false;
                          }
                          const f = columnFilters.curriculum_structures;
                          if (f.code && !sub.code?.toLowerCase().includes(f.code.toLowerCase())) return false;
                          if (f.name && !sub.name?.toLowerCase().includes(f.name.toLowerCase())) return false;
                          return true;
                        });

                        // Pisahkan mapel utama (parent) dan sub-mapel
                        const parentSubjects = filtered.filter(s => !s.parent_subject_id);
                        const subSubjects = filtered.filter(s => Boolean(s.parent_subject_id));

                        parentSubjects.sort((a, b) => {
                          const field = sortField.curriculum_structures;
                          let valA = a[field] ?? '';
                          let valB = b[field] ?? '';
                          if (typeof valA === 'string') valA = valA.toLowerCase();
                          if (typeof valB === 'string') valB = valB.toLowerCase();
                          if (valA < valB) return sortDirection.curriculum_structures === 'asc' ? -1 : 1;
                          if (valA > valB) return sortDirection.curriculum_structures === 'asc' ? 1 : -1;
                          return 0;
                        });

                        // Render row helper
                        let rowNumber = 1;
                        const renderedRows = [];

                        parentSubjects.forEach((parent) => {
                          const children = subSubjects.filter(sub => String(sub.parent_subject_id) === String(parent.id));
                          const hasChildren = children.length > 0;
                          const isExpanded = expandedParents[parent.id] !== false; // default true/terbuka atau toggle

                          let totalParentJp = 0;

                          // Push baris Mapel Induk
                          renderedRows.push(
                            <tr key={`parent_${parent.id}`} className="hover:bg-teal-50/40 transition bg-white group">
                              <td className="py-3 px-4 text-center font-bold text-slate-500">{rowNumber++}</td>
                              <td className="py-3 px-4 font-mono font-bold text-slate-700">{parent.code || '-'}</td>
                              <td className="py-3 px-4 font-bold text-slate-800">
                                <div className="flex items-center gap-2">
                                  {hasChildren ? (
                                    <button
                                      type="button"
                                      onClick={() => toggleParentExpand(parent.id)}
                                      className="p-1 rounded-md bg-teal-50 hover:bg-teal-100 text-teal-700 transition flex items-center gap-1 shadow-2xs border border-teal-200/80"
                                      title={isExpanded ? 'Sembunyikan sub-mapel' : 'Tampilkan sub-mapel'}
                                    >
                                      {isExpanded ? (
                                        <ChevronDown className="w-3.5 h-3.5 text-teal-700 shrink-0" />
                                      ) : (
                                        <ChevronRight className="w-3.5 h-3.5 text-teal-700 shrink-0" />
                                      )}
                                      <span className="text-[10px] font-bold text-teal-800 px-1">
                                        {children.length} Sub
                                      </span>
                                    </button>
                                  ) : null}
                                  <span className="text-slate-900 font-bold">{parent.name}</span>
                                </div>
                              </td>

                              {/* Input Cell for Each Grade Level (Parent) */}
                              {gradeLevels.map((gl) => {
                                const cellKey = `${parent.id}_${gl.id}`;
                                const cellData = currStructMatrixMap[cellKey];
                                const jpVal = cellData?.hours_per_week !== undefined ? cellData.hours_per_week : '';
                                if (typeof jpVal === 'number') totalParentJp += jpVal;

                                return (
                                  <td key={gl.id} className="py-2 px-3 text-center bg-teal-50/20 border-x border-teal-100/60">
                                    <div className="flex items-center justify-center gap-1.5">
                                      <input
                                        type="number"
                                        min="0"
                                        max="20"
                                        value={jpVal}
                                        onChange={(e) => handleCurrStructMatrixChange(parent.id, gl.id, e.target.value)}
                                        placeholder="0"
                                        className={`w-16 px-2 py-1.5 text-center text-xs font-black rounded-lg border focus:ring-2 focus:ring-teal-500 focus:outline-none transition ${
                                          jpVal > 0
                                            ? 'bg-teal-600 text-white border-teal-700 shadow-2xs'
                                            : 'bg-white text-slate-400 border-slate-200 hover:border-slate-300'
                                        }`}
                                      />
                                      <span className="text-[10px] font-bold text-slate-400">JP</span>
                                    </div>
                                  </td>
                                );
                              })}

                              <td className="py-3 px-4 text-center font-extrabold text-slate-700 bg-slate-50">
                                {totalParentJp > 0 ? (
                                  <span className="px-2.5 py-1 bg-slate-200 text-slate-800 rounded-full font-black text-xs">
                                    {totalParentJp} JP
                                  </span>
                                ) : (
                                  <span className="text-slate-300">-</span>
                                )}
                              </td>
                            </tr>
                          );

                          // Jika memiliki sub-mapel dan sedang di-expand (toggle aktif)
                          if (hasChildren && isExpanded) {
                            children.forEach((sub) => {
                              let totalSubJp = 0;
                              const isIncludedInParent = sub.jp_allocation_mode === 'included_in_parent';

                              renderedRows.push(
                                <tr
                                  key={`sub_${sub.id}`}
                                  className={`transition border-l-4 border-l-teal-500 ${
                                    isIncludedInParent ? 'bg-amber-50/30 hover:bg-amber-50/50' : 'bg-slate-50/70 hover:bg-slate-100/80'
                                  }`}
                                >
                                  <td className="py-2.5 px-4 text-center font-mono text-[11px] text-slate-400">↳</td>
                                  <td className="py-2.5 px-4 font-mono font-bold text-slate-600 text-[11px] pl-6">
                                    {sub.code || '-'}
                                  </td>
                                  <td className="py-2.5 px-4 font-medium text-slate-800 pl-8">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="text-teal-600 font-mono text-sm leading-none shrink-0">↳</span>
                                      <span className="font-semibold text-slate-800">{sub.name}</span>
                                      <span className={`px-2 py-0.5 text-[9px] font-bold rounded-md ${
                                        isIncludedInParent
                                          ? 'bg-amber-100 text-amber-900 border border-amber-200'
                                          : 'bg-indigo-100 text-indigo-900 border border-indigo-200'
                                      }`}>
                                        Sub-Mapel ({isIncludedInParent ? 'JP Inklusif Induk' : 'JP Mandiri'})
                                      </span>
                                    </div>
                                  </td>

                                  {/* Input Cell for Each Grade Level (Sub-Mapel) */}
                                  {gradeLevels.map((gl) => {
                                    if (isIncludedInParent) {
                                      return (
                                        <td key={gl.id} className="py-2 px-3 text-center bg-amber-50/40 border-x border-amber-100/60">
                                          <span className="text-[10px] font-bold text-amber-800 italic px-2 py-0.5 bg-amber-100/80 rounded">
                                            Inklusif ke Induk
                                          </span>
                                        </td>
                                      );
                                    }

                                    const cellKey = `${sub.id}_${gl.id}`;
                                    const cellData = currStructMatrixMap[cellKey];
                                    const jpVal = cellData?.hours_per_week !== undefined ? cellData.hours_per_week : '';
                                    if (typeof jpVal === 'number') totalSubJp += jpVal;

                                    return (
                                      <td key={gl.id} className="py-2 px-3 text-center bg-indigo-50/20 border-x border-indigo-100/60">
                                        <div className="flex items-center justify-center gap-1.5">
                                          <input
                                            type="number"
                                            min="0"
                                            max="20"
                                            value={jpVal}
                                            onChange={(e) => handleCurrStructMatrixChange(sub.id, gl.id, e.target.value)}
                                            placeholder="0"
                                            className={`w-16 px-2 py-1 text-center text-xs font-black rounded-lg border focus:ring-2 focus:ring-indigo-500 focus:outline-none transition ${
                                              jpVal > 0
                                                ? 'bg-indigo-600 text-white border-indigo-700 shadow-2xs'
                                                : 'bg-white text-slate-400 border-slate-200 hover:border-slate-300'
                                            }`}
                                          />
                                          <span className="text-[10px] font-bold text-slate-400">JP</span>
                                        </div>
                                      </td>
                                    );
                                  })}

                                  <td className="py-2.5 px-4 text-center font-extrabold text-slate-700 bg-slate-100/50">
                                    {isIncludedInParent ? (
                                      <span className="text-[10px] text-amber-700 font-bold italic">Ikut Induk</span>
                                    ) : totalSubJp > 0 ? (
                                      <span className="px-2 py-0.5 bg-indigo-100 text-indigo-900 border border-indigo-200 rounded-full font-black text-[11px]">
                                        {totalSubJp} JP
                                      </span>
                                    ) : (
                                      <span className="text-slate-300">-</span>
                                    )}
                                  </td>
                                </tr>
                              );
                            });
                          }
                        });

                        // Tambahkan hanya orphan sub-subjects (jika parent-nya benar-benar tidak ada di parentSubjects)
                        const parentIdsSet = new Set(parentSubjects.map(p => String(p.id)));
                        const orphanSubs = subSubjects.filter(sub => !parentIdsSet.has(String(sub.parent_subject_id)));
                        orphanSubs.forEach(sub => {
                          let totalSubJp = 0;
                          const isIncludedInParent = sub.jp_allocation_mode === 'included_in_parent';
                          renderedRows.push(
                            <tr key={`orphan_${sub.id}`} className="hover:bg-slate-50/70 transition bg-white">
                              <td className="py-3 px-4 text-center font-medium text-slate-400">{rowNumber++}</td>
                              <td className="py-3 px-4 font-mono font-bold text-slate-700">{sub.code || '-'}</td>
                              <td className="py-3 px-4 font-bold text-slate-800">
                                <div className="flex items-center gap-2">
                                  <span>{sub.name}</span>
                                  <span className="px-2 py-0.5 text-[9px] font-bold rounded-md bg-amber-100 text-amber-900">
                                    Sub-Mapel
                                  </span>
                                </div>
                              </td>
                              {gradeLevels.map((gl) => {
                                if (isIncludedInParent) {
                                  return (
                                    <td key={gl.id} className="py-2 px-3 text-center bg-amber-50/30 border-x border-amber-100/60">
                                      <span className="text-[10px] font-bold text-amber-800 italic">Inklusif ke Induk</span>
                                    </td>
                                  );
                                }
                                const cellKey = `${sub.id}_${gl.id}`;
                                const cellData = currStructMatrixMap[cellKey];
                                const jpVal = cellData?.hours_per_week !== undefined ? cellData.hours_per_week : '';
                                if (typeof jpVal === 'number') totalSubJp += jpVal;
                                return (
                                  <td key={gl.id} className="py-2 px-3 text-center bg-teal-50/20 border-x border-teal-100/60">
                                    <input
                                      type="number"
                                      min="0"
                                      max="20"
                                      value={jpVal}
                                      onChange={(e) => handleCurrStructMatrixChange(sub.id, gl.id, e.target.value)}
                                      placeholder="0"
                                      className="w-16 px-2 py-1 text-center text-xs font-black rounded-lg border"
                                    />
                                  </td>
                                );
                              })}
                              <td className="py-3 px-4 text-center font-extrabold text-slate-700 bg-slate-50">
                                {totalSubJp > 0 ? `${totalSubJp} JP` : '-'}
                              </td>
                            </tr>
                          );
                        });

                        return renderedRows;
                      })()}
                    </tbody>

                    {/* Summary Footer: Total JP per Jenjang (Sticky Bottom) */}
                    {subjectsList.length > 0 && (
                      <tfoot className="bg-slate-100/95 backdrop-blur-sm border-t-2 border-slate-300 font-extrabold text-xs text-slate-800 sticky bottom-0 z-20 shadow-[0_-4px_10px_rgba(0,0,0,0.06)]">
                        <tr>
                          <td colSpan={3} className="py-3 px-4 text-right uppercase tracking-wider text-teal-950 font-black bg-slate-100/95">
                            Total Alokasi Beban Belajar:
                          </td>
                          {gradeLevels.map((gl) => {
                            let sumGradeJp = 0;
                            subjectsList.forEach(sub => {
                              const cell = currStructMatrixMap[`${sub.id}_${gl.id}`];
                              if (cell && typeof cell.hours_per_week === 'number') {
                                sumGradeJp += cell.hours_per_week;
                              }
                            });
                            return (
                              <td key={gl.id} className="py-2.5 px-4 text-center bg-teal-100/90 border-x border-teal-200">
                                <div className="flex flex-col items-center">
                                  <span className="text-sm font-black text-teal-950">{sumGradeJp} JP</span>
                                  <span className="text-[10px] text-teal-700 font-bold">
                                    {sumGradeJp * minutesPerJp} Menit / Pekan
                                  </span>
                                </div>
                              </td>
                            );
                          })}
                          <td className="py-3 px-4 text-center bg-slate-200/95"></td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
            )}

            {/* 4. TAB TUJUAN PEMBELAJARAN (TP) */}
            {activeTab === 'learning_objectives' && (
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 sticky top-0 z-10 shadow-2xs select-none">
                  <tr>
                    <th
                      onClick={() => handleTabSort('learning_objectives', 'order_index')}
                      className="py-3 px-4 w-20 cursor-pointer hover:bg-slate-100 transition"
                    >
                      <div className="flex items-center gap-1.5">
                        <span>Urutan</span>
                        {sortField.learning_objectives === 'order_index' ? (
                          sortDirection.learning_objectives === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-teal-600" /> : <ArrowDown className="w-3.5 h-3.5 text-teal-600" />
                        ) : (
                          <ArrowUpDown className="w-3 h-3 opacity-40" />
                        )}
                      </div>
                    </th>
                    <th
                      onClick={() => handleTabSort('learning_objectives', 'code')}
                      className="py-3 px-4 w-24 cursor-pointer hover:bg-slate-100 transition"
                    >
                      <div className="flex items-center gap-1.5">
                        <span>Kode TP</span>
                        {sortField.learning_objectives === 'code' ? (
                          sortDirection.learning_objectives === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-teal-600" /> : <ArrowDown className="w-3.5 h-3.5 text-teal-600" />
                        ) : (
                          <ArrowUpDown className="w-3 h-3 opacity-40" />
                        )}
                      </div>
                    </th>
                    <th
                      onClick={() => handleTabSort('learning_objectives', 'subject_name')}
                      className="py-3 px-4 w-44 cursor-pointer hover:bg-slate-100 transition"
                    >
                      <div className="flex items-center gap-1.5">
                        <span>Mata Pelajaran</span>
                        {sortField.learning_objectives === 'subject_name' ? (
                          sortDirection.learning_objectives === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-teal-600" /> : <ArrowDown className="w-3.5 h-3.5 text-teal-600" />
                        ) : (
                          <ArrowUpDown className="w-3 h-3 opacity-40" />
                        )}
                      </div>
                    </th>
                    <th
                      onClick={() => handleTabSort('learning_objectives', 'grade_level_name')}
                      className="py-3 px-4 w-32 cursor-pointer hover:bg-slate-100 transition"
                    >
                      <div className="flex items-center gap-1.5">
                        <span>Tingkat Kelas</span>
                        {sortField.learning_objectives === 'grade_level_name' ? (
                          sortDirection.learning_objectives === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-teal-600" /> : <ArrowDown className="w-3.5 h-3.5 text-teal-600" />
                        ) : (
                          <ArrowUpDown className="w-3 h-3 opacity-40" />
                        )}
                      </div>
                    </th>
                    <th
                      onClick={() => handleTabSort('learning_objectives', 'description')}
                      className="py-3 px-4 cursor-pointer hover:bg-slate-100 transition"
                    >
                      <div className="flex items-center gap-1.5">
                        <span>Deskripsi Tujuan Pembelajaran</span>
                        {sortField.learning_objectives === 'description' ? (
                          sortDirection.learning_objectives === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-teal-600" /> : <ArrowDown className="w-3.5 h-3.5 text-teal-600" />
                        ) : (
                          <ArrowUpDown className="w-3 h-3 opacity-40" />
                        )}
                      </div>
                    </th>
                    <th
                      onClick={() => handleTabSort('learning_objectives', 'semester_name')}
                      className="py-3 px-4 w-28 cursor-pointer hover:bg-slate-100 transition"
                    >
                      <div className="flex items-center gap-1.5">
                        <span>Semester</span>
                        {sortField.learning_objectives === 'semester_name' ? (
                          sortDirection.learning_objectives === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-teal-600" /> : <ArrowDown className="w-3.5 h-3.5 text-teal-600" />
                        ) : (
                          <ArrowUpDown className="w-3 h-3 opacity-40" />
                        )}
                      </div>
                    </th>
                    <th className="py-3 px-4 text-right w-24">Aksi</th>
                  </tr>
                  {/* Header Filter Row */}
                  <tr className="bg-slate-100/70 border-t border-slate-200 font-normal">
                    <th className="py-1 px-2">
                      <input
                        type="text"
                        placeholder="No..."
                        value={columnFilters.learning_objectives.order_index}
                        onChange={(e) => handleColumnFilterChange('learning_objectives', 'order_index', e.target.value)}
                        className="w-full px-2 py-1 text-[11px] bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-teal-500 font-normal text-center"
                      />
                    </th>
                    <th className="py-1 px-2">
                      <input
                        type="text"
                        placeholder="Kode..."
                        value={columnFilters.learning_objectives.code}
                        onChange={(e) => handleColumnFilterChange('learning_objectives', 'code', e.target.value)}
                        className="w-full px-2 py-1 text-[11px] bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-teal-500 font-normal"
                      />
                    </th>
                    <th className="py-1 px-2">
                      <input
                        type="text"
                        placeholder="Filter mapel..."
                        value={columnFilters.learning_objectives.subject_name}
                        onChange={(e) => handleColumnFilterChange('learning_objectives', 'subject_name', e.target.value)}
                        className="w-full px-2 py-1 text-[11px] bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-teal-500 font-normal"
                      />
                    </th>
                    <th className="py-1 px-2">
                      <input
                        type="text"
                        placeholder="Filter tingkat..."
                        value={columnFilters.learning_objectives.grade_level_name}
                        onChange={(e) => handleColumnFilterChange('learning_objectives', 'grade_level_name', e.target.value)}
                        className="w-full px-2 py-1 text-[11px] bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-teal-500 font-normal"
                      />
                    </th>
                    <th className="py-1 px-2">
                      <input
                        type="text"
                        placeholder="Filter deskripsi..."
                        value={columnFilters.learning_objectives.description}
                        onChange={(e) => handleColumnFilterChange('learning_objectives', 'description', e.target.value)}
                        className="w-full px-2 py-1 text-[11px] bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-teal-500 font-normal"
                      />
                    </th>
                    <th className="py-1 px-2">
                      <input
                        type="text"
                        placeholder="Semester..."
                        value={columnFilters.learning_objectives.semester_name}
                        onChange={(e) => handleColumnFilterChange('learning_objectives', 'semester_name', e.target.value)}
                        className="w-full px-2 py-1 text-[11px] bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-teal-500 font-normal"
                      />
                    </th>
                    <th className="py-1 px-2 text-right">
                      {Object.values(columnFilters.learning_objectives).some(Boolean) && (
                        <button
                          onClick={() => setColumnFilters(prev => ({ ...prev, learning_objectives: { order_index: '', code: '', subject_name: '', grade_level_name: '', description: '', semester_name: '' } }))}
                          className="text-[10px] text-teal-600 hover:text-teal-800 font-bold"
                        >
                          Reset
                        </button>
                      )}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredData
                    .filter(tp => {
                      const f = columnFilters.learning_objectives;
                      if (f.order_index && !String(tp.order_index).includes(f.order_index)) return false;
                      if (f.code && !tp.code?.toLowerCase().includes(f.code.toLowerCase())) return false;
                      if (f.subject_name && !tp.subject_name?.toLowerCase().includes(f.subject_name.toLowerCase())) return false;
                      if (f.grade_level_name && !tp.grade_level_name?.toLowerCase().includes(f.grade_level_name.toLowerCase())) return false;
                      if (f.description && !tp.description?.toLowerCase().includes(f.description.toLowerCase())) return false;
                      if (f.semester_name && !tp.semester_name?.toLowerCase().includes(f.semester_name.toLowerCase())) return false;
                      return true;
                    })
                    .sort((a, b) => {
                      const field = sortField.learning_objectives;
                      let valA = a[field] ?? '';
                      let valB = b[field] ?? '';
                      if (typeof valA === 'string') valA = valA.toLowerCase();
                      if (typeof valB === 'string') valB = valB.toLowerCase();
                      if (valA < valB) return sortDirection.learning_objectives === 'asc' ? -1 : 1;
                      if (valA > valB) return sortDirection.learning_objectives === 'asc' ? 1 : -1;
                      return 0;
                    })
                    .map((tp) => (
                    <tr key={tp.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3 px-4 font-mono text-slate-500">{tp.order_index}</td>
                      <td className="py-3 px-4">
                        <span className="px-2.5 py-1 bg-teal-50 text-teal-700 border border-teal-200 rounded-lg font-bold text-[11px]">
                          {tp.code}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-800">{tp.subject_name}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-md font-semibold text-[11px]">
                          {tp.grade_level_name}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-700 leading-relaxed font-medium">
                        {tp.description}
                      </td>
                      <td className="py-3 px-4 text-slate-500 uppercase text-[11px]">
                        {tp.semester_name || 'Semua Semester'}
                      </td>
                      <td className="py-3 px-4 text-right space-x-1">
                        <button
                          onClick={() => handleOpenEditTp(tp)}
                          title="Edit Tujuan Pembelajaran"
                          className="p-1 text-slate-500 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteTp(tp.id)}
                          title="Hapus Tujuan Pembelajaran"
                          className="p-1 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* 4. TAB EKSTRAKURIKULER */}
            {activeTab === 'extracurriculars' && (
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 sticky top-0 z-10 shadow-2xs select-none">
                  <tr>
                    <th
                      onClick={() => handleTabSort('extracurriculars', 'name')}
                      className="py-3 px-4 cursor-pointer hover:bg-slate-100 transition"
                    >
                      <div className="flex items-center gap-1.5">
                        <span>Nama Cabang Ekstrakurikuler</span>
                        {sortField.extracurriculars === 'name' ? (
                          sortDirection.extracurriculars === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-teal-600" /> : <ArrowDown className="w-3.5 h-3.5 text-teal-600" />
                        ) : (
                          <ArrowUpDown className="w-3 h-3 opacity-40" />
                        )}
                      </div>
                    </th>
                    <th
                      onClick={() => handleTabSort('extracurriculars', 'schedule')}
                      className="py-3 px-4 cursor-pointer hover:bg-slate-100 transition"
                    >
                      <div className="flex items-center gap-1.5">
                        <span>Jadwal Rutin Latihan</span>
                        {sortField.extracurriculars === 'schedule' ? (
                          sortDirection.extracurriculars === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-teal-600" /> : <ArrowDown className="w-3.5 h-3.5 text-teal-600" />
                        ) : (
                          <ArrowUpDown className="w-3 h-3 opacity-40" />
                        )}
                      </div>
                    </th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                  {/* Header Filter Row */}
                  <tr className="bg-slate-100/70 border-t border-slate-200 font-normal">
                    <th className="py-1 px-2">
                      <input
                        type="text"
                        placeholder="Filter nama ekskul..."
                        value={columnFilters.extracurriculars.name}
                        onChange={(e) => handleColumnFilterChange('extracurriculars', 'name', e.target.value)}
                        className="w-full px-2 py-1 text-[11px] bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-teal-500 font-normal"
                      />
                    </th>
                    <th className="py-1 px-2">
                      <input
                        type="text"
                        placeholder="Filter jadwal..."
                        value={columnFilters.extracurriculars.schedule}
                        onChange={(e) => handleColumnFilterChange('extracurriculars', 'schedule', e.target.value)}
                        className="w-full px-2 py-1 text-[11px] bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-teal-500 font-normal"
                      />
                    </th>
                    <th className="py-1 px-2 text-right">
                      {(columnFilters.extracurriculars.name || columnFilters.extracurriculars.schedule) && (
                        <button
                          onClick={() => setColumnFilters(prev => ({ ...prev, extracurriculars: { name: '', schedule: '' } }))}
                          className="text-[10px] text-teal-600 hover:text-teal-800 font-bold"
                        >
                          Reset
                        </button>
                      )}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredData
                    .filter(ex => {
                      const f = columnFilters.extracurriculars;
                      if (f.name && !ex.name?.toLowerCase().includes(f.name.toLowerCase())) return false;
                      if (f.schedule && !ex.schedule?.toLowerCase().includes(f.schedule.toLowerCase())) return false;
                      return true;
                    })
                    .sort((a, b) => {
                      const field = sortField.extracurriculars;
                      let valA = a[field] ?? '';
                      let valB = b[field] ?? '';
                      if (typeof valA === 'string') valA = valA.toLowerCase();
                      if (typeof valB === 'string') valB = valB.toLowerCase();
                      if (valA < valB) return sortDirection.extracurriculars === 'asc' ? -1 : 1;
                      if (valA > valB) return sortDirection.extracurriculars === 'asc' ? 1 : -1;
                      return 0;
                    })
                    .map((ex) => (
                    <tr key={ex.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3 px-4 font-bold text-slate-800 flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center font-bold">
                          <Activity className="w-4 h-4" />
                        </div>
                        <span>{ex.name}</span>
                      </td>
                      <td className="py-3 px-4 text-slate-600">{ex.schedule || 'Jadwal belum diatur'}</td>
                      <td className="py-3 px-4">
                        <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 rounded-full font-bold text-[10px]">
                          Aktif
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* 5. TAB PEMBAGIAN TUGAS MENGAJAR & EKSKUL */}
            {activeTab === 'teaching_duties' && (() => {
              // Bangun matriks otomatis: Semua kombinasi Mapel x Rombel Reguler pada TA & Satuan Pendidikan ini
              const regulerClassGroups = classGroups.filter(cg => !cg.type || cg.type === 'reguler');
              const learningPairs = [];

              // Map assignments dari dataList (bisa 1 atau multi-guru per Mapel x Rombel)
              const assignmentMap = {};
              (Array.isArray(dataList) ? dataList : []).forEach(d => {
                if (d.type === 'mapel' && d.subject_id && d.class_group_id) {
                  const key = `mapel_${d.subject_id}_${d.class_group_id}`;
                  if (!assignmentMap[key]) assignmentMap[key] = [];
                  assignmentMap[key].push(d);
                }
              });

              // Susun hierarki Mapel Induk -> Sub-Mapel per Rombel
              const parentSubjects = subjectsList.filter(s => !s.parent_subject_id);
              const subSubjects = subjectsList.filter(s => Boolean(s.parent_subject_id));

              parentSubjects.forEach(parentSub => {
                const childSubs = subSubjects.filter(s => String(s.parent_subject_id) === String(parentSub.id));
                const hasChildren = childSubs.length > 0;
                const isExpanded = expandedParents[parentSub.id] !== false;

                regulerClassGroups.forEach(cg => {
                  // Jika mapel memiliki peruntukan tingkat spesifik, hanya pasangkan dengan rombel pada tingkat tersebut
                  if (parentSub.grade_level_id && cg.grade_level_id && String(parentSub.grade_level_id) !== String(cg.grade_level_id)) {
                    return;
                  }

                  const matchedDuties = assignmentMap[`mapel_${parentSub.id}_${cg.id}`] || [];
                  const structKey = `${parentSub.id}_${cg.grade_level_id}`;
                  const curriculumJp = currStructMatrixMap[structKey]?.hours_per_week !== undefined
                    ? currStructMatrixMap[structKey].hours_per_week
                    : 0;

                  const teacherNames = matchedDuties.map(d => d.teacher_name).filter(Boolean).join(', ');
                  const skNumbers = matchedDuties.map(d => d.sk_number).filter(Boolean).join(', ');
                  const roleDescriptions = matchedDuties.map(d => d.role_description).filter(Boolean).join(', ');

                  learningPairs.push({
                    type: 'mapel',
                    subject: parentSub,
                    class_group: cg,
                    duty: matchedDuties[0] || null,
                    duties: matchedDuties,
                    curriculumJp: curriculumJp,
                    is_assigned: matchedDuties.length > 0,
                    subject_name: parentSub.name,
                    class_name: cg.name,
                    teacher_name: teacherNames,
                    role_description: roleDescriptions,
                    sk_number: skNumbers,
                    hasChildren: hasChildren,
                    isExpanded: isExpanded,
                    childrenCount: childSubs.length,
                    isSubSubject: false
                  });

                  // Jika sub-mapel ada dan sedang di-expand (terbuka), tambahkan baris sub-mapel untuk rombel ini
                  if (hasChildren && isExpanded) {
                    childSubs.forEach(childSub => {
                      if (childSub.grade_level_id && cg.grade_level_id && String(childSub.grade_level_id) !== String(cg.grade_level_id)) {
                        return;
                      }
                      const childDuties = assignmentMap[`mapel_${childSub.id}_${cg.id}`] || [];
                      const childStructKey = `${childSub.id}_${cg.grade_level_id}`;
                      const childCurriculumJp = currStructMatrixMap[childStructKey]?.hours_per_week !== undefined
                        ? currStructMatrixMap[childStructKey].hours_per_week
                        : 0;

                      learningPairs.push({
                        type: 'mapel',
                        subject: childSub,
                        class_group: cg,
                        duty: childDuties[0] || null,
                        duties: childDuties,
                        curriculumJp: childCurriculumJp,
                        is_assigned: childDuties.length > 0,
                        subject_name: childSub.name,
                        class_name: cg.name,
                        teacher_name: childDuties.map(d => d.teacher_name).filter(Boolean).join(', '),
                        role_description: childDuties.map(d => d.role_description).filter(Boolean).join(', '),
                        sk_number: childDuties.map(d => d.sk_number).filter(Boolean).join(', '),
                        hasChildren: false,
                        isExpanded: false,
                        childrenCount: 0,
                        isSubSubject: true,
                        parentSubjectName: parentSub.name
                      });
                    });
                  }
                });
              });

              // Tambahkan juga ekskul yang ada
              extrasList.forEach(ex => {
                const matchedDuties = (Array.isArray(dataList) ? dataList : []).filter(d => d.type === 'ekskul' && String(d.extracurricular_id) === String(ex.id));
                const teacherNames = matchedDuties.map(d => d.teacher_name).filter(Boolean).join(', ');
                const skNumbers = matchedDuties.map(d => d.sk_number).filter(Boolean).join(', ');
                const roleDescriptions = matchedDuties.map(d => d.role_description).filter(Boolean).join(', ');

                learningPairs.push({
                  type: 'ekskul',
                  extra: ex,
                  subject: null,
                  class_group: null,
                  duty: matchedDuties[0] || null,
                  duties: matchedDuties,
                  curriculumJp: 2,
                  is_assigned: matchedDuties.length > 0,
                  subject_name: ex.name,
                  class_name: 'Semua Rombel',
                  teacher_name: teacherNames,
                  role_description: roleDescriptions,
                  sk_number: skNumbers
                });
              });

              // Filter pencarian realtime menyeluruh dan filter kolom
              const visiblePairs = learningPairs
                .filter(p => {
                  if (search && search.trim()) {
                    const q = search.trim().toLowerCase();
                    const subName = p.subject?.name ? p.subject.name.toLowerCase() : '';
                    const subCode = p.subject?.code ? p.subject.code.toLowerCase() : '';
                    const extraName = p.extra?.name ? p.extra.name.toLowerCase() : '';
                    const cgName = p.class_group?.name ? p.class_group.name.toLowerCase() : '';
                    const teacherName = p.teacher_name ? p.teacher_name.toLowerCase() : '';
                    const skNumber = p.sk_number ? p.sk_number.toLowerCase() : '';
                    const roleDesc = p.role_description ? p.role_description.toLowerCase() : '';

                    const matchesGlobal = (
                      subName.includes(q) ||
                      subCode.includes(q) ||
                      extraName.includes(q) ||
                      cgName.includes(q) ||
                      teacherName.includes(q) ||
                      skNumber.includes(q) ||
                      roleDesc.includes(q)
                    );
                    if (!matchesGlobal) return false;
                  }

                  const f = columnFilters.teaching_duties;
                  if (f.type && p.type !== f.type) return false;
                  if (f.subject_name && !p.subject_name?.toLowerCase().includes(f.subject_name.toLowerCase())) return false;
                  if (f.class_name && !p.class_name?.toLowerCase().includes(f.class_name.toLowerCase())) return false;
                  if (f.teacher_name && !p.teacher_name?.toLowerCase().includes(f.teacher_name.toLowerCase())) return false;
                  if (f.role_description && !p.role_description?.toLowerCase().includes(f.role_description.toLowerCase())) return false;
                  if (f.sk_number && !p.sk_number?.toLowerCase().includes(f.sk_number.toLowerCase())) return false;
                  if (f.status === 'assigned' && !p.is_assigned) return false;
                  if (f.status === 'unassigned' && p.is_assigned) return false;

                  return true;
                })
                .sort((a, b) => {
                  const field = sortField.teaching_duties;
                  let valA = a[field] ?? '';
                  let valB = b[field] ?? '';
                  if (typeof valA === 'string') valA = valA.toLowerCase();
                  if (typeof valB === 'string') valB = valB.toLowerCase();
                  if (valA < valB) return sortDirection.teaching_duties === 'asc' ? -1 : 1;
                  if (valA > valB) return sortDirection.teaching_duties === 'asc' ? 1 : -1;
                  return 0;
                });

              return (
                <div className="space-y-3">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 sticky top-0 z-10 shadow-2xs select-none">
                      <tr>
                        <th
                          onClick={() => handleTabSort('teaching_duties', 'type')}
                          className="py-3 px-4 w-24 cursor-pointer hover:bg-slate-100 transition"
                        >
                          <div className="flex items-center gap-1.5">
                            <span>Tipe Tugas</span>
                            {sortField.teaching_duties === 'type' ? (
                              sortDirection.teaching_duties === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-teal-600" /> : <ArrowDown className="w-3.5 h-3.5 text-teal-600" />
                            ) : (
                              <ArrowUpDown className="w-3 h-3 opacity-40" />
                            )}
                          </div>
                        </th>
                        <th
                          onClick={() => handleTabSort('teaching_duties', 'subject_name')}
                          className="py-3 px-4 cursor-pointer hover:bg-slate-100 transition"
                        >
                          <div className="flex items-center gap-1.5">
                            <span>Mata Pelajaran / Ekskul</span>
                            {sortField.teaching_duties === 'subject_name' ? (
                              sortDirection.teaching_duties === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-teal-600" /> : <ArrowDown className="w-3.5 h-3.5 text-teal-600" />
                            ) : (
                              <ArrowUpDown className="w-3 h-3 opacity-40" />
                            )}
                          </div>
                        </th>
                        <th
                          onClick={() => handleTabSort('teaching_duties', 'class_name')}
                          className="py-3 px-4 cursor-pointer hover:bg-slate-100 transition"
                        >
                          <div className="flex items-center gap-1.5">
                            <span>Rombel / Kelas</span>
                            {sortField.teaching_duties === 'class_name' ? (
                              sortDirection.teaching_duties === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-teal-600" /> : <ArrowDown className="w-3.5 h-3.5 text-teal-600" />
                            ) : (
                              <ArrowUpDown className="w-3 h-3 opacity-40" />
                            )}
                          </div>
                        </th>
                        <th
                          onClick={() => handleTabSort('teaching_duties', 'teacher_name')}
                          className="py-3 px-4 min-w-[260px] cursor-pointer hover:bg-slate-100 transition"
                        >
                          <div className="flex items-center gap-1.5">
                            <span>Guru Pengampu (Bisa 2 Guru)</span>
                            {sortField.teaching_duties === 'teacher_name' ? (
                              sortDirection.teaching_duties === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-teal-600" /> : <ArrowDown className="w-3.5 h-3.5 text-teal-600" />
                            ) : (
                              <ArrowUpDown className="w-3 h-3 opacity-40" />
                            )}
                          </div>
                        </th>
                        <th className="py-3 px-4 w-36 text-center bg-teal-50/40 font-bold text-teal-900">
                          Beban JP / Pekan (Kurikulum)
                        </th>
                        <th
                          onClick={() => handleTabSort('teaching_duties', 'role_description')}
                          className="py-3 px-4 cursor-pointer hover:bg-slate-100 transition"
                        >
                          <div className="flex items-center gap-1.5">
                            <span>Peran Penugasan</span>
                            {sortField.teaching_duties === 'role_description' ? (
                              sortDirection.teaching_duties === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-teal-600" /> : <ArrowDown className="w-3.5 h-3.5 text-teal-600" />
                            ) : (
                              <ArrowUpDown className="w-3 h-3 opacity-40" />
                            )}
                          </div>
                        </th>
                        <th
                          onClick={() => handleTabSort('teaching_duties', 'sk_number')}
                          className="py-3 px-4 cursor-pointer hover:bg-slate-100 transition"
                        >
                          <div className="flex items-center gap-1.5">
                            <span>Nomor SK / Catatan</span>
                            {sortField.teaching_duties === 'sk_number' ? (
                              sortDirection.teaching_duties === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-teal-600" /> : <ArrowDown className="w-3.5 h-3.5 text-teal-600" />
                            ) : (
                              <ArrowUpDown className="w-3 h-3 opacity-40" />
                            )}
                          </div>
                        </th>
                        <th className="py-3 px-4 text-right w-20">Aksi</th>
                      </tr>
                      {/* Header Filter Row */}
                      <tr className="bg-slate-100/70 border-t border-slate-200 font-normal">
                        <th className="py-1 px-2">
                          <select
                            value={columnFilters.teaching_duties.type}
                            onChange={(e) => handleColumnFilterChange('teaching_duties', 'type', e.target.value)}
                            className="w-full px-1.5 py-1 text-[11px] bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-teal-500 font-normal"
                          >
                            <option value="">Semua</option>
                            <option value="mapel">Mapel</option>
                            <option value="ekskul">Ekskul</option>
                          </select>
                        </th>
                        <th className="py-1 px-2">
                          <input
                            type="text"
                            placeholder="Filter mapel/ekskul..."
                            value={columnFilters.teaching_duties.subject_name}
                            onChange={(e) => handleColumnFilterChange('teaching_duties', 'subject_name', e.target.value)}
                            className="w-full px-2 py-1 text-[11px] bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-teal-500 font-normal"
                          />
                        </th>
                        <th className="py-1 px-2">
                          <input
                            type="text"
                            placeholder="Filter rombel..."
                            value={columnFilters.teaching_duties.class_name}
                            onChange={(e) => handleColumnFilterChange('teaching_duties', 'class_name', e.target.value)}
                            className="w-full px-2 py-1 text-[11px] bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-teal-500 font-normal"
                          />
                        </th>
                        <th className="py-1 px-2">
                          <input
                            type="text"
                            placeholder="Filter nama guru..."
                            value={columnFilters.teaching_duties.teacher_name}
                            onChange={(e) => handleColumnFilterChange('teaching_duties', 'teacher_name', e.target.value)}
                            className="w-full px-2 py-1 text-[11px] bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-teal-500 font-normal"
                          />
                        </th>
                        <th className="py-1 px-2"></th>
                        <th className="py-1 px-2">
                          <input
                            type="text"
                            placeholder="Filter peran..."
                            value={columnFilters.teaching_duties.role_description}
                            onChange={(e) => handleColumnFilterChange('teaching_duties', 'role_description', e.target.value)}
                            className="w-full px-2 py-1 text-[11px] bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-teal-500 font-normal"
                          />
                        </th>
                        <th className="py-1 px-2">
                          <input
                            type="text"
                            placeholder="Filter SK..."
                            value={columnFilters.teaching_duties.sk_number}
                            onChange={(e) => handleColumnFilterChange('teaching_duties', 'sk_number', e.target.value)}
                            className="w-full px-2 py-1 text-[11px] bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-teal-500 font-normal"
                          />
                        </th>
                        <th className="py-1 px-2 text-right">
                          {Object.values(columnFilters.teaching_duties).some(Boolean) && (
                            <button
                              onClick={() => setColumnFilters(prev => ({ ...prev, teaching_duties: { type: '', subject_name: '', class_name: '', teacher_name: '', role_description: '', sk_number: '', status: '' } }))}
                              className="text-[10px] text-teal-600 hover:text-teal-800 font-bold"
                            >
                              Reset
                            </button>
                          )}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {visiblePairs.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="py-10 text-center text-slate-400 text-xs">
                            Tidak ada data pembelajaran yang cocok dengan filter.
                          </td>
                        </tr>
                      ) : (
                        visiblePairs.map((pair, idx) => {
                          const isMapel = pair.type === 'mapel';
                          const hasMultiTeachers = pair.duties && pair.duties.length >= 2;

                          return (
                            <tr key={`${pair.type}_${pair.subject?.id || pair.extra?.id}_${pair.class_group?.id || 'global'}_${idx}`} className={`hover:bg-slate-50/70 transition ${!pair.is_assigned ? 'bg-amber-50/20' : ''}`}>
                              <td className="py-3 px-4">
                                <span className={`px-2.5 py-0.5 rounded-md font-bold uppercase text-[10px] ${
                                  isMapel ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                                }`}>
                                  {isMapel ? 'Mapel' : 'Ekskul'}
                                </span>
                              </td>
                              <td className="py-3 px-4 font-bold text-slate-800">
                                {isMapel ? (
                                  <div className="flex items-start gap-2">
                                    {pair.isSubSubject && (
                                      <span className="text-teal-600 font-mono text-sm leading-none shrink-0 mt-0.5 pl-3">↳</span>
                                    )}
                                    <div>
                                      <div className="flex items-center gap-1.5 flex-wrap">
                                        {pair.hasChildren && (
                                          <button
                                            type="button"
                                            onClick={() => toggleParentExpand(pair.subject.id)}
                                            className="p-1 rounded-md bg-teal-50 hover:bg-teal-100 text-teal-700 transition flex items-center gap-1 shadow-2xs border border-teal-200/80 mr-0.5"
                                            title={pair.isExpanded ? 'Lipat sub-mapel' : 'Buka sub-mapel'}
                                          >
                                            {pair.isExpanded ? (
                                              <ChevronDown className="w-3.5 h-3.5 text-teal-700 shrink-0" />
                                            ) : (
                                              <ChevronRight className="w-3.5 h-3.5 text-teal-700 shrink-0" />
                                            )}
                                            <span className="text-[10px] font-bold text-teal-800 px-1">
                                              {pair.childrenCount} Sub
                                            </span>
                                          </button>
                                        )}
                                        <span className="text-slate-900">{pair.subject?.name}</span>
                                        <span className="text-slate-400 font-mono font-normal">({pair.subject?.code || '-'})</span>
                                        {pair.isSubSubject && (
                                          <span className="px-1.5 py-0.2 bg-teal-50 text-teal-700 text-[9px] rounded font-semibold border border-teal-200">
                                            Sub-Mapel
                                          </span>
                                        )}
                                      </div>
                                      {pair.isSubSubject && pair.parentSubjectName && (
                                        <div className="text-[10px] font-normal text-slate-400 mt-0.5 pl-0.5">
                                          Induk: <span className="text-slate-600 font-medium">{pair.parentSubjectName}</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                ) : (
                                  <span>{pair.extra?.name}</span>
                                )}
                              </td>
                              <td className="py-3 px-4">
                                {pair.class_group ? (
                                  <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-lg font-bold text-[11px]">
                                    {pair.class_group.name} {pair.class_group.grade_level_name ? `(Tk. ${pair.class_group.grade_level_name})` : ''}
                                  </span>
                                ) : (
                                  <span className="text-slate-400 italic text-[11px]">Semua Rombel / Global</span>
                                )}
                              </td>
                              <td className="py-3 px-4">
                                {pair.is_assigned ? (
                                  <button
                                    type="button"
                                    onClick={() => handleOpenQuickAssign(pair)}
                                    title="Klik untuk ubah guru atau bagi JP antar 2 guru"
                                    className="group text-left w-full p-2 rounded-xl border border-teal-200 bg-teal-50/50 hover:bg-teal-100/70 hover:border-teal-400 transition flex items-center justify-between gap-2 shadow-2xs"
                                  >
                                    <div className="space-y-1.5 w-full">
                                      {pair.duties.map((d, dIdx) => (
                                        <div key={dIdx} className="flex items-center justify-between gap-2">
                                          <div className="flex items-center gap-1.5 flex-wrap">
                                            <span className="font-bold text-teal-950 text-xs group-hover:underline">
                                              👨‍🏫 {d.teacher_name || `Employee #${d.teacher_employee_id}`}
                                            </span>
                                            {d.is_cross_unit && (
                                              <span className="px-1.5 py-0.2 bg-purple-100 text-purple-800 border border-purple-200 text-[9px] rounded font-bold">
                                                Lintas Satuan
                                              </span>
                                            )}
                                          </div>
                                          <span className="px-2 py-0.5 bg-teal-600 text-white rounded font-black text-[10px] shrink-0 shadow-2xs">
                                            {d.allocated_hours || pair.curriculumJp || 2} JP
                                          </span>
                                        </div>
                                      ))}
                                      {hasMultiTeachers && (
                                        <div className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200 w-fit">
                                          👥 Team Teaching ({pair.duties.length} Guru)
                                        </div>
                                      )}
                                    </div>
                                    <Edit2 className="w-3.5 h-3.5 text-teal-600 shrink-0 opacity-70 group-hover:opacity-100 ml-1" />
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => handleOpenQuickAssign(pair)}
                                    className="px-3 py-2 rounded-xl border border-dashed border-amber-300 bg-amber-50/80 hover:bg-amber-100 text-amber-900 text-xs font-bold transition flex items-center justify-between w-full shadow-2xs hover:scale-[1.01] active:scale-95"
                                  >
                                    <div className="flex items-center gap-1.5">
                                      <UserCheck className="w-3.5 h-3.5 text-amber-600" />
                                      <span>+ Tetapkan Guru Pengampu</span>
                                    </div>
                                    {pair.curriculumJp > 0 && (
                                      <span className="text-[10px] text-amber-800 bg-amber-200/70 px-2 py-0.5 rounded font-mono font-black">
                                        Kuota: {pair.curriculumJp} JP
                                      </span>
                                    )}
                                  </button>
                                )}
                              </td>
                              <td className="py-3 px-4 text-center bg-teal-50/30">
                                <div className="flex flex-col items-center">
                                  <span className="px-2.5 py-1 bg-teal-100/80 text-teal-900 border border-teal-200 rounded-lg font-black text-xs">
                                    {pair.curriculumJp} JP / Pekan
                                  </span>
                                  <span className="text-[9px] text-slate-500 mt-0.5 font-medium">
                                    {hasMultiTeachers ? 'Alokasi Terbagi' : 'Struktur Kurikulum'}
                                  </span>
                                </div>
                              </td>
                              <td className="py-3 px-4 font-semibold text-slate-700">
                                {pair.role_description || (pair.is_assigned ? 'Guru Pengampu' : '-')}
                              </td>
                              <td className="py-3 px-4 text-slate-600 text-xs">
                                {pair.sk_number ? (
                                  <div className="font-semibold text-indigo-700 text-[11px] mb-0.5">
                                    SK: {pair.sk_number}
                                  </div>
                                ) : null}
                                <div className="text-slate-400 text-[11px] truncate max-w-xs">{pair.duties[0]?.notes || '-'}</div>
                              </td>
                              <td className="py-3 px-4 text-right">
                                {pair.is_assigned && (
                                  <button
                                    onClick={() => handleOpenDeleteDuty(pair.duties[0])}
                                    title="Hapus Penugasan Guru (Wajib Isi Alasan)"
                                    className="px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg text-xs font-semibold transition"
                                  >
                                    Hapus
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              );
            })()}
          </div>
        )}
      </div>

      {/* --- MODAL TAMBAH / EDIT MATA PELAJARAN --- */}
      {subjectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-100 flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between pb-3 border-b shrink-0">
              <h3 className="text-sm font-bold text-slate-800">
                {editingSubject ? 'Edit Mata Pelajaran' : 'Tambah Mata Pelajaran Baru'}
              </h3>
              <button onClick={() => setSubjectModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSubject} className="flex-1 overflow-y-auto pr-1 py-3 space-y-4 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Nama Mata Pelajaran *</label>
                <input
                  type="text"
                  required
                  value={subjectForm.name}
                  onChange={(e) => setSubjectForm({ ...subjectForm, name: e.target.value })}
                  placeholder="Contoh: Matematika, Bahasa Arab, Fiqih"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Kode Mapel (Singkatan)</label>
                <input
                  type="text"
                  value={subjectForm.code}
                  onChange={(e) => setSubjectForm({ ...subjectForm, code: e.target.value })}
                  placeholder="Contoh: MTK, BAR, FIQ"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 uppercase"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Peruntukan Tingkat Kelas</label>
                <select
                  value={subjectForm.grade_level_id}
                  onChange={(e) => setSubjectForm({ ...subjectForm, grade_level_id: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  <option value="">Semua Tingkat Kelas (Berlaku Umum)</option>
                  {gradeLevels.map(gl => (
                    <option key={gl.id} value={gl.id}>{gl.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Kategori Mapel Induk / Sub-Mapel (Opsional)
                </label>
                <select
                  value={subjectForm.parent_subject_id || ''}
                  onChange={(e) => {
                    const parentId = e.target.value;
                    setSubjectForm({
                      ...subjectForm,
                      parent_subject_id: parentId,
                      jp_allocation_mode: parentId ? (subjectForm.jp_allocation_mode === 'standalone' ? 'included_in_parent' : subjectForm.jp_allocation_mode) : 'standalone'
                    });
                  }}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 font-semibold text-slate-800"
                >
                  <option value="">-- Mata Pelajaran Utama / Standar (Bukan Sub-Mapel) --</option>
                  {subjectsList
                    .filter(s => !editingSubject || String(s.id) !== String(editingSubject.id))
                    .filter(s => !s.parent_subject_id)
                    .map(s => (
                      <option key={s.id} value={s.id}>
                        Sebagai Sub-Mapel dari: {s.name} ({s.code || '-'})
                      </option>
                    ))}
                </select>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Pilih jika mapel ini merupakan sub/cabang pelajaran (contoh: Nahwu, Sharaf sebagai sub-mapel dari Bahasa Arab).
                </p>
              </div>

              {/* Pilihan Mode Alokasi JP jika ini adalah Sub-Mapel */}
              {subjectForm.parent_subject_id && (
                <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-xl space-y-2">
                  <span className="text-[11px] font-bold text-amber-950 block">
                    Pengaturan Alokasi Jam Pelajaran (JP) Sub-Mapel:
                  </span>
                  <div className="space-y-2">
                    <label className="flex items-start gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="jp_allocation_mode"
                        value="included_in_parent"
                        checked={subjectForm.jp_allocation_mode === 'included_in_parent'}
                        onChange={() => setSubjectForm({ ...subjectForm, jp_allocation_mode: 'included_in_parent' })}
                        className="mt-0.5 text-teal-600 focus:ring-teal-500"
                      />
                      <div>
                        <span className="text-[11px] font-bold text-slate-800 block">
                          1. Inklusif ke Mapel Induk (JP Menempel pada Induk)
                        </span>
                        <span className="text-[10px] text-slate-500">
                          Jadwal di timetable menggunakan jam mapel induk. Sub-mapel ini <b>tetap muncul di TP dan Penilaian/Rapor</b>.
                        </span>
                      </div>
                    </label>

                    <label className="flex items-start gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="jp_allocation_mode"
                        value="separate"
                        checked={subjectForm.jp_allocation_mode === 'separate'}
                        onChange={() => setSubjectForm({ ...subjectForm, jp_allocation_mode: 'separate' })}
                        className="mt-0.5 text-teal-600 focus:ring-teal-500"
                      />
                      <div>
                        <span className="text-[11px] font-bold text-slate-800 block">
                          2. Memiliki Alokasi JP Mandiri (Terpisah di Jadwal)
                        </span>
                        <span className="text-[10px] text-slate-500">
                          Mendapatkan slot JP tersendiri di struktur kurikulum, penugasan guru terpisah, dan penjadwalan terpisah.
                        </span>
                      </div>
                    </label>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Standar KKM (Kriteria Ketuntasan Minimal)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={subjectForm.kkm}
                  onChange={(e) => setSubjectForm({ ...subjectForm, kkm: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 font-bold"
                />
              </div>

              <div className="pt-1">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={subjectForm.is_active}
                    onChange={(e) => setSubjectForm({ ...subjectForm, is_active: e.target.checked })}
                    className="w-4 h-4 text-teal-600 rounded focus:ring-teal-500"
                  />
                  <span className="text-[11px] font-bold text-slate-800">
                    Status Mata Pelajaran Aktif
                  </span>
                </label>
                <p className="text-[10px] text-slate-400 mt-0.5 ml-6">
                  Jika dinonaktifkan, mata pelajaran ini tidak akan muncul di opsi jadwal, KKM, alokasi penugasan guru, maupun rapor.
                </p>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Keterangan / Alasan Simpan (Tercatat di Riwayat Log)
                </label>
                <input
                  type="text"
                  value={subjectForm.reason || ''}
                  onChange={(e) => setSubjectForm({ ...subjectForm, reason: e.target.value })}
                  placeholder={editingSubject ? 'Contoh: Penyesuaian KKM & status kurikulum baru' : 'Contoh: Penambahan mapel muatan lokal'}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="pt-3 border-t flex justify-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setSubjectModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 disabled:bg-teal-400 text-white rounded-xl font-semibold shadow-sm transition flex items-center gap-1.5"
                >
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  <span>{editingSubject ? 'Simpan Perubahan' : 'Simpan Mapel'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL TOGGLE AKTIF / NONAKTIF MATA PELAJARAN DENGAN KETERANGAN --- */}
      {subjectToggleModalOpen && subjectToToggle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b">
              <div className="flex items-center gap-2">
                <div className={`p-2 rounded-xl ${subjectToToggle.is_active ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}>
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">
                    {subjectToToggle.is_active ? 'Nonaktifkan Mata Pelajaran' : 'Aktifkan Kembali Mata Pelajaran'}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {subjectToToggle.name} ({subjectToToggle.code || '-'})
                  </p>
                </div>
              </div>
              <button onClick={() => setSubjectToggleModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 rounded-xl text-xs leading-relaxed bg-slate-50 border border-slate-200 text-slate-700">
              {subjectToToggle.is_active ? (
                <p>
                  Mata pelajaran <b>"{subjectToToggle.name}"</b> akan <b className="text-rose-700">dinonaktifkan</b>. Mata pelajaran yang dinonaktifkan tidak akan muncul lagi di dropdown jadwal pelajaran, struktur kurikulum baru, alokasi penugasan guru, maupun penilaian rapor.
                </p>
              ) : (
                <p>
                  Mata pelajaran <b>"{subjectToToggle.name}"</b> akan <b className="text-emerald-700">diaktifkan kembali</b> dan dapat digunakan di seluruh modul akademik.
                </p>
              )}
            </div>

            <form onSubmit={handleConfirmSubjectToggle} className="space-y-4 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-800 mb-1">
                  Keterangan / Alasan Perubahan Status *
                </label>
                <textarea
                  required
                  rows={3}
                  value={subjectToggleReason}
                  onChange={(e) => setSubjectToggleReason(e.target.value)}
                  placeholder={
                    subjectToToggle.is_active
                      ? 'Contoh: Mata pelajaran tidak lagi diajarkan pada kurikulum tahun ini / digantikan oleh mapel lain...'
                      : 'Contoh: Diaktifkan kembali sesuai SK kurikulum baru...'
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-800"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setSubjectToggleModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl hover:bg-slate-50 transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={savingSubjectToggle || !subjectToggleReason.trim()}
                  className={`flex items-center gap-2 px-5 py-2 text-white rounded-xl font-bold shadow-sm transition active:scale-95 disabled:opacity-50 ${
                    subjectToToggle.is_active
                      ? 'bg-rose-600 hover:bg-rose-700'
                      : 'bg-emerald-600 hover:bg-emerald-700'
                  }`}
                >
                  {savingSubjectToggle && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{subjectToToggle.is_active ? 'Konfirmasi Nonaktifkan' : 'Konfirmasi Aktifkan'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL RIWAYAT AUDIT LOG STATUS MATA PELAJARAN --- */}
      {subjectLogsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-xl border border-slate-100 space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-2 border-b">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-teal-50 text-teal-600 rounded-xl">
                  <History className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">
                    Riwayat Perubahan Status & Mutasi Mata Pelajaran
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Log audit pencatatan alasan aktif / nonaktif dan perubahan data mapel
                  </p>
                </div>
              </div>
              <button onClick={() => setSubjectLogsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto pr-1">
              {loadingSubjectLogs ? (
                <div className="py-12 text-center text-slate-400">
                  <Loader2 className="w-7 h-7 animate-spin mx-auto mb-2 text-teal-600" />
                  <p className="text-xs">Memuat riwayat status mapel...</p>
                </div>
              ) : subjectLogs.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  Belum ada catatan riwayat perubahan status untuk mata pelajaran ini.
                </div>
              ) : (
                <div className="space-y-3">
                  {subjectLogs.map((log) => {
                    const isToggle = log.action === 'toggle_status';
                    const isNewActive = log.new_status === true;
                    return (
                      <div key={log.id} className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1.5 hover:bg-slate-100/70 transition">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-800">{log.subject_name}</span>
                            <span className="font-mono text-slate-500 font-bold text-[10px]">({log.subject_code || '-'})</span>
                            {isToggle ? (
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                isNewActive ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                              }`}>
                                {isNewActive ? 'Diaktifkan' : 'Dinonaktifkan'}
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 uppercase">
                                {log.action}
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {new Date(log.created_at).toLocaleString('id-ID', {
                              dateStyle: 'medium',
                              timeStyle: 'short'
                            })}
                          </span>
                        </div>

                        <div className="text-slate-700 bg-white p-2.5 rounded-lg border border-slate-200/80">
                          <span className="font-semibold text-slate-500 text-[10px] block mb-0.5">Alasan / Keterangan:</span>
                          <span className="italic">{log.reason || 'Tidak ada keterangan tambahan'}</span>
                        </div>

                        <div className="flex items-center justify-between text-[10px] text-slate-500 pt-0.5">
                          <span>Diubah oleh: <b className="text-slate-700">{log.user_name || 'Administrator'}</b></span>
                          {log.previous_status !== null && (
                            <span className="text-slate-400">
                              Status Sebelumnya: {log.previous_status ? 'Aktif' : 'Nonaktif'}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="pt-2 border-t flex justify-end">
              <button
                type="button"
                onClick={() => setSubjectLogsModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL TAMBAH / EDIT TUJUAN PEMBELAJARAN (TP) --- */}
      {tpModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className={`bg-white rounded-2xl ${tpInputMode === 'bulk_table' ? 'max-w-3xl' : 'max-w-xl'} w-full p-6 shadow-xl border border-slate-100 space-y-4 max-h-[90vh] overflow-y-auto`}>
            <div className="flex items-center justify-between pb-2 border-b">
              <div>
                <h3 className="text-sm font-bold text-slate-800">
                  {editingTp ? 'Edit Tujuan Pembelajaran (TP)' : 'Tambah Tujuan Pembelajaran (TP)'}
                </h3>
                <p className="text-[11px] text-slate-500">
                  Digunakan untuk penilaian capaian kompetensi & narasi rapor otomatis.
                </p>
              </div>
              <button onClick={() => setTpModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Mode Input Switcher (Hanya saat tambah baru) */}
            {!editingTp && (
              <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
                <button
                  type="button"
                  onClick={() => setTpInputMode('single')}
                  className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                    tpInputMode === 'single'
                      ? 'bg-white text-teal-700 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Satu per Satu</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTpInputMode('bulk_text')}
                  className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                    tpInputMode === 'bulk_text'
                      ? 'bg-white text-teal-700 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <ListPlus className="w-3.5 h-3.5" />
                  <span>Tempel Teks Massal (Multi-Baris)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTpInputMode('bulk_table')}
                  className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                    tpInputMode === 'bulk_table'
                      ? 'bg-white text-teal-700 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  <span>Tabel Grid Massal</span>
                </button>
              </div>
            )}

            <form onSubmit={handleSaveTp} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Tingkat Kelas *</label>
                  <select
                    required
                    value={tpForm.grade_level_id}
                    onChange={(e) => setTpForm({ ...tpForm, grade_level_id: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="">-- Pilih Tingkat --</option>
                    {gradeLevels.map(gl => (
                      <option key={gl.id} value={gl.id}>{gl.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Mata Pelajaran *</label>
                  <select
                    required
                    value={tpForm.subject_id}
                    onChange={(e) => setTpForm({ ...tpForm, subject_id: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="">-- Pilih Mapel --</option>
                    {subjectsList.map(s => (
                      <option key={s.id} value={s.id}>{s.name} ({s.code || '-'})</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 1. SINGLE MODE / EDIT MODE */}
              {(editingTp || tpInputMode === 'single') && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">Kode TP *</label>
                      <input
                        type="text"
                        required
                        value={tpForm.code}
                        onChange={(e) => setTpForm({ ...tpForm, code: e.target.value })}
                        placeholder="Contoh: TP 1"
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 font-bold"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">Nomor Urut</label>
                      <input
                        type="number"
                        min={1}
                        value={tpForm.order_index}
                        onChange={(e) => setTpForm({ ...tpForm, order_index: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">Semester</label>
                      <select
                        value={tpForm.semester_id}
                        onChange={(e) => setTpForm({ ...tpForm, semester_id: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                      >
                        <option value="">Semua Semester</option>
                        {semestersList.map(sem => (
                          <option key={sem.id} value={sem.id}>Semester {sem.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Deskripsi Tujuan Pembelajaran (Capaian Kompetensi) *
                    </label>
                    <textarea
                      required
                      rows={3}
                      value={tpForm.description}
                      onChange={(e) => setTpForm({ ...tpForm, description: e.target.value })}
                      placeholder="Contoh: Memahami konsep bilangan bulat, operasi hitung campuran, dan penerapannya dalam menyelesaikan masalah sehari-hari..."
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-800"
                    />
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Teks ini akan otomatis dirangkai menjadi kalimat deskripsi capaian rapor saat proses kalkulasi nilai akhir.
                    </p>
                  </div>
                </>
              )}

              {/* 2. BULK TEXT / PASTE MODE */}
              {!editingTp && tpInputMode === 'bulk_text' && (
                <div className="space-y-3 bg-teal-50/40 p-4 rounded-xl border border-teal-100">
                  <div className="flex items-center justify-between">
                    <label className="block text-[11px] font-bold text-teal-900">
                      Tempel Daftar Tujuan Pembelajaran (1 Baris = 1 TP) *
                    </label>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-semibold text-slate-500">Semester default:</span>
                      <select
                        value={tpForm.semester_id}
                        onChange={(e) => setTpForm({ ...tpForm, semester_id: e.target.value })}
                        className="text-[11px] px-2 py-0.5 border border-slate-300 rounded-md bg-white"
                      >
                        <option value="">Semua Semester</option>
                        {semestersList.map(sem => (
                          <option key={sem.id} value={sem.id}>Semester {sem.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <textarea
                    required
                    rows={6}
                    value={bulkTpText}
                    onChange={(e) => setBulkTpText(e.target.value)}
                    placeholder={`Contoh tempel teks langsung:\nTP 1: Memahami konsep dasar bilangan bulat dan operasinya\nTP 2: Menerapkan rumus aljabar dalam pemecahan masalah nyata\nTP 3: Menyajikan dan menganalisis data dalam bentuk diagram batang`}
                    className="w-full px-3 py-2.5 font-mono text-xs border border-teal-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-800 leading-relaxed"
                  />
                  <div className="text-[10px] text-slate-500 flex items-center justify-between">
                    <span>Tips: Anda bisa menyalin langsung dari Excel / Word / RPP. Format kode akan otomatis diparsing.</span>
                    <span className="font-bold text-teal-700">
                      {bulkTpText.split('\n').filter(l => l.trim().length > 0).length} TP terdeteksi
                    </span>
                  </div>
                </div>
              )}

              {/* 3. BULK TABLE GRID MODE */}
              {!editingTp && tpInputMode === 'bulk_table' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-700">Daftar Baris TP Massal:</span>
                    <button
                      type="button"
                      onClick={handleAddBulkTpRow}
                      className="px-2.5 py-1 bg-teal-50 hover:bg-teal-100 text-teal-700 border border-teal-200 rounded-lg text-xs font-semibold flex items-center gap-1 transition"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Tambah Baris</span>
                    </button>
                  </div>

                  <div className="border border-slate-200 rounded-xl overflow-hidden max-h-60 overflow-y-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 sticky top-0 z-10">
                        <tr>
                          <th className="py-2 px-3 w-20">Kode</th>
                          <th className="py-2 px-3">Deskripsi Tujuan Pembelajaran</th>
                          <th className="py-2 px-3 w-28">Semester</th>
                          <th className="py-2 px-2 w-10 text-center">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {bulkTpRows.map((row, index) => (
                          <tr key={index} className="hover:bg-slate-50/50">
                            <td className="py-2 px-2">
                              <input
                                type="text"
                                value={row.code}
                                onChange={(e) => handleUpdateBulkTpRow(index, 'code', e.target.value)}
                                placeholder="TP 1"
                                className="w-full px-2 py-1 border border-slate-200 rounded-lg font-bold text-xs"
                              />
                            </td>
                            <td className="py-2 px-2">
                              <input
                                type="text"
                                value={row.description}
                                onChange={(e) => handleUpdateBulkTpRow(index, 'description', e.target.value)}
                                placeholder="Deskripsi capaian kompetensi pembelajaran..."
                                className="w-full px-2 py-1 border border-slate-200 rounded-lg text-xs"
                              />
                            </td>
                            <td className="py-2 px-2">
                              <select
                                value={row.semester_id}
                                onChange={(e) => handleUpdateBulkTpRow(index, 'semester_id', e.target.value)}
                                className="w-full px-2 py-1 border border-slate-200 rounded-lg text-[11px] bg-white"
                              >
                                <option value="">Semua Sem.</option>
                                {semestersList.map(sem => (
                                  <option key={sem.id} value={sem.id}>Sem. {sem.name}</option>
                                ))}
                              </select>
                            </td>
                            <td className="py-2 px-2 text-center">
                              {bulkTpRows.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveBulkTpRow(index)}
                                  className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="pt-3 flex justify-end gap-2 border-t">
                <button
                  type="button"
                  onClick={() => setTpModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 disabled:bg-teal-400 text-white rounded-xl font-semibold shadow-sm transition flex items-center gap-1.5"
                >
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  <span>
                    {editingTp
                      ? 'Simpan Perubahan'
                      : tpInputMode === 'bulk_text'
                      ? 'Simpan Semua TP Massal'
                      : tpInputMode === 'bulk_table'
                      ? 'Simpan Semua Baris TP'
                      : 'Simpan Tujuan Pembelajaran'}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}


      {/* --- MODAL TAMBAH EKSTRAKURIKULER --- */}
      {extraModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b">
              <h3 className="text-sm font-bold text-slate-800">Tambah Cabang Ekstrakurikuler</h3>
              <button onClick={() => setExtraModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveExtra} className="space-y-4 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Nama Cabang Ekstrakurikuler *</label>
                <input
                  type="text"
                  required
                  value={extraForm.name}
                  onChange={(e) => setExtraForm({ ...extraForm, name: e.target.value })}
                  placeholder="Contoh: Pramuka, Futsal, Robotik, Panahan, Tahfidz Club"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Jadwal Rutin Latihan</label>
                <input
                  type="text"
                  value={extraForm.schedule}
                  onChange={(e) => setExtraForm({ ...extraForm, schedule: e.target.value })}
                  placeholder="Contoh: Setiap Sabtu 08.00 - 10.00"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setExtraModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 disabled:bg-teal-400 text-white rounded-xl font-semibold shadow-sm transition flex items-center gap-1.5"
                >
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  <span>Simpan Cabang Ekskul</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL PENUGASAN GURU (TUGAS MENGAJAR & EKSKUL) --- */}
      {dutyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b">
              <div>
                <h3 className="text-sm font-bold text-slate-800">Tugaskan Guru / Pembina</h3>
                <p className="text-[11px] text-slate-500">Tahun Ajaran: {academicYears.find(y => y.id == selectedAcademicYearId)?.name}</p>
              </div>
              <button onClick={() => setDutyModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveDuty} className="space-y-4 text-xs">
              <div className="flex items-center gap-3">
                <label className="text-[11px] font-semibold text-slate-700">Tipe Tugas:</label>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="duty_type"
                      value="mapel"
                      checked={dutyForm.type === 'mapel'}
                      onChange={() => setDutyForm({ ...dutyForm, type: 'mapel', class_group_ids: [] })}
                      className="text-teal-600 focus:ring-teal-500"
                    />
                    <span className="font-semibold text-slate-800">Mata Pelajaran</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="duty_type"
                      value="ekskul"
                      checked={dutyForm.type === 'ekskul'}
                      onChange={() => setDutyForm({ ...dutyForm, type: 'ekskul', class_group_ids: [] })}
                      className="text-teal-600 focus:ring-teal-500"
                    />
                    <span className="font-semibold text-slate-800">Ekstrakurikuler</span>
                  </label>
                </div>
              </div>

              {dutyForm.type === 'mapel' ? (
                <div className="relative">
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Pilih Mata Pelajaran *</label>
                  {/* Selected Box / Trigger */}
                  <div
                    onClick={() => setSubjectDropdownOpen(!subjectDropdownOpen)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white hover:border-teal-400 cursor-pointer flex items-center justify-between transition shadow-2xs"
                  >
                    <span className={`text-xs ${dutyForm.subject_id ? 'font-bold text-slate-800' : 'text-slate-400'}`}>
                      {dutyForm.subject_id
                        ? `${subjectsList.find(s => String(s.id) === String(dutyForm.subject_id))?.name || 'Pilih Mata Pelajaran'} (${subjectsList.find(s => String(s.id) === String(dutyForm.subject_id))?.code || '-'})`
                        : '-- Cari & Pilih Mata Pelajaran --'}
                    </span>
                    <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${subjectDropdownOpen ? 'rotate-180 text-teal-600' : ''}`} />
                  </div>

                  {/* Dropdown Menu with Live Search */}
                  {subjectDropdownOpen && (
                    <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl z-50 p-2 space-y-1.5 animate-in fade-in zoom-in-95 duration-100">
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          autoFocus
                          value={subjectSearch}
                          onChange={(e) => setSubjectSearch(e.target.value)}
                          placeholder="Ketik nama atau kode mapel..."
                          className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500 focus:bg-white"
                        />
                      </div>
                      <div className="max-h-48 overflow-y-auto divide-y divide-slate-50">
                        {subjectsList
                          .filter(s => {
                            if (!subjectSearch) return true;
                            const q = subjectSearch.toLowerCase();
                            return (
                              s.name.toLowerCase().includes(q) ||
                              (s.code && s.code.toLowerCase().includes(q)) ||
                              (s.grade_level_name && s.grade_level_name.toLowerCase().includes(q))
                            );
                          })
                          .map(s => {
                            const isSelected = String(s.id) === String(dutyForm.subject_id);
                            return (
                              <button
                                key={s.id}
                                type="button"
                                onClick={() => {
                                  setDutyForm({ ...dutyForm, subject_id: s.id, class_group_ids: [] });
                                  setSubjectDropdownOpen(false);
                                  setSubjectSearch('');
                                }}
                                className={`w-full px-2.5 py-2 rounded-lg text-left text-xs flex items-center justify-between transition ${
                                  isSelected ? 'bg-teal-50 text-teal-900 font-bold' : 'hover:bg-slate-50 text-slate-700'
                                }`}
                              >
                                <div>
                                  <div className="font-semibold">{s.name}</div>
                                  <div className="text-[10px] text-slate-400">Kode: {s.code || '-'} • {s.grade_level_name || 'Semua Tingkat'}</div>
                                </div>
                                {isSelected && <Check className="w-4 h-4 text-teal-600 shrink-0" />}
                              </button>
                            );
                          })}
                        {subjectsList.filter(s => {
                          if (!subjectSearch) return true;
                          const q = subjectSearch.toLowerCase();
                          return s.name.toLowerCase().includes(q) || (s.code && s.code.toLowerCase().includes(q));
                        }).length === 0 && (
                          <div className="py-4 text-center text-slate-400 text-xs">
                            Tidak ditemukan mata pelajaran "{subjectSearch}"
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="relative">
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Pilih Cabang Ekstrakurikuler *</label>
                  {/* Selected Box / Trigger */}
                  <div
                    onClick={() => setExtraDropdownOpen(!extraDropdownOpen)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white hover:border-teal-400 cursor-pointer flex items-center justify-between transition shadow-2xs"
                  >
                    <span className={`text-xs ${dutyForm.extracurricular_id ? 'font-bold text-slate-800' : 'text-slate-400'}`}>
                      {dutyForm.extracurricular_id
                        ? extrasList.find(ex => String(ex.id) === String(dutyForm.extracurricular_id))?.name || 'Pilih Ekstrakurikuler'
                        : '-- Cari & Pilih Ekstrakurikuler --'}
                    </span>
                    <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${extraDropdownOpen ? 'rotate-180 text-teal-600' : ''}`} />
                  </div>

                  {/* Dropdown Menu with Live Search */}
                  {extraDropdownOpen && (
                    <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl z-50 p-2 space-y-1.5 animate-in fade-in zoom-in-95 duration-100">
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          autoFocus
                          value={extraSearch}
                          onChange={(e) => setExtraSearch(e.target.value)}
                          placeholder="Ketik nama ekskul..."
                          className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500 focus:bg-white"
                        />
                      </div>
                      <div className="max-h-48 overflow-y-auto divide-y divide-slate-50">
                        {extrasList
                          .filter(ex => {
                            if (!extraSearch) return true;
                            return ex.name.toLowerCase().includes(extraSearch.toLowerCase());
                          })
                          .map(ex => {
                            const isSelected = String(ex.id) === String(dutyForm.extracurricular_id);
                            return (
                              <button
                                key={ex.id}
                                type="button"
                                onClick={() => {
                                  setDutyForm({ ...dutyForm, extracurricular_id: ex.id, class_group_ids: [] });
                                  setExtraDropdownOpen(false);
                                  setExtraSearch('');
                                }}
                                className={`w-full px-2.5 py-2 rounded-lg text-left text-xs flex items-center justify-between transition ${
                                  isSelected ? 'bg-teal-50 text-teal-900 font-bold' : 'hover:bg-slate-50 text-slate-700'
                                }`}
                              >
                                <div className="font-semibold">{ex.name}</div>
                                {isSelected && <Check className="w-4 h-4 text-teal-600 shrink-0" />}
                              </button>
                            );
                          })}
                        {extrasList.filter(ex => {
                          if (!extraSearch) return true;
                          return ex.name.toLowerCase().includes(extraSearch.toLowerCase());
                        }).length === 0 && (
                          <div className="py-4 text-center text-slate-400 text-xs">
                            Tidak ditemukan ekskul "{extraSearch}"
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Small Grid Multichoice Rombel */}
              <div>
                {(() => {
                  // Filter rombel berdasarkan tipe tugas
                  let candidateClassGroups = (Array.isArray(classGroups) ? classGroups : []).filter(cg => {
                    if (dutyForm.type === 'ekskul') {
                      return cg.type === 'ekstrakurikuler';
                    } else {
                      // Mapel: hanya rombel reguler / kelas (bukan ekskul)
                      return cg.type !== 'ekstrakurikuler';
                    }
                  });

                  // Cari rombel yang sudah ditugaskan untuk mapel / ekskul yang dipilih pada tahun ajaran ini
                  const assignedDuties = (Array.isArray(dataList) ? dataList : []).filter(d => {
                    if (d.type !== dutyForm.type) return false;
                    if (dutyForm.type === 'mapel') {
                      return String(d.subject_id) === String(dutyForm.subject_id);
                    } else {
                      return String(d.extracurricular_id) === String(dutyForm.extracurricular_id);
                    }
                  });

                  // Map guru-guru yang sudah terdaftar di setiap rombel untuk mapel/ekskul ini
                  const rombelTeachersMap = {};
                  assignedDuties.forEach(d => {
                    if (d.class_group_id) {
                      if (!rombelTeachersMap[d.class_group_id]) {
                        rombelTeachersMap[d.class_group_id] = [];
                      }
                      rombelTeachersMap[d.class_group_id].push({
                        teacher_id: d.teacher_employee_id,
                        teacher_name: d.teacher_name || 'Guru'
                      });
                    }
                  });

                  const availableRombels = candidateClassGroups.filter(cg => {
                    const teachersInRombel = rombelTeachersMap[cg.id] || [];
                    // Rombel tidak tersedia hanya jika guru yang SAMA sudah ditugaskan
                    return !teachersInRombel.some(t => String(t.teacher_id) === String(dutyForm.teacher_employee_id));
                  });
                  const availableIds = availableRombels.map(cg => cg.id);
                  const isAllSelected = availableIds.length > 0 && availableIds.every(id => dutyForm.class_group_ids.includes(id));

                  return (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="block text-[11px] font-semibold text-slate-700">
                          Pilih Rombel / Kelas yang Diajarkan * ({dutyForm.class_group_ids.length} dipilih)
                        </label>
                        {availableIds.length > 0 && (
                          <button
                            type="button"
                            onClick={() => handleSelectAllClassGroups(availableIds)}
                            className="text-[11px] font-bold text-teal-600 hover:text-teal-800 transition"
                          >
                            {isAllSelected ? 'Batal Pilih Semua' : 'Pilih Semua Rombel Tersedia'}
                          </button>
                        )}
                      </div>

                      {candidateClassGroups.length === 0 ? (
                        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center text-slate-400 text-xs">
                          {dutyForm.type === 'ekskul'
                            ? 'Belum ada rombel khusus ekstrakurikuler. Atur tipe rombel di menu Rombel.'
                            : 'Belum ada rombel kelas yang terdaftar.'}
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto p-1.5 bg-slate-50/70 border border-slate-200 rounded-xl">
                          {candidateClassGroups.map(cg => {
                            const teachersInRombel = rombelTeachersMap[cg.id] || [];
                            const isSameTeacherAssigned = teachersInRombel.some(t => String(t.teacher_id) === String(dutyForm.teacher_employee_id));
                            const isSelected = dutyForm.class_group_ids.includes(cg.id);

                            if (isSameTeacherAssigned) {
                              return (
                                <div
                                  key={cg.id}
                                  title={`Guru terpilih sudah ditugaskan pada rombel ini`}
                                  className="p-2 rounded-lg border border-slate-200 bg-slate-100 opacity-60 cursor-not-allowed flex items-start justify-between text-left"
                                >
                                  <div className="overflow-hidden">
                                    <div className="font-bold text-slate-500 text-[11px] truncate">{cg.name}</div>
                                    <div className="text-[9px] text-amber-700 font-semibold truncate">
                                      Sudah Diampu Guru Ini
                                    </div>
                                  </div>
                                  <span className="text-[9px] bg-slate-200 text-slate-500 font-bold px-1.5 py-0.5 rounded ml-1 shrink-0">
                                    Terisi
                                  </span>
                                </div>
                              );
                            }

                            return (
                              <button
                                key={cg.id}
                                type="button"
                                onClick={() => handleToggleClassGroup(cg.id)}
                                className={`p-2 rounded-lg border text-left transition flex items-center justify-between ${
                                  isSelected
                                    ? 'bg-teal-50 border-teal-500 ring-1 ring-teal-500 text-teal-900 shadow-2xs'
                                    : 'bg-white border-slate-200 hover:border-teal-300 text-slate-700'
                                }`}
                              >
                                <div className="overflow-hidden">
                                  <div className="font-bold text-xs truncate">{cg.name}</div>
                                  <div className="text-[10px] text-slate-400">
                                    {cg.grade_level_name ? `Tk. ${cg.grade_level_name}` : (cg.type === 'ekstrakurikuler' ? 'Ekskul' : 'Reguler')}
                                    {teachersInRombel.length > 0 && (
                                      <span className="text-teal-700 font-semibold block truncate">
                                        + {teachersInRombel.map(t => t.teacher_name).join(', ')}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ml-1.5 ${
                                  isSelected ? 'bg-teal-600 border-teal-600 text-white' : 'border-slate-300 bg-white'
                                }`}>
                                  {isSelected && <span className="text-[10px] font-black leading-none">✓</span>}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}
                      <p className="text-[10px] text-slate-400">
                        * Satu mata pelajaran dapat diampu lebih dari satu guru (Team Teaching / Paralel). Sistem otomatis memvalidasi jadwal agar tidak terjadi bentrok jam mengajar pada guru yang sama.
                      </p>
                    </div>
                  );
                })()}
              </div>


              {/* SEARCHABLE TEACHER DROPDOWN */}
              <div className="relative">
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-semibold text-slate-700">Pilih Guru / Pegawai *</label>
                  <label className="flex items-center gap-1.5 cursor-pointer select-none text-[10px] text-teal-700 font-bold bg-teal-50 hover:bg-teal-100 px-2 py-0.5 rounded-md border border-teal-200 transition">
                    <input
                      type="checkbox"
                      checked={crossUnitTeacher}
                      onChange={(e) => setCrossUnitTeacher(e.target.checked)}
                      className="rounded text-teal-600 focus:ring-0 w-3 h-3"
                    />
                    <span>Lintas Satuan Pendidikan</span>
                  </label>
                </div>

                {/* Selected Trigger */}
                <div
                  onClick={() => setTeacherDropdownOpen(!teacherDropdownOpen)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white hover:border-teal-400 cursor-pointer flex items-center justify-between transition shadow-2xs"
                >
                  <span className={`text-xs ${dutyForm.teacher_employee_id ? 'font-bold text-slate-800' : 'text-slate-400'}`}>
                    {dutyForm.teacher_employee_id
                      ? (() => {
                          const emp = employees.find(e => String(e.id) === String(dutyForm.teacher_employee_id));
                          if (!emp) return 'Pilih Guru / Pembina';
                          const unit = schoolUnitsList.find(u => String(u.id) === String(emp.school_unit_id));
                          const unitLabel = unit ? ` • ${unit.name}` : '';
                          return `${emp.full_name} (${emp.nip || emp.employee_code || emp.employee_number || 'Guru'}${unitLabel})`;
                        })()
                      : '-- Cari & Pilih Guru / Pembina --'}
                  </span>
                  <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${teacherDropdownOpen ? 'rotate-180 text-teal-600' : ''}`} />
                </div>

                {/* Dropdown Menu with Live Search */}
                {teacherDropdownOpen && (
                  <div className="absolute bottom-full mb-1.5 sm:bottom-auto sm:top-full sm:mt-1.5 left-0 right-0 bg-white border border-slate-200 rounded-xl shadow-xl z-50 p-2 space-y-1.5 animate-in fade-in zoom-in-95 duration-100">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        autoFocus
                        value={teacherSearch}
                        onChange={(e) => setTeacherSearch(e.target.value)}
                        placeholder="Ketik nama guru, NIP, atau unit sekolah..."
                        className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500 focus:bg-white"
                      />
                    </div>
                    <div className="max-h-48 overflow-y-auto divide-y divide-slate-50">
                      {(Array.isArray(employees) ? employees : [])
                        .filter(emp => {
                          // Jika filter lintas unit dimatikan, hanya tampilkan guru dari unit aktif
                          if (!crossUnitTeacher && activeSchoolUnit?.id && emp.school_unit_id && String(emp.school_unit_id) !== String(activeSchoolUnit.id)) {
                            return false;
                          }
                          if (!teacherSearch) return true;
                          const q = teacherSearch.toLowerCase();
                          const unit = schoolUnitsList.find(u => String(u.id) === String(emp.school_unit_id));
                          const unitName = unit ? unit.name.toLowerCase() : '';

                          return (
                            (emp.full_name && emp.full_name.toLowerCase().includes(q)) ||
                            (emp.nip && emp.nip.toLowerCase().includes(q)) ||
                            (emp.employee_code && emp.employee_code.toLowerCase().includes(q)) ||
                            (emp.employee_number && emp.employee_number.toLowerCase().includes(q)) ||
                            unitName.includes(q)
                          );
                        })
                        .map(emp => {
                          const isSelected = String(emp.id) === String(dutyForm.teacher_employee_id);
                          const unit = schoolUnitsList.find(u => String(u.id) === String(emp.school_unit_id));
                          const isCrossUnit = activeSchoolUnit?.id && emp.school_unit_id && String(emp.school_unit_id) !== String(activeSchoolUnit.id);

                          return (
                            <button
                              key={emp.id}
                              type="button"
                              onClick={() => {
                                setDutyForm({ ...dutyForm, teacher_employee_id: emp.id });
                                setTeacherDropdownOpen(false);
                                setTeacherSearch('');
                              }}
                              className={`w-full px-2.5 py-2 rounded-lg text-left text-xs flex items-center justify-between transition ${
                                isSelected ? 'bg-teal-50 text-teal-900 font-bold' : 'hover:bg-slate-50 text-slate-700'
                              }`}
                            >
                              <div className="overflow-hidden pr-2">
                                <div className="font-semibold flex items-center gap-1.5 flex-wrap">
                                  <span>{emp.full_name}</span>
                                  {isCrossUnit && (
                                    <span className="px-1.5 py-0.2 bg-purple-50 text-purple-700 border border-purple-200 text-[9px] rounded font-bold">
                                      Lintas Unit: {unit?.name || `Unit #${emp.school_unit_id}`}
                                    </span>
                                  )}
                                  {!isCrossUnit && unit && (
                                    <span className="px-1.5 py-0.2 bg-slate-100 text-slate-600 text-[9px] rounded font-medium">
                                      {unit.name}
                                    </span>
                                  )}
                                </div>
                                <div className="text-[10px] text-slate-400 mt-0.5">
                                  NIP/Kode: {emp.nip || emp.employee_code || emp.employee_number || '-'} • {emp.position_name || 'Guru'}
                                </div>
                              </div>
                              {isSelected && <Check className="w-4 h-4 text-teal-600 shrink-0" />}
                            </button>
                          );
                        })}
                      {(Array.isArray(employees) ? employees : []).filter(emp => {
                        if (!crossUnitTeacher && activeSchoolUnit?.id && emp.school_unit_id && String(emp.school_unit_id) !== String(activeSchoolUnit.id)) {
                          return false;
                        }
                        if (!teacherSearch) return true;
                        const q = teacherSearch.toLowerCase();
                        return (
                          (emp.full_name && emp.full_name.toLowerCase().includes(q)) ||
                          (emp.nip && emp.nip.toLowerCase().includes(q))
                        );
                      }).length === 0 && (
                        <div className="py-4 text-center text-slate-400 text-xs">
                          Tidak ditemukan guru "{teacherSearch}"
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>



              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Peran / Jabatan Penugasan</label>
                  <input
                    type="text"
                    value={dutyForm.role_description}
                    onChange={(e) => setDutyForm({ ...dutyForm, role_description: e.target.value })}
                    placeholder="Contoh: Guru Utama, Guru Pendamping"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Beban Diampu (JP / Pekan) *
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={dutyForm.allocated_hours || 2}
                    onChange={(e) => setDutyForm({ ...dutyForm, allocated_hours: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold text-teal-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Keterangan / Alasan Penugasan * (Wajib Dicatat ke Riwayat)
                </label>
                <textarea
                  required
                  rows={2}
                  value={dutyForm.reason}
                  onChange={(e) => setDutyForm({ ...dutyForm, reason: e.target.value })}
                  placeholder="Contoh: Penugasan awal tahun ajaran, Tambahan guru paralel, Penggantian pengampu"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setDutyModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 disabled:bg-teal-400 text-white rounded-xl font-semibold shadow-sm transition flex items-center gap-1.5"
                >
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  <span>Simpan Penugasan Guru</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL HAPUS PENUGASAN GURU (WAJIB ISI ALASAN) --- */}
      {deleteDutyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-100 space-y-4">
            <div className="flex items-center gap-3 text-red-600 pb-2 border-b">
              <ShieldAlert className="w-6 h-6 shrink-0" />
              <div>
                <h3 className="text-sm font-bold text-slate-800">Hapus Penugasan Guru</h3>
                <p className="text-xs text-slate-500">
                  {dutyToDelete?.teacher_name} ({dutyToDelete?.type === 'mapel' ? dutyToDelete?.subject_name : dutyToDelete?.extracurricular_name})
                </p>
              </div>
            </div>

            <form onSubmit={handleConfirmDeleteDuty} className="space-y-4 text-xs">
              <p className="text-slate-600 leading-relaxed">
                Penghapusan guru pengampu akan dicatat ke dalam audit log riwayat kepegawaian & kurikulum. Mohon masukkan alasan penghapusan tugas:
              </p>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Alasan Penghapusan Penugasan *
                </label>
                <textarea
                  required
                  rows={3}
                  value={deleteReason}
                  onChange={(e) => setDeleteReason(e.target.value)}
                  placeholder="Contoh: Guru cuti melahirkan / digantikan oleh Guru B / penyesuaian beban jam mengajar..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 text-slate-800"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setDeleteDutyModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving || !deleteReason.trim()}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white rounded-xl font-semibold shadow-sm transition flex items-center gap-1.5"
                >
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  <span>Konfirmasi Hapus Tugas</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL PENETAPAN / PERGANTIAN GURU PER PEMBELAJARAN (QUICK ASSIGN LIVE SEARCH) --- */}
      {quickAssignModalOpen && quickAssignPair && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-100 space-y-4 max-h-[92vh] overflow-y-auto animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-teal-600 text-white flex items-center justify-center font-bold shadow-md">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-800">
                    {quickAssignPair.is_assigned ? 'Penyesuaian Guru Pengampu' : 'Penetapan Guru Pengampu'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {quickAssignPair.type === 'mapel' ? (
                      <span>
                        Mapel: <strong className="text-teal-700">{quickAssignPair.subject?.name}</strong> • Rombel: <strong className="text-indigo-700">{quickAssignPair.class_group?.name}</strong>
                      </span>
                    ) : (
                      <span>
                        Ekskul: <strong className="text-amber-700">{quickAssignPair.extra?.name}</strong> (Global / Seluruh Rombel)
                      </span>
                    )}
                  </p>
                </div>
              </div>
              <button onClick={() => setQuickAssignModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* STANDAR JP STRUKTUR KURIKULUM CARD */}
            <div className="p-3 bg-gradient-to-r from-teal-50 to-indigo-50 border border-teal-200 rounded-xl text-xs flex items-center justify-between gap-2">
              <div>
                <span className="text-[10px] uppercase font-black text-teal-800 tracking-wider block">Standar Beban Struktur Kurikulum:</span>
                <span className="font-black text-teal-950 text-sm">
                  {quickAssignPair.curriculumJp} JP / Pekan
                </span>
                <span className="text-[10px] text-slate-500 block">
                  {quickAssignPair.class_group?.grade_level_name ? `Jenjang Kelas ${quickAssignPair.class_group.grade_level_name}` : 'Kurikulum Sekolah'}
                </span>
              </div>
              <span className="px-2.5 py-1 bg-teal-600 text-white rounded-lg font-black text-[11px] shadow-2xs">
                {quickAssignPair.curriculumJp} JP Baku
              </span>
            </div>

            {/* PILIHAN MODE PENUGASAN: 1 GURU vs 2 GURU */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1.5">Model Penugasan Pengampu:</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setQuickAssignForm({
                    ...quickAssignForm,
                    assign_mode: 'single',
                    allocated_hours: quickAssignPair.curriculumJp || 2
                  })}
                  className={`py-2 px-3 rounded-xl font-black text-xs border transition flex items-center justify-center gap-1.5 ${
                    quickAssignForm.assign_mode === 'single'
                      ? 'bg-teal-600 text-white border-teal-700 shadow-sm ring-2 ring-teal-400'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <User className="w-3.5 h-3.5" />
                  <span>1 Guru Tunggal (Penuh)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setQuickAssignForm({
                    ...quickAssignForm,
                    assign_mode: 'split',
                    allocated_hours_1: quickAssignForm.allocated_hours_1 || Math.ceil((quickAssignPair.curriculumJp || 4) / 2),
                    allocated_hours_2: quickAssignForm.allocated_hours_2 || Math.max(1, (quickAssignPair.curriculumJp || 4) - Math.ceil((quickAssignPair.curriculumJp || 4) / 2))
                  })}
                  className={`py-2 px-3 rounded-xl font-black text-xs border transition flex items-center justify-center gap-1.5 ${
                    quickAssignForm.assign_mode === 'split'
                      ? 'bg-indigo-600 text-white border-indigo-700 shadow-sm ring-2 ring-indigo-400'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>2 Guru (Pembagian JP)</span>
                </button>
              </div>
            </div>

            <form onSubmit={handleSaveQuickAssign} className="space-y-4 text-xs">
              {/* MODE 1: GURU TUNGGAL */}
              {quickAssignForm.assign_mode === 'single' && (
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                  <div className="relative">
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-[11px] font-bold text-slate-700">Pilih Guru Pengampu *</label>
                      <label className="flex items-center gap-1.5 cursor-pointer select-none text-[10px] text-teal-700 font-bold bg-teal-50 hover:bg-teal-100 px-2 py-0.5 rounded-md border border-teal-200 transition">
                        <input
                          type="checkbox"
                          checked={crossUnitTeacher}
                          onChange={(e) => setCrossUnitTeacher(e.target.checked)}
                          className="rounded text-teal-600 focus:ring-0 w-3 h-3"
                        />
                        <span>Lintas Satuan</span>
                      </label>
                    </div>

                    <SearchableSelect
                      options={(Array.isArray(employees) ? employees : [])
                        .filter(emp => {
                          if (!crossUnitTeacher && activeSchoolUnit?.id && emp.school_unit_id && String(emp.school_unit_id) !== String(activeSchoolUnit.id)) {
                            return false;
                          }
                          return true;
                        })
                        .map(emp => {
                          const unit = schoolUnitsList.find(u => String(u.id) === String(emp.school_unit_id));
                          const unitLabel = unit ? ` • ${unit.name}` : '';
                          return {
                            value: String(emp.id),
                            label: emp.full_name,
                            sublabel: `NIP/Kode: ${emp.nip || emp.employee_code || emp.employee_number || '-'}${unitLabel}`
                          };
                        })}
                      value={String(quickAssignForm.teacher_employee_id || '')}
                      onChange={(val) => setQuickAssignForm({ ...quickAssignForm, teacher_employee_id: val })}
                      placeholder="-- Cari Nama Guru, NIP, atau Satuan Pendidikan --"
                      searchPlaceholder="Ketik nama guru atau NIP..."
                      emptyText="Guru tidak ditemukan"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Beban Diampu (JP / Pekan) *</label>
                      <input
                        type="number"
                        min={1}
                        max={20}
                        value={quickAssignForm.allocated_hours || quickAssignPair.curriculumJp || 2}
                        onChange={(e) => setQuickAssignForm({ ...quickAssignForm, allocated_hours: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl font-black text-teal-900 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                        required
                      />
                      <span className="text-[10px] text-slate-500">Standar Kurikulum: {quickAssignPair.curriculumJp} JP</span>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Peran Penugasan</label>
                      <input
                        type="text"
                        value={quickAssignForm.role_description}
                        onChange={(e) => setQuickAssignForm({ ...quickAssignForm, role_description: e.target.value })}
                        placeholder="Contoh: Guru Pengampu"
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* MODE 2: DUA GURU (TEAM TEACHING / PEMBAGIAN JP) */}
              {quickAssignForm.assign_mode === 'split' && (() => {
                const jp1 = parseInt(quickAssignForm.allocated_hours_1, 10) || 0;
                const jp2 = parseInt(quickAssignForm.allocated_hours_2, 10) || 0;
                const totalSplit = jp1 + jp2;
                const targetJp = quickAssignPair.curriculumJp || 0;
                const isExact = totalSplit === targetJp;

                return (
                  <div className="space-y-3">
                    {/* GURU 1 */}
                    <div className="p-3.5 bg-indigo-50/60 rounded-2xl border border-indigo-200 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="font-black text-indigo-950 text-xs">👨‍🏫 Guru Pengampu 1</span>
                        <span className="px-2 py-0.5 bg-indigo-600 text-white rounded font-bold text-[10px]">
                          {jp1} JP
                        </span>
                      </div>

                      <SearchableSelect
                        options={(Array.isArray(employees) ? employees : []).map(emp => ({
                          value: String(emp.id),
                          label: emp.full_name,
                          sublabel: `NIP: ${emp.nip || '-'}`
                        }))}
                        value={String(quickAssignForm.teacher_employee_id_1 || '')}
                        onChange={(val) => setQuickAssignForm({ ...quickAssignForm, teacher_employee_id_1: val })}
                        placeholder="-- Pilih Guru Pengampu 1 --"
                        searchPlaceholder="Ketik nama guru 1..."
                        emptyText="Guru tidak ditemukan"
                      />

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-700 mb-0.5">Alokasi JP Guru 1 *</label>
                          <input
                            type="number"
                            min={1}
                            max={20}
                            value={quickAssignForm.allocated_hours_1}
                            onChange={(e) => setQuickAssignForm({ ...quickAssignForm, allocated_hours_1: e.target.value })}
                            className="w-full px-2.5 py-1.5 border border-indigo-300 rounded-lg font-black text-indigo-950 bg-white text-xs"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-700 mb-0.5">Peran / Keterangan</label>
                          <input
                            type="text"
                            value={quickAssignForm.role_description_1}
                            onChange={(e) => setQuickAssignForm({ ...quickAssignForm, role_description_1: e.target.value })}
                            placeholder="misal: Guru Pengampu 1"
                            className="w-full px-2.5 py-1.5 border border-indigo-300 rounded-lg text-slate-800 bg-white text-xs"
                          />
                        </div>
                      </div>
                    </div>

                    {/* GURU 2 */}
                    <div className="p-3.5 bg-purple-50/60 rounded-2xl border border-purple-200 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="font-black text-purple-950 text-xs">👨‍🏫 Guru Pengampu 2</span>
                        <span className="px-2 py-0.5 bg-purple-600 text-white rounded font-bold text-[10px]">
                          {jp2} JP
                        </span>
                      </div>

                      <SearchableSelect
                        options={(Array.isArray(employees) ? employees : []).map(emp => ({
                          value: String(emp.id),
                          label: emp.full_name,
                          sublabel: `NIP: ${emp.nip || '-'}`
                        }))}
                        value={String(quickAssignForm.teacher_employee_id_2 || '')}
                        onChange={(val) => setQuickAssignForm({ ...quickAssignForm, teacher_employee_id_2: val })}
                        placeholder="-- Pilih Guru Pengampu 2 --"
                        searchPlaceholder="Ketik nama guru 2..."
                        emptyText="Guru tidak ditemukan"
                      />

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-700 mb-0.5">Alokasi JP Guru 2 *</label>
                          <input
                            type="number"
                            min={1}
                            max={20}
                            value={quickAssignForm.allocated_hours_2}
                            onChange={(e) => setQuickAssignForm({ ...quickAssignForm, allocated_hours_2: e.target.value })}
                            className="w-full px-2.5 py-1.5 border border-purple-300 rounded-lg font-black text-purple-950 bg-white text-xs"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-700 mb-0.5">Peran / Keterangan</label>
                          <input
                            type="text"
                            value={quickAssignForm.role_description_2}
                            onChange={(e) => setQuickAssignForm({ ...quickAssignForm, role_description_2: e.target.value })}
                            placeholder="misal: Guru Pengampu 2"
                            className="w-full px-2.5 py-1.5 border border-purple-300 rounded-lg text-slate-800 bg-white text-xs"
                          />
                        </div>
                      </div>
                    </div>

                    {/* LIVE VALIDATOR BREAKDOWN JP */}
                    <div className={`p-3 rounded-xl border flex items-center justify-between text-xs font-bold ${
                      isExact
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                        : 'bg-amber-50 border-amber-300 text-amber-900'
                    }`}>
                      <div>
                        <span>Total Terbagi: <b>{jp1} JP + {jp2} JP = {totalSplit} JP</b></span>
                        <span className="text-[10px] font-normal block text-slate-600">
                          Target Kuota Struktur Kurikulum: <b>{targetJp} JP / Pekan</b>
                        </span>
                      </div>
                      <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black ${
                        isExact ? 'bg-emerald-600 text-white' : 'bg-amber-500 text-white'
                      }`}>
                        {isExact ? '✓ Pas Sesuai Kurikulum' : `Selisih ${totalSplit - targetJp > 0 ? '+' : ''}${totalSplit - targetJp} JP`}
                      </span>
                    </div>
                  </div>
                );
              })()}

              {/* SK, ALASAN, CATATAN */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Nomor SK Penugasan (Opsional)</label>
                  <input
                    type="text"
                    value={quickAssignForm.sk_number}
                    onChange={(e) => setQuickAssignForm({ ...quickAssignForm, sk_number: e.target.value })}
                    placeholder="Contoh: 421/SK-DIR/2026/08"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Catatan Tambahan (Opsional)</label>
                  <input
                    type="text"
                    value={quickAssignForm.notes}
                    onChange={(e) => setQuickAssignForm({ ...quickAssignForm, notes: e.target.value })}
                    placeholder="Catatan penugasan..."
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Keterangan / Alasan Penetapan * <span className="text-slate-400 font-normal">(Wajib Dicatat ke Audit Log)</span>
                </label>
                <textarea
                  required
                  rows={2}
                  value={quickAssignForm.reason}
                  onChange={(e) => setQuickAssignForm({ ...quickAssignForm, reason: e.target.value })}
                  placeholder="Contoh: Penetapan guru kelas semester ganjil / Pembagian JP 2 guru..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setQuickAssignModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white rounded-xl font-bold shadow-md transition flex items-center gap-1.5"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span>Simpan Penugasan Guru</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL RIWAYAT & AUDIT LOG PENUGASAN GURU --- */}
      {logsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full p-6 shadow-xl border border-slate-100 space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-2 border-b">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-800">
                  Riwayat Penetapan, Perubahan & SK Penugasan Guru
                </h3>
              </div>
              <button onClick={() => setLogsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto max-h-[60vh]">
              {loadingLogs ? (
                <div className="py-12 text-center text-slate-400">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-600" />
                  <span>Memuat riwayat log penugasan...</span>
                </div>
              ) : dutyLogs.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  Belum ada catatan riwayat perubahan penugasan guru.
                </div>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 sticky top-0 z-10">
                    <tr>
                      <th className="py-2.5 px-3">Tanggal & Waktu</th>
                      <th className="py-2.5 px-3">Aksi</th>
                      <th className="py-2.5 px-3">Mata Pelajaran / Ekskul</th>
                      <th className="py-2.5 px-3">Rombel / Kelas</th>
                      <th className="py-2.5 px-3">Guru Baru / Pengampu</th>
                      <th className="py-2.5 px-3">Guru Sebelumnya</th>
                      <th className="py-2.5 px-3">Nomor SK</th>
                      <th className="py-2.5 px-3">Keterangan / Alasan</th>
                      <th className="py-2.5 px-3">Dicatat Oleh</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {dutyLogs.map(log => (
                      <tr key={log.id} className="hover:bg-slate-50/70">
                        <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                          {log.created_at ? log.created_at.replace('T', ' ').substring(0, 16) : '-'}
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            log.action === 'penambahan' ? 'bg-emerald-100 text-emerald-800' :
                            log.action === 'perubahan' ? 'bg-blue-100 text-blue-800' :
                            log.action === 'penghapusan' ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-700'
                          }`}>
                            {log.action}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-bold text-slate-800">{log.target_name || '-'}</td>
                        <td className="py-2.5 px-3 text-slate-600 font-medium">
                          {log.class_group_name ? (
                            <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded font-semibold text-[10px]">
                              {log.class_group_name}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic text-[10px]">Semua Rombel</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 font-bold text-teal-800">{log.teacher_name || '-'}</td>
                        <td className="py-2.5 px-3 text-slate-500">
                          {log.previous_teacher_name ? (
                            <span className="line-through text-slate-400">{log.previous_teacher_name}</span>
                          ) : '-'}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-indigo-700 font-medium">
                          {log.sk_number || '-'}
                        </td>
                        <td className="py-2.5 px-3 text-slate-700 max-w-xs">{log.reason}</td>
                        <td className="py-2.5 px-3 text-slate-500 text-[11px]">{log.created_by || 'Sistem'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="pt-2 flex justify-end border-t">
              <button
                onClick={() => setLogsModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition"
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
