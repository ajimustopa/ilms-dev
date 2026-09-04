import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../shared/store/AuthContext';
import api from '../../../shared/services/api';
import {
  Coins,
  CheckCircle2,
  Clock,
  Send,
  Loader2,
  Calendar,
  Wallet,
  RotateCw,
  XCircle,
  ChevronDown,
  ChevronRight,
  Info,
  X,
  FileText,
  AlertTriangle,
  Building2,
  Search,
  Users,
  Briefcase,
  History,
  FileSpreadsheet,
  Check,
  ArrowDownRight
} from 'lucide-react';

export default function Payroll({ isEmbedded = false }) {
  const { activeSchoolUnit } = useAuth();
  const [subTab, setSubTab] = useState('realization'); // 'setting' | 'realization' | 'history'

  const [disbursements, setDisbursements] = useState([]);
  const [cashAccounts, setCashAccounts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [disbursingId, setDisbursingId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Expand breakdown row state
  const [expandedRows, setExpandedRows] = useState({});

  // Reject Modal State
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectingItem, setRejectingItem] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [submittingReject, setSubmittingReject] = useState(false);

  // Selected cash account for disbursement
  const [selectedCashAccountId, setSelectedCashAccountId] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [payRes, cashRes] = await Promise.all([
        api.get('/keuangan/payroll-disbursements'),
        api.get('/keuangan/cash-accounts')
      ]);
      setDisbursements(payRes.data?.data || []);
      const cashList = cashRes.data?.data || [];
      setCashAccounts(cashList);
      if (cashList.length > 0 && !selectedCashAccountId) {
        setSelectedCashAccountId(String(cashList[0].id));
      }
    } catch (err) {
      console.error('Error fetching payroll disbursements:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeSchoolUnit]);

  const toggleExpand = (id) => {
    setExpandedRows((prev) => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const handleDisburse = async (id) => {
    const cashId = selectedCashAccountId || cashAccounts[0]?.id || 1;
    if (!window.confirm('Konfirmasi pencairan dana gaji pegawai ini? Jurnal beban gaji & pengeluaran kas akan otomatis dibukukan.')) return;

    setDisbursingId(id);
    try {
      await api.post(`/keuangan/payroll-disbursements/${id}/disburse`, {
        cash_account_id: Number(cashId)
      });
      alert('Pencairan gaji berhasil dieksekusi & dibukukan ke jurnal pembukuan!');
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal mencairkan gaji');
    } finally {
      setDisbursingId(null);
    }
  };

  const openRejectModal = (item) => {
    setRejectingItem(item);
    setRejectionReason('');
    setIsRejectModalOpen(true);
  };

  const handleConfirmReject = async (e) => {
    e.preventDefault();
    if (!rejectionReason.trim()) {
      alert('Alasan penolakan/pengembalian wajib diisi!');
      return;
    }

    setSubmittingReject(true);
    try {
      await api.post(`/keuangan/payroll-disbursements/${rejectingItem.id}/reject`, {
        rejection_reason: rejectionReason
      });
      alert('Payroll berhasil dikembalikan ke Kepegawaian untuk koreksi!');
      setIsRejectModalOpen(false);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal mengembalikan payroll');
    } finally {
      setSubmittingReject(false);
    }
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val || 0);
  };

  // Filter items based on active sub-tab
  const activeDisbursements = disbursements.filter(d => {
    if (subTab === 'realization') return d.status !== 'disbursed';
    if (subTab === 'history') return d.status === 'disbursed';
    return true;
  }).filter(d => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const name = (d.employee_name || d.user_name || '').toLowerCase();
    const period = (d.period || '').toLowerCase();
    return name.includes(q) || period.includes(q);
  });

  return (
    <div className="space-y-6">
      {/* Sub-Tabs Switcher */}
      <div className="flex border-b border-slate-200 gap-6">
        <button
          type="button"
          onClick={() => setSubTab('realization')}
          className={`pb-3 text-xs font-bold flex items-center gap-2 border-b-2 transition ${
            subTab === 'realization'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Coins className="w-4 h-4" />
          <span>Realisasi Penggajian & Pencairan</span>
          {disbursements.filter(d => d.status !== 'disbursed').length > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
              {disbursements.filter(d => d.status !== 'disbursed').length} draf
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setSubTab('setting')}
          className={`pb-3 text-xs font-bold flex items-center gap-2 border-b-2 transition ${
            subTab === 'setting'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Penetapan Gaji Pegawai (SDM)</span>
        </button>

        <button
          type="button"
          onClick={() => setSubTab('history')}
          className={`pb-3 text-xs font-bold flex items-center gap-2 border-b-2 transition ${
            subTab === 'history'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Riwayat Pencairan Gaji</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* SUB-TAB 1: PENETAPAN GAJI PER KARYAWAN (SDM INTEGRATION PREP)            */}
      {/* ========================================================================= */}
      {subTab === 'setting' && (
        <div className="space-y-4">
          <div className="p-4 bg-indigo-50/70 border border-indigo-200 rounded-2xl flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-indigo-600 text-white rounded-xl mt-0.5">
                <Briefcase className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-sm">Penetapan Komponen & Standar Gaji Pegawai</h3>
                <p className="text-xs text-slate-600 mt-1 max-w-2xl">
                  Data struktur gaji, tunjangan tetap, tunjangan fungsional, dan tarif honor mengajar dirumuskan melalui modul Kepegawaian (SDM). Bagian Keuangan menerima draf resmi untuk diverifikasi dan dicairkan.
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                    <Clock className="w-3 h-3 text-amber-600" />
                    Menunggu Sinkronisasi Modul Kepegawaian
                  </span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => alert('Fitur sinkronisasi langsung dengan modul Kepegawaian (SDM) akan dihubungkan pada sesi integrasi berikutnya.')}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition shrink-0 flex items-center gap-1.5"
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span>Tarik Draf dari SDM</span>
            </button>
          </div>

          {/* Placeholder Layout Struktur Gaji */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between text-xs">
              <span className="font-bold text-slate-700">Daftar Penetapan Standar Gaji Pegawai (Pratinjau Struktur)</span>
              <span className="text-slate-400">Total Karyawan Terdaftar: 42</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3">Nama Pegawai & NIP</th>
                    <th className="px-4 py-3">Jabatan & Unit</th>
                    <th className="px-4 py-3 text-right">Gaji Pokok</th>
                    <th className="px-4 py-3 text-right">Tunjangan Tetap</th>
                    <th className="px-4 py-3 text-right">Tunjangan Jabatan</th>
                    <th className="px-4 py-3 text-center">Status SDM</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  <tr className="hover:bg-slate-50/70">
                    <td className="px-4 py-3">
                      <div className="font-bold text-slate-800">Ustadz Ahmad Fauzi, S.Pd.I</div>
                      <div className="text-[10px] text-slate-400 font-mono">NIP: 19850112-201501</div>
                    </td>
                    <td className="px-4 py-3">Kepala Bagian Kurikulum & Guru</td>
                    <td className="px-4 py-3 text-right font-mono font-medium">Rp 4.500.000</td>
                    <td className="px-4 py-3 text-right font-mono font-medium">Rp 850.000</td>
                    <td className="px-4 py-3 text-right font-mono font-medium">Rp 1.200.000</td>
                    <td className="px-4 py-3 text-center">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Aktif Tetap
                      </span>
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-50/70">
                    <td className="px-4 py-3">
                      <div className="font-bold text-slate-800">Siti Rahmawati, M.Pd</div>
                      <div className="text-[10px] text-slate-400 font-mono">NIP: 19900325-201802</div>
                    </td>
                    <td className="px-4 py-3">Guru Tetap Bahasa Arab</td>
                    <td className="px-4 py-3 text-right font-mono font-medium">Rp 3.800.000</td>
                    <td className="px-4 py-3 text-right font-mono font-medium">Rp 650.000</td>
                    <td className="px-4 py-3 text-right font-mono font-medium">Rp 500.000</td>
                    <td className="px-4 py-3 text-center">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Aktif Tetap
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 2: REALISASI PENGGAJIAN & PENCAIRAN (EXISTING FULL FUNCTIONAL)   */}
      {/* ========================================================================= */}
      {subTab === 'realization' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="relative w-64">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari nama pegawai..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-500 font-medium">Rekening Kas Pencairan:</span>
                <select
                  value={selectedCashAccountId}
                  onChange={(e) => setSelectedCashAccountId(e.target.value)}
                  className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800"
                >
                  {cashAccounts.map((ca) => (
                    <option key={ca.id} value={ca.id}>
                      {ca.account_name} ({formatCurrency(ca.balance || 0)})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <button
              type="button"
              onClick={fetchData}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition"
            >
              <RotateCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-indigo-600' : 'text-slate-500'}`} />
              <span>Muat Ulang</span>
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between text-xs">
              <span className="font-bold text-slate-700">Daftar Draf Gaji Menunggu Pencairan ({activeDisbursements.length})</span>
            </div>

            {loading ? (
              <div className="p-12 flex flex-col items-center justify-center text-slate-400 gap-2">
                <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
                <span className="text-xs">Memuat daftar draf penggajian...</span>
              </div>
            ) : activeDisbursements.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-xs italic">
                Tidak ada draf penggajian yang menunggu pencairan saat ini.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3">Nama Pegawai & Periode</th>
                      <th className="px-4 py-3 text-right">Gaji Pokok</th>
                      <th className="px-4 py-3 text-right">Tunjangan</th>
                      <th className="px-4 py-3 text-right">Potongan</th>
                      <th className="px-4 py-3 text-right">Gaji Bersih (THP)</th>
                      <th className="px-4 py-3 text-center">Status</th>
                      <th className="px-4 py-3 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {activeDisbursements.map((item) => {
                      const isExpanded = !!expandedRows[item.id];
                      return (
                        <React.Fragment key={item.id}>
                          <tr className="hover:bg-slate-50/70 transition">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => toggleExpand(item.id)}
                                  className="text-slate-400 hover:text-slate-600"
                                >
                                  {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                </button>
                                <div>
                                  <p className="font-bold text-slate-800">{item.employee_name || item.user_name || 'Pegawai'}</p>
                                  <p className="text-[11px] text-slate-400 font-mono">Periode: {item.period || '-'}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-right font-mono text-slate-600">
                              {formatCurrency(item.basic_salary)}
                            </td>
                            <td className="px-4 py-3 text-right font-mono text-emerald-600 font-medium">
                              +{formatCurrency(item.total_allowances)}
                            </td>
                            <td className="px-4 py-3 text-right font-mono text-rose-600 font-medium">
                              -{formatCurrency(item.total_deductions)}
                            </td>
                            <td className="px-4 py-3 text-right font-mono font-extrabold text-slate-900 text-sm">
                              {formatCurrency(item.net_amount)}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                                <Clock className="w-3 h-3 text-amber-600 mr-1" />
                                Menunggu Pencairan
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleDisburse(item.id)}
                                  disabled={disbursingId === item.id}
                                  className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-xs transition disabled:opacity-50"
                                >
                                  {disbursingId === item.id ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  ) : (
                                    <Send className="w-3.5 h-3.5" />
                                  )}
                                  <span>Cairkan</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => openRejectModal(item)}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                                  title="Kembalikan Draf ke SDM"
                                >
                                  <XCircle className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>

                          {/* Detail Breakdown Row */}
                          {isExpanded && (
                            <tr className="bg-slate-50/50">
                              <td colSpan={7} className="px-8 py-3">
                                <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-2 text-[11px]">
                                  <span className="font-bold text-slate-700 flex items-center gap-1.5">
                                    <Info className="w-3.5 h-3.5 text-indigo-600" />
                                    Rincian Komponen Draf Gaji:
                                  </span>
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <span className="font-semibold text-emerald-700">Tunjangan:</span>
                                      <p className="text-slate-600 font-mono mt-0.5">
                                        Tunjangan Fungsional & Kinerja: {formatCurrency(item.total_allowances)}
                                      </p>
                                    </div>
                                    <div>
                                      <span className="font-semibold text-rose-700">Potongan:</span>
                                      <p className="text-slate-600 font-mono mt-0.5">
                                        Potongan BPJS & Absensi: {formatCurrency(item.total_deductions)}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 3: RIWAYAT PENGGAJIAN (HISTORI PENCAIRAN)                         */}
      {/* ========================================================================= */}
      {subTab === 'history' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="relative w-72">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Cari arsip penggajian pegawai..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <button
              type="button"
              onClick={fetchData}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition"
            >
              <RotateCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-indigo-600' : 'text-slate-500'}`} />
              <span>Muat Ulang Arsip</span>
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between text-xs">
              <span className="font-bold text-slate-700">Histori Penggajian Selesai Dicairkan ({activeDisbursements.length})</span>
            </div>

            {loading ? (
              <div className="p-12 flex flex-col items-center justify-center text-slate-400 gap-2">
                <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
                <span className="text-xs">Memuat riwayat penggajian...</span>
              </div>
            ) : activeDisbursements.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-xs italic">
                Belum ada transaksi penggajian yang telah dicairkan.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3">Nama Pegawai & Periode</th>
                      <th className="px-4 py-3">Rekening Kas Sumber</th>
                      <th className="px-4 py-3 text-right">Gaji Pokok</th>
                      <th className="px-4 py-3 text-right">Tunjangan</th>
                      <th className="px-4 py-3 text-right">Potongan</th>
                      <th className="px-4 py-3 text-right">Total Dicairkan</th>
                      <th className="px-4 py-3 text-center">Status Pembukuan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {activeDisbursements.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/70 transition">
                        <td className="px-4 py-3">
                          <p className="font-bold text-slate-800">{item.employee_name || item.user_name || 'Pegawai'}</p>
                          <p className="text-[11px] text-slate-400 font-mono">Periode: {item.period || '-'}</p>
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {item.cash_account_name || 'Rekening Kas Utama'}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-slate-600">
                          {formatCurrency(item.basic_salary)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-emerald-600 font-medium">
                          +{formatCurrency(item.total_allowances)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-rose-600 font-medium">
                          -{formatCurrency(item.total_deductions)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-extrabold text-emerald-800 text-sm">
                          {formatCurrency(item.net_amount)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            Dicairkan & Dibukukan
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {isRejectModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-800 text-sm">Kembalikan Draf Gaji ke SDM</h3>
              <button onClick={() => setIsRejectModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleConfirmReject} className="space-y-3 text-xs">
              <p className="text-slate-500">
                Masukkan catatan perbaikan draf gaji pegawai <b>{rejectingItem?.employee_name || rejectingItem?.user_name}</b>:
              </p>
              <textarea
                rows={3}
                required
                placeholder="Contoh: Tunjangan jabatan belum sesuai SK terbaru..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
              />
              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsRejectModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submittingReject}
                  className="px-4 py-2 bg-rose-600 text-white rounded-xl font-semibold shadow-xs"
                >
                  {submittingReject ? 'Memproses...' : 'Kirim Catatan Penolakan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
