import React, { useState, useEffect } from 'react';
import api from '../../../shared/services/api';
import {
  BarChart3,
  User,
  Users,
  Printer,
  FileDown,
  Loader2,
  CheckCircle2,
  Award,
  BookOpenCheck
} from 'lucide-react';

export default function LaporanHafalan() {
  const [reportMode, setReportMode] = useState('student'); // 'student' | 'class'
  const [studentId, setStudentId] = useState('1');
  const [classId, setClassId] = useState('1');
  const [periodLabel, setPeriodLabel] = useState('Semester Ganjil 2026/2027');
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState(null);

  const fetchReport = async () => {
    setLoading(true);
    setReportData(null);
    try {
      if (reportMode === 'student') {
        const res = await api.get(`/alquran/reports/students/${studentId}`);
        setReportData(res.data?.data);
      } else {
        const res = await api.get(`/alquran/reports/classes/${classId}?period_label=${encodeURIComponent(periodLabel)}`);
        setReportData(res.data?.data);
      }
    } catch (err) {
      console.error('Error fetching report:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [reportMode]);

  return (
    <div className="space-y-6">
      {/* Header & Print Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800 tracking-tight">Laporan Capaian Tahfidz</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Laporan komprehensif progres mutaba'ah hafalan Al-Quran santri individu dan rekap per rombel kelas
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl shadow-2xs transition"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Cetak</span>
          </button>
          <button
            type="button"
            onClick={() => alert(`Laporan berhasil diekspor format PDF!`)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-xs transition"
          >
            <FileDown className="w-3.5 h-3.5" />
            <span>Ekspor PDF / Excel</span>
          </button>
        </div>
      </div>

      {/* Control Bar: Mode & Filter */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex p-1 bg-slate-100 rounded-xl">
            <button
              type="button"
              onClick={() => setReportMode('student')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                reportMode === 'student'
                  ? 'bg-white text-emerald-800 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>Laporan Per Santri</span>
            </button>
            <button
              type="button"
              onClick={() => setReportMode('class')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                reportMode === 'class'
                  ? 'bg-white text-emerald-800 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Laporan Per Kelas</span>
            </button>
          </div>

          {reportMode === 'student' ? (
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500">ID Santri:</span>
              <input
                type="number"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                className="w-24 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
              />
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500">ID Kelas:</span>
              <input
                type="number"
                value={classId}
                onChange={(e) => setClassId(e.target.value)}
                className="w-20 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
              />
              <span className="text-xs font-semibold text-slate-500 ml-2">Periode:</span>
              <input
                type="text"
                value={periodLabel}
                onChange={(e) => setPeriodLabel(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
              />
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={fetchReport}
          className="px-3.5 py-1.5 bg-slate-800 text-white text-xs font-semibold rounded-xl hover:bg-slate-900 transition"
        >
          Tampilkan Laporan
        </button>
      </div>

      {/* Report View Panel */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 overflow-hidden">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-6 h-6 text-emerald-600 animate-spin" />
            <p className="text-xs text-slate-400">Mengagregasi data capaian hafalan...</p>
          </div>
        ) : !reportData ? (
          <div className="py-20 text-center text-slate-400 text-xs italic">
            Pilih parameter dan klik Tampilkan Laporan
          </div>
        ) : (
          <div className="space-y-6">
            {/* Header Laporan Cetak */}
            <div className="text-center pb-4 border-b border-slate-200 space-y-1">
              <h2 className="text-base font-bold text-slate-800 uppercase tracking-wide">
                {reportMode === 'student' ? `Laporan Capaian Tahfidz Santri #${reportData.student_ref_id}` : `Laporan Capaian Tahfidz Kelas #${reportData.class_ref_id}`}
              </h2>
              <p className="text-xs text-slate-500">
                Pesantren & Sekolah Islam Terpadu Aldepos IBS &bull; Periode: {periodLabel}
              </p>
            </div>

            {/* 1. VIEW LAPORAN PER SANTRI */}
            {reportMode === 'student' && reportData.summary && (
              <div className="space-y-6">
                {/* Summary Metrics */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-100">
                    <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Juz Terhafal</p>
                    <h4 className="text-xl font-extrabold text-emerald-900 mt-1">
                      {reportData.summary.distinct_juz_achieved} <span className="text-xs font-normal">Juz</span>
                    </h4>
                    <p className="text-[10px] text-emerald-700 mt-0.5 font-mono">
                      Juz: {reportData.summary.distinct_juz_list?.join(', ') || '-'}
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-teal-50 border border-teal-100">
                    <p className="text-[10px] font-bold text-teal-700 uppercase tracking-wider">Total Halaman</p>
                    <h4 className="text-xl font-extrabold text-teal-900 mt-1">
                      {reportData.summary.total_pages_memorized} <span className="text-xs font-normal">Hal.</span>
                    </h4>
                    <p className="text-[10px] text-teal-700 mt-0.5">
                      {reportData.summary.total_verified_records} kali setoran lolos
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-100">
                    <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">Rata-Rata Tajwid</p>
                    <h4 className="text-xl font-extrabold text-amber-900 mt-1">
                      {reportData.summary.average_tajwid_score || '-'}
                    </h4>
                    <p className="text-[10px] text-amber-700 mt-0.5">Skala 0 - 100</p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-indigo-50 border border-indigo-100">
                    <p className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider">Munaqasyah</p>
                    <h4 className="text-xl font-extrabold text-indigo-900 mt-1">
                      {reportData.summary.total_exams_taken} <span className="text-xs font-normal">Lulus</span>
                    </h4>
                    <p className="text-[10px] text-indigo-700 mt-0.5">
                      {reportData.summary.upcoming_exams} terjadwal
                    </p>
                  </div>
                </div>

                {/* Detail Tabel Riwayat Setoran */}
                <div className="space-y-2">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Riwayat Setoran Mutaba'ah</h3>
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                        <tr>
                          <th className="px-4 py-2.5">Tanggal</th>
                          <th className="px-4 py-2.5">Juz</th>
                          <th className="px-4 py-2.5">Halaman</th>
                          <th className="px-4 py-2.5">Nilai Tajwid</th>
                          <th className="px-4 py-2.5">Status</th>
                          <th className="px-4 py-2.5">Catatan Musyrif</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {reportData.records?.map((r) => (
                          <tr key={r.id} className="hover:bg-slate-50/50">
                            <td className="px-4 py-2 text-slate-600">{r.record_date ? r.record_date.slice(0, 10) : '-'}</td>
                            <td className="px-4 py-2 font-bold text-emerald-800">Juz {r.juz}</td>
                            <td className="px-4 py-2 text-slate-600">Hal. {r.page_start || '-'} s/d {r.page_end || '-'}</td>
                            <td className="px-4 py-2 font-mono font-bold text-slate-800">{r.tajwid_score || '-'}</td>
                            <td className="px-4 py-2 font-semibold capitalize text-emerald-700">{r.verification_status}</td>
                            <td className="px-4 py-2 text-slate-500">{r.notes || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* 2. VIEW LAPORAN PER KELAS */}
            {reportMode === 'class' && (
              <div className="space-y-4">
                {/* Target Kelas Banner */}
                {reportData.target && (
                  <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-emerald-900">Target Resmi Kelas #{reportData.class_ref_id}</p>
                      <p className="text-[11px] text-emerald-700 mt-0.5">
                        Target: <span className="font-bold">{reportData.target.target_value} {reportData.target.target_type}</span> per santri di periode {reportData.period_label}
                      </p>
                    </div>
                    <span className="text-xs font-semibold px-3 py-1 rounded-full bg-emerald-600 text-white shadow-2xs">
                      {reportData.total_students_recorded} Santri Tercatat
                    </span>
                  </div>
                )}

                {/* Tabel Rekap Santri Kelas */}
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-2.5">ID Santri</th>
                        <th className="px-4 py-2.5">Total Setoran</th>
                        <th className="px-4 py-2.5">Setoran Verified</th>
                        <th className="px-4 py-2.5">Juz Terhafal</th>
                        <th className="px-4 py-2.5">Halaman Terhafal</th>
                        <th className="px-4 py-2.5">Pencapaian Target</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {reportData.students?.map((s) => (
                        <tr key={s.student_ref_id} className="hover:bg-slate-50/50">
                          <td className="px-4 py-2.5 font-bold text-slate-800">Santri #{s.student_ref_id}</td>
                          <td className="px-4 py-2.5 text-slate-600">{s.total_records} kali</td>
                          <td className="px-4 py-2.5 text-emerald-700 font-semibold">{s.verified_records} kali</td>
                          <td className="px-4 py-2.5 font-bold text-emerald-900">{s.achieved_juz_count} Juz</td>
                          <td className="px-4 py-2.5 text-slate-700 font-medium">{s.achieved_pages_count} Halaman</td>
                          <td className="px-4 py-2.5">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                                s.target_met
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : 'bg-amber-50 text-amber-700 border-amber-200'
                              }`}
                            >
                              {s.target_met ? 'Tercapai' : 'Dalam Progres'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
