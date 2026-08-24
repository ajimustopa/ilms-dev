import React, { useState, useEffect } from 'react';
import api from '../../../shared/services/api';
import {
  CreditCard,
  Plus,
  Printer,
  Edit2,
  Receipt,
  Search,
  CheckCircle2,
  Loader2,
  X,
  FileDown
} from 'lucide-react';

export default function Payments() {
  const [payments, setPayments] = useState([]);
  const [cashAccounts, setCashAccounts] = useState([]);
  const [unpaidBills, setUnpaidBills] = useState([]);
  const [loading, setLoading] = useState(false);

  // Record Payment Modal State
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    student_bill_id: '',
    cash_account_id: '',
    amount: '',
    payment_method: 'cash',
    notes: ''
  });
  const [submitting, setSubmitting] = useState(false);

  // Receipt Modal State
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [receiptData, setReceiptData] = useState(null);

  // Correction Modal State
  const [correctModalOpen, setCorrectModalOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [correctForm, setCorrectForm] = useState({ amount: '', correction_reason: '' });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [cashRes, billsRes] = await Promise.all([
        api.get('/keuangan/cash-accounts'),
        api.get('/keuangan/student-bills?status=unpaid')
      ]);

      setCashAccounts(cashRes.data?.data || []);
      setUnpaidBills(billsRes.data?.data || []);

      if (cashRes.data?.data?.[0]) {
        setFormData((prev) => ({ ...prev, cash_account_id: cashRes.data.data[0].id }));
      }
    } catch (err) {
      console.error('Error fetching payment dependencies:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSelectBill = (billId) => {
    const b = unpaidBills.find((x) => x.id === parseInt(billId, 10));
    setFormData((prev) => ({
      ...prev,
      student_bill_id: billId,
      amount: b ? b.amount : ''
    }));
  };

  const handleRecordPayment = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await api.post('/keuangan/bill-payments', formData);
      alert('Pembayaran berhasil dicatat & jurnal otomatis telah dibukukan!');
      setPayModalOpen(false);
      fetchData();
      if (res.data?.data?.id) {
        handleViewReceipt(res.data.data.id);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal mencatat pembayaran');
    } finally {
      setSubmitting(false);
    }
  };

  const handleViewReceipt = async (paymentId) => {
    try {
      const res = await api.get(`/keuangan/bill-payments/${paymentId}/receipt`);
      setReceiptData(res.data?.data);
      setReceiptModalOpen(true);
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal memuat kwitansi pembayaran');
    }
  };

  const handleCorrectPayment = async (e) => {
    e.preventDefault();
    if (!selectedPayment) return;
    setSubmitting(true);
    try {
      await api.patch(`/keuangan/bill-payments/${selectedPayment.id}`, correctForm);
      alert('Pembayaran berhasil dikoreksi!');
      setCorrectModalOpen(false);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal mengoreksi pembayaran');
    } finally {
      setSubmitting(false);
    }
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val || 0);
  };

  return (
    <div className="space-y-6">
      {/* Header Pembayaran */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800 tracking-tight">Pembayaran & Penerbitan Kwitansi</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Pencatatan kas masuk pembayaran SPP, integrasi cetak kwitansi resmi & koreksi transaksi
          </p>
        </div>
        <button
          type="button"
          onClick={() => setPayModalOpen(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-xs transition self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Catat Pembayaran Baru</span>
        </button>
      </div>

      {/* Rincian Tagihan Menunggu Pembayaran */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-sm font-bold text-slate-800">Tagihan Siap Bayar (Unpaid)</h2>
            <p className="text-xs text-slate-400">Pilih tagihan siswa untuk langsung mencatat penerimaan kas</p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 bg-amber-50 text-amber-700 rounded-lg">
            {unpaidBills.length} Tagihan Pending
          </span>
        </div>

        {unpaidBills.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs italic">
            Semua tagihan telah lunas atau belum ada tagihan yang dibuat.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">No. Tagihan</th>
                  <th className="px-4 py-3">Nama Siswa</th>
                  <th className="px-4 py-3">Jenis Biaya</th>
                  <th className="px-4 py-3">Periode</th>
                  <th className="px-4 py-3 text-right">Nominal</th>
                  <th className="px-4 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {unpaidBills.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono font-bold text-slate-600">#{b.id}</td>
                    <td className="px-4 py-3 font-bold text-slate-800">{b.student_name || `Siswa ID ${b.student_id}`}</td>
                    <td className="px-4 py-3 text-slate-700">{b.fee_type_name}</td>
                    <td className="px-4 py-3 text-slate-500">
                      {b.period_month ? `${b.period_month}/${b.period_year}` : b.period_year}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-slate-800">{formatCurrency(b.amount)}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => {
                          handleSelectBill(b.id);
                          setPayModalOpen(true);
                        }}
                        className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold"
                      >
                        Bayar Sekarang
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Catat Pembayaran Baru (Fitur #17) */}
      {payModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 border border-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h2 className="text-sm font-bold text-slate-800">Catat Pembayaran Tagihan</h2>
              <button type="button" onClick={() => setPayModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleRecordPayment} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Pilih Tagihan Siswa</label>
                <select
                  required
                  value={formData.student_bill_id}
                  onChange={(e) => handleSelectBill(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                >
                  <option value="">-- Pilih Tagihan Belum Lunas --</option>
                  {unpaidBills.map((b) => (
                    <option key={b.id} value={b.id}>
                      #{b.id} - {b.student_name} ({b.fee_type_name} {b.period_month ? b.period_month + '/' : ''}{b.period_year}) - {formatCurrency(b.amount)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Masuk ke Rekening Kas / Bank</label>
                <select
                  required
                  value={formData.cash_account_id}
                  onChange={(e) => setFormData({ ...formData, cash_account_id: parseInt(e.target.value, 10) })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                >
                  {cashAccounts.map((c) => (
                    <option key={c.id} value={c.id}>{c.name} ({c.account_kind})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Nominal Pembayaran (Rp)</label>
                  <input
                    type="number"
                    required
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Metode Pembayaran</label>
                  <select
                    value={formData.payment_method}
                    onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  >
                    <option value="cash">Tunai (Cash)</option>
                    <option value="bank_transfer">Transfer Bank</option>
                    <option value="qris">QRIS / Gateway</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Catatan Tambahan</label>
                <input
                  type="text"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Keterangan opsional"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button type="button" onClick={() => setPayModalOpen(false)} className="px-3.5 py-2 text-xs text-slate-600">Batal</button>
                <button type="submit" disabled={submitting} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs">
                  {submitting ? 'Menyimpan...' : 'Simpan & Cetak Kwitansi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Kwitansi Resmi (Fitur #19) */}
      {receiptModalOpen && receiptData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 border border-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-emerald-600" />
                <h2 className="text-sm font-bold text-slate-800">Kwitansi Pembayaran Resmi</h2>
              </div>
              <button type="button" onClick={() => setReceiptModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Visual Kwitansi Card */}
            <div className="p-5 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase">No. Kwitansi</span>
                  <div className="font-mono font-bold text-slate-800 text-sm">{receiptData.receipt_number}</div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Tanggal</span>
                  <div className="font-semibold text-slate-700">{receiptData.paid_at ? receiptData.paid_at.slice(0, 10) : '-'}</div>
                </div>
              </div>

              <div className="space-y-1.5 text-slate-700">
                <div className="flex justify-between">
                  <span className="text-slate-500">Telah Diterima Dari:</span>
                  <span className="font-bold text-slate-800">{receiptData.student?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Untuk Pembayaran:</span>
                  <span className="font-semibold text-slate-800">{receiptData.payment_for}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Metode & Akun:</span>
                  <span className="text-slate-700">{receiptData.payment_method} ({receiptData.cash_account_name})</span>
                </div>
              </div>

              <div className="bg-emerald-50/70 p-3 rounded-lg border border-emerald-200/60 mt-3">
                <div className="flex items-center justify-between text-emerald-900 font-bold text-sm">
                  <span>Jumlah Terbayar:</span>
                  <span className="text-base">{formatCurrency(receiptData.amount)}</span>
                </div>
                <div className="text-[11px] text-emerald-700 italic mt-1 capitalize">
                  Terbilang: "{receiptData.amount_in_words}"
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Cetak Browser</span>
              </button>
              <button
                type="button"
                onClick={() => alert(`Unduhan PDF Kwitansi ${receiptData.receipt_number} disiapkan!`)}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-xs"
              >
                <FileDown className="w-3.5 h-3.5" />
                <span>Unduh PDF</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
