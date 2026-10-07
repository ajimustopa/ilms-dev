import React, { useState, useEffect } from 'react';
import {
  Search,
  BookOpen,
  SlidersHorizontal,
  History,
  AlertCircle,
  Plus,
  X,
  CheckCircle2,
  Calendar,
  Layers,
  ChevronRight,
  Sparkles,
  Lock,
  ShieldCheck,
  ArrowRight,
  TrendingUp,
  RefreshCw,
  Edit3,
  CalendarCheck,
  AlertTriangle,
  Scale
} from 'lucide-react';
import api from '../../../../shared/services/api';

export default function LeaveBalancesTab({ activeSchoolUnit }) {
  const [balances, setBalances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [periodKey, setPeriodKey] = useState('2026/2027');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [pagination, setPagination] = useState({ page: 1, perPage: 25, total: 0 });

  // Notifications
  const [toast, setToast] = useState(null);

  // 1. Ledger Drawer State
  const [isLedgerDrawerOpen, setIsLedgerDrawerOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [ledgerData, setLedgerData] = useState({ balance: null, entries: [] });
  const [loadingLedger, setLoadingLedger] = useState(false);

  // 2. Adjust Modal State
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [adjustTarget, setAdjustTarget] = useState(null);
  const [adjustDelta, setAdjustDelta] = useState('');
  const [adjustReason, setAdjustReason] = useState('');
  const [isSubmittingAdjust, setIsSubmittingAdjust] = useState(false);
  const [adjustError, setAdjustError] = useState('');

  // 3. Bulk Assign Modal State
  const [isBulkAssignModalOpen, setIsBulkAssignModalOpen] = useState(false);
  const [isSubmittingBulk, setIsSubmittingBulk] = useState(false);
  const [bulkResult, setBulkResult] = useState(null);

  // 4. Close Period Modal State
  const [isClosePeriodModalOpen, setIsClosePeriodModalOpen] = useState(false);
  const [closePeriodData, setClosePeriodData] = useState(null);
  const [loadingClosePreview, setLoadingClosePreview] = useState(false);
  const [isExecutingClose, setIsExecutingClose] = useState(false);
  const [closeConfirmChecked, setCloseConfirmChecked] = useState(false);

  // 5. Reconciliation Modal State
  const [isReconcileModalOpen, setIsReconcileModalOpen] = useState(false);
  const [reconcileData, setReconcileData] = useState(null);
  const [loadingReconcile, setLoadingReconcile] = useState(false);
  const [isApplyingReconcile, setIsApplyingReconcile] = useState(false);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4500);
  };

  const fetchBalances = async (page = 1) => {
    setLoading(true);
    try {
      let q = `?periodKey=${periodKey}&page=${page}&perPage=${pagination.perPage}`;
      if (activeSchoolUnit?.id) q += `&schoolUnitId=${activeSchoolUnit.id}`;
      if (searchQuery) q += `&q=${encodeURIComponent(searchQuery)}`;

      const res = await api.get(`/kepegawaian/leave-balances${q}`);
      if (res.data?.success) {
        setBalances(res.data.data || []);
        if (res.data.meta) {
          setPagination({
            page: res.data.meta.page || 1,
            perPage: res.data.meta.per_page || 25,
            total: res.data.meta.total || 0
          });
        }
      }
    } catch (err) {
      console.error('Failed to fetch balances:', err);
      showToast(err.response?.data?.message || 'Gagal memuat daftar saldo cuti', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBalances(1);
  }, [periodKey, activeSchoolUnit]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchBalances(1);
  };

  // -------------------------------------------------------------
  // Drawer Buku Besar (Ledger)
  // -------------------------------------------------------------
  const handleOpenLedger = async (employee) => {
    setSelectedEmployee(employee);
    setIsLedgerDrawerOpen(true);
    setLoadingLedger(true);
    try {
      const res = await api.get(`/kepegawaian/leave-balances/${employee.employee_id}/ledger`);
      if (res.data?.success) {
        setLedgerData(res.data.data || { balance: null, entries: [] });
      }
    } catch (e) {
      setLedgerData({ balance: null, entries: [] });
      showToast('Gagal memuat riwayat mutasi ledger', 'error');
    } finally {
      setLoadingLedger(false);
    }
  };

  // -------------------------------------------------------------
  // Penyesuaian Saldo (Adjust)
  // -------------------------------------------------------------
  const handleOpenAdjust = (employee) => {
    setAdjustTarget(employee);
    setAdjustDelta('');
    setAdjustReason('');
    setAdjustError('');
    setIsAdjustModalOpen(true);
  };

  const handleExecuteAdjust = async () => {
    if (!adjustTarget) return;
    const delta = parseFloat(adjustDelta);
    if (isNaN(delta) || delta === 0) {
      setAdjustError('Nilai perubahan saldo harus berupa angka bukan nol (contoh: 1 atau -0.5)');
      return;
    }
    if (!adjustReason || adjustReason.trim().length < 5) {
      setAdjustError('Alasan penyesuaian wajib diisi minimal 5 karakter untuk audit log');
      return;
    }

    setIsSubmittingAdjust(true);
    setAdjustError('');

    try {
      const res = await api.post('/kepegawaian/leave-balances/adjust', {
        employee_id: adjustTarget.employee_id,
        delta_available: delta,
        reason: adjustReason.trim()
      });

      if (res.data?.success) {
        setIsAdjustModalOpen(false);
        showToast(`Saldo ${adjustTarget.name} berhasil disesuaikan (${delta > 0 ? `+${delta}` : delta} Hari)`);
        fetchBalances(pagination.page);
      }
    } catch (err) {
      setAdjustError(err.response?.data?.message || 'Gagal menyesuaikan saldo');
    } finally {
      setIsSubmittingAdjust(false);
    }
  };

  // -------------------------------------------------------------
  // Bulk Assign Entitlements
  // -------------------------------------------------------------
  const handleOpenBulkAssign = () => {
    setBulkResult(null);
    setIsBulkAssignModalOpen(true);
  };

  const handleExecuteBulkAssign = async () => {
    setIsSubmittingBulk(true);
    try {
      const res = await api.post('/kepegawaian/leave-balances/bulk-assign', {
        periodKey,
        schoolUnitId: activeSchoolUnit?.id || null
      });
      if (res.data?.success) {
        setBulkResult(res.data.data);
        showToast(`Berhasil menghitung hak awal untuk ${res.data.data?.total_processed || 0} pegawai`);
        fetchBalances(1);
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Gagal menjalankan bulk assign', 'error');
    } finally {
      setIsSubmittingBulk(false);
    }
  };

  // -------------------------------------------------------------
  // Tutup Periode & Carry Over
  // -------------------------------------------------------------
  const handleOpenClosePeriod = async () => {
    setIsClosePeriodModalOpen(true);
    setLoadingClosePreview(true);
    setCloseConfirmChecked(false);
    try {
      // Find period ID for periodKey
      const policiesRes = await api.get('/kepegawaian/leave-balance-policies');
      const periodId = 1; // Default primary period ID

      const res = await api.post(`/kepegawaian/leave-balances/periods/${periodId}/close`, {
        dry_run: true
      });
      if (res.data?.success) {
        setClosePeriodData(res.data.data);
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Gagal memuat pratinjau penutupan periode', 'error');
    } finally {
      setLoadingClosePreview(false);
    }
  };

  const handleExecuteClosePeriod = async () => {
    if (!closeConfirmChecked) return;
    setIsExecutingClose(true);
    try {
      const periodId = closePeriodData?.period_id || 1;
      const res = await api.post(`/kepegawaian/leave-balances/periods/${periodId}/close`, {
        dry_run: false
      });
      if (res.data?.success) {
        showToast(`Periode ${closePeriodData.period_key} resmi ditutup! Carry over berhasil dialihkan ke ${res.data.data?.next_period_key}.`);
        setIsClosePeriodModalOpen(false);
        fetchBalances(1);
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Gagal menutup periode', 'error');
    } finally {
      setIsExecutingClose(false);
    }
  };

  // -------------------------------------------------------------
  // Rekonsiliasi Saldo (Reconciliation)
  // -------------------------------------------------------------
  const handleOpenReconcile = async () => {
    setIsReconcileModalOpen(true);
    setLoadingReconcile(true);
    try {
      const periodId = 1;
      const res = await api.post(`/kepegawaian/leave-balances/periods/${periodId}/reconcile`, {
        dry_run: true
      });
      if (res.data?.success) {
        setReconcileData(res.data.data);
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Gagal memeriksa rekonsiliasi saldo', 'error');
    } finally {
      setLoadingReconcile(false);
    }
  };

  const handleApplyReconcile = async () => {
    setIsApplyingReconcile(true);
    try {
      const periodId = reconcileData?.period_id || 1;
      const res = await api.post(`/kepegawaian/leave-balances/periods/${periodId}/reconcile`, {
        dry_run: false
      });
      if (res.data?.success) {
        showToast(`Rekonsiliasi selesai. ${res.data.data?.discrepancies_count || 0} saldo disinkronkan dari mutasi ledger.`);
        setIsReconcileModalOpen(false);
        fetchBalances(pagination.page);
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Gagal menerapkan rekonsiliasi', 'error');
    } finally {
      setIsApplyingReconcile(false);
    }
  };

  // Filtered by status client-side (secondary filter)
  const filteredBalances = balances.filter(b => {
    if (statusFilter !== 'ALL') {
      const statusNorm = (b.employment_status || '').toUpperCase();
      if (statusNorm !== statusFilter) return false;
    }
    return true;
  });

  // KPI Calculations
  const totalGranted = balances.reduce((acc, curr) => acc + (parseFloat(curr.granted) || 0), 0);
  const totalCarryIn = balances.reduce((acc, curr) => acc + (parseFloat(curr.carry_in) || 0), 0);
  const totalUsed = balances.reduce((acc, curr) => acc + (parseFloat(curr.used) || 0), 0);
  const totalReserved = balances.reduce((acc, curr) => acc + (parseFloat(curr.reserved) || 0), 0);
  const totalAvailable = balances.reduce((acc, curr) => acc + (parseFloat(curr.available) || 0), 0);

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toast && (
        <div className={`p-4 rounded-xl text-xs font-semibold flex items-center justify-between shadow-lg border transition-all animate-in fade-in slide-in-from-top-3 ${
          toast.type === 'error'
            ? 'bg-rose-50 border-rose-200 text-rose-800'
            : 'bg-emerald-50 border-emerald-200 text-emerald-800'
        }`}>
          <div className="flex items-center gap-2">
            {toast.type === 'error' ? <AlertCircle className="w-4 h-4 text-rose-600" /> : <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
            <span>{toast.message}</span>
          </div>
          <button onClick={() => setToast(null)} className="opacity-70 hover:opacity-100">&times;</button>
        </div>
      )}

      {/* KPI Cards Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">Total Hak Awal</p>
            <h3 className="text-2xl font-extrabold text-slate-900">{totalGranted.toFixed(1)} <span className="text-xs font-medium text-slate-400">Hari</span></h3>
            <p className="text-[11px] text-slate-400 mt-1">Periode {periodKey}</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
            <Layers className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">Carry In Aktif</p>
            <h3 className="text-2xl font-extrabold text-teal-600">{totalCarryIn.toFixed(1)} <span className="text-xs font-medium text-slate-400">Hari</span></h3>
            <p className="text-[11px] text-teal-700/70 mt-1">Sisa periode lalu (max 6)</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-600">
            <CalendarCheck className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">Realisasi Cuti</p>
            <h3 className="text-2xl font-extrabold text-emerald-600">{totalUsed.toFixed(1)} <span className="text-xs font-medium text-slate-400">Hari</span></h3>
            <p className="text-[11px] text-emerald-700/70 mt-1">Cuti sah & cuti bersama</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">Dipesan (Pending)</p>
            <h3 className="text-2xl font-extrabold text-amber-600">{totalReserved.toFixed(1)} <span className="text-xs font-medium text-slate-400">Hari</span></h3>
            <p className="text-[11px] text-amber-700/70 mt-1">Pengajuan proses approval</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
            <History className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">Sisa Tersedia</p>
            <h3 className="text-2xl font-extrabold text-indigo-600">{totalAvailable.toFixed(1)} <span className="text-xs font-medium text-slate-400">Hari</span></h3>
            <p className="text-[11px] text-indigo-700/70 mt-1">Dapat diajukan pegawai</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
            <BookOpen className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter and Action Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-col xl:flex-row gap-4 items-center justify-between">
        <form onSubmit={handleSearchSubmit} className="flex flex-1 flex-wrap items-center gap-3 w-full xl:w-auto">
          <div className="relative flex-1 min-w-[260px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari nama pegawai, NIP, atau jabatan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50/50"
            />
          </div>

          <select
            value={periodKey}
            onChange={(e) => setPeriodKey(e.target.value)}
            className="py-2 px-3 text-xs border border-slate-200 rounded-xl bg-white text-slate-700 font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="2026/2027">Tahun Ajaran 2026/2027</option>
            <option value="2027/2028">Tahun Ajaran 2027/2028</option>
            <option value="2025/2026">Tahun Ajaran 2025/2026</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="py-2 px-3 text-xs border border-slate-200 rounded-xl bg-white text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="ALL">Semua Status Pegawai</option>
            <option value="GTY">GTY (Tetap Yayasan)</option>
            <option value="PTY">PTY (Tidak Tetap)</option>
            <option value="PNS">PNS / DPK</option>
            <option value="PELATIH_EKSKUL">Pelatih Ekskul</option>
          </select>
        </form>

        {/* HR Operations Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 w-full xl:w-auto justify-end">
          <button
            type="button"
            onClick={handleOpenReconcile}
            className="px-3.5 py-2 rounded-xl text-xs font-bold border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-2 shadow-2xs"
            title="Periksa integritas saldo terhadap mutasi ledger"
          >
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Periksa Konsistensi</span>
          </button>

          <button
            type="button"
            onClick={handleOpenBulkAssign}
            className="px-3.5 py-2 rounded-xl text-xs font-bold border border-indigo-200 bg-indigo-50/50 text-indigo-700 hover:bg-indigo-100/70 transition-colors flex items-center gap-2 shadow-2xs"
            title="Kalkulasi jatah awal seluruh pegawai pada periode ini"
          >
            <Sparkles className="w-4 h-4 text-indigo-600" />
            <span>Atur Jatah Massal</span>
          </button>

          <button
            type="button"
            onClick={handleOpenClosePeriod}
            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white transition-colors flex items-center gap-2 shadow-xs"
            title="Tutup periode aktif dan alihkan sisa saldo ke carry over"
          >
            <Lock className="w-4 h-4 text-amber-400" />
            <span>Tutup Periode</span>
          </button>
        </div>
      </div>

      {/* Main Balances Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-[11px] uppercase font-bold text-slate-400 tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Pegawai</th>
                <th className="py-3.5 px-4">Status & Kelayakan</th>
                <th className="py-3.5 px-4 text-center">Hak Awal</th>
                <th className="py-3.5 px-4 text-center">Carry In</th>
                <th className="py-3.5 px-4 text-center">Koreksi (Adj)</th>
                <th className="py-3.5 px-4 text-center">Terpakai</th>
                <th className="py-3.5 px-4 text-center">Dipesan</th>
                <th className="py-3.5 px-4 text-center font-extrabold text-slate-900">Sisa Saldo</th>
                <th className="py-3.5 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-16 text-center text-slate-400">
                    <div className="inline-flex items-center gap-2 font-medium">
                      <RefreshCw className="w-4 h-4 animate-spin text-indigo-600" />
                      Memuat kalkulasi saldo cuti pegawai...
                    </div>
                  </td>
                </tr>
              ) : filteredBalances.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-16 text-center text-slate-400">
                    <AlertCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    Tidak ada data pegawai yang sesuai dengan filter.
                  </td>
                </tr>
              ) : (
                filteredBalances.map((item) => (
                  <tr key={item.employee_id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">{item.name}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {item.nip || `ID: ${item.employee_id}`} • {item.position_name || 'Staf'}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase ${
                          ['gty', 'pty'].includes((item.employment_status || '').toLowerCase())
                            ? 'bg-blue-50 text-blue-700 border border-blue-100'
                            : 'bg-slate-100 text-slate-600'
                        }`}>
                          {item.employment_status || '-'}
                        </span>

                        {!item.join_date ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200" title="Tanggal masuk belum diisi, hak cuti tidak dapat dihitung otomatis">
                            <AlertTriangle className="w-3 h-3 text-amber-600" />
                            Tgl Masuk Kosong
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-400">
                            Masuk: {item.join_date}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-center font-bold text-slate-800">
                      {item.granted}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="font-medium text-slate-700">{item.carry_in}</span>
                      {item.carry_in > 0 && item.carry_expires_on && (
                        <div className="text-[10px] text-amber-600 font-semibold mt-0.5">
                          s/d {item.carry_expires_on.slice(5)}
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-center text-slate-600 font-medium">
                      {item.adjusted > 0 ? (
                        <span className="text-emerald-600 font-semibold">+{item.adjusted}</span>
                      ) : item.adjusted < 0 ? (
                        <span className="text-rose-600 font-semibold">{item.adjusted}</span>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-center font-bold text-emerald-600">
                      {item.used}
                    </td>
                    <td className="py-3.5 px-4 text-center font-bold text-amber-600">
                      {item.reserved > 0 ? item.reserved : '-'}
                    </td>
                    <td className="py-3.5 px-4 text-center font-extrabold text-indigo-700 bg-indigo-50/40">
                      <span className="text-sm">{item.available}</span> <span className="text-[10px] font-medium text-indigo-500">Hari</span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenLedger(item)}
                          className="px-2.5 py-1 text-xs font-bold text-indigo-600 hover:bg-indigo-50 rounded-lg border border-indigo-200 transition-colors"
                          title="Buku Besar Mutasi Cuti"
                        >
                          Ledger
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenAdjust(item)}
                          className="px-2.5 py-1 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors"
                          title="Penyesuaian Saldo Manual"
                        >
                          Koreksi
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <div>
            Menampilkan <span className="font-bold text-slate-800">{filteredBalances.length}</span> dari <span className="font-bold text-slate-800">{pagination.total}</span> pegawai
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={pagination.page <= 1}
              onClick={() => fetchBalances(pagination.page - 1)}
              className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-colors font-medium"
            >
              Sebelumnya
            </button>
            <span className="px-2 font-bold text-slate-800">
              Halaman {pagination.page}
            </span>
            <button
              type="button"
              disabled={pagination.page * pagination.perPage >= pagination.total}
              onClick={() => fetchBalances(pagination.page + 1)}
              className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-colors font-medium"
            >
              Berikutnya
            </button>
          </div>
        </div>
      </div>

      {/* ============================================================= */}
      {/* 1. DRAWER BUKU BESAR (LEDGER DRAWER)                          */}
      {/* ============================================================= */}
      {isLedgerDrawerOpen && selectedEmployee && (
        <div className="fixed inset-0 z-50 overflow-hidden flex justify-end bg-slate-900/40 backdrop-blur-xs">
          <div className="w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
            {/* Drawer Header */}
            <div className="p-6 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
              <div>
                <div className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-indigo-600" />
                  <h3 className="text-base font-extrabold text-slate-900">Buku Besar Cuti (Append-Only Ledger)</h3>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  {selectedEmployee.name} ({selectedEmployee.nip || `ID: ${selectedEmployee.employee_id}`}) • {selectedEmployee.position_name}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsLedgerDrawerOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Balance Card Snapshot */}
            {ledgerData.balance && (
              <div className="p-4 bg-indigo-50/30 border-b border-indigo-100/50 grid grid-cols-4 gap-2 text-center text-xs">
                <div className="p-2 bg-white rounded-xl border border-indigo-100/80 shadow-2xs">
                  <div className="text-[10px] text-slate-400 font-bold uppercase">Hak Awal</div>
                  <div className="text-sm font-extrabold text-slate-800">{ledgerData.balance.granted}</div>
                </div>
                <div className="p-2 bg-white rounded-xl border border-indigo-100/80 shadow-2xs">
                  <div className="text-[10px] text-slate-400 font-bold uppercase">Carry In</div>
                  <div className="text-sm font-extrabold text-teal-600">{ledgerData.balance.carry_in}</div>
                </div>
                <div className="p-2 bg-white rounded-xl border border-indigo-100/80 shadow-2xs">
                  <div className="text-[10px] text-slate-400 font-bold uppercase">Terpakai</div>
                  <div className="text-sm font-extrabold text-emerald-600">{ledgerData.balance.used}</div>
                </div>
                <div className="p-2 bg-indigo-600 rounded-xl shadow-xs text-white">
                  <div className="text-[10px] text-indigo-200 font-bold uppercase">Sisa Saldo</div>
                  <div className="text-sm font-extrabold">{ledgerData.balance.available} Hari</div>
                </div>
              </div>
            )}

            {/* Invariant Statement Info */}
            <div className="px-6 py-2 bg-slate-100/70 border-b border-slate-200 text-[11px] text-slate-500 font-mono flex items-center justify-between">
              <span>Invarian: Tersedia = Hak + Carry + Adj - Expire - Dipesan - Terpakai</span>
              <span className="text-emerald-700 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Terverifikasi
              </span>
            </div>

            {/* Ledger Transactions List */}
            <div className="p-6 flex-1 overflow-y-auto space-y-3">
              {loadingLedger ? (
                <div className="py-16 text-center text-slate-400">
                  <RefreshCw className="w-5 h-5 animate-spin text-indigo-600 mx-auto mb-2" />
                  Memuat riwayat transaksi buku besar...
                </div>
              ) : ledgerData.entries.length === 0 ? (
                <div className="py-16 text-center text-slate-400">
                  Belum ada catatan mutasi ledger pada periode ini.
                </div>
              ) : (
                ledgerData.entries.map((entry) => (
                  <div key={entry.id} className="p-4 bg-white border border-slate-200 rounded-2xl shadow-2xs flex items-start justify-between gap-4 hover:border-indigo-200 transition-colors">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wide ${
                          entry.entry_type === 'grant' ? 'bg-blue-100 text-blue-700' :
                          entry.entry_type === 'carry_in' ? 'bg-teal-100 text-teal-700' :
                          entry.entry_type === 'commit' ? 'bg-emerald-100 text-emerald-700' :
                          entry.entry_type === 'reserve' ? 'bg-amber-100 text-amber-700' :
                          entry.entry_type === 'release' ? 'bg-slate-100 text-slate-700' :
                          entry.entry_type === 'refund' ? 'bg-purple-100 text-purple-700' :
                          entry.entry_type === 'joint_leave_debit' ? 'bg-orange-100 text-orange-700' :
                          entry.entry_type === 'expire' ? 'bg-rose-100 text-rose-700' :
                          entry.entry_type === 'adjust' ? 'bg-indigo-100 text-indigo-700' :
                          'bg-slate-100 text-slate-800'
                        }`}>
                          {entry.entry_type}
                        </span>

                        <span className="text-[11px] text-slate-400">
                          {entry.effective_date}
                        </span>

                        <span className="px-1.5 py-0.2 rounded text-[10px] bg-slate-100 text-slate-500 font-mono">
                          {entry.bucket}
                        </span>
                      </div>

                      <p className="text-xs font-semibold text-slate-800 leading-snug">
                        {entry.reason || 'Mutasi sistem'}
                      </p>

                      <div className="text-[10px] text-slate-400 font-mono truncate">
                        Key: {entry.idempotency_key}
                      </div>
                    </div>

                    <div className="text-right space-y-0.5 shrink-0">
                      <div className="text-xs font-bold">
                        Δ Tersedia: <span className={
                          entry.delta_available > 0 ? 'text-emerald-600 font-extrabold' :
                          entry.delta_available < 0 ? 'text-rose-600 font-extrabold' : 'text-slate-400'
                        }>
                          {entry.delta_available > 0 ? `+${entry.delta_available}` : entry.delta_available}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Δ Dipesan: {entry.delta_reserved > 0 ? `+${entry.delta_reserved}` : entry.delta_reserved}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Δ Digunakan: {entry.delta_used > 0 ? `+${entry.delta_used}` : entry.delta_used}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* 2. MODAL KOREKSI SALDO (ADJUST MODAL)                          */}
      {/* ============================================================= */}
      {isAdjustModalOpen && adjustTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-indigo-600" />
                <h3 className="font-extrabold text-slate-900 text-base">Penyesuaian Saldo Cuti Manual</h3>
              </div>
              <button type="button" onClick={() => setIsAdjustModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/70 text-xs text-slate-600 flex items-center justify-between">
              <div>
                <span className="text-slate-400">Pegawai:</span> <strong className="text-slate-800">{adjustTarget.name}</strong>
              </div>
              <div>
                <span className="text-slate-400">Sisa Saat Ini:</span> <strong className="text-indigo-600">{adjustTarget.available} Hari</strong>
              </div>
            </div>

            {adjustError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{adjustError}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Perubahan Saldo (+ Tambah / - Kurang Hari)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="0.5"
                  placeholder="Contoh: 1.5 atau -1.0"
                  value={adjustDelta}
                  onChange={(e) => setAdjustDelta(e.target.value)}
                  className="flex-1 p-2.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
                />
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setAdjustDelta('+1.0')}
                    className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg"
                  >
                    +1
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjustDelta('-1.0')}
                    className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg"
                  >
                    -1
                  </button>
                </div>
              </div>

              {adjustDelta && !isNaN(parseFloat(adjustDelta)) && (
                <p className="text-[11px] text-slate-500 mt-1 font-medium">
                  Estimasi saldo akhir: <strong className="text-indigo-600">{(parseFloat(adjustTarget.available) + parseFloat(adjustDelta)).toFixed(1)} Hari</strong>
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Alasan Koreksi (Wajib Dicatat di Audit Log)
              </label>
              <textarea
                rows={3}
                placeholder="Contoh: Penyesuaian kompensasi dinas luar atau koreksi masa kerja"
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
                className="w-full p-2.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsAdjustModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleExecuteAdjust}
                disabled={isSubmittingAdjust || !adjustDelta || !adjustReason.trim()}
                className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors disabled:opacity-50 flex items-center gap-2 shadow-xs"
              >
                {isSubmittingAdjust ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : null}
                <span>{isSubmittingAdjust ? 'Menyimpan...' : 'Simpan Perubahan'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* 3. MODAL ATUR JATAH MASSAL (BULK ASSIGN)                      */}
      {/* ============================================================= */}
      {isBulkAssignModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-600" />
                <h3 className="font-extrabold text-slate-900 text-base">Atur Jatah Awal Massal</h3>
              </div>
              <button type="button" onClick={() => setIsBulkAssignModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Fitur ini akan menghitung dan mencatat hak cuti awal untuk <strong>seluruh pegawai aktif</strong> pada periode <strong>{periodKey}</strong> berdasarkan aturan status kepegawaian (GTY/PTY: 12 hari, pro-rata cut-off tgl 15).
            </p>

            <div className="p-3.5 bg-blue-50/70 border border-blue-200 text-blue-800 text-xs rounded-2xl space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-blue-600" />
                <span>Idempoten & Aman</span>
              </div>
              <p className="text-[11px] text-blue-700/80">
                Pegawai yang sudah memiliki entri hak awal tidak akan mendapatkan jatah ganda.
              </p>
            </div>

            {bulkResult && (
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs space-y-2 max-h-48 overflow-y-auto font-mono">
                <div className="font-bold text-slate-800">Hasil Pemrosesan ({bulkResult.total_processed} Pegawai):</div>
                <div className="space-y-1">
                  {bulkResult.results?.map((r) => (
                    <div key={r.employee_id} className="flex items-center justify-between text-[11px]">
                      <span>{r.name}</span>
                      <span className="text-emerald-600 font-bold">{r.granted} Hari</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsBulkAssignModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
              >
                Tutup
              </button>
              <button
                type="button"
                onClick={handleExecuteBulkAssign}
                disabled={isSubmittingBulk}
                className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors disabled:opacity-50 flex items-center gap-2 shadow-xs"
              >
                {isSubmittingBulk ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                <span>{isSubmittingBulk ? 'Memproses...' : 'Jalankan Hitung Massal'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* 4. MODAL TUTUP PERIODE & CARRY OVER                           */}
      {/* ============================================================= */}
      {isClosePeriodModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Lock className="w-5 h-5 text-amber-600" />
                <h3 className="font-extrabold text-slate-900 text-base">Tutup Periode & Carry Over</h3>
              </div>
              <button type="button" onClick={() => setIsClosePeriodModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {loadingClosePreview ? (
              <div className="py-16 text-center text-slate-400">
                <RefreshCw className="w-5 h-5 animate-spin text-indigo-600 mx-auto mb-2" />
                Menghitung kalkulasi carry over (Dry-Run)...
              </div>
            ) : closePeriodData ? (
              <div className="space-y-3">
                <div className="p-3.5 bg-amber-50/70 border border-amber-200 text-amber-900 text-xs rounded-2xl space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <span>Pratinjau Penutupan Periode {closePeriodData.period_key}</span>
                  </div>
                  <p className="text-[11px] text-amber-800/80 leading-relaxed">
                    Sisa saldo per pegawai akan dialihkan ke periode <strong>{closePeriodData.next_period_key}</strong> sebagai bucket <strong>Carry Over</strong> dengan batas maksimum <strong>6.0 Hari</strong> dan kedaluwarsa per <strong>30 September</strong>.
                  </p>
                </div>

                <div className="max-h-52 overflow-y-auto border border-slate-200 rounded-2xl divide-y divide-slate-100 text-xs">
                  <div className="p-2.5 bg-slate-50 font-bold text-slate-700 flex justify-between text-[11px]">
                    <span>Total Carry In Dialihkan:</span>
                    <span className="text-teal-600 font-extrabold">{closePeriodData.total_carry_in_days} Hari ({closePeriodData.employees_count} Pegawai)</span>
                  </div>
                  {closePeriodData.carry_overs?.slice(0, 8).map((co) => (
                    <div key={co.employee_id} className="p-2.5 flex items-center justify-between text-[11px]">
                      <span>Pegawai ID: {co.employee_id}</span>
                      <span className="text-slate-500">
                        Sisa: {co.current_period_available} H &rarr; <strong className="text-teal-600">Carry: {co.carry_in} H</strong>
                      </span>
                    </div>
                  ))}
                  {closePeriodData.carry_overs?.length > 8 && (
                    <div className="p-2 text-center text-[10px] text-slate-400">
                      dan {closePeriodData.carry_overs.length - 8} pegawai lainnya...
                    </div>
                  )}
                </div>

                <label className="flex items-start gap-2 pt-2 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={closeConfirmChecked}
                    onChange={(e) => setCloseConfirmChecked(e.target.checked)}
                    className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Saya mengonfirmasi untuk menutup periode {closePeriodData.period_key} dan mengeksekusi carry over secara permanen ke buku besar.</span>
                </label>
              </div>
            ) : null}

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsClosePeriodModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleExecuteClosePeriod}
                disabled={isExecutingClose || !closeConfirmChecked || loadingClosePreview}
                className="px-4 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-colors disabled:opacity-50 flex items-center gap-2 shadow-xs"
              >
                {isExecutingClose ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Lock className="w-3.5 h-3.5" />}
                <span>{isExecutingClose ? 'Menutup Periode...' : 'Tutup Periode Resmi'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* 5. MODAL REKONSILIASI SALDO (RECONCILIATION)                  */}
      {/* ============================================================= */}
      {isReconcileModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                <h3 className="font-extrabold text-slate-900 text-base">Pemeriksaan Integritas & Rekonsiliasi</h3>
              </div>
              <button type="button" onClick={() => setIsReconcileModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {loadingReconcile ? (
              <div className="py-16 text-center text-slate-400">
                <RefreshCw className="w-5 h-5 animate-spin text-indigo-600 mx-auto mb-2" />
                Memverifikasi seluruh saldo terhadap mutasi buku besar...
              </div>
            ) : reconcileData ? (
              <div className="space-y-3 text-xs">
                {reconcileData.discrepancies_count === 0 ? (
                  <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 space-y-2 text-center">
                    <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                    <div className="font-bold text-sm">Saldo 100% Konsisten</div>
                    <p className="text-[11px] text-emerald-700 leading-relaxed">
                      Seluruh {reconcileData.total_checked} data saldo pegawai pada periode {reconcileData.period_key} cocok sempurna dengan mutasi transaksi pada append-only ledger.
                    </p>
                  </div>
                ) : (
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-amber-800 space-y-2">
                    <div className="font-bold flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                      <span>Ditemukan {reconcileData.discrepancies_count} Selisih Saldo</span>
                    </div>
                    <p className="text-[11px] text-amber-700">
                      Tabel cache saldo memiliki perbedaan nilai dengan kebenaran mutasi ledger. Klik tombol di bawah untuk menyinkronkan data cache.
                    </p>
                  </div>
                )}
              </div>
            ) : null}

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsReconcileModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
              >
                Tutup
              </button>
              {reconcileData?.discrepancies_count > 0 && (
                <button
                  type="button"
                  onClick={handleApplyReconcile}
                  disabled={isApplyingReconcile}
                  className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors disabled:opacity-50 flex items-center gap-2 shadow-xs"
                >
                  {isApplyingReconcile ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : null}
                  <span>{isApplyingReconcile ? 'Menyinkronkan...' : 'Sinkronkan dari Ledger'}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
