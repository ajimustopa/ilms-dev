import React, { useState, useEffect } from 'react';
import api from '../../../shared/services/api';
import {
  BookmarkCheck,
  Plus,
  BookOpen,
  User,
  XCircle,
  Loader2
} from 'lucide-react';
import DataTable from '../../../shared/components/DataTable';
import FilterBar from '../../../shared/components/FilterBar';
import Modal from '../../../shared/components/Modal';
import FlatAlertBanner from '../../../shared/components/FlatAlertBanner';
import StatusPill from '../../../shared/components/StatusPill';

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

  const columns = [
    {
      key: 'book_title',
      label: 'Judul Buku Dipesan',
      render: (val, row) => (
        <div>
          <div className="font-semibold text-slate-800 leading-snug">{val}</div>
          <div className="text-[11px] font-mono text-slate-400 mt-0.5">
            Buku ID #{row.book_id} • Antrean #{row.id}
          </div>
        </div>
      )
    },
    {
      key: 'member_name',
      label: 'Nama Pemesan',
      render: (val, row) => (
        <div>
          <div className="font-medium text-slate-700">{val || '-'}</div>
          <div className="text-[11px] font-mono text-slate-400">
            Anggota #{row.member_id}
          </div>
        </div>
      )
    },
    {
      key: 'created_at',
      label: 'Tgl Booking',
      type: 'date',
      render: (val) => (
        <span className="text-xs text-slate-600 font-mono">
          {val ? new Date(val).toLocaleDateString('id-ID') : '-'}
        </span>
      )
    },
    {
      key: 'available_at',
      label: 'Batas Ambil',
      render: (val) => (
        <span className="text-xs text-slate-600 font-mono">
          {val ? new Date(val).toLocaleDateString('id-ID') : '-'}
        </span>
      )
    },
    {
      key: 'reservation_status',
      label: 'Status Antrean',
      type: 'status',
      width: '120px'
    },
    {
      key: 'actions',
      label: 'Aksi',
      align: 'right',
      sticky: 'right',
      width: '100px',
      render: (_, resv) => (
        <div className="flex items-center justify-end">
          {resv.reservation_status === 'waiting' || resv.reservation_status === 'ready' ? (
            <button
              type="button"
              onClick={() => handleCancelReservation(resv)}
              className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
              title="Batalkan Reservasi"
            >
              <XCircle className="w-3.5 h-3.5" />
              <span>Batal</span>
            </button>
          ) : (
            <span className="text-[11px] text-slate-400">-</span>
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
            Antrean Reservasi Buku
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Daftar antrean pemesanan buku yang sedang dipinjam santri/guru lain.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenCreate}
          className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-2xs transition flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Buat Antrean Reservasi</span>
        </button>
      </div>

      {/* FilterBar Standar */}
      <FilterBar
        onReset={() => {
          setSelectedStatus('');
          setPagination((prev) => ({ ...prev, page: 1 }));
        }}
        hasActiveFilters={Boolean(selectedStatus)}
        filters={
          <select
            value={selectedStatus}
            onChange={(e) => {
              setSelectedStatus(e.target.value);
              setPagination((prev) => ({ ...prev, page: 1 }));
            }}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:bg-white focus:outline-none focus:border-emerald-500 transition"
          >
            <option value="">Semua Status Reservasi</option>
            <option value="waiting">Menunggu Stok (Waiting)</option>
            <option value="ready">Siap Diambil (Ready)</option>
            <option value="fulfilled">Selesai / Dipinjam</option>
            <option value="cancelled">Dibatalkan</option>
          </select>
        }
        actions={
          <span className="text-xs text-slate-500">
            Total: <span className="font-bold text-slate-800 tnum">{pagination.total}</span> antrean
          </span>
        }
      />

      {/* Generic DataTable */}
      <DataTable
        columns={columns}
        data={reservations}
        loading={loading}
        density="compact"
        emptyTitle="Belum Ada Antrean Reservasi"
        emptyDescription="Tidak ada pemesanan buku aktif dalam daftar antrean perpustakaan."
        emptyAction={
          <button
            type="button"
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition shadow-2xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Buat Reservasi Baru</span>
          </button>
        }
        pagination={{
          currentPage: pagination.page,
          totalItems: pagination.total,
          pageSize: pagination.per_page,
          onPageChange: (newPage) => setPagination((prev) => ({ ...prev, page: newPage }))
        }}
      />

      {/* Modal Buat Reservasi Baru */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Buat Antrean Reservasi Baru"
        subtitle="Daftarkan antrean pemesanan buku untuk anggota perpustakaan."
        size="md"
        footer={
          <>
            <button
              type="button"
              onClick={() => setCreateModalOpen(false)}
              className="px-3.5 py-1.5 rounded-lg text-slate-600 hover:bg-slate-100 text-xs font-semibold transition cursor-pointer"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleCreateSubmit}
              disabled={submitting}
              className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-2xs"
            >
              {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Simpan Reservasi</span>
            </button>
          </>
        }
      >
        <div className="space-y-3.5">
          {errorMsg && (
            <FlatAlertBanner
              variant="danger"
              title="Gagal Membuat Reservasi"
              description={errorMsg}
            />
          )}

          <form onSubmit={handleCreateSubmit} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                ID Judul Buku yang Dipesan
              </label>
              <input
                type="number"
                required
                value={formData.book_id}
                onChange={(e) => setFormData({ ...formData, book_id: e.target.value })}
                placeholder="Masukkan ID Buku"
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono focus:bg-white focus:outline-none focus:border-emerald-500 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                ID Anggota Pemesan
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
          </form>
        </div>
      </Modal>
    </div>
  );
}
