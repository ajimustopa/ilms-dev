import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../../shared/services/api';
import {
  Target,
  BookOpenCheck,
  Award,
  BookMarked,
  Plus,
  Calendar,
  Clock,
  ArrowUpRight
} from 'lucide-react';
import StatRibbonCard from '../../../shared/components/StatRibbonCard';
import StatusPill from '../../../shared/components/StatusPill';
import LoadingSkeleton from '../../../shared/components/LoadingSkeleton';
import ErrorState from '../../../shared/components/ErrorState';

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [targets, setTargets] = useState([]);
  const [records, setRecords] = useState([]);
  const [exams, setExams] = useState([]);
  const [books, setBooks] = useState([]);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
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
      setError(err.response?.data?.message || err.message || 'Gagal memuat data dashboard tahfidz');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="space-y-4 max-w-7xl mx-auto">
        <LoadingSkeleton type="card" rows={4} />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <LoadingSkeleton type="table" rows={4} columns={3} />
          <LoadingSkeleton type="table" rows={4} columns={3} />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto p-4 bg-white rounded-lg border border-slate-200/80">
        <ErrorState
          error={error}
          onRetry={fetchData}
          title="Gagal Memuat Dashboard Tahfidz"
        />
      </div>
    );
  }

  const verifiedCount = records.filter(r => r.verification_status === 'verified').length;
  const pendingCount = records.filter(r => r.verification_status === 'pending').length;
  const scheduledExams = exams.filter(e => e.status === 'scheduled');

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      {/* Top Header & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-lg border border-slate-200/80 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-slate-800 leading-snug">
              Dashboard Tahfidz & Al-Qur'an
            </h1>
            <StatusPill variant="success">Monitoring Hafalan</StatusPill>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Ringkasan capaian hafalan santri, target kelas, jadwal munaqasyah, dan kurikulum kitab kuning.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/alquran/records"
            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-2xs transition flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Input Setoran</span>
          </Link>
          <Link
            to="/alquran/exams"
            className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold shadow-2xs transition flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
          >
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            <span>Munaqasyah</span>
          </Link>
        </div>
      </div>

      {/* KPI Summary Cards - StatRibbonCard Standard */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <StatRibbonCard
          label="Target Hafalan"
          value={targets.length}
          subtitle="Target tingkat kelas"
          icon={Target}
          status="info"
          to="/alquran/targets"
        />

        <StatRibbonCard
          label="Setoran Terverifikasi"
          value={verifiedCount}
          subtitle={`${pendingCount} setoran pending review`}
          icon={BookOpenCheck}
          status="success"
          to="/alquran/records"
        />

        <StatRibbonCard
          label="Jadwal Munaqasyah"
          value={scheduledExams.length}
          subtitle={`${exams.length} total sesi terdaftar`}
          icon={Award}
          status={scheduledExams.length > 0 ? 'warning' : 'neutral'}
          to="/alquran/exams"
        />

        <StatRibbonCard
          label="Kitab Kuning"
          value={books.length}
          subtitle="Kurikulum pondok aktif"
          icon={BookMarked}
          status="neutral"
          to="/alquran/books"
        />
      </div>

      {/* Two Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Setoran Hafalan Terbaru */}
        <div className="bg-white p-4 rounded-lg border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <BookOpenCheck className="w-4 h-4 text-slate-500" />
              <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                Setoran Hafalan Terbaru
              </h2>
            </div>
            <Link
              to="/alquran/records"
              className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 transition"
            >
              Lihat Semua &rarr;
            </Link>
          </div>

          <div className="divide-y divide-slate-100">
            {records.length > 0 ? (
              records.slice(0, 5).map((r) => (
                <div key={r.id} className="py-2.5 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-semibold text-slate-800">
                      Santri #{r.student_ref_id} — Juz {r.juz}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      Halaman {r.page_start || 1} - {r.page_end || 5} • {r.record_date ? new Date(r.record_date).toLocaleDateString('id-ID') : '-'}
                    </div>
                  </div>
                  <div className="text-right">
                    <StatusPill
                      variant={
                        r.verification_status === 'verified'
                          ? 'success'
                          : r.verification_status === 'rejected'
                          ? 'danger'
                          : 'warning'
                      }
                    >
                      {r.verification_status || 'pending'}
                    </StatusPill>
                    {r.tajwid_score && (
                      <div className="text-[10px] text-slate-400 font-mono mt-1 tnum">
                        Nilai: {r.tajwid_score}
                      </div>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="py-6 text-center text-xs text-slate-400">
                Belum ada data setoran hafalan tercatat.
              </div>
            )}
          </div>
        </div>

        {/* Jadwal Munaqasyah Terdekat */}
        <div className="bg-white p-4 rounded-lg border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-slate-500" />
              <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                Agenda Ujian Munaqasyah
              </h2>
            </div>
            <Link
              to="/alquran/exams"
              className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 transition"
            >
              Lihat Semua &rarr;
            </Link>
          </div>

          <div className="divide-y divide-slate-100">
            {exams.length > 0 ? (
              exams.slice(0, 5).map((e) => (
                <div key={e.id} className="py-2.5 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-semibold text-slate-800">
                      Ujian Juz {e.juz_tested} — Santri #{e.student_ref_id}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      Penguji: Ustadz #{e.examiner_ref_id || '1'} • {e.exam_date ? new Date(e.exam_date).toLocaleDateString('id-ID') : '-'}
                    </div>
                  </div>
                  <div>
                    <StatusPill
                      variant={
                        e.status === 'passed'
                          ? 'success'
                          : e.status === 'failed'
                          ? 'danger'
                          : 'warning'
                      }
                    >
                      {e.status}
                    </StatusPill>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-6 text-center text-xs text-slate-400">
                Belum ada jadwal ujian munaqasyah aktif.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
