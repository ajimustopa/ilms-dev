import React, { useState, useEffect } from 'react';
import api from '../../../shared/services/api';
import {
  FileSpreadsheet,
  Download,
  Eye,
  Edit,
  Sparkles,
  CheckCircle,
  AlertCircle,
  Loader2,
  X,
  UserCheck,
  RotateCw
} from 'lucide-react';

export default function Rapor() {
  const [reports, setReports] = useState([]);
  const [classes, setClasses] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedSemesterId, setSelectedSemesterId] = useState('');
  const [selectedDataSource, setSelectedDataSource] = useState('');
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  // Detail Modal
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedReportDetail, setSelectedReportDetail] = useState(null);

  // Note Modal
  const [noteModalOpen, setNoteModalOpen] = useState(false);
  const [noteForm, setNoteForm] = useState({ id: null, homeroom_note: '' });

  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    fetchFilters();
  }, []);

  useEffect(() => {
    if (selectedSemesterId) {
      fetchReports();
    }
  }, [selectedClassId, selectedSemesterId, selectedDataSource]);

  const fetchFilters = async () => {
    try {
      const [classRes, semRes] = await Promise.all([
        api.get('/akademik/class-groups'),
        api.get('/akademik/semesters'),
      ]);
      const cls = classRes.data?.data || [];
      const sems = semRes.data?.data || [];
      setClasses(cls);
      setSemesters(sems);
      if (cls.length > 0) setSelectedClassId(cls[0].id);
      const activeSem = sems.find(s => s.is_active) || sems[0];
      if (activeSem) setSelectedSemesterId(activeSem.id);
    } catch (err) {
      console.error('Error fetching filters:', err);
    }
  };

  const fetchReports = async () => {
    try {
      setLoading(true);
      const params = {};
      if (selectedClassId) params.class_group_id = selectedClassId;
      if (selectedSemesterId) params.semester_id = selectedSemesterId;
      if (selectedDataSource) params.data_source = selectedDataSource;

      const res = await api.get('/akademik/report-cards', { params });
      setReports(res.data?.data || []);
    } catch (err) {
      console.error('Error fetching reports:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateClassReports = async () => {
    if (!selectedClassId || !selectedSemesterId) return;
    setGenerating(true);
    setErrorMsg('');
    try {
      const res = await api.post('/akademik/report-cards/generate', {
        class_group_id: Number(selectedClassId),
        semester_id: Number(selectedSemesterId)
      });
      setSuccessMsg(`Berhasil men-generate ${res.data?.data?.total_generated} rapor untuk rombel ini!`);
      fetchReports();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Gagal generate rapor');
    } finally {
      setGenerating(false);
    }
  };

  const handleViewDetail = async (reportId) => {
    try {
      const res = await api.get(`/akademik/report-cards/${reportId}`);
      setSelectedReportDetail(res.data?.data || null);
      setDetailModalOpen(true);
    } catch (err) {
      console.error('Error fetching report detail:', err);
    }
  };

  const handleOpenNoteModal = (report) => {
    setNoteForm({ id: report.id, homeroom_note: report.homeroom_note || '' });
    setNoteModalOpen(true);
  };

  const handleSaveNote = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/akademik/report-cards/${noteForm.id}/note`, {
        homeroom_note: noteForm.homeroom_note
      });
      setSuccessMsg('Catatan wali kelas berhasil diperbarui!');
      setNoteModalOpen(false);
      fetchReports();
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Gagal menyimpan catatan');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Rapor Siswa & Hasil Belajar</h1>
          <p className="text-xs text-slate-500 mt-1">
            Generate dan kelola lembar rapor semester, capaian kompetensi, dan catatan wali kelas.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={fetchReports}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold border border-slate-200 shadow-2xs transition active:scale-95"
            title="Segarkan Data Rapor dari Database"
          >
            <RotateCw className={`w-3.5 h-3.5 text-slate-600 ${loading ? 'animate-spin' : ''}`} />
            <span>Reload Data</span>
          </button>
          <button
            onClick={handleGenerateClassReports}
            disabled={generating || !selectedClassId}
            className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 disabled:bg-teal-400 text-white text-xs font-semibold rounded-xl shadow-sm transition"
          >
            {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            <span>Generate Rapor Rombel Ini</span>
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

      {/* Filter Panel */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center gap-3">
        <div className="w-full sm:w-56">
          <label className="block text-[10px] font-semibold text-slate-500 mb-1">Pilih Rombel:</label>
          <select
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
            className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 font-bold"
          >
            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        <div className="w-full sm:w-56">
          <label className="block text-[10px] font-semibold text-slate-500 mb-1">Pilih Semester:</label>
          <select
            value={selectedSemesterId}
            onChange={(e) => setSelectedSemesterId(e.target.value)}
            className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 font-semibold"
          >
            {semesters.map(s => (
              <option key={s.id} value={s.id}>
                Semester {s.name.toUpperCase()} {s.is_active ? '(Aktif)' : ''}
              </option>
            ))}
          </select>
        </div>

        <div className="w-full sm:w-56">
          <label className="block text-[10px] font-semibold text-slate-500 mb-1">Sumber Data:</label>
          <select
            value={selectedDataSource}
            onChange={(e) => setSelectedDataSource(e.target.value)}
            className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            <option value="">Semua Sumber Data</option>
            <option value="generated">Digenerate Sistem (Otomatis)</option>
            <option value="manual_input">Input Manual</option>
            <option value="bulk_import">Impor Riwayat (Excel)</option>
          </select>
        </div>
      </div>

      {/* Tabel Data Rapor */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto max-h-[calc(100vh-320px)] overflow-y-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 sticky top-0 z-10 shadow-2xs">
              <tr>
                <th className="py-3 px-4">NIS / NISN</th>
                <th className="py-3 px-4">Nama Siswa</th>
                <th className="py-3 px-4">Semester</th>
                <th className="py-3 px-4">Sumber / Tipe</th>
                <th className="py-3 px-4">Catatan Wali Kelas</th>
                <th className="py-3 px-4">Status File</th>
                <th className="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-teal-600" />
                    <span>Memuat daftar rapor...</span>
                  </td>
                </tr>
              ) : reports.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-400">
                    Belum ada rapor yang sesuai filter. Klik tombol "Generate Rapor" di atas atau buka menu Riwayat & Impor Data.
                  </td>
                </tr>
              ) : (
                reports.map((report) => {
                  const isLegacy = !!report.is_legacy;
                  const sourceBadge =
                    report.data_source === 'bulk_import'
                      ? { text: 'Impor Riwayat', bg: 'bg-purple-50 text-purple-700 border-purple-200' }
                      : report.data_source === 'manual_input'
                      ? { text: 'Input Manual', bg: 'bg-amber-50 text-amber-700 border-amber-200' }
                      : { text: 'Digenerate', bg: 'bg-blue-50 text-blue-700 border-blue-200' };

                  return (
                    <tr key={report.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-mono font-medium text-slate-700">
                        <div>{report.nis || '-'}</div>
                        <div className="text-[10px] text-slate-400">{report.nisn || ''}</div>
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-800">{report.student_name}</td>
                      <td className="py-3 px-4 uppercase font-semibold text-slate-600">{report.semester_name}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${sourceBadge.bg}`}>
                            {sourceBadge.text}
                          </span>
                          {isLegacy && (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-slate-200 text-slate-600 border border-slate-300">
                              Lampau
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-600 max-w-xs truncate">
                        {report.homeroom_note || <span className="text-slate-400 italic">Belum ada catatan</span>}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 font-semibold text-[10px] rounded-full border border-emerald-200">
                          PDF Siap
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right space-x-1">
                        <button
                          onClick={() => handleViewDetail(report.id)}
                          title="Lihat Detail Nilai Lengkap"
                          className="p-1.5 text-slate-600 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleOpenNoteModal(report)}
                          title="Tulis Catatan Wali Kelas"
                          className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Detail Rapor Lengkap */}
      {detailModalOpen && selectedReportDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-xl border border-slate-100 max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-800">
                  Detail Lembar Rapor: {selectedReportDetail.student_name}
                </h3>
                <p className="text-[11px] text-slate-500">
                  NIS: {selectedReportDetail.nis} • Semester: {selectedReportDetail.semester_name?.toUpperCase()}
                </p>
              </div>
              <button onClick={() => setDetailModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Rekap Nilai Mata Pelajaran & Deskripsi Capaian Rapor */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-700">1. Nilai Mata Pelajaran & Deskripsi Capaian Kompetensi:</h4>
              <table className="w-full text-left text-xs border border-slate-200 rounded-xl overflow-hidden">
                <thead className="bg-slate-50 font-semibold text-slate-600">
                  <tr>
                    <th className="py-2.5 px-3">Mata Pelajaran</th>
                    <th className="py-2.5 px-3 w-16 text-center">KKM</th>
                    <th className="py-2.5 px-3 w-20 text-center">Nilai Akhir</th>
                    <th className="py-2.5 px-3 w-16 text-center">Predikat</th>
                    <th className="py-2.5 px-3">Capaian Kompetensi (Deskripsi Rapor)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selectedReportDetail.subject_scores && selectedReportDetail.subject_scores.length > 0 ? (
                    selectedReportDetail.subject_scores.map(s => (
                      <tr key={s.id}>
                        <td className="py-2.5 px-3 font-bold text-slate-800 align-top">
                          {s.subject_name}
                          <div className="text-[10px] text-slate-400 font-normal">{s.subject_code || ''}</div>
                        </td>
                        <td className="py-2.5 px-3 text-slate-500 text-center align-top">{s.kkm_snapshot || 75}</td>
                        <td className="py-2.5 px-3 font-extrabold text-teal-700 text-sm text-center align-top">{s.score || '-'}</td>
                        <td className="py-2.5 px-3 font-bold text-slate-700 text-center align-top">{s.predikat || '-'}</td>
                        <td className="py-2.5 px-3 text-slate-700 text-xs leading-relaxed align-top">
                          {s.notes ? (
                            <div className="p-2 bg-emerald-50/70 border border-emerald-200 rounded-lg text-emerald-950 font-medium">
                              {s.notes}
                            </div>
                          ) : (
                            <span className="text-slate-400 italic text-[11px]">
                              Tercatat pada lembar rapor resmi
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : selectedReportDetail.scores?.length === 0 ? (
                    <tr><td colSpan={5} className="p-3 text-center text-slate-400">Belum ada nilai yang diinput.</td></tr>
                  ) : (
                    selectedReportDetail.scores
                      .filter(s => s.score_type === 'nilai_akhir' || !selectedReportDetail.scores.some(x => x.subject_id === s.subject_id && x.score_type === 'nilai_akhir'))
                      .map(s => (
                        <tr key={s.id}>
                          <td className="py-2.5 px-3 font-bold text-slate-800 align-top">
                            {s.subject_name}
                            <div className="text-[10px] text-slate-400 font-normal">{s.code || s.score_type?.toUpperCase()}</div>
                          </td>
                          <td className="py-2.5 px-3 text-slate-500 text-center align-top">{s.kkm || 75}</td>
                          <td className="py-2.5 px-3 font-extrabold text-teal-700 text-sm text-center align-top">{s.score || '-'}</td>
                          <td className="py-2.5 px-3 font-bold text-slate-700 text-center align-top">-</td>
                          <td className="py-2.5 px-3 text-slate-700 text-xs leading-relaxed align-top">
                            {s.competency_description ? (
                              <div className="p-2 bg-emerald-50/70 border border-emerald-200 rounded-lg text-emerald-950 font-medium">
                                {s.competency_description}
                              </div>
                            ) : (
                              <span className="text-slate-400 italic text-[11px]">
                                Belum ada deskripsi otomatis. Lakukan kalkulasi di halaman Form Input Nilai.
                              </span>
                            )}
                          </td>
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Rincian Capaian per Tujuan Pembelajaran (TP) */}
            {selectedReportDetail.tp_scores && selectedReportDetail.tp_scores.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-700">2. Rincian Capaian per Tujuan Pembelajaran (TP):</h4>
                <table className="w-full text-left text-xs border border-slate-200 rounded-xl overflow-hidden">
                  <thead className="bg-slate-50 font-semibold text-slate-600">
                    <tr>
                      <th className="py-2 px-3 w-28">Mapel</th>
                      <th className="py-2 px-3 w-20">Kode</th>
                      <th className="py-2 px-3">Tujuan Pembelajaran</th>
                      <th className="py-2 px-3 w-20">Skor</th>
                      <th className="py-2 px-3 w-32">Ketercapaian</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedReportDetail.tp_scores.map(tp => (
                      <tr key={tp.id}>
                        <td className="py-2 px-3 font-semibold text-slate-700">{tp.subject_name}</td>
                        <td className="py-2 px-3 font-bold text-teal-800">{tp.tp_code}</td>
                        <td className="py-2 px-3 text-slate-600">{tp.tp_description}</td>
                        <td className="py-2 px-3 font-bold text-slate-800">{tp.score !== null ? tp.score : '-'}</td>
                        <td className="py-2 px-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            tp.mastery_status === 'tercapai_optimal' ? 'bg-emerald-100 text-emerald-800' :
                            tp.mastery_status === 'tercapai' ? 'bg-teal-100 text-teal-800' :
                            tp.mastery_status === 'cukup' ? 'bg-amber-100 text-amber-800' :
                            'bg-rose-100 text-rose-800'
                          }`}>
                            {tp.mastery_status?.replace('_', ' ') || 'Tercapai'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Catatan Wali Kelas */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
              <h4 className="text-[11px] font-bold text-slate-700">Catatan Wali Kelas:</h4>
              <p className="text-xs text-slate-600 italic">
                "{selectedReportDetail.homeroom_note || 'Belum ada catatan perkembangan khusus dari wali kelas.'}"
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Modal Input Catatan Wali */}
      {noteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-800">Catatan Wali Kelas</h3>
              <button onClick={() => setNoteModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveNote} className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Catatan Perkembangan & Motivasi Siswa:
                </label>
                <textarea
                  rows={4}
                  required
                  value={noteForm.homeroom_note}
                  onChange={(e) => setNoteForm({ ...noteForm, homeroom_note: e.target.value })}
                  placeholder="Tuliskan catatan kemajuan belajar, kedisiplinan, dan motivasi untuk siswa..."
                  className="w-full p-2.5 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setNoteModalOpen(false)}
                  className="px-4 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold rounded-xl shadow-sm"
                >
                  Simpan Catatan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
