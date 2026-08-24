import React, { useState, useEffect } from 'react';
import api from '../../../shared/services/api';
import {
  Repeat,
  Plus,
  Search,
  Filter,
  Loader2,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  Coins,
  ArrowUpRight,
  BookOpen,
  User,
  X,
  ChevronLeft,
  ChevronRight,
  AlertTriangle
} from 'lucide-react';

export default function Sirkulasi() {
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, per_page: 10, total: 0, total_pages: 1 });

  // Filters
  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  // Create Loan Modal
  const [createLoanModalOpen, setCreateLoanModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    book_copy_id: '',
    member_id: '',
    due_at: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  // Return Book Modal / Action
  const [returningLoan, setReturningLoan] = useState(null);
  const [returnConfirmOpen, setReturnConfirmOpen] = useState(false);
  const [processingReturn, setProcessingReturn] = useState(false);

  useEffect(() => {
    fetchLoans();
  }, [pagination.page, selectedStatus]);

  const fetchLoans = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const params = new URLSearchParams();
      params.append('page', pagination.page);
      params.append('per_page', pagination.per_page);
      if (search) params.append('search', search);
      if (selectedStatus) params.append('loan_status', selectedStatus);

      const res = await api.get(`/api/v1/perpustakaan/loans?${params.toString()}`);
      setLoans(res.data?.data?.items || []);
      if (res.data?.data?.pagination) {
        setPagination(res.data.data.pagination);
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || err.message || 'Gagal memuat data sirkulasi peminjaman');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPagination((prev) => ({ ...prev, page: 1 }));
    fetchLoans();
  };

  const handleOpenCreateLoan = () => {
    setErrorMsg(null);
    const defaultDue = new Date();
    defaultDue.setDate(defaultDue.getDate() + 7);
    setFormData({
      book_copy_id: '',
      member_id: '',
      due_at: defaultDue.toISOString().slice(0, 10),
    });
    setCreateLoanModalOpen(true);
  };

  const handleCreateLoanSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);

    try {
      const payload = {
        book_copy_id: Number(formData.book_copy_id),
        member_id: Number(formData.member_id),
        due_at: formData.due_at || undefined,
      };

      await api.post('/api/v1/perpustakaan/loans', payload);
      setCreateLoanModalOpen(false);
      fetchLoans();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || err.message || 'Gagal memproses peminjaman buku');
    } finally {
      setSubmitting(false);
    }
  };

  const handleExtendLoan = async (loan) => {
    if (!window.confirm(`Perpanjang peminjaman buku "${loan.book_title}" selama 7 hari?`)) return;
    try {
      await api.patch(`/api/v1/perpustakaan/loans/${loan.id}/extend`);
      fetchLoans();
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Gagal memperpanjang peminjaman');
    }
  };

  const handleOpenReturnConfirm = (loan) => {
    setReturningLoan(loan);
    setReturnConfirmOpen(true);
  };

  const handleConfirmReturn = async () => {
    if (!returningLoan) return;
    setProcessingReturn(true);
    try {
      const res = await api.patch(`/api/v1/perpustakaan/loans/${returningLoan.id}/return`);
      setReturnConfirmOpen(false);
      fetchLoans();
      if (res.data?.data?.fine_amount > 0) {
        alert(
          `Buku berhasil dikembalikan! Terdapat denda keterlambatan sebesar Rp${Number(
            res.data.data.fine_amount
          ).toLocaleString('id-ID')}`
        );
      }
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Gagal memproses pengembalian');
    } finally {
      setProcessingReturn(false);
    }
  };

  const handlePayFine = async (loan) => {
    if (!window.confirm(`Konfirmasi pembayaran denda sebesar Rp${Number(loan.fine_amount).toLocaleString('id-ID')}?`)) return;
    try {
      await api.patch(`/api/v1/perpustakaan/loans/${loan.id}/pay-fine`);
      fetchLoans();
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Gagal memproses pembayaran denda');
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 sm:text-2xl tracking-tight">
            Sirkulasi Peminjaman & Pengembalian
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Kelola transaksi peminjaman buku santri/pegawai, perpanjangan masa pinjam, dan denda keterlambatan.
          </p>
        </div>

        <button
          onClick={handleOpenCreateLoan}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-white text-xs font-bold shadow-md shadow-teal-500/20 transition flex items-center justify-center gap-2 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Proses Pinjam Buku</span>
        </button>
      </div>

      {/* Filter / Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
        <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
            <input
              type="text"
              placeholder="Cari berdasarkan judul buku, kode eksemplar, atau nomor kartu peminjam..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:border-teal-500 transition"
            />
          </div>

          <div className="flex items-center gap-2.5 w-full md:w-auto">
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setPagination((prev) => ({ ...prev, page: 1 }));
              }}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-hidden focus:border-teal-500"
            >
              <option value="">Semua Status</option>
              <option value="borrowed">Sedang Dipinjam</option>
              <option value="returned">Sudah Dikembalikan</option>
              <option value="overdue">Terlambat</option>
              <option value="lost">Buku Hilang</option>
            </select>

            <button
              type="submit"
              className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer"
            >
              <Search className="w-3.5 h-3.5" />
              <span>Cari</span>
            </button>
          </div>
        </form>
      </div>

      {/* Table Content */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-20 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-teal-500 animate-spin" />
          </div>
        ) : loans.length === 0 ? (
          <div className="py-20 text-center text-xs text-slate-400">
            Tidak ada transaksi sirkulasi peminjaman ditemukan.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-100 uppercase text-[10px] font-bold tracking-wider">
                <tr>
                  <th className="py-3 px-4">Judul & Eksemplar</th>
                  <th className="py-3 px-4">Peminjam</th>
                  <th className="py-3 px-4">Tgl Pinjam & Tempo</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4">Denda</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loans.map((loan) => {
                  const isOverdue = loan.loan_status === 'borrowed' && new Date() > new Date(loan.due_at);
                  return (
                    <tr key={loan.id} className="hover:bg-slate-50/60 transition">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-800">{loan.book_title}</div>
                        <div className="text-[11px] font-mono text-teal-600 font-semibold mt-0.5">
                          {loan.copy_code}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-800">{loan.borrower_name}</div>
                        <div className="text-[10px] font-mono text-slate-400">
                          {loan.member_card_number}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="text-slate-700">
                          Pinjam: {new Date(loan.borrowed_at).toLocaleDateString('id-ID')}
                        </div>
                        <div
                          className={`text-[11px] font-medium mt-0.5 ${
                            isOverdue ? 'text-rose-600 font-bold' : 'text-slate-500'
                          }`}
                        >
                          Tempo: {new Date(loan.due_at).toLocaleDateString('id-ID')}{' '}
                          {loan.extended_count > 0 && (
                            <span className="text-[9px] px-1 py-0.2 rounded bg-slate-100 font-mono">
                              +{loan.extended_count}x
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            loan.loan_status === 'returned'
                              ? 'bg-emerald-50 text-emerald-600 border border-emerald-200/60'
                              : isOverdue || loan.loan_status === 'overdue'
                              ? 'bg-rose-50 text-rose-600 border border-rose-200/60'
                              : 'bg-teal-50 text-teal-600 border border-teal-200/60'
                          }`}
                        >
                          {isOverdue && loan.loan_status === 'borrowed' ? 'Terlambat' : loan.loan_status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        {Number(loan.fine_amount) > 0 ? (
                          <div>
                            <div className="font-bold text-rose-600 font-mono">
                              Rp{Number(loan.fine_amount).toLocaleString('id-ID')}
                            </div>
                            <span
                              className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase ${
                                loan.fine_payment_status === 'paid'
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : 'bg-rose-100 text-rose-700'
                              }`}
                            >
                              {loan.fine_payment_status === 'paid' ? 'Lunas' : 'Belum Bayar'}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {loan.loan_status === 'borrowed' && (
                            <>
                              <button
                                onClick={() => handleExtendLoan(loan)}
                                className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold transition cursor-pointer"
                                title="Perpanjang Pinjaman 7 Hari"
                              >
                                Perpanjang
                              </button>
                              <button
                                onClick={() => handleOpenReturnConfirm(loan)}
                                className="px-2 py-1 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-[11px] font-bold transition cursor-pointer shadow-xs"
                                title="Proses Pengembalian"
                              >
                                Kembalikan
                              </button>
                            </>
                          )}
                          {loan.fine_payment_status === 'unpaid' && (
                            <button
                              onClick={() => handlePayFine(loan)}
                              className="px-2 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-[11px] font-bold transition cursor-pointer shadow-xs flex items-center gap-1"
                              title="Bayar Denda"
                            >
                              <Coins className="w-3 h-3" />
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

        {/* Pagination Footer */}
        <div className="p-4 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <div>
            Menampilkan halaman <span className="font-bold text-slate-800">{pagination.page}</span> dari{' '}
            <span className="font-bold text-slate-800">{pagination.total_pages || 1}</span> (Total: {pagination.total} transaksi)
          </div>
          <div className="flex items-center gap-1.5">
            <button
              disabled={pagination.page <= 1}
              onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
              className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 transition cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              disabled={pagination.page >= pagination.total_pages}
              onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
              className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 transition cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Modal Proses Peminjaman Buku */}
      {createLoanModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
              <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Repeat className="w-4 h-4 text-teal-600" />
                <span>Catat Transaksi Peminjaman Baru</span>
              </h2>
              <button
                onClick={() => setCreateLoanModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {errorMsg && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleCreateLoanSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ID Eksemplar Fisik Buku <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  required
                  value={formData.book_copy_id}
                  onChange={(e) => setFormData({ ...formData, book_copy_id: e.target.value })}
                  placeholder="Masukkan ID Eksemplar (book_copy_id)"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ID Anggota Perpustakaan <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  required
                  value={formData.member_id}
                  onChange={(e) => setFormData({ ...formData, member_id: e.target.value })}
                  placeholder="Masukkan ID Anggota (member_id)"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tanggal Batas Jatuh Tempo
                </label>
                <input
                  type="date"
                  value={formData.due_at}
                  onChange={(e) => setFormData({ ...formData, due_at: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Default masa pinjam adalah 7 hari dari tanggal hari ini.
                </p>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setCreateLoanModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-semibold transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Proses Peminjaman</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Pengembalian Buku */}
      {returnConfirmOpen && returningLoan && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-sm font-bold text-slate-800">
                Konfirmasi Pengembalian Buku
              </h2>
              <button
                onClick={() => setReturnConfirmOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div className="font-bold text-slate-800">{returningLoan.book_title}</div>
                <div className="text-slate-500 mt-0.5 font-mono">{returningLoan.copy_code}</div>
                <div className="text-slate-600 mt-1">Peminjam: <span className="font-semibold">{returningLoan.borrower_name}</span></div>
              </div>

              {new Date() > new Date(returningLoan.due_at) && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Perhatian: Terlambat dikembalikan!</span>
                    <p className="mt-0.5 text-[11px]">
                      Sistem akan mengkalkulasi denda otomatis sebesar Rp1.000 per hari keterlambatan.
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <button
                onClick={() => setReturnConfirmOpen(false)}
                className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-semibold transition cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={handleConfirmReturn}
                disabled={processingReturn}
                className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {processingReturn && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Proses Pengembalian</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
