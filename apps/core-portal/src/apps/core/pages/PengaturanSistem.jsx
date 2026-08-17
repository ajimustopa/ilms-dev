import React, { useState, useEffect } from 'react';
import api from '../../../shared/services/api';
import {
  Settings,
  Plus,
  Edit2,
  Trash2,
  Search,
  X,
  Save,
  Globe,
  School,
  RefreshCw,
  Loader2,
  AlertCircle
} from 'lucide-react';

export default function PengaturanSistem() {
  const [settings, setSettings] = useState([]);
  const [schoolUnits, setSchoolUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [search, setSearch] = useState('');
  const [unitFilter, setUnitFilter] = useState('all');

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingSetting, setEditingSetting] = useState(null);

  const [formData, setFormData] = useState({
    school_unit_id: '',
    setting_key: '',
    setting_value: '',
    description: '',
  });

  const fetchSettingsAndUnits = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const [settingsRes, unitsRes] = await Promise.all([
        api.get('/core/system-settings', {
          params: {
            search: search || undefined,
            school_unit_id: unitFilter !== 'all' ? unitFilter : undefined,
          },
        }),
        api.get('/core/school-units'),
      ]);

      if (settingsRes.data?.success && settingsRes.data.data) {
        setSettings(settingsRes.data.data);
      }
      if (unitsRes.data?.success && unitsRes.data.data?.items) {
        setSchoolUnits(unitsRes.data.data.items);
      }
    } catch (err) {
      setErrorMsg(
        err.response?.data?.message ||
        (err.response?.data?.errors ? err.response.data.errors.join(', ') : null) ||
        'Gagal memuat data pengaturan sistem'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettingsAndUnits();
  }, [unitFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchSettingsAndUnits();
  };

  const handleOpenAdd = () => {
    setEditingSetting(null);
    setFormError('');
    setFormData({
      school_unit_id: '',
      setting_key: '',
      setting_value: '',
      description: '',
    });
    setShowModal(true);
  };

  const handleOpenEdit = (setting) => {
    setEditingSetting(setting);
    setFormError('');
    setFormData({
      school_unit_id: setting.school_unit_id ? String(setting.school_unit_id) : '',
      setting_key: setting.setting_key,
      setting_value: setting.setting_value || '',
      description: setting.description || '',
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError('');

    try {
      const unitId = formData.school_unit_id ? Number(formData.school_unit_id) : null;

      if (editingSetting) {
        await api.put(`/core/system-settings/${editingSetting.id}`, {
          setting_value: formData.setting_value,
          description: formData.description.trim() || null,
        });
      } else {
        await api.post('/core/system-settings', {
          school_unit_id: unitId,
          setting_key: formData.setting_key.trim(),
          setting_value: formData.setting_value,
          description: formData.description.trim() || null,
        });
      }

      setShowModal(false);
      fetchSettingsAndUnits();
    } catch (err) {
      setFormError(
        err.response?.data?.message ||
        (err.response?.data?.errors ? err.response.data.errors.join(', ') : null) ||
        'Gagal menyimpan pengaturan sistem'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (setting) => {
    if (confirm(`Apakah Anda yakin ingin menghapus pengaturan '${setting.setting_key}'?`)) {
      try {
        await api.delete(`/core/system-settings/${setting.id}`);
        fetchSettingsAndUnits();
      } catch (err) {
        alert(err.response?.data?.message || 'Gagal menghapus pengaturan sistem');
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Pengaturan Sistem (Site Settings)</h2>
          <p className="text-xs text-slate-500">
            Konfigurasi sistem global dan override khusus per Satuan Pendidikan.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchSettingsAndUnits}
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
            <span>Tambah Setting</span>
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

      {/* Filter Bar */}
      <form onSubmit={handleSearchSubmit} className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari berdasarkan setting key atau deskripsi..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
          />
        </div>

        <select
          value={unitFilter}
          onChange={(e) => setUnitFilter(e.target.value)}
          className="w-full sm:w-auto px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none"
        >
          <option value="all">Semua Scope</option>
          <option value="global">Global (Yayasan-Wide)</option>
          {schoolUnits.map((s) => (
            <option key={s.id} value={String(s.id)}>
              Override: {s.name}
            </option>
          ))}
        </select>

        <button
          type="submit"
          className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-semibold transition shrink-0"
        >
          Cari
        </button>
      </form>

      {/* Table Settings */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <table className="w-full text-left text-xs text-slate-600">
          <thead className="bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase border-b border-slate-200">
            <tr>
              <th className="px-5 py-3">Setting Key</th>
              <th className="px-5 py-3">Setting Value</th>
              <th className="px-5 py-3">Scope / Konteks</th>
              <th className="px-5 py-3">Deskripsi</th>
              <th className="px-5 py-3 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan="5" className="px-5 py-8 text-center text-slate-400">
                  <Loader2 className="w-5 h-5 animate-spin mx-auto text-emerald-600 mb-2" />
                  <span>Memuat pengaturan sistem...</span>
                </td>
              </tr>
            ) : settings.length === 0 ? (
              <tr>
                <td colSpan="5" className="px-5 py-8 text-center text-slate-400">
                  Tidak ada data pengaturan sistem yang cocok
                </td>
              </tr>
            ) : (
              settings.map((st) => {
                const school = schoolUnits.find((s) => s.id === st.school_unit_id);
                return (
                  <tr key={st.id} className="hover:bg-slate-50/80 transition">
                    <td className="px-5 py-3.5 font-mono font-semibold text-slate-800">
                      {st.setting_key}
                    </td>
                    <td className="px-5 py-3.5 font-mono text-emerald-700 font-medium">
                      {st.setting_value}
                    </td>
                    <td className="px-5 py-3.5">
                      {st.school_unit_id ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                          <School className="w-3 h-3" />
                          {school?.name || `Unit #${st.school_unit_id}`}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 text-slate-700">
                          <Globe className="w-3 h-3 text-slate-400" />
                          Global Yayasan
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-slate-500 max-w-xs">{st.description || '-'}</td>
                    <td className="px-5 py-3.5 text-right space-x-2">
                      <button
                        onClick={() => handleOpenEdit(st)}
                        className="text-xs font-semibold text-emerald-600 hover:text-emerald-700"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(st)}
                        className="text-xs font-semibold text-red-500 hover:text-red-700"
                      >
                        Hapus
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Add / Edit Setting */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-800">
                {editingSetting ? `Edit Setting: ${editingSetting.setting_key}` : 'Tambah Pengaturan Baru'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="mt-3 p-2.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5 mt-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Scope Satuan Pendidikan
                </label>
                <select
                  disabled={!!editingSetting}
                  value={formData.school_unit_id}
                  onChange={(e) => setFormData({ ...formData, school_unit_id: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 disabled:bg-slate-100 disabled:text-slate-400"
                >
                  <option value="">Global (Berlaku untuk Seluruh Yayasan)</option>
                  {schoolUnits.map((s) => (
                    <option key={s.id} value={String(s.id)}>
                      Override Khusus: {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Setting Key <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  disabled={!!editingSetting}
                  placeholder="mis. auth.jwt_access_expiry_minutes"
                  value={formData.setting_key}
                  onChange={(e) => setFormData({ ...formData, setting_key: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 disabled:bg-slate-100 disabled:text-slate-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Setting Value <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="mis. 15 atau true/false"
                  value={formData.setting_value}
                  onChange={(e) => setFormData({ ...formData, setting_value: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Deskripsi / Keterangan
                </label>
                <textarea
                  rows={2}
                  placeholder="Penjelasan fungsi konfigurasi ini"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
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
                  <span>Simpan Pengaturan</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
