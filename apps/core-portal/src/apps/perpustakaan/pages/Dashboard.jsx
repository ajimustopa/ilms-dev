import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../../shared/services/api';
import {
  Library,
  BookOpen,
  Repeat,
  BookmarkCheck,
  Users,
  Search,
  Sparkles,
  ArrowUpRight,
  Loader2,
  TrendingUp,
  AlertOctagon,
  Clock,
  CheckCircle2
} from 'lucide-react';

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
      <div className="h-full flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 text-teal-500 animate-spin" />
      </div>
    );
  }

  const totalTitles = utilData?.koleksi_dan_anggota?.total_judul_buku || 0;
  const totalCopies = utilData?.koleksi_dan_anggota?.total_eksemplar_fisik || 0;
  const activeLoansCount = utilData?.sirkulasi?.buku_sedang_dipinjam_saat_ini || 0;
  const totalMembers = utilData?.koleksi_dan_anggota?.total_anggota_aktif || 0;
  const utilPct = utilData?.sirkulasi?.persentase_utilisasi_koleksi || 0;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-teal-600 via-emerald-600 to-teal-800 p-6 text-white shadow-xl shadow-teal-950/10">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-xs font-semibold tracking-wide mb-2">
              <Sparkles className="w-3.5 h-3.5 text-teal-200" />
              <span>Digital Library & OPAC System</span>
            </div>
            <h1 className="text-2xl font-black tracking-tight sm:text-3xl">
              Dashboard Perpustakaan & E-Library
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-teal-100/90 max-w-xl">
              Pusat katalog buku, sirkulasi peminjaman santri/pegawai, kontrol denda keterlambatan, dan antrean reservasi online.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/perpustakaan/opac"
              className="px-4 py-2.5 rounded-xl bg-white text-teal-900 text-xs font-bold shadow-md hover:bg-teal-50 transition flex items-center gap-2"
            >
              <Search className="w-4 h-4" />
              <span>Buka OPAC Publik</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Koleksi Buku
            </div>
            <div className="text-2xl font-black text-slate-800">
              {totalTitles}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              {totalCopies} eksemplar fisik
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <Repeat className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Pinjaman Aktif
            </div>
            <div className="text-2xl font-black text-slate-800">
              {activeLoansCount}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              {utilPct}% rasio utilisasi
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <BookmarkCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Reservasi Antre
            </div>
            <div className="text-2xl font-black text-slate-800">
              {waitingReservationsCount}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              Booking menunggu stok
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Anggota Aktif
            </div>
            <div className="text-2xl font-black text-slate-800">
              {totalMembers}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              Siswa & pegawai terdaftar
            </div>
          </div>
        </div>
      </div>

      {/* Two Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Loans List */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Repeat className="w-4 h-4 text-teal-600" />
              <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Peminjaman Terkini
              </h2>
            </div>
            <Link
              to="/perpustakaan/loans"
              className="text-xs font-semibold text-teal-600 hover:text-teal-700 transition"
            >
              Lihat Semua &rarr;
            </Link>
          </div>

          <div className="divide-y divide-slate-100">
            {activeLoans.length > 0 ? (
              activeLoans.map((loan) => (
                <div key={loan.id} className="py-3 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-bold text-slate-800">{loan.book_title}</div>
                    <div className="text-[11px] text-slate-400 flex items-center gap-2">
                      <span className="font-medium text-slate-600">{loan.borrower_name}</span>
                      <span>•</span>
                      <span className="font-mono">{loan.copy_code}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-50 text-emerald-600 border border-emerald-200/60">
                      {loan.loan_status}
                    </span>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      Jatuh Tempo: {loan.due_at ? new Date(loan.due_at).toLocaleDateString('id-ID') : '-'}
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
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Buku Terpopuler
              </h2>
            </div>
            <span className="text-xs font-semibold text-slate-400">
              Paling Banyak Dipinjam
            </span>
          </div>

          <div className="divide-y divide-slate-100">
            {popularBooks.length > 0 ? (
              popularBooks.map((b, idx) => (
                <div key={b.book_id || idx} className="py-3 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-lg bg-slate-100 text-slate-600 font-bold text-[11px] flex items-center justify-center">
                      {idx + 1}
                    </div>
                    <div>
                      <div className="font-bold text-slate-800">{b.book_title}</div>
                      <div className="text-[11px] text-slate-400">
                        {b.author || 'Anonim'} • {b.category || 'Umum'}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-teal-700 font-mono">
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
