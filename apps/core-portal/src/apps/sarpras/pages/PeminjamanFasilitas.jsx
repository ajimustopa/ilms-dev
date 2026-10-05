import React, { useState, useEffect, useMemo } from 'react';
import api from '../../../shared/services/api';
import { useAuth } from '../../../shared/store/AuthContext';
import DataTable from '../../../shared/components/DataTable';
import Modal from '../../../shared/components/Modal';
import StatusPill from '../../../shared/components/StatusPill';
import FlatAlertBanner from '../../../shared/components/FlatAlertBanner';
import { formatDate } from '../../../shared/utils/formatters';
import {
  CalendarClock,
  Plus,
  XCircle,
  Clock,
  Calendar as CalendarIcon,
  Check,
  X,
  Loader2
} from 'lucide-react';

export default function PeminjamanFasilitas() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('bookings'); // 'bookings', 'schedule'
  const [bookings, setBookings] = useState([]);
  const [schedule, setSchedule] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(false);

  // Form & Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [formData, setFormData] = useState({});
  const [approvalModalOpen, setApprovalModalOpen] = useState(false);
  const [targetBooking, setTargetBooking] = useState(null);
  const [actionType, setActionType] = useState('approve'); // 'approve', 'reject'
  const [actionNotes, setActionNotes] = useState('');
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);

  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const res = await api.get('/sarpras/bookings');
      if (res.data?.success) setBookings(res.data.data || []);
    } catch (err) {
      console.error('Error fetching bookings:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSchedule = async (date) => {
    try {
      const res = await api.get(`/sarpras/bookings/schedule?date=${date}`);
      if (res.data?.success) setSchedule(res.data.data || []);
    } catch (err) {
      console.error('Error fetching schedule:', err);
    }
  };

  const fetchRooms = async () => {
    try {
      const res = await api.get('/sarpras/rooms');
      if (res.data?.success) setRooms(res.data.data || []);
    } catch (err) {
      console.error('Error fetching rooms:', err);
    }
  };

  useEffect(() => {
    fetchBookings();
    fetchRooms();
  }, []);

  useEffect(() => {
    if (activeTab === 'schedule') {
      fetchSchedule(filterDate);
    }
  }, [activeTab, filterDate]);

  const openCreateModal = () => {
    setFormData({
      facility_room_id: rooms[0]?.id || '',
      other_facility_name: '',
      employee_id: user?.ref_type === 'employee' ? user?.ref_id : 1,
      purpose: '',
      booking_date: new Date().toISOString().split('T')[0],
      start_time: '08:00',
      end_time: '10:00'
    });
    setCreateModalOpen(true);
  };

  const handleCreateBooking = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/sarpras/bookings', formData);
      setMessage({ type: 'emerald', title: 'Berhasil', text: 'Pengajuan peminjaman fasilitas berhasil dikirim' });
      setCreateModalOpen(false);
      fetchBookings();
    } catch (err) {
      setMessage({ type: 'rose', title: 'Gagal', text: err.response?.data?.message || err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const openApprovalModal = (booking, type) => {
    setTargetBooking(booking);
    setActionType(type);
    setActionNotes('');
    setApprovalModalOpen(true);
  };

  const handleApprovalSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const endpoint = actionType === 'approve'
        ? `/sarpras/bookings/${targetBooking.id}/approve`
        : `/sarpras/bookings/${targetBooking.id}/reject`;

      await api.post(endpoint, { notes: actionNotes });
      setMessage({
        type: 'emerald',
        title: 'Berhasil',
        text: `Peminjaman berhasil di-${actionType === 'approve' ? 'setujui' : 'tolak'}`
      });
      setApprovalModalOpen(false);
      fetchBookings();
    } catch (err) {
      setMessage({ type: 'rose', title: 'Gagal', text: err.response?.data?.message || err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelBooking = async (id) => {
    if (!window.confirm('Yakin ingin membatalkan pengajuan peminjaman ini?')) return;
    try {
      await api.delete(`/sarpras/bookings/${id}`);
      setMessage({ type: 'emerald', title: 'Dibatalkan', text: 'Pengajuan peminjaman berhasil dibatalkan' });
      fetchBookings();
    } catch (err) {
      setMessage({ type: 'rose', title: 'Gagal', text: err.response?.data?.message || err.message });
    }
  };

  const columns = useMemo(() => [
    {
      key: 'facility',
      header: 'Fasilitas / Ruangan',
      sortable: true,
      render: (row) => (
        <span className="font-semibold text-slate-800">
          {row.room_name ? `${row.room_name} (${row.room_code})` : row.other_facility_name || 'Fasilitas Terbuka'}
        </span>
      )
    },
    {
      key: 'purpose',
      header: 'Keperluan / Acara',
      render: (row) => <span className="text-slate-600 line-clamp-2">{row.purpose}</span>
    },
    {
      key: 'booking_date',
      header: 'Tanggal',
      sortable: true,
      className: 'w-28 text-slate-700 font-medium',
      render: (row) => formatDate(row.booking_date)
    },
    {
      key: 'time',
      header: 'Waktu',
      align: 'center',
      className: 'w-32 text-center font-mono text-xs text-slate-600',
      render: (row) => `${row.start_time?.slice(0, 5)} - ${row.end_time?.slice(0, 5)}`
    },
    {
      key: 'status',
      header: 'Status',
      align: 'center',
      className: 'w-28 text-center',
      render: (row) => <StatusPill status={row.status || 'pending'} />
    },
    {
      key: 'actions',
      header: 'Aksi & Approval',
      align: 'right',
      sticky: 'right',
      className: 'w-44 text-right bg-white',
      render: (row) => (
        <div className="flex items-center justify-end gap-1.5">
          {row.status === 'pending' && (
            <>
              <button
                type="button"
                onClick={() => openApprovalModal(row, 'approve')}
                className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1 shadow-2xs transition"
                title="Setujui Peminjaman"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Setuju</span>
              </button>
              <button
                type="button"
                onClick={() => openApprovalModal(row, 'reject')}
                className="px-2 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1 shadow-2xs transition"
                title="Tolak Peminjaman"
              >
                <X className="w-3.5 h-3.5" />
                <span>Tolak</span>
              </button>
              <button
                type="button"
                onClick={() => handleCancelBooking(row.id)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
                title="Batalkan"
              >
                <XCircle className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      )
    }
  ], []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Peminjaman Fasilitas & Ruangan</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Pengajuan peminjaman ruang kelas/aula/lapangan, cek jadwal pemakaian, dan approval
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white shadow-xs transition"
        >
          <Plus className="w-4 h-4" />
          <span>Ajukan Peminjaman</span>
        </button>
      </div>

      {message && (
        <FlatAlertBanner
          variant={message.type}
          title={message.title}
          onClose={() => setMessage(null)}
        >
          {message.text}
        </FlatAlertBanner>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          type="button"
          onClick={() => setActiveTab('bookings')}
          className={`pb-3 px-4 text-xs font-semibold border-b-2 transition flex items-center gap-2 ${
            activeTab === 'bookings'
              ? 'border-emerald-600 text-emerald-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Daftar Pengajuan ({bookings.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('schedule')}
          className={`pb-3 px-4 text-xs font-semibold border-b-2 transition flex items-center gap-2 ${
            activeTab === 'schedule'
              ? 'border-emerald-600 text-emerald-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <CalendarIcon className="w-4 h-4" />
          <span>Kalender / Jadwal Pemakaian</span>
        </button>
      </div>

      {/* Tab 1: Bookings Table */}
      {activeTab === 'bookings' && (
        <DataTable
          columns={columns}
          data={bookings}
          loading={loading}
          emptyTitle="Belum Ada Pengajuan Peminjaman"
          emptyDescription="Klik 'Ajukan Peminjaman' untuk mengajukan penggunaan ruangan atau fasilitas sekolah."
        />
      )}

      {/* Tab 2: Schedule View */}
      {activeTab === 'schedule' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center gap-3">
            <CalendarIcon className="w-4 h-4 text-emerald-600" />
            <span className="text-xs font-semibold text-slate-700">Pilih Tanggal:</span>
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-hidden focus:border-emerald-500"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {schedule.length > 0 ? (
              schedule.map((item, idx) => (
                <div key={idx} className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-slate-800">
                      {item.start_time?.slice(0, 5)} - {item.end_time?.slice(0, 5)}
                    </span>
                    <StatusPill status={item.status || 'approved'} />
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 mt-2">{item.room_name || item.other_facility_name}</h4>
                  <p className="text-xs text-slate-600 mt-1">{item.purpose}</p>
                  <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                    <span>Pemohon: {item.requested_by_user_id ? `User #${item.requested_by_user_id}` : 'Staff'}</span>
                    <span>{item.booking_date}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-3 py-12 text-center bg-white rounded-xl border border-slate-200">
                <CalendarIcon className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs text-slate-500 font-medium">Tidak ada fasilitas yang dipinjam pada tanggal ini</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal Ajukan Peminjaman */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Form Pengajuan Peminjaman Fasilitas"
        size="md"
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50 transition"
            >
              Batal
            </button>
            <button
              type="submit"
              form="form-booking"
              disabled={submitting}
              className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition flex items-center gap-1.5"
            >
              {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Kirim Permohonan</span>
            </button>
          </div>
        }
      >
        <form id="form-booking" onSubmit={handleCreateBooking} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Pilih Ruangan / Gedung</label>
            <select
              value={formData.facility_room_id || ''}
              onChange={(e) => setFormData({ ...formData, facility_room_id: Number(e.target.value) })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-hidden focus:border-emerald-500"
            >
              <option value="">-- Atau Isi Fasilitas Terbuka di Bawah --</option>
              {rooms.map(r => <option key={r.id} value={r.id}>{r.room_name} ({r.room_code})</option>)}
            </select>
          </div>

          {!formData.facility_room_id && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Fasilitas Non-Ruangan</label>
              <input
                type="text"
                value={formData.other_facility_name || ''}
                onChange={(e) => setFormData({ ...formData, other_facility_name: e.target.value })}
                placeholder="Contoh: Lapangan Rumput Utama / Tenda Parkir"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-hidden focus:border-emerald-500"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Tujuan / Acara *</label>
            <input
              type="text"
              required
              value={formData.purpose || ''}
              onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
              placeholder="Contoh: Rapat Koordinasi Guru & Wali Kelas"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-hidden focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Tanggal Pemakaian *</label>
            <input
              type="date"
              required
              value={formData.booking_date || ''}
              onChange={(e) => setFormData({ ...formData, booking_date: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-hidden focus:border-emerald-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Jam Mulai *</label>
              <input
                type="time"
                required
                value={formData.start_time || '08:00'}
                onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-hidden focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Jam Selesai *</label>
              <input
                type="time"
                required
                value={formData.end_time || '10:00'}
                onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-hidden focus:border-emerald-500"
              />
            </div>
          </div>
        </form>
      </Modal>

      {/* Modal Approval / Reject */}
      <Modal
        isOpen={approvalModalOpen}
        onClose={() => setApprovalModalOpen(false)}
        title={actionType === 'approve' ? 'Persetujuan Peminjaman' : 'Penolakan Peminjaman'}
        size="sm"
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <button
              type="button"
              onClick={() => setApprovalModalOpen(false)}
              className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-xs font-semibold hover:bg-slate-50 transition"
            >
              Batal
            </button>
            <button
              type="submit"
              form="form-approval"
              disabled={submitting}
              className={`px-4 py-2 text-white rounded-lg text-xs font-semibold transition ${
                actionType === 'approve' ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-rose-600 hover:bg-rose-500'
              }`}
            >
              {actionType === 'approve' ? 'Setujui Peminjaman' : 'Tolak Peminjaman'}
            </button>
          </div>
        }
      >
        <div className="mb-4 text-xs text-slate-600">
          Acara: <strong className="text-slate-800">{targetBooking?.purpose}</strong> ({targetBooking?.booking_date})
        </div>

        <form id="form-approval" onSubmit={handleApprovalSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Catatan / Keterangan</label>
            <textarea
              rows={3}
              value={actionNotes}
              onChange={(e) => setActionNotes(e.target.value)}
              placeholder={actionType === 'approve' ? 'Catatan persetujuan (opsional)...' : 'Alasan penolakan...'}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-hidden focus:border-emerald-500"
            />
          </div>
        </form>
      </Modal>
    </div>
  );
}
