import React, { useState, useEffect } from 'react';
import api from '../../../shared/services/api';
import {
  BookmarkCheck,
  Plus,
  Search,
  Filter,
  Loader2,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  X,
  BookOpen,
  User,
  ChevronLeft,
  ChevronRight,
  AlertTriangle
} from 'lucide-react';

export default function Reservasi() {
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, per_page: 10, total: 0, total_pages: 1 });

  // Filters
  const [selectedStatus, setSelectedStatus] = useState('');

  // Create Modal
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    book_id: '',
    member_id: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
    fetchReservations();
  }, [pagination.page, selectedStatus]);

  const fetchReservations = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const params = new URLSearchParams();
      params.append('page', pagination.page);
      params.append('per_page', pagination.per_page);
      if (selectedStatus) params.append('reservation_status', selectedStatus);

      const res = await api.get(`/api/v1/perpustakaan/reservations?${params.toString()}`);
      setReservations(res.data?.data?.items || []);
      if (res.data?.data?.pagination) {
        setPagination(res.data.data.pagination);
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || err.message || 'Gagal memuat data reservasi buku');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setErrorMsg(null);
    setFormData({
      book_id: '',
      member_id: '',
    });
    setCreateModalOpen(true);
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);

    try {
      const payload = {
        book_id: Number(formData.book_id),
        member_id: Number(formData.member_id),
      };

      await api.post('/api/v1/perpustakaan/reservations', payload);
      setCreateModalOpen(false);
      fetchReservations();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || err.message || 'Gagal membuat antrean reservasi');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelReservation = async (resv) => {
    if (!window.confirm(`Batalkan reservasi buku "${resv.book_title}" untuk anggota ${resv.member_name}?`)) return;

    try {
      await api.patch(`/api/v1/perpustakaan/reservations/${resv.id}/cancel`);
      fetchReservations();
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Gagal membatalkan reservasi');
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 sm:text-2xl tracking-tight">
            Antrean Reservasi Buku
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Daftar pemesanan/booking judul buku yang sedang habis stok dan menunggu eksemplar dikembalikan.
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-white text-xs font-bold shadow-md shadow-teal-500/20 transition flex items-center justify-center gap-2 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Buat Antrean Reservasi</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={selectedStatus}
            onChange={(e) => {
              setSelectedStatus(e.target.value);
              setPagination((prev) => ({ ...prev, page: 1 }));
            }}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-hidden focus:border-teal-500"
          >
            <option value="">Semua Status Antrean</option>
            <option value="waiting">Menunggu Pengembalian (Waiting)</option>
            <option value="ready_to_pickup">Siap Diambil di Perpustakaan</option>
            <option value="fulfilled">Selesai (Sudah Dipinjam)</option>
            <option value="cancelled">Dibatalkan</option>
            <option value="expired">Kedaluwarsa</option>
          </select>
        </div>

        <div className="text-xs text-slate-500">
          Total: <span className="font-bold text-slate-800">{pagination.total}</span> reservasi
        </div>
      </div>

      {/* Table Content */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-20 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-teal-500 animate-spin" />
          </div>
        ) : reservations.length === 0 ? (
          <div className="py-20 text-center text-xs text-slate-400">
            Tidak ada data antrean reservasi buku.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-100 uppercase text-[10px] font-bold tracking-wider">
                <tr>
                  <th className="py-3 px-4">Judul Buku</th>
                  <th className="py-3 px-4">Pemesan (Anggota)</th>
                  <th className="py-3 px-4">Waktu Booking</th>
                  <th className="py-3 px-4 text-center">Status Antrean</th>
                  <th className="py-3 px-4">Batas Ambil</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {reservations.map((resv) => (
                  <tr key={resv.id} className="hover:bg-slate-50/60 transition">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-800">{resv.book_title}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {resv.book_author || '-'} • Rak {resv.book_shelf || '-'}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-800">{resv.member_name}</div>
                      <div className="text-[10px] font-mono text-slate-400">
                        {resv.member_card_number}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">
                      {new Date(resv.reserved_at).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          resv.reservation_status === 'ready_to_pickup'
                            ? 'bg-emerald-50 text-emerald-600 border border-emerald-200 animate-pulse'
                            : resv.reservation_status === 'waiting'
                            ? 'bg-amber-50 text-amber-600 border border-amber-200'
                            : resv.reservation_status === 'fulfilled'
                            ? 'bg-teal-50 text-teal-600 border border-teal-200'
                            : 'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}
                      >
                        {resv.reservation_status === 'ready_to_pickup'
                          ? 'Siap Diambil'
                          : resv.reservation_status === 'waiting'
                          ? 'Menunggu Stok'
                          : resv.reservation_status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">
                      {resv.expires_at
                        ? new Date(resv.expires_at).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : '-'}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {['waiting', 'ready_to_pickup'].includes(resv.reservation_status) && (
                        <button
                          onClick={() => handleCancelReservation(resv)}
                          className="px-2 py-1 rounded-lg text-rose-600 hover:bg-rose-50 border border-rose-200/60 text-[11px] font-semibold transition cursor-pointer"
                          title="Batalkan Reservasi"
                        >
                          Batalkan
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        <div className="p-4 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <div>
            Menampilkan halaman <span className="font-bold text-slate-800">{pagination.page}</span> dari{' '}
            <span className="font-bold text-slate-800">{pagination.total_pages || 1}</span>
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

      {/* Modal Buat Reservasi Baru */}
      {createModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
              <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <BookmarkCheck className="w-4 h-4 text-teal-600" />
                <span>Buat Antrean Reservasi Buku</span>
              </h2>
              <button
                onClick={() => setCreateModalOpen(false)}
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

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ID Judul Buku <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  required
                  value={formData.book_id}
                  onChange={(e) => setFormData({ ...formData, book_id: e.target.value })}
                  placeholder="Masukkan ID Buku (book_id)"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Catatan: Reservasi hanya dapat dibuat jika seluruh eksemplar buku sedang dipinjam.
                </p>
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

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
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
                  <span>Buat Reservasi</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
