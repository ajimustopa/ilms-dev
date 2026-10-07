import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  Calendar,
  UserCheck,
  Edit2,
  HelpCircle,
  Sparkles,
  Info,
  X
} from 'lucide-react';
import api from '../../../../../shared/services/api';

export default function EmployeeCompletenessSection({
  activeSchoolUnit,
  employees = []
}) {
  const [profileList, setProfileList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [completenessFilter, setCompletenessFilter] = useState('all'); // 'all' | 'incomplete' | 'complete'
  const [statusFilter, setStatusFilter] = useState('all');

  // Edit modal
  const [editingEmp, setEditingEmp] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [formJoinDate, setFormJoinDate] = useState('');
  const [formSupervisorId, setFormSupervisorId] = useState('');
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  const fetchProfiles = async () => {
    setLoading(true);
    try {
      let q = `?per_page=100`;
      if (activeSchoolUnit?.id) q += `&school_unit_id=${activeSchoolUnit.id}`;
      if (completenessFilter !== 'all') q += `&completeness=${completenessFilter}`;
      if (statusFilter !== 'all') q += `&employment_status=${statusFilter}`;
      if (searchTerm) q += `&q=${encodeURIComponent(searchTerm)}`;

      const res = await api.get(`/kepegawaian/leave-employee-profile${q}`);
      if (res.data?.success) {
        setProfileList(res.data.data?.items || res.data.data || []);
      }
    } catch (err) {
      console.error('Fetch employee completeness error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfiles();
  }, [activeSchoolUnit, completenessFilter, statusFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchProfiles();
  };

  const handleOpenEdit = (emp) => {
    setEditingEmp(emp);
    setFormJoinDate(emp.join_date ? String(emp.join_date).slice(0, 10) : '');
    setFormSupervisorId(emp.direct_supervisor_employee_id ? String(emp.direct_supervisor_employee_id) : '');
    setErrorMsg(null);
    setModalOpen(true);
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg(null);

    if (formSupervisorId && String(formSupervisorId) === String(editingEmp.id)) {
      setErrorMsg('Pegawai tidak dapat menjadi atasan langsung bagi dirinya sendiri.');
      setSaving(false);
      return;
    }

    try {
      const payload = {
        join_date: formJoinDate || null,
        direct_supervisor_employee_id: formSupervisorId ? Number(formSupervisorId) : null
      };

      const res = await api.patch(`/kepegawaian/leave-employee-profile/${editingEmp.id}`, payload);
      if (res.data?.success) {
        setModalOpen(false);
        setSuccessMsg(`Data profil ${editingEmp.full_name} berhasil diperbarui`);
        fetchProfiles();
      }
    } catch (err) {
      console.error('Update employee profile error:', err);
      setErrorMsg(err.response?.data?.message || 'Gagal memperbarui data pegawai');
    } finally {
      setSaving(false);
    }
  };

  const incompleteCount = profileList.filter((p) => !p.is_complete).length;
  const completeCount = profileList.filter((p) => p.is_complete).length;

  return (
    <div className="space-y-4">
      {/* Header Info Banner */}
      <div className="p-4 bg-surface-container-lowest rounded-xl border border-outline-variant/20 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-on-surface">Kelengkapan Data Pegawai (Join Date & Atasan Langsung)</h3>
            <span className="px-2 py-0.5 rounded-full bg-surface-container-high text-primary font-bold text-[11px]">
              SPEC §2 #28
            </span>
          </div>
          <p className="text-xs text-on-surface-variant mt-0.5">
            Tanggal bergabung (<code>join_date</code>) wajib diisi untuk menghitung jatah kuota cuti tahunan awal (pro-rata). Tanpa <code>join_date</code> jatah berstatus <code>UNKNOWN_JOIN_DATE</code>.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{completeCount} Lengkap</span>
          </div>
          <div className="px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold flex items-center gap-1.5">
            <AlertCircle className="w-4 h-4 text-amber-600" />
            <span>{incompleteCount} Belum Lengkap</span>
          </div>
        </div>
      </div>

      {successMsg && (
        <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)}>
            <X className="w-4 h-4 text-emerald-600" />
          </button>
        </div>
      )}

      {/* Toolbar Filters */}
      <div className="p-3.5 bg-surface-container-lowest rounded-xl shadow-xs border border-outline-variant/20 flex flex-col sm:flex-row items-center justify-between gap-3">
        <form onSubmit={handleSearchSubmit} className="flex flex-wrap items-center gap-2.5 w-full">
          <div className="relative flex-1 sm:max-w-xs min-w-[200px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-outline" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari nama, NIP, NIK..."
              className="w-full h-9 pl-9 pr-3 rounded-lg bg-surface-container-low text-xs text-on-surface placeholder:text-outline border border-outline-variant/30 focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>

          <select
            value={completenessFilter}
            onChange={(e) => setCompletenessFilter(e.target.value)}
            className="h-9 px-3 rounded-lg bg-surface-container-low text-xs text-on-surface border border-outline-variant/30 focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer"
          >
            <option value="all">Semua Kelengkapan</option>
            <option value="incomplete">Hanya Belum Lengkap</option>
            <option value="complete">Sudah Lengkap</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 px-3 rounded-lg bg-surface-container-low text-xs text-on-surface border border-outline-variant/30 focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer"
          >
            <option value="all">Semua Status Pegawai</option>
            <option value="gty">GTY</option>
            <option value="pty">PTY</option>
            <option value="gtt">GTT</option>
            <option value="ptt">PTT</option>
            <option value="honorer">Honorer</option>
          </select>

          <button
            type="submit"
            className="px-3.5 py-2 rounded-lg bg-surface-container text-on-surface hover:bg-surface-container-high text-xs font-semibold transition-colors"
          >
            Filter
          </button>
        </form>
      </div>

      {/* Main Table */}
      <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/20 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-surface-container-low/60 border-b border-outline-variant/20 text-[11px] font-bold text-outline uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Nama Pegawai & NIP</th>
                <th className="py-3 px-3">Jabatan & Unit</th>
                <th className="py-3 px-3">Status Pegawai</th>
                <th className="py-3 px-3">Tanggal Bergabung (Join Date)</th>
                <th className="py-3 px-3">Atasan Langsung</th>
                <th className="py-3 px-3 text-center">Status Kelengkapan</th>
                <th className="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/10 text-on-surface">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-outline">
                    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    <span>Memuat kelengkapan data pegawai...</span>
                  </td>
                </tr>
              ) : profileList.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-outline">
                    Tidak ada pegawai ditemukan.
                  </td>
                </tr>
              ) : (
                profileList.map((emp) => {
                  const isTopLevel = emp.position_level === 1;
                  const hasJoinDate = Boolean(emp.join_date);
                  const hasSupervisor = Boolean(emp.direct_supervisor_employee_id) || isTopLevel;
                  const isComplete = hasJoinDate && hasSupervisor;

                  return (
                    <tr key={emp.id} className="hover:bg-surface-container-low/50 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-bold text-on-surface">{emp.full_name}</div>
                        <div className="text-[11px] text-outline font-mono">
                          {emp.nip || emp.employee_number || `ID #${emp.id}`}
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        <div className="font-medium text-on-surface">{emp.current_position_name || '—'}</div>
                        <div className="text-[11px] text-outline">Unit {emp.school_unit_id}</div>
                      </td>

                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded uppercase font-bold text-[10px] bg-surface-container border">
                          {emp.employment_status || '—'}
                        </span>
                      </td>

                      <td className="py-3 px-3">
                        {hasJoinDate ? (
                          <span className="font-semibold text-slate-900 font-mono">
                            {String(emp.join_date).slice(0, 10)}
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200 text-[11px] font-bold">
                            Belum Diisi
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-3">
                        {isTopLevel ? (
                          <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 text-[11px] font-semibold">
                            Level 1 (Pimpinan Puncak)
                          </span>
                        ) : emp.direct_supervisor_name ? (
                          <span className="font-medium text-primary">
                            {emp.direct_supervisor_name}
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 text-[11px] font-bold">
                            Belum Ditetapkan
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-3 text-center">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                          isComplete
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}>
                          {isComplete ? (
                            <>
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Lengkap</span>
                            </>
                          ) : (
                            <>
                              <AlertCircle className="w-3 h-3" />
                              <span>Belum Lengkap</span>
                            </>
                          )}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(emp)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-outline-variant/30 text-primary hover:bg-primary/10 text-xs font-bold transition-colors"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span>Ubah</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Modal */}
      {modalOpen && editingEmp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-surface-container-lowest rounded-2xl shadow-2xl border border-outline-variant/30 overflow-hidden">
            <div className="px-6 py-4 bg-surface-container-low border-b border-outline-variant/20 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-on-surface">Kelengkapan Data Pegawai</h3>
                <p className="text-xs text-on-surface-variant">{editingEmp.full_name}</p>
              </div>
              <button onClick={() => setModalOpen(false)}>
                <X className="w-5 h-5 text-outline" />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="p-6 space-y-4">
              {errorMsg && (
                <div className="p-3 rounded-lg bg-error-container/40 border border-error/30 text-xs text-on-error-container">
                  {errorMsg}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-on-surface mb-1">
                  Tanggal Bergabung (Join Date) <span className="text-error">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={formJoinDate}
                  onChange={(e) => setFormJoinDate(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-outline-variant/40 bg-surface-container-low text-xs text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
                <p className="text-[11px] text-outline mt-1">
                  Digunakan untuk perhitungan pro-rata hak saldo tahunan awal (cut-off tgl 15).
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-on-surface mb-1">
                  Atasan Langsung (Direct Supervisor)
                </label>
                <select
                  value={formSupervisorId}
                  onChange={(e) => setFormSupervisorId(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-outline-variant/40 bg-surface-container-low text-xs text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40"
                >
                  <option value="">-- Tidak Ada / Kosong --</option>
                  {employees
                    .filter((emp) => String(emp.id) !== String(editingEmp.id))
                    .map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.full_name} ({emp.nip || emp.employee_number || `ID ${emp.id}`})
                      </option>
                    ))}
                </select>
                <p className="text-[11px] text-outline mt-1">
                  Untuk rute approval langkah 1 direct_supervisor (anti hierarki siklus).
                </p>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-outline-variant/20">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-outline-variant/30 text-xs font-semibold text-on-surface-variant"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-lg bg-primary text-on-primary text-xs font-bold shadow-xs"
                >
                  {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
