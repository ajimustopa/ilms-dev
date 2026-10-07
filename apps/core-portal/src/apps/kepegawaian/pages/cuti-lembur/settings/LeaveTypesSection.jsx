import React, { useState } from 'react';
import {
  Plus,
  Search,
  Filter,
  Sliders,
  CheckCircle2,
  XCircle,
  Edit2,
  Trash2,
  Lock,
  Sparkles,
  Info,
  Calendar,
  Layers,
  AlertCircle
} from 'lucide-react';
import api from '../../../../../shared/services/api';

const CATEGORY_BADGES = {
  annual: { label: 'Tahunan', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  special: { label: 'Khusus', bg: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  sick: { label: 'Sakit', bg: 'bg-amber-50 text-amber-700 border-amber-200' },
  permit: { label: 'Izin Pribadi', bg: 'bg-blue-50 text-blue-700 border-blue-200' },
  official: { label: 'Dinas Luar', bg: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
  unpaid: { label: 'Unpaid', bg: 'bg-rose-50 text-rose-700 border-rose-200' },
  other: { label: 'Lainnya', bg: 'bg-slate-50 text-slate-700 border-slate-200' }
};

export default function LeaveTypesSection({
  leaveTypes = [],
  loading = false,
  onRefresh,
  onOpenCreate,
  onOpenEdit,
  approvalProfiles = []
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [actionLoading, setActionLoading] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  const handleToggleActive = async (type) => {
    setActionLoading(type.id);
    try {
      await api.patch(`/kepegawaian/leave-types/${type.id}/active`, {
        is_active: !type.is_active
      });
      onRefresh();
    } catch (err) {
      console.error('Toggle status error:', err);
      alert(err.response?.data?.message || 'Gagal mengubah status jenis cuti');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (type) => {
    if (type.is_system) {
      alert('Jenis cuti bawaan sistem (is_system) tidak boleh dihapus.');
      return;
    }
    if (!window.confirm(`Apakah Anda yakin ingin menghapus jenis cuti "${type.name}"?`)) {
      return;
    }

    setActionLoading(type.id);
    try {
      const res = await api.delete(`/kepegawaian/leave-types/${type.id}`);
      if (res.data?.success) {
        onRefresh();
      }
    } catch (err) {
      console.error('Delete leave type error:', err);
      alert(err.response?.data?.message || 'Gagal menghapus jenis cuti');
    } finally {
      setActionLoading(null);
    }
  };

  const filteredTypes = leaveTypes.filter((t) => {
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      const matchName = t.name?.toLowerCase().includes(q);
      const matchCode = t.code?.toLowerCase().includes(q);
      const matchDesc = t.description?.toLowerCase().includes(q);
      if (!matchName && !matchCode && !matchDesc) return false;
    }
    if (categoryFilter !== 'all' && t.category !== categoryFilter) return false;
    if (statusFilter === 'active' && !t.is_active) return false;
    if (statusFilter === 'inactive' && t.is_active) return false;
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Top Toolbar */}
      <div className="p-3.5 bg-surface-container-lowest rounded-xl shadow-xs border border-outline-variant/20 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto flex-1">
          <div className="relative flex-1 sm:max-w-xs min-w-[200px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-outline" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari jenis cuti..."
              className="w-full h-9 pl-9 pr-3 rounded-lg bg-surface-container-low text-xs text-on-surface placeholder:text-outline border border-outline-variant/30 focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="h-9 px-3 rounded-lg bg-surface-container-low text-xs text-on-surface border border-outline-variant/30 focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer"
          >
            <option value="all">Semua Kategori</option>
            <option value="annual">Cuti Tahunan</option>
            <option value="special">Cuti Khusus</option>
            <option value="sick">Sakit</option>
            <option value="permit">Izin Pribadi</option>
            <option value="official">Dinas Luar</option>
            <option value="unpaid">Unpaid</option>
            <option value="other">Lainnya</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 px-3 rounded-lg bg-surface-container-low text-xs text-on-surface border border-outline-variant/30 focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer"
          >
            <option value="all">Semua Status</option>
            <option value="active">Status: Aktif</option>
            <option value="inactive">Status: Nonaktif</option>
          </select>
        </div>

        <button
          type="button"
          onClick={onOpenCreate}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-primary hover:bg-primary-container text-on-primary text-xs font-bold shadow-xs transition-all shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Jenis Cuti</span>
        </button>
      </div>

      {/* Main Table */}
      <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/20 shadow-xs overflow-hidden">
        <div className="px-4 py-3 bg-surface-container-low border-b border-outline-variant/15 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-on-surface">Daftar Regulasi Master Cuti & Izin</span>
            <span className="px-2 py-0.5 rounded-full bg-surface-container-high text-primary font-bold text-[11px]">
              {filteredTypes.length} Regulasi
            </span>
          </div>
          <div className="text-[11px] text-on-surface-variant flex items-center gap-3">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> Aktif
            </span>
            <span className="flex items-center gap-1">
              <Lock className="w-3 h-3 text-outline" /> Sistem Terkunci (7)
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-surface-container-low/60 border-b border-outline-variant/20 text-[11px] font-bold text-outline uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Jenis Cuti & Kode</th>
                <th className="py-3 px-3">Kategori</th>
                <th className="py-3 px-3 text-center">Hitung Hari</th>
                <th className="py-3 px-3 text-center">Potong Saldo</th>
                <th className="py-3 px-3">Batas Durasi</th>
                <th className="py-3 px-3">Lampiran</th>
                <th className="py-3 px-3">Profil Approval</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/10 text-on-surface">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-outline">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      <span>Memuat master jenis cuti...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredTypes.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-outline">
                    <AlertCircle className="w-8 h-8 text-outline mx-auto mb-2" />
                    <p className="font-semibold text-on-surface">Tidak ada jenis cuti ditemukan</p>
                    <p className="text-[11px]">Coba sesuaikan kata kunci pencarian atau filter kategori.</p>
                  </td>
                </tr>
              ) : (
                filteredTypes.map((item) => {
                  const catBadge = CATEGORY_BADGES[item.category] || CATEGORY_BADGES.other;
                  const profileName = approvalProfiles.find((p) => p.id === item.approval_profile_id)?.name || item.approval_profile_name || 'Standar HRD';

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-surface-container-low/50 transition-colors group"
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div
                            className="w-3 h-3 rounded-full shrink-0 shadow-2xs"
                            style={{ backgroundColor: item.color || '#006948' }}
                          />
                          <div>
                            <div className="font-bold text-on-surface flex items-center gap-1.5">
                              <span>{item.name}</span>
                              {Boolean(item.is_system) && (
                                <span title="Jenis cuti bawaan sistem">
                                  <Lock className="w-3 h-3 text-outline" />
                                </span>
                              )}
                            </div>
                            <div className="font-mono text-[11px] text-outline">{item.code}</div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        <span className={`inline-block px-2 py-0.5 rounded-md border text-[11px] font-semibold ${catBadge.bg}`}>
                          {catBadge.label}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-center">
                        <span className="font-medium">
                          {item.count_mode === 'calendar_days' ? (
                            <span className="text-amber-700 font-semibold">Kalender</span>
                          ) : (
                            <span className="text-slate-700">Hari Kerja</span>
                          )}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-center">
                        {item.deducts_balance ? (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold text-[11px] border border-emerald-200">
                            Ya (Potong)
                          </span>
                        ) : (
                          <span className="text-outline text-[11px]">Tidak</span>
                        )}
                      </td>

                      <td className="py-3 px-3">
                        <div className="font-medium text-on-surface">
                          {item.max_days_per_request ? `${item.max_days_per_request} hr/pengajuan` : 'Sesuai Kebutuhan'}
                        </div>
                        {item.max_occurrences_lifetime && (
                          <div className="text-[10px] text-amber-700 font-semibold">
                            Maks. {item.max_occurrences_lifetime}x seumur kerja
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-3 capitalize">
                        {item.attachment_rule === 'required' ? (
                          <span className="text-rose-700 font-semibold">Wajib Selalu</span>
                        ) : item.attachment_rule === 'required_after_days' ? (
                          <span className="text-amber-700 font-semibold">Wajib ≥ {item.attachment_required_after_days || 2} hr</span>
                        ) : item.attachment_rule === 'optional' ? (
                          <span className="text-outline">Opsional</span>
                        ) : (
                          <span className="text-outline">Tidak Perlu</span>
                        )}
                      </td>

                      <td className="py-3 px-3">
                        <span className="font-semibold text-primary">{profileName}</span>
                      </td>

                      <td className="py-3 px-3 text-center">
                        <button
                          type="button"
                          disabled={actionLoading === item.id}
                          onClick={() => handleToggleActive(item)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold transition-colors ${
                            item.is_active
                              ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                              : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                          }`}
                        >
                          {item.is_active ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                          <span>{item.is_active ? 'Aktif' : 'Nonaktif'}</span>
                        </button>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => onOpenEdit(item)}
                            className="p-1.5 rounded-lg text-outline hover:text-primary hover:bg-surface-container transition-colors"
                            title="Ubah Konfigurasi"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            disabled={Boolean(item.is_system) || actionLoading === item.id}
                            onClick={() => handleDelete(item)}
                            className={`p-1.5 rounded-lg transition-colors ${
                              item.is_system
                                ? 'text-outline/40 cursor-not-allowed'
                                : 'text-outline hover:text-error hover:bg-error-container/40'
                            }`}
                            title={item.is_system ? 'Jenis bawaan sistem tidak dapat dihapus' : 'Hapus Jenis Cuti'}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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
      </div>
    </div>
  );
}
