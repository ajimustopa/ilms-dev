import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Tag,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  RefreshCw,
  Search,
  X,
  Users,
  Layers,
  ArrowUpDown,
  Filter,
  Info
} from 'lucide-react';
import api from '../../../shared/services/api';

export default function MasterStatusKepegawaian() {
  const [statuses, setStatuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Filter & Search
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterActive, setFilterActive] = useState('');

  // Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState(null);
  const [formSubmitting, setFormSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    category: 'umum',
    description: '',
    sort_order: 0,
    is_active: true
  });

  const fetchStatuses = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      let queryParams = '';
      const params = [];
      if (search) params.push(`search=${encodeURIComponent(search)}`);
      if (filterCategory) params.push(`category=${filterCategory}`);
      if (filterActive !== '') params.push(`is_active=${filterActive}`);
      if (params.length > 0) queryParams = `?${params.join('&')}`;

      const res = await api.get(`/kepegawaian/employment-statuses${queryParams}`);
      if (res.data?.success) {
        setStatuses(res.data.data || []);
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Gagal memuat daftar status kepegawaian');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatuses();
  }, [filterCategory, filterActive]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchStatuses();
  };

  const openCreateModal = () => {
    setFormData({
      code: '',
      name: '',
      category: 'umum',
      description: '',
      sort_order: statuses.length + 1,
      is_active: true
    });
    setErrorMsg('');
    setSuccessMsg('');
    setIsCreateModalOpen(true);
  };

  const openEditModal = (item) => {
    setSelectedStatus(item);
    setFormData({
      code: item.code,
      name: item.name,
      category: item.category || 'umum',
      description: item.description || '',
      sort_order: item.sort_order || 0,
      is_active: item.is_active
    });
    setErrorMsg('');
    setSuccessMsg('');
    setIsEditModalOpen(true);
  };

  const openDeleteModal = (item) => {
    setSelectedStatus(item);
    setErrorMsg('');
    setSuccessMsg('');
    setIsDeleteModalOpen(true);
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setFormSubmitting(true);
    setErrorMsg('');
    try {
      const res = await api.post('/kepegawaian/employment-statuses', formData);
      if (res.data?.success) {
        setSuccessMsg(`Status kepegawaian '${formData.name}' berhasil ditambahkan.`);
        setIsCreateModalOpen(false);
        fetchStatuses();
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Gagal menambahkan status kepegawaian');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!selectedStatus) return;
    setFormSubmitting(true);
    setErrorMsg('');
    try {
      const res = await api.put(`/kepegawaian/employment-statuses/${selectedStatus.id}`, formData);
      if (res.data?.success) {
        setSuccessMsg(`Status kepegawaian '${formData.name}' berhasil diperbarui.`);
        setIsEditModalOpen(false);
        fetchStatuses();
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Gagal memperbarui status kepegawaian');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDeleteSubmit = async () => {
    if (!selectedStatus) return;
    setFormSubmitting(true);
    setErrorMsg('');
    try {
      const res = await api.delete(`/kepegawaian/employment-statuses/${selectedStatus.id}`);
      if (res.data?.success) {
        setSuccessMsg(`Status '${selectedStatus.name}' berhasil dihapus.`);
        setIsDeleteModalOpen(false);
        fetchStatuses();
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Gagal menghapus status kepegawaian');
    } finally {
      setFormSubmitting(false);
    }
  };

  const toggleStatusActive = async (item) => {
    try {
      await api.put(`/kepegawaian/employment-statuses/${item.id}`, {
        is_active: !item.is_active
      });
      fetchStatuses();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Gagal mengubah status aktif');
    }
  };

  // Statistik Ringkas
  const totalStatuses = statuses.length;
  const activeStatuses = statuses.filter((s) => s.is_active).length;
  const totalEmployeesCount = statuses.reduce((acc, curr) => acc + (curr.employee_count || 0), 0);

  return (
    <div className="space-y-6 pb-12">
      {/* Header & Breadcrumb */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-indigo-600 mb-1">
            <Tag className="w-3.5 h-3.5" />
            <span>Master Data Kepegawaian</span>
          </div>
          <h1 className="text-xl font-bold text-slate-800 tracking-tight">
            Master Status Kepegawaian
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Konfigurasi jenis status hubungan kerja & kepegawaian (PNS, GTT, PTT, GTY, Kontrak, dll) secara dinamis
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/kepegawaian/employees"
            className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition shadow-2xs"
          >
            ← Kembali ke Data Pegawai
          </Link>
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition shadow-xs hover:shadow-md"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Status Baru</span>
          </button>
        </div>
      </div>

      {/* Alert Notifications */}
      {errorMsg && (
        <div className="flex items-center justify-between p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg('')} className="text-rose-400 hover:text-rose-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {successMsg && (
        <div className="flex items-center justify-between p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-xs animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg('')} className="text-emerald-400 hover:text-emerald-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
            <Tag className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-medium text-slate-400">Total Status Dikonfigurasi</div>
            <div className="text-xl font-bold text-slate-800">{totalStatuses}</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-medium text-slate-400">Status Aktif Dipakai</div>
            <div className="text-xl font-bold text-slate-800">{activeStatuses} <span className="text-xs font-normal text-slate-400">/ {totalStatuses}</span></div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-medium text-slate-400">Total Pegawai Terikat</div>
            <div className="text-xl font-bold text-slate-800">{totalEmployeesCount}</div>
          </div>
        </div>
      </div>

      {/* Filter & Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari nama status, kode, atau keterangan..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
          />
        </form>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Filter className="w-3.5 h-3.5" />
            <span>Kategori:</span>
          </div>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="py-1.5 px-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-700"
          >
            <option value="">Semua Kategori</option>
            <option value="guru">Guru (Pendidik)</option>
            <option value="tendik">Tenaga Kependidikan</option>
            <option value="umum">Umum</option>
          </select>

          <select
            value={filterActive}
            onChange={(e) => setFilterActive(e.target.value)}
            className="py-1.5 px-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-700"
          >
            <option value="">Semua Status</option>
            <option value="true">Hanya Aktif</option>
            <option value="false">Nonaktif</option>
          </select>

          <button
            onClick={fetchStatuses}
            className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition"
            title="Refresh Data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-100 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                <th className="py-3.5 px-4 w-16 text-center">Urutan</th>
                <th className="py-3.5 px-4">Kode Status</th>
                <th className="py-3.5 px-4">Nama Status Kepegawaian</th>
                <th className="py-3.5 px-4">Kategori</th>
                <th className="py-3.5 px-4">Keterangan</th>
                <th className="py-3.5 px-4 text-center">Pegawai Terkait</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-indigo-600 mb-2" />
                    <span>Memuat master status kepegawaian...</span>
                  </td>
                </tr>
              ) : statuses.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-slate-400">
                    <Tag className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                    <p className="font-semibold text-slate-600">Belum ada status kepegawaian yang sesuai</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Klik tombol "Tambah Status Baru" untuk menambahkan opsi status.</p>
                  </td>
                </tr>
              ) : (
                statuses.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3 px-4 text-center font-bold text-slate-400">
                      #{item.sort_order}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2.5 py-1 rounded-md text-[10px] font-mono font-bold uppercase tracking-wider bg-slate-100 text-slate-800 border border-slate-200">
                        {item.code}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-800">{item.name}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold capitalize ${
                        item.category === 'guru'
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : item.category === 'tendik'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-slate-100 text-slate-700 border border-slate-200'
                      }`}>
                        {item.category || 'Umum'}
                      </span>
                    </td>
                    <td className="py-3 px-4 max-w-xs text-slate-500 truncate" title={item.description || '-'}>
                      {item.description || '-'}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700">
                        <Users className="w-3 h-3" />
                        {item.employee_count || 0}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => toggleStatusActive(item)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold transition cursor-pointer ${
                          item.is_active
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                            : 'bg-slate-100 text-slate-400 border border-slate-200 hover:bg-slate-200'
                        }`}
                        title="Klik untuk ubah aktif/nonaktif"
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${item.is_active ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                        {item.is_active ? 'Aktif' : 'Nonaktif'}
                      </button>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openEditModal(item)}
                          className="p-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 transition"
                          title="Edit Status"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => openDeleteModal(item)}
                          className="p-1.5 rounded-lg bg-slate-100 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition"
                          title="Hapus Status"
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
      </div>

      {/* Modal Tambah Status */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 border border-slate-100 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
                  <Plus className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-slate-800">Tambah Status Kepegawaian</h3>
              </div>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Kode Status * (Unik, mis. pns, gtt, tetap_yayasan)</label>
                <input
                  type="text"
                  required
                  placeholder="mis. pns, gty, kontrak_1"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 font-mono text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nama Status Kepegawaian *</label>
                <input
                  type="text"
                  required
                  placeholder="mis. Guru Tetap Yayasan (GTY)"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Kategori</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="umum">Umum</option>
                    <option value="guru">Guru (Pendidik)</option>
                    <option value="tendik">Tenaga Kependidikan</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Urutan Tampil</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.sort_order}
                    onChange={(e) => setFormData({ ...formData, sort_order: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Keterangan / Deskripsi</label>
                <textarea
                  rows="2"
                  placeholder="Catatan atau penjelasan mengenai status kepegawaian ini..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="create_is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="create_is_active" className="text-xs font-semibold text-slate-700 cursor-pointer">
                  Aktifkan status ini (Dapat dipilih saat input data pegawai)
                </label>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl font-semibold hover:bg-slate-200 transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition disabled:opacity-50"
                >
                  {formSubmitting ? 'Menyimpan...' : 'Simpan Status'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Edit Status */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 border border-slate-100 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
                  <Edit2 className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-slate-800">Edit Status Kepegawaian</h3>
              </div>
              <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Kode Status * (Unik)</label>
                <input
                  type="text"
                  required
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 font-mono text-xs"
                />
                <p className="text-[10px] text-slate-400 mt-1">Perubahan kode otomatis diperbarui pada seluruh data pegawai yang terikat.</p>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nama Status Kepegawaian *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Kategori</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="umum">Umum</option>
                    <option value="guru">Guru (Pendidik)</option>
                    <option value="tendik">Tenaga Kependidikan</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Urutan Tampil</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.sort_order}
                    onChange={(e) => setFormData({ ...formData, sort_order: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Keterangan / Deskripsi</label>
                <textarea
                  rows="2"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="edit_is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="edit_is_active" className="text-xs font-semibold text-slate-700 cursor-pointer">
                  Aktifkan status ini
                </label>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl font-semibold hover:bg-slate-200 transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition disabled:opacity-50"
                >
                  {formSubmitting ? 'Menyimpan...' : 'Perbarui Status'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Hapus Status */}
      {isDeleteModalOpen && selectedStatus && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 border border-slate-100 animate-in fade-in zoom-in-95 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-800 mb-2">Hapus Status Kepegawaian?</h3>
            <p className="text-xs text-slate-500 mb-4">
              Apakah Anda yakin ingin menghapus status <strong className="text-slate-700">'{selectedStatus.name}'</strong> ({selectedStatus.code})?
            </p>

            {selectedStatus.employee_count > 0 && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-800 mb-4 text-left flex items-start gap-2">
                <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  Perhatian: Status ini masih dipakai oleh <strong>{selectedStatus.employee_count} pegawai</strong>. Sistem akan mencegah penghapusan jika masih ada data aktif yang menggunakannya. Anda disarankan menonaktifkannya saja.
                </span>
              </div>
            )}

            <div className="flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-200 transition"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleDeleteSubmit}
                disabled={formSubmitting}
                className="px-4 py-2 bg-rose-600 text-white rounded-xl text-xs font-semibold hover:bg-rose-700 transition disabled:opacity-50"
              >
                {formSubmitting ? 'Menghapus...' : 'Ya, Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
