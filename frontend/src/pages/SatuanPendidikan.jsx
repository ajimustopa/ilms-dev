import React, { useState, useEffect } from 'react';
import api from '../services/api';
import {
  School,
  Plus,
  Edit2,
  CheckCircle,
  XCircle,
  X,
  Save,
  Search,
  History,
  RefreshCw,
  Loader2,
  AlertCircle
} from 'lucide-react';

export default function SatuanPendidikan() {
  const [schools, setSchools] = useState([]);
  const [historyList, setHistoryList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [formError, setFormError] = useState('');

  const [search, setSearch] = useState('');
  const [levelFilter, setLevelFilter] = useState('all');

  // Modal States
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingSchool, setEditingSchool] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [showStatusModal, setShowStatusModal] = useState(false);
  const [targetSchool, setTargetSchool] = useState(null);
  const [statusReason, setStatusReason] = useState('');

  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Form State for Add / Edit
  const [formData, setFormData] = useState({
    name: '',
    level: 'SMA',
    npsn: '',
    address: '',
    principal_name: '',
    phone_number: '',
    email: '',
    website: '',
    operating_license: '',
  });

  const fetchSchools = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await api.get('/school-units', {
        params: {
          search: search || undefined,
          level: levelFilter !== 'all' ? levelFilter : undefined,
        },
      });

      if (res.data?.success && res.data.data) {
        setSchools(res.data.data.items || []);
      }
    } catch (err) {
      setErrorMsg(
        err.response?.data?.message ||
        (err.response?.data?.errors ? err.response.data.errors.join(', ') : null) ||
        'Gagal memuat data satuan pendidikan'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchools();
  }, [levelFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchSchools();
  };

  const handleOpenAdd = () => {
    setEditingSchool(null);
    setFormError('');
    setFormData({
      name: '',
      level: 'SMA',
      npsn: '',
      address: '',
      principal_name: '',
      phone_number: '',
      email: '',
      website: '',
      operating_license: '',
    });
    setShowFormModal(true);
  };

  const handleOpenEdit = (school) => {
    setEditingSchool(school);
    setFormError('');
    setFormData({
      name: school.name,
      level: school.level,
      npsn: school.npsn || '',
      address: school.address || '',
      principal_name: school.principal_name || '',
      phone_number: school.phone_number || '',
      email: school.email || '',
      website: school.website || '',
      operating_license: school.operating_license || '',
    });
    setShowFormModal(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError('');

    try {
      const payload = {
        name: formData.name.trim(),
        level: formData.level,
        npsn: formData.npsn ? formData.npsn.trim() : null,
        address: formData.address ? formData.address.trim() : null,
        principal_name: formData.principal_name ? formData.principal_name.trim() : null,
        phone_number: formData.phone_number ? formData.phone_number.trim() : null,
        email: formData.email ? formData.email.trim() : null,
        website: formData.website ? formData.website.trim() : null,
        operating_license: formData.operating_license ? formData.operating_license.trim() : null,
      };

      if (editingSchool) {
        await api.put(`/school-units/${editingSchool.id}`, payload);
      } else {
        await api.post('/school-units', payload);
      }

      setShowFormModal(false);
      fetchSchools();
    } catch (err) {
      setFormError(
        err.response?.data?.message ||
        (err.response?.data?.errors ? err.response.data.errors.join(', ') : null) ||
        'Gagal menyimpan data satuan pendidikan'
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Open Status Toggle Modal
  const handleOpenStatusToggle = (school) => {
    setTargetSchool(school);
    setStatusReason('');
    setFormError('');
    setShowStatusModal(true);
  };

  // Submit Status Change with Reason
  const handleStatusSubmit = async (e) => {
    e.preventDefault();
    if (!targetSchool) return;

    setSubmitting(true);
    setFormError('');

    try {
      const nextStatus = !targetSchool.is_active;
      await api.patch(`/school-units/${targetSchool.id}/status`, {
        is_active: nextStatus,
        reason: statusReason.trim() || 'Perubahan status operasional oleh admin',
      });

      setShowStatusModal(false);
      setTargetSchool(null);
      fetchSchools();
    } catch (err) {
      setFormError(
        err.response?.data?.message ||
        (err.response?.data?.errors ? err.response.data.errors.join(', ') : null) ||
        'Gagal mengubah status operasional'
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Open Status History Modal
  const handleOpenHistory = async () => {
    setShowHistoryModal(true);
    setHistoryLoading(true);
    try {
      const res = await api.get('/school-units/1/status-history');
      if (res.data?.success && res.data.data) {
        setHistoryList(res.data.data);
      }
    } catch (err) {
      console.warn('Gagal memuat riwayat status:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Master Satuan Pendidikan</h2>
          <p className="text-xs text-slate-500">
            Daftar unit sekolah TK, SD, SMP, SMA di bawah naungan Yayasan.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleOpenHistory}
            className="flex items-center gap-1.5 px-3.5 py-2 border border-slate-200 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition"
          >
            <History className="w-4 h-4 text-slate-500" />
            <span>Riwayat Status</span>
          </button>
          <button
            onClick={fetchSchools}
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
            <span>Tambah Sekolah</span>
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
            placeholder="Cari berdasarkan nama sekolah atau NPSN..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
          />
        </div>

        <select
          value={levelFilter}
          onChange={(e) => setLevelFilter(e.target.value)}
          className="w-full sm:w-auto px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none"
        >
          <option value="all">Semua Jenjang</option>
          <option value="TK">Jenjang TK</option>
          <option value="SD">Jenjang SD</option>
          <option value="SMP">Jenjang SMP</option>
          <option value="SMA">Jenjang SMA</option>
          <option value="SMK">Jenjang SMK</option>
        </select>

        <button
          type="submit"
          className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-semibold transition shrink-0"
        >
          Cari
        </button>
      </form>

      {/* Grid of School Units */}
      {loading ? (
        <div className="py-12 text-center text-slate-400">
          <Loader2 className="w-6 h-6 animate-spin mx-auto text-emerald-600 mb-2" />
          <span className="text-xs">Memuat data satuan pendidikan...</span>
        </div>
      ) : schools.length === 0 ? (
        <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-slate-400 text-xs">
          Tidak ada satuan pendidikan ditemukan
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {schools.map((school) => (
            <div
              key={school.id}
              className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between hover:border-slate-300 transition"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div>
                    <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase tracking-wide">
                      Jenjang {school.level}
                    </span>
                    <h3 className="text-base font-bold text-slate-800 mt-2">{school.name}</h3>
                    <p className="text-xs text-slate-400 font-mono">NPSN: {school.npsn || 'Belum terdata'}</p>
                  </div>

                  <button
                    onClick={() => handleOpenStatusToggle(school)}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold cursor-pointer transition ${
                      school.is_active
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                        : 'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100'
                    }`}
                    title="Klik untuk ubah status operasional"
                  >
                    {school.is_active ? (
                      <>
                        <CheckCircle className="w-3 h-3" />
                        <span>Aktif</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="w-3 h-3" />
                        <span>Nonaktif</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Info Details */}
                <div className="mt-4 space-y-2 text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Kepala Sekolah:</span>
                    <span className="font-semibold text-slate-700">{school.principal_name || '-'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Kontak Telepon:</span>
                    <span>{school.phone_number || '-'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Email:</span>
                    <span>{school.email || '-'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Izin Operasional:</span>
                    <span className="font-mono text-[11px]">{school.operating_license || '-'}</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] text-slate-400 truncate max-w-[200px]">
                  {school.address || 'Alamat belum diinput'}
                </span>
                <button
                  onClick={() => handleOpenEdit(school)}
                  className="flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:text-emerald-700"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Edit Profil</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Add / Edit Satuan Pendidikan */}
      {showFormModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-800">
                {editingSchool ? `Edit Sekolah: ${editingSchool.name}` : 'Tambah Satuan Pendidikan Baru'}
              </h3>
              <button
                onClick={() => setShowFormModal(false)}
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

            <form onSubmit={handleFormSubmit} className="space-y-3.5 mt-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nama Satuan Pendidikan <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="mis. SMA Al-Depok Boarding School"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Jenjang Pendidikan <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.level}
                    onChange={(e) => setFormData({ ...formData, level: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  >
                    <option value="TK">TK / PAUD</option>
                    <option value="SD">SD (Sekolah Dasar)</option>
                    <option value="SMP">SMP (Menengah Pertama)</option>
                    <option value="SMA">SMA (Menengah Atas)</option>
                    <option value="SMK">SMK (Kejuruan)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nomor Pokok Sekolah (NPSN)
                  </label>
                  <input
                    type="text"
                    placeholder="mis. 20268901"
                    value={formData.npsn}
                    onChange={(e) => setFormData({ ...formData, npsn: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nama Kepala Sekolah
                  </label>
                  <input
                    type="text"
                    placeholder="Nama Lengkap & Gelar"
                    value={formData.principal_name}
                    onChange={(e) => setFormData({ ...formData, principal_name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nomor Izin Operasional
                  </label>
                  <input
                    type="text"
                    placeholder="SK Izin Operasional"
                    value={formData.operating_license}
                    onChange={(e) => setFormData({ ...formData, operating_license: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Kontak Telepon
                  </label>
                  <input
                    type="text"
                    placeholder="021-..."
                    value={formData.phone_number}
                    onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Email Satuan
                  </label>
                  <input
                    type="email"
                    placeholder="sekolah@aldeposibs.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Alamat Lengkap Sekolah
                </label>
                <textarea
                  rows={2}
                  placeholder="Jl. ..."
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowFormModal(false)}
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
                  <span>Simpan Data</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Ubah Status Operasional (Wajib Rekam Alasan) */}
      {showStatusModal && targetSchool && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-800">Ubah Status Operasional</h3>
              <button
                onClick={() => setShowStatusModal(false)}
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

            <form onSubmit={handleStatusSubmit} className="space-y-3.5 mt-4">
              <p className="text-xs text-slate-600">
                Ubah status <strong>{targetSchool.name}</strong> menjadi{' '}
                <span className={`font-bold ${targetSchool.is_active ? 'text-red-600' : 'text-emerald-600'}`}>
                  {targetSchool.is_active ? 'NONAKTIF' : 'AKTIF'}
                </span>.
              </p>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Alasan Perubahan Status <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Jelaskan alasan perubahan status (mis. Renovasi gedung, pembukaan tahun ajaran baru, dsb.)"
                  value={statusReason}
                  onChange={(e) => setStatusReason(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowStatusModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 disabled:opacity-50"
                >
                  {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  <span>Konfirmasi Status</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Riwayat Status Satuan Pendidikan */}
      {showHistoryModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-800">Riwayat Status Satuan Pendidikan</h3>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 max-h-72 overflow-y-auto space-y-3">
              {historyLoading ? (
                <div className="py-6 text-center text-slate-400 text-xs">
                  <Loader2 className="w-5 h-5 animate-spin mx-auto text-emerald-600 mb-1" />
                  <span>Memuat riwayat...</span>
                </div>
              ) : historyList.length === 0 ? (
                <p className="text-center py-6 text-slate-400 text-xs">Belum ada riwayat perubahan status tercatat</p>
              ) : (
                historyList.map((h) => (
                  <div key={h.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800">{h.school_name || `Unit #${h.school_unit_id}`}</span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          h.new_status ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {h.new_status ? 'Diaktifkan' : 'Dinonaktifkan'}
                      </span>
                    </div>
                    <p className="text-slate-600">{h.reason}</p>
                    <div className="text-[10px] text-slate-400 flex items-center justify-between pt-1">
                      <span>Oleh: {h.changed_by_name}</span>
                      <span>{new Date(h.changed_at).toLocaleString('id-ID')}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
