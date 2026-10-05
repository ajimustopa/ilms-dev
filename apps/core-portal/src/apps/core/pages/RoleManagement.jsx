import React, { useState, useEffect } from 'react';
import api from '../../../shared/services/api';
import StatusPill from '../../../shared/components/StatusPill';
import FlatAlertBanner from '../../../shared/components/FlatAlertBanner';
import {
  ShieldCheck,
  Plus,
  Edit2,
  Trash2,
  X,
  Save,
  Search,
  Lock,
  RefreshCw,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Shield,
  Layers,
  Check,
  Filter
} from 'lucide-react';

const MODULE_LABELS = {
  core: 'Core Service & Pengaturan Sistem',
  website_utama: 'Website Utama & Publikasi Informasi (CMS)',
  kepegawaian: 'Kepegawaian, GTK & SDM',
  'kepegawaian.payroll': 'Kepegawaian — Penggajian & Payroll',
  akademik: 'Akademik, Kurikulum & Nilai Siswa',
  keuangan: 'Keuangan, Kas, Tagihan SPP & Pembukuan',
  kantin: 'Kantin Sekolah & e-Wallet Santri',
  dapur: 'Dapur & Logistik Makan Santri',
  sarpras: 'Sarana, Prasarana & Aset',
  perpustakaan: 'Perpustakaan Digital & Sirkulasi Buku',
  al_quran: 'Al-Qur\'an & Tahfidz',
  manajemen: 'Manajemen & Perencanaan Strategis (RKT/Monev/BSC)',
  ppdb: 'PPDB Online (Penerimaan Peserta Didik Baru)',
  psb: 'PSB Terintegrasi (Penerimaan Santri Baru)',
  kesiswaan: 'Kesiswaan & Ekstrakurikuler',
  bk: 'Bimbingan & Konseling (BK)',
  cbt: 'CBT & Ujian Online',
  alumni: 'Tracer Study & Alumni',
  portal_ortu: 'Portal Orang Tua',
  portal_siswa: 'Portal Siswa'
};

export default function RoleManagement() {
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [formError, setFormError] = useState('');
  const [search, setSearch] = useState('');
  const [permSearch, setPermSearch] = useState('');

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    selectedPermissions: [],
  });

  const fetchRolesAndPermissions = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const [rolesRes, permsRes] = await Promise.all([
        api.get('/core/roles'),
        api.get('/core/permissions'),
      ]);

      if (rolesRes.data?.success && rolesRes.data.data) {
        const roleData = Array.isArray(rolesRes.data.data)
          ? rolesRes.data.data
          : (rolesRes.data.data.items || []);
        // Filter out internal user-custom roles from the main role templates grid
        setRoles(roleData);
      }

      if (permsRes.data?.success && permsRes.data.data) {
        const permData = Array.isArray(permsRes.data.data)
          ? permsRes.data.data
          : (permsRes.data.data.items || []);
        setPermissions(permData);
      }
    } catch (err) {
      setErrorMsg(
        err.response?.data?.message ||
        (err.response?.data?.errors ? err.response.data.errors.join(', ') : null) ||
        'Gagal memuat master role dan hak akses. Pastikan backend server aktif.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRolesAndPermissions();
  }, []);

  const filteredRoles = roles
    .filter((r) => !r.name.startsWith('custom_user_'))
    .filter((r) =>
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      (r.description && r.description.toLowerCase().includes(search.toLowerCase()))
    );

  // Open Modal for Add
  const handleOpenAdd = () => {
    setEditingRole(null);
    setFormError('');
    setPermSearch('');
    setFormData({
      name: '',
      description: '',
      selectedPermissions: [],
    });
    setShowModal(true);
  };

  // Open Modal for Edit
  const handleOpenEdit = async (role) => {
    setEditingRole(role);
    setFormError('');
    setPermSearch('');
    try {
      const res = await api.get(`/core/roles/${role.id}`);
      if (res.data?.success && res.data.data) {
        const detail = res.data.data;
        const currentPermIds = detail.permissions ? detail.permissions.map((p) => p.id) : [];
        setFormData({
          name: detail.name,
          description: detail.description || '',
          selectedPermissions: currentPermIds,
        });
        setShowModal(true);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal memuat detail role');
    }
  };

  // Toggle permission checkbox
  const handleTogglePermission = (id) => {
    setFormData((prev) => {
      const exists = prev.selectedPermissions.includes(id);
      return {
        ...prev,
        selectedPermissions: exists
          ? prev.selectedPermissions.filter((pId) => pId !== id)
          : [...prev.selectedPermissions, id],
      };
    });
  };

  // Select all permissions in a specific module
  const handleSelectModulePermissions = (moduleName) => {
    const modulePermIds = permissions
      .filter((p) => p.module === moduleName)
      .map((p) => p.id);
    const allSelected = modulePermIds.every((id) =>
      formData.selectedPermissions.includes(id)
    );

    setFormData((prev) => ({
      ...prev,
      selectedPermissions: allSelected
        ? prev.selectedPermissions.filter((id) => !modulePermIds.includes(id))
        : [...new Set([...prev.selectedPermissions, ...modulePermIds])],
    }));
  };

  // Select All Global
  const handleSelectAllGlobal = () => {
    setFormData((prev) => ({
      ...prev,
      selectedPermissions: permissions.map((p) => p.id)
    }));
  };

  // Clear All Global
  const handleClearAllGlobal = () => {
    setFormData((prev) => ({
      ...prev,
      selectedPermissions: []
    }));
  };

  // Submit Add / Edit
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError('');

    try {
      const payload = {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        permission_ids: formData.selectedPermissions,
      };

      if (editingRole) {
        await api.put(`/core/roles/${editingRole.id}`, payload);
      } else {
        await api.post('/core/roles', payload);
      }

      setShowModal(false);
      fetchRolesAndPermissions();
    } catch (err) {
      setFormError(
        err.response?.data?.message ||
        (err.response?.data?.errors ? err.response.data.errors.join(', ') : null) ||
        'Gagal menyimpan data role'
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Delete Role
  const handleDelete = async (role) => {
    if (role.is_system_role) {
      alert('Peran sistem (System Role) bawaan tidak boleh dihapus!');
      return;
    }
    if (confirm(`Yakin ingin menghapus role '${role.name}'?`)) {
      try {
        await api.delete(`/core/roles/${role.id}`);
        fetchRolesAndPermissions();
      } catch (err) {
        alert(err.response?.data?.message || 'Gagal menghapus role');
      }
    }
  };

  // Filtered permissions and module grouping
  const filteredPermissions = permissions.filter((p) => {
    if (!permSearch) return true;
    const q = permSearch.toLowerCase();
    return (
      p.code.toLowerCase().includes(q) ||
      (p.description && p.description.toLowerCase().includes(q)) ||
      (p.module && p.module.toLowerCase().includes(q))
    );
  });

  const modules = [...new Set(filteredPermissions.map((p) => p.module || 'umum'))];

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-xl border border-slate-100 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-indigo-600" />
            <span>Manajemen Role & Hak Akses (RBAC)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Definisi master peran baku dan paket izin (permissions) untuk seluruh modul ekosistem aplikasi sekolah.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchRolesAndPermissions}
            disabled={loading}
            className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 text-slate-600 transition shadow-2xs"
            title="Muat Ulang Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs transition"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Role Baru</span>
          </button>
        </div>
      </div>

      {/* Error Alert */}
      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-xs flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari role berdasarkan nama atau deskripsi..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div className="text-xs font-medium text-slate-500">
          Total: <span className="font-bold text-slate-800">{filteredRoles.length} Peran</span>
        </div>
      </div>

      {/* Grid of Roles */}
      {loading ? (
        <div className="py-16 text-center text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-600 mb-2" />
          <span className="text-xs">Memuat daftar master role dan hak akses...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredRoles.map((role) => (
            <div
              key={role.id}
              className="bg-white p-5 rounded-xl border border-slate-100 shadow-xs flex flex-col justify-between hover:border-slate-300 transition"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600">
                    <Shield className="w-5 h-5" />
                  </div>
                  {role.is_system_role ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-md border border-slate-200">
                      <Lock className="w-3 h-3" />
                      Peran Sistem
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold bg-amber-50 text-amber-700 px-2.5 py-0.5 rounded-md border border-amber-200">
                      Peran Kustom
                    </span>
                  )}
                </div>

                <h3 className="text-sm font-bold text-slate-800">{role.name}</h3>
                <p className="text-xs text-slate-500 mt-1 min-h-8 line-clamp-2">
                  {role.description || 'Tidak ada keterangan tambahan.'}
                </p>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-500">
                  {role.total_permissions || role.permissions?.length || 0} Izin Terpasang
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleOpenEdit(role)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition"
                    title="Edit Role & Izin"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  {!role.is_system_role && (
                    <button
                      onClick={() => handleDelete(role)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition"
                      title="Hapus Role"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Add / Edit Role */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-xl max-w-3xl w-full p-6 shadow-xl border border-slate-100 my-8 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 shrink-0">
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-indigo-600" />
                <span>{editingRole ? `Edit Role: ${editingRole.name}` : 'Tambah Role Baru'}</span>
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="mt-3 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2 shrink-0">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {/* Modal Body / Form */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto space-y-4 pt-4 pr-1 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Nama Role *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="mis. kepala_asrama"
                    disabled={editingRole?.is_system_role}
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-100 disabled:text-slate-400"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Deskripsi Peran
                  </label>
                  <input
                    type="text"
                    placeholder="Penjelasan ringkas fungsi peran ini"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Checkbox Permissions per Module */}
              <div className="space-y-3 pt-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
                  <div className="font-bold text-slate-800">
                    Daftar Hak Izin (Permissions) — <span className="text-indigo-600 font-extrabold">{formData.selectedPermissions.length}</span> Dipilih
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleSelectAllGlobal}
                      className="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-semibold text-[11px]"
                    >
                      Pilih Semua Izin
                    </button>
                    <button
                      type="button"
                      onClick={handleClearAllGlobal}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 font-semibold text-[11px]"
                    >
                      Kosongkan Pilihan
                    </button>
                  </div>
                </div>

                {/* Filter Perm Search */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Filter nama izin atau modul..."
                    value={permSearch}
                    onChange={(e) => setPermSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  />
                </div>

                <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                  {modules.length === 0 ? (
                    <div className="p-8 text-center text-slate-400">
                      Tidak ada izin yang cocok dengan filter pencarian.
                    </div>
                  ) : (
                    modules.map((moduleName) => {
                      const modulePerms = filteredPermissions.filter((p) => (p.module || 'umum') === moduleName);
                      const isAllSelected = modulePerms.every((p) =>
                        formData.selectedPermissions.includes(p.id)
                      );
                      const displayTitle = MODULE_LABELS[moduleName] || moduleName.toUpperCase();

                      return (
                        <div key={moduleName} className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-200">
                          <div className="flex items-center justify-between pb-2 border-b border-slate-200/80 mb-2.5">
                            <span className="font-bold text-slate-800 tracking-tight">
                              {displayTitle}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleSelectModulePermissions(moduleName)}
                              className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800"
                            >
                              {isAllSelected ? 'Batal Pilih Modul Ini' : 'Pilih Semua Modul Ini'}
                            </button>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {modulePerms.map((p) => {
                              const isChecked = formData.selectedPermissions.includes(p.id);
                              return (
                                <label
                                  key={p.id}
                                  className={`flex items-start gap-2.5 p-2.5 rounded-xl border text-xs cursor-pointer transition ${
                                    isChecked
                                      ? 'bg-indigo-50/90 border-indigo-300 text-indigo-950 font-medium shadow-2xs'
                                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100/80'
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => handleTogglePermission(p.id)}
                                    className="mt-0.5 rounded text-indigo-600 focus:ring-0"
                                  />
                                  <div className="min-w-0">
                                    <div className="font-mono text-[11px] font-bold leading-tight">{p.code}</div>
                                    <div className="text-[10px] text-slate-400 font-normal mt-0.5 line-clamp-1">{p.description}</div>
                                  </div>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl flex items-center gap-1.5 disabled:opacity-50 shadow-xs"
                >
                  {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  <span>{submitting ? 'Menyimpan...' : 'Simpan Role'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
