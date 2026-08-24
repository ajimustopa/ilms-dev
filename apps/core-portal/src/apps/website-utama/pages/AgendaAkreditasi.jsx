import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import api from '../../../shared/services/api';
import { Calendar, Award, Plus, Edit2, Trash2 } from 'lucide-react';

export default function AgendaAkreditasi() {
  const { schoolUnitId } = useOutletContext();
  const [events, setEvents] = useState([]);
  const [accreditations, setAccreditations] = useState([]);
  const [activeTab, setActiveTab] = useState('events');
  const [showEventModal, setShowEventModal] = useState(false);
  const [showAccModal, setShowAccModal] = useState(false);
  const [eventForm, setEventForm] = useState({ event_name: '', event_date: '', location: '', description: '', status: 'published' });
  const [accForm, setAccForm] = useState({ accreditation_type: '', score: 'A (Unggul)', year: new Date().getFullYear(), certificate_url: '' });

  useEffect(() => {
    fetchData();
  }, [schoolUnitId]);

  const fetchData = async () => {
    try {
      const [eRes, aRes] = await Promise.all([
        api.get('/api/v1/website-utama/admin/events', { headers: { 'X-School-Unit-Id': schoolUnitId } }),
        api.get('/api/v1/website-utama/admin/accreditations', { headers: { 'X-School-Unit-Id': schoolUnitId } })
      ]);
      setEvents(eRes.data?.data || []);
      setAccreditations(aRes.data?.data || []);
    } catch (err) {
      console.error('Error fetching events & accreditations:', err);
    }
  };

  const handleSaveEvent = async (e) => {
    e.preventDefault();
    try {
      await api.post('/api/v1/website-utama/admin/events', eventForm, {
        headers: { 'X-School-Unit-Id': schoolUnitId }
      });
      setShowEventModal(false);
      fetchData();
    } catch (err) {
      alert('Gagal menyimpan agenda');
    }
  };

  const handleSaveAcc = async (e) => {
    e.preventDefault();
    try {
      await api.post('/api/v1/website-utama/admin/accreditations', accForm, {
        headers: { 'X-School-Unit-Id': schoolUnitId }
      });
      setShowAccModal(false);
      fetchData();
    } catch (err) {
      alert('Gagal menyimpan akreditasi');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-800">Agenda Kegiatan & Akreditasi</h1>
        <p className="text-xs text-slate-500">Kelola kalender kegiatan sekolah dan status sertifikat akreditasi resmi.</p>
      </div>

      <div className="flex space-x-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('events')}
          className={`px-4 py-2.5 text-xs font-bold transition-all border-b-2 ${
            activeTab === 'events' ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-slate-500'
          }`}
        >
          Agenda Kegiatan ({events.length})
        </button>
        <button
          onClick={() => setActiveTab('accreditations')}
          className={`px-4 py-2.5 text-xs font-bold transition-all border-b-2 ${
            activeTab === 'accreditations' ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-slate-500'
          }`}
        >
          Akreditasi Lembaga ({accreditations.length})
        </button>
      </div>

      {activeTab === 'events' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => {
                setEventForm({ event_name: '', event_date: '', location: '', description: '', status: 'published' });
                setShowEventModal(true);
              }}
              className="inline-flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah Agenda</span>
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {events.map((ev) => (
              <div key={ev.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded">
                    {new Date(ev.event_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </span>
                  <h3 className="font-bold text-xs text-slate-800 mt-2">{ev.event_name}</h3>
                  <p className="text-[11px] text-slate-500 mt-1">Lokasi: {ev.location || 'Kampus Aldepos'}</p>
                  <p className="text-[11px] text-slate-600 mt-2">{ev.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'accreditations' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => {
                setAccForm({ accreditation_type: '', score: 'A (Unggul)', year: new Date().getFullYear(), certificate_url: '' });
                setShowAccModal(true);
              }}
              className="inline-flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah Data Akreditasi</span>
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {accreditations.map((acc) => (
              <div key={acc.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex items-center space-x-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-xs text-slate-800">{acc.accreditation_type}</h3>
                  <p className="text-xs text-emerald-600 font-bold">Peringkat: {acc.score}</p>
                  <p className="text-[10px] text-slate-400">Tahun: {acc.year}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal Event */}
      {showEventModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-sm font-bold text-slate-800 mb-4">Tambah Agenda Kegiatan</h3>
            <form onSubmit={handleSaveEvent} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Kegiatan</label>
                <input
                  type="text"
                  value={eventForm.event_name}
                  onChange={(e) => setEventForm({ ...eventForm, event_name: e.target.value })}
                  className="w-full text-xs rounded-lg border border-slate-300 p-2 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Tanggal Pelaksanaan</label>
                <input
                  type="date"
                  value={eventForm.event_date}
                  onChange={(e) => setEventForm({ ...eventForm, event_date: e.target.value })}
                  className="w-full text-xs rounded-lg border border-slate-300 p-2 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Lokasi</label>
                <input
                  type="text"
                  value={eventForm.location}
                  onChange={(e) => setEventForm({ ...eventForm, location: e.target.value })}
                  className="w-full text-xs rounded-lg border border-slate-300 p-2 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  placeholder="Aula Utama Aldepos"
                />
              </div>
              <div className="pt-4 flex justify-end space-x-2">
                <button type="button" onClick={() => setShowEventModal(false)} className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg">Batal</button>
                <button type="submit" className="px-4 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg">Simpan</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Akreditasi */}
      {showAccModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-sm font-bold text-slate-800 mb-4">Tambah Data Akreditasi</h3>
            <form onSubmit={handleSaveAcc} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Jenis / Lembaga Akreditasi</label>
                <input
                  type="text"
                  value={accForm.accreditation_type}
                  onChange={(e) => setAccForm({ ...accForm, accreditation_type: e.target.value })}
                  className="w-full text-xs rounded-lg border border-slate-300 p-2 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  placeholder="BAN-S/M"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nilai / Peringkat</label>
                <input
                  type="text"
                  value={accForm.score}
                  onChange={(e) => setAccForm({ ...accForm, score: e.target.value })}
                  className="w-full text-xs rounded-lg border border-slate-300 p-2 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Tahun Penetapan</label>
                <input
                  type="number"
                  value={accForm.year}
                  onChange={(e) => setAccForm({ ...accForm, year: Number(e.target.value) })}
                  className="w-full text-xs rounded-lg border border-slate-300 p-2 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  required
                />
              </div>
              <div className="pt-4 flex justify-end space-x-2">
                <button type="button" onClick={() => setShowAccModal(false)} className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg">Batal</button>
                <button type="submit" className="px-4 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg">Simpan</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
