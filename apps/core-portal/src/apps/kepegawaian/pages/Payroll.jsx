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
  FileSpreadsheet
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
    bpjs: 0
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchPayrollPeriod = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      // 1. Buat atau ambil periode
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
          // Periode sudah ada, ambil rinciannya via kalkulasi / items
          // Kita asumsikan ID periode dari 1 atau query items
        }
      }

      // 2. Ambil items jika sudah ada
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
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Gagal verifikasi item');
    }
  };

  const handleSendToFinance = async () => {
    if (!window.confirm('Kirim rekapitulasi payroll ini ke Modul Keuangan untuk pencairan?')) return;
    try {
      const res = await api.patch(`/kepegawaian/payroll/periods/${activePeriod.id}/status`, {
        status: 'sent_to_finance'
      });
      if (res.data?.success) {
        setActivePeriod(res.data.data);
        setSuccessMsg('Status payroll diperbarui: Siap dicairkan oleh Keuangan (sent_to_finance)!');
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Gagal mengirim ke keuangan');
    }
  };

  const openEditModal = (it) => {
    setSelectedItem(it);
    setEditForm({
      gaji_pokok: it.salary_components?.gaji_pokok || 0,
      tunjangan_jabatan: it.salary_components?.tunjangan_jabatan || 0,
      potongan_alpa: it.deductions?.potongan_alpa || 0,
      bpjs: it.deductions?.bpjs || 0
    });
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
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
        net_salary
      });

      if (res.data?.success) {
        setSuccessMsg('Koreksi slip gaji berhasil disimpan');
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Perhitungan Gaji (Payroll)</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Otomatisasi kalkulasi gaji berkala, koreksi tunjangan/potongan, dan verifikasi slip
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchPayrollPeriod}
            className="p-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl transition text-xs shadow-2xs"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={handleCalculate}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition text-xs font-semibold flex items-center gap-2 shadow-sm"
          >
            <Calculator className="w-4 h-4" />
            <span>Kalkulasi Ulang Batch</span>
          </button>
          {activePeriod && activePeriod.status !== 'sent_to_finance' && (
            <button
              onClick={handleSendToFinance}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition text-xs font-semibold flex items-center gap-2 shadow-sm"
            >
              <Send className="w-4 h-4" />
              <span>Kirim ke Keuangan</span>
            </button>
          )}
        </div>
      </div>

      {/* Alerts */}
      {errorMsg && (
        <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
          <span>{errorMsg}</span>
        </div>
      )}
      {successMsg && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-xl flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Period Selection & Summary Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
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
          <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase bg-indigo-50 text-indigo-700 border border-indigo-200">
            {activePeriod?.status || 'draft'}
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 block mb-0.5">Total Pegawai Terdata</span>
            <span className="text-xl font-bold text-slate-800">{payrollItems.length} Orang</span>
          </div>
          <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 block mb-0.5">Estimasi Total Pengeluaran Gaji</span>
            <span className="text-lg font-bold text-emerald-600">{formatRupiah(totalPayrollCost)}</span>
          </div>
          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Banknote className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Table Payroll Items */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
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
                  <td className="p-3.5 font-bold text-emerald-700 text-sm">
                    {formatRupiah(item.net_salary)}
                  </td>
                  <td className="p-3.5">
                    {item.verified_by ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>Diverifikasi</span>
                      </span>
                    ) : (
                      <span className="text-[11px] text-slate-400">Belum Verifikasi</span>
                    )}
                  </td>
                  <td className="p-3.5 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {!item.verified_by && (
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
                        className="p-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200"
                        title="Edit Komponen"
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
          <div className="bg-white rounded-2xl p-6 max-w-md w-full text-xs">
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 text-sm">Koreksi Slip Gaji Pegawai</h3>
              <button onClick={() => setIsEditModalOpen(false)}><X className="w-4 h-4 text-slate-400" /></button>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl mb-3 font-semibold text-slate-700">
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
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Tunjangan Jabatan (Rp)</label>
                  <input
                    type="number"
                    value={editForm.tunjangan_jabatan}
                    onChange={(e) => setEditForm({ ...editForm, tunjangan_jabatan: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Potongan BPJS (Rp)</label>
                  <input
                    type="number"
                    value={editForm.bpjs}
                    onChange={(e) => setEditForm({ ...editForm, bpjs: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Potongan Alpa (Rp)</label>
                  <input
                    type="number"
                    value={editForm.potongan_alpa}
                    onChange={(e) => setEditForm({ ...editForm, potongan_alpa: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="p-3 bg-emerald-50 rounded-xl text-emerald-800 font-bold flex justify-between">
                <span>Estimasi Net Salary:</span>
                <span>
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
    </div>
  );
}
