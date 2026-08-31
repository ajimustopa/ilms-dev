import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../../shared/services/api';
import SearchableSelect from '../../../shared/components/SearchableSelect';
import { useAuth } from '../../../shared/store/AuthContext';
import {
  GraduationCap,
  Users,
  Plus,
  Search,
  UserPlus,
  UserMinus,
  ArrowRightLeft,
  ArrowLeft,
  Layers,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Trash2,
  Edit2,
  CheckSquare,
  Square,
  Building2,
  X,
  RotateCw,
  Activity,
  Award,
  History,
  FileText,
  HelpCircle,
  ArrowUpDown,
  ArrowUp,
  ArrowDown
} from 'lucide-react';

export default function RombelManagement() {
  const { activeSchoolUnit } = useAuth();

  // Sub-Tab: 'reguler' | 'ekstrakurikuler'
  const [rombelTab, setRombelTab] = useState('reguler');

  // State Daftar Rombel
  const [classGroups, setClassGroups] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [gradeLevels, setGradeLevels] = useState([]);
  const [cohorts, setCohorts] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [extracurriculars, setExtracurriculars] = useState([]);
  const [subjectsList, setSubjectsList] = useState([]);
  const [schoolUnitsList, setSchoolUnitsList] = useState([]);
  const [selectedYearId, setSelectedYearId] = useState('');
  const [selectedGradeId, setSelectedGradeId] = useState('');
  const [searchRombel, setSearchRombel] = useState('');
  const [loading, setLoading] = useState(true);

  // State Modal Tambah/Edit Rombel
  const [showClassModal, setShowClassModal] = useState(false);
  const [classForm, setClassForm] = useState({
    id: null,
    type: 'reguler',
    academic_year_id: '',
    grade_level_id: '',
    extracurricular_id: '',
    name: '',
    capacity: 32,
    homeroom_teacher_employee_id: '',
    is_cross_unit: false,
    target_school_unit_ids: []
  });

  // State Kelola Anggota Rombel Terpilih
  const [selectedClass, setSelectedClass] = useState(null);
  const [members, setMembers] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(false);

  // State Modal Tambah Anggota (Siswa)
  const [showAddMembersModal, setShowAddMembersModal] = useState(false);
  const [candidateStudents, setCandidateStudents] = useState([]);
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);
  const [searchCandidate, setSearchCandidate] = useState('');
  const [filterCohortId, setFilterCohortId] = useState('');
  const [filterCandidateSatuanId, setFilterCandidateSatuanId] = useState('');
  const [filterCandidateGender, setFilterCandidateGender] = useState('');
  const [showCandidateFilters, setShowCandidateFilters] = useState(false);

  // State Sort untuk Modal Calon Anggota
  const [candidateSortField, setCandidateSortField] = useState('full_name');
  const [candidateSortDirection, setCandidateSortDirection] = useState('asc');

  const handleCandidateSort = (field) => {
    if (candidateSortField === field) {
      setCandidateSortDirection(candidateSortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setCandidateSortField(field);
      setCandidateSortDirection('asc');
    }
  };

  // State Modal Keluarkan Siswa (dengan Catatan & Riwayat)
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [removeTarget, setRemoveTarget] = useState(null);
  const [removeForm, setRemoveForm] = useState({
    reason: 'Permintaan Siswa / Wali Santri',
    notes: ''
  });
  const [isRemoving, setIsRemoving] = useState(false);

  // State Modal Riwayat Pengeluaran Siswa
  const [showRemovalLogsModal, setShowRemovalLogsModal] = useState(false);
  const [removalLogs, setRemovalLogs] = useState([]);
  const [loadingRemovalLogs, setLoadingRemovalLogs] = useState(false);
  const [searchRemovalLog, setSearchRemovalLog] = useState('');

  // State Modal Pindah Rombel
  const [transferTarget, setTransferTarget] = useState(null);
  const [targetClassId, setTargetClassId] = useState('');
  const [showTransferModal, setShowTransferModal] = useState(false);

  // State Statistik Siswa Rombel
  const [studentStats, setStudentStats] = useState({
    totalStudents: 0,
    assignedStudents: 0,
    unassignedStudents: 0
  });

  // State Feedback
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    fetchInitialData();
  }, [activeSchoolUnit]);

  useEffect(() => {
    if (selectedYearId) {
      fetchClassGroups();
    }
  }, [selectedYearId, selectedGradeId, activeSchoolUnit, rombelTab]);

  const showNotification = (msg) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 3500);
  };

  const fetchInitialData = async () => {
    setLoading(true);
    setErrorMsg('');
    setSelectedClass(null);
    try {
      const params = {};
      if (activeSchoolUnit?.id) params.satuan_pendidikan_id = activeSchoolUnit.id;

      const [yRes, gRes, cRes, tRes, exRes, suRes, subRes] = await Promise.all([
        api.get('/akademik/academic-years', { params }),
        api.get('/akademik/grade-levels', { params }),
        api.get('/akademik/cohorts', { params }),
        api.get('/kepegawaian/employees', { params: { per_page: 200 } }).catch(() => ({ data: { data: [] } })),
        api.get('/akademik/extracurriculars', { params }).catch(() => ({ data: { data: [] } })),
        api.get('/core/school-units').catch(() => ({ data: { data: [] } })),
        api.get('/akademik/subjects', { params }).catch(() => ({ data: { data: [] } }))
      ]);

      const years = yRes.data?.data || [];
      setAcademicYears(years);
      setGradeLevels(gRes.data?.data || []);
      setCohorts(cRes.data?.data || []);
      const teachersList = tRes.data?.data?.items || (Array.isArray(tRes.data?.data) ? tRes.data.data : []);
      setTeachers(teachersList);
      setExtracurriculars(exRes.data?.data || []);
      setSubjectsList(subRes.data?.data || []);
      const unitsList = suRes.data?.data?.items || (Array.isArray(suRes.data?.data) ? suRes.data.data : []);
      setSchoolUnitsList(Array.isArray(unitsList) ? unitsList : []);

      const activeY = years.find((y) => y.is_active) || years[0];
      if (activeY) {
        setSelectedYearId(activeY.id);
      } else {
        setSelectedYearId('');
      }
    } catch (err) {
      setErrorMsg('Gagal memuat data pendukung rombel');
    } finally {
      setLoading(false);
    }
  };

  const fetchClassGroups = async () => {
    setLoading(true);
    try {
      const [cgRes, unassignedRes, allStudentsRes] = await Promise.all([
        api.get('/akademik/class-groups', {
          params: {
            satuan_pendidikan_id: activeSchoolUnit?.id,
            academic_year_id: selectedYearId || undefined,
            grade_level_id: rombelTab === 'reguler' ? (selectedGradeId || undefined) : undefined,
            type: rombelTab
          }
        }),
        api.get('/akademik/unassigned-students', {
          params: {
            satuan_pendidikan_id: activeSchoolUnit?.id,
            academic_year_id: selectedYearId || undefined
          }
        }).catch(() => ({ data: { data: [] } })),
        api.get('/akademik/students', {
          params: {
            satuan_pendidikan_id: activeSchoolUnit?.id,
            status: 'aktif',
            per_page: 500
          }
        }).catch(() => ({ data: { data: [] } }))
      ]);

      const groups = cgRes.data?.data || [];
      setClassGroups(groups);

      const unassignedList = unassignedRes.data?.data || [];
      const studentItems = allStudentsRes.data?.data?.items || (Array.isArray(allStudentsRes.data?.data) ? allStudentsRes.data.data : []);
      const totalCount = studentItems.length || 0;
      const unassignedCount = unassignedList.length || 0;
      const assignedCount = Math.max(0, totalCount - unassignedCount);

      setStudentStats({
        totalStudents: totalCount,
        assignedStudents: assignedCount,
        unassignedStudents: unassignedCount
      });
    } catch (err) {
      console.warn('Gagal memuat daftar rombel atau statistik siswa:', err);
    } finally {
      setLoading(false);
    }
  };

  // --- CRUD ROMBEL ---
  const handleOpenAddClassModal = () => {
    const activeYear = academicYears.find(y => y.is_active) || academicYears[0];
    setClassForm({
      id: null,
      type: rombelTab,
      academic_year_id: selectedYearId || activeYear?.id || '',
      grade_level_id: gradeLevels[0]?.id || '',
      extracurricular_id: extracurriculars[0]?.id || '',
      subject_id: subjectsList.find(s => s.is_elective)?.id || subjectsList[0]?.id || '',
      name: '',
      capacity: rombelTab === 'reguler' ? 32 : 50,
      homeroom_teacher_employee_id: '',
      is_cross_unit: rombelTab !== 'reguler',
      target_school_unit_ids: []
    });
    setShowClassModal(true);
  };

  const handleOpenEditClassModal = (cg) => {
    let parsedUnitIds = [];
    if (cg.target_school_unit_ids) {
      try {
        parsedUnitIds = typeof cg.target_school_unit_ids === 'string'
          ? JSON.parse(cg.target_school_unit_ids)
          : cg.target_school_unit_ids;
      } catch (e) {}
    }

    setClassForm({
      id: cg.id,
      type: cg.type || 'reguler',
      academic_year_id: cg.academic_year_id,
      grade_level_id: cg.grade_level_id || '',
      extracurricular_id: cg.extracurricular_id || '',
      subject_id: cg.subject_id || '',
      name: cg.name,
      capacity: cg.capacity || 32,
      homeroom_teacher_employee_id: cg.homeroom_teacher_employee_id || '',
      is_cross_unit: !!cg.is_cross_unit,
      target_school_unit_ids: parsedUnitIds
    });
    setShowClassModal(true);
  };

  const handleSaveClass = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        satuan_pendidikan_id: activeSchoolUnit?.id || 1,
        academic_year_id: Number(classForm.academic_year_id),
        type: classForm.type || 'reguler',
        name: classForm.name.trim(),
        capacity: Number(classForm.capacity),
        homeroom_teacher_employee_id: classForm.type === 'pilihan'
          ? null
          : (classForm.homeroom_teacher_employee_id ? Number(classForm.homeroom_teacher_employee_id) : null),
        is_cross_unit: classForm.type !== 'reguler' ? !!classForm.is_cross_unit : false,
        target_school_unit_ids: classForm.type !== 'reguler' && classForm.is_cross_unit
          ? classForm.target_school_unit_ids
          : []
      };

      if (classForm.type === 'reguler') {
        payload.grade_level_id = Number(classForm.grade_level_id);
      } else if (classForm.type === 'pilihan') {
        payload.grade_level_id = classForm.grade_level_id ? Number(classForm.grade_level_id) : null;
        payload.subject_id = classForm.subject_id ? Number(classForm.subject_id) : null;
      } else {
        payload.grade_level_id = classForm.grade_level_id ? Number(classForm.grade_level_id) : null;
        payload.extracurricular_id = classForm.extracurricular_id ? Number(classForm.extracurricular_id) : null;
      }

      if (classForm.id) {
        const updateRes = await api.put(`/akademik/class-groups/${classForm.id}`, payload);
        showNotification(`Rombel "${classForm.name}" berhasil diperbarui!`);
        if (selectedClass?.id === classForm.id && updateRes.data?.data) {
          setSelectedClass({
            ...selectedClass,
            ...updateRes.data.data
          });
        }
      } else {
        await api.post('/akademik/class-groups', payload);
        showNotification(`Rombel "${classForm.name}" berhasil ditambahkan!`);
      }

      setShowClassModal(false);
      fetchClassGroups();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menyimpan rombel');
    }
  };

  const handleDeleteClass = async (id, name) => {
    if (confirm(`Yakin ingin menghapus rombel "${name}"? Pastikan tidak ada data penilaian aktif di rombel ini.`)) {
      try {
        await api.delete(`/akademik/class-groups/${id}`);
        showNotification(`Rombel "${name}" berhasil dihapus.`);
        if (selectedClass?.id === id) setSelectedClass(null);
        fetchClassGroups();
      } catch (err) {
        alert(err.response?.data?.message || 'Gagal menghapus rombel');
      }
    }
  };

  // --- KELOLA ANGGOTA ROMBEL ---
  const handleOpenClassMembers = async (classGroup) => {
    setSelectedClass(classGroup);
    setLoadingMembers(true);
    setErrorMsg('');
    try {
      const res = await api.get(`/akademik/class-groups/${classGroup.id}/members`);
      setMembers(res.data?.data || []);
    } catch (err) {
      setErrorMsg('Gagal memuat anggota rombel');
    } finally {
      setLoadingMembers(false);
    }
  };

  // Buka modal tambah anggota rombel
  const handleOpenAddMembers = async () => {
    if (!selectedClass) return;
    setShowAddMembersModal(true);
    setSelectedStudentIds([]);
    setLoadingCandidates(true);
    setSearchCandidate('');
    setFilterCohortId('');
    try {
      if (selectedClass.type === 'ekstrakurikuler') {
        // Jika rombel ekskul lintas satuan (digabung), ambil siswa dari seluruh unit terkait atau semua unit
        let targetSatuanIds = [];
        if (selectedClass.is_cross_unit) {
          if (selectedClass.target_school_unit_ids) {
            try {
              targetSatuanIds = typeof selectedClass.target_school_unit_ids === 'string'
                ? JSON.parse(selectedClass.target_school_unit_ids)
                : selectedClass.target_school_unit_ids;
            } catch (e) {}
          }
        } else {
          targetSatuanIds = [activeSchoolUnit?.id || selectedClass.satuan_pendidikan_id];
        }

        // Ambil siswa aktif
        let allStudents = [];
        if (selectedClass.is_cross_unit && (!targetSatuanIds || targetSatuanIds.length === 0)) {
          // Ambil dari seluruh yayasan
          const res = await api.get('/akademik/students', {
            params: { status: 'aktif', per_page: 1000 }
          });
          allStudents = res.data?.data?.items || (Array.isArray(res.data?.data) ? res.data.data : []);
        } else if (targetSatuanIds.length > 0) {
          const fetchPromises = targetSatuanIds.map(satuanId =>
            api.get('/akademik/students', {
              params: { satuan_pendidikan_id: satuanId, status: 'aktif', per_page: 500 }
            }).catch(() => ({ data: { data: [] } }))
          );
          const results = await Promise.all(fetchPromises);
          results.forEach(r => {
            const items = r.data?.data?.items || (Array.isArray(r.data?.data) ? r.data.data : []);
            allStudents.push(...items);
          });
        } else {
          const res = await api.get('/akademik/students', {
            params: {
              satuan_pendidikan_id: activeSchoolUnit?.id,
              status: 'aktif',
              per_page: 500
            }
          });
          allStudents = res.data?.data?.items || (Array.isArray(res.data?.data) ? res.data.data : []);
        }

        const currentMemberIds = new Set(members.map(m => m.student_id));
        setCandidateStudents(allStudents.filter(s => !currentMemberIds.has(s.id)));
      } else {
        // Untuk Rombel Reguler, hanya siswa yang belum masuk rombel reguler di tahun ajaran ini
        const res = await api.get('/akademik/unassigned-students', {
          params: {
            satuan_pendidikan_id: activeSchoolUnit?.id,
            academic_year_id: selectedClass.academic_year_id
          }
        });
        setCandidateStudents(res.data?.data || []);
      }
    } catch (err) {
      alert('Gagal mengambil data siswa calon anggota');
    } finally {
      setLoadingCandidates(false);
    }
  };

  const handleToggleSelectStudent = (studentId) => {
    if (selectedStudentIds.includes(studentId)) {
      setSelectedStudentIds(selectedStudentIds.filter((id) => id !== studentId));
    } else {
      setSelectedStudentIds([...selectedStudentIds, studentId]);
    }
  };

  const handleSelectAllCandidates = (filteredList) => {
    if (selectedStudentIds.length === filteredList.length && filteredList.length > 0) {
      setSelectedStudentIds([]);
    } else {
      setSelectedStudentIds(filteredList.map((s) => s.id));
    }
  };

  const handleSaveAddMembers = async () => {
    if (selectedStudentIds.length === 0) {
      alert('Pilih minimal 1 siswa');
      return;
    }

    try {
      await api.post(`/akademik/class-groups/${selectedClass.id}/members`, {
        student_ids: selectedStudentIds,
        academic_year_id: selectedClass.academic_year_id,
        satuan_pendidikan_id: activeSchoolUnit?.id || selectedClass.satuan_pendidikan_id
      });
      showNotification(`${selectedStudentIds.length} Siswa berhasil dimasukkan ke rombel ${selectedClass.name}!`);
      setShowAddMembersModal(false);
      handleOpenClassMembers(selectedClass);
      fetchClassGroups();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menambahkan anggota rombel');
    }
  };

  const handleOpenRemoveModal = (enrollmentId, studentName, studentNis) => {
    setRemoveTarget({ enrollment_id: enrollmentId, student_name: studentName, student_nis: studentNis });
    setRemoveForm({
      reason: 'Permintaan Siswa / Wali Santri',
      notes: ''
    });
    setShowRemoveModal(true);
  };

  const handleConfirmRemove = async (e) => {
    e.preventDefault();
    if (!removeTarget) return;

    setIsRemoving(true);
    try {
      await api.delete(`/akademik/enrollments/${removeTarget.enrollment_id}`, {
        data: {
          reason: removeForm.reason,
          notes: removeForm.notes
        }
      });
      showNotification(`Siswa "${removeTarget.student_name}" berhasil dikeluarkan dari rombel dan riwayat dicatat!`);
      setShowRemoveModal(false);
      handleOpenClassMembers(selectedClass);
      fetchClassGroups();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal mengeluarkan siswa dari rombel');
    } finally {
      setIsRemoving(false);
    }
  };

  const handleOpenRemovalLogs = async () => {
    setShowRemovalLogsModal(true);
    setLoadingRemovalLogs(true);
    try {
      const params = {};
      if (selectedClass?.id) params.class_group_id = selectedClass.id;
      const res = await api.get('/akademik/class-groups/removal-logs', { params });
      if (res.data?.success) {
        setRemovalLogs(res.data.data || []);
      }
    } catch (err) {
      console.warn('Gagal memuat log riwayat pengeluaran siswa:', err);
    } finally {
      setLoadingRemovalLogs(false);
    }
  };

  const handleOpenTransferModal = (enrollmentId, studentName, studentNis) => {
    setTransferTarget({ enrollment_id: enrollmentId, student_name: studentName, student_nis: studentNis });
    setTargetClassId('');
    setShowTransferModal(true);
  };

  const handleSaveTransfer = async (e) => {
    e.preventDefault();
    if (!targetClassId) {
      alert('Pilih rombel tujuan');
      return;
    }

    try {
      await api.put(`/akademik/enrollments/${transferTarget.enrollment_id}/transfer`, {
        target_class_group_id: Number(targetClassId)
      });
      showNotification(`Siswa "${transferTarget.student_name}" berhasil dipindahkan ke rombel tujuan!`);
      setShowTransferModal(false);
      handleOpenClassMembers(selectedClass);
      fetchClassGroups();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal memindahkan siswa');
    }
  };

  const filteredCandidates = candidateStudents.filter((s) => {
    const matchSearch =
      !searchCandidate ||
      s.full_name?.toLowerCase().includes(searchCandidate.toLowerCase()) ||
      s.nis?.toLowerCase().includes(searchCandidate.toLowerCase()) ||
      s.nisn?.toLowerCase().includes(searchCandidate.toLowerCase());
    const matchCohort = !filterCohortId || s.cohort_id === Number(filterCohortId);
    const matchSatuan = !filterCandidateSatuanId || String(s.satuan_pendidikan_id) === String(filterCandidateSatuanId);
    const matchGender = !filterCandidateGender || s.gender === filterCandidateGender;
    return matchSearch && matchCohort && matchSatuan && matchGender;
  });

  const filteredClasses = classGroups.filter((cg) => {
    const matchesTab = rombelTab === 'pilihan' ? cg.type === 'pilihan' : rombelTab === 'ekstrakurikuler' ? cg.type === 'ekstrakurikuler' : (cg.type === 'reguler' || !cg.type);
    const matchesSearch = !searchRombel || cg.name?.toLowerCase().includes(searchRombel.toLowerCase()) || (cg.extracurricular_name && cg.extracurricular_name.toLowerCase().includes(searchRombel.toLowerCase()));
    return matchesTab && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-teal-600" />
              <span>Manajemen Rombongan Belajar (Rombel)</span>
            </h2>
            <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-teal-50 text-teal-800 border border-teal-200">
              Unit: {activeSchoolUnit?.name || 'Semua Unit'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Kelola rombel reguler (kelas akademik) dan rombel ekstrakurikuler sebagai rujukan peserta & penilaian ekskul.
          </p>
        </div>

        {/* Global Action & Filter Bar */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => {
              if (selectedClass) {
                handleOpenClassMembers(selectedClass);
              } else {
                fetchClassGroups();
              }
            }}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold border border-slate-200 shadow-2xs transition active:scale-95"
            title="Segarkan Data Rombel dari Database"
          >
            <RotateCw className={`w-3.5 h-3.5 text-slate-600 ${loading ? 'animate-spin' : ''}`} />
            <span>Reload Data</span>
          </button>

          <div>
            <select
              value={selectedYearId}
              onChange={(e) => setSelectedYearId(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-teal-500"
            >
              {academicYears.map((y) => (
                <option key={y.id} value={y.id}>
                  Tahun Ajaran: {y.name} {y.is_active ? '(Aktif)' : ''}
                </option>
              ))}
            </select>
          </div>

          {rombelTab === 'reguler' && (
            <div>
              <select
                value={selectedGradeId}
                onChange={(e) => setSelectedGradeId(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:ring-2 focus:ring-teal-500"
              >
                <option value="">Semua Tingkat</option>
                {gradeLevels.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <Link
            to="/akademik/kenaikan-kelulusan"
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-2xs transition"
          >
            <GraduationCap className="w-4 h-4" />
            <span>Kenaikan & Kelulusan</span>
          </Link>

          <button
            onClick={handleOpenAddClassModal}
            className="flex items-center gap-1.5 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow-2xs transition"
          >
            <Plus className="w-4 h-4" />
            <span>{rombelTab === 'reguler' ? '+ Tambah Rombel Reguler' : rombelTab === 'pilihan' ? '+ Tambah Rombel Mapel Pilihan' : '+ Tambah Rombel Ekskul'}</span>
          </button>
        </div>
      </div>

      {/* Tabs Rombel Reguler vs Rombel Ekstrakurikuler */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-1">
        <button
          onClick={() => { setRombelTab('reguler'); setSelectedClass(null); }}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl transition ${
            rombelTab === 'reguler'
              ? 'bg-teal-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <GraduationCap className="w-4 h-4" />
          <span>1. Rombel Reguler (Kelas Pokok)</span>
        </button>
        <button
          onClick={() => { setRombelTab('pilihan'); setSelectedClass(null); }}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl transition ${
            rombelTab === 'pilihan'
              ? 'bg-amber-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>2. Rombel Mapel Pilihan (Lintas Kelas)</span>
        </button>
        <button
          onClick={() => { setRombelTab('ekstrakurikuler'); setSelectedClass(null); }}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl transition ${
            rombelTab === 'ekstrakurikuler'
              ? 'bg-teal-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>3. Rombel Ekstrakurikuler (Peserta & Nilai Ekskul)</span>
        </button>
      </div>

      {/* Kartu Statistik Penempatan Siswa dalam Rombel */}
      {!selectedClass && rombelTab === 'reguler' && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Seluruh Siswa Aktif</div>
              <div className="text-xl font-extrabold text-slate-900 mt-0.5">
                {studentStats.totalStudents} <span className="text-xs font-medium text-slate-400">Siswa</span>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-emerald-100/80 bg-emerald-50/20 shadow-xs flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">Sudah Masuk Rombel</div>
              <div className="text-xl font-extrabold text-emerald-800 mt-0.5">
                {studentStats.assignedStudents}{' '}
                <span className="text-xs font-medium text-emerald-600">
                  Siswa ({studentStats.totalStudents ? Math.round((studentStats.assignedStudents / studentStats.totalStudents) * 100) : 0}%)
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-amber-100/80 bg-amber-50/20 shadow-xs flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center shrink-0">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-amber-700">Belum Masuk Rombel</div>
              <div className="text-xl font-extrabold text-amber-800 mt-0.5">
                {studentStats.unassignedStudents}{' '}
                <span className="text-xs font-medium text-amber-600">
                  Siswa ({studentStats.totalStudents ? Math.round((studentStats.unassignedStudents / studentStats.totalStudents) * 100) : 0}%)
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Alerts */}
      {errorMsg && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}
      {successMsg && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-xl flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* VIEW 1: DAFTAR KARTU ROMBEL */}
      {!selectedClass ? (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder={rombelTab === 'reguler' ? "Cari nama rombel reguler..." : "Cari nama rombel / cabang ekskul..."}
                value={searchRombel}
                onChange={(e) => setSearchRombel(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs"
              />
            </div>
            <div className="text-xs text-slate-500 font-semibold">
              Total: {filteredClasses.length} {rombelTab === 'reguler' ? 'Rombel Reguler' : 'Rombel Ekskul'}
            </div>
          </div>

          {loading ? (
            <div className="py-24 text-center text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-teal-600 mb-3" />
              <p className="text-xs">Memuat daftar rombongan belajar...</p>
            </div>
          ) : filteredClasses.length === 0 ? (
            <div className="bg-white p-12 rounded-2xl border border-slate-100 text-center text-slate-400 space-y-3">
              <GraduationCap className="w-12 h-12 text-slate-300 mx-auto" />
              <p className="text-sm font-semibold">
                Belum ada {rombelTab === 'reguler' ? 'rombel reguler' : 'rombel ekstrakurikuler'} pada tahun ajaran ini.
              </p>
              <button
                onClick={handleOpenAddClassModal}
                className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 shadow-2xs"
              >
                <Plus className="w-4 h-4" />
                <span>+ Buat {rombelTab === 'reguler' ? 'Rombel Reguler' : 'Rombel Ekskul'} Baru</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredClasses.map((cg) => {
                const filled = cg.student_count || 0;
                const cap = cg.capacity || 32;
                const percent = Math.min(100, Math.round((filled / cap) * 100));

                return (
                  <div
                    key={cg.id}
                    className="bg-white p-5 rounded-2xl border border-slate-200/80 hover:border-teal-400 shadow-xs hover:shadow-md transition flex flex-col justify-between space-y-4"
                  >
                    <div>
                      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {cg.type === 'ekstrakurikuler' ? (
                              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/60 flex items-center gap-1">
                                <Activity className="w-3 h-3 text-amber-600" />
                                <span>{cg.extracurricular_name || 'Ekskul'}</span>
                              </span>
                            ) : cg.type === 'pilihan' ? (
                              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/80 flex items-center gap-1">
                                <Layers className="w-3 h-3 text-amber-600" />
                                <span>Mapel Pilihan (Lintas Kelas)</span>
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold uppercase tracking-wider text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200/60">
                                {cg.grade_level_name || 'Tingkat'}
                              </span>
                            )}
                            {cg.is_cross_unit ? (
                              <span className="text-[9px] font-bold text-purple-700 bg-purple-50 border border-purple-200 px-1.5 py-0.2 rounded flex items-center gap-1">
                                <Building2 className="w-2.5 h-2.5" />
                                <span>Gabungan Satuan</span>
                              </span>
                            ) : null}
                          </div>
                          <h3 className="text-lg font-extrabold text-slate-800 mt-1">{cg.name}</h3>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleOpenEditClassModal(cg)}
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                            title="Edit Rombel"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteClass(cg.id, cg.name)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                            title="Hapus Rombel"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Info Kapasitas & Progress */}
                      <div className="mt-3 space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-500 font-semibold">
                            {cg.type === 'ekstrakurikuler' ? 'Peserta Terdaftar:' : 'Kapasitas Terisi:'}
                          </span>
                          <span className="font-bold text-slate-800">
                            <span className="text-teal-700 font-extrabold">{filled}</span> / {cap} Siswa
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              percent >= 100 ? 'bg-rose-500' : percent >= 80 ? 'bg-amber-500' : 'bg-teal-500'
                            }`}
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>

                      {/* Wali Kelas / Pembina Ekskul (Tidak tampil untuk Mapel Pilihan) */}
                      {cg.type !== 'pilihan' && (
                        <div className="mt-3 space-y-1 text-xs">
                          <div className="text-slate-500 font-medium">
                            {cg.type === 'ekstrakurikuler' ? 'Pembina / Pelatih:' : 'Wali Kelas:'}
                          </div>
                          <div className="font-bold text-slate-800">
                            {cg.homeroom_teacher_name || <span className="text-slate-400 italic">Belum ditentukan</span>}
                          </div>
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => handleOpenClassMembers(cg)}
                      className="w-full py-2.5 bg-slate-50 hover:bg-teal-50 hover:text-teal-700 text-slate-700 border border-slate-200 hover:border-teal-200 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5"
                    >
                      <Users className="w-3.5 h-3.5 text-teal-600" />
                      <span>
                        {cg.type === 'ekstrakurikuler' ? 'Kelola Peserta Ekskul' : 'Kelola Anggota Rombel'} ({filled})
                      </span>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* VIEW 2: KELOLA ANGGOTA KELAS / PESERTA EKSKUL TERPILIH */
        <div className="bg-white rounded-2xl border border-slate-100 shadow-xs p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSelectedClass(null)}
                className="p-2 hover:bg-slate-100 rounded-xl transition text-slate-600"
                title="Kembali ke Daftar Rombel"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-extrabold text-slate-800">{selectedClass.name}</h3>
                  <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                    selectedClass.type === 'ekstrakurikuler'
                      ? 'bg-amber-50 text-amber-800 border border-amber-200'
                      : selectedClass.type === 'pilihan'
                      ? 'bg-amber-50 text-amber-900 border border-amber-200'
                      : 'bg-teal-50 text-teal-800 border border-teal-200'
                  }`}>
                    {selectedClass.type === 'ekstrakurikuler'
                      ? `Ekskul: ${selectedClass.extracurricular_name || 'Umum'}`
                      : selectedClass.type === 'pilihan'
                      ? 'Mapel Pilihan (Lintas Kelas)'
                      : `Tingkat: ${selectedClass.grade_level_name || '-'}`}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Tahun Ajaran: {selectedClass.academic_year_name} {selectedClass.type !== 'pilihan' && (<>| {selectedClass.type === 'ekstrakurikuler' ? 'Pembina:' : 'Wali Kelas:'} {selectedClass.homeroom_teacher_name || '-'}</>)} | Kapasitas: {members.length}/{selectedClass.capacity || 32}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleOpenRemovalLogs}
                className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold shadow-2xs transition"
                title="Lihat Riwayat & Catatan Siswa yang Pernah Dikeluarkan"
              >
                <History className="w-3.5 h-3.5 text-amber-600" />
                <span>Riwayat Pengeluaran</span>
              </button>
              <button
                onClick={() => handleOpenClassMembers(selectedClass)}
                disabled={loadingMembers}
                className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold border border-slate-200 transition"
                title="Reload Anggota Rombel"
              >
                <RotateCw className={`w-4 h-4 ${loadingMembers ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={() => handleOpenEditClassModal(selectedClass)}
                className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold shadow-2xs transition"
                title="Edit Rombel & Atur Penggabungan Satuan Pendidikan"
              >
                <Edit2 className="w-3.5 h-3.5 text-slate-600" />
                <span>
                  {selectedClass.type === 'ekstrakurikuler' ? 'Atur Rombel / Gabung Unit' : 'Edit Rombel'}
                </span>
              </button>
              <button
                onClick={handleOpenAddMembers}
                className="flex items-center gap-1.5 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow-xs transition"
              >
                <UserPlus className="w-4 h-4" />
                <span>
                  {selectedClass.type === 'ekstrakurikuler' ? '+ Tambah Peserta Ekskul' : '+ Tambah Siswa ke Rombel'}
                </span>
              </button>
            </div>
          </div>

          {/* Table Anggota */}
          {loadingMembers ? (
            <div className="py-20 text-center text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-teal-600 mb-2" />
              <p className="text-xs">Memuat daftar anggota...</p>
            </div>
          ) : members.length === 0 ? (
            <div className="py-16 text-center text-slate-400 space-y-3">
              <Users className="w-12 h-12 text-slate-300 mx-auto" />
              <p className="text-sm font-semibold">Belum ada siswa yang terdaftar di rombel ini.</p>
              <button
                onClick={handleOpenAddMembers}
                className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 shadow-xs"
              >
                <UserPlus className="w-4 h-4" />
                <span>
                  {selectedClass.type === 'ekstrakurikuler' ? 'Pilih Peserta Ekskul' : 'Pilih Siswa Belum Berombel'}
                </span>
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto max-h-[calc(100vh-360px)] overflow-y-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-700 font-bold border-y border-slate-100 sticky top-0 z-10">
                  <tr>
                    <th className="py-3 px-4 w-12 text-center">No</th>
                    <th className="py-3 px-4">NIS / NISN</th>
                    <th className="py-3 px-4">Nama Lengkap Siswa</th>
                    {selectedClass?.type === 'ekstrakurikuler' && (
                      <th className="py-3 px-4">Rombel Reguler</th>
                    )}
                    {selectedClass?.is_cross_unit && (
                      <th className="py-3 px-4">Satuan Pendidikan</th>
                    )}
                    <th className="py-3 px-4">L/P</th>
                    <th className="py-3 px-4">Angkatan</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {members.map((m, idx) => {
                    const unit = schoolUnitsList.find(u => String(u.id) === String(m.satuan_pendidikan_id));
                    return (
                      <tr key={m.enrollment_id} className="hover:bg-slate-50/70 transition">
                        <td className="py-3 px-4 text-center text-slate-400 font-bold">{idx + 1}</td>
                        <td className="py-3 px-4 font-mono font-bold text-slate-800">
                          {m.nis || '-'}
                          {m.nisn && <span className="text-[10px] text-slate-400 block font-normal">{m.nisn}</span>}
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-800">{m.full_name}</td>
                        {selectedClass?.type === 'ekstrakurikuler' && (
                          <td className="py-3 px-4">
                            {m.regular_class_name ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[11px] font-bold bg-teal-50 text-teal-800 border border-teal-200 shadow-2xs">
                                <Layers className="w-3 h-3 text-teal-600 shrink-0" />
                                <span>{m.regular_class_name}</span>
                              </span>
                            ) : (
                              <span className="text-[10px] italic font-semibold text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                                Belum Berombel
                              </span>
                            )}
                          </td>
                        )}
                        {selectedClass?.is_cross_unit && (
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 bg-purple-50 text-purple-700 border border-purple-200 rounded font-semibold text-[10px]">
                              {unit?.name || `Unit #${m.satuan_pendidikan_id}`}
                            </span>
                          </td>
                        )}
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              m.gender === 'L' ? 'bg-blue-50 text-blue-700' : 'bg-pink-50 text-pink-700'
                            }`}
                          >
                            {m.gender === 'L' ? 'L' : 'P'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-600">{m.cohort_title || m.cohort_name || '-'}</td>
                        <td className="py-3 px-4 text-center">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700">
                            {m.status || 'Aktif'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right space-x-1.5">
                          {selectedClass.type === 'reguler' && (
                            <button
                              onClick={() => handleOpenTransferModal(m.enrollment_id, m.full_name, m.nis)}
                              className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-semibold inline-flex items-center gap-1 transition"
                              title="Pindah ke Rombel Lain"
                            >
                              <ArrowRightLeft className="w-3 h-3" />
                              <span>Pindah</span>
                            </button>
                          )}
                          <button
                            onClick={() => handleOpenRemoveModal(m.enrollment_id, m.full_name, m.nis)}
                            className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-xs font-semibold inline-flex items-center gap-1 transition"
                            title="Keluarkan Siswa dari Rombel & Catat Riwayat"
                          >
                            <UserMinus className="w-3 h-3" />
                            <span>Keluarkan</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* --- MODAL TAMBAH/EDIT ROMBEL --- */}
      {showClassModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95">
            <h3 className="text-sm font-bold text-slate-800 mb-4 pb-2 border-b border-slate-100">
              {classForm.id ? 'Edit Rombel' : (classForm.type === 'ekstrakurikuler' ? 'Tambah Rombel Ekstrakurikuler' : 'Tambah Rombel Reguler')}
            </h3>
            <form onSubmit={handleSaveClass} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Tipe Rombel *</label>
                <div className="flex gap-4">
                  <label className="inline-flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="modal_rombel_type"
                      value="reguler"
                      checked={classForm.type === 'reguler'}
                      onChange={() => setClassForm({ ...classForm, type: 'reguler' })}
                      className="text-teal-600 focus:ring-teal-500"
                    />
                    <span className="font-semibold text-slate-800">Rombel Reguler (Kelas Pokok)</span>
                  </label>
                  <label className="inline-flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="modal_rombel_type"
                      value="pilihan"
                      checked={classForm.type === 'pilihan'}
                      onChange={() => setClassForm({ ...classForm, type: 'pilihan', is_cross_unit: true })}
                      className="text-amber-600 focus:ring-amber-500"
                    />
                    <span className="font-semibold text-amber-900">Rombel Mapel Pilihan</span>
                  </label>
                  <label className="inline-flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="modal_rombel_type"
                      value="ekstrakurikuler"
                      checked={classForm.type === 'ekstrakurikuler'}
                      onChange={() => setClassForm({ ...classForm, type: 'ekstrakurikuler' })}
                      className="text-teal-600 focus:ring-teal-500"
                    />
                    <span className="font-semibold text-slate-800">Rombel Ekstrakurikuler</span>
                  </label>
                </div>
              </div>

              {classForm.type === 'pilihan' && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-semibold text-slate-700">Pilih Mata Pelajaran Pilihan *</label>
                    <span className="text-[10px] text-amber-700 font-bold bg-amber-50 border border-amber-200 px-2 py-0.2 rounded-full">
                      Khusus Mapel Pilihan
                    </span>
                  </div>
                  <SearchableSelect
                    options={subjectsList
                      .filter(s => s.is_elective == 1 || s.is_elective === true || s.is_elective === '1')
                      .map(s => ({
                        value: s.id,
                        label: s.name,
                        sublabel: `✨ Blok: ${s.elective_group_name || 'Mapel Pilihan'} • Kode: ${s.code || '-'}`
                      }))}
                    value={classForm.subject_id}
                    onChange={(val) => {
                      const selSub = subjectsList.find(s => String(s.id) === String(val));
                      setClassForm({
                        ...classForm,
                        subject_id: val,
                        name: classForm.name || (selSub ? `Rombel Pilihan ${selSub.name}` : '')
                      });
                    }}
                    placeholder="-- Pilih Mata Pelajaran Pilihan --"
                    searchPlaceholder="Cari nama mapel pilihan / blok..."
                    emptyText="Tidak ada mata pelajaran pilihan yang terdaftar di kurikulum"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Hanya menampilkan mata pelajaran yang telah ditandai sebagai <b>Mata Pelajaran Pilihan</b> di menu Kurikulum & Mapel.
                  </p>
                </div>
              )}

              {classForm.type === 'ekstrakurikuler' && (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Pilih Cabang Ekstrakurikuler *</label>
                  <select
                    required
                    value={classForm.extracurricular_id}
                    onChange={(e) => {
                      const selectedEx = extracurriculars.find(x => x.id == e.target.value);
                      setClassForm({
                        ...classForm,
                        extracurricular_id: e.target.value,
                        name: classForm.name || (selectedEx ? `Rombel ${selectedEx.name}` : '')
                      });
                    }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold"
                  >
                    <option value="">-- Pilih Cabang Ekskul --</option>
                    {extracurriculars.map((ex) => (
                      <option key={ex.id} value={ex.id}>{ex.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  {classForm.type === 'ekstrakurikuler' ? 'Nama Rombel Ekskul *' : 'Nama Rombel / Kelas *'}
                </label>
                <input
                  type="text"
                  required
                  placeholder={classForm.type === 'ekstrakurikuler' ? "mis. Pramuka Putra A / Robotik Inti" : "mis. 7A / VII-A"}
                  value={classForm.name}
                  onChange={(e) => setClassForm({ ...classForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                />
              </div>

              {classForm.type === 'reguler' && (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tingkat Kelas *</label>
                  <select
                    required
                    value={classForm.grade_level_id}
                    onChange={(e) => setClassForm({ ...classForm, grade_level_id: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold"
                  >
                    <option value="">-- Pilih Tingkat Kelas --</option>
                    {gradeLevels.map((g) => (
                      <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Tahun Ajaran *</label>
                <select
                  required
                  value={classForm.academic_year_id}
                  onChange={(e) => setClassForm({ ...classForm, academic_year_id: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold"
                >
                  <option value="">-- Pilih Tahun Ajaran --</option>
                  {academicYears.map((y) => (
                    <option key={y.id} value={y.id}>{y.name} {y.is_active ? '(Aktif)' : ''}</option>
                  ))}
                </select>
              </div>

              {classForm.type !== 'pilihan' ? (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    {classForm.type === 'ekstrakurikuler' ? 'Pembina / Pelatih Ekskul' : 'Wali Kelas'}
                  </label>
                  <SearchableSelect
                    options={[
                      { value: '', label: '-- Belum Ditentukan / Kosongkan --' },
                      ...(Array.isArray(teachers) ? teachers : []).map((t) => ({
                        value: String(t.id),
                        label: t.full_name,
                        sublabel: `NIP/Kode: ${t.nip || t.employee_code || t.employee_number || t.nuptk || '-'} • ${t.position_name || 'Guru / Pegawai'}`
                      }))
                    ]}
                    value={String(classForm.homeroom_teacher_employee_id || '')}
                    onChange={(val) => setClassForm({ ...classForm, homeroom_teacher_employee_id: val })}
                    placeholder={classForm.type === 'ekstrakurikuler' ? '-- Cari & Pilih Pembina / Pelatih --' : '-- Cari & Pilih Wali Kelas --'}
                    searchPlaceholder="Ketik nama guru, pembina, atau NIP..."
                    emptyText="Guru/Pembina tidak ditemukan"
                  />
                </div>
              ) : (
                <div className="p-3 bg-amber-50 border border-amber-200/80 rounded-xl text-xs text-amber-900 font-medium flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>💡 Rombel Mata Pelajaran Pilihan tidak memerlukan Wali Kelas. Penetapan guru pengampu dilakukan pada Pembagian Tugas Mengajar.</span>
                </div>
              )}

              {/* FITUR GABUNG DENGAN SATUAN PENDIDIKAN LAIN (KHUSUS EKSKUL) */}
              {classForm.type === 'ekstrakurikuler' && (
                <div className="p-3.5 bg-purple-50/70 border border-purple-200 rounded-2xl space-y-2.5">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={classForm.is_cross_unit}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setClassForm({
                          ...classForm,
                          is_cross_unit: checked,
                          target_school_unit_ids: checked
                            ? schoolUnitsList.map(u => u.id)
                            : []
                        });
                      }}
                      className="rounded text-purple-600 focus:ring-purple-500 w-4 h-4"
                    />
                    <div className="flex flex-col">
                      <span className="font-bold text-purple-950 text-xs flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-purple-700" />
                        Digabung dengan Satuan Pendidikan Lain
                      </span>
                      <span className="text-[10px] text-purple-700">
                        Mengizinkan santri/siswa dari unit lain (mis. gabungan SMP & SMA) bergabung ke rombel ekskul ini.
                      </span>
                    </div>
                  </label>

                  {classForm.is_cross_unit && (
                    <div className="pt-2 border-t border-purple-200 space-y-1.5">
                      <span className="text-[11px] font-semibold text-purple-900 block">
                        Pilih Satuan Pendidikan yang Digabung:
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                        {schoolUnitsList.map((unit) => {
                          const isIncluded = classForm.target_school_unit_ids.includes(unit.id);
                          return (
                            <label
                              key={unit.id}
                              className={`flex items-center gap-2 p-2 rounded-xl border text-xs cursor-pointer transition ${
                                isIncluded
                                  ? 'bg-white border-purple-400 text-purple-950 font-bold shadow-2xs'
                                  : 'bg-purple-50/50 border-purple-200 text-slate-600'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isIncluded}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setClassForm({
                                      ...classForm,
                                      target_school_unit_ids: [...classForm.target_school_unit_ids, unit.id]
                                    });
                                  } else {
                                    setClassForm({
                                      ...classForm,
                                      target_school_unit_ids: classForm.target_school_unit_ids.filter(id => id !== unit.id)
                                    });
                                  }
                                }}
                                className="rounded text-purple-600 focus:ring-0 w-3.5 h-3.5"
                              />
                              <span className="truncate">{unit.name} ({unit.level})</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Kapasitas Maksimal Siswa</label>
                <input
                  type="number"
                  placeholder="32"
                  value={classForm.capacity}
                  onChange={(e) => setClassForm({ ...classForm, capacity: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowClassModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-teal-600 text-white rounded-xl font-semibold shadow-xs"
                >
                  Simpan Rombel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL TAMBAH ANGGOTA ROMBEL --- */}
      {showAddMembersModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-2xl border border-slate-100 my-8 animate-in fade-in zoom-in-95 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
              <div>
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-teal-600" />
                  <span>
                    {selectedClass?.type === 'ekstrakurikuler' ? 'Pilih Peserta Ekstrakurikuler' : 'Pilih Siswa Belum Masuk Rombel'}
                  </span>
                </h3>
                <p className="text-xs text-slate-500">
                  Rombel Tujuan: <span className="font-bold text-teal-700">{selectedClass?.name}</span> ({selectedClass?.academic_year_name})
                </p>
              </div>
              <button
                onClick={() => setShowAddMembersModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Filter Search */}
            <div className={`grid grid-cols-1 ${selectedClass?.is_cross_unit ? 'sm:grid-cols-4' : 'sm:grid-cols-3'} gap-3 pt-3 shrink-0 text-xs`}>
              <div className={selectedClass?.is_cross_unit ? 'sm:col-span-2' : 'sm:col-span-2'}>
                <input
                  type="text"
                  placeholder="Cari berdasarkan nama lengkap, NIS, NISN..."
                  value={searchCandidate}
                  onChange={(e) => setSearchCandidate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              {selectedClass?.is_cross_unit && (
                <div>
                  <select
                    value={filterCandidateSatuanId}
                    onChange={(e) => setFilterCandidateSatuanId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                  >
                    <option value="">Semua Satuan</option>
                    {schoolUnitsList.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <select
                  value={filterCohortId}
                  onChange={(e) => setFilterCohortId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                >
                  <option value="">Semua Angkatan</option>
                  {cohorts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* List Siswa */}
            <div className="flex-1 overflow-y-auto py-2">
              {loadingCandidates ? (
                <div className="py-16 text-center text-slate-400">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-teal-600 mb-2" />
                  <p className="text-xs">Mencari siswa calon anggota...</p>
                </div>
              ) : filteredCandidates.length === 0 ? (
                <div className="py-16 text-center text-slate-400 text-xs">
                  Tidak ada data siswa yang memenuhi kriteria.
                </div>
              ) : (
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-slate-700 sticky top-0 border-y border-slate-100 select-none">
                    <tr>
                      <th className="py-2.5 px-3 w-10 text-center">
                        <button
                          type="button"
                          onClick={() => handleSelectAllCandidates(filteredCandidates)}
                          className="text-teal-600 hover:text-teal-800"
                          title="Pilih Semua"
                        >
                          {selectedStudentIds.length === filteredCandidates.length && filteredCandidates.length > 0 ? (
                            <CheckSquare className="w-4 h-4 text-teal-600" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-400" />
                          )}
                        </button>
                      </th>
                      <th
                        onClick={() => handleCandidateSort('nis')}
                        className="py-2.5 px-3 font-bold cursor-pointer hover:bg-slate-100 transition"
                      >
                        <div className="flex items-center gap-1.5">
                          <span>NIS / NISN</span>
                          {candidateSortField === 'nis' ? (
                            candidateSortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-teal-600" /> : <ArrowDown className="w-3.5 h-3.5 text-teal-600" />
                          ) : (
                            <ArrowUpDown className="w-3 h-3 opacity-40" />
                          )}
                        </div>
                      </th>
                      <th
                        onClick={() => handleCandidateSort('full_name')}
                        className="py-2.5 px-3 font-bold cursor-pointer hover:bg-slate-100 transition"
                      >
                        <div className="flex items-center gap-1.5">
                          <span>Nama Siswa</span>
                          {candidateSortField === 'full_name' ? (
                            candidateSortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-teal-600" /> : <ArrowDown className="w-3.5 h-3.5 text-teal-600" />
                          ) : (
                            <ArrowUpDown className="w-3 h-3 opacity-40" />
                          )}
                        </div>
                      </th>
                      {selectedClass?.is_cross_unit && (
                        <th
                          onClick={() => handleCandidateSort('satuan_pendidikan_id')}
                          className="py-2.5 px-3 font-bold cursor-pointer hover:bg-slate-100 transition"
                        >
                          <div className="flex items-center gap-1.5">
                            <span>Satuan Pendidikan</span>
                            {candidateSortField === 'satuan_pendidikan_id' ? (
                              candidateSortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-teal-600" /> : <ArrowDown className="w-3.5 h-3.5 text-teal-600" />
                            ) : (
                              <ArrowUpDown className="w-3 h-3 opacity-40" />
                            )}
                          </div>
                        </th>
                      )}
                      <th
                        onClick={() => handleCandidateSort('gender')}
                        className="py-2.5 px-3 font-bold cursor-pointer hover:bg-slate-100 transition"
                      >
                        <div className="flex items-center gap-1.5">
                          <span>L/P</span>
                          {candidateSortField === 'gender' ? (
                            candidateSortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-teal-600" /> : <ArrowDown className="w-3.5 h-3.5 text-teal-600" />
                          ) : (
                            <ArrowUpDown className="w-3 h-3 opacity-40" />
                          )}
                        </div>
                      </th>
                      <th
                        onClick={() => handleCandidateSort('cohort_title')}
                        className="py-2.5 px-3 font-bold cursor-pointer hover:bg-slate-100 transition"
                      >
                        <div className="flex items-center gap-1.5">
                          <span>Angkatan</span>
                          {candidateSortField === 'cohort_title' ? (
                            candidateSortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-teal-600" /> : <ArrowDown className="w-3.5 h-3.5 text-teal-600" />
                          ) : (
                            <ArrowUpDown className="w-3 h-3 opacity-40" />
                          )}
                        </div>
                      </th>
                    </tr>
                    {/* Header Filter Row */}
                    <tr className="bg-slate-100/70 border-t border-slate-200">
                      <th className="py-1 px-2 text-center text-slate-400 font-normal">
                        <span className="text-[10px]">Filter:</span>
                      </th>
                      <th className="py-1 px-2">
                        <input
                          type="text"
                          placeholder="Filter NIS..."
                          value={searchCandidate}
                          onChange={(e) => setSearchCandidate(e.target.value)}
                          className="w-full px-2 py-1 text-[11px] bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-teal-500"
                        />
                      </th>
                      <th className="py-1 px-2">
                        <input
                          type="text"
                          placeholder="Filter Nama..."
                          value={searchCandidate}
                          onChange={(e) => setSearchCandidate(e.target.value)}
                          className="w-full px-2 py-1 text-[11px] bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-teal-500"
                        />
                      </th>
                      {selectedClass?.is_cross_unit && (
                        <th className="py-1 px-2">
                          <select
                            value={filterCandidateSatuanId}
                            onChange={(e) => setFilterCandidateSatuanId(e.target.value)}
                            className="w-full px-1.5 py-1 text-[11px] bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-teal-500"
                          >
                            <option value="">Semua</option>
                            {schoolUnitsList.map((u) => (
                              <option key={u.id} value={u.id}>
                                {u.name}
                              </option>
                            ))}
                          </select>
                        </th>
                      )}
                      <th className="py-1 px-2">
                        <select
                          value={filterCandidateGender}
                          onChange={(e) => setFilterCandidateGender(e.target.value)}
                          className="w-full px-1.5 py-1 text-[11px] bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-teal-500"
                        >
                          <option value="">Semua</option>
                          <option value="L">L</option>
                          <option value="P">P</option>
                        </select>
                      </th>
                      <th className="py-1 px-2">
                        <select
                          value={filterCohortId}
                          onChange={(e) => setFilterCohortId(e.target.value)}
                          className="w-full px-1.5 py-1 text-[11px] bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-teal-500"
                        >
                          <option value="">Semua</option>
                          {cohorts.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {[...filteredCandidates]
                      .sort((a, b) => {
                        let valA = a[candidateSortField] || '';
                        let valB = b[candidateSortField] || '';
                        if (typeof valA === 'string') valA = valA.toLowerCase();
                        if (typeof valB === 'string') valB = valB.toLowerCase();
                        if (valA < valB) return candidateSortDirection === 'asc' ? -1 : 1;
                        if (valA > valB) return candidateSortDirection === 'asc' ? 1 : -1;
                        return 0;
                      })
                      .map((s) => {
                      const isSelected = selectedStudentIds.includes(s.id);
                      const unit = schoolUnitsList.find(u => String(u.id) === String(s.satuan_pendidikan_id));
                      return (
                        <tr
                          key={s.id}
                          onClick={() => handleToggleSelectStudent(s.id)}
                          className={`cursor-pointer transition ${
                            isSelected ? 'bg-teal-50/70 font-semibold' : 'hover:bg-slate-50/60'
                          }`}
                        >
                          <td className="py-2.5 px-3 text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {}}
                              className="rounded text-teal-600 focus:ring-0 cursor-pointer"
                            />
                          </td>
                          <td className="py-2.5 px-3 font-mono font-bold text-slate-800">
                            {s.nis}
                            {s.nisn && <span className="text-[10px] text-slate-400 font-normal block">{s.nisn}</span>}
                          </td>
                          <td className="py-2.5 px-3 font-bold text-slate-800">{s.full_name}</td>
                          {selectedClass?.is_cross_unit && (
                            <td className="py-2.5 px-3">
                              <span className="px-2 py-0.5 bg-purple-50 text-purple-700 border border-purple-200 rounded font-semibold text-[10px]">
                                {unit?.name || `Unit #${s.satuan_pendidikan_id}`}
                              </span>
                            </td>
                          )}
                          <td className="py-2.5 px-3">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                s.gender === 'L' ? 'bg-blue-50 text-blue-700' : 'bg-pink-50 text-pink-700'
                              }`}
                            >
                              {s.gender === 'L' ? 'L' : 'P'}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-slate-600">
                            {s.cohort_title || s.cohort_name || '-'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* Footer Modal */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100 shrink-0 text-xs">
              <span className="font-bold text-slate-700">
                <span className="text-teal-700 font-extrabold">{selectedStudentIds.length}</span> Siswa Terpilih
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddMembersModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl font-semibold"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={selectedStudentIds.length === 0}
                  onClick={handleSaveAddMembers}
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white rounded-xl font-bold shadow-xs transition flex items-center gap-1.5"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Masukkan ke {selectedClass?.name}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL KELUARKAN SISWA DARI ROMBEL (DENGAN ALASAN & CATATAN) */}
      {showRemoveModal && removeTarget && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center">
                  <UserMinus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Keluarkan Siswa dari Rombel</h3>
                  <p className="text-[11px] text-slate-400">Riwayat & alasan pengeluaran akan disimpan di database</p>
                </div>
              </div>
              <button
                onClick={() => setShowRemoveModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-rose-50/50 p-3.5 rounded-2xl border border-rose-100 text-xs space-y-1">
              <div className="text-slate-600">
                Nama Siswa: <span className="font-bold text-slate-900">{removeTarget.student_name}</span>
              </div>
              <div className="text-slate-600">
                NIS: <span className="font-mono font-bold text-slate-800">{removeTarget.student_nis || '-'}</span>
              </div>
              <div className="text-slate-600">
                Rombel Asal: <span className="font-bold text-rose-700">{selectedClass?.name}</span> ({selectedClass?.type === 'ekstrakurikuler' ? 'Ekskul' : 'Reguler'})
              </div>
            </div>

            <form onSubmit={handleConfirmRemove} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Alasan Pengeluaran *</label>
                <select
                  required
                  value={removeForm.reason}
                  onChange={(e) => setRemoveForm({ ...removeForm, reason: e.target.value })}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:outline-none focus:border-rose-500 transition"
                >
                  <option value="Permintaan Siswa / Wali Santri">Permintaan Siswa / Wali Santri</option>
                  <option value="Pindah Minat / Cabang Ekskul Lain">Pindah Minat / Cabang Ekskul Lain</option>
                  <option value="Penyesuaian Kapasitas / Rombel Baru">Penyesuaian Kapasitas / Rombel Baru</option>
                  <option value="Mutasi Sekolah / Berhenti">Mutasi Sekolah / Berhenti</option>
                  <option value="Kesalahan Penempatan Awal">Kesalahan Penempatan Awal</option>
                  <option value="Evaluasi Pembina / Dewan Guru">Evaluasi Pembina / Dewan Guru</option>
                  <option value="Lainnya">Lainnya</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Catatan / Keterangan Tambahan <span className="text-slate-400 font-normal">(Opsional)</span>
                </label>
                <textarea
                  rows={3}
                  value={removeForm.notes}
                  onChange={(e) => setRemoveForm({ ...removeForm, notes: e.target.value })}
                  placeholder="Tuliskan catatan detail mengenai alasan pengeluaran santri dari rombel..."
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-rose-500 transition"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  disabled={isRemoving}
                  onClick={() => setShowRemoveModal(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isRemoving}
                  className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-xl font-bold shadow-md shadow-rose-600/20 transition flex items-center gap-1.5"
                >
                  {isRemoving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserMinus className="w-3.5 h-3.5" />}
                  <span>Keluarkan & Simpan Riwayat</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL RIWAYAT PENGELUARAN SISWA DARI ROMBEL */}
      {showRemovalLogsModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center">
                  <History className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">
                    Riwayat Pengeluaran Siswa - {selectedClass?.name}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Rekam jejak mutasi & pengeluaran siswa dari rombel ini beserta alasan dan pelaksana
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowRemovalLogsModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Filter Search Log */}
            <div className="relative shrink-0">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchRemovalLog}
                onChange={(e) => setSearchRemovalLog(e.target.value)}
                placeholder="Cari nama siswa, NIS, alasan, atau catatan..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-amber-500"
              />
            </div>

            {/* Log Table Body */}
            <div className="overflow-y-auto flex-1 min-h-[250px] border border-slate-100 rounded-2xl">
              {loadingRemovalLogs ? (
                <div className="py-16 text-center text-slate-400 space-y-2">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-amber-600" />
                  <p className="text-xs">Memuat riwayat pengeluaran...</p>
                </div>
              ) : removalLogs.length === 0 ? (
                <div className="py-16 text-center text-slate-400 space-y-2">
                  <FileText className="w-10 h-10 text-slate-300 mx-auto" />
                  <p className="text-xs font-semibold">Belum ada catatan pengeluaran siswa pada rombel ini.</p>
                </div>
              ) : (
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200/80 sticky top-0">
                    <tr>
                      <th className="py-2.5 px-3.5">Waktu & Pelaksana</th>
                      <th className="py-2.5 px-3.5">Nama Siswa / NIS</th>
                      <th className="py-2.5 px-3.5">Alasan</th>
                      <th className="py-2.5 px-3.5">Catatan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {removalLogs
                      .filter((l) => {
                        if (!searchRemovalLog) return true;
                        const q = searchRemovalLog.toLowerCase();
                        return (
                          (l.student_name && l.student_name.toLowerCase().includes(q)) ||
                          (l.student_nis && l.student_nis.toLowerCase().includes(q)) ||
                          (l.reason && l.reason.toLowerCase().includes(q)) ||
                          (l.notes && l.notes.toLowerCase().includes(q)) ||
                          (l.removed_by_user_name && l.removed_by_user_name.toLowerCase().includes(q))
                        );
                      })
                      .map((log) => (
                        <tr key={log.id} className="hover:bg-slate-50/80 transition">
                          <td className="py-2.5 px-3.5 whitespace-nowrap">
                            <div className="font-semibold text-slate-800">
                              {log.removed_at ? new Date(log.removed_at).toLocaleString('id-ID', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              }) : '-'}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              Oleh: <span className="text-indigo-600 font-medium">{log.removed_by_user_name || 'Admin'}</span>
                            </div>
                          </td>
                          <td className="py-2.5 px-3.5">
                            <div className="font-bold text-slate-900">{log.student_name}</div>
                            {log.student_nis && (
                              <div className="text-[10px] font-mono text-slate-400">NIS: {log.student_nis}</div>
                            )}
                          </td>
                          <td className="py-2.5 px-3.5">
                            <span className="px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-bold">
                              {log.reason}
                            </span>
                          </td>
                          <td className="py-2.5 px-3.5 text-slate-600 italic text-[11px]">
                            {log.notes || <span className="text-slate-300 font-normal">Tidak ada catatan</span>}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100 shrink-0">
              <button
                type="button"
                onClick={() => setShowRemovalLogsModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL PINDAH ROMBEL */}
      {showTransferModal && transferTarget && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95">
            <h3 className="text-sm font-bold text-slate-800 mb-3 pb-2 border-b border-slate-100 flex items-center gap-2">
              <ArrowRightLeft className="w-4 h-4 text-blue-600" />
              <span>Pindah Rombel Siswa</span>
            </h3>

            <div className="bg-slate-50 p-3 rounded-xl text-xs space-y-1 mb-4 border border-slate-200">
              <div className="text-slate-500">Nama Siswa: <span className="font-bold text-slate-800">{transferTarget.student_name}</span></div>
              <div className="text-slate-500">NIS: <span className="font-mono font-bold text-slate-700">{transferTarget.student_nis}</span></div>
              <div className="text-slate-500">Rombel Saat Ini: <span className="font-bold text-rose-600">{selectedClass?.name}</span></div>
            </div>

            <form onSubmit={handleSaveTransfer} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Pilih Rombel Tujuan *</label>
                <select
                  required
                  value={targetClassId}
                  onChange={(e) => setTargetClassId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800"
                >
                  <option value="">-- Pilih Rombel Reguler Tujuan --</option>
                  {classGroups
                    .filter(
                      (cg) =>
                        cg.id !== selectedClass?.id &&
                        (!cg.type || cg.type === 'reguler') &&
                        (!selectedClass?.academic_year_id || String(cg.academic_year_id) === String(selectedClass.academic_year_id))
                    )
                    .map((cg) => (
                      <option key={cg.id} value={cg.id}>
                        {cg.name} (Tingkat {cg.grade_level_name || 'Kelas'}) - Terisi: {cg.student_count || 0}/{cg.capacity || 32}
                      </option>
                    ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowTransferModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-xs transition"
                >
                  Pindahkan Siswa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
