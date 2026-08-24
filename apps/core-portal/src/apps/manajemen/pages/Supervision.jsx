import React, { useState, useEffect } from 'react';
import api from '../../../shared/services/api';
import {
  ClipboardCheck,
  Plus,
  Calendar,
  Eye,
  Loader2,
  AlertCircle
} from 'lucide-react';

export default function Supervision() {
  const [loading, setLoading] = useState(false);
  const [schedules, setSchedules] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    supervisor_employee_id: 1,
    supervised_employee_id: 2,
    supervision_type: 'akademik',
    scheduled_date: new Date().toISOString().slice(0, 10),
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // Result modal
  const [resultModal, setResultModal] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState(null);
  const [resultForm, setResultForm] = useState({
    aspect: 'Kesesuaian RPP & Pelaksanaan Pembelajaran',
    score: 88,
    findings: '',
    recommendations: '',
  });

  const fetchSchedules = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/v1/manajemen/supervision-schedules');
      setSchedules(res.data.data || []);
    } catch (err) {
      console.error('Error fetching supervision schedules:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedules();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await api.post('/api/v1/manajemen/supervision-schedules', formData);
      setModalOpen(false);
      fetchSchedules();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Gagal menjadwalkan supervisi');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenAddResult = async (item) => {
    try {
      const res = await api.get(`/api/v1/manajemen/supervision-schedules/${item.id}`);
      setSelectedSchedule(res.data.data);
      setResultModal(true);
    } catch (err) {
      alert('Gagal mengambil detail jadwal');
    }
  };

  const handleSaveResult = async (e) => {
    e.preventDefault();
    if (!selectedSchedule) return;
    try {
      await api.post(`/api/v1/manajemen/supervision-schedules/${selectedSchedule.id}/results`, resultForm);
      await api.patch(`/api/v1/manajemen/supervision-schedules/${selectedSchedule.id}/status`, { status: 'done' });
      setResultModal(false);
      fetchSchedules();
    } catch (err) {
      alert('Gagal menyimpan hasil supervisi');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
            <ClipboardCheck className="w-5 h-5 text-indigo-600" />
            <span>Supervisi Akademik & Manajerial</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Penjadwalan observasi kelas guru, evaluasi manajerial dan pencatatan rekomendasi perbaikan.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setError(null);
            setModalOpen(true);
          }}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-md shadow-indigo-950/20 transition"
        >
          <Plus className="w-4 h-4" />
          <span>Jadwalkan Supervisi</span>
        </button>
      </div>

      {/* List Table */}
      {loading ? (
        <div className="h-64 flex items-center justify-center">
          <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-4">Guru / Pegawai yang Disupervisi</th>
                  <th className="py-3 px-4">Supervisor / Pengawas</th>
                  <th className="py-3 px-4">Tipe Supervisi</th>
                  <th className="py-3 px-4">Tanggal Rencana</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {schedules.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="py-6 text-center text-slate-400">
                      Belum ada jadwal supervisi
                    </td>
                  </tr>
                ) : (
                  schedules.map((sc) => (
                    <tr key={sc.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3.5 px-4 font-semibold text-slate-800">{sc.supervised_name}</td>
                      <td className="py-3.5 px-4 text-slate-600">{sc.supervisor_name}</td>
                      <td className="py-3.5 px-4 capitalize font-medium text-slate-700">{sc.supervision_type}</td>
                      <td className="py-3.5 px-4 text-slate-600">{sc.scheduled_date}</td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${
                            sc.status === 'done'
                              ? 'bg-emerald-100 text-emerald-700'
                              : sc.status === 'cancelled'
                              ? 'bg-slate-100 text-slate-600'
                              : 'bg-indigo-100 text-indigo-700'
                          }`}
                        >
                          {sc.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right space-x-2">
                        <button
                          type="button"
                          onClick={() => handleOpenAddResult(sc)}
                          className="px-2.5 py-1 rounded bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold text-[11px]"
                        >
                          {sc.status === 'done' ? 'Lihat Hasil' : 'Input Hasil'}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Create Schedule */}
      {modalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-100">
            <h3 className="text-sm font-bold text-slate-800">Jadwalkan Supervisi Baru</h3>
            {error && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-600 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}
            <form onSubmit={handleCreate} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Tipe Supervisi</label>
                <select
                  value={formData.supervision_type}
                  onChange={(e) => setFormData({ ...formData, supervision_type: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  <option value="akademik">Akademik (Observasi Kelas Guru)</option>
                  <option value="manajerial">Manajerial (Kepala Unit / Administrasi)</option>
                </select>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Tanggal Rencana</label>
                <input
                  type="date"
                  required
                  value={formData.scheduled_date}
                  onChange={(e) => setFormData({ ...formData, scheduled_date: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-slate-600 hover:bg-slate-50 font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold shadow-md disabled:opacity-50"
                >
                  {submitting ? 'Menyimpan...' : 'Jadwalkan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Result */}
      {resultModal && selectedSchedule && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 border border-slate-100">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-800">
                Hasil Supervisi: {selectedSchedule.supervised_name}
              </h3>
              <p className="text-[11px] text-slate-400">
                Pengawas: {selectedSchedule.supervisor_name} | Tanggal: {selectedSchedule.scheduled_date}
              </p>
            </div>

            {selectedSchedule.results && selectedSchedule.results.length > 0 && (
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-700">Hasil yang Tercatat:</span>
                {selectedSchedule.results.map((r) => (
                  <div key={r.id} className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-xs space-y-1">
                    <div className="flex justify-between">
                      <span className="font-semibold text-slate-800">{r.aspect}</span>
                      <span className="font-bold text-indigo-600">Skor: {r.score}</span>
                    </div>
                    <p className="text-slate-600 text-[11px]">Temuan: {r.findings || '-'}</p>
                    <p className="text-slate-600 text-[11px]">Rekomendasi: {r.recommendations || '-'}</p>
                  </div>
                ))}
              </div>
            )}

            <form onSubmit={handleSaveResult} className="space-y-3 text-xs pt-2">
              <span className="font-bold text-slate-700 block">Tambah Catatan Aspek Supervisi:</span>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Aspek Penilaian</label>
                <input
                  type="text"
                  required
                  value={resultForm.aspect}
                  onChange={(e) => setResultForm({ ...resultForm, aspect: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Skor Aspek (0-100)</label>
                <input
                  type="number"
                  required
                  value={resultForm.score}
                  onChange={(e) => setResultForm({ ...resultForm, score: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Temuan & Masukan</label>
                <textarea
                  rows="2"
                  value={resultForm.findings}
                  onChange={(e) => setResultForm({ ...resultForm, findings: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Rekomendasi Perbaikan</label>
                <textarea
                  rows="2"
                  value={resultForm.recommendations}
                  onChange={(e) => setResultForm({ ...resultForm, recommendations: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setResultModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-slate-600 hover:bg-slate-50 font-semibold"
                >
                  Tutup
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold shadow-md"
                >
                  Simpan Hasil
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
