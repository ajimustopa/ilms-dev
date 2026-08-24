import React, { useState, useEffect } from 'react';
import api from '../../../shared/services/api';
import {
  BookOpenCheck,
  Plus,
  CheckCircle,
  XCircle,
  Search,
  Filter,
  Loader2,
  AlertCircle,
  X,
  Check
} from 'lucide-react';

export default function CapaianHafalan() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Form Input Setoran
  const [formData, setFormData] = useState({
    student_ref_id: '1',
    juz: 1,
    page_start: 1,
    page_end: 5,
    record_date: new Date().toISOString().slice(0, 10),
    tajwid_score: 85,
    notes: ''
  });

  // Form Verifikasi
  const [verifyStatus, setVerifyStatus] = useState('verified');
  const [verifyNotes, setVerifyNotes] = useState('');

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const res = await api.get('/alquran/records');
      setRecords(res.data?.data || []);
    } catch (err) {
      console.error('Error fetching records:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  const openCreateModal = () => {
    setFormData({
      student_ref_id: '1',
      juz: 1,
      page_start: 1,
      page_end: 5,
      record_date: new Date().toISOString().slice(0, 10),
      tajwid_score: 85,
      notes: ''
    });
    setError(null);
    setShowCreateModal(true);
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const payload = {
        ...formData,
        student_ref_id: Number(formData.student_ref_id),
        juz: Number(formData.juz),
        page_start: formData.page_start ? Number(formData.page_start) : null,
        page_end: formData.page_end ? Number(formData.page_end) : null,
        tajwid_score: formData.tajwid_score ? parseFloat(formData.tajwid_score) : null
      };

      await api.post('/alquran/records', payload);
      setShowCreateModal(false);
      fetchRecords();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Gagal menyimpan setoran hafalan');
    } finally {
      setSubmitting(false);
    }
  };

  const openVerifyModal = (record) => {
    setSelectedRecord(record);
    setVerifyStatus('verified');
    setVerifyNotes(record.notes || '');
    setError(null);
    setShowVerifyModal(true);
  };

  const handleVerifySubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      await api.patch(`/alquran/records/${selectedRecord.id}/verify`, {
        verification_status: verifyStatus,
        notes: verifyNotes
      });

      setShowVerifyModal(false);
      fetchRecords();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Gagal memperbarui verifikasi');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredRecords = records.filter(r => {
    const matchesSearch = String(r.student_ref_id).includes(search) ||
                          String(r.juz).includes(search) ||
                          (r.notes && r.notes.toLowerCase().includes(search.toLowerCase()));
    const matchesStatus = statusFilter === 'all' || r.verification_status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800 tracking-tight">Capaian & Setoran Hafalan</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Pencatatan mutaba'ah harian hafalan santri, penilaian tajwid, dan alur verifikasi Musyrif
          </p>
        </div>
        <button
          type="button"
          onClick={openCreateModal}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-xs transition"
        >
          <Plus className="w-4 h-4" />
          <span>Input Setoran Santri</span>
        </button>
      </div>

      {/* Control Bar: Search & Status Filter */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari ID santri, juz, catatan..."
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
              <option value="pending">Pending</option>
              <option value="verified">Verified</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>

        <div className="text-xs text-slate-400 font-medium">
          Total: <span className="font-bold text-slate-700">{filteredRecords.length}</span> data
        </div>
      </div>

      {/* Records Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-6 h-6 text-emerald-600 animate-spin" />
            <p className="text-xs text-slate-400">Memuat setoran hafalan...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200/80">
                <tr>
                  <th className="px-4 py-3">Tanggal</th>
                  <th className="px-4 py-3">Santri</th>
                  <th className="px-4 py-3">Juz & Halaman</th>
                  <th className="px-4 py-3">Nilai Tajwid</th>
                  <th className="px-4 py-3">Musyrif Pencatat</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRecords.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3 text-slate-600 font-medium">
                      {r.record_date ? r.record_date.slice(0, 10) : '-'}
                    </td>
                    <td className="px-4 py-3 font-bold text-slate-800">
                      Santri #{r.student_ref_id}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-bold text-emerald-800">Juz {r.juz}</span>
                      {r.page_start && r.page_end && (
                        <span className="text-[11px] text-slate-500 ml-1.5">
                          (Hal. {r.page_start} - {r.page_end})
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-slate-700">
                      {r.tajwid_score ? `${r.tajwid_score}` : '-'}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      Pegawai #{r.recorded_by_teacher_ref_id}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${
                          r.verification_status === 'verified'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : r.verification_status === 'rejected'
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}
                      >
                        {r.verification_status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => openVerifyModal(r)}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 font-semibold rounded-lg border border-slate-200 text-[11px] transition inline-flex items-center gap-1"
                      >
                        <Check className="w-3 h-3" />
                        <span>Verifikasi</span>
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredRecords.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-slate-400 italic">
                      Belum ada catatan setoran hafalan
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Form Input Setoran */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-800">Catat Setoran Hafalan Santri</h3>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
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

            <form onSubmit={handleCreateSubmit} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">ID Santri / Siswa</label>
                  <input
                    type="number"
                    required
                    value={formData.student_ref_id}
                    onChange={(e) => setFormData({ ...formData, student_ref_id: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Tanggal Setoran</label>
                  <input
                    type="date"
                    required
                    value={formData.record_date}
                    onChange={(e) => setFormData({ ...formData, record_date: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Juz (1-30)</label>
                  <input
                    type="number"
                    min="1"
                    max="30"
                    required
                    value={formData.juz}
                    onChange={(e) => setFormData({ ...formData, juz: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Hal. Awal</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.page_start}
                    onChange={(e) => setFormData({ ...formData, page_start: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Hal. Akhir</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.page_end}
                    onChange={(e) => setFormData({ ...formData, page_end: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nilai Tajwid (0 - 100)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={formData.tajwid_score}
                  onChange={(e) => setFormData({ ...formData, tajwid_score: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Catatan Musyrif</label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Catatan makhraj, kelancaran..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition disabled:opacity-50"
                >
                  {submitting ? 'Menyimpan...' : 'Simpan Setoran'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Verifikasi Setoran */}
      {showVerifyModal && selectedRecord && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-800">Verifikasi Setoran Santri</h3>
              <button
                type="button"
                onClick={() => setShowVerifyModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-1 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Santri:</span>
                <span className="font-bold text-slate-800">#{selectedRecord.student_ref_id}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Hafalan:</span>
                <span className="font-bold text-emerald-800">Juz {selectedRecord.juz} (Hal. {selectedRecord.page_start || 1} - {selectedRecord.page_end || 1})</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Nilai Tajwid:</span>
                <span className="font-bold text-slate-800">{selectedRecord.tajwid_score || '-'}</span>
              </div>
            </div>

            <form onSubmit={handleVerifySubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Keputusan Verifikasi</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setVerifyStatus('verified')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition ${
                      verifyStatus === 'verified'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    <CheckCircle className="w-4 h-4" />
                    <span>Lolos (Verified)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setVerifyStatus('rejected')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition ${
                      verifyStatus === 'rejected'
                        ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    <XCircle className="w-4 h-4" />
                    <span>Ulangi (Rejected)</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Catatan Verifikasi</label>
                <textarea
                  rows={2}
                  value={verifyNotes}
                  onChange={(e) => setVerifyNotes(e.target.value)}
                  placeholder="Catatan evaluasi hasil verifikasi..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowVerifyModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition disabled:opacity-50"
                >
                  {submitting ? 'Memproses...' : 'Simpan Verifikasi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
