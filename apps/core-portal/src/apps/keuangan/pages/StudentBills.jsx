import React, { useState, useEffect } from 'react';
import api from '../../../shared/services/api';
import {
  Receipt,
  Plus,
  Filter,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  Ban,
  Bell,
  Loader2,
  Eye,
  X
} from 'lucide-react';

export default function StudentBills() {
  const [bills, setBills] = useState([]);
  const [feeTypes, setFeeTypes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [feeTypeFilter, setFeeTypeFilter] = useState('');

  // Generate Modal & Simulation States
  const [generateModalOpen, setGenerateModalOpen] = useState(false);
  const [previewResult, setPreviewResult] = useState(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [genParams, setGenParams] = useState({
    fee_type_id: 1,
    period_month: 8,
    period_year: 2026,
    target: 'all'
  });

  // Cancel Modal State
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [selectedBill, setSelectedBill] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);

  const fetchBills = async () => {
    setLoading(true);
    try {
      let url = '/keuangan/student-bills?';
      if (statusFilter) url += `status=${statusFilter}&`;
      if (feeTypeFilter) url += `fee_type_id=${feeTypeFilter}&`;

      const res = await api.get(url);
      setBills(res.data?.data || []);
    } catch (err) {
      console.error('Error fetching bills:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchFeeTypes = async () => {
    try {
      const res = await api.get('/keuangan/fee-types');
      setFeeTypes(res.data?.data || []);
      if (res.data?.data?.[0]) {
        setGenParams((prev) => ({ ...prev, fee_type_id: res.data.data[0].id }));
      }
    } catch (err) {
      console.error('Error fetching fee types:', err);
    }
  };

  useEffect(() => {
    fetchFeeTypes();
  }, []);

  useEffect(() => {
    fetchBills();
  }, [statusFilter, feeTypeFilter]);

  const handlePreviewGeneration = async (e) => {
    e.preventDefault();
    setIsSimulating(true);
    try {
      const res = await api.post('/keuangan/student-bills/generate/preview', genParams);
      setPreviewResult(res.data?.data);
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal melakukan simulasi pembuatan tagihan');
    } finally {
      setIsSimulating(false);
    }
  };

  const handleExecuteGenerate = async () => {
    if (!window.confirm(`Konfirmasi generate ${previewResult?.total_students || 0} tagihan ke database?`)) return;
    setIsGenerating(true);
    try {
      const res = await api.post('/keuangan/student-bills/generate', genParams);
      alert(`Berhasil membuat ${res.data?.data?.generated_count || 0} tagihan baru!`);
      setGenerateModalOpen(false);
      setPreviewResult(null);
      fetchBills();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal men-generate tagihan');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCancelBill = async (e) => {
    e.preventDefault();
    if (!selectedBill) return;
    setCancelling(true);
    try {
      await api.patch(`/keuangan/student-bills/${selectedBill.id}/cancel`, {
        cancel_reason: cancelReason
      });
      setCancelModalOpen(false);
      setSelectedBill(null);
      setCancelReason('');
      fetchBills();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal membatalkan tagihan');
    } finally {
      setCancelling(false);
    }
  };

  const handleRunReminders = async () => {
    if (!window.confirm('Kirim pengingat (reminder) otomatis untuk tagihan belum lunas?')) return;
    try {
      const res = await api.post('/keuangan/student-bills/reminders/run');
      alert(res.data?.message || 'Reminder berhasil diproses');
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal memproses reminder');
    }
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val || 0);
  };

  return (
    <div className="space-y-6">
      {/* Header Tagihan */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800 tracking-tight">Tagihan Biaya Pendidikan Siswa</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Generate tagihan massal otomatis dengan kalkulasi beasiswa, daftar piutang & reminder penagihan
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleRunReminders}
            className="flex items-center gap-1.5 px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-700 text-xs font-semibold rounded-xl transition"
          >
            <Bell className="w-3.5 h-3.5" />
            <span>Kirim Reminder</span>
          </button>
          <button
            type="button"
            onClick={() => { setPreviewResult(null); setGenerateModalOpen(true); }}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-xs transition"
          >
            <Plus className="w-4 h-4" />
            <span>Generate Tagihan Massal</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
            >
              <option value="">Semua Status</option>
              <option value="unpaid">Belum Lunas (Unpaid)</option>
              <option value="partially_paid">Dibayar Sebagian</option>
              <option value="paid">Lunas (Paid)</option>
              <option value="cancelled">Dibatalkan</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500">Jenis Biaya:</span>
            <select
              value={feeTypeFilter}
              onChange={(e) => setFeeTypeFilter(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
            >
              <option value="">Semua Jenis Biaya</option>
              {feeTypes.map((ft) => (
                <option key={ft.id} value={ft.id}>{ft.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="text-xs text-slate-400">
          Ditemukan <strong className="text-slate-700">{bills.length}</strong> data tagihan
        </div>
      </div>

      {/* Table Tagihan */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2">
            <Loader2 className="w-6 h-6 text-emerald-600 animate-spin" />
            <p className="text-xs text-slate-400">Memuat data tagihan...</p>
          </div>
        ) : bills.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-xs italic">
            Tidak ada tagihan yang sesuai dengan filter
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3">No. Tagihan</th>
                  <th className="px-5 py-3">Nama Siswa</th>
                  <th className="px-5 py-3">Jenis Biaya</th>
                  <th className="px-5 py-3">Periode</th>
                  <th className="px-5 py-3">Jatuh Tempo</th>
                  <th className="px-5 py-3 text-right">Nominal</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {bills.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50/60 transition">
                    <td className="px-5 py-3.5 font-mono font-bold text-slate-600">#{b.id}</td>
                    <td className="px-5 py-3.5 font-bold text-slate-800">{b.student_name || `Siswa ID ${b.student_id}`}</td>
                    <td className="px-5 py-3.5 text-slate-700">{b.fee_type_name}</td>
                    <td className="px-5 py-3.5 text-slate-500">
                      {b.period_month ? `${b.period_month}/${b.period_year}` : b.period_year}
                    </td>
                    <td className="px-5 py-3.5 text-slate-500">{b.due_date ? b.due_date.slice(0, 10) : '-'}</td>
                    <td className="px-5 py-3.5 text-right font-bold text-slate-800">{formatCurrency(b.amount)}</td>
                    <td className="px-5 py-3.5">
                      {b.status === 'paid' && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-700 flex items-center gap-1 w-fit">
                          <CheckCircle2 className="w-3 h-3" /> Lunas
                        </span>
                      )}
                      {b.status === 'partially_paid' && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700">
                          Sebagian
                        </span>
                      )}
                      {b.status === 'unpaid' && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-700 flex items-center gap-1 w-fit">
                          <Clock className="w-3 h-3" /> Belum Bayar
                        </span>
                      )}
                      {b.status === 'cancelled' && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-500">
                          Dibatalkan
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      {b.status === 'unpaid' && (
                        <button
                          type="button"
                          onClick={() => { setSelectedBill(b); setCancelModalOpen(true); }}
                          title="Batalkan Tagihan"
                          className="p-1.5 text-slate-400 hover:text-red-600 rounded"
                        >
                          <Ban className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Generate Tagihan Massal dengan Simulasi Preview */}
      {generateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-xl w-full p-6 border border-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div>
                <h2 className="text-sm font-bold text-slate-800">Generate Tagihan Massal</h2>
                <p className="text-[11px] text-slate-400">Simulasikan perhitungan beasiswa & nominal sebelum dieksekusi</p>
              </div>
              <button type="button" onClick={() => setGenerateModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handlePreviewGeneration} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Jenis Biaya Tagihan</label>
                  <select
                    value={genParams.fee_type_id}
                    onChange={(e) => setGenParams({ ...genParams, fee_type_id: parseInt(e.target.value, 10) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  >
                    {feeTypes.map((ft) => (
                      <option key={ft.id} value={ft.id}>{ft.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Sasaran Siswa</label>
                  <select
                    value={genParams.target}
                    onChange={(e) => setGenParams({ ...genParams, target: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  >
                    <option value="all">Semua Siswa Aktif</option>
                    <option value="class">Per Rombel / Kelas Tertentu</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Bulan Periode</label>
                  <select
                    value={genParams.period_month}
                    onChange={(e) => setGenParams({ ...genParams, period_month: parseInt(e.target.value, 10) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  >
                    {[1,2,3,4,5,6,7,8,9,10,11,12].map((m) => (
                      <option key={m} value={m}>Bulan {m}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Tahun Periode</label>
                  <input
                    type="number"
                    value={genParams.period_year}
                    onChange={(e) => setGenParams({ ...genParams, period_year: parseInt(e.target.value, 10) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSimulating}
                  className="w-full py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-xl transition flex items-center justify-center gap-1.5"
                >
                  {isSimulating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Eye className="w-3.5 h-3.5" />}
                  <span>1. Hitung & Simulasikan Preview</span>
                </button>
              </div>
            </form>

            {/* Hasil Simulasi Preview */}
            {previewResult && (
              <div className="mt-5 pt-4 border-t border-slate-200 space-y-3 animate-in fade-in">
                <div className="bg-emerald-50 p-3.5 rounded-xl border border-emerald-200 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-emerald-800">Simulasi Kalkulasi Berhasil</div>
                    <div className="text-[11px] text-emerald-600">
                      Total Siswa: {previewResult.total_students} &bull; Total Tagihan: {formatCurrency(previewResult.total_amount)}
                    </div>
                  </div>
                </div>

                <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-left text-[11px]">
                    <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 sticky top-0">
                      <tr>
                        <th className="px-3 py-2">Nama Siswa</th>
                        <th className="px-3 py-2">Penyesuaian / Beasiswa</th>
                        <th className="px-3 py-2 text-right">Nominal Akhir</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {previewResult.bills?.map((b, i) => (
                        <tr key={i} className="hover:bg-slate-50">
                          <td className="px-3 py-2 font-semibold text-slate-700">{b.student_name}</td>
                          <td className="px-3 py-2 text-purple-700">{b.adjustment_applied || 'Tarif Standar'}</td>
                          <td className="px-3 py-2 text-right font-bold text-slate-800">{formatCurrency(b.final_amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <button
                  type="button"
                  onClick={handleExecuteGenerate}
                  disabled={isGenerating}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-xs transition flex items-center justify-center gap-1.5"
                >
                  {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  <span>2. Konfirmasi & Simpan Tagihan Massal</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal Batalkan Tagihan (Fitur #15) */}
      {cancelModalOpen && selectedBill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 border border-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h2 className="text-sm font-bold text-slate-800">Batalkan Tagihan #{selectedBill.id}</h2>
              <button type="button" onClick={() => setCancelModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCancelBill} className="space-y-3">
              <p className="text-xs text-slate-600">
                Anda akan membatalkan tagihan siswa <strong>{selectedBill.student_name}</strong> sebesar {formatCurrency(selectedBill.amount)}.
              </p>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Alasan Pembatalan</label>
                <textarea
                  required
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Misal: Salah penetapan biaya / siswa pindah sekolah"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs h-20"
                />
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button type="button" onClick={() => setCancelModalOpen(false)} className="px-3 py-1.5 text-xs text-slate-600">Batal</button>
                <button type="submit" disabled={cancelling} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-semibold">
                  {cancelling ? 'Memproses...' : 'Ya, Batalkan Tagihan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
