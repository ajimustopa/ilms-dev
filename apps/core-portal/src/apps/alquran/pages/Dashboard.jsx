import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../../shared/services/api';
import {
  Target,
  BookOpenCheck,
  Award,
  BookMarked,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  Plus,
  ArrowRight,
  Loader2,
  Calendar,
  Sparkles
} from 'lucide-react';

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [targets, setTargets] = useState([]);
  const [records, setRecords] = useState([]);
  const [exams, setExams] = useState([]);
  const [books, setBooks] = useState([]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [tRes, rRes, eRes, bRes] = await Promise.allSettled([
        api.get('/alquran/targets'),
        api.get('/alquran/records'),
        api.get('/alquran/exams'),
        api.get('/alquran/books')
      ]);

      if (tRes.status === 'fulfilled') setTargets(tRes.value.data?.data || []);
      if (rRes.status === 'fulfilled') setRecords(rRes.value.data?.data || []);
      if (eRes.status === 'fulfilled') setExams(eRes.value.data?.data || []);
      if (bRes.status === 'fulfilled') setBooks(bRes.value.data?.data || []);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const verifiedCount = records.filter(r => r.verification_status === 'verified').length;
  const pendingCount = records.filter(r => r.verification_status === 'pending').length;
  const scheduledExams = exams.filter(e => e.status === 'scheduled');

  return (
    <div className="space-y-6">
      {/* Top Header & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
            <span>Dashboard Tahfidz & Quran</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold border border-emerald-200">
              Live Monitoring
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Ringkasan capaian hafalan santri, target kelas, jadwal munaqasyah & kurikulum kitab kuning
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/alquran/records"
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-xs transition"
          >
            <Plus className="w-4 h-4" />
            <span>Input Setoran Baru</span>
          </Link>
          <Link
            to="/alquran/exams"
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-xl shadow-xs transition"
          >
            <Calendar className="w-4 h-4" />
            <span>Jadwal Munaqasyah</span>
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-2">
          <Loader2 className="w-6 h-6 text-emerald-600 animate-spin" />
          <p className="text-xs text-slate-400">Memuat data hafalan...</p>
        </div>
      ) : (
        <>
          {/* KPI Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Target Aktif */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Target Hafalan</p>
                <h3 className="text-2xl font-bold text-slate-800 mt-1">{targets.length}</h3>
                <p className="text-[11px] text-emerald-600 font-medium mt-0.5">Kelas Terpetakan</p>
              </div>
              <div className="w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
                <Target className="w-5 h-5" />
              </div>
            </div>

            {/* Card 2: Setoran Terverifikasi */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Setoran Terverifikasi</p>
                <h3 className="text-2xl font-bold text-slate-800 mt-1">{verifiedCount}</h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  <span className="text-amber-600 font-semibold">{pendingCount}</span> menunggu verifikasi
                </p>
              </div>
              <div className="w-11 h-11 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-600">
                <BookOpenCheck className="w-5 h-5" />
              </div>
            </div>

            {/* Card 3: Ujian Munaqasyah */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Ujian Terjadwal</p>
                <h3 className="text-2xl font-bold text-slate-800 mt-1">{scheduledExams.length}</h3>
                <p className="text-[11px] text-emerald-600 font-medium mt-0.5">Munaqasyah Mendatang</p>
              </div>
              <div className="w-11 h-11 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
                <Award className="w-5 h-5" />
              </div>
            </div>

            {/* Card 4: Kitab Kuning */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Kitab Kuning</p>
                <h3 className="text-2xl font-bold text-slate-800 mt-1">{books.length}</h3>
                <p className="text-[11px] text-slate-500 font-medium mt-0.5">Kurikulum Aktif</p>
              </div>
              <div className="w-11 h-11 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                <BookMarked className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Grid Layout: Riwayat Setoran Terbaru & Ujian Mendatang */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 2 Kolom: Riwayat Setoran Terbaru */}
            <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden flex flex-col justify-between">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Riwayat Setoran Terbaru</h2>
                  <p className="text-[11px] text-slate-400">Pencatatan setoran hafalan santri oleh Musyrif</p>
                </div>
                <Link to="/alquran/records" className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1">
                  <span>Lihat Semua</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              <div className="overflow-x-auto flex-1">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100">
                    <tr>
                      <th className="px-4 py-2.5">Tanggal</th>
                      <th className="px-4 py-2.5">ID Santri</th>
                      <th className="px-4 py-2.5">Juz & Halaman</th>
                      <th className="px-4 py-2.5">Nilai Tajwid</th>
                      <th className="px-4 py-2.5">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {records.slice(0, 5).map((r) => (
                      <tr key={r.id} className="hover:bg-slate-50/50">
                        <td className="px-4 py-3 text-slate-600 font-medium">
                          {r.record_date ? r.record_date.slice(0, 10) : '-'}
                        </td>
                        <td className="px-4 py-3 font-semibold text-slate-800">
                          Santri #{r.student_ref_id}
                        </td>
                        <td className="px-4 py-3 text-slate-700">
                          <span className="font-bold text-emerald-700">Juz {r.juz}</span>
                          {r.page_start && r.page_end && (
                            <span className="text-[11px] text-slate-400 ml-1">
                              (Hal. {r.page_start} - {r.page_end})
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 font-mono font-bold text-slate-700">
                          {r.tajwid_score ? `${r.tajwid_score}` : '-'}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
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
                      </tr>
                    ))}
                    {records.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-slate-400 italic">
                          Belum ada data setoran hafalan
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 1 Kolom: Jadwal Ujian Munaqasyah Terdekat */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-4 flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Jadwal Munaqasyah</h2>
                  <Link to="/alquran/exams" className="text-xs font-semibold text-emerald-600 hover:text-emerald-700">
                    Kelola
                  </Link>
                </div>

                <div className="mt-3 space-y-3">
                  {scheduledExams.slice(0, 4).map((e) => (
                    <div key={e.id} className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5">
                          <Award className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          <span className="font-bold text-xs text-slate-800">Santri #{e.student_ref_id}</span>
                        </div>
                        <p className="text-[11px] text-slate-500">
                          Ujian <span className="font-semibold text-emerald-700">Juz {e.juz_examined}</span> &bull; Penguji Pegawai #{e.examiner_teacher_ref_id}
                        </p>
                      </div>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 border border-amber-200 shrink-0">
                        {e.exam_date ? e.exam_date.slice(0, 10) : 'TBD'}
                      </span>
                    </div>
                  ))}

                  {scheduledExams.length === 0 && (
                    <div className="py-8 text-center text-slate-400 text-xs italic">
                      Tidak ada jadwal ujian munaqasyah mendatang
                    </div>
                  )}
                </div>
              </div>

              {/* Kurikulum Kitab Mini Card */}
              <div className="p-3 rounded-xl bg-gradient-to-br from-emerald-900 to-slate-900 text-white space-y-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-bold">Kurikulum Kitab Kuning</span>
                </div>
                <p className="text-[11px] text-slate-300">
                  {books.length} kitab aktif terdaftar dengan pengampu musyrif/guru tahfidz.
                </p>
                <Link
                  to="/alquran/books"
                  className="inline-block text-[11px] font-semibold text-emerald-300 hover:text-emerald-200 underline mt-1"
                >
                  Buka Manajemen Kitab &rarr;
                </Link>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
