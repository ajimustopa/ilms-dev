import React, { useState, useEffect } from 'react';
import api from '../../../shared/services/api';
import {
  BarChart3,
  User,
  Users,
  Printer,
  FileDown,
  Loader2,
  Award,
  BookOpenCheck,
  Target
} from 'lucide-react';
import StatRibbonCard from '../../../shared/components/StatRibbonCard';
import StatusPill from '../../../shared/components/StatusPill';
import DataTable from '../../../shared/components/DataTable';
import EmptyState from '../../../shared/components/EmptyState';
import ErrorState from '../../../shared/components/ErrorState';

export default function LaporanHafalan() {
  const [reportMode, setReportMode] = useState('student'); // 'student' | 'class'
  const [studentId, setStudentId] = useState('1');
  const [classId, setClassId] = useState('1');
  const [periodLabel, setPeriodLabel] = useState('Semester Ganjil 2026/2027');
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [error, setError] = useState(null);

  const fetchReport = async () => {
    setLoading(true);
    setError(null);
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
      setError(err.response?.data?.message || err.message || 'Gagal memuat data laporan tahfidz');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [reportMode]);

  const historyColumns = [
    {
      key: 'juz',
      label: 'Juz & Halaman',
      render: (val, row) => (
        <div>
          <span className="font-bold text-slate-800">Juz {val}</span>
          <span className="text-slate-400 text-xs ml-1 font-mono">
            (Hal. {row.page_start || 1} - {row.page_end || 5})
          </span>
        </div>
      )
    },
    {
      key: 'record_date',
      label: 'Tgl Setoran',
      type: 'date',
      render: (val) => (
        <span className="text-xs text-slate-600 font-mono">
          {val ? new Date(val).toLocaleDateString('id-ID') : '-'}
        </span>
      )
    },
    {
      key: 'tajwid_score',
      label: 'Nilai Tajwid',
      type: 'number',
      render: (val) => (
        <span className="font-bold font-mono text-slate-800 tnum">
          {val != null ? val : '-'}
        </span>
      )
    },
    {
      key: 'verification_status',
      label: 'Status',
      type: 'status'
    }
  ];

  const classStudentsColumns = [
    {
      key: 'student_ref_id',
      label: 'Santri / Siswa',
      render: (val, row) => (
        <div>
          <div className="font-semibold text-slate-800">{row.student_name || `Santri #${val}`}</div>
          <div className="text-[11px] font-mono text-slate-400">ID #{val}</div>
        </div>
      )
    },
    {
      key: 'total_verified_juz',
      label: 'Capaian Hafalan',
      type: 'number',
      render: (val, row) => (
        <div>
          <span className="font-bold text-slate-800 font-mono tnum">{val || 0}</span>
          <span className="text-slate-500 text-xs ml-1">Juz Lulus</span>
        </div>
      )
    },
    {
      key: 'average_tajwid_score',
      label: 'Rata-rata Tajwid',
      type: 'number',
      render: (val) => (
        <span className="font-bold font-mono text-slate-800 tnum">
          {val ? Number(val).toFixed(1) : '-'}
        </span>
      )
    },
    {
      key: 'exam_status',
      label: 'Munaqasyah',
      render: (val) => (
        <StatusPill variant={val === 'passed' ? 'success' : 'warning'}>
          {val || 'Belum Ujian'}
        </StatusPill>
      )
    }
  ];

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      {/* Header & Print Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-lg border border-slate-200/80 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-slate-800 leading-snug">
              Laporan Capaian Tahfidz & Evaluasi
            </h1>
            <StatusPill variant="info">Rekap Nilai</StatusPill>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Laporan komprehensif mutaba'ah hafalan santri perorangan dan agregat rombel kelas.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => window.print()}
            className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg shadow-2xs transition flex items-center gap-1.5 cursor-pointer shrink-0"
          >
            <Printer className="w-3.5 h-3.5 text-slate-500" />
            <span>Cetak Laporan</span>
          </button>
        </div>
      </div>

      {/* Mode Switcher & Filter */}
      <div className="p-3 bg-white rounded-lg border border-slate-200/80 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
          <button
            type="button"
            onClick={() => setReportMode('student')}
            className={`px-3 py-1 rounded-md text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer ${
              reportMode === 'student'
                ? 'bg-white text-slate-800 shadow-2xs'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Laporan Santri Individu</span>
          </button>
          <button
            type="button"
            onClick={() => setReportMode('class')}
            className={`px-3 py-1 rounded-md text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer ${
              reportMode === 'class'
                ? 'bg-white text-slate-800 shadow-2xs'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Rekap Rombel Kelas</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          {reportMode === 'student' ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">ID Santri:</span>
              <input
                type="number"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                className="w-24 px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono focus:bg-white focus:outline-none focus:border-emerald-500"
              />
              <button
                type="button"
                onClick={fetchReport}
                className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-2xs transition cursor-pointer"
              >
                Tampilkan
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">ID Kelas:</span>
              <input
                type="number"
                value={classId}
                onChange={(e) => setClassId(e.target.value)}
                className="w-20 px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono focus:bg-white focus:outline-none focus:border-emerald-500"
              />
              <button
                type="button"
                onClick={fetchReport}
                className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-2xs transition cursor-pointer"
              >
                Tampilkan
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Loading / Error / Content */}
      {loading ? (
        <div className="py-16 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
        </div>
      ) : error ? (
        <div className="p-4 bg-white rounded-lg border border-slate-200/80">
          <ErrorState error={error} onRetry={fetchReport} />
        </div>
      ) : reportData ? (
        <div className="space-y-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <StatRibbonCard
              label={reportMode === 'student' ? 'Total Juz Lulus' : 'Target Rombel'}
              value={reportMode === 'student' ? `${reportData.total_verified_juz || 0} Juz` : `${reportData.target_value || 0} Juz`}
              subtitle={reportMode === 'student' ? 'Terverifikasi asatidz' : reportData.period_label || 'Semester aktif'}
              icon={Target}
              status="success"
            />
            <StatRibbonCard
              label="Rata-rata Nilai Tajwid"
              value={reportData.average_tajwid_score ? Number(reportData.average_tajwid_score).toFixed(1) : '-'}
              subtitle="Standar kelancaran tilawah"
              icon={BookOpenCheck}
              status="info"
            />
            <StatRibbonCard
              label="Kelulusan Munaqasyah"
              value={reportMode === 'student' ? (reportData.passed_exams_count || 0) : `${reportData.passed_students_count || 0} Santri`}
              subtitle="Syahadah resmi diterbitkan"
              icon={Award}
              status="neutral"
            />
          </div>

          {/* Table Data */}
          <div className="bg-white p-4 rounded-lg border border-slate-200/80 shadow-2xs space-y-3">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
              {reportMode === 'student' ? 'Rincian Log Setoran Santri' : 'Daftar Capaian Santri Rombel'}
            </h3>

            {reportMode === 'student' ? (
              <DataTable
                columns={historyColumns}
                data={reportData.records || []}
                density="compact"
                emptyTitle="Belum Ada Setoran Tercatat"
              />
            ) : (
              <DataTable
                columns={classStudentsColumns}
                data={reportData.students || []}
                density="compact"
                emptyTitle="Belum Ada Data Santri di Rombel Ini"
              />
            )}
          </div>
        </div>
      ) : (
        <EmptyState
          title="Pilih Santri atau Kelas"
          description="Masukkan ID santri atau kelas di atas kemudian klik tombol Tampilkan untuk memuat laporan."
        />
      )}
    </div>
  );
}
