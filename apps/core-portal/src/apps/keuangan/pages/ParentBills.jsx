import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../shared/store/AuthContext';
import api from '../../../shared/services/api';
import StatRibbonCard from '../../../shared/components/StatRibbonCard';
import StatusPill from '../../../shared/components/StatusPill';
import FlatAlertBanner from '../../../shared/components/FlatAlertBanner';
import { formatCurrency, formatDate } from '../../../shared/utils/formatters';
import {
  Receipt,
  Wallet,
  CheckCircle2,
  Clock,
  AlertCircle,
  Eye,
  RotateCw,
  FileText,
  Upload,
  Calendar,
  CreditCard,
  Building2,
  ShieldCheck,
  ChevronRight,
  ArrowRight,
  X,
  Loader2
} from 'lucide-react';

export default function ParentBills() {
  const { user, activeSchoolUnit } = useAuth();

  const [bills, setBills] = useState([]);
  const [savings, setSavings] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Detail Modal State
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedBill, setSelectedBill] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Upload Proof State
  const [proofModalOpen, setProofModalOpen] = useState(false);
  const [proofBill, setProofBill] = useState(null);
  const [proofForm, setProofForm] = useState({
    amount: '',
    payment_method: 'bank_transfer',
    proof_document_url: '',
    notes: ''
  });
  const [submittingProof, setSubmittingProof] = useState(false);

  const studentId = user?.ref_type === 'student' ? user.ref_id : (user?.ref_id || 1);

  const fetchParentData = async () => {
    setLoading(true);
    setError('');
    try {
      const [billsRes, savingsRes] = await Promise.all([
        api.get(`/keuangan/parent-facing/bills?student_id=${studentId}`),
        api.get(`/keuangan/parent-facing/savings?student_id=${studentId}`).catch(() => ({ data: { data: null } }))
      ]);

      setBills(billsRes.data?.data || []);
      setSavings(savingsRes.data?.data || null);
    } catch (err) {
      console.error('Error fetching parent bills:', err);
      setError(err.response?.data?.message || 'Gagal memuat data tagihan');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchParentData();
  }, [activeSchoolUnit, studentId]);

  const handleOpenDetail = async (billId) => {
    setLoadingDetail(true);
    setDetailModalOpen(true);
    try {
      const res = await api.get(`/keuangan/parent-facing/bills/${billId}?student_id=${studentId}`);
      setSelectedBill(res.data?.data || null);
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal mengambil detail tagihan');
      setDetailModalOpen(false);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleOpenProofModal = (bill) => {
    setProofBill(bill);
    setProofForm({
      amount: bill.remaining_amount || (bill.amount - (bill.paid_amount || 0)),
      payment_method: 'bank_transfer',
      proof_document_url: '',
      notes: ''
    });
    setProofModalOpen(true);
  };

  const handleSubmitProof = async (e) => {
    e.preventDefault();
    if (!proofBill) return;
    setSubmittingProof(true);
    try {
      await api.post(`/keuangan/parent-facing/payment-proof`, {
        student_bill_id: proofBill.id,
        student_id: studentId,
        amount: parseFloat(proofForm.amount),
        payment_method: proofForm.payment_method,
        proof_document_url: proofForm.proof_document_url,
        notes: proofForm.notes
      });
      alert('Bukti pembayaran berhasil dikirimkan untuk diverifikasi oleh bagian keuangan!');
      setProofModalOpen(false);
      setProofBill(null);
      fetchParentData();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal mengirim bukti pembayaran');
    } finally {
      setSubmittingProof(false);
    }
  };

  const totalUnpaid = bills
    .filter(b => b.status === 'unpaid' || b.status === 'partially_paid')
    .reduce((sum, b) => sum + (parseFloat(b.remaining_amount !== undefined ? b.remaining_amount : (b.amount - (b.paid_amount || 0))) || 0), 0);

  const totalPaid = bills
    .reduce((sum, b) => sum + (parseFloat(b.paid_amount || 0)), 0);

  return (
    <div className="space-y-6">
      {/* Header Halaman */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-800 tracking-tight">Portal Tagihan &amp; Pembayaran Santri</h1>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
              <ShieldCheck className="w-3 h-3 text-emerald-600" />
              <span>Parent Self-Service</span>
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Daftar resmi tagihan biaya pendidikan santri, status pembayaran, beasiswa/diskon, serta konfirmasi pembayaran perbankan
          </p>
        </div>
        <button
          type="button"
          onClick={fetchParentData}
          disabled={loading}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl shadow-2xs transition disabled:opacity-60 self-start sm:self-auto cursor-pointer"
        >
          <RotateCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-emerald-600' : 'text-slate-500'}`} />
          <span>{loading ? 'Memuat...' : 'Perbarui Status'}</span>
        </button>
      </div>

      {error && (
        <FlatAlertBanner variant="danger" title="Gagal Memuat Data">
          {error}
        </FlatAlertBanner>
      )}

      {/* Ringkasan Kartu Keuangan Santri */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Tagihan Belum Lunas */}
        <StatRibbonCard
          label="Total Tagihan Belum Bayar"
          value={formatCurrency(totalUnpaid)}
          context="Harap segera diselesaikan sebelum jatuh tempo"
          status="danger"
          icon={Receipt}
        />

        {/* Total Tagihan Sudah Dibayar */}
        <StatRibbonCard
          label="Total Pembayaran Berhasil"
          value={formatCurrency(totalPaid)}
          context="Tercatat di sistem administrasi yayasan"
          status="success"
          icon={CheckCircle2}
        />

        {/* Saldo Tabungan Santri */}
        <StatRibbonCard
          label="Saldo Tabungan Santri"
          value={formatCurrency(savings?.balance || 0)}
          context="Tersedia untuk cashless & operasional santri"
          status="info"
          icon={Wallet}
        />
      </div>

      {/* Tabel Daftar Tagihan Resmi Santri */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-800">Daftar Tagihan Pendidikan Santri</h2>
            <p className="text-[11px] text-slate-500">Menampilkan tagihan yang telah disahkan &amp; diterbitkan secara resmi</p>
          </div>
          <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
            {bills.length} Tagihan
          </span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-emerald-600 mb-2" />
            <p className="text-xs">Memuat daftar tagihan...</p>
          </div>
        ) : bills.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <Receipt className="w-10 h-10 mx-auto text-slate-300 mb-2" />
            <p className="text-xs font-semibold text-slate-600">Tidak ada tagihan yang diterbitkan</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Seluruh kewajiban pembayaran telah diselesaikan atau belum diterbitkan oleh pihak sekolah.</p>
          </div>
        ) : (
          <div className="table-container overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold">
                  <th className="py-3 px-4">Jenis Tagihan</th>
                  <th className="py-3 px-4">Periode</th>
                  <th className="py-3 px-4 text-right">Nominal Bruto</th>
                  <th className="py-3 px-4 text-right">Keringanan / Diskon</th>
                  <th className="py-3 px-4 text-right">Sisa Kewajiban</th>
                  <th className="py-3 px-4">Jatuh Tempo</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {bills.map((bill) => {
                  const remaining = bill.remaining_amount !== undefined
                    ? parseFloat(bill.remaining_amount)
                    : Math.max(0, parseFloat(bill.amount) - parseFloat(bill.paid_amount || 0));

                  const isPaid = bill.status === 'paid' || remaining <= 0;
                  const isPartiallyPaid = bill.status === 'partially_paid' || (parseFloat(bill.paid_amount || 0) > 0 && remaining > 0);

                  return (
                    <tr key={bill.id} className="hover:bg-slate-50/60 transition">
                      <td className="py-3.5 px-4 font-semibold text-slate-800">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span>{bill.fee_type_name || 'Tagihan Pendidikan'}</span>
                          {bill.academic_year_name && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                              T.A. {bill.academic_year_name}
                            </span>
                          )}
                          {bill.version > 1 && (
                            <span className="inline-flex items-center text-[10px] text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.2 rounded font-medium">
                              Revisi v{bill.version}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 tnum text-slate-600">
                        {bill.period_month ? `Bulan ${bill.period_month}/${bill.period_year}` : `Tahun ${bill.period_year}`}
                      </td>
                      <td className="py-3.5 px-4 text-right font-medium tnum">
                        {formatCurrency(parseFloat(bill.amount) + parseFloat(bill.discount_amount || 0))}
                      </td>
                      <td className="py-3.5 px-4 text-right tnum text-emerald-700">
                        {parseFloat(bill.discount_amount || 0) > 0 ? (
                          <div>
                            <span>-{formatCurrency(bill.discount_amount)}</span>
                            {bill.discount_sk_number && (
                              <div className="text-[10px] text-slate-400 font-sans">
                                SK: {bill.discount_sk_number}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right font-extrabold tnum text-slate-900">
                        {formatCurrency(remaining)}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">
                        {formatDate(bill.due_date)}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {isPaid ? (
                          <StatusPill variant="success">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            Lunas
                          </StatusPill>
                        ) : isPartiallyPaid ? (
                          <StatusPill variant="warning">
                            <Clock className="w-3 h-3 text-amber-600" />
                            Sebagian
                          </StatusPill>
                        ) : (
                          <StatusPill variant="danger">
                            <AlertCircle className="w-3 h-3 text-rose-600" />
                            Belum Bayar
                          </StatusPill>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenDetail(bill.id)}
                            className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition cursor-pointer"
                            title="Lihat Rincian"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {!isPaid && (
                            <button
                              type="button"
                              onClick={() => handleOpenProofModal(bill)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg text-[11px] shadow-2xs transition cursor-pointer"
                            >
                              <Upload className="w-3 h-3" />
                              <span>Bayar</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL 1: DETAIL TAGIHAN & RIWAYAT PEMBAYARAN */}
      {detailModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in duration-200">
            <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-800">Detail Tagihan Biaya Pendidikan</h3>
                <p className="text-[11px] text-slate-500">ID Tagihan #{selectedBill?.id || '-'}</p>
              </div>
              <button
                type="button"
                onClick={() => { setDetailModalOpen(false); setSelectedBill(null); }}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
              {loadingDetail ? (
                <div className="py-12 text-center text-slate-400">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-emerald-600 mb-1.5" />
                  <p>Memuat detail tagihan...</p>
                </div>
              ) : selectedBill ? (
                <>
                  <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200/80 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Nama Santri</span>
                      <span className="font-bold text-slate-800">{selectedBill.student_name || `Santri #${studentId}`}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Tahun Ajaran</span>
                      <span className="font-bold text-indigo-700 tnum">
                        {selectedBill.academic_year_name ? `T.A. ${selectedBill.academic_year_name}` : '-'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Jenis Biaya</span>
                      <span className="font-semibold text-slate-800">{selectedBill.fee_type_name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Periode Tagihan</span>
                      <span className="tnum text-slate-700">
                        {selectedBill.period_month ? `Bulan ${selectedBill.period_month}/${selectedBill.period_year}` : `Tahun ${selectedBill.period_year}`}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Jatuh Tempo</span>
                      <span className="font-medium text-slate-700">{formatDate(selectedBill.due_date)}</span>
                    </div>
                  </div>

                  <div className="border-t border-slate-200 pt-3 space-y-2">
                    <div className="flex justify-between text-slate-600">
                      <span>Nominal Pokok</span>
                      <span className="tnum">{formatCurrency(parseFloat(selectedBill.amount) + parseFloat(selectedBill.discount_amount || 0))}</span>
                    </div>
                    {parseFloat(selectedBill.discount_amount || 0) > 0 && (
                      <div className="flex justify-between text-emerald-700">
                        <div>
                          <span>Keringanan/Diskon Beasiswa</span>
                          {selectedBill.discount_sk_number && (
                            <div className="text-[10px] text-slate-500">No. SK: {selectedBill.discount_sk_number}</div>
                          )}
                        </div>
                        <span className="font-bold tnum">-{formatCurrency(selectedBill.discount_amount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-slate-600">
                      <span>Sudah Dibayarkan</span>
                      <span className="tnum text-emerald-600 font-semibold">{formatCurrency(selectedBill.paid_amount || 0)}</span>
                    </div>
                    <div className="flex justify-between font-extrabold text-sm text-slate-900 pt-2 border-t border-slate-200">
                      <span>Sisa yang Harus Dibayar</span>
                      <span className="tnum text-emerald-700">
                        {formatCurrency(Math.max(0, parseFloat(selectedBill.amount) - parseFloat(selectedBill.paid_amount || 0)))}
                      </span>
                    </div>
                  </div>

                  {/* Riwayat Pembayaran Sebelumnya */}
                  <div className="border-t border-slate-200 pt-3">
                    <h4 className="text-xs font-bold text-slate-800 mb-2 flex items-center gap-1.5">
                      <CreditCard className="w-3.5 h-3.5 text-slate-500" />
                      <span>Riwayat Pembayaran Sebelumnya</span>
                    </h4>
                    {selectedBill.payments && selectedBill.payments.length > 0 ? (
                      <div className="space-y-1.5">
                        {selectedBill.payments.map((p) => (
                          <div key={p.id} className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 flex justify-between items-center text-[11px]">
                            <div>
                              <span className="font-bold text-slate-700">{p.receipt_number || `KWT #${p.id}`}</span>
                              <div className="text-slate-400">{formatDate(p.paid_at)} &bull; {p.payment_method?.toUpperCase()}</div>
                            </div>
                            <span className="font-bold tnum text-emerald-600">{formatCurrency(p.amount)}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[11px] text-slate-400 italic">Belum ada riwayat pembayaran yang tercatat.</p>
                    )}
                  </div>
                </>
              ) : null}
            </div>

            <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => { setDetailModalOpen(false); setSelectedBill(null); }}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded-xl text-xs transition cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: KONFIRMASI PEMBAYARAN BANK & UPLOAD BUKTI */}
      {proofModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in duration-200">
            <form onSubmit={handleSubmitProof}>
              <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Konfirmasi Pembayaran Bank</h3>
                  <p className="text-[11px] text-slate-500">Tagihan #{proofBill?.id} - {proofBill?.fee_type_name}</p>
                </div>
                <button
                  type="button"
                  onClick={() => { setProofModalOpen(false); setProofBill(null); }}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-5 space-y-3.5 text-xs">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Nominal yang Ditransfer (Rp)</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={proofForm.amount}
                    onChange={(e) => setProofForm({ ...proofForm, amount: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 text-xs font-bold tnum"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Metode Transfer Bank</label>
                  <select
                    value={proofForm.payment_method}
                    onChange={(e) => setProofForm({ ...proofForm, payment_method: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 text-xs"
                  >
                    <option value="bank_transfer">Transfer Bank / Virtual Account (BSI / Mandiri / BCA)</option>
                    <option value="qris">QRIS Yayasan</option>
                    <option value="cash">Titip Tunai / Bendahara</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Tautan / Dokumen Bukti Transfer</label>
                  <input
                    type="url"
                    placeholder="https://storage.aldepos.id/bukti-transfer/..."
                    value={proofForm.proof_document_url}
                    onChange={(e) => setProofForm({ ...proofForm, proof_document_url: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 text-xs"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Masukkan URL foto resi atau screenshot struk mutasi m-banking.</p>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Catatan Tambahan (Opsional)</label>
                  <textarea
                    rows="2"
                    placeholder="Contoh: Transfer atas nama Ayah Ahmad..."
                    value={proofForm.notes}
                    onChange={(e) => setProofForm({ ...proofForm, notes: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 text-xs"
                  />
                </div>
              </div>

              <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => { setProofModalOpen(false); setProofBill(null); }}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded-xl text-xs transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submittingProof}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-xs shadow-xs transition disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                >
                  {submittingProof && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Kirim Konfirmasi</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
