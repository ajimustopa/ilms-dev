import React, { useState, useEffect } from 'react';
import api from '../../../shared/services/api';
import {
  Award,
  Plus,
  Search,
  Filter,
  Loader2,
  AlertCircle,
  X,
  CheckCircle2,
  Calendar,
  UserCheck
} from 'lucide-react';

export default function UjianMunaqasyah() {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showResultModal, setShowResultModal] = useState(false);
  const [selectedExam, setSelectedExam] = useState(null);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Form Jadwalkan
  const [scheduleData, setScheduleData] = useState({
    student_ref_id: '1',
    juz_examined: 1,
    exam_date: new Date().toISOString().slice(0, 10),
    examiner_teacher_ref_id: '2',
    notes: ''
  });

  // Form Input Hasil
  const [resultData, setResultData] = useState({
    score: 90,
    status: 'completed',
    notes: ''
  });

  const fetchExams = async () => {
    setLoading(true);
    try {
      const res = await api.get('/alquran/exams');
      setExams(res.data?.data || []);
    } catch (err) {
      console.error('Error fetching exams:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExams();
  }, []);

  const openScheduleModal = () => {
    setScheduleData({
      student_ref_id: '1',
      juz_examined: 1,
      exam_date: new Date().toISOString().slice(0, 10),
      examiner_teacher_ref_id: '2',
      notes: ''
    });
    setError(null);
    setShowScheduleModal(true);
  };

  const handleScheduleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const payload = {
        ...scheduleData,
        student_ref_id: Number(scheduleData.student_ref_id),
        juz_examined: Number(scheduleData.juz_examined),
        examiner_teacher_ref_id: Number(scheduleData.examiner_teacher_ref_id)
      };

      await api.post('/alquran/exams', payload);
      setShowScheduleModal(false);
      fetchExams();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Gagal menjadwalkan ujian');
    } finally {
      setSubmitting(false);
    }
  };

  const openResultModal = (exam) => {
    setSelectedExam(exam);
    setResultData({
      score: exam.score || 90,
      status: 'completed',
      notes: exam.notes || ''
    });
    setError(null);
    setShowResultModal(true);
  };

  const handleResultSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      await api.patch(`/alquran/exams/${selectedExam.id}/result`, {
        score: parseFloat(resultData.score),
        status: resultData.status,
        notes: resultData.notes
      });

      setShowResultModal(false);
      fetchExams();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Gagal mencatat hasil ujian');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredExams = exams.filter(e => {
    const matchesSearch = String(e.student_ref_id).includes(search) ||
                          String(e.juz_examined).includes(search) ||
                          (e.notes && e.notes.toLowerCase().includes(search.toLowerCase()));
    const matchesStatus = statusFilter === 'all' || e.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800 tracking-tight">Ujian Hafalan (Munaqasyah)</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Penjadwalan ujian berkala per juz hafalan Al-Quran, penunjukan penguji & input nilai kelulusan
          </p>
        </div>
        <button
          type="button"
          onClick={openScheduleModal}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-xs transition"
        >
          <Plus className="w-4 h-4" />
          <span>Jadwalkan Ujian Baru</span>
        </button>
      </div>

      {/* Control Search & Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari ID santri, juz..."
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:border-emerald-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
            >
              <option value="all">Semua Status</option>
              <option value="scheduled">Scheduled</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        <div className="text-xs text-slate-400 font-medium">
          Total: <span className="font-bold text-slate-700">{filteredExams.length}</span> ujian
        </div>
      </div>

      {/* Table List */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-6 h-6 text-emerald-600 animate-spin" />
            <p className="text-xs text-slate-400">Memuat jadwal ujian...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200/80">
                <tr>
                  <th className="px-4 py-3">Tanggal Ujian</th>
                  <th className="px-4 py-3">Santri Diuji</th>
                  <th className="px-4 py-3">Juz yang Diuji</th>
                  <th className="px-4 py-3">Penguji (Musyrif)</th>
                  <th className="px-4 py-3">Nilai Akhir</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredExams.map((e) => (
                  <tr key={e.id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3 font-medium text-slate-700">
                      {e.exam_date ? e.exam_date.slice(0, 10) : '-'}
                    </td>
                    <td className="px-4 py-3 font-bold text-slate-800">
                      Santri #{e.student_ref_id}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-bold text-emerald-800 px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200">
                        Juz {e.juz_examined}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600 font-medium">
                      Pegawai #{e.examiner_teacher_ref_id}
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-slate-800 text-sm">
                      {e.score !== null && e.score !== undefined ? `${e.score}` : '-'}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${
                          e.status === 'completed'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : e.status === 'cancelled'
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}
                      >
                        {e.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {e.status === 'scheduled' ? (
                        <button
                          type="button"
                          onClick={() => openResultModal(e)}
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg text-[11px] shadow-2xs transition inline-flex items-center gap-1"
                        >
                          <UserCheck className="w-3 h-3" />
                          <span>Input Nilai</span>
                        </button>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">Selesai</span>
                      )}
                    </td>
                  </tr>
                ))}
                {filteredExams.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-slate-400 italic">
                      Belum ada jadwal ujian munaqasyah
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Jadwalkan Ujian */}
      {showScheduleModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-800">Jadwalkan Ujian Munaqasyah</h3>
              <button
                type="button"
                onClick={() => setShowScheduleModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleScheduleSubmit} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">ID Santri</label>
                  <input
                    type="number"
                    required
                    value={scheduleData.student_ref_id}
                    onChange={(e) => setScheduleData({ ...scheduleData, student_ref_id: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Juz Diuji (1-30)</label>
                  <input
                    type="number"
                    min="1"
                    max="30"
                    required
                    value={scheduleData.juz_examined}
                    onChange={(e) => setScheduleData({ ...scheduleData, juz_examined: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Tanggal Ujian</label>
                  <input
                    type="date"
                    required
                    value={scheduleData.exam_date}
                    onChange={(e) => setScheduleData({ ...scheduleData, exam_date: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">ID Penguji (Pegawai)</label>
                  <input
                    type="number"
                    required
                    value={scheduleData.examiner_teacher_ref_id}
                    onChange={(e) => setScheduleData({ ...scheduleData, examiner_teacher_ref_id: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Catatan Jadwal</label>
                <textarea
                  rows={2}
                  value={scheduleData.notes}
                  onChange={(e) => setScheduleData({ ...scheduleData, notes: e.target.value })}
                  placeholder="Catatan lokasi munaqasyah..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowScheduleModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition disabled:opacity-50"
                >
                  {submitting ? 'Menyimpan...' : 'Jadwalkan Ujian'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Input Nilai Ujian */}
      {showResultModal && selectedExam && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-800">Input Hasil Munaqasyah</h3>
              <button
                type="button"
                onClick={() => setShowResultModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 text-xs space-y-1">
              <div className="flex justify-between text-slate-600">
                <span>Santri:</span>
                <span className="font-bold text-slate-800">#{selectedExam.student_ref_id}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Juz Diuji:</span>
                <span className="font-bold text-emerald-800">Juz {selectedExam.juz_examined}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Tanggal Ujian:</span>
                <span className="font-semibold text-slate-700">{selectedExam.exam_date ? selectedExam.exam_date.slice(0, 10) : '-'}</span>
              </div>
            </div>

            <form onSubmit={handleResultSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nilai Akhir (0 - 100)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  required
                  value={resultData.score}
                  onChange={(e) => setResultData({ ...resultData, score: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-emerald-800 text-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Status Kelulusan</label>
                <select
                  value={resultData.status}
                  onChange={(e) => setResultData({ ...resultData, status: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                >
                  <option value="completed">Lulus / Selesai (Completed)</option>
                  <option value="cancelled">Dibatalkan (Cancelled)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Catatan Evaluasi Penguji</label>
                <textarea
                  rows={2}
                  value={resultData.notes}
                  onChange={(e) => setResultData({ ...resultData, notes: e.target.value })}
                  placeholder="Lancar, tajwid & makhraj sangat baik..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowResultModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition disabled:opacity-50"
                >
                  {submitting ? 'Menyimpan...' : 'Simpan Nilai & Selesai'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
