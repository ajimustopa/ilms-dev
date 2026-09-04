import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../../shared/services/api';
import { useAuth } from '../../../shared/store/AuthContext';
import {
  GraduationCap,
  Plus,
  Search,
  Edit2,
  Trash2,
  Users,
  ArrowRightLeft,
  X,
  Loader2,
  CheckCircle,
  AlertCircle,
  Eye,
  School,
  Layers,
  UserPlus,
  Calendar,
  Sparkles,
  CheckSquare,
  Square,
  RotateCw,
  ArrowUpDown,
  ArrowUp,
  ArrowDown
} from 'lucide-react';

export default function DataSiswa() {
  const { activeSchoolUnit } = useAuth();
  const [students, setStudents] = useState([]);
  const [cohorts, setCohorts] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [academicYearFilter, setAcademicYearFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [cohortFilter, setCohortFilter] = useState('');
  const [pagination, setPagination] = useState({ page: 1, per_page: 100, total: 0 });

  // State Sorting Kolom
  const [sortField, setSortField] = useState('full_name');
  const [sortDirection, setSortDirection] = useState('asc'); // 'asc' | 'desc'

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Modal State Tambah / Edit Siswa
  const [modalOpen, setModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);

  // Modal State Wali
  const [guardianModalOpen, setGuardianModalOpen] = useState(false);
  const [selectedStudentForGuardian, setSelectedStudentForGuardian] = useState(null);

  // Modal State Masukkan ke Rombel
  const [assignRombelModalOpen, setAssignRombelModalOpen] = useState(false);
  const [selectedStudentForRombel, setSelectedStudentForRombel] = useState(null);
  const [availableClassGroups, setAvailableClassGroups] = useState([]);
  const [targetClassGroupId, setTargetClassGroupId] = useState('');
  const [savingRombel, setSavingRombel] = useState(false);
  const [guardiansList, setGuardiansList] = useState([]);

  // Modal State Kenaikan Kelas / Roll-over Tahun Ajaran
  const [promoteModalOpen, setPromoteModalOpen] = useState(false);
  const [promoteForm, setPromoteForm] = useState({
    target_academic_year_id: '',
    target_class_group_id: '',
    student_ids: []
  });
  const [targetAcademicYearClassGroups, setTargetAcademicYearClassGroups] = useState([]);
  const [savingPromote, setSavingPromote] = useState(false);

  // Form State Siswa
  const [formData, setFormData] = useState({
    satuan_pendidikan_id: activeSchoolUnit?.id || 1,
    cohort_id: '',
    cohort_name: '',
    academic_year_id: '',
    class_group_id: '',
    registration_type: 'Siswa Baru',
    previous_school_name: '',
    previous_school_address: '',
    nis: '',
    nisn: '',
    full_name: '',
    gender: 'L',
    birth_place: '',
    birth_date: '',
    address: '',
    status: 'aktif',
    enrolled_at: new Date().toISOString().split('T')[0]
  });

  // Form State Wali
  const [guardianForm, setGuardianForm] = useState({
    full_name: '',
    occupation: '',
    phone: '',
    email: '',
    address: '',
    relationship: 'ayah',
    is_primary_contact: true
  });

  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    fetchCohorts();
    fetchAcademicYears();
  }, [activeSchoolUnit]);

  useEffect(() => {
    fetchStudents();
  }, [search, statusFilter, cohortFilter, academicYearFilter, activeSchoolUnit]);

  const fetchCohorts = async () => {
    try {
      const params = {};
      if (activeSchoolUnit?.id && activeSchoolUnit.id !== 'all') params.satuan_pendidikan_id = activeSchoolUnit.id;
      const res = await api.get('/akademik/cohorts', { params });
      setCohorts(res.data?.data || []);
    } catch (e) {}
  };

  const fetchAcademicYears = async () => {
    try {
      const params = {};
      if (activeSchoolUnit?.id && activeSchoolUnit.id !== 'all') params.satuan_pendidikan_id = activeSchoolUnit.id;
      const res = await api.get('/akademik/academic-years', { params });
      const list = res.data?.data || [];
      setAcademicYears(list);
    } catch (e) {}
  };

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const params = {
        per_page: 500 // Muat seluruh siswa untuk kelengkapan data
      };
      if (activeSchoolUnit?.id && activeSchoolUnit.id !== 'all') params.satuan_pendidikan_id = activeSchoolUnit.id;
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      if (cohortFilter) params.cohort_id = cohortFilter;
      if (academicYearFilter && academicYearFilter !== 'all') params.academic_year_id = academicYearFilter;

      const res = await api.get('/akademik/students', { params });
      const rawList = res.data?.data?.items || (Array.isArray(res.data?.data) ? res.data.data : []);
      setStudents(rawList);
      setPagination(res.data?.pagination || { page: 1, per_page: 500, total: rawList.length });
    } catch (err) {
      console.error('Error fetching students:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAddModal = async () => {
    setEditingStudent(null);
    const activeYear = academicYears.find((y) => y.is_active);
    const defaultYearId = academicYearFilter !== 'all' && academicYearFilter ? academicYearFilter : (activeYear?.id || '');
    setFormData({
      satuan_pendidikan_id: activeSchoolUnit?.id || 1,
      cohort_id: '',
      cohort_name: '',
      academic_year_id: defaultYearId,
      class_group_id: '',
      registration_type: 'Siswa Baru',
      previous_school_name: '',
      previous_school_address: '',
      nis: '',
      nisn: '',
      full_name: '',
      gender: 'L',
      birth_place: '',
      birth_date: '',
      address: '',
      status: 'aktif',
      enrolled_at: new Date().toISOString().split('T')[0]
    });
    setErrorMsg('');
    try {
      const res = await api.get('/akademik/class-groups', {
        params: { satuan_pendidikan_id: activeSchoolUnit?.id, academic_year_id: defaultYearId }
      });
      setAvailableClassGroups(res.data?.data || []);
    } catch (e) {}
    setModalOpen(true);
  };

  const handleOpenEditModal = (student) => {
    setEditingStudent(student);
    setFormData({
      satuan_pendidikan_id: student.satuan_pendidikan_id || 1,
      cohort_id: student.cohort_id || '',
      cohort_name: student.cohort_name || '',
      academic_year_id: student.academic_year_id || academicYearFilter || '',
      class_group_id: student.class_group_id || '',
      registration_type: student.registration_type || 'Siswa Baru',
      previous_school_name: student.previous_school_name || '',
      previous_school_address: student.previous_school_address || '',
      nis: student.nis || '',
      nisn: student.nisn || '',
      full_name: student.full_name || '',
      gender: student.gender || 'L',
      birth_place: student.birth_place || '',
      birth_date: student.birth_date ? student.birth_date.split('T')[0] : '',
      address: student.address || '',
      status: student.status || 'aktif',
      enrolled_at: student.enrolled_at ? student.enrolled_at.split('T')[0] : new Date().toISOString().split('T')[0]
    });
    setErrorMsg('');
    setModalOpen(true);
  };

  const handleSaveStudent = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg('');

    try {
      const payload = {
        ...formData,
        admission: {
          registration_type: formData.registration_type,
          previous_school_name: formData.previous_school_name,
          previous_school_address: formData.previous_school_address,
          admission_date: formData.enrolled_at
        }
      };

      if (editingStudent) {
        await api.put(`/akademik/students/${editingStudent.id}`, payload);
        setSuccessMsg('Data siswa berhasil diperbarui!');
      } else {
        await api.post('/akademik/students', payload);
        setSuccessMsg('Siswa baru berhasil ditambahkan!');
      }
      setModalOpen(false);
      fetchStudents();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Gagal menyimpan data siswa');
    } finally {
      setSaving(false);
    }
  };

  const handleOpenGuardianModal = async (student) => {
    setSelectedStudentForGuardian(student);
    setErrorMsg('');
    try {
      const res = await api.get(`/akademik/students/${student.id}/guardians`);
      setGuardiansList(res.data?.data || []);
      setGuardianModalOpen(true);
    } catch (err) {
      console.error('Error fetching guardians:', err);
    }
  };

  const handleSaveGuardian = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg('');

    try {
      await api.post(`/akademik/students/${selectedStudentForGuardian.id}/guardians`, guardianForm);
      const res = await api.get(`/akademik/students/${selectedStudentForGuardian.id}/guardians`);
      setGuardiansList(res.data?.data || []);
      setGuardianForm({
        full_name: '',
        occupation: '',
        phone: '',
        email: '',
        address: '',
        relationship: 'ayah',
        is_primary_contact: true
      });
      setSuccessMsg('Wali berhasil dikaitkan ke siswa!');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Gagal menambahkan wali');
    } finally {
      setSaving(false);
    }
  };

  // --- MASUKKAN SISWA KE ROMBEL ---
  const handleOpenAssignRombelModal = async (student) => {
    setSelectedStudentForRombel(student);
    setTargetClassGroupId(student.class_group_id || '');
    setAssignRombelModalOpen(true);
    try {
      const res = await api.get('/akademik/class-groups', {
        params: {
          satuan_pendidikan_id: activeSchoolUnit?.id || student.satuan_pendidikan_id,
          type: 'reguler'
        }
      });
      setAvailableClassGroups((res.data?.data || []).filter((cg) => !cg.type || cg.type === 'reguler'));
    } catch (err) {
      console.error('Gagal mengambil daftar rombel:', err);
    }
  };

  const handleSaveAssignRombel = async (e) => {
    e.preventDefault();
    if (!targetClassGroupId) {
      alert('Pilih rombongan belajar terlebih dahulu');
      return;
    }
    try {
      setSavingRombel(true);
      await api.post(`/akademik/class-groups/${targetClassGroupId}/members`, {
        student_ids: [selectedStudentForRombel.id],
        satuan_pendidikan_id: activeSchoolUnit?.id || selectedStudentForRombel.satuan_pendidikan_id
      });
      setSuccessMsg(`Siswa ${selectedStudentForRombel.full_name} berhasil dimasukkan ke rombel!`);
      setTimeout(() => setSuccessMsg(''), 4000);
      setAssignRombelModalOpen(false);
      fetchStudents();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal memasukkan siswa ke rombel');
    } finally {
      setSavingRombel(false);
    }
  };

  // --- KENAIKAN KELAS / ROLL-OVER TAHUN AJARAN ---
  const handleOpenPromoteModal = async () => {
    const activeYear = academicYears.find((y) => y.is_active);
    const defaultTargetYearId = activeYear ? activeYear.id : '';
    setPromoteForm({
      target_academic_year_id: defaultTargetYearId,
      target_class_group_id: '',
      student_ids: students.map((s) => s.id)
    });
    setPromoteModalOpen(true);
    if (defaultTargetYearId) {
      try {
        const res = await api.get('/akademik/class-groups', {
          params: { satuan_pendidikan_id: activeSchoolUnit?.id, academic_year_id: defaultTargetYearId }
        });
        setTargetAcademicYearClassGroups(res.data?.data || []);
      } catch (e) {}
    }
  };

  const handleTargetYearChange = async (yearId) => {
    setPromoteForm({ ...promoteForm, target_academic_year_id: yearId, target_class_group_id: '' });
    try {
      const res = await api.get('/akademik/class-groups', {
        params: { satuan_pendidikan_id: activeSchoolUnit?.id, academic_year_id: yearId }
      });
      setTargetAcademicYearClassGroups(res.data?.data || []);
    } catch (e) {}
  };

  const handleToggleStudentSelection = (id) => {
    const current = [...promoteForm.student_ids];
    const index = current.indexOf(id);
    if (index > -1) {
      current.splice(index, 1);
    } else {
      current.push(id);
    }
    setPromoteForm({ ...promoteForm, student_ids: current });
  };

  const handleToggleSelectAll = () => {
    if (promoteForm.student_ids.length === students.length) {
      setPromoteForm({ ...promoteForm, student_ids: [] });
    } else {
      setPromoteForm({ ...promoteForm, student_ids: students.map((s) => s.id) });
    }
  };

  const handleSavePromote = async (e) => {
    e.preventDefault();
    if (!promoteForm.target_academic_year_id || !promoteForm.target_class_group_id || !promoteForm.student_ids.length) {
      alert('Mohon pilih Tahun Ajaran Tujuan, Rombel Tujuan, dan minimal 1 siswa');
      return;
    }
    try {
      setSavingPromote(true);
      const res = await api.post('/akademik/students/promote', {
        satuan_pendidikan_id: activeSchoolUnit?.id || 1,
        target_academic_year_id: promoteForm.target_academic_year_id,
        target_class_group_id: promoteForm.target_class_group_id,
        student_ids: promoteForm.student_ids
      });
      setSuccessMsg(res.data?.message || 'Proses kenaikan kelas/penempatan berhasil!');
      setTimeout(() => setSuccessMsg(''), 4000);
      setPromoteModalOpen(false);
      setAcademicYearFilter(promoteForm.target_academic_year_id);
      fetchStudents();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal memproses kenaikan kelas');
    } finally {
      setSavingPromote(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Halaman */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Data Induk Siswa</h1>
          <p className="text-xs text-slate-500 mt-1">
            Kelola data master seluruh siswa, NISN, rombongan belajar periodik per tahun ajaran, dan riwayat orang tua/wali.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={fetchStudents}
            disabled={loading}
            className="flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition active:scale-95 border border-slate-200 shadow-2xs"
            title="Segarkan Data dari Database"
          >
            <RotateCw className={`w-3.5 h-3.5 text-slate-600 ${loading ? 'animate-spin' : ''}`} />
            <span>Reload Data</span>
          </button>
          <button
            onClick={handleOpenPromoteModal}
            className="flex items-center justify-center gap-2 px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-semibold rounded-xl shadow-xs transition active:scale-95"
            title="Proses Kenaikan Kelas / Roll-over Siswa ke Tahun Ajaran Baru"
          >
            <Sparkles className="w-4 h-4 text-indigo-600" />
            <span>Kenaikan Kelas / Roll-over</span>
          </button>
          <button
            onClick={handleOpenAddModal}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold rounded-xl shadow-sm transition active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Siswa Baru</span>
          </button>
        </div>
      </div>

      {/* Alert Success */}
      {successMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-xs flex items-center gap-2">
          <CheckCircle className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Toolbar Filter & Pencarian */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full sm:w-auto">
          <div className="relative w-full sm:w-80">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama, NIS, atau NISN..."
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          </div>

          {/* Badge Jumlah Data Ditampilkan */}
          <div className="flex items-center gap-1.5 px-3 py-2 bg-slate-50 border border-slate-200/90 rounded-xl text-xs font-semibold text-slate-700 whitespace-nowrap self-start sm:self-auto shadow-2xs">
            <Users className="w-3.5 h-3.5 text-teal-600 shrink-0" />
            <span>
              Menampilkan: <strong className="text-teal-700 font-bold">{students.length}</strong> Siswa
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {/* Filter Tahun Ajaran (Periodik) */}
          <div className="flex items-center gap-1.5 bg-teal-50/70 border border-teal-200 px-3 py-1.5 rounded-xl">
            <Calendar className="w-3.5 h-3.5 text-teal-700 shrink-0" />
            <span className="text-[11px] font-bold text-teal-900 shrink-0">TA:</span>
            <select
              value={academicYearFilter}
              onChange={(e) => setAcademicYearFilter(e.target.value)}
              className="text-xs bg-transparent font-bold text-teal-900 focus:outline-none cursor-pointer"
            >
              <option value="all">Semua Tahun Ajaran</option>
              {academicYears.map((ay) => (
                <option key={ay.id} value={ay.id}>
                  TA {ay.name} {ay.is_active ? '(Aktif)' : ''}
                </option>
              ))}
            </select>
          </div>

          <select
            value={cohortFilter}
            onChange={(e) => setCohortFilter(e.target.value)}
            className="px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 w-full sm:w-auto font-semibold"
          >
            <option value="">Semua Angkatan</option>
            {cohorts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 w-full sm:w-auto"
          >
            <option value="">Semua Status</option>
            <option value="aktif">Aktif</option>
            <option value="calon">Calon</option>
            <option value="lulus">Lulus</option>
            <option value="pindah">Pindah</option>
            <option value="keluar">Keluar</option>
          </select>
        </div>
      </div>

      {/* Tabel Data Siswa */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto max-h-[calc(100vh-280px)] overflow-y-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 sticky top-0 z-10 shadow-2xs">
              <tr>
                <th
                  onClick={() => handleSort('nis')}
                  className="py-3.5 px-4 cursor-pointer hover:bg-slate-100 transition select-none"
                >
                  <div className="flex items-center gap-1.5">
                    <span>NIS / NISN</span>
                    {sortField === 'nis' ? (
                      sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-teal-600" /> : <ArrowDown className="w-3.5 h-3.5 text-teal-600" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 opacity-40" />
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('full_name')}
                  className="py-3.5 px-4 cursor-pointer hover:bg-slate-100 transition select-none"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Nama Lengkap</span>
                    {sortField === 'full_name' ? (
                      sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-teal-600" /> : <ArrowDown className="w-3.5 h-3.5 text-teal-600" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 opacity-40" />
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('class_group_name')}
                  className="py-3.5 px-4 cursor-pointer hover:bg-slate-100 transition select-none"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Rombel Reguler</span>
                    {sortField === 'class_group_name' ? (
                      sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-teal-600" /> : <ArrowDown className="w-3.5 h-3.5 text-teal-600" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 opacity-40" />
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('gender')}
                  className="py-3.5 px-4 cursor-pointer hover:bg-slate-100 transition select-none"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Jenis Kelamin</span>
                    {sortField === 'gender' ? (
                      sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-teal-600" /> : <ArrowDown className="w-3.5 h-3.5 text-teal-600" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 opacity-40" />
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('birth_date')}
                  className="py-3.5 px-4 cursor-pointer hover:bg-slate-100 transition select-none"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Tempat, Tgl Lahir</span>
                    {sortField === 'birth_date' ? (
                      sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-teal-600" /> : <ArrowDown className="w-3.5 h-3.5 text-teal-600" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 opacity-40" />
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('status')}
                  className="py-3.5 px-4 cursor-pointer hover:bg-slate-100 transition select-none"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Status Siswa</span>
                    {sortField === 'status' ? (
                      sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-teal-600" /> : <ArrowDown className="w-3.5 h-3.5 text-teal-600" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 opacity-40" />
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('dapodik_status')}
                  className="py-3.5 px-4 cursor-pointer hover:bg-slate-100 transition select-none"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Status Dapodik</span>
                    {sortField === 'dapodik_status' ? (
                      sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-teal-600" /> : <ArrowDown className="w-3.5 h-3.5 text-teal-600" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 opacity-40" />
                    )}
                  </div>
                </th>
                <th className="py-3.5 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-teal-600" />
                    <span>Memuat data siswa...</span>
                  </td>
                </tr>
              ) : students.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-400">
                    Tidak ada data siswa yang sesuai filter.
                  </td>
                </tr>
              ) : (
                [...students]
                  .sort((a, b) => {
                    let valA = a[sortField] || '';
                    let valB = b[sortField] || '';
                    if (typeof valA === 'string') valA = valA.toLowerCase();
                    if (typeof valB === 'string') valB = valB.toLowerCase();
                    if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
                    if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
                    return 0;
                  })
                  .map((student) => (
                  <tr key={student.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-medium text-slate-700">
                      <div className="font-bold text-slate-800">{student.nis}</div>
                      <div className="text-[10px] text-slate-400">NISN: {student.nisn || '-'}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-800">{student.full_name}</div>
                      <div className="text-[10px] text-slate-400 truncate max-w-xs">{student.address || '-'}</div>
                    </td>
                    <td className="py-3 px-4">
                      {student.class_group_name ? (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-extrabold bg-teal-50 text-teal-800 border border-teal-200/90 shadow-2xs">
                            <Layers className="w-3 h-3 text-teal-600 shrink-0" />
                            <span>{student.class_group_name}</span>
                          </span>
                          <button
                            onClick={() => handleOpenAssignRombelModal(student)}
                            title="Pindah / Ganti Rombel"
                            className="p-1 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded-md transition border border-transparent hover:border-teal-200"
                          >
                            <ArrowRightLeft className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200/90 px-2 py-0.5 rounded-md">
                            Belum masuk rombel
                          </span>
                          <button
                            onClick={() => handleOpenAssignRombelModal(student)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold bg-teal-600 hover:bg-teal-700 text-white rounded-lg shadow-2xs transition active:scale-95"
                            title="Masukkan Siswa ke Rombel"
                          >
                            <UserPlus className="w-3 h-3" />
                            <span>+ Masukkan ke Rombel</span>
                          </button>
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-md ${
                        student.gender === 'L' ? 'bg-blue-50 text-blue-700' : 'bg-pink-50 text-pink-700'
                      }`}>
                        {student.gender === 'L' ? 'Laki-Laki' : 'Perempuan'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600 text-xs">
                      {student.birth_place ? `${student.birth_place}, ` : ''}
                      {student.birth_date ? student.birth_date.split('T')[0] : '-'}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2.5 py-0.5 text-[10px] font-bold rounded-full uppercase ${
                        student.status === 'aktif' ? 'bg-emerald-100 text-emerald-700' :
                        student.status === 'calon' ? 'bg-amber-100 text-amber-700' :
                        student.status === 'lulus' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {student.status}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {student.dapodik_status === 'sudah_masuk_dapodik' && (
                        <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-blue-50 text-blue-700 border border-blue-200">
                          Sudah Dapodik
                        </span>
                      )}
                      {student.dapodik_status === 'kendala' && (
                        <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-rose-50 text-rose-700 border border-rose-200">
                          Ada Kendala
                        </span>
                      )}
                      {(!student.dapodik_status || student.dapodik_status === 'belum_masuk_dapodik') && (
                        <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-amber-50 text-amber-700 border border-amber-200">
                          Belum Masuk
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right space-x-1.5">
                      <Link
                        to={`/akademik/students/${student.id}`}
                        className="p-1.5 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition inline-flex items-center justify-center border border-slate-200"
                        title="Tampilkan Detail Siswa Lengkap"
                      >
                        <Eye className="w-4 h-4" />
                      </Link>
                      <button
                        onClick={() => handleOpenGuardianModal(student)}
                        title="Kelola Orang Tua / Wali Cepat"
                        className="p-1.5 text-slate-600 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition"
                      >
                        <Users className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleOpenEditModal(student)}
                        title="Edit Cepat"
                        className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Tambah / Edit Siswa */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-xl border border-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-sm font-bold text-slate-800">
                {editingStudent ? 'Edit Data Siswa' : 'Tambah Siswa Baru'}
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSaveStudent} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Nomor Induk Siswa (NIS) *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.nis}
                    onChange={(e) => setFormData({ ...formData, nis: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                    placeholder="Contoh: 202601004"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    NISN (Opsional)
                  </label>
                  <input
                    type="text"
                    value={formData.nisn}
                    onChange={(e) => setFormData({ ...formData, nisn: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                    placeholder="10 digit nomor NISN"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Nama Lengkap Siswa *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 font-bold"
                    placeholder="Masukkan nama lengkap siswa..."
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Pilihan Angkatan Siswa
                  </label>
                  <select
                    value={formData.cohort_id || ''}
                    onChange={(e) => {
                      const selectedCohort = cohorts.find(c => c.id === Number(e.target.value));
                      setFormData({
                        ...formData,
                        cohort_id: e.target.value ? Number(e.target.value) : null,
                        cohort_name: selectedCohort?.name || ''
                      });
                    }}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white font-semibold"
                  >
                    <option value="">-- Pilih Angkatan --</option>
                    {cohorts.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} (Tahun {c.year})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Jenis Kelamin *
                  </label>
                  <select
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                  >
                    <option value="L">Laki-Laki</option>
                    <option value="P">Perempuan</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Status Siswa *
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                  >
                    <option value="aktif">Aktif</option>
                    <option value="calon">Calon</option>
                    <option value="lulus">Lulus</option>
                    <option value="pindah">Pindah</option>
                    <option value="keluar">Keluar</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Tahun Ajaran Pendaftaran / Aktif
                  </label>
                  <select
                    value={formData.academic_year_id || ''}
                    onChange={async (e) => {
                      const yId = e.target.value;
                      setFormData({ ...formData, academic_year_id: yId, class_group_id: '' });
                      if (yId) {
                        try {
                          const res = await api.get('/akademik/class-groups', {
                            params: { satuan_pendidikan_id: activeSchoolUnit?.id, academic_year_id: yId }
                          });
                          setAvailableClassGroups(res.data?.data || []);
                        } catch (err) {}
                      } else {
                        setAvailableClassGroups([]);
                      }
                    }}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white font-semibold"
                  >
                    <option value="">-- Pilih Tahun Ajaran --</option>
                    {academicYears.map((ay) => (
                      <option key={ay.id} value={ay.id}>
                        TA {ay.name} {ay.is_active ? '(Aktif)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Rombongan Belajar (Rombel)
                  </label>
                  <select
                    value={formData.class_group_id || ''}
                    onChange={(e) => setFormData({ ...formData, class_group_id: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white font-semibold"
                  >
                    <option value="">-- Belum Masuk Rombel --</option>
                    {availableClassGroups.map((cg) => (
                      <option key={cg.id} value={cg.id}>
                        {cg.name} (Tingkat {cg.grade_level_name || 'Kelas'})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Jenis Registrasi Siswa */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Jenis Registrasi *
                    </label>
                    <select
                      value={formData.registration_type}
                      onChange={(e) => setFormData({ ...formData, registration_type: e.target.value })}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white font-bold text-teal-800"
                    >
                      <option value="Siswa Baru">Siswa Baru</option>
                      <option value="Siswa Pindahan">Siswa Pindahan</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Nama Asal Sekolah {formData.registration_type === 'Siswa Pindahan' ? '*' : '(Opsional)'}
                    </label>
                    <input
                      type="text"
                      required={formData.registration_type === 'Siswa Pindahan'}
                      value={formData.previous_school_name}
                      onChange={(e) => setFormData({ ...formData, previous_school_name: e.target.value })}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                      placeholder="Contoh: SDN 01 Depok / SMP Negeri 1..."
                    />
                  </div>
                </div>

                {formData.registration_type === 'Siswa Pindahan' && (
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Alamat Sekolah Asal (Pindahan)
                    </label>
                    <input
                      type="text"
                      value={formData.previous_school_address}
                      onChange={(e) => setFormData({ ...formData, previous_school_address: e.target.value })}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                      placeholder="Alamat sekolah asal siswa pindahan..."
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Tempat Lahir
                  </label>
                  <input
                    type="text"
                    value={formData.birth_place}
                    onChange={(e) => setFormData({ ...formData, birth_place: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Tanggal Lahir
                  </label>
                  <input
                    type="date"
                    value={formData.birth_date}
                    onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Alamat Tempat Tinggal
                </label>
                <textarea
                  rows={2}
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                  placeholder="Alamat domisili lengkap..."
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 disabled:bg-teal-400 text-white text-xs font-semibold rounded-xl shadow-sm transition flex items-center gap-2"
                >
                  {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{editingStudent ? 'Simpan Perubahan' : 'Tambah Siswa'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Kelola Orang Tua / Wali */}
      {guardianModalOpen && selectedStudentForGuardian && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-xl border border-slate-100 max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-800">
                  Data Orang Tua / Wali: {selectedStudentForGuardian.full_name}
                </h3>
                <p className="text-[11px] text-slate-500">NIS: {selectedStudentForGuardian.nis}</p>
              </div>
              <button onClick={() => setGuardianModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* List Wali yang Ada */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-700">Daftar Orang Tua / Wali Terkait</h4>
              {guardiansList.length === 0 ? (
                <p className="text-xs text-slate-400 italic">Belum ada data orang tua / wali yang dikaitkan.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {guardiansList.map((g) => (
                    <div key={g.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800">{g.full_name}</span>
                        <span className="text-[10px] px-2 py-0.5 bg-teal-100 text-teal-800 rounded-full font-semibold uppercase">
                          {g.relationship}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500">Pekerjaan: {g.occupation || '-'}</div>
                      <div className="text-[11px] text-slate-500">Kontak: {g.phone || '-'}</div>
                      {g.is_primary_contact && (
                        <span className="inline-block text-[9px] text-teal-600 font-bold bg-teal-50 px-1.5 py-0.5 rounded">
                          Kontak Utama
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Form Tambah Wali Cepat */}
            <div className="pt-3 border-t border-slate-100">
              <h4 className="text-xs font-bold text-slate-700 mb-2">Tambah / Kaitkan Wali Baru</h4>
              <form onSubmit={handleSaveGuardian} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">
                      Nama Lengkap Wali *
                    </label>
                    <input
                      type="text"
                      required
                      value={guardianForm.full_name}
                      onChange={(e) => setGuardianForm({ ...guardianForm, full_name: e.target.value })}
                      className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">
                      Hubungan Keluarga *
                    </label>
                    <select
                      value={guardianForm.relationship}
                      onChange={(e) => setGuardianForm({ ...guardianForm, relationship: e.target.value })}
                      className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                    >
                      <option value="ayah">Ayah</option>
                      <option value="ibu">Ibu</option>
                      <option value="wali">Wali</option>
                      <option value="lainnya">Lainnya</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">
                      Nomor Telepon / WhatsApp
                    </label>
                    <input
                      type="text"
                      value={guardianForm.phone}
                      onChange={(e) => setGuardianForm({ ...guardianForm, phone: e.target.value })}
                      className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">
                      Pekerjaan
                    </label>
                    <input
                      type="text"
                      value={guardianForm.occupation}
                      onChange={(e) => setGuardianForm({ ...guardianForm, occupation: e.target.value })}
                      className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-4 py-2 bg-teal-600 hover:bg-teal-700 disabled:bg-teal-400 text-white text-xs font-semibold rounded-xl shadow-sm transition flex items-center gap-2"
                  >
                    {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>Simpan & Kaitkan Wali</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal Masukkan / Pindah Siswa ke Rombel */}
      {assignRombelModalOpen && selectedStudentForRombel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-teal-600" />
                <span>{selectedStudentForRombel.class_group_name ? 'Pindah Rombel Siswa' : 'Masukkan Siswa ke Rombel'}</span>
              </h3>
              <button
                onClick={() => setAssignRombelModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl mb-4 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Nama Siswa:</span>
                <span className="font-bold text-slate-800">{selectedStudentForRombel.full_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">NIS:</span>
                <span className="font-mono text-slate-700">{selectedStudentForRombel.nis}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Rombel Saat Ini:</span>
                <span className="font-bold text-teal-700">
                  {selectedStudentForRombel.class_group_name || 'Belum Masuk Rombel'}
                </span>
              </div>
            </div>

            <form onSubmit={handleSaveAssignRombel} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">
                  Pilih Rombongan Belajar (Rombel) Tujuan *
                </label>
                <select
                  required
                  value={targetClassGroupId}
                  onChange={(e) => setTargetClassGroupId(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  <option value="">-- Pilih Rombel --</option>
                  {availableClassGroups.map((cg) => (
                    <option key={cg.id} value={cg.id}>
                      {cg.name} (Tingkat {cg.grade_level_name || 'Kelas'}) - TA {cg.academic_year_name || ''}
                    </option>
                  ))}
                </select>
                {availableClassGroups.length === 0 && (
                  <p className="text-[11px] text-amber-600 mt-1">
                    Belum ada rombel yang terdaftar pada satuan pendidikan ini. Silakan buat rombel terlebih dahulu di menu Rombongan Belajar.
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setAssignRombelModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-semibold transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={savingRombel || !targetClassGroupId}
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 disabled:bg-teal-300 text-white rounded-xl font-semibold shadow-xs transition flex items-center gap-1.5"
                >
                  {savingRombel && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Simpan ke Rombel</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Kenaikan Kelas / Roll-over Tahun Ajaran */}
      {promoteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-600" />
                <div>
                  <h3 className="text-sm font-bold text-slate-800">
                    Proses Kenaikan Kelas / Roll-over Tahun Ajaran
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Daftarkan siswa yang dipilih ke Tahun Ajaran Baru tanpa mengubah nomor ID & NIS siswa.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setPromoteModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePromote} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-indigo-50/50 border border-indigo-100 rounded-xl">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Tahun Ajaran Tujuan (Baru) *
                  </label>
                  <select
                    required
                    value={promoteForm.target_academic_year_id}
                    onChange={(e) => handleTargetYearChange(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-indigo-200 rounded-xl font-bold text-indigo-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">-- Pilih Tahun Ajaran Baru --</option>
                    {academicYears.map((ay) => (
                      <option key={ay.id} value={ay.id}>
                        TA {ay.name} {ay.is_active ? '(Aktif)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Rombel Tujuan di Tahun Baru *
                  </label>
                  <select
                    required
                    value={promoteForm.target_class_group_id}
                    onChange={(e) => setPromoteForm({ ...promoteForm, target_class_group_id: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-indigo-200 rounded-xl font-bold text-indigo-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">-- Pilih Rombel Tujuan --</option>
                    {targetAcademicYearClassGroups.map((cg) => (
                      <option key={cg.id} value={cg.id}>
                        {cg.name} (Tingkat {cg.grade_level_name || 'Kelas'})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Daftar Siswa yang Dipilih */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-700">
                    Pilih Siswa ({promoteForm.student_ids.length} dari {students.length} terpilih):
                  </span>
                  <button
                    type="button"
                    onClick={handleToggleSelectAll}
                    className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800"
                  >
                    {promoteForm.student_ids.length === students.length ? 'Batal Pilih Semua' : 'Pilih Semua Siswa'}
                  </button>
                </div>

                <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100 bg-slate-50/50">
                  {students.map((s) => {
                    const isSelected = promoteForm.student_ids.includes(s.id);
                    return (
                      <div
                        key={s.id}
                        onClick={() => handleToggleStudentSelection(s.id)}
                        className={`p-2.5 flex items-center justify-between cursor-pointer transition ${
                          isSelected ? 'bg-indigo-50/80 text-indigo-900 font-semibold' : 'hover:bg-slate-100/80'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-indigo-600 shrink-0" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-400 shrink-0" />
                          )}
                          <div>
                            <span className="text-xs font-bold text-slate-800">{s.full_name}</span>
                            <span className="text-[10px] text-slate-500 ml-2 font-mono">NIS: {s.nis}</span>
                          </div>
                        </div>
                        <span className="text-[10px] text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded-md">
                          Rombel Asal: {s.class_group_name || 'Belum ada'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setPromoteModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-semibold transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={savingPromote || !promoteForm.target_academic_year_id || !promoteForm.target_class_group_id || !promoteForm.student_ids.length}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white rounded-xl font-semibold shadow-xs transition flex items-center gap-1.5"
                >
                  {savingPromote && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Proses Kenaikan Kelas</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
