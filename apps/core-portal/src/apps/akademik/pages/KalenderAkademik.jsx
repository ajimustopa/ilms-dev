import React, { useState, useEffect } from 'react';
import api from '../../../shared/services/api';
import {
  Calendar as CalendarIcon,
  Plus,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2,
  X,
  Layers,
  RotateCw
} from 'lucide-react';

export default function KalenderAkademik() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [eventForm, setEventForm] = useState({
    satuan_pendidikan_id: 1,
    title: '',
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0],
    grade_level_id: null,
    notes: ''
  });

  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    fetchCalendarEvents();
  }, []);

  const fetchCalendarEvents = async () => {
    try {
      setLoading(true);
      const res = await api.get('/akademik/calendar-events');
      setEvents(res.data?.data || []);
    } catch (err) {
      console.error('Error fetching calendar events:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateEvent = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg('');

    try {
      await api.post('/akademik/calendar-events', eventForm);
      setSuccessMsg('Agenda kalender akademik berhasil ditambahkan!');
      setModalOpen(false);
      setEventForm({
        satuan_pendidikan_id: 1,
        title: '',
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date().toISOString().split('T')[0],
        grade_level_id: null,
        notes: ''
      });
      fetchCalendarEvents();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Gagal menambahkan agenda');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Kalender Akademik</h1>
          <p className="text-xs text-slate-500 mt-1">
            Jadwal kegiatan belajar mengajar, ujian semester, libur hari besar, dan agenda penting sekolah.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={fetchCalendarEvents}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold border border-slate-200 shadow-2xs transition active:scale-95"
            title="Segarkan Data dari Database"
          >
            <RotateCw className={`w-3.5 h-3.5 text-slate-600 ${loading ? 'animate-spin' : ''}`} />
            <span>Reload Data</span>
          </button>
          <button
            onClick={() => { setErrorMsg(''); setModalOpen(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold rounded-xl shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Agenda</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-xs flex items-center gap-2">
          <CheckCircle className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Event Timeline / List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-5">
        {loading ? (
          <div className="py-16 text-center text-slate-400">
            <Loader2 className="w-7 h-7 animate-spin mx-auto mb-2 text-teal-600" />
            <span>Memuat agenda kalender akademik...</span>
          </div>
        ) : events.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            Belum ada agenda kegiatan yang dijadwalkan. Klik tombol "Tambah Agenda" di atas.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {events.map((evt) => (
              <div key={evt.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/60 transition p-2 rounded-xl">
                <div className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex flex-col items-center justify-center font-bold shrink-0 border border-teal-100">
                    <CalendarIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-800">{evt.title}</h3>
                    <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-slate-500">
                      <span className="flex items-center gap-1 font-semibold text-teal-700">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{evt.start_date?.split('T')[0]} s/d {evt.end_date?.split('T')[0]}</span>
                      </span>
                      {evt.grade_level_name && (
                        <span className="flex items-center gap-1 text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full text-[10px] font-medium">
                          <Layers className="w-3 h-3" />
                          <span>{evt.grade_level_name}</span>
                        </span>
                      )}
                    </div>
                    {evt.notes && (
                      <p className="text-xs text-slate-600 mt-1.5">{evt.notes}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal Tambah Agenda */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b">
              <h3 className="text-sm font-bold text-slate-800">Tambah Agenda Kalender</h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateEvent} className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Nama Agenda / Kegiatan *</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Ujian Tengah Semester Ganjil"
                  value={eventForm.title}
                  onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Tanggal Mulai *</label>
                  <input
                    type="date"
                    required
                    value={eventForm.start_date}
                    onChange={(e) => setEventForm({ ...eventForm, start_date: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Tanggal Selesai *</label>
                  <input
                    type="date"
                    required
                    value={eventForm.end_date}
                    onChange={(e) => setEventForm({ ...eventForm, end_date: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Keterangan Tambahan</label>
                <textarea
                  rows={2}
                  placeholder="Catatan pelaksanaan kegiatan..."
                  value={eventForm.notes}
                  onChange={(e) => setEventForm({ ...eventForm, notes: e.target.value })}
                  className="w-full p-2 text-xs border border-slate-300 rounded-xl"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-1.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold rounded-xl"
                >
                  Simpan Agenda
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
