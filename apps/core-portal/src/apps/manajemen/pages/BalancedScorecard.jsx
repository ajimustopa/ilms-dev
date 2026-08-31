import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../shared/store/AuthContext';
import api from '../../../shared/services/api';
import {
  Compass,
  Building2,
  School,
  TrendingUp,
  Target,
  BarChart2,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Layers,
  Filter,
  Calendar,
  Sparkles,
  ArrowRight,
  TrendingDown,
  LineChart as LineChartIcon
} from 'lucide-react';

export default function BalancedScorecard() {
  const { user, schoolUnits, activeSchoolUnit } = useAuth();

  // Context
  const [contextType, setContextType] = useState('school_unit');
  const [selectedUnitId, setSelectedUnitId] = useState(
    activeSchoolUnit?.id || (schoolUnits?.[0]?.id || 1)
  );

  // Data States
  const [loading, setLoading] = useState(true);
  const [ripsDoc, setRipsDoc] = useState(null);
  const [reportsList, setReportsList] = useState([]);
  const [selectedReportId, setSelectedReportId] = useState('');
  const [dashboardData, setDashboardData] = useState(null);
  const [trendData, setTrendData] = useState(null);

  // Filters
  const [selectedAspectFilter, setSelectedAspectFilter] = useState('all');

  useEffect(() => {
    if (activeSchoolUnit?.id) {
      setSelectedUnitId(activeSchoolUnit.id);
    }
  }, [activeSchoolUnit]);

  // 1. Fetch Reports List & RIPS Doc
  const fetchReports = async () => {
    try {
      setLoading(true);
      const schoolUnitQuery = contextType === 'school_unit' ? `?school_unit_id=${selectedUnitId}` : '';
      const docRes = await api.get(`/manajemen/rips/documents/current${schoolUnitQuery}`);
      if (docRes.data?.success) setRipsDoc(docRes.data.data);

      const query = contextType === 'school_unit'
        ? `school_unit_id=${selectedUnitId}`
        : `foundation_only=true`;
      const repRes = await api.get(`/manajemen/evadir/evadir-reports?${query}`);

      if (repRes.data?.success) {
        const list = repRes.data.data || [];
        setReportsList(list);
        if (list.length > 0) {
          setSelectedReportId(list[0].id);
        } else {
          setSelectedReportId('');
          setDashboardData(null);
          setLoading(false);
        }
      }
    } catch (err) {
      console.error('Error fetching BSC reports list:', err);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [contextType, selectedUnitId]);

  // 2. Fetch BSC Dashboard for selected EVADIR report
  const fetchBscData = async () => {
    if (!selectedReportId) return;
    try {
      setLoading(true);
      const [dashRes, trendRes] = await Promise.all([
        api.get(`/manajemen/bsc/dashboard?evadir_report_id=${selectedReportId}`),
        ripsDoc?.id ? api.get(`/manajemen/bsc/trend?rips_document_id=${ripsDoc.id}`) : Promise.resolve({ data: { success: false } }),
      ]);

      if (dashRes.data?.success) {
        setDashboardData(dashRes.data.data);
      }
      if (trendRes.data?.success) {
        setTrendData(trendRes.data.data);
      }
    } catch (err) {
      console.error('Error fetching BSC dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedReportId) {
      fetchBscData();
    }
  }, [selectedReportId, ripsDoc]);

  // Format Radar Data
  const radarChartData = (dashboardData?.aspects || []).map((asp) => ({
    aspect: asp.aspect_name,
    capaian: asp.avg_achieved_percent,
    target: asp.avg_target_percent || 100,
    baseline: asp.avg_baseline_percent || 0,
  }));

  // Filter Table Goals
  const allGoals = dashboardData?.aspects?.flatMap((a) => a.goals) || [];
  const filteredGoals = selectedAspectFilter === 'all'
    ? allGoals
    : allGoals.filter((g) => g.bsc_aspect_name === selectedAspectFilter);

  // Colors for trend line
  const aspectColors = {
    'Finansial': '#10B981', // emerald
    'Pelanggan & Stakeholder': '#6366F1', // indigo
    'Proses Bisnis Internal': '#F59E0B', // amber
    'Pembelajaran & Pertumbuhan': '#EC4899', // pink
  };

  return (
    <div className="space-y-6 pb-16">
      {/* 1. HEADER CARD */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 relative z-10">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-500 to-violet-600 flex items-center justify-center text-white shadow-lg shadow-indigo-950/60 border border-indigo-400/30">
              <Compass className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-white tracking-tight">Balanced Scorecard (BSC)</h1>
              </div>
              <p className="text-slate-400 text-xs mt-0.5">
                Evaluasi kinerja strategis multi-perspektif (Finansial, Stakeholder, Proses Internal, Pembelajaran & Pertumbuhan)
              </p>
            </div>
          </div>

          {/* Context Controls */}
          <div className="flex flex-wrap items-center gap-3 self-start lg:self-auto">
            {/* Context Switcher */}
            <div className="flex items-center gap-1 bg-slate-950/80 p-1 rounded-2xl border border-slate-800">
              <button
                onClick={() => setContextType('school_unit')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                  contextType === 'school_unit'
                    ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <School className="w-3.5 h-3.5" />
                Satuan
              </button>
              <button
                onClick={() => setContextType('foundation')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                  contextType === 'foundation'
                    ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Building2 className="w-3.5 h-3.5" />
                Yayasan
              </button>

              {contextType === 'school_unit' && (
                <select
                  value={selectedUnitId}
                  onChange={(e) => setSelectedUnitId(Number(e.target.value))}
                  className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-xl px-2.5 py-1.5 outline-none font-medium"
                >
                  {schoolUnits?.map((unit) => (
                    <option key={unit.id} value={unit.id}>
                      {unit.name} ({unit.level})
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* EVADIR Report Selector */}
            <div className="flex items-center gap-2 bg-slate-950/80 p-1.5 rounded-2xl border border-slate-800">
              <span className="text-[11px] text-slate-400 font-semibold pl-2">Laporan:</span>
              <select
                value={selectedReportId}
                onChange={(e) => setSelectedReportId(e.target.value)}
                className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-xl px-3 py-1.5 outline-none font-medium"
              >
                {reportsList.length === 0 ? (
                  <option value="">Belum ada laporan</option>
                ) : (
                  reportsList.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.period_label} ({new Date(r.evaluation_date).toLocaleDateString('id-ID')})
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>
        </div>
      </div>

      {!dashboardData ? (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center space-y-3 shadow-xl">
          <Compass className="w-12 h-12 text-slate-600 mx-auto" />
          <h4 className="text-sm font-bold text-white">Belum Ada Data Evaluasi Diri (EVADIR)</h4>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Silakan buat dan isi laporan evaluasi diri di menu <strong>Evaluasi Diri (EVADIR)</strong> terlebih dahulu untuk melihat dashboard scorecard ini.
          </p>
        </div>
      ) : (
        <>
          {/* 2. RADAR SPIDER CHART & EXECUTIVE SUMMARY */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            {/* Radar Spider Chart (5 cols) */}
            <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-400" />
                  Radar Keseimbangan 4 Perspektif
                </h3>
                <span className="text-[10px] text-slate-400 font-semibold">Capaian vs Target RIPS</span>
              </div>

              {/* Native SVG Radar Spider Chart */}
              <div className="w-full h-72 flex items-center justify-center relative">
                {(() => {
                  const size = 260;
                  const center = size / 2;
                  const radius = 90;
                  const angles = [ -Math.PI / 2, 0, Math.PI / 2, Math.PI ]; // 4 axes (Top, Right, Bottom, Left)
                  const labels = ['Finansial', 'Pelanggan & Stakeholder', 'Proses Bisnis Internal', 'Pembelajaran & Pertumbuhan'];

                  const getCoordinates = (valuePercent, angle) => {
                    const r = (Math.min(Math.max(valuePercent, 0), 100) / 100) * radius;
                    return {
                      x: center + r * Math.cos(angle),
                      y: center + r * Math.sin(angle),
                    };
                  };

                  // Build Points for Capaian & Target
                  const capaianPoints = (dashboardData.aspects || []).map((asp, idx) => {
                    const angle = angles[idx % 4];
                    return getCoordinates(asp.avg_achieved_percent || 0, angle);
                  });

                  const targetPoints = (dashboardData.aspects || []).map((asp, idx) => {
                    const angle = angles[idx % 4];
                    return getCoordinates(asp.avg_target_percent || 100, angle);
                  });

                  const capaianPath = capaianPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z';
                  const targetPath = targetPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z';

                  return (
                    <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full max-w-[280px]">
                      {/* Grid concentric rings */}
                      {[25, 50, 75, 100].map((ring) => {
                        const ringR = (ring / 100) * radius;
                        return (
                          <polygon
                            key={ring}
                            points={angles.map((a) => `${center + ringR * Math.cos(a)},${center + ringR * Math.sin(a)}`).join(' ')}
                            fill="none"
                            stroke="#334155"
                            strokeWidth="1"
                            strokeDasharray={ring === 100 ? 'none' : '2,2'}
                          />
                        );
                      })}

                      {/* Axes lines */}
                      {angles.map((a, i) => (
                        <line
                          key={i}
                          x1={center}
                          y1={center}
                          x2={center + radius * Math.cos(a)}
                          y2={center + radius * Math.sin(a)}
                          stroke="#475569"
                          strokeWidth="1"
                        />
                      ))}

                      {/* Target Polygon */}
                      <path d={targetPath} fill="#10B981" fillOpacity="0.15" stroke="#10B981" strokeWidth="1.5" strokeDasharray="3,3" />

                      {/* Capaian Polygon */}
                      <path d={capaianPath} fill="#6366F1" fillOpacity="0.45" stroke="#6366F1" strokeWidth="2.5" />

                      {/* Data Dots */}
                      {capaianPoints.map((p, i) => (
                        <circle key={i} cx={p.x} cy={p.y} r="4" fill="#818CF8" stroke="#312E81" strokeWidth="1.5" />
                      ))}

                      {/* Axis Labels */}
                      <text x={center} y={center - radius - 10} textAnchor="middle" fill="#CBD5E1" fontSize="9" fontWeight="bold">
                        Finansial
                      </text>
                      <text x={center + radius + 12} y={center + 3} textAnchor="start" fill="#CBD5E1" fontSize="8" fontWeight="bold">
                        Stakeholder
                      </text>
                      <text x={center} y={center + radius + 16} textAnchor="middle" fill="#CBD5E1" fontSize="8" fontWeight="bold">
                        Proses Internal
                      </text>
                      <text x={center - radius - 12} y={center + 3} textAnchor="end" fill="#CBD5E1" fontSize="8" fontWeight="bold">
                        Pembelajaran
                      </text>
                    </svg>
                  );
                })()}
              </div>

              {/* Chart Legend */}
              <div className="flex items-center justify-center gap-4 pt-2 border-t border-slate-800 text-[11px]">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-indigo-500 inline-block shadow-xs" />
                  <span className="text-slate-300 font-semibold">Capaian Nyata (%)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-1 border-b-2 border-emerald-400 border-dashed inline-block" />
                  <span className="text-slate-300 font-semibold">Target RIPS (%)</span>
                </div>
              </div>
            </div>

            {/* 4 Aspect Cards Grid (7 cols) */}
            <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {dashboardData.aspects.map((asp) => (
                <div
                  key={asp.aspect_id}
                  onClick={() => setSelectedAspectFilter(selectedAspectFilter === asp.aspect_name ? 'all' : asp.aspect_name)}
                  className={`p-5 rounded-3xl border transition cursor-pointer space-y-3 ${
                    selectedAspectFilter === asp.aspect_name
                      ? 'bg-indigo-600/10 border-indigo-500 ring-1 ring-indigo-500 shadow-lg'
                      : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">{asp.aspect_name}</span>
                    <span className="text-xs font-bold text-indigo-400">{asp.avg_achieved_percent}%</span>
                  </div>

                  <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                    <div
                      className="bg-gradient-to-r from-indigo-500 to-emerald-400 h-full rounded-full"
                      style={{ width: `${Math.min(asp.avg_achieved_percent, 100)}%` }}
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-1 text-center">
                    <div className="p-2 rounded-xl bg-slate-950 border border-slate-800">
                      <span className="text-[10px] text-emerald-400 block font-bold">Tercapai</span>
                      <span className="text-xs font-bold text-white">{asp.stats.tercapai}</span>
                    </div>
                    <div className="p-2 rounded-xl bg-slate-950 border border-slate-800">
                      <span className="text-[10px] text-amber-400 block font-bold">On Track</span>
                      <span className="text-xs font-bold text-white">{asp.stats.on_track}</span>
                    </div>
                    <div className="p-2 rounded-xl bg-slate-950 border border-slate-800">
                      <span className="text-[10px] text-rose-400 block font-bold">Tertinggal</span>
                      <span className="text-xs font-bold text-white">{asp.stats.tertinggal}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 3. MULTI-LINE HISTORICAL TRENDS */}
          {trendData?.series?.length > 0 && (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <LineChartIcon className="w-4 h-4 text-emerald-400" />
                  Tren Historis Kinerja BSC Per Aspek (Laporan Diterbitkan)
                </h3>
                <span className="text-[10px] text-slate-400">{trendData.series.length} Titik Evaluasi</span>
              </div>

              <div className="w-full overflow-x-auto py-2">
                <div className="min-w-[500px] h-60 flex flex-col justify-between">
                  <div className="flex-1 relative flex items-end border-b border-l border-slate-700 pb-2 pl-2">
                    {/* Grid lines */}
                    <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-20">
                      <div className="border-b border-slate-500 w-full" />
                      <div className="border-b border-slate-500 w-full" />
                      <div className="border-b border-slate-500 w-full" />
                      <div className="border-b border-slate-500 w-full" />
                    </div>

                    {/* Bars / Points group */}
                    <div className="w-full flex items-end justify-around h-full z-10">
                      {trendData.series.map((s, idx) => (
                        <div key={idx} className="flex flex-col items-center gap-1 group relative">
                          <div className="flex items-end gap-1.5 h-44">
                            {trendData.aspects.map((aspName) => {
                              const val = s[aspName] || 0;
                              const heightPct = Math.min(Math.max(val, 5), 100);
                              return (
                                <div
                                  key={aspName}
                                  title={`${aspName}: ${val}%`}
                                  style={{
                                    height: `${heightPct}%`,
                                    backgroundColor: aspectColors[aspName] || '#6366F1'
                                  }}
                                  className="w-3 sm:w-4 rounded-t-md transition-all hover:opacity-80 shadow-xs"
                                />
                              );
                            })}
                          </div>
                          <span className="text-[10px] text-slate-400 font-medium whitespace-nowrap mt-1">
                            {s.period_label}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Trend Legend */}
                  <div className="flex flex-wrap items-center justify-center gap-4 pt-3 text-[11px]">
                    {trendData.aspects.map((aspName) => (
                      <div key={aspName} className="flex items-center gap-1.5">
                        <span
                          className="w-3 h-3 rounded-md inline-block shadow-2xs"
                          style={{ backgroundColor: aspectColors[aspName] || '#6366F1' }}
                        />
                        <span className="text-slate-300 font-semibold">{aspName}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 4. DETAIL SASARAN STRATEGIS TABLE */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Target className="w-5 h-5 text-indigo-400" />
                  Rincian Capaian Sasaran BSC ({filteredGoals.length} Sasaran)
                </h3>
                <p className="text-xs text-slate-400">
                  {selectedAspectFilter === 'all'
                    ? 'Menampilkan seluruh sasaran dari 4 perspektif'
                    : `Menampilkan sasaran khusus aspek ${selectedAspectFilter}`}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={selectedAspectFilter}
                  onChange={(e) => setSelectedAspectFilter(e.target.value)}
                  className="bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-xl px-3 py-1.5 outline-none font-medium"
                >
                  <option value="all">Semua Aspek BSC</option>
                  {dashboardData.aspects.map((a) => (
                    <option key={a.aspect_id} value={a.aspect_name}>
                      {a.aspect_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950/60 text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-800">
                  <tr>
                    <th className="p-3">Kode & Sasaran</th>
                    <th className="p-3">Aspek BSC</th>
                    <th className="p-3 text-center">Baseline</th>
                    <th className="p-3 text-center">Capaian</th>
                    <th className="p-3 text-center">Target</th>
                    <th className="p-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredGoals.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-500">
                        Tidak ada sasaran dalam filter ini.
                      </td>
                    </tr>
                  ) : (
                    filteredGoals.map((g) => {
                      let statusBadge = (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-400">
                          Belum Dinilai
                        </span>
                      );
                      if (g.bsc_status === 'tercapai') {
                        statusBadge = (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                            Tercapai
                          </span>
                        );
                      } else if (g.bsc_status === 'on_track') {
                        statusBadge = (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            On Track
                          </span>
                        );
                      } else if (g.bsc_status === 'tertinggal') {
                        statusBadge = (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                            Tertinggal
                          </span>
                        );
                      }

                      return (
                        <tr key={g.goal_id} className="hover:bg-slate-800/30 transition">
                          <td className="p-3 max-w-xs">
                            <span className="font-mono text-indigo-400 font-bold block">{g.goal_code}</span>
                            <span className="font-semibold text-white block">{g.goal_title}</span>
                            <span className="text-[11px] text-slate-400 mt-0.5 block">{g.domain_name}</span>
                          </td>
                          <td className="p-3 whitespace-nowrap font-medium text-slate-300">
                            {g.bsc_aspect_name}
                          </td>
                          <td className="p-3 text-center text-slate-400 font-bold">{g.baseline_percent}%</td>
                          <td className="p-3 text-center font-bold text-indigo-400">{g.achieved_percent !== null ? `${g.achieved_percent}%` : '-'}</td>
                          <td className="p-3 text-center font-bold text-emerald-400">{g.target_percent}%</td>
                          <td className="p-3 text-center whitespace-nowrap">{statusBadge}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
