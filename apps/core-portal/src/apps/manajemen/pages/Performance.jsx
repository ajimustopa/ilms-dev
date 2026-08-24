import React, { useState, useEffect } from 'react';
import api from '../../../shared/services/api';
import {
  TrendingUp,
  Plus,
  CheckCircle,
  Eye,
  Loader2,
  AlertCircle,
  UserCheck
} from 'lucide-react';

export default function Performance() {
  const [loading, setLoading] = useState(false);
  const [evaluations, setEvaluations] = useState([]);
  const [detailModal, setDetailModal] = useState(false);
  const [selectedEval, setSelectedEval] = useState(null);

  const [createModal, setCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    employee_id: 1,
    evaluator_employee_id: 1,
    period: '2026-S2',
    notes: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const fetchEvaluations = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/v1/manajemen/employee-performance-evaluations');
      setEvaluations(res.data.data || []);
    } catch (err) {
      console.error('Error loading evaluations:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvaluations();
  }, []);

  const handleOpenDetail = async (id) => {
    try {
      const res = await api.get(`/api/v1/manajemen/employee-performance-evaluations/${id}`);
      setSelectedEval(res.data.data);
      setDetailModal(true);
    } catch (err) {
      alert('Gagal mengambil detail evaluasi');
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await api.post('/api/v1/manajemen/employee-performance-evaluations', formData);
      setCreateModal(false);
      fetchEvaluations();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Gagal membuat evaluasi kinerja');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitEval = async (id) => {
    if (window.confirm('Hitung skor dan ajukan evaluasi ini?')) {
      await api.patch(`/api/v1/manajemen/employee-performance-evaluations/${id}/submit`);
      fetchEvaluations();
      if (selectedEval?.id === id) setDetailModal(false);
    }
  };

  const handleApproveEval = async (id) => {
    if (window.confirm('Setujui hasil evaluasi kinerja ini?')) {
      await api.patch(`/api/v1/manajemen/employee-performance-evaluations/${id}/approve`);
      fetchEvaluations();
      if (selectedEval?.id === id) setDetailModal(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-indigo-600" />
            <span>Evaluasi Kinerja Pegawai Lanjutan</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Penilaian kompetensi pedagogik, manajerial, kedisiplinan dan integrasi hasil evaluasi.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setError(null);
            setCreateModal(true);
          }}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-md shadow-indigo-950/20 transition"
        >
          <Plus className="w-4 h-4" />
          <span>Buat Evaluasi Baru</span>
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
                  <th className="py-3 px-4">Pegawai yang Dinilai</th>
                  <th className="py-3 px-4">Evaluator / Penilai</th>
                  <th className="py-3 px-4">Periode</th>
                  <th className="py-3 px-4">Total Skor</th>
                  <th className="py-3 px-4">Kategori Kinerja</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {evaluations.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="py-6 text-center text-slate-400">
                      Belum ada catatan evaluasi kinerja
                    </td>
                  </tr>
                ) : (
                  evaluations.map((ev) => (
                    <tr key={ev.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3.5 px-4 font-semibold text-slate-800">{ev.employee_name}</td>
                      <td className="py-3.5 px-4 text-slate-600">{ev.evaluator_name}</td>
                      <td className="py-3.5 px-4 text-slate-600">{ev.period}</td>
                      <td className="py-3.5 px-4 font-bold text-indigo-600">{ev.total_score || '-'}</td>
                      <td className="py-3.5 px-4">
                        <span className="capitalize text-slate-700 font-medium">
                          {ev.category ? ev.category.replace('_', ' ') : '-'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            ev.status === 'approved'
                              ? 'bg-emerald-100 text-emerald-700'
                              : ev.status === 'submitted'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-amber-100 text-amber-700'
                          }`}
                        >
                          {ev.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right space-x-2">
                        <button
                          type="button"
                          onClick={() => handleOpenDetail(ev.id)}
                          className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px]"
                        >
                          Detail Kriteria
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

      {/* Modal Detail Kriteria */}
      {detailModal && selectedEval && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 border border-slate-100">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-800">
                  Evaluasi Kinerja: {selectedEval.employee_name}
                </h3>
                <p className="text-[11px] text-slate-400">Periode: {selectedEval.period}</p>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-indigo-50 text-indigo-700">
                {selectedEval.status}
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div className="font-semibold text-slate-700">Rincian Kriteria Penilaian:</div>
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                {selectedEval.criteria?.map((c) => (
                  <div key={c.id} className="p-3 bg-slate-50 flex items-center justify-between">
                    <div>
                      <span className="font-medium text-slate-800">{c.criteria_name}</span>
                      <span className="text-slate-400 block text-[10px]">Bobot: {c.weight}%</span>
                    </div>
                    <span className="font-bold text-indigo-600 text-sm">{c.score}</span>
                  </div>
                ))}
              </div>

              <div className="pt-2 flex items-center justify-between text-xs font-bold">
                <span>Total Skor Akhir:</span>
                <span className="text-indigo-600 text-base">{selectedEval.total_score || '-'}</span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDetailModal(false)}
                className="px-4 py-2 border border-slate-300 rounded-xl text-slate-600 hover:bg-slate-50 font-semibold text-xs"
              >
                Tutup
              </button>
              {selectedEval.status === 'draft' && (
                <button
                  type="button"
                  onClick={() => handleSubmitEval(selectedEval.id)}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold text-xs shadow-md"
                >
                  Hitung Skor & Submit
                </button>
              )}
              {selectedEval.status === 'submitted' && (
                <button
                  type="button"
                  onClick={() => handleApproveEval(selectedEval.id)}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold text-xs shadow-md"
                >
                  Setujui Evaluasi
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Create */}
      {createModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-100">
            <h3 className="text-sm font-bold text-slate-800">Buat Evaluasi Kinerja Baru</h3>
            {error && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-600 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}
            <form onSubmit={handleCreate} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Periode Evaluasi</label>
                <input
                  type="text"
                  required
                  value={formData.period}
                  onChange={(e) => setFormData({ ...formData, period: e.target.value })}
                  placeholder="Mis. 2026-S1 atau 2026-S2"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Catatan Tambahan</label>
                <textarea
                  rows="2"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCreateModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-slate-600 hover:bg-slate-50 font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold shadow-md disabled:opacity-50"
                >
                  {submitting ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
