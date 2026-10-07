import React, { useState, useEffect } from 'react';
import {
  Search,
  BookOpen,
  SlidersHorizontal,
  ArrowUpDown,
  History,
  AlertCircle,
  Plus,
  X,
  CheckCircle2,
  Calendar,
  Layers,
  ChevronRight
} from 'lucide-react';
import api from '../../../../shared/services/api';

export default function LeaveBalancesTab({ activeSchoolUnit }) {
  const [balances, setBalances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [periodKey, setPeriodKey] = useState('2026/2027');

  // Ledger Drawer
  const [isLedgerDrawerOpen, setIsLedgerDrawerOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [ledgerEntries, setLedgerEntries] = useState([]);
  const [loadingLedger, setLoadingLedger] = useState(false);

  // Adjustment Modal
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [adjustTarget, setAdjustTarget] = useState(null);
  const [adjustDelta, setAdjustDelta] = useState('');
  const [adjustReason, setAdjustReason] = useState('');
  const [isSubmittingAdjust, setIsSubmittingAdjust] = useState(false);
  const [adjustError, setAdjustError] = useState('');

  const fetchBalances = async () => {
    setLoading(true);
    try {
      let q = `?periodKey=${periodKey}`;
      if (activeSchoolUnit?.id) q += `&schoolUnitId=${activeSchoolUnit.id}`;
      const res = await api.get(`/kepegawaian/leave-balances${q}`);
      if (res.data?.success) {
        setBalances(res.data.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch balances:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBalances();
  }, [periodKey, activeSchoolUnit]);

  const handleOpenLedger = async (employee) => {
    setSelectedEmployee(employee);
    setIsLedgerDrawerOpen(true);
    setLoadingLedger(true);
    try {
      const res = await api.get(`/kepegawaian/leave-balances/${employee.employee_id}/ledger`);
      if (res.data?.success) {
        setLedgerEntries(res.data.data || []);
      }
    } catch (e) {
      setLedgerEntries([]);
    } finally {
      setLoadingLedger(false);
    }
  };

  const handleOpenAdjust = (employee) => {
    setAdjustTarget(employee);
    setAdjustDelta('');
    setAdjustReason('');
    setAdjustError('');
    setIsAdjustModalOpen(true);
  };

  const handleExecuteAdjust = async () => {
    if (!adjustTarget) return;
    setIsSubmittingAdjust(true);
    setAdjustError('');

    try {
      const res = await api.post('/kepegawaian/leave-balances/adjust', {
        employee_id: adjustTarget.employee_id,
        delta_available: parseFloat(adjustDelta),
        reason: adjustReason
      });

      if (res.data?.success) {
        setIsAdjustModalOpen(false);
        fetchBalances();
      }
    } catch (err) {
      setAdjustError(err.response?.data?.message || 'Gagal menyesuaikan saldo');
    } finally {
      setIsSubmittingAdjust(false);
    }
  };

  const filteredBalances = balances.filter(b =>
    (b.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (b.nip || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (b.position_name || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalGranted = balances.reduce((acc, curr) => acc + (parseFloat(curr.granted) || 0), 0);
  const totalUsed = balances.reduce((acc, curr) => acc + (parseFloat(curr.used) || 0), 0);
  const totalReserved = balances.reduce((acc, curr) => acc + (parseFloat(curr.reserved) || 0), 0);
  const totalAvailable = balances.reduce((acc, curr) => acc + (parseFloat(curr.available) || 0), 0);

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Total Jatah Diberikan</p>
            <h3 className="text-2xl font-bold text-slate-900">{totalGranted.toFixed(1)} <span className="text-sm font-medium text-slate-500">Hari</span></h3>
            <p className="text-xs text-slate-400 mt-1">Periode {periodKey}</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
            <Layers className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Saldo Terpakai</p>
            <h3 className="text-2xl font-bold text-emerald-600">{totalUsed.toFixed(1)} <span className="text-sm font-medium text-slate-500">Hari</span></h3>
            <p className="text-xs text-slate-400 mt-1">Realisasi cuti sah</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Dipesan (Pending)</p>
            <h3 className="text-2xl font-bold text-amber-600">{totalReserved.toFixed(1)} <span className="text-sm font-medium text-slate-500">Hari</span></h3>
            <p className="text-xs text-slate-400 mt-1">Reservasi pengajuan aktif</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
            <History className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Sisa Saldo Tersedia</p>
            <h3 className="text-2xl font-bold text-indigo-600">{totalAvailable.toFixed(1)} <span className="text-sm font-medium text-slate-500">Hari</span></h3>
            <p className="text-xs text-slate-400 mt-1">Dapat diajukan pegawai</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
            <BookOpen className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="flex flex-1 items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 min-w-[260px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari nama pegawai, NIP, atau jabatan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <select
            value={periodKey}
            onChange={(e) => setPeriodKey(e.target.value)}
            className="py-2 px-3 text-sm border border-slate-200 rounded-lg bg-white text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="2026/2027">Tahun Ajaran 2026/2027</option>
            <option value="2025/2026">Tahun Ajaran 2025/2026</option>
          </select>
        </div>
      </div>

      {/* Main Balances Table */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-xs uppercase font-semibold text-slate-500 tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Pegawai</th>
                <th className="py-3.5 px-4">Status & Masa Kerja</th>
                <th className="py-3.5 px-4 text-center">Hak Awal</th>
                <th className="py-3.5 px-4 text-center">Carry In</th>
                <th className="py-3.5 px-4 text-center">Penyesuaian</th>
                <th className="py-3.5 px-4 text-center">Terpakai</th>
                <th className="py-3.5 px-4 text-center">Dipesan</th>
                <th className="py-3.5 px-4 text-center font-bold text-slate-900">Sisa Saldo</th>
                <th className="py-3.5 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <div className="inline-flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                      Memuat saldo cuti pegawai...
                    </div>
                  </td>
                </tr>
              ) : filteredBalances.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    Tidak ada data pegawai yang ditemukan.
                  </td>
                </tr>
              ) : (
                filteredBalances.map((item) => (
                  <tr key={item.employee_id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-900">{item.name}</div>
                      <div className="text-xs text-slate-400">{item.nip || `ID: ${item.employee_id}`} • {item.position_name || '-'}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-700 uppercase">
                        {item.employment_status || '-'}
                      </span>
                      <div className="text-xs text-slate-400 mt-0.5">Masuk: {item.join_date || '-'}</div>
                    </td>
                    <td className="py-3.5 px-4 text-center font-medium">{item.granted}</td>
                    <td className="py-3.5 px-4 text-center text-slate-500">{item.carry_in}</td>
                    <td className="py-3.5 px-4 text-center text-slate-500">{item.adjusted >= 0 ? `+${item.adjusted}` : item.adjusted}</td>
                    <td className="py-3.5 px-4 text-center text-emerald-600 font-semibold">{item.used}</td>
                    <td className="py-3.5 px-4 text-center text-amber-600 font-medium">{item.reserved}</td>
                    <td className="py-3.5 px-4 text-center font-bold text-indigo-600 bg-indigo-50/30">
                      {item.available} Hari
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          onClick={() => handleOpenLedger(item)}
                          className="px-2.5 py-1 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 rounded-md border border-indigo-200 transition-colors"
                          title="Buku Besar Ledger"
                        >
                          Ledger
                        </button>
                        <button
                          onClick={() => handleOpenAdjust(item)}
                          className="px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-md border border-slate-200 transition-colors"
                          title="Penyesuaian Saldo"
                        >
                          Adjust
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

      {/* Ledger Drawer */}
      {isLedgerDrawerOpen && selectedEmployee && (
        <div className="fixed inset-0 z-50 overflow-hidden flex justify-end bg-slate-900/40 backdrop-blur-sm">
          <div className="w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Buku Besar (Ledger) Hak Cuti</h3>
                <p className="text-xs text-slate-500">{selectedEmployee.name} ({selectedEmployee.nip || `ID: ${selectedEmployee.employee_id}`})</p>
              </div>
              <button onClick={() => setIsLedgerDrawerOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 flex-1 overflow-y-auto space-y-4">
              {loadingLedger ? (
                <div className="py-12 text-center text-slate-400">Memuat mutasi ledger...</div>
              ) : ledgerEntries.length === 0 ? (
                <div className="py-12 text-center text-slate-400">Belum ada catatan mutasi pada periode ini.</div>
              ) : (
                <div className="space-y-3">
                  {ledgerEntries.map((entry) => (
                    <div key={entry.id} className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${
                            entry.entry_type === 'grant' ? 'bg-blue-100 text-blue-700' :
                            entry.entry_type === 'commit' ? 'bg-emerald-100 text-emerald-700' :
                            entry.entry_type === 'reserve' ? 'bg-amber-100 text-amber-700' :
                            entry.entry_type === 'release' ? 'bg-slate-100 text-slate-700' :
                            entry.entry_type === 'refund' ? 'bg-purple-100 text-purple-700' :
                            'bg-slate-100 text-slate-800'
                          }`}>
                            {entry.entry_type}
                          </span>
                          <span className="text-xs text-slate-400">{entry.effective_date}</span>
                        </div>
                        <p className="text-sm font-medium text-slate-800">{entry.reason || 'Mutasi sistem'}</p>
                        <p className="text-xs text-slate-400 font-mono">Ref: {entry.idempotency_key}</p>
                      </div>

                      <div className="text-right space-y-1">
                        <div className="text-sm font-bold text-slate-900">
                          Δ Tersedia: <span className={entry.delta_available > 0 ? 'text-emerald-600' : entry.delta_available < 0 ? 'text-rose-600' : 'text-slate-500'}>
                            {entry.delta_available > 0 ? `+${entry.delta_available}` : entry.delta_available}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500">
                          Δ Dipesan: {entry.delta_reserved > 0 ? `+${entry.delta_reserved}` : entry.delta_reserved}
                        </div>
                        <div className="text-xs text-slate-500">
                          Δ Terpakai: {entry.delta_used > 0 ? `+${entry.delta_used}` : entry.delta_used}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Adjust Modal */}
      {isAdjustModalOpen && adjustTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-lg">Koreksi / Penyesuaian Saldo</h3>
              <button onClick={() => setIsAdjustModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-sm text-slate-600">
              Pegawai: <strong>{adjustTarget.name}</strong> (Sisa saat ini: {adjustTarget.available} hari)
            </p>

            {adjustError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg">
                {adjustError}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Perubahan Saldo (+ Tambah / - Kurang)
              </label>
              <input
                type="number"
                step="0.5"
                placeholder="Contoh: 2 atau -1.5"
                value={adjustDelta}
                onChange={(e) => setAdjustDelta(e.target.value)}
                className="w-full p-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Alasan Koreksi (Wajib untuk Audit Log)
              </label>
              <textarea
                rows={3}
                placeholder="Contoh: Penyesuaian kompensasi dinas luar atau pembatalan libur bersama"
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
                className="w-full p-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsAdjustModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleExecuteAdjust}
                disabled={isSubmittingAdjust || !adjustDelta || !adjustReason.trim()}
                className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors disabled:opacity-50"
              >
                {isSubmittingAdjust ? 'Menyimpan...' : 'Simpan Perubahan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
