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
  X,
  Send,
  MessageSquare,
  Mail,
  Smartphone,
  History
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

  // Send Reminder Modal State
  const [reminderModalOpen, setReminderModalOpen] = useState(false);
  const [reminderBill, setReminderBill] = useState(null);
  const [reminderChannel, setReminderChannel] = useState('whatsapp');
  const [sendingReminder, setSendingReminder] = useState(false);

  // Detail & Reminder History Modal State
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [billDetail, setBillDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

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

  const handleSendReminderSubmit = async (e) => {
    e.preventDefault();
    if (!reminderBill) return;
    setSendingReminder(true);
    try {
      const res = await api.post(`/keuangan/student-bills/${reminderBill.id}/reminders`, {
        channel: reminderChannel
      });
      alert(res.data?.message || `Pengingat tagihan #${reminderBill.id} berhasil dikirim via ${reminderChannel.toUpperCase()}!`);
      setReminderModalOpen(false);
      setReminderBill(null);
      fetchBills();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal mengirim pengingat tagihan');
    } finally {
      setSendingReminder(false);
    }
  };

  const handleOpenDetailModal = async (billId) => {
    setLoadingDetail(true);
    setDetailModalOpen(true);
    try {
      const res = await api.get(`/keuangan/student-bills/${billId}`);
      setBillDetail(res.data?.data);
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal memuat detail tagihan');
      setDetailModalOpen(false);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleRunMassReminders = async () => {
    if (!window.confirm('Kirim pengingat (reminder) otomatis untuk seluruh tagihan yang belum lunas?')) return;
    try {
      const res = await api.post('/keuangan/student-bills/reminders/run');
      alert(res.data?.message || 'Reminder massal berhasil diproses');
      fetchBills();
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
            Generate tagihan massal otomatis dengan kalkulasi beasiswa, daftar piutang & pengiriman reminder wali
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleRunMassReminders}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-700 text-xs font-semibold rounded-xl transition border border-amber-200"
          >
            <Bell className="w-3.5 h-3.5" />
            <span>Kirim Reminder Massal</span>
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
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Tombol Detail & Riwayat */}
                        <button
                          type="button"
                          onClick={() => handleOpenDetailModal(b.id)}
                          title="Lihat Detail & Riwayat Reminder"
                          className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        {/* Tombol Kirim Pengingat jika belum lunas */}
                        {(b.status === 'unpaid' || b.status === 'partially_paid') && (
                          <button
                            type="button"
                            onClick={() => {
                              setReminderBill(b);
                              setReminderChannel('whatsapp');
                              setReminderModalOpen(true);
                            }}
                            title="Kirim Pengingat (Reminder) ke Wali"
                            className="inline-flex items-center gap-1 px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-lg text-xs font-semibold transition"
                          >
                            <Bell className="w-3 h-3" />
                            <span>Ingatkan</span>
                          </button>
                        )}

                        {/* Tombol Batalkan */}
                        {b.status === 'unpaid' && (
                          <button
                            type="button"
                            onClick={() => { setSelectedBill(b); setCancelModalOpen(true); }}
                            title="Batalkan Tagihan"
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                          >
                            <Ban className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Kirim Pengingat Tagihan (Fitur #16) */}
      {reminderModalOpen && reminderBill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 border border-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-amber-600" />
                <h2 className="text-sm font-bold text-slate-800">Kirim Pengingat Tagihan #{reminderBill.id}</h2>
              </div>
              <button type="button" onClick={() => setReminderModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSendReminderSubmit} className="space-y-3.5 text-xs">
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 text-slate-700">
                <div><span className="text-slate-400">Nama Siswa: </span><span className="font-bold text-slate-900">{reminderBill.student_name}</span></div>
                <div><span className="text-slate-400">Jenis Biaya: </span><span className="font-semibold">{reminderBill.fee_type_name}</span></div>
                <div><span className="text-slate-400">Periode: </span><span>{reminderBill.period_month ? `${reminderBill.period_month}/${reminderBill.period_year}` : reminderBill.period_year}</span></div>
                <div><span className="text-slate-400">Jatuh Tempo: </span><span className="font-semibold text-rose-600">{reminderBill.due_date ? reminderBill.due_date.slice(0, 10) : '-'}</span></div>
                <div><span className="text-slate-400">Nominal Tagihan: </span><span className="font-bold text-slate-900 text-sm">{formatCurrency(reminderBill.amount)}</span></div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Pilih Saluran Pengiriman</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setReminderChannel('whatsapp')}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-xs font-semibold transition ${
                      reminderChannel === 'whatsapp'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-800 ring-1 ring-emerald-500'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <MessageSquare className="w-4 h-4 text-emerald-600" />
                    <span>WhatsApp</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setReminderChannel('email')}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-xs font-semibold transition ${
                      reminderChannel === 'email'
                        ? 'bg-blue-50 border-blue-500 text-blue-800 ring-1 ring-blue-500'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Mail className="w-4 h-4 text-blue-600" />
                    <span>Email</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setReminderChannel('sms')}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-xs font-semibold transition ${
                      reminderChannel === 'sms'
                        ? 'bg-purple-50 border-purple-500 text-purple-800 ring-1 ring-purple-500'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Smartphone className="w-4 h-4 text-purple-600" />
                    <span>SMS</span>
                  </button>
                </div>
              </div>

              <div className="p-3 bg-amber-50/60 border border-amber-200/60 rounded-xl text-[11px] text-amber-900">
                <span className="font-bold">Pratinjau Pesan: </span>
                "Assalamu'alaikum, mengingatkan tagihan {reminderBill.fee_type_name} sebesar {formatCurrency(reminderBill.amount)} jatuh tempo pada {reminderBill.due_date ? reminderBill.due_date.slice(0, 10) : '-'}..."
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button type="button" onClick={() => setReminderModalOpen(false)} className="px-3.5 py-2 text-xs text-slate-600">Batal</button>
                <button
                  type="submit"
                  disabled={sendingReminder}
                  className="flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold shadow-xs transition"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{sendingReminder ? 'Mengirim...' : 'Kirim Pengingat'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Detail Tagihan & Riwayat Pengingat */}
      {detailModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 border border-slate-100 max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-slate-700" />
                <h2 className="text-sm font-bold text-slate-800">Detail Tagihan & Riwayat Log</h2>
              </div>
              <button type="button" onClick={() => setDetailModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            {loadingDetail || !billDetail ? (
              <div className="py-12 flex justify-center items-center text-slate-400 gap-2 text-xs">
                <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                <span>Memuat rincian tagihan...</span>
              </div>
            ) : (
              <div className="space-y-4 text-xs">
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl grid grid-cols-2 gap-2 text-slate-700">
                  <div><span className="text-slate-400">No. Tagihan: </span><span className="font-mono font-bold">#{billDetail.id}</span></div>
                  <div><span className="text-slate-400">Status: </span><span className="font-bold uppercase text-slate-800">{billDetail.status}</span></div>
                  <div><span className="text-slate-400">Nama Siswa: </span><span className="font-bold text-slate-900">{billDetail.student_name}</span></div>
                  <div><span className="text-slate-400">Jenis Biaya: </span><span className="font-semibold">{billDetail.fee_type_name}</span></div>
                  <div><span className="text-slate-400">Jatuh Tempo: </span><span className="font-semibold">{billDetail.due_date ? billDetail.due_date.slice(0, 10) : '-'}</span></div>
                  <div><span className="text-slate-400">Nominal: </span><span className="font-bold text-emerald-700 text-sm">{formatCurrency(billDetail.amount)}</span></div>
                </div>

                {/* Riwayat Pengingat (Reminders) */}
                <div>
                  <h3 className="text-xs font-bold text-slate-800 mb-2 flex items-center gap-1.5">
                    <Bell className="w-3.5 h-3.5 text-amber-600" />
                    <span>Riwayat Pengingat Terkirim ({billDetail.reminders?.length || 0})</span>
                  </h3>
                  {!billDetail.reminders || billDetail.reminders.length === 0 ? (
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-slate-400 text-center italic text-[11px]">
                      Belum pernah dikirimkan pengingat untuk tagihan ini.
                    </div>
                  ) : (
                    <div className="border border-slate-200 rounded-xl overflow-hidden">
                      <table className="w-full text-left text-[11px]">
                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                          <tr>
                            <th className="px-3 py-2">Saluran</th>
                            <th className="px-3 py-2">Waktu Pengiriman</th>
                            <th className="px-3 py-2 text-right">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {billDetail.reminders.map((r) => (
                            <tr key={r.id} className="hover:bg-slate-50">
                              <td className="px-3 py-2 font-bold uppercase text-slate-700">{r.channel}</td>
                              <td className="px-3 py-2 text-slate-500">{r.sent_at ? r.sent_at.slice(0, 19).replace('T', ' ') : '-'}</td>
                              <td className="px-3 py-2 text-right">
                                <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 font-bold rounded">Terkirim</span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Riwayat Pembayaran */}
                <div>
                  <h3 className="text-xs font-bold text-slate-800 mb-2 flex items-center gap-1.5">
                    <Receipt className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Riwayat Pembayaran ({billDetail.payments?.length || 0})</span>
                  </h3>
                  {!billDetail.payments || billDetail.payments.length === 0 ? (
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-slate-400 text-center italic text-[11px]">
                      Belum ada pembayaran yang tercatat.
                    </div>
                  ) : (
                    <div className="border border-slate-200 rounded-xl overflow-hidden">
                      <table className="w-full text-left text-[11px]">
                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                          <tr>
                            <th className="px-3 py-2">No. Kwitansi</th>
                            <th className="px-3 py-2">Tanggal</th>
                            <th className="px-3 py-2 text-right">Nominal</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {billDetail.payments.map((p) => (
                            <tr key={p.id} className="hover:bg-slate-50">
                              <td className="px-3 py-2 font-mono font-bold text-slate-700">{p.receipt_number}</td>
                              <td className="px-3 py-2 text-slate-500">{p.paid_at ? p.paid_at.slice(0, 10) : '-'}</td>
                              <td className="px-3 py-2 text-right font-bold text-slate-800">{formatCurrency(p.amount)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDetailModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

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
                    <option value="all">Seluruh Siswa Aktif Unit</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Bulan Periode (Opsional SPP)</label>
                  <input
                    type="number"
                    min={1}
                    max={12}
                    value={genParams.period_month}
                    onChange={(e) => setGenParams({ ...genParams, period_month: parseInt(e.target.value, 10) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  />
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

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setGenerateModalOpen(false)}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSimulating}
                  className="flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-semibold shadow-xs transition"
                >
                  {isSimulating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Eye className="w-3.5 h-3.5" />}
                  <span>{isSimulating ? 'Menghitung...' : 'Mulai Simulasi Preview'}</span>
                </button>
              </div>
            </form>

            {/* Hasil Preview Simulasi */}
            {previewResult && (
              <div className="mt-6 pt-4 border-t border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-800">Hasil Simulasi ({previewResult.length} Siswa Terhitung)</h3>
                  <button
                    type="button"
                    onClick={handleExecuteGenerate}
                    disabled={isGenerating}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center gap-1.5"
                  >
                    {isGenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                    <span>{isGenerating ? 'Menyimpan...' : 'Eksekusi Simpan Tagihan'}</span>
                  </button>
                </div>

                <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="px-3 py-2">Nama Siswa</th>
                        <th className="px-3 py-2 text-right">Tarif Dasar</th>
                        <th className="px-3 py-2">Dispensasi</th>
                        <th className="px-3 py-2 text-right">Nominal Akhir</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {previewResult.map((p, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="px-3 py-2 font-medium text-slate-800">{p.student_name}</td>
                          <td className="px-3 py-2 text-right text-slate-500">{formatCurrency(p.base_amount)}</td>
                          <td className="px-3 py-2 text-[11px] text-amber-600">{p.adjustment_applied || '-'}</td>
                          <td className="px-3 py-2 text-right font-bold text-slate-800">{formatCurrency(p.final_amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
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

            <form onSubmit={handleCancelBill} className="space-y-3.5">
              <p className="text-xs text-slate-600">
                Apakah Anda yakin ingin membatalkan tagihan untuk <strong>{selectedBill.student_name}</strong> sebesar {formatCurrency(selectedBill.amount)}?
              </p>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Alasan Pembatalan</label>
                <textarea
                  required
                  rows={3}
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Contoh: Kesalahan penetapan kelas / siswa telah pindah"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-red-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button type="button" onClick={() => setCancelModalOpen(false)} className="px-3.5 py-2 text-xs font-semibold text-slate-600">Batal</button>
                <button type="submit" disabled={cancelling} className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold shadow-xs">
                  {cancelling ? 'Membatalkan...' : 'Konfirmasi Pembatalan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
