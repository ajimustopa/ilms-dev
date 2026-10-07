import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  PieChart,
  Download,
  Calendar,
  Users,
  TrendingUp,
  FileSpreadsheet
} from 'lucide-react';
import api from '../../../../shared/services/api';

export default function LeaveReportsTab({ activeSchoolUnit }) {
  const [summary, setSummary] = useState({
    pending_requests: 0,
    approved_requests: 0,
    total_active_employees: 0,
    total_leave_days_taken: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSummary = async () => {
      setLoading(true);
      try {
        let q = '';
        if (activeSchoolUnit?.id) q = `?schoolUnitId=${activeSchoolUnit.id}`;
        const res = await api.get(`/kepegawaian/leave-requests/reports/summary${q}`);
        if (res.data?.success) {
          setSummary(res.data.data);
        }
      } catch (err) {
        console.error('Failed to fetch report summary:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSummary();
  }, [activeSchoolUnit]);

  return (
    <div className="space-y-6">
      {/* Top Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Total Pegawai Aktif</p>
          <h3 className="text-2xl font-bold text-slate-900">{summary.total_active_employees} Orang</h3>
          <p className="text-xs text-slate-400 mt-1">Data master yayasan</p>
        </div>

        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Cuti Disetujui</p>
          <h3 className="text-2xl font-bold text-emerald-600">{summary.approved_requests} Pengajuan</h3>
          <p className="text-xs text-slate-400 mt-1">Telah disahkan berjenjang</p>
        </div>

        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Total Hari Diambil</p>
          <h3 className="text-2xl font-bold text-indigo-600">{summary.total_leave_days_taken} Hari</h3>
          <p className="text-xs text-slate-400 mt-1">Akumulasi hari cuti</p>
        </div>

        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Antrean Pending</p>
          <h3 className="text-2xl font-bold text-amber-600">{summary.pending_requests} Pengajuan</h3>
          <p className="text-xs text-slate-400 mt-1">Memerlukan tindakan</p>
        </div>
      </div>

      {/* Visual Analytics Grid (Native SVG/CSS) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Category Breakdown (Native SVG Donut) */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <PieChart className="w-4 h-4 text-indigo-600" />
              Distribusi Kategori Cuti
            </h4>
            <span className="text-xs text-slate-400 font-medium">Berdasarkan Pengajuan</span>
          </div>

          <div className="flex items-center justify-center py-6">
            <div className="relative w-40 h-40 flex items-center justify-center">
              <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
                <circle cx="18" cy="18" r="15.915" fill="none" stroke="#e2e8f0" strokeWidth="3.8" />
                <circle cx="18" cy="18" r="15.915" fill="none" stroke="#4f46e5" strokeWidth="3.8" strokeDasharray="60, 100" strokeLinecap="round" />
                <circle cx="18" cy="18" r="15.915" fill="none" stroke="#10b981" strokeWidth="3.8" strokeDasharray="25, 100" strokeDashoffset="-60" strokeLinecap="round" />
                <circle cx="18" cy="18" r="15.915" fill="none" stroke="#f59e0b" strokeWidth="3.8" strokeDasharray="15, 100" strokeDashoffset="-85" strokeLinecap="round" />
              </svg>
              <div className="absolute flex flex-col items-center justify-center text-center">
                <span className="text-xl font-bold text-slate-900">{summary.total_leave_days_taken}</span>
                <span className="text-[10px] uppercase font-semibold text-slate-400">Total Hari</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 pt-2 text-center text-xs">
            <div className="p-2 bg-indigo-50 rounded-lg">
              <div className="w-2.5 h-2.5 rounded-full bg-indigo-600 inline-block mb-1" />
              <div className="font-semibold text-slate-800">Cuti Tahunan</div>
              <div className="text-slate-500 font-medium">60%</div>
            </div>
            <div className="p-2 bg-emerald-50 rounded-lg">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-600 inline-block mb-1" />
              <div className="font-semibold text-slate-800">Sakit / Izin</div>
              <div className="text-slate-500 font-medium">25%</div>
            </div>
            <div className="p-2 bg-amber-50 rounded-lg">
              <div className="w-2.5 h-2.5 rounded-full bg-amber-600 inline-block mb-1" />
              <div className="font-semibold text-slate-800">Cuti Khusus</div>
              <div className="text-slate-500 font-medium">15%</div>
            </div>
          </div>
        </div>

        {/* Monthly Trend (Native SVG Bar Chart) */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-indigo-600" />
              Tren Pengambilan Cuti Bulanan (HK)
            </h4>
            <span className="text-xs text-slate-400 font-medium">Tahun Ajaran 2026/2027</span>
          </div>

          <div className="h-48 flex items-end justify-between gap-2 pt-6 px-2">
            {[
              { month: 'Jul', val: 4, height: '25%' },
              { month: 'Agt', val: 8, height: '45%' },
              { month: 'Sep', val: 6, height: '35%' },
              { month: 'Okt', val: 14, height: '80%' },
              { month: 'Nov', val: 11, height: '65%' },
              { month: 'Des', val: 18, height: '100%' }
            ].map((bar, bIdx) => (
              <div key={bIdx} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                <span className="text-[10px] font-bold text-indigo-600">{bar.val}</span>
                <div
                  style={{ height: bar.height }}
                  className="w-full max-w-[28px] bg-indigo-600 hover:bg-indigo-700 rounded-t-md transition-all cursor-pointer shadow-xs"
                />
                <span className="text-[11px] font-medium text-slate-500">{bar.month}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
