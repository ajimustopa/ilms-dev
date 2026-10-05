import React, { useState, useEffect, useMemo } from 'react';
import api from '../../../shared/services/api';
import {
  Award,
  Plus,
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  Edit2
} from 'lucide-react';
import DataTable from '../../../shared/components/DataTable';
import FilterBar from '../../../shared/components/FilterBar';
import Modal from '../../../shared/components/Modal';
import FlatAlertBanner from '../../../shared/components/FlatAlertBanner';
import StatusPill from '../../../shared/components/StatusPill';

export default function UjianMunaqasyah() {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showScoreModal, setShowScoreModal] = useState(false);
  const [selectedExam, setSelectedExam] = useState(null);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Form Jadwal Ujian
  const [scheduleData, setScheduleData] = useState({
    student_ref_id: '1',
    juz_tested: 30,
    exam_date: new Date().toISOString().slice(0, 10),
    examiner_ref_id: '1'
  });

  // Form Input Nilai Hasil
  const [scoreData, setScoreData] = useState({
    score: 90,
    status: 'passed',
    certificate_number: '',
    notes: ''
  });

  const fetchExams = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/alquran/exams');
      setExams(res.data?.data || []);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Gagal memuat jadwal munaqasyah');
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
      juz_tested: 30,
      exam_date: new Date().toISOString().slice(0, 10),
      examiner_ref_id: '1'
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
        student_ref_id: Number(scheduleData.student_ref_id),
        juz_tested: Number(scheduleData.juz_tested),
        exam_date: scheduleData.exam_date,
        examiner_ref_id: Number(scheduleData.examiner_ref_id)
      };

      await api.post('/alquran/exams', payload);
      setShowScheduleModal(false);
      fetchExams();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Gagal menjadwalkan munaqasyah');
    } finally {
      setSubmitting(false);
    }
  };

  const openScoreModal = (exam) => {
    setSelectedExam(exam);
    setScoreData({
      score: exam.score || 90,
      status: exam.status === 'scheduled' ? 'passed' : exam.status,
      certificate_number: exam.certificate_number || `CERT-MNQ-${Date.now().toString().slice(-5)}`,
      notes: exam.notes || ''
    });
    setError(null);
    setShowScoreModal(true);
  };

  const handleScoreSubmit = async (e) => {
    e.preventDefault();
    if (!selectedExam) return;
    setError(null);
    setSubmitting(true);

    try {
      const payload = {
        score: parseFloat(scoreData.score),
        status: scoreData.status,
        certificate_number: scoreData.status === 'passed' ? scoreData.certificate_number : null,
        notes: scoreData.notes
      };

      await api.patch(`/alquran/exams/${selectedExam.id}/score`, payload);
      setShowScoreModal(false);
      fetchExams();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Gagal menyimpan nilai munaqasyah');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredExams = useMemo(() => {
    return exams.filter((e) => {
      const matchesSearch =
        search === '' ||
        String(e.student_ref_id).toLowerCase().includes(search.toLowerCase()) ||
        String(e.juz_tested).includes(search) ||
        (e.certificate_number && e.certificate_number.toLowerCase().includes(search.toLowerCase()));

      const matchesStatus = statusFilter === 'all' || e.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [exams, search, statusFilter]);

  const columns = [
    {
      key: 'student_ref_id',
      label: 'Santri / Siswa',
      render: (val) => (
        <div>
          <div className="font-semibold text-slate-800">Santri ID #{val}</div>
          <div className="text-[11px] font-mono text-slate-400">Peserta Munaqasyah</div>
        </div>
      )
    },
    {
      key: 'juz_tested',
      label: 'Juz Diujikan',
      render: (val) => <span className="font-bold text-slate-800">Juz {val}</span>
    },
    {
      key: 'exam_date',
      label: 'Tgl Ujian',
      type: 'date',
      render: (val) => (
        <span className="text-xs text-slate-600 font-mono">
          {val ? new Date(val).toLocaleDateString('id-ID') : '-'}
        </span>
      )
    },
    {
      key: 'examiner_ref_id',
      label: 'Penguji (Musyrif)',
      render: (val) => <span className="text-slate-700">Ustadz ID #{val}</span>
    },
    {
      key: 'score',
      label: 'Nilai Akhir',
      type: 'number',
      render: (val, row) => (
        <div>
          <span className="font-bold font-mono text-slate-800 tnum">
            {val != null ? val : '-'}
          </span>
          {row.certificate_number && (
            <div className="text-[10px] font-mono text-emerald-700">{row.certificate_number}</div>
          )}
        </div>
      )
    },
    {
      key: 'status',
      label: 'Status',
      type: 'status',
      width: '120px'
    },
    {
      key: 'actions',
      label: 'Aksi',
      align: 'right',
      sticky: 'right',
      width: '120px',
      render: (_, exam) => (
        <div className="flex items-center justify-end">
          {exam.status === 'scheduled' ? (
            <button
              type="button"
              onClick={() => openScoreModal(exam)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition cursor-pointer border border-emerald-200"
            >
              <Award className="w-3.5 h-3.5" />
              <span>Input Nilai</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => openScoreModal(exam)}
              className="px-2 py-1 text-xs text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded transition cursor-pointer"
            >
              Edit Nilai
            </button>
          )}
        </div>
      )
    }
  ];

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-slate-800 leading-snug">
            Ujian Munaqasyah & Sertifikasi Tahfidz
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Penjadwalan sidang munaqasyah juz, penilaian kelancaran, dan penerbitan nomor syahadah.
          </p>
        </div>

        <button
          type="button"
          onClick={openScheduleModal}
          className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-2xs transition flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Jadwalkan Munaqasyah</span>
        </button>
      </div>

      {/* FilterBar Standar */}
      <FilterBar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Cari ID santri, juz, atau nomor sertifikat..."
        onReset={() => {
          setSearch('');
          setStatusFilter('all');
        }}
        hasActiveFilters={Boolean(statusFilter !== 'all' || search)}
        filters={
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:bg-white focus:outline-none focus:border-emerald-500 transition"
          >
            <option value="all">Semua Status Ujian</option>
            <option value="scheduled">Terjadwal (Scheduled)</option>
            <option value="passed">Lulus (Passed / Syahadah)</option>
            <option value="failed">Belum Lulus (Remedial)</option>
          </select>
        }
        actions={
          <span className="text-xs text-slate-500">
            Total: <span className="font-bold text-slate-800 tnum">{filteredExams.length}</span> sesi
          </span>
        }
      />

      {/* Generic DataTable */}
      <DataTable
        columns={columns}
        data={filteredExams}
        loading={loading}
        density="compact"
        emptyTitle="Belum Ada Jadwal Munaqasyah"
        emptyDescription="Tidak ada sesi ujian munaqasyah yang aktif atau sesuai dengan filter."
        emptyAction={
          <button
            type="button"
            onClick={openScheduleModal}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition shadow-2xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Jadwalkan Munaqasyah Baru</span>
          </button>
        }
      />

      {/* Modal Jadwalkan Munaqasyah */}
      <Modal
        isOpen={showScheduleModal}
        onClose={() => setShowScheduleModal(false)}
        title="Jadwalkan Sidang Munaqasyah Baru"
        subtitle="Tetapkan santri peserta, juz yang diuji, dan musyrif penguji."
        size="md"
        footer={
          <>
            <button
              type="button"
              onClick={() => setShowScheduleModal(false)}
              className="px-3.5 py-1.5 rounded-lg text-slate-600 hover:bg-slate-100 text-xs font-semibold transition cursor-pointer"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleScheduleSubmit}
              disabled={submitting}
              className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-2xs"
            >
              {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Simpan Jadwal Ujian</span>
            </button>
          </>
        }
      >
        <div className="space-y-3.5">
          {error && (
            <FlatAlertBanner
              variant="danger"
              title="Gagal Menjadwalkan Ujian"
              description={error}
            />
          )}

          <form onSubmit={handleScheduleSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ID Santri / Siswa
                </label>
                <input
                  type="number"
                  required
                  value={scheduleData.student_ref_id}
                  onChange={(e) => setScheduleData({ ...scheduleData, student_ref_id: e.target.value })}
                  placeholder="ID Santri"
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono focus:bg-white focus:outline-none focus:border-emerald-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Juz yang Diujikan
                </label>
                <input
                  type="number"
                  min="1"
                  max="30"
                  required
                  value={scheduleData.juz_tested}
                  onChange={(e) => setScheduleData({ ...scheduleData, juz_tested: e.target.value })}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono focus:bg-white focus:outline-none focus:border-emerald-500 transition"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tanggal Pelaksanaan
                </label>
                <input
                  type="date"
                  required
                  value={scheduleData.exam_date}
                  onChange={(e) => setScheduleData({ ...scheduleData, exam_date: e.target.value })}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono focus:bg-white focus:outline-none focus:border-emerald-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ID Musyrif Penguji
                </label>
                <input
                  type="number"
                  required
                  value={scheduleData.examiner_ref_id}
                  onChange={(e) => setScheduleData({ ...scheduleData, examiner_ref_id: e.target.value })}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono focus:bg-white focus:outline-none focus:border-emerald-500 transition"
                />
              </div>
            </div>
          </form>
        </div>
      </Modal>

      {/* Modal Input Nilai Hasil */}
      <Modal
        isOpen={showScoreModal}
        onClose={() => setShowScoreModal(false)}
        title="Input Nilai & Keputusan Munaqasyah"
        subtitle={selectedExam ? `Ujian Santri #${selectedExam.student_ref_id} — Juz ${selectedExam.juz_tested}` : ''}
        size="md"
        footer={
          <>
            <button
              type="button"
              onClick={() => setShowScoreModal(false)}
              className="px-3.5 py-1.5 rounded-lg text-slate-600 hover:bg-slate-100 text-xs font-semibold transition cursor-pointer"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleScoreSubmit}
              disabled={submitting}
              className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-2xs"
            >
              {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Simpan Nilai & Status</span>
            </button>
          </>
        }
      >
        <div className="space-y-3.5">
          {error && (
            <FlatAlertBanner
              variant="danger"
              title="Gagal Menyimpan Nilai"
              description={error}
            />
          )}

          <form onSubmit={handleScoreSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nilai Total (0 - 100)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  required
                  value={scoreData.score}
                  onChange={(e) => setScoreData({ ...scoreData, score: e.target.value })}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono focus:bg-white focus:outline-none focus:border-emerald-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Keputusan Hasil
                </label>
                <select
                  value={scoreData.status}
                  onChange={(e) => setScoreData({ ...scoreData, status: e.target.value })}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:outline-none focus:border-emerald-500 transition"
                >
                  <option value="passed">Lulus (Syahadah Diterbitkan)</option>
                  <option value="failed">Belum Lulus (Remedial)</option>
                  <option value="scheduled">Tetap Terjadwal</option>
                </select>
              </div>
            </div>

            {scoreData.status === 'passed' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nomor Syahadah / Sertifikat
                </label>
                <input
                  type="text"
                  required
                  value={scoreData.certificate_number}
                  onChange={(e) => setScoreData({ ...scoreData, certificate_number: e.target.value })}
                  placeholder="MNQ/2026/001"
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono focus:bg-white focus:outline-none focus:border-emerald-500 transition"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Catatan Penguji
              </label>
              <textarea
                rows={2}
                value={scoreData.notes}
                onChange={(e) => setScoreData({ ...scoreData, notes: e.target.value })}
                placeholder="Evaluasi kelancaran hafalan dan tajwid santri..."
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:outline-none focus:border-emerald-500 transition"
              />
            </div>
          </form>
        </div>
      </Modal>
    </div>
  );
}
