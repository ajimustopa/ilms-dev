import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../../shared/store/AuthContext';
import {
  Users,
  Search,
  Plus,
  Edit2,
  Eye,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  RefreshCw,
  X,
  Building2,
  Tag,
  Settings,
  Trash2,
  AlertTriangle,
  ShieldAlert,
  FileText,
  Layers,
  GraduationCap,
  Calendar,
  DollarSign,
  Key,
  Check,
  Info,
  History,
  Clock,
  ArrowRight,
  UserCheck,
  UserX
} from 'lucide-react';
import api from '../../../shared/services/api';

export default function DataPegawai() {
  const { activeSchoolUnit, schoolUnits } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, per_page: 20, total: 0 });
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Filters
  const [search, setSearch] = useState('');
  const [employmentStatus, setEmploymentStatus] = useState('');
  const [accountStatus, setAccountStatus] = useState('');

  // Positions master untuk dropdown
  const [jobPositions, setJobPositions] = useState([]);
  // Dynamic Employment Statuses Master
  const [masterStatuses, setMasterStatuses] = useState([]);

  // Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [formSubmitting, setFormSubmitting] = useState(false);

  // Status Modal & History State
  const [statusLogs, setStatusLogs] = useState([]);
  const [loadingStatusLogs, setLoadingStatusLogs] = useState(false);


  // Delete Modal State & Related Data Preview
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState(null);
  const [relatedData, setRelatedData] = useState(null);
  const [loadingRelatedData, setLoadingRelatedData] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    school_unit_id: '',
    employee_number: '',
    nik: '',
    nip: '',
    nuptk: '',
    full_name: '',
    academic_title: '',
    mother_name: '',
    citizenship: 'Indonesia',
    gender: 'male',
    employment_status: 'gtt',
    current_position_id: '',
    current_rank: '',
    birth_place: '',
    birth_date: '',
    religion: 'Islam',
    marital_status: 'single',
    phone_number: '',
    email: '',
    address: ''
  });

  const [statusFormData, setStatusFormData] = useState({
    account_status: 'active',
    effective_date: '',
    reason: ''
  });

  const fetchEmployees = async (page = 1) => {
    setLoading(true);
    setErrorMsg('');
    try {
      let queryParams = `?page=${page}&per_page=20`;
      if (activeSchoolUnit?.id && activeSchoolUnit.id !== 'all') {
        queryParams += `&school_unit_id=${activeSchoolUnit.id}`;
      }
      if (search) queryParams += `&search=${encodeURIComponent(search)}`;
      if (employmentStatus) queryParams += `&employment_status=${employmentStatus}`;
      if (accountStatus) queryParams += `&account_status=${accountStatus}`;

      const res = await api.get(`/kepegawaian/employees${queryParams}`);
      if (res.data?.success) {
        setEmployees(res.data.data.items || []);
        setPagination(res.data.data.pagination || { page: 1, per_page: 20, total: 0 });
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Gagal memuat data pegawai');
    } finally {
      setLoading(false);
    }
  };

  const fetchJobPositions = async () => {
    try {
      const res = await api.get('/kepegawaian/job-positions');
      if (res.data?.success) {
        setJobPositions(res.data.data || []);
      }
    } catch (err) {
      // Non-critical
    }
  };

  const fetchMasterStatuses = async () => {
    try {
      const res = await api.get('/kepegawaian/employment-statuses');
      if (res.data?.success) {
        setMasterStatuses(res.data.data || []);
      }
    } catch (err) {
      // Non-critical
    }
  };

  useEffect(() => {
    fetchEmployees(1);
    fetchJobPositions();
    fetchMasterStatuses();
  }, [activeSchoolUnit, employmentStatus, accountStatus]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchEmployees(1);
  };

  const openCreateModal = () => {
    const defaultStatus = masterStatuses.find(s => s.is_active)?.code || 'gtt';
    setFormData({
      school_unit_id: activeSchoolUnit?.id || (schoolUnits?.[0]?.id || 1),
      employee_number: '',
      nik: '',
      nip: '',
      nuptk: '',
      full_name: '',
      academic_title: '',
      mother_name: '',
      citizenship: 'Indonesia',
      gender: 'male',
      employment_status: defaultStatus,
      current_position_id: '',
      current_rank: '',
      birth_place: '',
      birth_date: '',
      religion: 'Islam',
      marital_status: 'single',
      phone_number: '',
      email: '',
      address: ''
    });
    setIsCreateModalOpen(true);
  };

  const openEditModal = (emp) => {
    setSelectedEmployee(emp);
    setFormData({
      school_unit_id: emp.school_unit_id,
      employee_number: emp.employee_number,
      nik: emp.nik || '',
      nip: emp.nip || '',
      nuptk: emp.nuptk || '',
      full_name: emp.full_name || '',
      academic_title: emp.academic_title || '',
      mother_name: emp.mother_name || '',
      citizenship: emp.citizenship || 'Indonesia',
      gender: emp.gender || 'male',
      employment_status: emp.employment_status || 'gtt',
      current_position_id: emp.current_position?.id || emp.current_position_id || '',
      current_rank: emp.current_rank || '',
      birth_place: emp.birth_place || '',
      birth_date: emp.birth_date ? emp.birth_date.split('T')[0] : '',
      religion: emp.religion || 'Islam',
      marital_status: emp.marital_status || 'single',
      phone_number: emp.phone_number || '',
      email: emp.email || '',
      address: emp.address || ''
    });
    setIsEditModalOpen(true);
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setFormSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const payload = { ...formData };
      if (!payload.current_position_id) delete payload.current_position_id;
      if (!payload.birth_date) delete payload.birth_date;

      const res = await api.post('/kepegawaian/employees', payload);
      if (res.data?.success) {
        setSuccessMsg(
          `Pegawai ${res.data.data.full_name} berhasil ditambahkan! ${
            res.data.data.core_account_provisioned
              ? `Akun login Core otomatis dibuat (${res.data.data.core_username})`
              : ''
          }`
        );
        setIsCreateModalOpen(false);
        fetchEmployees(1);
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Gagal menambahkan pegawai baru');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setFormSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const payload = { ...formData };
      if (!payload.current_position_id) payload.current_position_id = null;
      if (!payload.birth_date) payload.birth_date = null;

      const res = await api.put(`/kepegawaian/employees/${selectedEmployee.id}`, payload);
      if (res.data?.success) {
        setSuccessMsg('Data pegawai berhasil diperbarui');
        setIsEditModalOpen(false);
        fetchEmployees(pagination.page);
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Gagal memperbarui pegawai');
    } finally {
      setFormSubmitting(false);
    }
  };

  const openStatusModal = async (emp) => {
    setSelectedEmployee(emp);
    setStatusFormData({
      account_status: emp.account_status || 'active',
      effective_date: new Date().toISOString().split('T')[0],
      reason: ''
    });
    setIsStatusModalOpen(true);
    setLoadingStatusLogs(true);
    setStatusLogs([]);
    setErrorMsg('');
    try {
      const res = await api.get(`/kepegawaian/employees/${emp.id}/status-history`);
      if (res.data?.success) {
        setStatusLogs(res.data.data || []);
      }
    } catch (err) {
      console.error('Gagal mengambil riwayat status:', err);
    } finally {
      setLoadingStatusLogs(false);
    }
  };

  const handleStatusSubmit = async (e) => {
    e.preventDefault();
    if (!selectedEmployee) return;
    if (!statusFormData.reason || !statusFormData.reason.trim()) {
      setErrorMsg('Alasan perubahan status akun wajib diisi');
      return;
    }
    setFormSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const res = await api.patch(`/kepegawaian/employees/${selectedEmployee.id}/status`, statusFormData);
      if (res.data?.success) {
        setSuccessMsg(res.data.message || 'Status akun pegawai berhasil diubah dan dicatat ke riwayat');
        fetchEmployees(pagination.page);
        
        // Refresh status history realtime
        try {
          const histRes = await api.get(`/kepegawaian/employees/${selectedEmployee.id}/status-history`);
          if (histRes.data?.success) {
            setStatusLogs(histRes.data.data || []);
          }
        } catch (hErr) {}

        setSelectedEmployee((prev) => ({
          ...prev,
          account_status: statusFormData.account_status
        }));
        setStatusFormData((prev) => ({
          ...prev,
          reason: ''
        }));
        setTimeout(() => setSuccessMsg(''), 4000);
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Gagal mengubah status pegawai');
    } finally {
      setFormSubmitting(false);
    }
  };


  const openDeleteModal = async (emp) => {
    setEmployeeToDelete(emp);
    setRelatedData(null);
    setIsDeleteModalOpen(true);
    setLoadingRelatedData(true);
    setErrorMsg('');
    try {
      const res = await api.get(`/kepegawaian/employees/${emp.id}/related-data`);
      if (res.data?.success) {
        setRelatedData(res.data.data);
      }
    } catch (err) {
      console.error('Gagal memuat data terkait pegawai:', err);
    } finally {
      setLoadingRelatedData(false);
    }
  };

  const handleDeleteSubmit = async () => {
    if (!employeeToDelete) return;
    setIsDeleting(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const res = await api.delete(`/kepegawaian/employees/${employeeToDelete.id}`);
      if (res.data?.success) {
        setSuccessMsg(res.data.message || `Data pegawai "${employeeToDelete.full_name}" dan seluruh data terkait berhasil dihapus permanen.`);
        setIsDeleteModalOpen(false);
        setEmployeeToDelete(null);
        setRelatedData(null);
        fetchEmployees(pagination.page);
        setTimeout(() => setSuccessMsg(''), 5000);
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Gagal menghapus pegawai');
    } finally {
      setIsDeleting(false);
    }
  };

  const getStatusBadgeLabel = (statusCode) => {

    const found = masterStatuses.find((s) => s.code.toLowerCase() === (statusCode || '').toLowerCase());
    return found ? found.name : (statusCode || '-').toUpperCase();
  };

  return (
    <div className="space-y-6">
      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Master Data Pegawai</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Daftar seluruh pendidik dan tenaga kependidikan terdaftar
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Link
            to="/kepegawaian/employment-statuses"
            className="px-3.5 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl transition text-xs font-semibold flex items-center gap-2 shadow-2xs"
            title="Konfigurasi Master Status Kepegawaian Fleksibel"
          >
            <Tag className="w-3.5 h-3.5 text-indigo-600" />
            <span>Master Status</span>
          </Link>
          <button
            onClick={() => fetchEmployees(pagination.page)}
            className="p-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl transition text-xs flex items-center gap-1.5 shadow-2xs"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={openCreateModal}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition text-xs font-semibold flex items-center gap-2 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Pegawai Baru</span>
          </button>
        </div>
      </div>

      {/* Alert Messages */}
      {errorMsg && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
          <span>{errorMsg}</span>
        </div>
      )}
      {successMsg && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-xl flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Filter Chips Status & Kategori Kepegawaian */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Tag className="w-3.5 h-3.5 text-indigo-500" />
            Filter Jenis Kepegawaian & Status:
          </span>
          {employmentStatus && (
            <button
              onClick={() => setEmploymentStatus('')}
              className="text-[11px] font-semibold text-rose-600 hover:text-rose-700 transition flex items-center gap-1"
            >
              <X className="w-3 h-3" />
              <span>Reset Filter</span>
            </button>
          )}
        </div>

        {/* Chips Bar */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setEmploymentStatus('')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-2xs ${
              employmentStatus === ''
                ? 'bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-600/20'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200/80'
            }`}
          >
            Semua Jenis
          </button>

          {/* Group 1: Pendidik / Guru */}
          <div className="h-4 w-px bg-slate-200 mx-1" />
          {masterStatuses
            .filter((s) => s.is_active && (s.category === 'guru' || ['gty', 'gtt'].includes(s.code)))
            .map((s) => (
              <button
                key={s.id}
                onClick={() => setEmploymentStatus(employmentStatus === s.code ? '' : s.code)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shadow-2xs flex items-center gap-1.5 ${
                  employmentStatus === s.code
                    ? 'bg-indigo-600 text-white font-bold shadow-sm ring-2 ring-indigo-600/20'
                    : 'bg-indigo-50/60 hover:bg-indigo-100 text-indigo-800 border border-indigo-200/60'
                }`}
              >
                <span>{s.name}</span>
              </button>
            ))}

          {/* Group 2: Pelatih Ekskul & Mitra */}
          <div className="h-4 w-px bg-slate-200 mx-1" />
          {masterStatuses
            .filter((s) => s.is_active && (s.category === 'mitra' || ['pelatih_ekskul', 'guru_tamu', 'partner'].includes(s.code)))
            .map((s) => (
              <button
                key={s.id}
                onClick={() => setEmploymentStatus(employmentStatus === s.code ? '' : s.code)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shadow-2xs flex items-center gap-1.5 ${
                  employmentStatus === s.code
                    ? 'bg-indigo-600 text-white font-bold shadow-sm ring-2 ring-indigo-600/20'
                    : 'bg-indigo-50/70 hover:bg-indigo-100 text-indigo-800 border border-indigo-200/70'
                }`}
              >
                <span>{s.name}</span>
              </button>
            ))}

          {/* Group 3: Tendik & Lainnya */}
          <div className="h-4 w-px bg-slate-200 mx-1" />
          {masterStatuses
            .filter(
              (s) =>
                s.is_active &&
                s.category !== 'mitra' &&
                s.category !== 'guru' &&
                !['gty', 'gtt', 'pelatih_ekskul', 'guru_tamu', 'partner'].includes(s.code)
            )
            .map((s) => (
              <button
                key={s.id}
                onClick={() => setEmploymentStatus(employmentStatus === s.code ? '' : s.code)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shadow-2xs flex items-center gap-1.5 ${
                  employmentStatus === s.code
                    ? 'bg-slate-800 text-white font-bold shadow-sm ring-2 ring-slate-800/20'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200/80'
                }`}
              >
                <span>{s.name}</span>
              </button>
            ))}
        </div>
      </div>

      {/* Filter Bar Search & Status Akun */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama, NIP, NIK, atau NUPTK..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-indigo-500 transition"
          />
        </form>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <select
            value={employmentStatus}
            onChange={(e) => setEmploymentStatus(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:border-indigo-500 transition"
          >
            <option value="">Semua Status Kerja</option>
            {masterStatuses.map((s) => (
              <option key={s.id} value={s.code}>
                {s.name}
              </option>
            ))}
          </select>

          <select
            value={accountStatus}
            onChange={(e) => setAccountStatus(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:border-indigo-500 transition"
          >
            <option value="">Semua Status Akun</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="resigned">Resigned</option>
            <option value="retired">Retired</option>
          </select>
        </div>
      </div>

      {/* Table Card */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200/80 text-slate-500 font-semibold uppercase text-[10px] tracking-wider">
                <th className="py-3.5 px-4">No. Pegawai / NUPTK</th>
                <th className="py-3.5 px-4">Nama Lengkap & NIK</th>
                <th className="py-3.5 px-4">Jabatan & Golongan</th>
                <th className="py-3.5 px-4">Status Kerja</th>
                <th className="py-3.5 px-4">Status Akun</th>
                <th className="py-3.5 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-600" />
                    <span>Memuat data pegawai...</span>
                  </td>
                </tr>
              ) : employees.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-slate-400">
                    <Users className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <span>Tidak ada data pegawai yang sesuai</span>
                  </td>
                </tr>
              ) : (
                employees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4 font-mono font-medium text-slate-800">
                      <div>{emp.employee_number}</div>
                      {emp.nuptk && (
                        <div className="text-[10px] text-slate-400">NUPTK: {emp.nuptk}</div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-800">
                        {emp.full_name}{emp.academic_title ? `, ${emp.academic_title}` : ''}
                      </div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-2">
                        <span className="capitalize">{emp.gender}</span>
                        {emp.nik && <span>• NIK: {emp.nik}</span>}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-700">
                        {emp.current_position?.name || '-'}
                      </div>
                      <div className="text-[10px] text-indigo-600 font-semibold">
                        {emp.current_rank ? `Golongan: ${emp.current_rank}` : '-'}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200">
                        {getStatusBadgeLabel(emp.employment_status)}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => openStatusModal(emp)}
                        className={`group px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all duration-150 inline-flex items-center gap-1.5 shadow-2xs hover:scale-105 cursor-pointer ${
                          emp.account_status === 'active'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 hover:border-emerald-300'
                            : emp.account_status === 'retired'
                            ? 'bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 hover:border-indigo-300'
                            : 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 hover:border-rose-300'
                        }`}
                        title="Klik untuk ubah status akun & lihat riwayat perubahan"
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            emp.account_status === 'active'
                              ? 'bg-emerald-500'
                              : emp.account_status === 'retired'
                              ? 'bg-indigo-500'
                              : 'bg-rose-500'
                          }`}
                        />
                        <span>{emp.account_status}</span>
                        <History className="w-3 h-3 opacity-50 group-hover:opacity-100 ml-0.5" />
                      </button>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link
                          to={`/kepegawaian/employees/${emp.id}`}
                          className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition"
                          title="Lihat Detail Riwayat"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </Link>
                        <button
                          onClick={() => openEditModal(emp)}
                          className="p-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition"
                          title="Edit Biodata"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => openStatusModal(emp)}
                          className="px-2 py-1 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 text-[10px] font-semibold transition flex items-center gap-1"
                          title="Ubah Status Akun & Lihat Riwayat"
                        >
                          <History className="w-3 h-3 text-slate-500" />
                          <span>Status</span>
                        </button>
                        <button
                          onClick={() => openDeleteModal(emp)}
                          className="p-1.5 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 transition"
                          title="Hapus Data Pegawai & Seluruh Data Terkait"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Info */}
        <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <div>
            Total: <span className="font-semibold text-slate-700">{pagination.total}</span> pegawai
          </div>
          <div className="flex items-center gap-2">
            <button
              disabled={pagination.page <= 1}
              onClick={() => fetchEmployees(pagination.page - 1)}
              className="px-3 py-1 bg-slate-50 border border-slate-200 rounded-lg disabled:opacity-50"
            >
              Sebelumnya
            </button>
            <span className="font-semibold text-slate-700">Halaman {pagination.page}</span>
            <button
              disabled={employees.length < pagination.per_page}
              onClick={() => fetchEmployees(pagination.page + 1)}
              className="px-3 py-1 bg-slate-50 border border-slate-200 rounded-lg disabled:opacity-50"
            >
              Selanjutnya
            </button>
          </div>
        </div>
      </div>

      {/* Modal Tambah Pegawai */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full p-6 border border-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <h3 className="text-sm font-bold text-slate-800">Tambah Pegawai Baru</h3>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Nomor Pegawai / NIP Yayasan *</label>
                  <input
                    type="text"
                    required
                    value={formData.employee_number}
                    onChange={(e) => setFormData({ ...formData, employee_number: e.target.value })}
                    placeholder="mis. 24252003"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">NIK (KTP)</label>
                  <input
                    type="text"
                    value={formData.nik}
                    onChange={(e) => setFormData({ ...formData, nik: e.target.value })}
                    placeholder="16 digit NIK"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">NIP (Pemerintah)</label>
                  <input
                    type="text"
                    value={formData.nip}
                    onChange={(e) => setFormData({ ...formData, nip: e.target.value })}
                    placeholder="Opsional jika PNS/P3K"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">NUPTK</label>
                  <input
                    type="text"
                    value={formData.nuptk}
                    onChange={(e) => setFormData({ ...formData, nuptk: e.target.value })}
                    placeholder="Nomor Unik Pendidik"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">Nama Lengkap *</label>
                  <input
                    type="text"
                    required
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    placeholder="Nama tanpa gelar"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Gelar Akademik</label>
                  <input
                    type="text"
                    value={formData.academic_title}
                    onChange={(e) => setFormData({ ...formData, academic_title: e.target.value })}
                    placeholder="mis. S.Pd., M.Pd."
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Jenis Kelamin *</label>
                  <select
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  >
                    <option value="male">Laki-laki</option>
                    <option value="female">Perempuan</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Status Kepegawaian *</label>
                  <select
                    value={formData.employment_status}
                    onChange={(e) => setFormData({ ...formData, employment_status: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  >
                    {masterStatuses.map((s) => (
                      <option key={s.id} value={s.code}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Jabatan *</label>
                  <select
                    value={formData.current_position_id}
                    onChange={(e) => setFormData({ ...formData, current_position_id: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  >
                    <option value="">Pilih Jabatan</option>
                    {jobPositions.map((pos) => (
                      <option key={pos.id} value={pos.id}>
                        {pos.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Golongan / Pangkat</label>
                  <input
                    type="text"
                    value={formData.current_rank}
                    onChange={(e) => setFormData({ ...formData, current_rank: e.target.value })}
                    placeholder="mis. Penata Muda / III-a"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tempat Lahir</label>
                  <input
                    type="text"
                    value={formData.birth_place}
                    onChange={(e) => setFormData({ ...formData, birth_place: e.target.value })}
                    placeholder="Kota Lahir"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tanggal Lahir</label>
                  <input
                    type="date"
                    value={formData.birth_date}
                    onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Status Pernikahan</label>
                  <select
                    value={formData.marital_status}
                    onChange={(e) => setFormData({ ...formData, marital_status: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  >
                    <option value="single">Lajang</option>
                    <option value="married">Menikah</option>
                    <option value="divorced">Cerai Hidup</option>
                    <option value="widowed">Cerai Mati</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Nama Ibu Kandung</label>
                  <input
                    type="text"
                    value={formData.mother_name}
                    onChange={(e) => setFormData({ ...formData, mother_name: e.target.value })}
                    placeholder="Nama Ibu"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Kewarganegaraan</label>
                  <input
                    type="text"
                    value={formData.citizenship}
                    onChange={(e) => setFormData({ ...formData, citizenship: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">No. Handphone / WhatsApp *</label>
                  <input
                    type="text"
                    required
                    value={formData.phone_number}
                    onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                    placeholder="081234567890"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Email * (Untuk Akun Login)</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="email@sekolah.sch.id"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Alamat Domisili Lengkap</label>
                <textarea
                  rows="2"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Alamat jalan, RT/RW, kelurahan, kecamatan, kota..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-semibold disabled:opacity-50"
                >
                  {formSubmitting ? 'Menyimpan...' : 'Simpan Pegawai'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Edit Biodata Pegawai */}
      {isEditModalOpen && selectedEmployee && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full p-6 border border-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <h3 className="text-sm font-bold text-slate-800">Edit Biodata Pegawai</h3>
              <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Nomor Pegawai / NIP Yayasan</label>
                  <input
                    type="text"
                    disabled
                    value={formData.employee_number}
                    className="w-full p-2.5 bg-slate-100 border border-slate-200 rounded-xl text-slate-500 cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">NIK (KTP)</label>
                  <input
                    type="text"
                    value={formData.nik}
                    onChange={(e) => setFormData({ ...formData, nik: e.target.value })}
                    placeholder="16 digit NIK"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">NIP (Pemerintah)</label>
                  <input
                    type="text"
                    value={formData.nip}
                    onChange={(e) => setFormData({ ...formData, nip: e.target.value })}
                    placeholder="Opsional jika PNS/P3K"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">NUPTK</label>
                  <input
                    type="text"
                    value={formData.nuptk}
                    onChange={(e) => setFormData({ ...formData, nuptk: e.target.value })}
                    placeholder="Nomor Unik Pendidik"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">Nama Lengkap *</label>
                  <input
                    type="text"
                    required
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    placeholder="Nama tanpa gelar"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Gelar Akademik</label>
                  <input
                    type="text"
                    value={formData.academic_title}
                    onChange={(e) => setFormData({ ...formData, academic_title: e.target.value })}
                    placeholder="mis. S.Pd., M.Pd."
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Jenis Kelamin *</label>
                  <select
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  >
                    <option value="male">Laki-laki</option>
                    <option value="female">Perempuan</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Status Kepegawaian *</label>
                  <select
                    value={formData.employment_status}
                    onChange={(e) => setFormData({ ...formData, employment_status: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  >
                    {masterStatuses.map((s) => (
                      <option key={s.id} value={s.code}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Jabatan</label>
                  <select
                    value={formData.current_position_id}
                    onChange={(e) => setFormData({ ...formData, current_position_id: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  >
                    <option value="">Pilih Jabatan</option>
                    {jobPositions.map((pos) => (
                      <option key={pos.id} value={pos.id}>
                        {pos.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Golongan / Pangkat</label>
                  <input
                    type="text"
                    value={formData.current_rank}
                    onChange={(e) => setFormData({ ...formData, current_rank: e.target.value })}
                    placeholder="mis. Penata Muda / III-a"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tempat Lahir</label>
                  <input
                    type="text"
                    value={formData.birth_place}
                    onChange={(e) => setFormData({ ...formData, birth_place: e.target.value })}
                    placeholder="Kota Lahir"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tanggal Lahir</label>
                  <input
                    type="date"
                    value={formData.birth_date}
                    onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Status Pernikahan</label>
                  <select
                    value={formData.marital_status}
                    onChange={(e) => setFormData({ ...formData, marital_status: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  >
                    <option value="single">Lajang</option>
                    <option value="married">Menikah</option>
                    <option value="divorced">Cerai Hidup</option>
                    <option value="widowed">Cerai Mati</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Nama Ibu Kandung</label>
                  <input
                    type="text"
                    value={formData.mother_name}
                    onChange={(e) => setFormData({ ...formData, mother_name: e.target.value })}
                    placeholder="Nama Ibu"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Kewarganegaraan</label>
                  <input
                    type="text"
                    value={formData.citizenship}
                    onChange={(e) => setFormData({ ...formData, citizenship: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-semibold disabled:opacity-50"
                >
                  {formSubmitting ? 'Menyimpan...' : 'Perbarui Data'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL UBAH STATUS AKUN & RIWAYAT PERUBAHAN --- */}
      {isStatusModalOpen && selectedEmployee && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto animate-in fade-in duration-100">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full p-6 border border-slate-100 max-h-[90vh] flex flex-col space-y-4">
            {/* Header Modal */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5 text-slate-800 font-bold text-base">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-800">Ubah Status Akun & Riwayat Perubahan</h3>
                  <p className="text-[11px] text-slate-500 font-normal">Pencatatan status keaktifan akun pegawai disertai alasan dan audit log</p>
                </div>
              </div>
              <button
                onClick={() => setIsStatusModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              {/* Employee Preview Card */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-2xs">
                    {selectedEmployee.full_name?.charAt(0) || 'P'}
                  </div>
                  <div>
                    <h4 className="font-extrabold text-slate-800 text-sm">
                      {selectedEmployee.full_name}{selectedEmployee.academic_title ? `, ${selectedEmployee.academic_title}` : ''}
                    </h4>
                    <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                      <span>No. Pegawai: <b className="text-slate-700 font-mono">{selectedEmployee.employee_number}</b></span>
                      {selectedEmployee.nip && <span>• NIP: <b className="text-slate-700 font-mono">{selectedEmployee.nip}</b></span>}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <span
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider inline-flex items-center gap-1.5 ${
                      selectedEmployee.account_status === 'active'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : selectedEmployee.account_status === 'retired'
                        ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                        : 'bg-rose-50 text-rose-700 border border-rose-200'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        selectedEmployee.account_status === 'active'
                          ? 'bg-emerald-500'
                          : selectedEmployee.account_status === 'retired'
                          ? 'bg-indigo-500'
                          : 'bg-rose-500'
                      }`}
                    />
                    <span>Status Saat Ini: {selectedEmployee.account_status}</span>
                  </span>
                </div>
              </div>

              {/* Form Ubah Status */}
              <form onSubmit={handleStatusSubmit} className="space-y-4 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-2">Pilih Status Akun Baru *</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { code: 'active', label: 'Active', desc: 'Aktif Bekerja & Login Aktif', activeCls: 'border-emerald-500 bg-emerald-50/70 text-emerald-800 ring-2 ring-emerald-500/20' },
                      { code: 'inactive', label: 'Inactive', desc: 'Nonaktif Sementara', activeCls: 'border-rose-500 bg-rose-50/70 text-rose-800 ring-2 ring-rose-500/20' },
                      { code: 'resigned', label: 'Resigned', desc: 'Mengundurkan Diri', activeCls: 'border-amber-500 bg-amber-50/70 text-amber-800 ring-2 ring-amber-500/20' },
                      { code: 'retired', label: 'Retired', desc: 'Pensiun / Purna Tugas', activeCls: 'border-indigo-500 bg-indigo-50/70 text-indigo-800 ring-2 ring-indigo-500/20' }
                    ].map((opt) => (
                      <button
                        type="button"
                        key={opt.code}
                        onClick={() => setStatusFormData({ ...statusFormData, account_status: opt.code })}
                        className={`p-2.5 rounded-xl border text-left transition relative cursor-pointer flex flex-col justify-between ${
                          statusFormData.account_status === opt.code
                            ? opt.activeCls
                            : 'border-slate-200 bg-slate-50/60 hover:bg-slate-100/70 text-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs uppercase">{opt.label}</span>
                          {statusFormData.account_status === opt.code && (
                            <CheckCircle2 className="w-3.5 h-3.5 text-current shrink-0" />
                          )}
                        </div>
                        <span className="text-[10px] text-slate-500 mt-1 leading-snug">{opt.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Tanggal Efektif *</label>
                    <input
                      type="date"
                      required
                      value={statusFormData.effective_date}
                      onChange={(e) => setStatusFormData({ ...statusFormData, effective_date: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-emerald-500/20 focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Alasan Perubahan Status <span className="text-rose-500 font-bold">* (Wajib)</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={statusFormData.reason}
                      onChange={(e) => setStatusFormData({ ...statusFormData, reason: e.target.value })}
                      placeholder="Contoh: Mengundurkan diri / Kembali aktif mengajar / Cuti..."
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="submit"
                    disabled={formSubmitting}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-sm transition flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                  >
                    {formSubmitting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Menyimpan...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Simpan Perubahan & Catat Riwayat</span>
                      </>
                    )}
                  </button>
                </div>
              </form>

              {/* Seksi Riwayat Perubahan Status (Timeline) */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                    <History className="w-4 h-4 text-indigo-600" />
                    <span>Riwayat Perubahan Status Akun</span>
                  </h4>
                  <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full font-bold text-[10px]">
                    Total {statusLogs.length} Catatan
                  </span>
                </div>

                {loadingStatusLogs ? (
                  <div className="py-6 text-center text-slate-400 bg-slate-50 rounded-xl border border-slate-200">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto text-indigo-600 mb-1" />
                    <p className="text-[11px]">Memuat riwayat perubahan status...</p>
                  </div>
                ) : statusLogs.length === 0 ? (
                  <div className="py-6 px-4 text-center text-slate-400 bg-slate-50 rounded-xl border border-slate-200 italic text-[11px] flex flex-col items-center justify-center">
                    <Clock className="w-5 h-5 text-slate-300 mb-1" />
                    <span>Belum ada catatan riwayat perubahan status untuk pegawai ini.</span>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {statusLogs.map((log, idx) => (
                      <div
                        key={log.id || idx}
                        className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1.5 hover:border-slate-300 transition"
                      >
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-1.5 font-bold">
                            <span
                              className={`px-2 py-0.5 rounded-md text-[10px] uppercase ${
                                log.previous_status === 'active'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-slate-200 text-slate-700'
                              }`}
                            >
                              {log.previous_status || 'initial'}
                            </span>
                            <ArrowRight className="w-3 h-3 text-slate-400" />
                            <span
                              className={`px-2 py-0.5 rounded-md text-[10px] uppercase font-extrabold ${
                                log.new_status === 'active'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : log.new_status === 'retired'
                                  ? 'bg-indigo-100 text-indigo-800'
                                  : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              {log.new_status}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-400 flex items-center gap-2">
                            {log.effective_date && (
                              <span>
                                Efektif:{' '}
                                <b className="text-slate-600">
                                  {new Date(log.effective_date).toLocaleDateString('id-ID', {
                                    day: 'numeric',
                                    month: 'short',
                                    year: 'numeric'
                                  })}
                                </b>
                              </span>
                            )}
                            <span>
                              {new Date(log.created_at).toLocaleDateString('id-ID', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          </div>
                        </div>

                        <div className="p-2 bg-white rounded-lg border border-slate-200/80 text-slate-700 text-[11px] leading-relaxed">
                          <span className="font-semibold text-slate-500">Alasan: </span>
                          <span className="italic">"{log.reason}"</span>
                        </div>

                        <div className="text-[10px] text-slate-400 flex items-center justify-between">
                          <span>
                            Diubah oleh: <b className="text-slate-600">{log.changed_by_name || 'Administrator'}</b>
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Footer Modal */}
            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setIsStatusModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold text-xs transition"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL PERINGATAN HAPUS PEGAWAI & DATA TERKAIT --- */}
      {isDeleteModalOpen && employeeToDelete && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto animate-in fade-in duration-100">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full p-6 border border-rose-100 max-h-[90vh] flex flex-col space-y-4">
            {/* Header Modal */}
            <div className="flex items-center justify-between pb-3 border-b border-rose-100">
              <div className="flex items-center gap-2.5 text-rose-700 font-bold text-base">
                <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-800">Hapus Data Pegawai & Seluruh Data Terkait</h3>
                  <p className="text-[11px] text-slate-500 font-normal">Pemeriksaan dependensi & penghapusan permanen (Cascade Delete)</p>
                </div>
              </div>
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Employee Preview Card */}
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-2xs">
                  {employeeToDelete.full_name?.charAt(0) || 'P'}
                </div>
                <div>
                  <h4 className="font-extrabold text-slate-800 text-sm">
                    {employeeToDelete.full_name}{employeeToDelete.academic_title ? `, ${employeeToDelete.academic_title}` : ''}
                  </h4>
                  <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                    <span>No. Pegawai: <b className="text-slate-700 font-mono">{employeeToDelete.employee_number}</b></span>
                    {employeeToDelete.nip && <span>• NIP: <b className="text-slate-700 font-mono">{employeeToDelete.nip}</b></span>}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200">
                  {getStatusBadgeLabel(employeeToDelete.employment_status)}
                </span>
                <div className="text-[10px] text-slate-400 mt-1 capitalize font-medium">
                  Status: {employeeToDelete.account_status}
                </div>
              </div>
            </div>

            {/* Warning Banner */}
            <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-start gap-2.5">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold">PERHATIAN: Tindakan ini bersifat permanen dan tidak dapat dibatalkan!</p>
                <p className="text-[11px] text-rose-700 leading-relaxed">
                  Menghapus pegawai ini akan menghapus data master kepegawaian beserta seluruh data relasi yang terhubung dengannya di berbagai modul sistem.
                </p>
              </div>
            </div>

            {/* Related Data Preview Section */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-indigo-600" />
                  <span>Daftar Data Terkait yang Akan Ikut Terhapus / Dilepas:</span>
                </span>
                {relatedData && (
                  <span className="px-2.5 py-0.5 bg-rose-100 text-rose-800 border border-rose-200 rounded-full font-bold text-[10px]">
                    Total {relatedData.total_records} Data Terkait
                  </span>
                )}
              </div>

              {loadingRelatedData ? (
                <div className="py-10 text-center text-slate-400 bg-slate-50 rounded-xl border border-slate-200">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-indigo-600 mb-2" />
                  <p className="text-xs font-medium">Menganalisis seluruh relasi data di modul Kepegawaian, Akademik, Sarpras, & Core User...</p>
                </div>
              ) : !relatedData || relatedData.categories.length === 0 ? (
                <div className="py-6 px-4 text-center text-slate-500 text-xs bg-slate-50 rounded-xl border border-slate-200 italic">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 mx-auto mb-1" />
                  <span>Tidak ditemukan data relasi aktif lainnya. Hanya data master profil pegawai yang akan dihapus.</span>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {relatedData.categories.map((cat) => (
                    <div
                      key={cat.id}
                      className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-1.5 text-xs hover:border-slate-300 transition"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800">{cat.name}</span>
                        <span className="px-2 py-0.2 rounded-full font-bold text-[10px] bg-rose-50 text-rose-700 border border-rose-200">
                          {cat.total} data
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 leading-snug">{cat.description}</p>
                      <div className="pt-1 flex flex-wrap gap-1.5">
                        {cat.items.map((item, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 bg-slate-100 text-slate-700 text-[10px] rounded-md font-medium"
                          >
                            {item.label}: <b className="text-slate-900">{item.count}</b>
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Action Footer */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
              <span className="text-[11px] text-slate-400 italic">
                Pastikan Anda telah memeriksa data terkait di atas sebelum melanjutkan.
              </span>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsDeleteModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold text-xs transition"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleDeleteSubmit}
                  disabled={isDeleting || loadingRelatedData}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:bg-rose-400 text-white rounded-xl font-bold text-xs shadow-sm transition flex items-center gap-1.5"
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Menghapus...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Ya, Hapus Pegawai & Semua Data Terkait</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

