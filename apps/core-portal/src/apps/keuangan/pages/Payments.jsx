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
  XCircle,
  Clock,
  Loader2,
  X,
  FileDown,
  ExternalLink,
  Eye,
  Check,
  Ban,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';

export default function Payments() {
  const [activeTab, setActiveTab] = useState('proofs'); // 'pos' | 'proofs'
  const [payments, setPayments] = useState([]);
  const [cashAccounts, setCashAccounts] = useState([]);
  const [unpaidBills, setUnpaidBills] = useState([]);
  const [proofs, setProofs] = useState([]);
  const [proofFilter, setProofFilter] = useState('pending'); // 'all' | 'pending' | 'verified' | 'rejected'
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

  // Preview Proof Modal
  const [previewProof, setPreviewProof] = useState(null);

  // Verify Proof Modal
  const [verifyModalProof, setVerifyModalProof] = useState(null);
  const [verifyCashAccountId, setVerifyCashAccountId] = useState('');

  // Reject Proof Modal
  const [rejectModalProof, setRejectModalProof] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [cashRes, billsRes, proofsRes] = await Promise.all([
        api.get('/keuangan/cash-accounts'),
        api.get('/keuangan/student-bills?status=unpaid'),
        api.get('/keuangan/bill-payment-proofs')
      ]);

      const accs = cashRes.data?.data || [];
      setCashAccounts(accs);
      setUnpaidBills(billsRes.data?.data || []);
      setProofs(proofsRes.data?.data || []);

      if (accs.length > 0) {
        setFormData((prev) => ({ ...prev, cash_account_id: accs[0].id }));
        const bankAcc = accs.find((a) => a.account_kind === 'bank') || accs[0];
        setVerifyCashAccountId(bankAcc.id);
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

  const handleVerifyProofSubmit = async (e) => {
    e.preventDefault();
    if (!verifyModalProof) return;
    setSubmitting(true);
    try {
      const res = await api.patch(`/keuangan/bill-payment-proofs/${verifyModalProof.id}/verify`, {
        cash_account_id: verifyCashAccountId ? parseInt(verifyCashAccountId, 10) : undefined
      });
      alert('Bukti transfer berhasil diverifikasi! Kwitansi resmi & jurnal otomatis telah diterbitkan.');
      setVerifyModalProof(null);
      fetchData();
      if (res.data?.data?.payment?.id) {
        handleViewReceipt(res.data.data.payment.id);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal memverifikasi bukti transfer');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRejectProofSubmit = async (e) => {
    e.preventDefault();
    if (!rejectModalProof || !rejectionReason.trim()) {
      alert('Alasan penolakan wajib diisi!');
      return;
    }
    setSubmitting(true);
    try {
      await api.patch(`/keuangan/bill-payment-proofs/${rejectModalProof.id}/reject`, {
        rejection_reason: rejectionReason.trim()
      });
      alert('Bukti transfer berhasil ditolak.');
      setRejectModalProof(null);
      setRejectionReason('');
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menolak bukti transfer');
    } finally {
      setSubmitting(false);
    }
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val || 0);
  };

  const filteredProofs = proofs.filter((p) => {
    if (proofFilter === 'all') return true;
    return p.status === proofFilter;
  });

  const pendingCount = proofs.filter((p) => p.status === 'pending').length;

  return (
    <div className="space-y-6">
      {/* Header Pembayaran */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800 tracking-tight">Kasir & Verifikasi Pembayaran</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Verifikasi bukti transfer manual orang tua, pencatatan kas masuk POS & cetak kwitansi resmi
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPayModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-xs transition"
          >
            <Plus className="w-4 h-4" />
            <span>Catat Kasir Langsung (POS)</span>
          </button>
        </div>
      </div>

      {/* Tab Navigasi */}
      <div className="flex border-b border-slate-200 gap-6 text-xs font-semibold">
        <button
          type="button"
          onClick={() => setActiveTab('proofs')}
          className={`pb-3 flex items-center gap-2 border-b-2 transition ${
            activeTab === 'proofs'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Verifikasi Bukti Transfer</span>
          {pendingCount > 0 && (
            <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-500 text-white rounded-full">
              {pendingCount}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('pos')}
          className={`pb-3 flex items-center gap-2 border-b-2 transition ${
            activeTab === 'pos'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span>Kasir Langsung & Tagihan Siap Bayar</span>
          <span className="px-2 py-0.5 text-[10px] font-bold bg-slate-200 text-slate-700 rounded-full">
            {unpaidBills.length}
          </span>
        </button>
      </div>

      {/* TAB 1: VERIFIKASI BUKTI TRANSFER MANUAL */}
      {activeTab === 'proofs' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-bold text-slate-800">Antrean Verifikasi Bukti Transfer (FIFO)</h2>
              <p className="text-xs text-slate-400">
                Orang tua melakukan transfer manual dan mengunggah bukti untuk diverifikasi oleh bendahara
              </p>
            </div>
            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs">
              <button
                type="button"
                onClick={() => setProofFilter('pending')}
                className={`px-3 py-1 rounded-lg font-medium transition ${
                  proofFilter === 'pending' ? 'bg-white shadow-xs text-slate-800 font-bold' : 'text-slate-500'
                }`}
              >
                Menunggu ({pendingCount})
              </button>
              <button
                type="button"
                onClick={() => setProofFilter('verified')}
                className={`px-3 py-1 rounded-lg font-medium transition ${
                  proofFilter === 'verified' ? 'bg-white shadow-xs text-emerald-700 font-bold' : 'text-slate-500'
                }`}
              >
                Disetujui
              </button>
              <button
                type="button"
                onClick={() => setProofFilter('rejected')}
                className={`px-3 py-1 rounded-lg font-medium transition ${
                  proofFilter === 'rejected' ? 'bg-white shadow-xs text-rose-700 font-bold' : 'text-slate-500'
                }`}
              >
                Ditolak
              </button>
              <button
                type="button"
                onClick={() => setProofFilter('all')}
                className={`px-3 py-1 rounded-lg font-medium transition ${
                  proofFilter === 'all' ? 'bg-white shadow-xs text-slate-800 font-bold' : 'text-slate-500'
                }`}
              >
                Semua ({proofs.length})
              </button>
            </div>
          </div>

          {loading ? (
            <div className="py-12 flex justify-center items-center text-slate-400 gap-2 text-xs">
              <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
              <span>Memuat antrean bukti transfer...</span>
            </div>
          ) : filteredProofs.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs italic">
              Tidak ada bukti transfer dalam status "{proofFilter}".
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3">ID / Waktu Upload</th>
                    <th className="px-4 py-3">Nama Siswa & NIS</th>
                    <th className="px-4 py-3">Rincian Tagihan</th>
                    <th className="px-4 py-3">Bank & Pengirim</th>
                    <th className="px-4 py-3 text-right">Nominal Transfer</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-4 py-3 text-center">Bukti</th>
                    <th className="px-4 py-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredProofs.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <span className="font-mono font-bold text-slate-800">#{p.id}</span>
                        <div className="text-[11px] text-slate-400">{p.created_at ? p.created_at.slice(0, 16).replace('T', ' ') : '-'}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-800">{p.student_name}</div>
                        <div className="text-[11px] text-slate-400 font-mono">NIS: {p.student_nis}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-700">{p.fee_type_name}</div>
                        <div className="text-[11px] text-slate-500">
                          Periode: {p.period_month ? `${p.period_month}/${p.period_year}` : p.period_year}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        <div className="font-medium text-slate-800">{p.bank_name || 'Bank Umum'}</div>
                        <div className="text-[11px] text-slate-400">a.n {p.sender_account_name || '-'}</div>
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-slate-900">
                        {formatCurrency(p.amount)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {p.status === 'pending' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            <Clock className="w-3 h-3" /> Menunggu
                          </span>
                        )}
                        {p.status === 'verified' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3" /> Diverifikasi
                          </span>
                        )}
                        {p.status === 'rejected' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200" title={p.rejection_reason}>
                            <XCircle className="w-3 h-3" /> Ditolak
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          type="button"
                          onClick={() => setPreviewProof(p)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Lihat</span>
                        </button>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {p.status === 'pending' ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => setVerifyModalProof(p)}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1"
                            >
                              <Check className="w-3 h-3" />
                              <span>Verifikasi</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setRejectModalProof(p);
                                setRejectionReason('');
                              }}
                              className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-semibold flex items-center gap-1"
                            >
                              <Ban className="w-3 h-3" />
                              <span>Tolak</span>
                            </button>
                          </div>
                        ) : p.status === 'verified' && p.bill_payment_id ? (
                          <button
                            type="button"
                            onClick={() => handleViewReceipt(p.bill_payment_id)}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1 ml-auto"
                          >
                            <Receipt className="w-3 h-3" />
                            <span>Kwitansi</span>
                          </button>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">Selesai</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: KASIR LANGSUNG / POS */}
      {activeTab === 'pos' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-bold text-slate-800">Tagihan Siap Bayar di Kasir (Unpaid)</h2>
              <p className="text-xs text-slate-400">Pilih tagihan siswa untuk langsung mencatat penerimaan kas tunai/loket</p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 bg-amber-50 text-amber-700 rounded-lg">
              {unpaidBills.length} Tagihan Belum Lunas
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
                          Bayar di Kasir
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Modal Preview Bukti Transfer */}
      {previewProof && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 border border-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h2 className="text-sm font-bold text-slate-800">Detail Bukti Transfer #{previewProof.id}</h2>
                <p className="text-xs text-slate-400">Siswa: {previewProof.student_name} ({previewProof.fee_type_name})</p>
              </div>
              <button type="button" onClick={() => setPreviewProof(null)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 grid grid-cols-2 gap-2">
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold">Nominal Transfer:</span>
                  <div className="font-bold text-slate-900 text-sm">{formatCurrency(previewProof.amount)}</div>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold">Tanggal Transfer:</span>
                  <div className="font-semibold text-slate-800">{previewProof.transfer_date ? previewProof.transfer_date.slice(0, 10) : '-'}</div>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold">Bank Pengirim:</span>
                  <div className="font-semibold text-slate-800">{previewProof.bank_name || '-'}</div>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold">Nama Pengirim:</span>
                  <div className="font-semibold text-slate-800">{previewProof.sender_account_name || '-'}</div>
                </div>
              </div>

              {previewProof.notes && (
                <div className="p-2.5 bg-amber-50/60 border border-amber-200/60 rounded-xl text-amber-900">
                  <span className="font-bold">Catatan Wali: </span>
                  {previewProof.notes}
                </div>
              )}

              {previewProof.rejection_reason && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-900">
                  <span className="font-bold">Alasan Penolakan: </span>
                  {previewProof.rejection_reason}
                </div>
              )}

              {/* Tampilan Gambar Bukti */}
              <div className="border border-slate-200 rounded-xl p-3 bg-slate-50 text-center">
                <div className="text-[11px] font-bold text-slate-500 mb-2">Pratinjau File / Bukti Transfer:</div>
                <div className="max-h-64 overflow-auto flex justify-center bg-white rounded-lg p-2 border border-slate-100">
                  <img
                    src={previewProof.proof_file_url}
                    alt="Bukti Transfer"
                    className="max-h-56 object-contain rounded"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = 'https://placehold.co/400x250/e2e8f0/64748b?text=File+Bukti+Transfer';
                    }}
                  />
                </div>
                <a
                  href={previewProof.proof_file_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 mt-2 text-emerald-600 hover:text-emerald-700 font-semibold text-[11px]"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span>Buka di Tab Baru / Unduh Asli</span>
                </a>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setPreviewProof(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Verifikasi Bukti Transfer */}
      {verifyModalProof && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 border border-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                <h2 className="text-sm font-bold text-slate-800">Verifikasi Bukti Transfer #{verifyModalProof.id}</h2>
              </div>
              <button type="button" onClick={() => setVerifyModalProof(null)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleVerifyProofSubmit} className="space-y-3.5 text-xs">
              <div className="p-3 bg-emerald-50/60 border border-emerald-200/60 rounded-xl space-y-1 text-emerald-950">
                <div><span className="text-slate-500">Siswa: </span><span className="font-bold">{verifyModalProof.student_name}</span></div>
                <div><span className="text-slate-500">Tagihan: </span><span className="font-bold">{verifyModalProof.fee_type_name}</span></div>
                <div><span className="text-slate-500">Nominal Transfer: </span><span className="font-bold text-sm text-emerald-800">{formatCurrency(verifyModalProof.amount)}</span></div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Pilih Rekening Bank / Kas Sekolah Tujuan Masuk</label>
                <select
                  required
                  value={verifyCashAccountId}
                  onChange={(e) => setVerifyCashAccountId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                >
                  {cashAccounts.map((c) => (
                    <option key={c.id} value={c.id}>{c.name} ({c.account_kind})</option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-400 mt-1">Sistem otomatis menerbitkan Kwitansi Resmi & Jurnal Umum Kas Masuk.</p>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button type="button" onClick={() => setVerifyModalProof(null)} className="px-3.5 py-2 text-xs text-slate-600">Batal</button>
                <button type="submit" disabled={submitting} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs">
                  {submitting ? 'Memproses...' : 'Setujui & Terbitkan Kwitansi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Tolak Bukti Transfer */}
      {rejectModalProof && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 border border-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-rose-600" />
                <h2 className="text-sm font-bold text-slate-800">Tolak Bukti Transfer #{rejectModalProof.id}</h2>
              </div>
              <button type="button" onClick={() => setRejectModalProof(null)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleRejectProofSubmit} className="space-y-3.5 text-xs">
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl space-y-1 text-rose-950">
                <div><span className="text-slate-500">Siswa: </span><span className="font-bold">{rejectModalProof.student_name}</span></div>
                <div><span className="text-slate-500">Nominal: </span><span className="font-bold">{formatCurrency(rejectModalProof.amount)}</span></div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Alasan Penolakan <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Contoh: Bukti transfer buram, nominal tidak sesuai, atau belum masuk mutasi bank"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-rose-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button type="button" onClick={() => setRejectModalProof(null)} className="px-3.5 py-2 text-xs text-slate-600">Batal</button>
                <button type="submit" disabled={submitting} className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold shadow-xs">
                  {submitting ? 'Menyimpan...' : 'Tolak Bukti Transfer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Catat Pembayaran Baru (Fitur #17) */}
      {payModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 border border-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h2 className="text-sm font-bold text-slate-800">Catat Pembayaran di Kasir (POS)</h2>
              <button type="button" onClick={() => setPayModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleRecordPayment} className="space-y-3.5 text-xs">
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
