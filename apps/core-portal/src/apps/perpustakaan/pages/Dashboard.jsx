import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../../shared/services/api';
import {
  BookOpen,
  Repeat,
  BookmarkCheck,
  Users,
  Search,
  TrendingUp,
  ArrowUpRight
} from 'lucide-react';
import StatRibbonCard from '../../../shared/components/StatRibbonCard';
import StatusPill from '../../../shared/components/StatusPill';
import LoadingSkeleton from '../../../shared/components/LoadingSkeleton';
import ErrorState from '../../../shared/components/ErrorState';

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [utilData, setUtilData] = useState(null);
  const [popularBooks, setPopularBooks] = useState([]);
  const [activeLoans, setActiveLoans] = useState([]);
  const [waitingReservationsCount, setWaitingReservationsCount] = useState(0);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [resUtil, resPop, resLoans, resResv] = await Promise.allSettled([
        api.get('/api/v1/perpustakaan/reports/utilization'),
        api.get('/api/v1/perpustakaan/reports/popular-books?limit=5'),
        api.get('/api/v1/perpustakaan/loans?loan_status=borrowed&per_page=5'),
        api.get('/api/v1/perpustakaan/reservations?reservation_status=waiting'),
      ]);

      if (resUtil.status === 'fulfilled') {
        setUtilData(resUtil.value.data?.data || null);
      }
      if (resPop.status === 'fulfilled') {
        setPopularBooks(resPop.value.data?.data || []);
      }
      if (resLoans.status === 'fulfilled') {
        setActiveLoans(resLoans.value.data?.data?.items || []);
      }
      if (resResv.status === 'fulfilled') {
        setWaitingReservationsCount(resResv.value.data?.data?.pagination?.total || 0);
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Gagal memuat ringkasan dashboard');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 max-w-7xl mx-auto">
        <LoadingSkeleton type="card" rows={4} />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <LoadingSkeleton type="table" rows={5} columns={3} />
          <LoadingSkeleton type="table" rows={5} columns={3} />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto p-4 bg-white rounded-lg border border-slate-200/80">
        <ErrorState
          error={error}
          onRetry={fetchDashboardData}
          title="Gagal Memuat Dashboard Perpustakaan"
        />
      </div>
    );
  }

  const totalTitles = utilData?.koleksi_dan_anggota?.total_judul_buku || 0;
  const totalCopies = utilData?.koleksi_dan_anggota?.total_eksemplar_fisik || 0;
  const activeLoansCount = utilData?.sirkulasi?.buku_sedang_dipinjam_saat_ini || 0;
  const totalMembers = utilData?.koleksi_dan_anggota?.total_anggota_aktif || 0;
  const utilPct = utilData?.sirkulasi?.persentase_utilisasi_koleksi || 0;

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-lg border border-slate-200/80 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-slate-800 leading-snug">
              Dashboard Perpustakaan & E-Library
            </h1>
            <StatusPill variant="info">OPAC Terintegrasi</StatusPill>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Pusat katalog buku, sirkulasi peminjaman santri/pegawai, kontrol denda, dan reservasi online.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/perpustakaan/opac"
            className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold shadow-2xs transition flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
          >
            <Search className="w-3.5 h-3.5 text-slate-500" />
            <span>OPAC Publik</span>
          </Link>
          <Link
            to="/perpustakaan/books"
            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-2xs transition flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
          >
            <span>Katalog Buku</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Metric Cards Grid - StatRibbonCard Standard */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <StatRibbonCard
          label="Koleksi Buku"
          value={totalTitles}
          subtitle={`${totalCopies} eksemplar fisik`}
          icon={BookOpen}
          status="info"
          to="/perpustakaan/books"
        />

        <StatRibbonCard
          label="Pinjaman Aktif"
          value={activeLoansCount}
          subtitle={`${utilPct}% rasio utilisasi`}
          icon={Repeat}
          status="success"
          to="/perpustakaan/loans"
        />

        <StatRibbonCard
          label="Reservasi Antre"
          value={waitingReservationsCount}
          subtitle="Booking menunggu stok"
          icon={BookmarkCheck}
          status="warning"
          to="/perpustakaan/reservations"
        />

        <StatRibbonCard
          label="Anggota Aktif"
          value={totalMembers}
          subtitle="Siswa & pegawai terdaftar"
          icon={Users}
          status="neutral"
          to="/perpustakaan/members"
        />
      </div>

      {/* Two Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Active Loans List */}
        <div className="bg-white p-4 rounded-lg border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Repeat className="w-4 h-4 text-slate-500" />
              <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                Peminjaman Terkini
              </h2>
            </div>
            <Link
              to="/perpustakaan/loans"
              className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 transition"
            >
              Lihat Semua &rarr;
            </Link>
          </div>

          <div className="divide-y divide-slate-100">
            {activeLoans.length > 0 ? (
              activeLoans.map((loan) => (
                <div key={loan.id} className="py-2.5 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-semibold text-slate-800">{loan.book_title}</div>
                    <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                      <span className="font-medium text-slate-600">{loan.borrower_name}</span>
                      <span>•</span>
                      <span className="font-mono text-slate-500">{loan.copy_code}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <StatusPill variant="success">
                      {loan.loan_status}
                    </StatusPill>
                    <div className="text-[10px] text-slate-400 mt-1 font-mono tnum">
                      Tempo: {loan.due_at ? new Date(loan.due_at).toLocaleDateString('id-ID') : '-'}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-6 text-center text-xs text-slate-400">
                Tidak ada peminjaman aktif saat ini.
              </div>
            )}
          </div>
        </div>

        {/* Popular Books */}
        <div className="bg-white p-4 rounded-lg border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-slate-500" />
              <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                Buku Terpopuler
              </h2>
            </div>
            <span className="text-xs font-medium text-slate-400">
              Paling Banyak Dipinjam
            </span>
          </div>

          <div className="divide-y divide-slate-100">
            {popularBooks.length > 0 ? (
              popularBooks.map((b, idx) => (
                <div key={b.book_id || idx} className="py-2.5 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5">
                    <div className="w-5 h-5 rounded bg-slate-100 text-slate-600 font-bold text-[10px] flex items-center justify-center shrink-0">
                      {idx + 1}
                    </div>
                    <div>
                      <div className="font-semibold text-slate-800">{b.book_title}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {b.author || 'Anonim'} • {b.category || 'Umum'}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-slate-800 font-mono tnum">
                      {b.borrow_count}x
                    </span>
                    <div className="text-[10px] text-slate-400">dipinjam</div>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-6 text-center text-xs text-slate-400">
                Belum ada data sirkulasi buku.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
