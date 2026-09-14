import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../shared/store/AuthContext';
import {
  Banknote,
  Calculator,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  Plus,
  Edit2,
  ShieldCheck,
  Send,
  X,
  FileSpreadsheet,
  Lock,
  History,
  Check,
  AlertTriangle,
  FileText,
  XCircle
} from 'lucide-react';
import api from '../../../shared/services/api';

export default function Payroll() {
  const { activeSchoolUnit } = useAuth();
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [activePeriod, setActivePeriod] = useState(null);
  const [payrollItems, setPayrollItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Edit Item Modal
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [editForm, setEditForm] = useState({
    gaji_pokok: 0,
    tunjangan_jabatan: 0,
    potongan_alpa: 0,
    bpjs: 0,
    edit_reason: ''
  });
  const [submitting, setSubmitting] = useState(false);

  // Audit Logs Modal
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loadingAudit, setLoadingAudit] = useState(false);

  const fetchPayrollPeriod = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const schoolId = activeSchoolUnit?.id || 1;
      let periodId = null;

      try {
        const createRes = await api.post('/kepegawaian/payroll/periods', {
          school_unit_id: schoolId,
          period_month: selectedMonth,
          period_year: selectedYear
        });
        if (createRes.data?.success) {
          setActivePeriod(createRes.data.data);
          periodId = createRes.data.data.id;
        }
      } catch (postErr) {
        if (postErr.response?.status === 409) {
          // Periode sudah ada
        }
      }

      // Ambil items jika sudah ada
      if (periodId || activePeriod?.id) {
        const idToFetch = periodId || activePeriod.id;
        const itemsRes = await api.get(`/kepegawaian/payroll/periods/${idToFetch}/items`);
        if (itemsRes.data?.success) {
          setPayrollItems(itemsRes.data.data || []);
        }
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Gagal memuat data penggajian');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayrollPeriod();
  }, [activeSchoolUnit, selectedMonth, selectedYear]);

  const handleCalculate = async () => {
    if (!activePeriod?.id) {
      setErrorMsg('Periode payroll belum aktif. Silakan pilih bulan dan tahun.');
      return;
    }
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await api.post(`/kepegawaian/payroll/periods/${activePeriod.id}/calculate`, {});
      if (res.data?.success) {
        setPayrollItems(res.data.data || []);
        setActivePeriod({ ...activePeriod, status: 'calculated' });
        setSuccessMsg('Kalkulasi payroll berhasil diproses untuk seluruh pegawai aktif!');
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Gagal menghitung payroll');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyItem = async (itemId) => {
    try {
      const res = await api.patch(`/kepegawaian/payroll/items/${itemId}/verify`, {});
      if (res.data?.success) {
        setSuccessMsg('Rincian slip gaji pegawai berhasil diverifikasi!');
        const updated = payrollItems.map((it) => (it.id === itemId ? res.data.data : it));
        setPayrollItems(updated);
        // Refresh period status jika seluruhnya sudah verified
        const allVerified = updated.every(it => Boolean(it.verified_by));
        if (allVerified && activePeriod?.status === 'calculated') {
          setActivePeriod({ ...activePeriod, status: 'verified' });
        }
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Gagal verifikasi item');
    }
  };

  const handleLockPeriod = async () => {
    if (!window.confirm('Kunci penetapan nominal payroll untuk periode ini? Setelah dikunci, rincian slip gaji tidak dapat diedit lagi.')) return;
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await api.post(`/kepegawaian/payroll/periods/${activePeriod.id}/lock`, {});
      if (res.data?.success) {
        setActivePeriod(res.data.data);
        setSuccessMsg('Periode payroll berhasil dikunci (locked)! Siap diserahkan ke Keuangan.');
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Gagal mengunci periode payroll');
    } finally {
      setLoading(false);
    }
  };

  const handleSendToFinance = async () => {
    if (!window.confirm('Serahkan data payroll yang terkunci ini ke Modul Keuangan untuk verifikasi saldo & pencairan?')) return;
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await api.post(`/kepegawaian/payroll/periods/${activePeriod.id}/send-to-finance`, {});
      if (res.data?.success) {
        setActivePeriod(res.data.data);
        setSuccessMsg(`Berhasil! Seluruh data payroll (${res.data.total_ingested} pegawai) telah diserahkan ke Modul Keuangan.`);
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Gagal mengirim payroll ke Keuangan');
    } finally {
      setLoading(false);
    }
  };

  const fetchAuditLogs = async () => {
    if (!activePeriod?.id) return;
    setLoadingAudit(true);
    try {
      const res = await api.get(`/kepegawaian/payroll/periods/${activePeriod.id}/audit-logs`);
      if (res.data?.success) {
        setAuditLogs(res.data.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch audit logs:', err);
    } finally {
      setLoadingAudit(false);
    }
  };

  const handleOpenAuditModal = () => {
    setIsAuditModalOpen(true);
    fetchAuditLogs();
  };

  const openEditModal = (it) => {
    setSelectedItem(it);
    setEditForm({
      gaji_pokok: it.salary_components?.gaji_pokok || 0,
      tunjangan_jabatan: it.salary_components?.tunjangan_jabatan || 0,
      potongan_alpa: it.deductions?.potongan_alpa || 0,
      bpjs: it.deductions?.bpjs || 0,
      edit_reason: it.rejection_reason ? `Koreksi atas catatan Keuangan: ${it.rejection_reason}` : ''
    });
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editForm.edit_reason.trim()) {
      alert('Alasan pengubahan rincian gaji (edit_reason) wajib diisi!');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');
    try {
      const salary_components = {
        gaji_pokok: parseFloat(editForm.gaji_pokok),
        tunjangan_jabatan: parseFloat(editForm.tunjangan_jabatan)
      };
      const deductions = {
        potongan_alpa: parseFloat(editForm.potongan_alpa),
        bpjs: parseFloat(editForm.bpjs)
      };
      const net_salary = (salary_components.gaji_pokok + salary_components.tunjangan_jabatan) -
                         (deductions.potongan_alpa + deductions.bpjs);

      const res = await api.patch(`/kepegawaian/payroll/items/${selectedItem.id}`, {
        salary_components,
        deductions,
        net_salary,
        edit_reason: editForm.edit_reason
      });

      if (res.data?.success) {
        setSuccessMsg('Koreksi slip gaji berhasil disimpan dan dicatat ke log audit!');
        const updated = payrollItems.map((it) => (it.id === selectedItem.id ? res.data.data : it));
        setPayrollItems(updated);
        setIsEditModalOpen(false);
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Gagal mengoreksi item payroll');
    } finally {
      setSubmitting(false);
    }
  };

  const formatRupiah = (number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(number || 0);
  };

  const totalPayrollCost = payrollItems.reduce((acc, curr) => acc + (curr.net_salary || 0), 0);
  const unverifiedCount = payrollItems.filter(it => !it.verified_by).length;
  const isLockedOrSent = activePeriod?.status === 'locked' || activePeriod?.status === 'sent_to_finance';
  const hasReturnedItems = payrollItems.some(it => Boolean(it.rejection_reason));

  const statusSteps = [
    { key: 'draft', label: 'Draft Periode' },
    { key: 'calculated', label: 'Terkalkulasi' },
    { key: 'verified', label: 'Terverifikasi' },
    { key: 'locked', label: 'Terkunci (SDM)' },
    { key: 'sent_to_finance', label: 'Diserahkan ke Keuangan' }
  ];

  const getStepIndex = (status) => {
    switch (status) {
      case 'draft': return 0;
      case 'calculated': return 1;
      case 'verified': return 2;
      case 'locked': return 3;
      case 'sent_to_finance': return 4;
      default: return 0;
    }
  };

  const currentStepIdx = getStepIndex(activePeriod?.status || 'draft');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Perhitungan Gaji (Payroll)</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Penetapan nominal gaji berwewenang SDM, penguncian berkas & integrasi pencairan Keuangan
          </p>
        </div>
        <div className="flex items-center flex-wrap gap-2">
          <button
            onClick={fetchPayrollPeriod}
            className="p-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl transition text-xs shadow-2xs"
            title="Muat Ulang"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={handleOpenAuditModal}
            className="px-3.5 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl transition text-xs font-semibold flex items-center gap-1.5 shadow-2xs"
          >
            <History className="w-3.5 h-3.5 text-indigo-600" />
            <span>Riwayat Audit</span>
          </button>

          {!isLockedOrSent && (
            <button
              onClick={handleCalculate}
              disabled={loading}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition text-xs font-semibold flex items-center gap-1.5 shadow-xs"
            >
              <Calculator className="w-3.5 h-3.5" />
              <span>Kalkulasi Ulang Batch</span>
            </button>
          )}

          {activePeriod && !isLockedOrSent && (
            <button
              onClick={handleLockPeriod}
              disabled={loading || unverifiedCount > 0}
              className={`px-3.5 py-2 rounded-xl transition text-xs font-semibold flex items-center gap-1.5 shadow-xs ${
                unverifiedCount === 0
                  ? 'bg-amber-600 hover:bg-amber-700 text-white'
                  : 'bg-slate-100 text-slate-400 cursor-not-allowed'
              }`}
              title={unverifiedCount > 0 ? `Masih ada ${unverifiedCount} pegawai belum diverifikasi` : 'Kunci penetapan nominal gaji'}
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Kunci Periode (Lock)</span>
            </button>
          )}

          {activePeriod?.status === 'locked' && (
            <button
              onClick={handleSendToFinance}
              disabled={loading}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition text-xs font-semibold flex items-center gap-1.5 shadow-xs"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Kirim ke Keuangan</span>
            </button>
          )}

          {activePeriod?.status === 'sent_to_finance' && (
            <span className="px-3 py-1.5 bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Telah Diserahkan ke Keuangan</span>
            </span>
          )}
        </div>
      </div>

      {/* Alerts */}
      {hasReturnedItems && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
          <div>
            <strong className="block font-bold">Perhatian: Ada Slip Gaji yang Dikembalikan oleh Keuangan!</strong>
            <span>
              Bagian Keuangan meminta penyesuaian/koreksi pada beberapa slip gaji di bawah ini sebelum dapat dicairkan.
            </span>
          </div>
        </div>
      )}

      {errorMsg && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
          <span>{errorMsg}</span>
        </div>
      )}
      {successMsg && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-xl flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Progress Bar Siklus Payroll */}
      <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs space-y-3">
        <div className="flex items-center justify-between text-xs font-bold text-slate-700">
          <span>Progres Penetapan & Serah Terima Payroll:</span>
          <span className="uppercase text-indigo-700 font-mono">Status: {activePeriod?.status || 'draft'}</span>
        </div>
        <div className="grid grid-cols-5 gap-2">
          {statusSteps.map((step, idx) => {
            const isDone = idx <= currentStepIdx;
            const isCurrent = idx === currentStepIdx;
            return (
              <div key={step.key} className="space-y-1">
                <div className={`h-2 rounded-full transition-all ${
                  isDone
                    ? 'bg-indigo-600'
                    : 'bg-slate-100'
                }`} />
                <div className={`text-[10px] font-semibold flex items-center gap-1 ${
                  isCurrent
                    ? 'text-indigo-700 font-bold'
                    : isDone
                    ? 'text-slate-700'
                    : 'text-slate-400'
                }`}>
                  {isDone && <Check className="w-2.5 h-2.5 shrink-0" />}
                  <span>{step.label}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Period Selection & Summary Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div className="text-xs">
            <span className="text-slate-400 block mb-1">Periode Pembayaran:</span>
            <div className="flex items-center gap-2">
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value, 10))}
                className="p-1.5 bg-slate-50 border border-slate-200 rounded-lg font-bold text-slate-800"
              >
                {[
                  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
                  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
                ].map((m, idx) => (
                  <option key={idx + 1} value={idx + 1}>{m}</option>
                ))}
              </select>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
                className="p-1.5 bg-slate-50 border border-slate-200 rounded-lg font-bold text-slate-800"
              >
                <option value={2026}>2026</option>
                <option value={2025}>2025</option>
              </select>
            </div>
          </div>
          <span className={`px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase ${
            isLockedOrSent
              ? 'bg-amber-100 text-amber-800 border border-amber-300'
              : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
          }`}>
            {activePeriod?.status || 'draft'}
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 block mb-0.5">Pegawai Terverifikasi</span>
            <span className="text-xl font-bold text-slate-800">
              {payrollItems.length - unverifiedCount} / {payrollItems.length} Pegawai
            </span>
          </div>
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
            unverifiedCount === 0 && payrollItems.length > 0
              ? 'bg-emerald-100 text-emerald-700'
              : 'bg-indigo-50 text-indigo-600'
          }`}>
            <ShieldCheck className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 block mb-0.5">Total Beban Gaji Bersih</span>
            <span className="text-lg font-bold text-emerald-600">{formatRupiah(totalPayrollCost)}</span>
          </div>
          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Banknote className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Table Payroll Items */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px]">
            <tr>
              <th className="p-3.5">Pegawai</th>
              <th className="p-3.5">Komponen Gaji</th>
              <th className="p-3.5">Potongan</th>
              <th className="p-3.5">Gaji Bersih (Net)</th>
              <th className="p-3.5">Verifikasi HRD</th>
              <th className="p-3.5 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan="6" className="p-8 text-center text-slate-400">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-600" />
                  <span>Memuat rincian payroll...</span>
                </td>
              </tr>
            ) : payrollItems.length === 0 ? (
              <tr>
                <td colSpan="6" className="p-8 text-center text-slate-400">
                  <div className="mb-2">Belum ada rincian payroll untuk periode ini</div>
                  <button
                    onClick={handleCalculate}
                    className="px-3 py-1.5 bg-indigo-600 text-white rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 shadow-2xs"
                  >
                    <Calculator className="w-3.5 h-3.5" />
                    <span>Generate Payroll Pegawai Aktif</span>
                  </button>
                </td>
              </tr>
            ) : (
              payrollItems.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50 transition">
                  <td className="p-3.5">
                    <div className="font-bold text-slate-800">{item.employee_name || `Pegawai #${item.employee_id}`}</div>
                    <div className="text-[10px] text-slate-400">{item.employee_number || ''}</div>
                    {item.rejection_reason && (
                      <div className="mt-1 p-2 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-[11px] flex items-start gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold text-rose-700 block">Dikembalikan oleh Keuangan:</span>
                          <span>{item.rejection_reason}</span>
                        </div>
                      </div>
                    )}
                  </td>
                  <td className="p-3.5 text-[11px] text-slate-600 space-y-0.5">
                    <div>Pokok: {formatRupiah(item.salary_components?.gaji_pokok)}</div>
                    <div>Tunjangan: {formatRupiah(item.salary_components?.tunjangan_jabatan)}</div>
                  </td>
                  <td className="p-3.5 text-[11px] text-rose-600 space-y-0.5">
                    <div>BPJS: {formatRupiah(item.deductions?.bpjs)}</div>
                    {item.deductions?.potongan_alpa > 0 && (
                      <div>Alpa: {formatRupiah(item.deductions?.potongan_alpa)}</div>
                    )}
                  </td>
                  <td className="p-3.5 font-bold text-emerald-700 text-sm font-mono">
                    {formatRupiah(item.net_salary)}
                  </td>
                  <td className="p-3.5">
                    {item.rejection_reason ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200" title={item.rejection_reason}>
                        <XCircle className="w-3 h-3 text-rose-500" />
                        <span>Perlu Koreksi</span>
                      </span>
                    ) : item.verified_by ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>Diverifikasi</span>
                      </span>
                    ) : (
                      <span className="text-[11px] text-amber-600 font-semibold">Menunggu Verifikasi</span>
                    )}
                  </td>
                  <td className="p-3.5 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {!item.verified_by && !isLockedOrSent && (
                        <button
                          onClick={() => handleVerifyItem(item.id)}
                          className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-[10px] font-bold flex items-center gap-1"
                          title="Verifikasi Item"
                        >
                          <ShieldCheck className="w-3 h-3" />
                          <span>Verifikasi</span>
                        </button>
                      )}
                      <button
                        onClick={() => openEditModal(item)}
                        disabled={isLockedOrSent}
                        className={`p-1.5 rounded-lg ${
                          isLockedOrSent
                            ? 'bg-slate-100 text-slate-300 cursor-not-allowed'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                        title={isLockedOrSent ? 'Periode sudah terkunci' : 'Edit Komponen'}
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Edit Komponen Gaji */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full text-xs space-y-3">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-800 text-sm">Koreksi Slip Gaji Pegawai</h3>
                <p className="text-[10px] text-slate-400">Setiap perubahan wajib menyertakan alasan koreksi</p>
              </div>
              <button onClick={() => setIsEditModalOpen(false)}><X className="w-4 h-4 text-slate-400" /></button>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl font-semibold text-slate-700">
              {selectedItem?.employee_name} ({selectedItem?.employee_number})
            </div>
            <form onSubmit={handleSaveEdit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Gaji Pokok (Rp)</label>
                  <input
                    type="number"
                    value={editForm.gaji_pokok}
                    onChange={(e) => setEditForm({ ...editForm, gaji_pokok: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Tunjangan Jabatan (Rp)</label>
                  <input
                    type="number"
                    value={editForm.tunjangan_jabatan}
                    onChange={(e) => setEditForm({ ...editForm, tunjangan_jabatan: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Potongan BPJS (Rp)</label>
                  <input
                    type="number"
                    value={editForm.bpjs}
                    onChange={(e) => setEditForm({ ...editForm, bpjs: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Potongan Alpa (Rp)</label>
                  <input
                    type="number"
                    value={editForm.potongan_alpa}
                    onChange={(e) => setEditForm({ ...editForm, potongan_alpa: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-rose-700 block mb-1">
                  Alasan Koreksi (edit_reason) <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={2}
                  value={editForm.edit_reason}
                  onChange={(e) => setEditForm({ ...editForm, edit_reason: e.target.value })}
                  placeholder="Wajib mencatat alasan penyesuaian nominal gaji..."
                  className="w-full p-2 bg-rose-50/40 border border-rose-200 rounded-xl text-xs"
                />
              </div>

              <div className="p-3 bg-emerald-50 rounded-xl text-emerald-800 font-bold flex justify-between">
                <span>Estimasi Net Salary:</span>
                <span className="font-mono">
                  {formatRupiah(
                    (parseFloat(editForm.gaji_pokok || 0) + parseFloat(editForm.tunjangan_jabatan || 0)) -
                    (parseFloat(editForm.bpjs || 0) + parseFloat(editForm.potongan_alpa || 0))
                  )}
                </span>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button type="button" onClick={() => setIsEditModalOpen(false)} className="px-3 py-1.5 bg-slate-100 rounded-xl">Batal</button>
                <button type="submit" disabled={submitting} className="px-3 py-1.5 bg-indigo-600 text-white rounded-xl font-semibold">Simpan Koreksi</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Riwayat Audit Trail Payroll */}
      {isAuditModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 max-w-2xl w-full max-h-[85vh] flex flex-col text-xs space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                  <History className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-sm">Riwayat Jejak Audit Payroll</h3>
                  <p className="text-[11px] text-slate-400">Catatan setiap tindakan: kalkulasi, koreksi, penguncian & serah terima</p>
                </div>
              </div>
              <button onClick={() => setIsAuditModalOpen(false)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
              {loadingAudit ? (
                <div className="py-12 text-center text-slate-400">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-600" />
                  <span>Memuat histori audit payroll...</span>
                </div>
              ) : auditLogs.length === 0 ? (
                <div className="py-12 text-center text-slate-400 italic">
                  Belum ada catatan log audit pada periode ini
                </div>
              ) : (
                auditLogs.map((log) => (
                  <div key={log.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200/70 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        log.action === 'LOCK_PERIOD' ? 'bg-amber-100 text-amber-800' :
                        log.action === 'SEND_TO_FINANCE' ? 'bg-emerald-100 text-emerald-800' :
                        log.action === 'EDIT_ITEM' ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' :
                        log.action === 'RETURNED_FOR_CORRECTION' ? 'bg-rose-100 text-rose-800' :
                        'bg-slate-200 text-slate-700'
                      }`}>
                        {log.action}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(log.created_at).toLocaleString('id-ID')}
                      </span>
                    </div>

                    {log.reason && (
                      <div className="text-slate-700 font-medium">
                        <strong>Alasan/Keterangan:</strong> {log.reason}
                      </div>
                    )}

                    {log.data_before && (
                      <div className="text-[11px] text-slate-500 font-mono bg-white p-2 rounded-lg border border-slate-100">
                        <div>Sebelum: Net Rp {(log.data_before.net_salary || 0).toLocaleString('id-ID')}</div>
                        {log.data_after && <div>Sesudah: Net Rp {(log.data_after.net_salary || 0).toLocaleString('id-ID')}</div>}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setIsAuditModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold"
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
