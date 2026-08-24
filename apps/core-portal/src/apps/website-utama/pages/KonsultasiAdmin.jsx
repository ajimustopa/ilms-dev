import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import api from '../../../shared/services/api';
import { MessageSquare, Video, CheckCircle, Send, Clock, User } from 'lucide-react';

export default function KonsultasiAdmin() {
  const { schoolUnitId } = useOutletContext();
  const [tickets, setTickets] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [activeTab, setActiveTab] = useState('tickets');
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);

  useEffect(() => {
    fetchData();
  }, [schoolUnitId]);

  const fetchData = async () => {
    try {
      const [tRes, bRes] = await Promise.all([
        api.get('/api/v1/website-utama/admin/consultation/tickets', { headers: { 'X-School-Unit-Id': schoolUnitId } }),
        api.get('/api/v1/website-utama/admin/consultation/bookings', { headers: { 'X-School-Unit-Id': schoolUnitId } })
      ]);
      setTickets(tRes.data?.data || []);
      setBookings(bRes.data?.data || []);
      if (tRes.data?.data?.length > 0 && !selectedTicket) {
        openTicket(tRes.data.data[0].id);
      }
    } catch (err) {
      console.error('Error fetching consultation data:', err);
    }
  };

  const openTicket = async (id) => {
    try {
      const res = await api.get(`/api/v1/website-utama/public/consultation/tickets/${id}`);
      setSelectedTicket(res.data?.data || null);
    } catch (err) {
      console.error('Error opening ticket:', err);
    }
  };

  const handleSendReply = async (e) => {
    e.preventDefault();
    if (!replyText.trim()) return;
    setSendingReply(true);
    try {
      await api.post(`/api/v1/website-utama/admin/consultation/tickets/${selectedTicket.id}/reply`, {
        content: replyText
      }, {
        headers: { 'X-School-Unit-Id': schoolUnitId }
      });
      setReplyText('');
      openTicket(selectedTicket.id);
    } catch (err) {
      alert('Gagal mengirim balasan tiket');
    } finally {
      setSendingReply(false);
    }
  };

  const handleCloseTicket = async (id) => {
    try {
      await api.patch(`/api/v1/website-utama/admin/consultation/tickets/${id}/close`, {}, {
        headers: { 'X-School-Unit-Id': schoolUnitId }
      });
      fetchData();
      openTicket(id);
    } catch (err) {
      alert('Gagal menutup tiket');
    }
  };

  const handleConfirmBooking = async (id) => {
    try {
      await api.patch(`/api/v1/website-utama/admin/consultation/bookings/${id}`, {
        status: 'confirmed'
      }, {
        headers: { 'X-School-Unit-Id': schoolUnitId }
      });
      fetchData();
    } catch (err) {
      alert('Gagal konfirmasi booking');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-800">Layanan Konsultasi Publik</h1>
        <p className="text-xs text-slate-500">Tanggapi tiket pertanyaan dan konfirmasi jadwal sesi tatap muka virtual.</p>
      </div>

      <div className="flex space-x-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('tickets')}
          className={`px-4 py-2.5 text-xs font-bold transition-all border-b-2 ${
            activeTab === 'tickets' ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-slate-500'
          }`}
        >
          Tiket Pertanyaan ({tickets.length})
        </button>
        <button
          onClick={() => setActiveTab('bookings')}
          className={`px-4 py-2.5 text-xs font-bold transition-all border-b-2 ${
            activeTab === 'bookings' ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-slate-500'
          }`}
        >
          Jadwal Konsultasi Virtual ({bookings.length})
        </button>
      </div>

      {activeTab === 'tickets' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* List Tiket */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-2">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Daftar Tiket</h3>
            {tickets.map((t) => (
              <div
                key={t.id}
                onClick={() => openTicket(t.id)}
                className={`p-3 rounded-lg border cursor-pointer transition-all ${
                  selectedTicket?.id === t.id
                    ? 'border-emerald-600 bg-emerald-50/50'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                    t.status === 'open' ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {t.status}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {new Date(t.created_at).toLocaleDateString('id-ID')}
                  </span>
                </div>
                <h4 className="text-xs font-bold text-slate-800 truncate">{t.subject}</h4>
                <p className="text-[11px] text-slate-500 truncate">{t.name} ({t.contact})</p>
              </div>
            ))}
          </div>

          {/* Percakapan Tiket */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex flex-col justify-between min-h-[450px]">
            {selectedTicket ? (
              <div className="space-y-4 flex-1">
                <div className="flex items-start justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-800">{selectedTicket.subject}</h3>
                    <p className="text-xs text-slate-500">Dari: {selectedTicket.name} • Kontak: {selectedTicket.contact}</p>
                  </div>
                  {selectedTicket.status === 'open' && (
                    <button
                      onClick={() => handleCloseTicket(selectedTicket.id)}
                      className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-semibold"
                    >
                      Tutup Tiket
                    </button>
                  )}
                </div>

                <div className="space-y-3 max-h-72 overflow-y-auto pr-2">
                  {/* Pesan Awal */}
                  <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-100 text-xs">
                    <p className="font-semibold text-slate-800 mb-1">{selectedTicket.name}</p>
                    <p className="text-slate-700">{selectedTicket.content}</p>
                  </div>

                  {/* Balasan Admin */}
                  {selectedTicket.replies?.map((rep) => (
                    <div key={rep.id} className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-100 text-xs ml-4">
                      <p className="font-semibold text-emerald-900 mb-1">Staf Layanan Informasi Aldepos</p>
                      <p className="text-emerald-800">{rep.content}</p>
                    </div>
                  ))}
                </div>

                {/* Form Balas */}
                {selectedTicket.status === 'open' && (
                  <form onSubmit={handleSendReply} className="pt-3 border-t border-slate-100 flex space-x-2">
                    <input
                      type="text"
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="Tulis balasan untuk calon wali murid..."
                      className="flex-1 text-xs border border-slate-300 rounded-lg px-3 py-2 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                    />
                    <button
                      type="submit"
                      disabled={sendingReply}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-4 py-2 rounded-lg flex items-center space-x-1"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Kirim</span>
                    </button>
                  </form>
                )}
              </div>
            ) : (
              <div className="p-8 text-center text-xs text-slate-400">Pilih tiket untuk melihat isi pertanyaan dan membalas.</div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'bookings' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {bookings.map((b) => (
            <div key={b.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                    b.status === 'confirmed' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {b.status}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {new Date(b.scheduled_at).toLocaleString('id-ID')}
                  </span>
                </div>
                <h3 className="font-bold text-xs text-slate-800">{b.name}</h3>
                <p className="text-[11px] text-slate-500">Kontak: {b.contact}</p>
                <p className="text-[11px] text-emerald-600 mt-2 truncate font-mono">{b.meeting_link}</p>
              </div>

              {b.status !== 'confirmed' && (
                <button
                  onClick={() => handleConfirmBooking(b.id)}
                  className="mt-4 w-full py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg"
                >
                  Konfirmasi Jadwal
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
