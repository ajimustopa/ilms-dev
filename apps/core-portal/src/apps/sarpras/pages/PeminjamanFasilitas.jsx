import React, { useState, useEffect } from 'react';
import api from '../../../shared/services/api';
import { useAuth } from '../../../shared/store/AuthContext';
import {
  CalendarClock,
  Plus,
  CheckCircle,
  XCircle,
  Clock,
  Search,
  Loader2,
  Calendar as CalendarIcon,
  Check,
  X,
  AlertCircle
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
      if (res.data.success) setBookings(res.data.data);
    } catch (err) {
      console.error('Error fetching bookings:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSchedule = async (date) => {
    try {
      const res = await api.get(`/sarpras/bookings/schedule?date=${date}`);
      if (res.data.success) setSchedule(res.data.data);
    } catch (err) {
      console.error('Error fetching schedule:', err);
    }
  };

  const fetchRooms = async () => {
    try {
      const res = await api.get('/sarpras/rooms');
      if (res.data.success) setRooms(res.data.data);
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
      setMessage({ type: 'success', text: 'Pengajuan peminjaman fasilitas berhasil dikirim' });
      setCreateModalOpen(false);
      fetchBookings();
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || err.message });
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
        type: 'success',
        text: `Peminjaman berhasil di-${actionType === 'approve' ? 'setujui' : 'tolak'}`
      });
      setApprovalModalOpen(false);
      fetchBookings();
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelBooking = async (id) => {
    if (!window.confirm('Yakin ingin membatalkan pengajuan peminjaman ini?')) return;
    try {
      await api.delete(`/sarpras/bookings/${id}`);
      setMessage({ type: 'success', text: 'Pengajuan peminjaman berhasil dibatalkan' });
      fetchBookings();
    } catch (err) {
      alert(err.response?.data?.message || err.message);
    }
  };

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

        <div className="flex items-center gap-2">
          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white shadow-md shadow-indigo-600/30 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Ajukan Peminjaman</span>
          </button>
        </div>
      </div>

      {message && (
        <div className={`p-3.5 rounded-xl border text-xs flex items-center justify-between ${
          message.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'
        }`}>
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)} className="font-bold ml-4">&times;</button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('bookings')}
          className={`pb-3 px-4 text-xs font-semibold border-b-2 transition flex items-center gap-2 ${
            activeTab === 'bookings'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Daftar Pengajuan ({bookings.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('schedule')}
          className={`pb-3 px-4 text-xs font-semibold border-b-2 transition flex items-center gap-2 ${
            activeTab === 'schedule'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <CalendarIcon className="w-4 h-4" />
          <span>Kalender / Jadwal Pemakaian</span>
        </button>
      </div>

      {/* Tab 1: Bookings Table */}
      {activeTab === 'bookings' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-4 py-3">Fasilitas / Ruangan</th>
                  <th className="px-4 py-3">Keperluan / Acara</th>
                  <th className="px-4 py-3">Tanggal</th>
                  <th className="px-4 py-3 text-center">Waktu</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-right">Aksi & Approval</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {bookings.length > 0 ? (
                  bookings.map((b) => (
                    <tr key={b.id} className="hover:bg-slate-50 transition">
                      <td className="px-4 py-3 font-semibold text-slate-800">
                        {b.room_name ? `${b.room_name} (${b.room_code})` : b.other_facility_name || 'Fasilitas Terbuka'}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{b.purpose}</td>
                      <td className="px-4 py-3 text-slate-700 font-medium">{b.booking_date}</td>
                      <td className="px-4 py-3 text-center font-mono text-slate-600">
                        {b.start_time?.slice(0, 5)} - {b.end_time?.slice(0, 5)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                          b.status === 'approved'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : b.status === 'pending'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : b.status === 'cancelled'
                            ? 'bg-slate-100 text-slate-600 border-slate-200'
                            : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}>
                          {b.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {b.status === 'pending' && (
                            <>
                              <button
                                onClick={() => openApprovalModal(b, 'approve')}
                                className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[11px] font-semibold flex items-center gap-1 shadow-2xs transition"
                                title="Setujui Peminjaman"
                              >
                                <Check className="w-3 h-3" />
                                <span>Setuju</span>
                              </button>
                              <button
                                onClick={() => openApprovalModal(b, 'reject')}
                                className="px-2 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-[11px] font-semibold flex items-center gap-1 shadow-2xs transition"
                                title="Tolak Peminjaman"
                              >
                                <X className="w-3 h-3" />
                                <span>Tolak</span>
                              </button>
                              <button
                                onClick={() => handleCancelBooking(b.id)}
                                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
                                title="Batalkan"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-xs text-slate-400">
                      Belum ada permohonan peminjaman ruangan
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Schedule View */}
      {activeTab === 'schedule' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
            <CalendarIcon className="w-4 h-4 text-indigo-600" />
            <span className="text-xs font-semibold text-slate-700">Pilih Tanggal:</span>
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="px-3 py-1.5 border border-slate-200 rounded-xl text-xs"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {schedule.length > 0 ? (
              schedule.map((item, idx) => (
                <div key={idx} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-indigo-600">
                      {item.start_time?.slice(0, 5)} - {item.end_time?.slice(0, 5)}
                    </span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {item.status}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 mt-2">{item.room_name || item.other_facility_name}</h4>
                  <p className="text-xs text-slate-600 mt-1">{item.purpose}</p>
                </div>
              ))
            ) : (
              <div className="col-span-3 p-12 bg-white rounded-2xl border border-slate-200 text-center text-xs text-slate-400">
                Fasilitas belum memiliki agenda pemakaian pada tanggal ini (Tersedia / Kosong)
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal Ajukan Peminjaman */}
      {createModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full p-6 relative">
            <h3 className="text-base font-bold text-slate-900 mb-4">Ajukan Peminjaman Fasilitas</h3>

            <form onSubmit={handleCreateBooking} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Pilih Ruangan / Gedung</label>
                <select
                  value={formData.facility_room_id || ''}
                  onChange={(e) => setFormData({ ...formData, facility_room_id: Number(e.target.value) })}
                  className="w-full px-3 py-2 border rounded-xl text-xs"
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
                    className="w-full px-3 py-2 border rounded-xl text-xs"
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
                  className="w-full px-3 py-2 border rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Tanggal Pemakaian *</label>
                <input
                  type="date"
                  required
                  value={formData.booking_date || ''}
                  onChange={(e) => setFormData({ ...formData, booking_date: e.target.value })}
                  className="w-full px-3 py-2 border rounded-xl text-xs"
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
                    className="w-full px-3 py-2 border rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Jam Selesai *</label>
                  <input
                    type="time"
                    required
                    value={formData.end_time || '10:00'}
                    onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl text-xs"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50 transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition"
                >
                  Kirim Permohonan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Approval / Reject */}
      {approvalModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full p-6">
            <h3 className="text-base font-bold text-slate-900 mb-2">
              {actionType === 'approve' ? 'Persetujuan Peminjaman' : 'Penolakan Peminjaman'}
            </h3>
            <p className="text-xs text-slate-600 mb-4">
              Acara: <strong>{targetBooking?.purpose}</strong> ({targetBooking?.booking_date})
            </p>

            <form onSubmit={handleApprovalSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Catatan / Keterangan</label>
                <textarea
                  rows={3}
                  value={actionNotes}
                  onChange={(e) => setActionNotes(e.target.value)}
                  placeholder={actionType === 'approve' ? 'Catatan persetujuan (opsional)...' : 'Alasan penolakan...'}
                  className="w-full px-3 py-2 border rounded-xl text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setApprovalModalOpen(false)}
                  className="px-4 py-2 border text-slate-600 rounded-xl text-xs font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className={`px-4 py-2 text-white rounded-xl text-xs font-semibold ${
                    actionType === 'approve' ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-rose-600 hover:bg-rose-500'
                  }`}
                >
                  {actionType === 'approve' ? 'Setujui Peminjaman' : 'Tolak Peminjaman'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
