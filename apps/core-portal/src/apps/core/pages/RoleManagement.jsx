import React, { useState, useEffect } from 'react';
import api from '../../../shared/services/api';
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
  AlertCircle
} from 'lucide-react';

export default function RoleManagement() {
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [formError, setFormError] = useState('');
  const [search, setSearch] = useState('');

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
        setRoles(rolesRes.data.data);
      }
      if (permsRes.data?.success && permsRes.data.data) {
        setPermissions(permsRes.data.data);
      }
    } catch (err) {
      setErrorMsg(
        err.response?.data?.message ||
        (err.response?.data?.errors ? err.response.data.errors.join(', ') : null) ||
        'Gagal memuat master role dan hak akses'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRolesAndPermissions();
  }, []);

  const filteredRoles = roles.filter((r) =>
    r.name.toLowerCase().includes(search.toLowerCase()) ||
    (r.description && r.description.toLowerCase().includes(search.toLowerCase()))
  );

  // Open Modal for Add
  const handleOpenAdd = () => {
    setEditingRole(null);
    setFormError('');
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

  // Select all permissions in a module
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
      alert('System Role bawaan tidak boleh dihapus!');
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

  // Group permissions by module
  const modules = [...new Set(permissions.map((p) => p.module))];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Role & Permission Management</h2>
          <p className="text-xs text-slate-500">
            Definisi hak akses berbasis peran (RBAC) granular untuk seluruh 14 aplikasi sekolah.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchRolesAndPermissions}
            className="p-2 border border-slate-200 rounded-xl bg-white hover:bg-slate-50 text-slate-600 transition"
            title="Muat Ulang Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Role Kustom</span>
          </button>
        </div>
      </div>

      {/* Error Alert */}
      {errorMsg && (
        <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari role berdasarkan nama atau deskripsi..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
          />
        </div>
      </div>

      {/* Grid of Roles */}
      {loading ? (
        <div className="py-12 text-center text-slate-400">
          <Loader2 className="w-6 h-6 animate-spin mx-auto text-emerald-600 mb-2" />
          <span className="text-xs">Memuat daftar master role...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredRoles.map((role) => (
            <div
              key={role.id}
              className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between hover:border-slate-300 transition"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  {role.is_system_role ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-md border border-slate-200">
                      <Lock className="w-3 h-3" />
                      System Role
                    </span>
                  ) : (
                    <span className="text-[10px] font-semibold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-md border border-emerald-200">
                      Custom Role
                    </span>
                  )}
                </div>

                <h3 className="text-sm font-bold text-slate-800">{role.name}</h3>
                <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                  {role.description || 'Tidak ada keterangan tambahan.'}
                </p>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-500">
                  {role.total_permissions || role.permissions?.length || 0} Izin Terpasang
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleOpenEdit(role)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 transition"
                    title="Edit Role & Permissions"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  {!role.is_system_role && (
                    <button
                      onClick={() => handleDelete(role)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 transition"
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

      {/* Modal Add/Edit Role */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-100 my-8 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
              <h3 className="text-sm font-bold text-slate-800">
                {editingRole ? `Edit Role: ${editingRole.name}` : 'Tambah Role Baru'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="mt-3 p-2.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2 shrink-0">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {/* Modal Body / Form */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto space-y-4 pt-4 pr-1">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nama Role <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="mis. kepala_asrama"
                  disabled={editingRole?.is_system_role}
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 disabled:bg-slate-100 disabled:text-slate-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Deskripsi Peran
                </label>
                <textarea
                  rows={2}
                  placeholder="Penjelasan ringkas fungsi peran ini"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              {/* Checkbox Permissions per Module */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-semibold text-slate-700">
                    Daftar Hak Izin (Permissions) — ({formData.selectedPermissions.length} Dipilih)
                  </label>
                </div>

                <div className="space-y-3.5 border border-slate-200 rounded-xl p-3.5 bg-slate-50/50">
                  {modules.map((moduleName) => {
                    const modulePerms = permissions.filter((p) => p.module === moduleName);
                    const isAllSelected = modulePerms.every((p) =>
                      formData.selectedPermissions.includes(p.id)
                    );

                    return (
                      <div key={moduleName} className="bg-white p-3 rounded-xl border border-slate-200/70 shadow-2xs">
                        <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-2">
                          <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                            {moduleName}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleSelectModulePermissions(moduleName)}
                            className="text-[11px] font-semibold text-emerald-600 hover:text-emerald-700"
                          >
                            {isAllSelected ? 'Batal Pilih Semua' : 'Pilih Semua'}
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {modulePerms.map((p) => {
                            const isChecked = formData.selectedPermissions.includes(p.id);
                            return (
                              <label
                                key={p.id}
                                className={`flex items-start gap-2 p-2 rounded-lg border text-xs cursor-pointer transition ${
                                  isChecked
                                    ? 'bg-emerald-50/80 border-emerald-300 text-emerald-900 font-medium'
                                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => handleTogglePermission(p.id)}
                                  className="mt-0.5 rounded text-emerald-600 focus:ring-0"
                                />
                                <div>
                                  <div className="font-mono text-[11px] leading-tight">{p.code}</div>
                                  <div className="text-[10px] text-slate-400 font-normal">{p.description}</div>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 disabled:opacity-50"
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
