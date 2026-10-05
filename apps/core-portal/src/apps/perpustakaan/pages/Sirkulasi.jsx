import React, { useState, useEffect } from 'react';
import api from '../../../shared/services/api';
import {
  Repeat,
  Plus,
  BookOpen,
  CheckCircle2,
  Calendar,
  Clock,
  Coins,
  Loader2,
  ArrowUpRight
} from 'lucide-react';
import DataTable from '../../../shared/components/DataTable';
import FilterBar from '../../../shared/components/FilterBar';
import Modal from '../../../shared/components/Modal';
import FlatAlertBanner from '../../../shared/components/FlatAlertBanner';
import StatusPill from '../../../shared/components/StatusPill';
import { formatCurrency } from '../../../shared/utils/formatters';

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

  const handleSearch = (text) => {
    setSearch(text);
    setPagination((prev) => ({ ...prev, page: 1 }));
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
      setErrorMsg(err.response?.data?.message || err.message || 'Gagal memproses peminjaman');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenReturnConfirm = (loan) => {
    setReturningLoan(loan);
    setReturnConfirmOpen(true);
  };

  const handleProcessReturn = async () => {
    if (!returningLoan) return;
    setProcessingReturn(true);

    try {
      await api.post(`/api/v1/perpustakaan/loans/${returningLoan.id}/return`, {
        fine_amount: 0,
        notes: 'Pengembalian buku normal',
      });
      setReturnConfirmOpen(false);
      fetchLoans();
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Gagal memproses pengembalian buku');
    } finally {
      setProcessingReturn(false);
    }
  };

  const columns = [
    {
      key: 'book_title',
      label: 'Judul Buku & Eksemplar',
      render: (val, row) => (
        <div>
          <div className="font-semibold text-slate-800 leading-snug">{val}</div>
          <div className="text-[11px] font-mono text-slate-400 mt-0.5">
            Barcode: {row.copy_code || '-'}
          </div>
        </div>
      )
    },
    {
      key: 'borrower_name',
      label: 'Peminjam',
      render: (val, row) => (
        <div>
          <div className="font-medium text-slate-700">{val || row.member_name || '-'}</div>
          <div className="text-[11px] font-mono text-slate-400">
            Kartu #{row.member_card_number || row.member_id || '-'}
          </div>
        </div>
      )
    },
    {
      key: 'borrowed_at',
      label: 'Tgl Pinjam',
      type: 'date',
      render: (val) => (
        <span className="text-xs text-slate-600 font-mono">
          {val ? new Date(val).toLocaleDateString('id-ID') : '-'}
        </span>
      )
    },
    {
      key: 'due_at',
      label: 'Jatuh Tempo',
      render: (val, row) => {
        const isOverdue = row.loan_status === 'overdue' || (row.loan_status === 'borrowed' && new Date(val) < new Date());
        return (
          <span className={`text-xs font-mono font-medium ${isOverdue ? 'text-rose-600 font-bold' : 'text-slate-600'}`}>
            {val ? new Date(val).toLocaleDateString('id-ID') : '-'}
          </span>
        );
      }
    },
    {
      key: 'returned_at',
      label: 'Tgl Kembali / Denda',
      render: (val, row) => (
        <div>
          <div className="text-xs text-slate-600 font-mono">
            {val ? new Date(val).toLocaleDateString('id-ID') : '-'}
          </div>
          {row.fine_amount > 0 && (
            <div className="text-[11px] font-bold text-rose-600 font-mono">
              Denda: {formatCurrency(row.fine_amount)}
            </div>
          )}
        </div>
      )
    },
    {
      key: 'loan_status',
      label: 'Status',
      type: 'status',
      width: '110px'
    },
    {
      key: 'actions',
      label: 'Aksi',
      align: 'right',
      sticky: 'right',
      width: '110px',
      render: (_, loan) => (
        <div className="flex items-center justify-end">
          {loan.loan_status === 'borrowed' || loan.loan_status === 'overdue' ? (
            <button
              type="button"
              onClick={() => handleOpenReturnConfirm(loan)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition cursor-pointer border border-emerald-200"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Kembalikan</span>
            </button>
          ) : (
            <span className="text-[11px] text-slate-400 font-medium">Selesai</span>
          )}
        </div>
      )
    }
  ];

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-slate-800 leading-snug">
            Sirkulasi Peminjaman & Pengembalian
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Pencatatan peminjaman aktif, pemantauan batas jatuh tempo, dan proses pengembalian buku.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenCreateLoan}
          className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-2xs transition flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Pinjamkan Buku Baru</span>
        </button>
      </div>

      {/* FilterBar Standar */}
      <FilterBar
        searchValue={search}
        onSearchChange={handleSearch}
        searchPlaceholder="Cari judul buku atau nama peminjam..."
        onReset={() => {
          setSearch('');
          setSelectedStatus('');
          setPagination((prev) => ({ ...prev, page: 1 }));
        }}
        hasActiveFilters={Boolean(selectedStatus || search)}
        filters={
          <select
            value={selectedStatus}
            onChange={(e) => {
              setSelectedStatus(e.target.value);
              setPagination((prev) => ({ ...prev, page: 1 }));
            }}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:bg-white focus:outline-none focus:border-emerald-500 transition"
          >
            <option value="">Semua Status Sirkulasi</option>
            <option value="borrowed">Sedang Dipinjam</option>
            <option value="overdue">Terlambat (Overdue)</option>
            <option value="returned">Sudah Dikembalikan</option>
            <option value="lost">Buku Hilang</option>
          </select>
        }
        actions={
          <span className="text-xs text-slate-500">
            Total: <span className="font-bold text-slate-800 tnum">{pagination.total}</span> transaksi
          </span>
        }
      />

      {/* Generic DataTable */}
      <DataTable
        columns={columns}
        data={loans}
        loading={loading}
        density="compact"
        emptyTitle="Belum Ada Transaksi Sirkulasi"
        emptyDescription="Catatan peminjaman buku belum tersedia atau tidak sesuai dengan filter."
        emptyAction={
          <button
            type="button"
            onClick={handleOpenCreateLoan}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition shadow-2xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Proses Peminjaman Baru</span>
          </button>
        }
        pagination={{
          currentPage: pagination.page,
          totalItems: pagination.total,
          pageSize: pagination.per_page,
          onPageChange: (newPage) => setPagination((prev) => ({ ...prev, page: newPage }))
        }}
      />

      {/* Modal Peminjaman Baru */}
      <Modal
        isOpen={createLoanModalOpen}
        onClose={() => setCreateLoanModalOpen(false)}
        title="Proses Peminjaman Buku Baru"
        subtitle="Entri ID eksemplar buku fisik dan ID anggota peminjam."
        size="md"
        footer={
          <>
            <button
              type="button"
              onClick={() => setCreateLoanModalOpen(false)}
              className="px-3.5 py-1.5 rounded-lg text-slate-600 hover:bg-slate-100 text-xs font-semibold transition cursor-pointer"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleCreateLoanSubmit}
              disabled={submitting}
              className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-2xs"
            >
              {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Simpan & Terbitkan Pinjaman</span>
            </button>
          </>
        }
      >
        <div className="space-y-3.5">
          {errorMsg && (
            <FlatAlertBanner
              variant="danger"
              title="Gagal Memproses Peminjaman"
              description={errorMsg}
            />
          )}

          <form onSubmit={handleCreateLoanSubmit} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                ID Eksemplar Buku Fisik (Copy ID)
              </label>
              <input
                type="number"
                required
                value={formData.book_copy_id}
                onChange={(e) => setFormData({ ...formData, book_copy_id: e.target.value })}
                placeholder="Masukkan ID Eksemplar"
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono focus:bg-white focus:outline-none focus:border-emerald-500 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                ID Anggota Peminjam
              </label>
              <input
                type="number"
                required
                value={formData.member_id}
                onChange={(e) => setFormData({ ...formData, member_id: e.target.value })}
                placeholder="Masukkan ID Anggota"
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono focus:bg-white focus:outline-none focus:border-emerald-500 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tanggal Batas Jatuh Tempo
              </label>
              <input
                type="date"
                required
                value={formData.due_at}
                onChange={(e) => setFormData({ ...formData, due_at: e.target.value })}
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono focus:bg-white focus:outline-none focus:border-emerald-500 transition"
              />
            </div>
          </form>
        </div>
      </Modal>

      {/* Modal Konfirmasi Pengembalian */}
      <Modal
        isOpen={returnConfirmOpen}
        onClose={() => setReturnConfirmOpen(false)}
        title="Konfirmasi Pengembalian Buku"
        subtitle={returningLoan ? `Proses pengembalian untuk buku: ${returningLoan.book_title}` : ''}
        size="sm"
        footer={
          <>
            <button
              type="button"
              onClick={() => setReturnConfirmOpen(false)}
              className="px-3.5 py-1.5 rounded-lg text-slate-600 hover:bg-slate-100 text-xs font-semibold transition cursor-pointer"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleProcessReturn}
              disabled={processingReturn}
              className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-2xs"
            >
              {processingReturn && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Konfirmasi Kembali</span>
            </button>
          </>
        }
      >
        <div className="space-y-2 text-xs text-slate-600">
          <p>
            Pastikan fisik buku dalam kondisi baik dan tidak mengalami kerusakan sebelum mengonfirmasi pengembalian.
          </p>
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/80 space-y-1 text-[11px]">
            <div>Peminjam: <span className="font-semibold text-slate-800">{returningLoan?.borrower_name || returningLoan?.member_name}</span></div>
            <div>Kode Eksemplar: <span className="font-mono text-slate-800">{returningLoan?.copy_code}</span></div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
