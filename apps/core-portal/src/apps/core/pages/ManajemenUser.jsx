import React, { useState, useEffect } from 'react';
import api from '../../../shared/services/api';
import StatRibbonCard from '../../../shared/components/StatRibbonCard';
import StatusPill from '../../../shared/components/StatusPill';
import FlatAlertBanner from '../../../shared/components/FlatAlertBanner';
import {
  Users,
  Search,
  UserPlus,
  CheckCircle,
  XCircle,
  X,
  Save,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Loader2,
  AlertCircle,
  Shield,
  Building2,
  Key,
  Globe,
  Sliders,
  Check,
  Eye,
  Settings,
  HelpCircle,
  LayoutGrid,
  GraduationCap,
  UserCheck,
  Briefcase
} from 'lucide-react';

const ECOSYSTEM_APPS = [
  { module: 'core', name: 'Core Service & Sistem', desc: 'Profil Yayasan, Satuan Pendidikan, User, Role RBAC, Audit Log, API Client' },
  { module: 'website_utama', name: 'Website Utama CMS', desc: 'Profil Sekolah, Berita, Pengumuman, Agenda, Galeri & Konten Website Publik' },
  { module: 'kepegawaian', name: 'Kepegawaian & SDM', desc: 'Data Induk GTK, Alamat & Berkas, DUK, Presensi, Cuti, Payroll, Rekrutmen, Psikotes' },
  { module: 'akademik', name: 'Akademik & Kurikulum', desc: 'Data Siswa Dapodik, Rombel/Kelas, Jadwal, Nilai & Rapor, Presensi Siswa, Kelulusan' },
  { module: 'keuangan', name: 'Keuangan & SPP', desc: 'Pos Keuangan, Tagihan SPP & Uang Gedung, Virtual Account/Payment, Kas & Jurnal' },
  { module: 'kantin', name: 'Kantin & e-Wallet', desc: 'Kasir POS, Katalog Produk & Barcode, Vendor/Suplier, Top Up & Saldo Santri' },
  { module: 'dapur', name: 'Dapur & Logistik', desc: 'Menu Makanan Harian, Pengadaan Bahan Dapur, Stok Beras & Lauk Santri' },
  { module: 'sarpras', name: 'Sarana & Prasarana', desc: 'Inventaris Gedung & Ruang, Aset Sekolah, Peminjaman Fasilitas, Servis & Pemeliharaan' },
  { module: 'perpustakaan', name: 'Perpustakaan Digital', desc: 'Katalog Buku & ISBN, Sirkulasi Peminjaman, E-Book Digital, Kartu Anggota' },
  { module: 'al_quran', name: 'Al-Qur\'an & Tahfidz', desc: 'Setoran Hafalan, Ziyadah & Muraja\'ah, Penilaian Tajwid/Tilawah, Ujian Tahfidz' },
  { module: 'manajemen', name: 'Manajemen & RKT', desc: 'RIPS, Renstra, RKJM, RKT, Evaluasi Diri (EVADIR), Monev & Balanced Scorecard' },
  { module: 'ppdb', name: 'PPDB / PSB Online', desc: 'Formulir Pendaftaran, Seleksi Berkas, Tes Masuk Online, Pengumuman & Daftar Ulang' },
  { module: 'kesiswaan', name: 'Kesiswaan & Ekskul', desc: 'Ekstrakurikuler, Prestasi Siswa, Tata Tertib & Poin Pelanggaran, OSIS / Beasiswa' },
  { module: 'bk', name: 'Bimbingan & Konseling', desc: 'Catatan Konseling, Sosiometri & Home Visit, Rekomendasi Peminatan / Karir Siswa' },
  { module: 'cbt', name: 'CBT & Ujian Online', desc: 'Bank Soal, Jadwal Ujian Online, Monitoring Anti-Cheat, Analisis Butir Soal' },
  { module: 'alumni', name: 'Tracer Study & Alumni', desc: 'Database Alumni, Forum Karir & Lowongan Kerja, Donasi & Kontribusi Alumni' },
  { module: 'portal_ortu', name: 'Portal Orang Tua', desc: 'Monitoring Nilai, Presensi, Tagihan SPP, & Catatan Karakter Anak Mandiri' },
  { module: 'portal_siswa', name: 'Portal Siswa', desc: 'Jadwal Kelas, Materi Pembelajaran, Tugas Online, Presensi, & Raport Siswa' }
];

export default function ManajemenUser() {
  const [users, setUsers] = useState([]);
  const [schoolUnits, setSchoolUnits] = useState([]);
  const [roles, setRoles] = useState([]);

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [formError, setFormError] = useState('');

  // Tab State: 'all' | 'guru' | 'staff' | 'siswa'
  const [activeTab, setActiveTab] = useState('all');
  const [tabCounts, setTabCounts] = useState({ all: 0, guru: 0, staff: 0, siswa: 0 });

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [schoolUnitFilter, setSchoolUnitFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const pageSize = 10;

  // Debounce search input (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Modal States
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAccessModal, setShowAccessModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Form State: Add User
  const [addForm, setAddForm] = useState({
    username: '',
    password: '',
    full_name: '',
    account_type: 'admin',
    school_scope_type: 'yayasan', // 'yayasan' or 'school'
    school_unit_id: '',
    assignment_method: 'role', // 'role' or 'custom'
    role_id: '',
    app_permissions: ECOSYSTEM_APPS.reduce((acc, app) => ({ ...acc, [app.module]: 'none' }), {})
  });

  // Form State: Access Configuration for Existing User
  const [accessForm, setAccessForm] = useState({
    school_scope_type: 'yayasan',
    school_unit_id: '',
    assignment_method: 'role',
    role_id: '',
    app_permissions: ECOSYSTEM_APPS.reduce((acc, app) => ({ ...acc, [app.module]: 'none' }), {})
  });

  // Form State: Reset Password
  const [newPassword, setNewPassword] = useState('');

  // Fetch Users
  const fetchUsers = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await api.get('/core/users', {
        params: {
          search: debouncedSearch.trim() || undefined,
          tab: activeTab !== 'all' ? activeTab : undefined,
          account_type: typeFilter !== 'all' ? typeFilter : undefined,
          status: statusFilter !== 'all' ? statusFilter : undefined,
          school_unit_id: schoolUnitFilter !== 'all' ? schoolUnitFilter : undefined,
          page: currentPage,
          limit: pageSize,
        },
      });

      if (res.data?.success && res.data.data) {
        setUsers(res.data.data.items || []);
        if (res.data.data.tab_counts) {
          setTabCounts(res.data.data.tab_counts);
        }
        if (res.data.data.pagination) {
          setTotalPages(res.data.data.pagination.total_pages || 1);
          setTotalItems(res.data.data.pagination.total_items || 0);
        }
      }
    } catch (err) {
      setErrorMsg(
        err.response?.data?.message ||
        (err.response?.data?.errors ? err.response.data.errors.join(', ') : null) ||
        'Gagal memuat data pengguna dari server'
      );
    } finally {
      setLoading(false);
    }
  };

  // Fetch Metadata (Units & Roles)
  const fetchMetadata = async () => {
    try {
      const [schoolsRes, rolesRes] = await Promise.all([
        api.get('/core/school-units'),
        api.get('/core/roles'),
      ]);

      if (schoolsRes.data?.success && schoolsRes.data.data?.items) {
        setSchoolUnits(schoolsRes.data.data.items);
      }

      if (rolesRes.data?.success && rolesRes.data.data) {
        setRoles(rolesRes.data.data);
        if (rolesRes.data.data.length > 0) {
          setAddForm((prev) => ({ ...prev, role_id: String(rolesRes.data.data[0].id) }));
        }
      }
    } catch (err) {
      console.warn('Gagal memuat metadata units/roles:', err);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [currentPage, activeTab, typeFilter, statusFilter, schoolUnitFilter, debouncedSearch]);

  useEffect(() => {
    fetchMetadata();
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setDebouncedSearch(search);
    setCurrentPage(1);
  };

  // Open Access Modal for existing user
  const handleOpenAccessModal = (user) => {
    setSelectedUser(user);
    const primaryRole = user.school_roles?.[0];
    const isYayasan = !primaryRole?.school_unit_id;
    const isCustom = primaryRole?.role_name?.startsWith('custom_user_');

    const initialPermissions = ECOSYSTEM_APPS.reduce((acc, app) => {
      acc[app.module] = 'none';
      return acc;
    }, {});

    if (user.permissions && Array.isArray(user.permissions)) {
      user.permissions.forEach((p) => {
        const [mod, action] = p.code.split('.');
        if (action === 'manage') {
          initialPermissions[mod] = 'admin';
        } else if (action === 'view' && initialPermissions[mod] !== 'admin') {
          initialPermissions[mod] = 'view';
        }
      });
    }

    setAccessForm({
      school_scope_type: isYayasan ? 'yayasan' : 'school',
      school_unit_id: primaryRole?.school_unit_id ? String(primaryRole.school_unit_id) : (schoolUnits[0]?.id ? String(schoolUnits[0].id) : ''),
      assignment_method: isCustom ? 'custom' : 'role',
      role_id: primaryRole?.role_id ? String(primaryRole.role_id) : (roles[0]?.id ? String(roles[0].id) : ''),
      app_permissions: initialPermissions
    });

    setFormError('');
    setShowAccessModal(true);
  };

  // Submit Access Form for existing user
  const handleSaveAccess = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError('');

    try {
      const payload = {
        assignment_method: accessForm.assignment_method,
        school_unit_id: accessForm.school_scope_type === 'yayasan' ? null : Number(accessForm.school_unit_id),
        role_id: accessForm.assignment_method === 'role' ? Number(accessForm.role_id) : null,
        app_permissions: accessForm.assignment_method === 'custom' ? accessForm.app_permissions : null
      };

      const res = await api.put(`/core/users/${selectedUser.id}/access`, payload);
      if (res.data?.success) {
        setShowAccessModal(false);
        fetchUsers();
      }
    } catch (err) {
      setFormError(err.response?.data?.message || 'Gagal memperbarui hak akses pengguna');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Add User Submit
  const handleAddUser = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError('');

    try {
      const payload = {
        username: addForm.username.trim(),
        password: addForm.password,
        full_name: addForm.full_name.trim(),
        account_type: addForm.account_type,
        school_unit_id: addForm.school_scope_type === 'yayasan' ? null : Number(addForm.school_unit_id),
        assignment_method: addForm.assignment_method,
        role_id: addForm.assignment_method === 'role' ? Number(addForm.role_id) : null,
        app_permissions: addForm.assignment_method === 'custom' ? addForm.app_permissions : null
      };

      const res = await api.post('/core/users', payload);
      if (res.data?.success) {
        setShowAddModal(false);
        setAddForm({
          username: '',
          password: '',
          full_name: '',
          account_type: 'admin',
          school_scope_type: 'yayasan',
          school_unit_id: schoolUnits[0] ? String(schoolUnits[0].id) : '',
          assignment_method: 'role',
          role_id: roles[0] ? String(roles[0].id) : '',
          app_permissions: ECOSYSTEM_APPS.reduce((acc, app) => ({ ...acc, [app.module]: 'none' }), {})
        });
        fetchUsers();
      }
    } catch (err) {
      setFormError(err.response?.data?.message || 'Gagal menambahkan pengguna');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Toggle Status
  const handleToggleStatus = async (user) => {
    const nextStatus = user.status === 'active' ? 'inactive' : 'active';
    try {
      const res = await api.patch(`/core/users/${user.id}/status`, { status: nextStatus });
      if (res.data?.success) {
        setUsers(users.map((u) => (u.id === user.id ? { ...u, status: nextStatus } : u)));
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal mengubah status pengguna');
    }
  };

  // Handle Reset Password Submit
  const handleResetPassword = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError('');

    try {
      const res = await api.post(`/core/users/${selectedUser.id}/reset-password`, {
        new_password: newPassword || 'Password123!',
      });

      if (res.data?.success) {
        alert(`Password untuk @${selectedUser.username} berhasil direset!`);
        setShowResetModal(false);
        setNewPassword('');
        setSelectedUser(null);
      }
    } catch (err) {
      setFormError(err.response?.data?.message || 'Gagal mereset password');
    } finally {
      setSubmitting(false);
    }
  };

  // Quick Matrix Action Helpers
  const setAllMatrix = (setter, targetState, accessValue) => {
    const updated = { ...targetState.app_permissions };
    ECOSYSTEM_APPS.forEach((app) => {
      updated[app.module] = accessValue;
    });
    setter((prev) => ({ ...prev, app_permissions: updated }));
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Title & Action Button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-xl border border-slate-100 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Manajemen Pengguna & Hak Akses</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Kelola akun login terpusat, lingkup satuan pendidikan, dan penetapan hak akses aplikasi (Role Baku atau Matrix Kustom).
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchUsers}
            disabled={loading}
            className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 text-slate-600 transition shadow-2xs"
            title="Muat Ulang Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => {
              setFormError('');
              setShowAddModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl transition shadow-xs"
          >
            <UserPlus className="w-4 h-4" />
            <span>+ Tambah Pengguna</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs: Guru, Staff, Siswa, Semua Pengguna */}
      <div className="flex items-center gap-2 border-b border-slate-200/80 pb-2 overflow-x-auto">
        {[
          { key: 'all', label: 'Semua Pengguna', icon: Users, count: tabCounts.all, activeColor: 'bg-slate-900 text-white' },
          { key: 'guru', label: 'Akun Guru & Pendidik', icon: GraduationCap, count: tabCounts.guru, activeColor: 'bg-emerald-600 text-white' },
          { key: 'staff', label: 'Akun Staf & Manajemen', icon: Building2, count: tabCounts.staff, activeColor: 'bg-blue-600 text-white' },
          { key: 'siswa', label: 'Akun Siswa / Santri', icon: UserCheck, count: tabCounts.siswa, activeColor: 'bg-amber-600 text-white' }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => {
                setActiveTab(tab.key);
                setCurrentPage(1);
              }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition shrink-0 ${
                isActive
                  ? `${tab.activeColor} shadow-xs`
                  : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200/80 shadow-2xs'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
              <span>{tab.label}</span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-mono transition ${
                  isActive
                    ? 'bg-black/20 text-white'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-80">
          <input
            type="text"
            placeholder="Cari username, nama, peran, unit..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-8 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-slate-800"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          {search && (
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setDebouncedSearch('');
                setCurrentPage(1);
              }}
              className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
              title="Bersihkan pencarian"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </form>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Filter Satuan Pendidikan */}
          <select
            value={schoolUnitFilter}
            onChange={(e) => {
              setSchoolUnitFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">Semua Satuan Pendidikan / Yayasan</option>
            <option value="yayasan">Yayasan (Lintas Satuan)</option>
            {schoolUnits.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>

          {/* Filter Tipe Akun */}
          <select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">Semua Tipe Akun</option>
            <option value="admin">Admin</option>
            <option value="staff">Staf / Guru</option>
            <option value="student">Siswa</option>
            <option value="parent">Orang Tua</option>
          </select>

          {/* Filter Status */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">Semua Status</option>
            <option value="active">Aktif</option>
            <option value="inactive">Nonaktif</option>
          </select>

          {(search || typeFilter !== 'all' || statusFilter !== 'all' || schoolUnitFilter !== 'all') && (
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setDebouncedSearch('');
                setTypeFilter('all');
                setStatusFilter('all');
                setSchoolUnitFilter('all');
                setCurrentPage(1);
              }}
              className="px-2.5 py-2 text-xs bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl font-semibold transition flex items-center gap-1"
              title="Reset Semua Filter"
            >
              <X className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Users Table */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-xs overflow-hidden">
        <div className="table-container">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 uppercase text-[10px] font-semibold">
                <th className="py-3.5 px-4">Pengguna</th>
                <th className="py-3.5 px-4">Tipe Akun</th>
                <th className="py-3.5 px-4">Lingkup Satuan Pendidikan</th>
                <th className="py-3.5 px-4">Peran / Hak Akses</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-600" />
                    <span>Memuat data pengguna...</span>
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-slate-400">
                    <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <span>Tidak ada pengguna yang sesuai dengan filter</span>
                  </td>
                </tr>
              ) : (
                users.map((u) => {
                  const primaryRole = u.school_roles?.[0];
                  const isCustom = primaryRole?.role_name?.startsWith('custom_user_');
                  const isYayasan = !primaryRole?.school_unit_id;

                  return (
                    <tr key={u.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-800">{u.full_name}</div>
                        <div className="text-[11px] font-mono text-slate-400">@{u.username}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase bg-slate-100 text-slate-700">
                          {u.account_type}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        {isYayasan ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                            <Globe className="w-3 h-3" />
                            <span>Yayasan (Lintas Satuan Pendidikan)</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                            <Building2 className="w-3 h-3" />
                            <span>{primaryRole?.school_name}</span>
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        {isCustom ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            <Sliders className="w-3 h-3" />
                            <span>Kustom (Matrix Aplikasi)</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                            <Shield className="w-3 h-3" />
                            <span>{primaryRole?.role_name || 'Tanpa Peran'}</span>
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={() => handleToggleStatus(u)}
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold transition ${
                            u.status === 'active'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                              : 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
                          }`}
                        >
                          {u.status === 'active' ? '● Aktif' : '○ Nonaktif'}
                        </button>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenAccessModal(u)}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-semibold text-[11px] transition"
                            title="Atur Lingkup Satuan Pendidikan & Hak Akses Aplikasi"
                          >
                            <Shield className="w-3.5 h-3.5" />
                            <span>Atur Akses</span>
                          </button>
                          <button
                            onClick={() => {
                              setSelectedUser(u);
                              setNewPassword('');
                              setFormError('');
                              setShowResetModal(true);
                            }}
                            className="p-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition"
                            title="Reset Password"
                          >
                            <Key className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>Menampilkan {users.length} dari {totalItems} total pengguna</span>
          <div className="flex items-center gap-1">
            <button
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => p - 1)}
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 py-1 font-semibold text-slate-700">
              {currentPage} / {totalPages}
            </span>
            <button
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => p + 1)}
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* MODAL 1: ATUR HAK AKSES PENGGUNA (DUAL METHOD + SCOPE)   */}
      {/* ======================================================== */}
      {showAccessModal && selectedUser && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full p-6 border border-slate-100 max-h-[90vh] flex flex-col animate-in fade-in">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-indigo-600" />
                  <span>Konfigurasi Hak Akses: {selectedUser.full_name}</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5 font-mono">@{selectedUser.username}</p>
              </div>
              <button onClick={() => setShowAccessModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="mt-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSaveAccess} className="mt-4 space-y-5 overflow-y-auto pr-1 flex-1 text-xs">
              {/* 1. Pemilihan Lingkup Satuan Pendidikan */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-3">
                <label className="block font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                  1. Lingkup Satuan Pendidikan
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <label
                    className={`flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer transition ${
                      accessForm.school_scope_type === 'yayasan'
                        ? 'bg-purple-50/80 border-purple-300 text-purple-900 font-bold shadow-2xs'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <input
                      type="radio"
                      name="access_scope"
                      value="yayasan"
                      checked={accessForm.school_scope_type === 'yayasan'}
                      onChange={() => setAccessForm({ ...accessForm, school_scope_type: 'yayasan' })}
                      className="text-purple-600"
                    />
                    <Globe className="w-4 h-4 text-purple-600 shrink-0" />
                    <div>
                      <div>Lingkup Yayasan</div>
                      <div className="text-[10px] font-normal text-purple-700">Akses Lintas Seluruh Satuan Pendidikan</div>
                    </div>
                  </label>

                  <label
                    className={`flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer transition ${
                      accessForm.school_scope_type === 'school'
                        ? 'bg-blue-50/80 border-blue-300 text-blue-900 font-bold shadow-2xs'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <input
                      type="radio"
                      name="access_scope"
                      value="school"
                      checked={accessForm.school_scope_type === 'school'}
                      onChange={() => setAccessForm({ ...accessForm, school_scope_type: 'school' })}
                      className="text-blue-600"
                    />
                    <Building2 className="w-4 h-4 text-blue-600 shrink-0" />
                    <div>
                      <div>Satuan Pendidikan Spesifik</div>
                      <div className="text-[10px] font-normal text-blue-700">Dibatasi pada 1 Unit Sekolah</div>
                    </div>
                  </label>
                </div>

                {accessForm.school_scope_type === 'school' && (
                  <div className="pt-2">
                    <label className="block font-semibold text-slate-700 mb-1">Pilih Unit Sekolah *</label>
                    <select
                      value={accessForm.school_unit_id}
                      onChange={(e) => setAccessForm({ ...accessForm, school_unit_id: e.target.value })}
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-xl font-medium text-slate-800"
                    >
                      {schoolUnits.map((s) => (
                        <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* 2. Dua Metode Penetapan Hak Akses */}
              <div className="space-y-3">
                <label className="block font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                  2. Metode Penetapan Hak Akses
                </label>

                {/* Tabs Metode */}
                <div className="flex items-center p-1 bg-slate-100 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setAccessForm({ ...accessForm, assignment_method: 'role' })}
                    className={`flex-1 py-2 rounded-lg font-bold text-xs transition flex items-center justify-center gap-1.5 ${
                      accessForm.assignment_method === 'role'
                        ? 'bg-white text-indigo-600 shadow-xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <Shield className="w-3.5 h-3.5" />
                    <span>Metode 1: Pilih Peran Baku (Preset Standar)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAccessForm({ ...accessForm, assignment_method: 'custom' })}
                    className={`flex-1 py-2 rounded-lg font-bold text-xs transition flex items-center justify-center gap-1.5 ${
                      accessForm.assignment_method === 'custom'
                        ? 'bg-white text-indigo-600 shadow-xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <Sliders className="w-3.5 h-3.5" />
                    <span>Metode 2: Kustom Hak Akses per Aplikasi</span>
                  </button>
                </div>

                {/* METODE 1: PILIH PERAN BAKU */}
                {accessForm.assignment_method === 'role' && (
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                    <label className="block font-semibold text-slate-700 mb-1">Pilih Peran Standar RBAC *</label>
                    <select
                      value={accessForm.role_id}
                      onChange={(e) => setAccessForm({ ...accessForm, role_id: e.target.value })}
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-xl font-medium text-slate-800"
                    >
                      {roles.filter(r => !r.name.startsWith('custom_user_')).map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name} — {r.description || 'Peran Sistem'}
                        </option>
                      ))}
                    </select>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Peran baku memaketkan serangkaian hak akses default yang telah dikonfigurasi sesuai tupoksi.
                    </p>
                  </div>
                )}

                {/* METODE 2: KUSTOM MATRIX APLIKASI */}
                {accessForm.assignment_method === 'custom' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-200">
                      <span className="font-semibold text-slate-700">Aksi Cepat Matrix:</span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setAllMatrix(setAccessForm, accessForm, 'view')}
                          className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 font-semibold text-[11px]"
                        >
                          Semua View Only
                        </button>
                        <button
                          type="button"
                          onClick={() => setAllMatrix(setAccessForm, accessForm, 'admin')}
                          className="px-2.5 py-1 rounded-lg bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 text-indigo-700 font-semibold text-[11px]"
                        >
                          Semua Admin
                        </button>
                        <button
                          type="button"
                          onClick={() => setAllMatrix(setAccessForm, accessForm, 'none')}
                          className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-rose-600 font-semibold text-[11px]"
                        >
                          Reset Kosong
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                      {ECOSYSTEM_APPS.map((app) => {
                        const currentVal = accessForm.app_permissions[app.module] || 'none';
                        return (
                          <div
                            key={app.module}
                            className="p-3 bg-white rounded-xl border border-slate-200 hover:border-slate-300 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                          >
                            <div className="min-w-0">
                              <div className="font-bold text-slate-800">{app.name}</div>
                              <div className="text-[11px] text-slate-400 line-clamp-1">{app.desc}</div>
                            </div>

                            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg shrink-0">
                              <button
                                type="button"
                                onClick={() =>
                                  setAccessForm({
                                    ...accessForm,
                                    app_permissions: { ...accessForm.app_permissions, [app.module]: 'none' }
                                  })
                                }
                                className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition ${
                                  currentVal === 'none'
                                    ? 'bg-slate-300 text-slate-800 shadow-2xs'
                                    : 'text-slate-500 hover:text-slate-800'
                                }`}
                              >
                                Tidak Ada
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  setAccessForm({
                                    ...accessForm,
                                    app_permissions: { ...accessForm.app_permissions, [app.module]: 'view' }
                                  })
                                }
                                className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition flex items-center gap-1 ${
                                  currentVal === 'view'
                                    ? 'bg-blue-600 text-white shadow-2xs'
                                    : 'text-slate-500 hover:text-slate-800'
                                }`}
                              >
                                <Eye className="w-3 h-3" />
                                <span>Hanya Tampil</span>
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  setAccessForm({
                                    ...accessForm,
                                    app_permissions: { ...accessForm.app_permissions, [app.module]: 'admin' }
                                  })
                                }
                                className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition flex items-center gap-1 ${
                                  currentVal === 'admin'
                                    ? 'bg-indigo-600 text-white shadow-2xs'
                                    : 'text-slate-500 hover:text-slate-800'
                                }`}
                              >
                                <Shield className="w-3 h-3" />
                                <span>Sebagai Admin</span>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Submit Buttons */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAccessModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl font-semibold hover:bg-slate-200"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-1.5 px-5 py-2 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 disabled:opacity-50 shadow-xs"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span>Simpan Perubahan Hak Akses</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 2: TAMBAH PENGGUNA BARU DENGAN PILIHAN AKSES       */}
      {/* ======================================================== */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full p-6 border border-slate-100 max-h-[90vh] flex flex-col animate-in fade-in">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-indigo-600" />
                <span>Tambah Pengguna & Konfigurasi Hak Akses</span>
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="mt-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleAddUser} className="mt-4 space-y-4 overflow-y-auto pr-1 flex-1 text-xs">
              {/* Info Dasar Akun */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Username Login *</label>
                  <input
                    type="text"
                    required
                    placeholder="mis. ahmad.fauzi"
                    value={addForm.username}
                    onChange={(e) => setAddForm({ ...addForm, username: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Password Awal *</label>
                  <input
                    type="password"
                    required
                    placeholder="Minimal 6 karakter"
                    value={addForm.password}
                    onChange={(e) => setAddForm({ ...addForm, password: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Nama Lengkap *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ahmad Fauzi, S.Pd."
                    value={addForm.full_name}
                    onChange={(e) => setAddForm({ ...addForm, full_name: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tipe Akun *</label>
                  <select
                    value={addForm.account_type}
                    onChange={(e) => setAddForm({ ...addForm, account_type: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                  >
                    <option value="admin">Administrator</option>
                    <option value="staff">Staf / Guru</option>
                  </select>
                </div>
              </div>

              {/* 1. Lingkup Satuan Pendidikan */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <label className="block font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                  Lingkup Satuan Pendidikan
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <label
                    className={`flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer transition ${
                      addForm.school_scope_type === 'yayasan'
                        ? 'bg-purple-50/80 border-purple-300 text-purple-900 font-bold'
                        : 'bg-white border-slate-200 text-slate-600'
                    }`}
                  >
                    <input
                      type="radio"
                      name="add_scope"
                      value="yayasan"
                      checked={addForm.school_scope_type === 'yayasan'}
                      onChange={() => setAddForm({ ...addForm, school_scope_type: 'yayasan' })}
                      className="text-purple-600"
                    />
                    <Globe className="w-4 h-4 text-purple-600" />
                    <span>Lingkup Yayasan (Lintas Unit)</span>
                  </label>

                  <label
                    className={`flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer transition ${
                      addForm.school_scope_type === 'school'
                        ? 'bg-blue-50/80 border-blue-300 text-blue-900 font-bold'
                        : 'bg-white border-slate-200 text-slate-600'
                    }`}
                  >
                    <input
                      type="radio"
                      name="add_scope"
                      value="school"
                      checked={addForm.school_scope_type === 'school'}
                      onChange={() => setAddForm({ ...addForm, school_scope_type: 'school' })}
                      className="text-blue-600"
                    />
                    <Building2 className="w-4 h-4 text-blue-600" />
                    <span>Satuan Pendidikan Tertentu</span>
                  </label>
                </div>

                {addForm.school_scope_type === 'school' && (
                  <div className="pt-2">
                    <label className="block font-semibold text-slate-700 mb-1">Pilih Unit Sekolah *</label>
                    <select
                      value={addForm.school_unit_id}
                      onChange={(e) => setAddForm({ ...addForm, school_unit_id: e.target.value })}
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-xl"
                    >
                      {schoolUnits.map((s) => (
                        <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* 2. Metode Penetapan Hak Akses */}
              <div className="space-y-3">
                <label className="block font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                  Metode Penetapan Hak Akses
                </label>

                <div className="flex items-center p-1 bg-slate-100 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setAddForm({ ...addForm, assignment_method: 'role' })}
                    className={`flex-1 py-2 rounded-lg font-bold text-xs transition ${
                      addForm.assignment_method === 'role' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-500'
                    }`}
                  >
                    Metode 1: Peran Baku (Preset)
                  </button>
                  <button
                    type="button"
                    onClick={() => setAddForm({ ...addForm, assignment_method: 'custom' })}
                    className={`flex-1 py-2 rounded-lg font-bold text-xs transition ${
                      addForm.assignment_method === 'custom' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-500'
                    }`}
                  >
                    Metode 2: Matrix Kustom per Aplikasi
                  </button>
                </div>

                {addForm.assignment_method === 'role' ? (
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <label className="block font-semibold text-slate-700 mb-1">Pilih Peran Standar *</label>
                    <select
                      value={addForm.role_id}
                      onChange={(e) => setAddForm({ ...addForm, role_id: e.target.value })}
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-xl font-medium"
                    >
                      {roles.filter(r => !r.name.startsWith('custom_user_')).map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name} — {r.description || 'Peran Sistem'}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {ECOSYSTEM_APPS.map((app) => {
                      const currentVal = addForm.app_permissions[app.module] || 'none';
                      return (
                        <div
                          key={app.module}
                          className="p-3 bg-white rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                        >
                          <div className="font-semibold text-slate-800">{app.name}</div>
                          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
                            <button
                              type="button"
                              onClick={() =>
                                setAddForm({
                                  ...addForm,
                                  app_permissions: { ...addForm.app_permissions, [app.module]: 'none' }
                                })
                              }
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                currentVal === 'none' ? 'bg-slate-300 text-slate-800' : 'text-slate-500'
                              }`}
                            >
                              Tidak Ada
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setAddForm({
                                  ...addForm,
                                  app_permissions: { ...addForm.app_permissions, [app.module]: 'view' }
                                })
                              }
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                currentVal === 'view' ? 'bg-blue-600 text-white' : 'text-slate-500'
                              }`}
                            >
                              Tampil
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setAddForm({
                                  ...addForm,
                                  app_permissions: { ...addForm.app_permissions, [app.module]: 'admin' }
                                })
                              }
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                currentVal === 'admin' ? 'bg-indigo-600 text-white' : 'text-slate-500'
                              }`}
                            >
                              Admin
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl font-semibold hover:bg-slate-200"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-1.5 px-5 py-2 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 disabled:opacity-50 shadow-xs"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span>Buat Akun Pengguna</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 3: RESET PASSWORD PENGGUNA                         */}
      {/* ======================================================== */}
      {showResetModal && selectedUser && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 border border-slate-100 animate-in fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Key className="w-4 h-4 text-amber-500" />
                <span>Reset Password Pengguna</span>
              </h3>
              <button onClick={() => setShowResetModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500 mb-4">
              Anda akan mengatur ulang kata sandi untuk akun <strong>@{selectedUser.username}</strong> ({selectedUser.full_name}).
            </p>

            <form onSubmit={handleResetPassword} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Password Baru (Opsional)</label>
                <input
                  type="text"
                  placeholder="Kosongkan untuk default: Password123!"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowResetModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-amber-500 text-white rounded-xl font-semibold hover:bg-amber-600 disabled:opacity-50"
                >
                  {submitting ? 'Mereset...' : 'Reset Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
