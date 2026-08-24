import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import api from '../../../shared/services/api';
import { UserPlus, Calendar, CreditCard, CheckCircle, XCircle, Clock, Eye, FileText, Check } from 'lucide-react';

export default function PpdbAdmin() {
  const { schoolUnitId } = useOutletContext();
  const [registrants, setRegistrants] = useState([]);
  const [payments, setPayments] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [activeTab, setActiveTab] = useState('registrants');
  const [selectedRegistrant, setSelectedRegistrant] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [schoolUnitId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [regRes, payRes, schRes] = await Promise.all([
        api.get('/api/v1/website-utama/admin/ppdb/registrants', { headers: { 'X-School-Unit-Id': schoolUnitId } }),
        api.get('/api/v1/website-utama/admin/ppdb/payments', { headers: { 'X-School-Unit-Id': schoolUnitId } }),
        api.get('/api/v1/website-utama/admin/ppdb/schedules', { headers: { 'X-School-Unit-Id': schoolUnitId } })
      ]);
      setRegistrants(regRes.data?.data || []);
      setPayments(payRes.data?.data || []);
      setSchedules(schRes.data?.data || []);
    } catch (err) {
      console.error('Error fetching PPDB admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (id, status) => {
    const note = window.prompt(`Catatan perubahan status menjadi ${status}:`);
    if (note === null) return;
    try {
      await api.patch(`/api/v1/website-utama/admin/ppdb/registrants/${id}/status`, { status, note }, {
        headers: { 'X-School-Unit-Id': schoolUnitId }
      });
      fetchData();
      if (showDetailModal) setShowDetailModal(false);
    } catch (err) {
      alert('Gagal memperbarui status pendaftar');
    }
  };

  const handleVerifyPayment = async (paymentId) => {
    if (!window.confirm('Verifikasi manual pembayaran ini sebagai Lunas (Paid)?')) return;
    try {
      await api.patch(`/api/v1/website-utama/admin/ppdb/payments/${paymentId}/verify`, {}, {
        headers: { 'X-School-Unit-Id': schoolUnitId }
      });
      fetchData();
    } catch (err) {
      alert('Gagal memverifikasi pembayaran');
    }
  };

  const openDetail = async (id) => {
    try {
      const res = await api.get(`/api/v1/website-utama/admin/ppdb/registrants/${id}`, {
        headers: { 'X-School-Unit-Id': schoolUnitId }
      });
      setSelectedRegistrant(res.data?.data || null);
      setShowDetailModal(true);
    } catch (err) {
      alert('Gagal mengambil detail pendaftar');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-800">Manajemen PPDB Online</h1>
        <p className="text-xs text-slate-500">Verifikasi berkas calon santri/siswa baru, pantau tagihan pendaftaran & jadwal tes seleksi.</p>
      </div>

      {/* Tabs */}
      <div className="flex space-x-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('registrants')}
          className={`px-4 py-2.5 text-xs font-bold transition-all border-b-2 ${
            activeTab === 'registrants' ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-slate-500'
          }`}
        >
          Data Pendaftar ({registrants.length})
        </button>
        <button
          onClick={() => setActiveTab('payments')}
          className={`px-4 py-2.5 text-xs font-bold transition-all border-b-2 ${
            activeTab === 'payments' ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-slate-500'
          }`}
        >
          Rekap Pembayaran ({payments.length})
        </button>
        <button
          onClick={() => setActiveTab('schedules')}
          className={`px-4 py-2.5 text-xs font-bold transition-all border-b-2 ${
            activeTab === 'schedules' ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-slate-500'
          }`}
        >
          Gelombang Seleksi ({schedules.length})
        </button>
      </div>

      {/* Content: Pendaftar */}
      {activeTab === 'registrants' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold text-[10px]">
                <th className="py-3 px-4">Nama Calon Siswa</th>
                <th className="py-3 px-4">Tahun / Jalur</th>
                <th className="py-3 px-4">Kontak Orang Tua</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {registrants.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-4">
                    <p className="font-bold text-slate-800">{r.candidate_full_name}</p>
                    <p className="text-[11px] text-slate-500">Ayah: {r.father_name || '-'}</p>
                  </td>
                  <td className="py-3 px-4">
                    <p className="font-semibold text-slate-700">{r.school_year}</p>
                    <span className="text-[10px] text-emerald-600 font-bold uppercase">{r.registration_path}</span>
                  </td>
                  <td className="py-3 px-4 text-slate-600 font-medium">{r.parent_contact || '-'}</td>
                  <td className="py-3 px-4">
                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        r.status === 'accepted'
                          ? 'bg-emerald-100 text-emerald-800'
                          : r.status === 'rejected'
                          ? 'bg-rose-100 text-rose-800'
                          : r.status === 'verifying'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {r.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end space-x-1.5">
                      <button
                        onClick={() => openDetail(r.id)}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-semibold flex items-center space-x-1"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Detail</span>
                      </button>
                      <button
                        onClick={() => handleUpdateStatus(r.id, 'accepted')}
                        title="Terima Siswa"
                        className="p-1 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded"
                      >
                        <CheckCircle className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleUpdateStatus(r.id, 'rejected')}
                        title="Tolak"
                        className="p-1 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Content: Pembayaran */}
      {activeTab === 'payments' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold text-[10px]">
                <th className="py-3 px-4">Pendaftar</th>
                <th className="py-3 px-4">Nominal Biaya</th>
                <th className="py-3 px-4">Metode / Gateway</th>
                <th className="py-3 px-4">Status Bayar</th>
                <th className="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {payments.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-4">
                    <p className="font-bold text-slate-800">{p.candidate_full_name || `Pendaftar #${p.registrant_id}`}</p>
                    <p className="text-[10px] text-slate-400">Ref: {p.payment_gateway_ref || '-'}</p>
                  </td>
                  <td className="py-3 px-4 font-bold text-slate-800">
                    Rp {Number(p.amount).toLocaleString('id-ID')}
                  </td>
                  <td className="py-3 px-4 text-slate-600">{p.payment_gateway_name || 'Manual / VA'}</td>
                  <td className="py-3 px-4">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        p.payment_status === 'paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {p.payment_status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    {p.payment_status !== 'paid' && (
                      <button
                        onClick={() => handleVerifyPayment(p.id)}
                        className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-semibold"
                      >
                        Verifikasi Lunas
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Content: Jadwal Seleksi */}
      {activeTab === 'schedules' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {schedules.map((s) => (
            <div key={s.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
              <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded">
                {s.wave_name}
              </span>
              <h3 className="font-bold text-xs text-slate-800 mt-2">
                Tanggal Tes: {new Date(s.test_date).toLocaleDateString('id-ID')}
              </h3>
              <p className="text-[11px] text-slate-500 mt-1">Jenis: {s.test_type || 'Wawancara & Pemetaan Bakat'}</p>
              <p className="text-[11px] text-slate-500">Lokasi: {s.location_or_link || 'Kampus Utama'}</p>
            </div>
          ))}
        </div>
      )}

      {/* Modal Detail Pendaftar */}
      {showDetailModal && selectedRegistrant && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-800">Detail Pendaftar PPDB</h3>
                <p className="text-xs text-slate-500">ID: {selectedRegistrant.id} • {selectedRegistrant.candidate_full_name}</p>
              </div>
              <span className="px-2.5 py-1 rounded-full text-xs font-bold uppercase bg-emerald-100 text-emerald-800">
                {selectedRegistrant.status}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <p className="text-slate-400">Tempat, Tanggal Lahir</p>
                <p className="font-semibold text-slate-800">{selectedRegistrant.candidate_birth_place || '-'}, {selectedRegistrant.candidate_birth_date || '-'}</p>
              </div>
              <div>
                <p className="text-slate-400">Jenis Kelamin</p>
                <p className="font-semibold text-slate-800">{selectedRegistrant.candidate_gender === 'L' ? 'Laki-laki' : 'Perempuan'}</p>
              </div>
              <div>
                <p className="text-slate-400">Nama Ayah / Ibu</p>
                <p className="font-semibold text-slate-800">{selectedRegistrant.father_name || '-'} / {selectedRegistrant.mother_name || '-'}</p>
              </div>
              <div>
                <p className="text-slate-400">Kontak WhatsApp</p>
                <p className="font-semibold text-slate-800">{selectedRegistrant.parent_contact || '-'}</p>
              </div>
              <div className="col-span-2">
                <p className="text-slate-400">Alamat Rumah</p>
                <p className="font-semibold text-slate-800">{selectedRegistrant.candidate_address || '-'}</p>
              </div>
            </div>

            {/* Riwayat Status */}
            <div className="border-t border-slate-100 pt-3">
              <h4 className="font-bold text-xs text-slate-700 mb-2">Riwayat Tahapan Status</h4>
              <div className="space-y-2">
                {selectedRegistrant.status_logs?.map((log) => (
                  <div key={log.id} className="p-2.5 bg-slate-50 rounded-lg text-[11px] flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-800 uppercase">{log.status}</span>
                      <p className="text-slate-500">{log.note}</p>
                    </div>
                    <span className="text-[10px] text-slate-400">{new Date(log.occurred_at).toLocaleString('id-ID')}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-3 flex justify-end space-x-2 border-t border-slate-100">
              <button
                onClick={() => setShowDetailModal(false)}
                className="px-4 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
