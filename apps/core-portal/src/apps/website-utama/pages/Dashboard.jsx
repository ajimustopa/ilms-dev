import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import api from '../../../shared/services/api';
import {
  Users,
  UserPlus,
  Newspaper,
  MessageSquare,
  TrendingUp,
  CheckCircle2,
  Clock,
  ExternalLink,
  ShieldAlert
} from 'lucide-react';

export default function Dashboard() {
  const { schoolUnitId } = useOutletContext();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [latestRegistrants, setLatestRegistrants] = useState([]);
  const [latestTickets, setLatestTickets] = useState([]);

  useEffect(() => {
    fetchDashboardData();
  }, [schoolUnitId]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [statsRes, regRes, tickRes] = await Promise.all([
        api.get('/api/v1/website-utama/admin/ppdb/statistics', { headers: { 'X-School-Unit-Id': schoolUnitId } }),
        api.get('/api/v1/website-utama/admin/ppdb/registrants', { headers: { 'X-School-Unit-Id': schoolUnitId } }),
        api.get('/api/v1/website-utama/admin/consultation/tickets', { headers: { 'X-School-Unit-Id': schoolUnitId } })
      ]);

      setStats(statsRes.data?.data || {});
      setLatestRegistrants(regRes.data?.data?.slice(0, 5) || []);
      setLatestTickets(tickRes.data?.data?.slice(0, 5) || []);
    } catch (err) {
      console.error('Error fetching CMS dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10">
          <div className="inline-flex items-center space-x-2 bg-emerald-500/20 text-emerald-300 px-3 py-1 rounded-full text-xs font-semibold mb-3 border border-emerald-500/30">
            <span>Ringkasan Aktivitas Website Utama & PPDB Online</span>
          </div>
          <h1 className="text-2xl font-bold">Selamat Datang di Panel CMS</h1>
          <p className="text-sm text-slate-300 max-w-2xl mt-1">
            Kelola publikasi konten website resmi sekolah, moderasi artikel, pantau pendaftaran PPDB, serta tanggapi tiket konsultasi calon wali murid secara real-time.
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Pendaftar PPDB</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{loading ? '...' : stats?.total_pendaftar || 0}</p>
            <p className="text-[11px] text-emerald-600 font-medium flex items-center mt-1">
              <TrendingUp className="w-3 h-3 mr-1" />
              Tahun Ajaran 2027/2028
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <UserPlus className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Menunggu Verifikasi</p>
            <p className="text-2xl font-bold text-amber-600 mt-1">{loading ? '...' : stats?.total_menunggu_verifikasi || 0}</p>
            <p className="text-[11px] text-slate-500 font-medium flex items-center mt-1">
              <Clock className="w-3 h-3 mr-1" />
              Perlu ditinjau admin
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pendaftar Diterima</p>
            <p className="text-2xl font-bold text-emerald-600 mt-1">{loading ? '...' : stats?.total_diterima || 0}</p>
            <p className="text-[11px] text-emerald-600 font-medium flex items-center mt-1">
              <CheckCircle2 className="w-3 h-3 mr-1" />
              Lulus seleksi berkas/tes
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Tiket Konsultasi</p>
            <p className="text-2xl font-bold text-blue-600 mt-1">{loading ? '...' : latestTickets.length}</p>
            <p className="text-[11px] text-blue-600 font-medium flex items-center mt-1">
              <MessageSquare className="w-3 h-3 mr-1" />
              Pertanyaan publik
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <MessageSquare className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Grid Content: PPDB & Tiket Terbaru */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pendaftar Terbaru */}
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <h3 className="font-bold text-sm text-slate-800 flex items-center space-x-2">
              <UserPlus className="w-4 h-4 text-emerald-600" />
              <span>Pendaftar Calon Siswa Terbaru</span>
            </h3>
          </div>
          <div className="divide-y divide-slate-100">
            {latestRegistrants.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">Belum ada data pendaftar.</div>
            ) : (
              latestRegistrants.map((r) => (
                <div key={r.id} className="p-4 flex items-center justify-between hover:bg-slate-50/80 transition-colors">
                  <div>
                    <p className="text-xs font-bold text-slate-800">{r.candidate_full_name}</p>
                    <p className="text-[11px] text-slate-500">
                      Jalur: <span className="font-semibold text-slate-700 capitalize">{r.registration_path}</span> • Kontak: {r.parent_contact || '-'}
                    </p>
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      r.status === 'accepted'
                        ? 'bg-emerald-100 text-emerald-800'
                        : r.status === 'rejected'
                        ? 'bg-rose-100 text-rose-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {r.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Tiket Konsultasi Terbaru */}
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <h3 className="font-bold text-sm text-slate-800 flex items-center space-x-2">
              <MessageSquare className="w-4 h-4 text-blue-600" />
              <span>Tiket Konsultasi Calon Orang Tua</span>
            </h3>
          </div>
          <div className="divide-y divide-slate-100">
            {latestTickets.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">Belum ada tiket pertanyaan.</div>
            ) : (
              latestTickets.map((t) => (
                <div key={t.id} className="p-4 flex items-center justify-between hover:bg-slate-50/80 transition-colors">
                  <div>
                    <p className="text-xs font-bold text-slate-800">{t.subject}</p>
                    <p className="text-[11px] text-slate-500">
                      Dari: <span className="font-semibold text-slate-700">{t.name}</span> ({t.contact})
                    </p>
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      t.status === 'open' ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {t.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
