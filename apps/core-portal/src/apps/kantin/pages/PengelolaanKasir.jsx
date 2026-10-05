import React, { useState, useEffect, useMemo } from 'react';
import api from '../../../shared/services/api';
import { useAuth } from '../../../shared/store/AuthContext';
import StatusPill from '../../../shared/components/StatusPill';
import FlatAlertBanner from '../../../shared/components/FlatAlertBanner';
import { formatCurrency, formatDate } from '../../../shared/utils/formatters';
import {
  Users,
  UserPlus,
  Search,
  Loader2,
  ShieldCheck,
  ShieldAlert,
  Edit,
  Trash2,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  X,
  Copy,
  Check,
  Building2,
  School,
  Lock,
  Eye,
  EyeOff,
  ShoppingCart,
  Receipt,
  UserCheck,
  UserX,
  Sparkles,
  RefreshCw
} from 'lucide-react';

export default function PengelolaanKasir() {
  const { schoolUnits: contextSchoolUnits } = useAuth();
  const [cashiers, setCashiers] = useState([]);
  const [schoolUnits, setSchoolUnits] = useState(() => Array.isArray(contextSchoolUnits) ? contextSchoolUnits : []);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'active' | 'inactive'
  const [unitFilter, setUnitFilter] = useState('all');

  // Modals state
  const [modalOpen, setModalOpen] = useState(false); // Create / Edit modal
  const [modalMode, setModalMode] = useState('create'); // 'create' | 'edit'
  const [selectedCashier, setSelectedCashier] = useState(null);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);
  const [bannerAlert, setBannerAlert] = useState(null);

  // Modal Info Kredensial Baru (Pop-up setelah buat kasir / reset password)
  const [credentialSuccessModal, setCredentialSuccessModal] = useState(null);
  const [copiedCredential, setCopiedCredential] = useState(false);

  // Form Fields
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [schoolUnitId, setSchoolUnitId] = useState('');
  const [status, setStatus] = useState('active');
  const [showPassword, setShowPassword] = useState(true);
  const [copiedPassword, setCopiedPassword] = useState(false);

  // Delete modal confirmation
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [resCashiers, resUnits] = await Promise.all([
        api.get('/kantin/cashiers').catch(() => ({ data: { data: [] } })),
        api.get('/core/school-units').catch(() => ({ data: { data: [] } }))
      ]);

      const cashierData = resCashiers.data?.data;
      setCashiers(Array.isArray(cashierData) ? cashierData : (Array.isArray(cashierData?.items) ? cashierData.items : []));

      const rawUnits = resUnits.data?.data;
      const unitsList = Array.isArray(rawUnits)
        ? rawUnits
        : (Array.isArray(rawUnits?.items)
            ? rawUnits.items
            : (Array.isArray(rawUnits?.data)
                ? rawUnits.data
                : []));

      if (unitsList.length > 0) {
        setSchoolUnits(unitsList);
      } else if (Array.isArray(contextSchoolUnits) && contextSchoolUnits.length > 0) {
        setSchoolUnits(contextSchoolUnits);
      }
    } catch (err) {
      console.error('Error fetching cashiers data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (Array.isArray(contextSchoolUnits) && contextSchoolUnits.length > 0 && schoolUnits.length === 0) {
      setSchoolUnits(contextSchoolUnits);
    }
    fetchData();
  }, [contextSchoolUnits]);

  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
    let res = 'Kasir';
    for (let i = 0; i < 4; i++) {
      res += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(res);
  };

  const handleCopyPassword = () => {
    if (!password) return;
    navigator.clipboard.writeText(password);
    setCopiedPassword(true);
    setTimeout(() => setCopiedPassword(false), 2000);
  };

  const handleOpenCreateModal = () => {
    setModalMode('create');
    setSelectedCashier(null);
    setFullName('');
    setUsername('');
    setPassword('kasir123');
    setSchoolUnitId('');
    setStatus('active');
    setFormError(null);
    setShowPassword(true);
    setModalOpen(true);
  };

  const handleOpenEditModal = (cashier, focusPassword = false) => {
    setModalMode('edit');
    setSelectedCashier(cashier);
    setFullName(cashier.full_name || '');
    setUsername(cashier.username || '');
    setPassword(focusPassword ? 'kasir123' : '');
    setSchoolUnitId(cashier.school_unit_id ? String(cashier.school_unit_id) : '');
    setStatus(cashier.status || 'active');
    setFormError(null);
    setShowPassword(true);
    setModalOpen(true);
  };

  const handleSaveForm = async (e) => {
    e.preventDefault();
    setFormError(null);

    if (!fullName.trim()) {
      setFormError('Nama lengkap kasir wajib diisi');
      return;
    }

    if (modalMode === 'create') {
      if (!username.trim() || username.trim().length < 3) {
        setFormError('Username minimal 3 karakter');
        return;
      }
      if (!password || password.length < 6) {
        setFormError('Password minimal 6 karakter');
        return;
      }
    } else if (password && password.length < 6) {
      setFormError('Jika ingin mereset password, minimal 6 karakter');
      return;
    }

    setFormSubmitting(true);
    try {
      const payload = {
        full_name: fullName.trim(),
        school_unit_id: schoolUnitId ? Number(schoolUnitId) : null,
        status
      };

      const savedPassword = password;

      if (modalMode === 'create') {
        payload.username = username.trim().toLowerCase();
        payload.password = password;
        const res = await api.post('/kantin/cashiers', payload);
        const createdUser = res.data?.data;
        
        setCredentialSuccessModal({
          fullName: createdUser?.full_name || fullName,
          username: createdUser?.username || username.trim().toLowerCase(),
          password: savedPassword,
          isNew: true
        });

        setBannerAlert({
          type: 'success',
          message: `Akun kasir "${createdUser?.full_name || fullName}" (@${payload.username}) berhasil dibuat dengan password yang ditentukan.`
        });
      } else {
        if (password) {
          payload.password = password;
        }
        await api.put(`/kantin/cashiers/${selectedCashier.id}`, payload);

        if (savedPassword) {
          setCredentialSuccessModal({
            fullName: fullName,
            username: username,
            password: savedPassword,
            isNew: false
          });
        }

        setBannerAlert({
          type: 'success',
          message: `Data akun kasir "${fullName}" berhasil diperbarui${savedPassword ? ' dan password berhasil direset.' : '.'}`
        });
      }

      setModalOpen(false);
      fetchData();
    } catch (err) {
      setFormError(err.response?.data?.message || err.message || 'Gagal menyimpan data akun kasir');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleToggleStatus = async (cashier) => {
    const nextStatus = cashier.status === 'active' ? 'inactive' : 'active';
    try {
      await api.patch(`/kantin/cashiers/${cashier.id}/status`, { status: nextStatus });
      setBannerAlert({
        type: 'success',
        message: `Status kasir "${cashier.full_name}" diubah menjadi ${nextStatus === 'active' ? 'Aktif' : 'Non-Aktif'}.`
      });
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal mengubah status kasir');
    }
  };

  const handleDeleteCashier = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await api.delete(`/kantin/cashiers/${deleteTarget.id}`);
      setBannerAlert({
        type: 'success',
        message: res.data?.message || 'Akun kasir berhasil diproses.'
      });
      setDeleteTarget(null);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menghapus akun kasir');
    } finally {
      setDeleting(false);
    }
  };

  // Statistik Ringkas
  const stats = useMemo(() => {
    const list = Array.isArray(cashiers) ? cashiers : [];
    const total = list.length;
    const active = list.filter(c => c.status === 'active').length;
    const inactive = total - active;
    const totalSales = list.reduce((sum, c) => sum + (Number(c.total_sales_amount) || 0), 0);
    return { total, active, inactive, totalSales };
  }, [cashiers]);

  // Filter List
  const filteredCashiers = useMemo(() => {
    const list = Array.isArray(cashiers) ? cashiers : [];
    return list.filter(c => {
      if (statusFilter !== 'all' && c.status !== statusFilter) return false;
      if (unitFilter !== 'all') {
        if (unitFilter === 'yayasan' && c.school_unit_id !== null) return false;
        if (unitFilter !== 'yayasan' && String(c.school_unit_id) !== String(unitFilter)) return false;
      }
      if (!search.trim()) return true;
      const term = search.toLowerCase().trim();
      return (
        c.full_name?.toLowerCase().includes(term) ||
        c.username?.toLowerCase().includes(term) ||
        c.school_name?.toLowerCase().includes(term)
      );
    });
  }, [cashiers, statusFilter, unitFilter, search]);

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800 tracking-tight flex items-center gap-2.5">
            <span>Pengelolaan Akun Kasir POS</span>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-300 text-emerald-800 font-semibold text-xs">
              <ShoppingCart className="w-3 h-3 text-emerald-600" />
              <span>Akses Khusus POS Penjualan</span>
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Kelola akun staf kasir kantin dengan hak akses terbatas (hanya dapat melayani transaksi kasir POS tanpa akses ke modul keuangan &amp; inventori)
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Tambah Akun Kasir</span>
          </button>
        </div>
      </div>

      {bannerAlert && (
        <FlatAlertBanner
          type={bannerAlert.type}
          message={bannerAlert.message}
          onClose={() => setBannerAlert(null)}
        />
      )}

      {/* Ringkasan Statistik Kasir */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-medium">Total Akun Kasir</span>
            <Users className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-lg font-bold text-slate-800 mt-1">{stats.total}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Terdaftar di sistem</p>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-medium">Kasir Aktif</span>
            <UserCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-lg font-bold text-emerald-700 mt-1">{stats.active}</p>
          <p className="text-[11px] text-emerald-600 font-medium mt-0.5">Bisa login ke Kasir POS</p>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-medium">Kasir Non-Aktif</span>
            <UserX className="w-4 h-4 text-slate-400" />
          </div>
          <p className="text-lg font-bold text-slate-600 mt-1">{stats.inactive}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Akses dinon-aktifkan</p>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-medium">Total Penjualan Kasir</span>
            <Receipt className="w-4 h-4 text-indigo-600" />
          </div>
          <p className="text-lg font-extrabold text-indigo-700 mt-1 font-mono">
            {formatCurrency(stats.totalSales)}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">Akumulasi seluruh kasir</p>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex flex-1 flex-wrap items-center gap-2.5">
          <div className="relative min-w-[240px] flex-1 max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama kasir, username, unit..."
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:border-emerald-500 font-medium"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 cursor-pointer focus:outline-hidden focus:border-emerald-500"
          >
            <option value="all">Semua Status</option>
            <option value="active">Kasir Aktif</option>
            <option value="inactive">Kasir Non-Aktif</option>
          </select>

          {/* Unit Filter */}
          <select
            value={unitFilter}
            onChange={(e) => setUnitFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 cursor-pointer focus:outline-hidden focus:border-emerald-500"
          >
            <option value="all">Semua Satuan Pendidikan</option>
            <option value="yayasan">Pusat Yayasan (Gabungan)</option>
            {(Array.isArray(schoolUnits) ? schoolUnits : []).map(u => (
              <option key={u.id} value={String(u.id)}>{u.name}</option>
            ))}
          </select>
        </div>

        <div className="text-xs text-slate-400 font-medium whitespace-nowrap">
          Menampilkan <strong className="text-slate-700">{filteredCashiers.length}</strong> Kasir
        </div>
      </div>

      {/* Tabel Data Kasir */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-6 h-6 text-emerald-600 animate-spin" />
            <p className="text-xs text-slate-400">Memuat daftar akun kasir...</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Nama &amp; Username Kasir</th>
                  <th className="px-4 py-3">Satuan Pendidikan / Unit</th>
                  <th className="px-4 py-3">Hak Wewenang</th>
                  <th className="px-4 py-3">Statistik Transaksi</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Terakhir Login</th>
                  <th className="px-4 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCashiers.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/60 transition">
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-bold text-slate-800 text-[13px]">{c.full_name}</p>
                        <p className="font-mono text-[11px] text-slate-500">@{c.username}</p>
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 text-slate-700">
                        {c.school_unit_id ? (
                          <School className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        ) : (
                          <Building2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        )}
                        <span className="font-medium">{c.school_name}</span>
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-indigo-50 border border-indigo-200/80 text-indigo-700 font-bold text-[10px]">
                        <ShoppingCart className="w-3 h-3 text-indigo-500" />
                        <span>Hanya Kasir POS</span>
                      </span>
                    </td>

                    <td className="px-4 py-3">
                      <div className="font-mono text-[11px]">
                        <p className="font-bold text-slate-800">{c.total_transactions} Transaksi</p>
                        <p className="text-emerald-700 font-semibold">{formatCurrency(c.total_sales_amount)}</p>
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(c)}
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold transition cursor-pointer ${
                          c.status === 'active'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                            : 'bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200'
                        }`}
                        title="Klik untuk mengubah status aktif/non-aktif"
                      >
                        {c.status === 'active' ? 'Aktif' : 'Non-Aktif'}
                      </button>
                    </td>

                    <td className="px-4 py-3 text-slate-500 text-[11px]">
                      {c.last_login_at ? formatDate(c.last_login_at) : <span className="text-slate-400 italic">Belum pernah login</span>}
                    </td>

                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(c, true)}
                          className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 hover:text-amber-800 rounded-lg text-xs font-semibold transition flex items-center gap-1 cursor-pointer"
                          title="Reset password akun kasir"
                        >
                          <KeyRound className="w-3.5 h-3.5" />
                          <span>Reset Sandi</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(c, false)}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-emerald-100 text-slate-700 hover:text-emerald-800 rounded-lg text-xs font-semibold transition flex items-center gap-1 cursor-pointer"
                          title="Edit nama, unit atau reset password"
                        >
                          <Edit className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(c)}
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                          title="Hapus / Non-aktifkan akun kasir"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {filteredCashiers.length === 0 && (
                  <tr>
                    <td colSpan="7" className="py-12 text-center text-slate-400 italic">
                      Tidak ada akun kasir yang sesuai dengan filter atau pencarian
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Tambah / Edit Akun Kasir */}
      {modalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                {modalMode === 'create' ? <UserPlus className="w-4 h-4 text-emerald-600" /> : <Edit className="w-4 h-4 text-emerald-600" />}
                <span>{modalMode === 'create' ? 'Tambah Akun Kasir Baru' : 'Edit Akun Kasir POS'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{formError}</span>
              </div>
            )}

            {/* Banner info wewenang kasir */}
            <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-200/70 text-indigo-900 text-xs flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Akses Khusus Kasir POS (Penjualan)</p>
                <p className="text-[11px] text-indigo-700 mt-0.5">
                  Akun ini hanya dapat membuka kasir penjualan POS, scan barcode/QR santri, dan input PIN santri. Akun ini tidak dapat melihat laporan laba atau mengatur produk.
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveForm} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nama Lengkap Kasir <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Contoh: Siti Rahmawati (Kasir Stand 1)"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-hidden focus:border-emerald-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Username Login <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  disabled={modalMode === 'edit'}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Contoh: kasir_stand1"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-medium focus:outline-hidden focus:border-emerald-500 focus:bg-white disabled:bg-slate-100 disabled:text-slate-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700">
                    {modalMode === 'create' ? 'Password Kasir *' : 'Reset Password (Opsional)'}
                  </label>
                  {modalMode === 'create' && (
                    <button
                      type="button"
                      onClick={generateRandomPassword}
                      className="text-[10px] font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer"
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>Acak Password</span>
                    </button>
                  )}
                </div>

                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required={modalMode === 'create'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={modalMode === 'create' ? 'Minimal 6 karakter' : 'Biarkan kosong jika tidak diubah'}
                    className="w-full pl-3 pr-16 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:outline-hidden focus:border-emerald-500 focus:bg-white"
                  />
                  <div className="absolute right-2 top-2 flex items-center gap-1">
                    {password && (
                      <button
                        type="button"
                        onClick={handleCopyPassword}
                        className="p-1 text-slate-400 hover:text-emerald-600 cursor-pointer"
                        title="Salin Password"
                      >
                        {copiedPassword ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Penempatan Unit Sekolah / Yayasan
                </label>
                <select
                  value={schoolUnitId}
                  onChange={(e) => setSchoolUnitId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 cursor-pointer focus:outline-hidden focus:border-emerald-500"
                >
                  <option value="">Pusat Yayasan (Lintas Seluruh Satuan)</option>
                  {(Array.isArray(schoolUnits) ? schoolUnits : []).map(u => (
                    <option key={u.id} value={String(u.id)}>{u.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Status Akun</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 cursor-pointer focus:outline-hidden focus:border-emerald-500"
                >
                  <option value="active">Aktif (Dapat Login)</option>
                  <option value="inactive">Non-Aktif (Login Dinonaktifkan)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {formSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{modalMode === 'create' ? 'Buat Akun Kasir' : 'Simpan Perubahan'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Hapus Kasir */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 mx-auto flex items-center justify-center">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">Hapus Akun Kasir?</h3>
              <p className="text-xs text-slate-500 mt-1">
                Apakah Anda yakin ingin menghapus akun kasir <strong>{deleteTarget.full_name}</strong> (@{deleteTarget.username})?
              </p>
              {deleteTarget.total_transactions > 0 && (
                <p className="text-[11px] text-amber-700 bg-amber-50 p-2 rounded-lg border border-amber-200 mt-2 text-left">
                  ⚠️ Akun ini memiliki <strong>{deleteTarget.total_transactions} transaksi tercatat</strong>. Akun akan dinon-aktifkan secara otomatis agar audit pembukuan tetap terjaga.
                </p>
              )}
            </div>

            <div className="flex items-center justify-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer flex-1"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleDeleteCashier}
                disabled={deleting}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition shadow-xs cursor-pointer flex-1 disabled:opacity-50"
              >
                {deleting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Ya, Lanjutkan</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Kredensial Berhasil Dibuat / Direset */}
      {credentialSuccessModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">
                    {credentialSuccessModal.isNew ? 'Akun Kasir Berhasil Dibuat!' : 'Password Berhasil Direset!'}
                  </h3>
                  <p className="text-[11px] text-slate-500">Kredensial login kasir aktif</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCredentialSuccessModal(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-3 font-sans">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Nama Kasir</span>
                <p className="text-xs font-bold text-slate-800">{credentialSuccessModal.fullName}</p>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="p-2.5 bg-white rounded-lg border border-slate-200/80">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Username</span>
                  <span className="text-xs font-mono font-bold text-slate-800 break-all select-all">
                    {credentialSuccessModal.username}
                  </span>
                </div>

                <div className="p-2.5 bg-white rounded-lg border border-slate-200/80">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Password</span>
                  <span className="text-xs font-mono font-bold text-emerald-700 break-all select-all">
                    {credentialSuccessModal.password}
                  </span>
                </div>
              </div>

              <div className="text-[11px] text-indigo-700 bg-indigo-50/80 p-2.5 rounded-lg border border-indigo-100 flex items-start gap-1.5">
                <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5 text-indigo-600" />
                <span>
                  Kasir dapat login langsung di <strong>http://localhost:5173/</strong> dan akan langsung diarahkan ke layar kasir POS.
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  const info = `Akun Kasir Kantin Aldepos\nNama: ${credentialSuccessModal.fullName}\nUsername: ${credentialSuccessModal.username}\nPassword: ${credentialSuccessModal.password}\nLogin di: ${window.location.origin}/`;
                  navigator.clipboard.writeText(info);
                  setCopiedCredential(true);
                  setTimeout(() => setCopiedCredential(false), 2000);
                }}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition shadow-xs cursor-pointer"
              >
                {copiedCredential ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copiedCredential ? 'Tersalin ke Clipboard!' : 'Salin Info Login Kasir'}</span>
              </button>
              <button
                type="button"
                onClick={() => setCredentialSuccessModal(null)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
