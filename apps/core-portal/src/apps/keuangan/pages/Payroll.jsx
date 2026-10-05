import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../shared/store/AuthContext';
import api from '../../../shared/services/api';
import StatRibbonCard from '../../../shared/components/StatRibbonCard';
import StatusPill from '../../../shared/components/StatusPill';
import FlatAlertBanner from '../../../shared/components/FlatAlertBanner';
import {
  formatCurrency,
  formatNumber
} from '../../../shared/utils/formatters';
import {
  Coins,
  CheckCircle2,
  Clock,
  Send,
  Loader2,
  Wallet,
  RotateCw,
  XCircle,
  ChevronDown,
  ChevronRight,
  Info,
  X,
  Search,
  Users,
  Briefcase,
  History,
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

  const pendingDisbursements = disbursements.filter(d => d.status !== 'disbursed');
  const disbursedDisbursements = disbursements.filter(d => d.status === 'disbursed');

  // Realization summary totals
  const totalPendingNet = pendingDisbursements.reduce((sum, d) => sum + parseFloat(d.net_amount || 0), 0);
  const totalPendingBasic = pendingDisbursements.reduce((sum, d) => sum + parseFloat(d.basic_salary || 0), 0);
  const totalPendingAllowances = pendingDisbursements.reduce((sum, d) => sum + parseFloat(d.total_allowances || 0), 0);
  const totalPendingDeductions = pendingDisbursements.reduce((sum, d) => sum + parseFloat(d.total_deductions || 0), 0);

  // History summary totals
  const totalHistoryNet = disbursedDisbursements.reduce((sum, d) => sum + parseFloat(d.net_amount || 0), 0);
  const totalHistoryAllowances = disbursedDisbursements.reduce((sum, d) => sum + parseFloat(d.total_allowances || 0), 0);
  const totalHistoryDeductions = disbursedDisbursements.reduce((sum, d) => sum + parseFloat(d.total_deductions || 0), 0);

  return (
    <div className="space-y-4">
      {/* Sub-Tabs Switcher */}
      <div className="flex border-b border-slate-200 gap-4 sm:gap-6 overflow-x-auto">
        <button
          type="button"
          onClick={() => setSubTab('realization')}
          className={`pb-2.5 text-xs font-semibold flex items-center gap-2 border-b-2 transition shrink-0 ${
            subTab === 'realization'
              ? 'border-emerald-600 text-emerald-700 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Coins className="w-4 h-4" />
          <span>Realisasi Penggajian &amp; Pencairan</span>
          {pendingDisbursements.length > 0 && (
            <StatusPill variant="warning">
              {formatNumber(pendingDisbursements.length)} draf
            </StatusPill>
          )}
        </button>

        <button
          type="button"
          onClick={() => setSubTab('setting')}
          className={`pb-2.5 text-xs font-semibold flex items-center gap-2 border-b-2 transition shrink-0 ${
            subTab === 'setting'
              ? 'border-emerald-600 text-emerald-700 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Penetapan Gaji Pegawai (SDM)</span>
        </button>

        <button
          type="button"
          onClick={() => setSubTab('history')}
          className={`pb-2.5 text-xs font-semibold flex items-center gap-2 border-b-2 transition shrink-0 ${
            subTab === 'history'
              ? 'border-emerald-600 text-emerald-700 font-bold'
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
          <FlatAlertBanner
            variant="info"
            title="Penetapan Komponen & Standar Gaji Pegawai"
            description="Data struktur gaji, tunjangan tetap, tunjangan fungsional, dan tarif honor mengajar dirumuskan melalui modul Kepegawaian (SDM). Bagian Keuangan menerima draf resmi untuk diverifikasi dan dicairkan."
            action={
              <button
                type="button"
                onClick={() => alert('Fitur sinkronisasi langsung dengan modul Kepegawaian (SDM) akan dihubungkan pada sesi integrasi berikutnya.')}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-2xs transition shrink-0 flex items-center gap-1.5"
              >
                <RotateCw className="w-3.5 h-3.5" />
                <span>Tarik Draf dari SDM</span>
              </button>
            }
          />

          {/* Layout Struktur Gaji */}
          <div className="bg-white rounded-lg border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="p-3.5 border-b border-slate-100 flex items-center justify-between text-xs">
              <span className="font-bold uppercase tracking-wide text-slate-700">Daftar Penetapan Standar Gaji Pegawai (Pratinjau Struktur)</span>
              <span className="text-slate-400">Total Karyawan: 42</span>
            </div>
            <div className="overflow-x-auto table-container">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="px-3.5 py-2.5 text-[11px] uppercase tracking-wide">Nama Pegawai &amp; NIP</th>
                    <th className="px-3.5 py-2.5 text-[11px] uppercase tracking-wide">Jabatan &amp; Unit</th>
                    <th className="px-3.5 py-2.5 text-right num-cell text-[11px] uppercase tracking-wide">Gaji Pokok</th>
                    <th className="px-3.5 py-2.5 text-right num-cell text-[11px] uppercase tracking-wide">Tunjangan Tetap</th>
                    <th className="px-3.5 py-2.5 text-right num-cell text-[11px] uppercase tracking-wide">Tunjangan Jabatan</th>
                    <th className="px-3.5 py-2.5 text-center text-[11px] uppercase tracking-wide">Status SDM</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  <tr className="hover:bg-slate-50/60 transition">
                    <td className="px-3.5 py-2.5">
                      <div className="font-bold text-slate-800">Ustadz Ahmad Fauzi, S.Pd.I</div>
                      <div className="text-[10px] text-slate-400 font-mono">NIP: 19850112-201501</div>
                    </td>
                    <td className="px-3.5 py-2.5">Kepala Bagian Kurikulum &amp; Guru</td>
                    <td className="px-3.5 py-2.5 num-cell font-medium tnum">Rp 4.500.000</td>
                    <td className="px-3.5 py-2.5 num-cell font-medium tnum">Rp 850.000</td>
                    <td className="px-3.5 py-2.5 num-cell font-medium tnum">Rp 1.200.000</td>
                    <td className="px-3.5 py-2.5 text-center">
                      <StatusPill variant="success">
                        Aktif Tetap
                      </StatusPill>
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-50/60 transition">
                    <td className="px-3.5 py-2.5">
                      <div className="font-bold text-slate-800">Siti Rahmawati, M.Pd</div>
                      <div className="text-[10px] text-slate-400 font-mono">NIP: 19900325-201802</div>
                    </td>
                    <td className="px-3.5 py-2.5">Guru Tetap Bahasa Arab</td>
                    <td className="px-3.5 py-2.5 num-cell font-medium tnum">Rp 3.800.000</td>
                    <td className="px-3.5 py-2.5 num-cell font-medium tnum">Rp 650.000</td>
                    <td className="px-3.5 py-2.5 num-cell font-medium tnum">Rp 500.000</td>
                    <td className="px-3.5 py-2.5 text-center">
                      <StatusPill variant="success">
                        Aktif Tetap
                      </StatusPill>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 2: REALISASI PENGGAJIAN & PENCAIRAN                               */}
      {/* ========================================================================= */}
      {subTab === 'realization' && (
        <div className="space-y-4">
          {/* KPI Ribbon Realisasi Penggajian */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <StatRibbonCard
              status="warning"
              label="Total THP Menunggu Cair"
              value={formatCurrency(totalPendingNet)}
              icon={Coins}
              context={`${formatNumber(pendingDisbursements.length)} Pegawai diproses`}
            />
            <StatRibbonCard
              status="info"
              label="Total Gaji Pokok"
              value={formatCurrency(totalPendingBasic)}
              icon={Briefcase}
            />
            <StatRibbonCard
              status="success"
              label="Total Tunjangan"
              value={formatCurrency(totalPendingAllowances)}
              icon={Wallet}
            />
            <StatRibbonCard
              status="danger"
              label="Total Potongan"
              value={formatCurrency(totalPendingDeductions)}
              icon={ArrowDownRight}
            />
          </div>

          {/* Filter & Toolbar */}
          <div className="bg-white p-3 rounded-lg border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative w-64">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari nama pegawai..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-500 font-medium">Kas Sumber:</span>
                <select
                  value={selectedCashAccountId}
                  onChange={(e) => setSelectedCashAccountId(e.target.value)}
                  className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-semibold text-slate-800"
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
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg shadow-2xs transition disabled:opacity-60"
            >
              <RotateCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-emerald-600' : 'text-slate-500'}`} />
              <span>Muat Ulang</span>
            </button>
          </div>

          {/* Tabel Draf Gaji */}
          <div className="bg-white rounded-lg border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="p-3.5 border-b border-slate-100 flex items-center justify-between text-xs">
              <span className="font-bold uppercase tracking-wide text-slate-700">Daftar Draf Gaji Menunggu Pencairan ({formatNumber(activeDisbursements.length)})</span>
            </div>

            {loading ? (
              <div className="p-12 flex flex-col items-center justify-center text-slate-400 gap-2">
                <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
                <span className="text-xs">Memuat daftar draf penggajian...</span>
              </div>
            ) : activeDisbursements.length === 0 ? (
              <div className="p-10 text-center text-slate-400 text-xs italic">
                Tidak ada draf penggajian yang menunggu pencairan saat ini.
              </div>
            ) : (
              <div className="overflow-x-auto table-container">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="px-3.5 py-2.5 text-[11px] uppercase tracking-wide">Nama Pegawai &amp; Periode</th>
                      <th className="px-3.5 py-2.5 text-right num-cell text-[11px] uppercase tracking-wide">Gaji Pokok</th>
                      <th className="px-3.5 py-2.5 text-right num-cell text-[11px] uppercase tracking-wide">Tunjangan</th>
                      <th className="px-3.5 py-2.5 text-right num-cell text-[11px] uppercase tracking-wide">Potongan</th>
                      <th className="px-3.5 py-2.5 text-right num-cell text-[11px] uppercase tracking-wide">Gaji Bersih (THP)</th>
                      <th className="px-3.5 py-2.5 text-center text-[11px] uppercase tracking-wide">Status</th>
                      <th className="px-3.5 py-2.5 text-right text-[11px] uppercase tracking-wide">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {activeDisbursements.map((item) => {
                      const isExpanded = !!expandedRows[item.id];
                      return (
                        <React.Fragment key={item.id}>
                          <tr className="hover:bg-slate-50/60 transition">
                            <td className="px-3.5 py-2.5">
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => toggleExpand(item.id)}
                                  className="text-slate-400 hover:text-slate-600"
                                >
                                  {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                                </button>
                                <div>
                                  <p className="font-bold text-slate-800">{item.employee_name || item.user_name || 'Pegawai'}</p>
                                  <p className="text-[10px] text-slate-400 font-mono">Periode: {item.period || '-'}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-3.5 py-2.5 num-cell text-slate-600 tnum">
                              {formatCurrency(item.basic_salary)}
                            </td>
                            <td className="px-3.5 py-2.5 num-cell text-emerald-600 font-medium tnum">
                              +{formatCurrency(item.total_allowances)}
                            </td>
                            <td className="px-3.5 py-2.5 num-cell text-rose-600 font-medium tnum">
                              -{formatCurrency(item.total_deductions)}
                            </td>
                            <td className="px-3.5 py-2.5 num-cell font-bold text-slate-900 tnum">
                              {formatCurrency(item.net_amount)}
                            </td>
                            <td className="px-3.5 py-2.5 text-center">
                              <StatusPill variant="warning">
                                <Clock className="w-3 h-3 mr-0.5" />
                                Menunggu Pencairan
                              </StatusPill>
                            </td>
                            <td className="px-3.5 py-2.5 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleDisburse(item.id)}
                                  disabled={disbursingId === item.id}
                                  className="flex items-center gap-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-lg shadow-2xs transition disabled:opacity-50"
                                >
                                  {disbursingId === item.id ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                  ) : (
                                    <Send className="w-3 h-3" />
                                  )}
                                  <span>Cairkan</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => openRejectModal(item)}
                                  className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition"
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
                              <td colSpan={7} className="px-6 py-2.5">
                                <div className="p-2.5 bg-white border border-slate-200 rounded-lg space-y-1.5 text-xs">
                                  <span className="font-bold text-slate-700 flex items-center gap-1.5 text-[11px]">
                                    <Info className="w-3.5 h-3.5 text-indigo-600" />
                                    Rincian Komponen Draf Gaji:
                                  </span>
                                  <div className="grid grid-cols-2 gap-3 text-[11px]">
                                    <div>
                                      <span className="font-semibold text-emerald-700">Tunjangan:</span>
                                      <p className="text-slate-600 tnum mt-0.5">
                                        Tunjangan Fungsional &amp; Kinerja: {formatCurrency(item.total_allowances)}
                                      </p>
                                    </div>
                                    <div>
                                      <span className="font-semibold text-rose-700">Potongan:</span>
                                      <p className="text-slate-600 tnum mt-0.5">
                                        Potongan BPJS &amp; Absensi: {formatCurrency(item.total_deductions)}
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
          {/* KPI Ribbon Histori Penggajian */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <StatRibbonCard
              status="success"
              label="Total Gaji Dicairkan"
              value={formatCurrency(totalHistoryNet)}
              icon={CheckCircle2}
              context={`${formatNumber(disbursedDisbursements.length)} Transaksi selesai`}
            />
            <StatRibbonCard
              status="info"
              label="Total Tunjangan Terbayar"
              value={formatCurrency(totalHistoryAllowances)}
              icon={Wallet}
            />
            <StatRibbonCard
              status="danger"
              label="Total Potongan Terlaksana"
              value={formatCurrency(totalHistoryDeductions)}
              icon={ArrowDownRight}
            />
          </div>

          <div className="bg-white p-3 rounded-lg border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative w-72">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Cari arsip penggajian pegawai..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <button
              type="button"
              onClick={fetchData}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg shadow-2xs transition disabled:opacity-60"
            >
              <RotateCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-emerald-600' : 'text-slate-500'}`} />
              <span>Muat Ulang Arsip</span>
            </button>
          </div>

          <div className="bg-white rounded-lg border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="p-3.5 border-b border-slate-100 flex items-center justify-between text-xs">
              <span className="font-bold uppercase tracking-wide text-slate-700">Histori Penggajian Selesai Dicairkan ({formatNumber(activeDisbursements.length)})</span>
            </div>

            {loading ? (
              <div className="p-12 flex flex-col items-center justify-center text-slate-400 gap-2">
                <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
                <span className="text-xs">Memuat riwayat penggajian...</span>
              </div>
            ) : activeDisbursements.length === 0 ? (
              <div className="p-10 text-center text-slate-400 text-xs italic">
                Belum ada transaksi penggajian yang telah dicairkan.
              </div>
            ) : (
              <div className="overflow-x-auto table-container">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="px-3.5 py-2.5 text-[11px] uppercase tracking-wide">Nama Pegawai &amp; Periode</th>
                      <th className="px-3.5 py-2.5 text-[11px] uppercase tracking-wide">Rekening Kas Sumber</th>
                      <th className="px-3.5 py-2.5 text-right num-cell text-[11px] uppercase tracking-wide">Gaji Pokok</th>
                      <th className="px-3.5 py-2.5 text-right num-cell text-[11px] uppercase tracking-wide">Tunjangan</th>
                      <th className="px-3.5 py-2.5 text-right num-cell text-[11px] uppercase tracking-wide">Potongan</th>
                      <th className="px-3.5 py-2.5 text-right num-cell text-[11px] uppercase tracking-wide">Total Dicairkan</th>
                      <th className="px-3.5 py-2.5 text-center text-[11px] uppercase tracking-wide">Status Pembukuan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {activeDisbursements.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/60 transition">
                        <td className="px-3.5 py-2.5">
                          <p className="font-bold text-slate-800">{item.employee_name || item.user_name || 'Pegawai'}</p>
                          <p className="text-[10px] text-slate-400 font-mono">Periode: {item.period || '-'}</p>
                        </td>
                        <td className="px-3.5 py-2.5 text-slate-600">
                          {item.cash_account_name || 'Rekening Kas Utama'}
                        </td>
                        <td className="px-3.5 py-2.5 num-cell text-slate-600 tnum">
                          {formatCurrency(item.basic_salary)}
                        </td>
                        <td className="px-3.5 py-2.5 num-cell text-emerald-600 font-medium tnum">
                          +{formatCurrency(item.total_allowances)}
                        </td>
                        <td className="px-3.5 py-2.5 num-cell text-rose-600 font-medium tnum">
                          -{formatCurrency(item.total_deductions)}
                        </td>
                        <td className="px-3.5 py-2.5 num-cell font-bold text-emerald-700 tnum">
                          {formatCurrency(item.net_amount)}
                        </td>
                        <td className="px-3.5 py-2.5 text-center">
                          <StatusPill variant="success">
                            <CheckCircle2 className="w-3 h-3 mr-0.5" />
                            Dicairkan &amp; Dibukukan
                          </StatusPill>
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
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-4 shadow-xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wide">Kembalikan Draf Gaji ke SDM</h3>
              <button type="button" onClick={() => setIsRejectModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleConfirmReject} className="space-y-3 text-xs">
              <p className="text-slate-600">
                Masukkan catatan perbaikan draf gaji pegawai <b>{rejectingItem?.employee_name || rejectingItem?.user_name}</b>:
              </p>
              <textarea
                rows={3}
                required
                placeholder="Contoh: Tunjangan jabatan belum sesuai SK terbaru..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
              />
              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsRejectModalOpen(false)}
                  className="px-3 py-1.5 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-lg font-semibold transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submittingReject}
                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-semibold shadow-2xs transition"
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
