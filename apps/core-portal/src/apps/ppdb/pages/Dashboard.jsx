import React, { useState, useEffect, useMemo } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import api from '../../../shared/services/api';
import { useAuth } from '../../../shared/store/AuthContext';
import StatRibbonCard from '../../../shared/components/StatRibbonCard';
import StatusPill from '../../../shared/components/StatusPill';
import LoadingSkeleton from '../../../shared/components/LoadingSkeleton';
import EmptyState from '../../../shared/components/EmptyState';
import {
  Users2,
  Wallet,
  CheckCircle2,
  FileCheck2,
  UserX,
  ArrowRight,
  TrendingUp,
  Sparkles,
  Calendar,
  CalendarDays,
  Layers,
  GraduationCap,
  AlertCircle
} from 'lucide-react';
import AcademicYearSelector from '../components/AcademicYearSelector';

export default function Dashboard() {
  const { activeSchoolUnit } = useAuth();
  const outletContext = useOutletContext() || {};
  const selectedAcademicYear = outletContext.selectedAcademicYear || localStorage.getItem('aldepos_ppdb_selected_academic_year') || '2026/2027';
  const setSelectedAcademicYear = outletContext.setSelectedAcademicYear;
  const academicYears = outletContext.academicYears || [];

  const [loading, setLoading] = useState(true);
  const [programs, setPrograms] = useState([]);
  const [activeProgram, setActiveProgram] = useState(null);
  const [registrants, setRegistrants] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [announcements, setAnnouncements] = useState({ stats: {}, candidates: [] });

  const loadData = async () => {
    try {
      setLoading(true);
      const [progsRes, regRes, withRes, annRes] = await Promise.all([
        api.get('/psb/programs', {
          params: { target_academic_year: selectedAcademicYear !== 'all' ? selectedAcademicYear : undefined }
        }),
        api.get('/psb/registrants', {
          params: { target_academic_year: selectedAcademicYear !== 'all' ? selectedAcademicYear : undefined }
        }),
        api.get('/psb/withdrawals'),
        api.get('/psb/announcements')
      ]);

      const progs = progsRes.data?.data || [];
      setPrograms(progs);
      const actProg = progs.find(p => p.status === 'open' || p.status === 'active') || progs[0] || null;
      setActiveProgram(actProg);

      const rawReg = regRes.data?.data;
      const regList = Array.isArray(rawReg)
        ? rawReg
        : (Array.isArray(rawReg?.items) ? rawReg.items : []);
      setRegistrants(regList);

      const rawWith = withRes.data?.data;
      const withList = Array.isArray(rawWith)
        ? rawWith
        : (Array.isArray(rawWith?.withdrawals) ? rawWith.withdrawals : (Array.isArray(rawWith?.items) ? rawWith.items : []));
      setWithdrawals(withList);

      setAnnouncements(annRes.data?.data || { stats: {}, candidates: [] });
    } catch (err) {
      console.error('Gagal memuat dashboard PSB:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeSchoolUnit, selectedAcademicYear]);

  // Aggregate metrics (safe array fallback)
  const safeRegistrants = Array.isArray(registrants) ? registrants : [];
  const safeWithdrawals = Array.isArray(withdrawals) ? withdrawals : [];

  const totalRegistrants = safeRegistrants.length;
  const verifiedDocs = safeRegistrants.filter(r => ['document_verified', 'tested', 'accepted', 'enrolled', 'placed'].includes(r.status)).length;
  const passedSelection = safeRegistrants.filter(r => ['accepted', 'enrolled', 'placed'].includes(r.status) || r.selection_decision === 'accepted').length;
  const placedStudents = safeRegistrants.filter(r => r.status === 'placed' || r.placed_student_id).length;
  const totalWithdrawals = safeWithdrawals.length;

  // Total biaya pendaftaran terkumpul
  const regFeePaidCount = safeRegistrants.filter(r => r.status !== 'pending' && r.status !== 'registration_fee_pending').length;
  const estRegFeeTotal = regFeePaidCount * 350000;

  const rawYears = academicYears.length > 0
    ? academicYears
    : [
        { id: 1, name: '2026/2027', is_active: true },
        { id: 2, name: '2025/2026', is_active: false },
        { id: 3, name: '2024/2025', is_active: false }
      ];

  const displayYears = useMemo(() => {
    const map = new Map();
    rawYears.forEach(ay => {
      if (ay.name && !map.has(ay.name)) {
        map.set(ay.name, ay);
      }
    });
    return Array.from(map.values());
  }, [rawYears]);

  if (loading) {
    return (
      <div className="space-y-6">
        <LoadingSkeleton type="card" count={4} />
        <LoadingSkeleton type="table" rows={6} />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-emerald-700 via-teal-700 to-slate-800 rounded-2xl p-6 sm:p-8 text-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="relative z-10 max-w-xl">
          <div className="flex items-center gap-2 mb-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-xs text-xs font-semibold tracking-wide text-emerald-200 border border-white/10">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Penerimaan Santri Baru TA {selectedAcademicYear}</span>
            </div>
            {/* Dropdown Tahun Ajaran di Banner (Glassmorphism Modern) */}
            <AcademicYearSelector
              value={selectedAcademicYear}
              onChange={(ny) => {
                if (setSelectedAcademicYear) setSelectedAcademicYear(ny);
                localStorage.setItem('aldepos_ppdb_selected_academic_year', ny);
                window.dispatchEvent(new CustomEvent('aldepos_ppdb_academic_year_changed', { detail: ny }));
              }}
              years={displayYears}
              variant="banner"
              dropdownAlign="left"
            />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Dashboard Penerimaan Santri Baru
          </h1>
          <p className="text-sm text-emerald-100/90 mt-2 leading-relaxed">
            Pantau seluruh alur penerimaan mulai dari formulir pendaftaran, pembayaran kasir, tes seleksi, uang pangkal, hingga penempatan rombel kelas.
          </p>
        </div>

        <div className="relative z-10 flex flex-wrap items-center gap-3">
          <Link
            to="/ppdb/registrants"
            className="px-4 py-2.5 rounded-xl bg-white text-emerald-800 font-semibold text-xs hover:bg-emerald-50 transition-colors shadow-xs flex items-center gap-2"
          >
            <span>Daftar Calon Santri</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            to="/ppdb/programs"
            className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium text-xs border border-white/20 transition-colors backdrop-blur-xs flex items-center gap-2"
          >
            <Calendar className="w-4 h-4" />
            <span>Atur Gelombang</span>
          </Link>
        </div>

        {/* Decorative background element */}
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-8 w-64 h-64 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none"></div>
      </div>

      {/* Primary KPI Stats Ribbon */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatRibbonCard
          label="Total Pendaftar"
          value={totalRegistrants}
          subtext="Calon santri terdaftar"
          icon={Users2}
          color="indigo"
        />
        <StatRibbonCard
          label="Biaya Formulir"
          value={`Rp ${(estRegFeeTotal / 1000000).toFixed(1)} Jt`}
          subtext={`${regFeePaidCount} lunas terbayar`}
          icon={Wallet}
          color="emerald"
        />
        <StatRibbonCard
          label="Berkas Terverifikasi"
          value={verifiedDocs}
          subtext="Dokumen tervalidasi"
          icon={CheckCircle2}
          color="cyan"
        />
        <StatRibbonCard
          label="Lulus Seleksi"
          value={passedSelection}
          subtext="Status accepted"
          icon={FileCheck2}
          color="amber"
        />
        <StatRibbonCard
          label="Ditempatkan"
          value={placedStudents}
          subtext="Resmi masuk rombel"
          icon={GraduationCap}
          color="teal"
        />
        <StatRibbonCard
          label="Mundur / Refund"
          value={totalWithdrawals}
          subtext={`${withdrawals.filter(w => w.status === 'processed').length} refund cair`}
          icon={UserX}
          color="rose"
        />
      </div>

      {/* Funnel 7 Tahapan PSB */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-base font-bold text-slate-800">Funnel Pipeline Tahapan PSB</h2>
            <p className="text-xs text-slate-500 mt-0.5">Konversi calon santri dari formulir hingga penempatan definitif ke rombel kelas</p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">
            {totalRegistrants} Total Masuk
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          {[
            { step: '1. Formulir', count: totalRegistrants, color: 'bg-indigo-500', pct: 100 },
            { step: '2. Bayar Pendaftaran', count: regFeePaidCount, color: 'bg-emerald-500', pct: totalRegistrants ? Math.round((regFeePaidCount / totalRegistrants) * 100) : 0 },
            { step: '3. Berkas Valid', count: verifiedDocs, color: 'bg-cyan-500', pct: totalRegistrants ? Math.round((verifiedDocs / totalRegistrants) * 100) : 0 },
            { step: '4. Lulus Seleksi', count: passedSelection, color: 'bg-amber-500', pct: totalRegistrants ? Math.round((passedSelection / totalRegistrants) * 100) : 0 },
            { step: '5. Uang Pangkal', count: registrants.filter(r => ['enrolled', 'placed'].includes(r.status)).length, color: 'bg-teal-500', pct: totalRegistrants ? Math.round((registrants.filter(r => ['enrolled', 'placed'].includes(r.status)).length / totalRegistrants) * 100) : 0 },
            { step: '6. Masuk Rombel', count: placedStudents, color: 'bg-blue-600', pct: totalRegistrants ? Math.round((placedStudents / totalRegistrants) * 100) : 0 },
          ].map((item, i) => (
            <div key={i} className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex flex-col justify-between">
              <div>
                <span className="text-[11px] font-semibold text-slate-500">{item.step}</span>
                <div className="text-xl font-extrabold text-slate-800 mt-1">{item.count}</div>
              </div>
              <div className="mt-3">
                <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                  <div className={`h-full ${item.color} rounded-full transition-all`} style={{ width: `${item.pct}%` }}></div>
                </div>
                <div className="text-[10px] text-right font-medium text-slate-400 mt-1">{item.pct}%</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Two Column Section: Kuota Rombel & Recent Registrants */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Kuota Rombel L/P */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-800">Kuota Rombel Satuan Pendidikan</h2>
              <p className="text-xs text-slate-500 mt-0.5">{activeSchoolUnit?.name || 'Seluruh Satuan'}</p>
            </div>
            <Link to="/ppdb/programs" className="text-xs font-semibold text-emerald-600 hover:text-emerald-700">
              Kelola Kuota
            </Link>
          </div>

          <div className="flex-1 space-y-4">
            {activeProgram?.class_quotas && activeProgram.class_quotas.length > 0 ? (
              activeProgram.class_quotas.map(cq => {
                const total = cq.total_quota || 30;
                const maleQ = cq.quota_male || 15;
                const femaleQ = cq.quota_female || 15;
                return (
                  <div key={cq.id} className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800">{cq.class_group_name || 'Rombel'}</span>
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                        Total Kuota: {total}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="p-2.5 rounded-lg bg-blue-50/70 border border-blue-100">
                        <span className="text-[10px] font-semibold text-blue-600 uppercase">Kuota Santri Putra (L)</span>
                        <div className="text-sm font-bold text-blue-900 mt-0.5">{maleQ} Santri</div>
                      </div>
                      <div className="p-2.5 rounded-lg bg-pink-50/70 border border-pink-100">
                        <span className="text-[10px] font-semibold text-pink-600 uppercase">Kuota Santri Putri (P)</span>
                        <div className="text-sm font-bold text-pink-900 mt-0.5">{femaleQ} Santri</div>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-8 text-center text-xs text-slate-400">
                <Layers className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <span>Belum ada kuota rombel yang dikonfigurasi untuk program ini.</span>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Pendaftar Terbaru */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-800">Pendaftar Terbaru</h2>
              <p className="text-xs text-slate-500 mt-0.5">Calon santri yang baru masuk formulir pendaftaran</p>
            </div>
            <Link to="/ppdb/registrants" className="text-xs font-semibold text-emerald-600 hover:text-emerald-700">
              Lihat Semua
            </Link>
          </div>

          <div className="flex-1 overflow-x-auto">
            {registrants.length > 0 ? (
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 text-[11px] font-semibold uppercase tracking-wider">
                    <th className="pb-2.5">No. Registrasi</th>
                    <th className="pb-2.5">Nama Santri</th>
                    <th className="pb-2.5">L/P</th>
                    <th className="pb-2.5">Asal Sekolah</th>
                    <th className="pb-2.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {registrants.slice(0, 6).map(r => (
                    <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 font-mono text-emerald-700 font-semibold">{r.registration_number}</td>
                      <td className="py-2.5 font-medium text-slate-800">{r.full_name}</td>
                      <td className="py-2.5">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${r.gender === 'L' ? 'bg-blue-100 text-blue-700' : 'bg-pink-100 text-pink-700'}`}>
                          {r.gender}
                        </span>
                      </td>
                      <td className="py-2.5 text-slate-500 truncate max-w-[140px]">{r.previous_school_name || '-'}</td>
                      <td className="py-2.5">
                        <StatusPill status={r.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <EmptyState title="Belum Ada Pendaftar" description="Belum ada data pendaftar baru pada program ini." />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
