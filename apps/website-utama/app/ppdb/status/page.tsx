'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Search,
  CheckCircle2,
  Clock,
  XCircle,
  FileText,
  Calendar,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  Building
} from 'lucide-react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000/api/v1/website-utama';

function StatusTracker() {
  const searchParams = useSearchParams();
  const initialId = searchParams.get('id') || '';
  const [trackingId, setTrackingId] = useState(initialId);
  const [registrant, setRegistrant] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (initialId) {
      handleSearch(initialId);
    }
  }, [initialId]);

  const handleSearch = async (idToSearch: string) => {
    if (!idToSearch.trim()) return;
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch(`${API_BASE_URL}/public/ppdb/registrants/${idToSearch}/status`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Nomor registrasi pendaftar tidak ditemukan');
      setRegistrant(json.data);
    } catch (err: any) {
      setErrorMsg(err.message || 'Nomor pendaftar tidak ditemukan');
      setRegistrant(null);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'accepted':
        return {
          bg: 'bg-emerald-100 text-emerald-800 border-emerald-300',
          icon: CheckCircle2,
          text: 'Diterima (Lulus Seleksi)'
        };
      case 'rejected':
        return {
          bg: 'bg-rose-100 text-rose-800 border-rose-300',
          icon: XCircle,
          text: 'Belum Diterima'
        };
      case 'verifying':
        return {
          bg: 'bg-blue-100 text-blue-800 border-blue-300',
          icon: Clock,
          text: 'Tahap Verifikasi Berkas & Tes'
        };
      case 'submitted':
        return {
          bg: 'bg-amber-100 text-amber-800 border-amber-300',
          icon: Clock,
          text: 'Formulir Terkirim (Menunggu Review)'
        };
      default:
        return {
          bg: 'bg-slate-100 text-slate-700 border-slate-300',
          icon: Clock,
          text: 'Draft Formulir'
        };
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-6 py-12 space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider bg-emerald-50 px-3 py-1 rounded-full">
          Layanan Mandiri Calon Santri
        </span>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
          Pelacakan Status PPDB Online
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
          Masukkan nomor registrasi pendaftaran untuk melihat status berkas, hasil verifikasi, dan jadwal seleksi.
        </p>
      </div>

      {/* Search Input Box */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSearch(trackingId);
        }}
        className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3"
      >
        <div className="relative flex-1">
          <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
          <input
            type="number"
            value={trackingId}
            onChange={(e) => setTrackingId(e.target.value)}
            placeholder="Masukkan Nomor Registrasi (Contoh: 1)"
            className="w-full pl-11 pr-4 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            required
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm px-6 py-2.5 rounded-xl shadow-md transition-all shrink-0"
        >
          {loading ? 'Mencari...' : 'Cari Data'}
        </button>
      </form>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Result Card */}
      {registrant && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-lg overflow-hidden space-y-6">
          {/* Status Header */}
          <div className="bg-gradient-to-r from-slate-900 to-emerald-950 p-6 text-white flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs text-emerald-400 font-semibold uppercase tracking-wider">
                Nomor Registrasi: #{registrant.id}
              </p>
              <h2 className="text-xl font-bold mt-1">{registrant.candidate_full_name}</h2>
              <p className="text-xs text-slate-300 mt-1">
                Jalur: <span className="font-semibold capitalize text-emerald-300">{registrant.registration_path}</span> • Tahun: {registrant.school_year}
              </p>
            </div>
            {(() => {
              const badge = getStatusBadge(registrant.status);
              return (
                <div className={`px-4 py-2 rounded-xl text-xs font-bold border flex items-center space-x-2 ${badge.bg}`}>
                  <badge.icon className="w-4 h-4" />
                  <span>{badge.text}</span>
                </div>
              );
            })()}
          </div>

          <div className="p-6 sm:p-8 space-y-6">
            {/* Informasi Siswa & Kontak */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div>
                <p className="text-slate-400 font-medium">Tempat, Tanggal Lahir</p>
                <p className="font-semibold text-slate-800 mt-0.5">
                  {registrant.candidate_birth_place || '-'}, {registrant.candidate_birth_date || '-'}
                </p>
              </div>
              <div>
                <p className="text-slate-400 font-medium">Jenis Kelamin</p>
                <p className="font-semibold text-slate-800 mt-0.5">
                  {registrant.candidate_gender === 'L' ? 'Laki-laki' : 'Perempuan'}
                </p>
              </div>
              <div>
                <p className="text-slate-400 font-medium">Nama Orang Tua</p>
                <p className="font-semibold text-slate-800 mt-0.5">
                  Ayah: {registrant.father_name || '-'} / Ibu: {registrant.mother_name || '-'}
                </p>
              </div>
              <div>
                <p className="text-slate-400 font-medium">Nomor WhatsApp Terdaftar</p>
                <p className="font-semibold text-slate-800 mt-0.5">{registrant.parent_contact || '-'}</p>
              </div>
            </div>

            {/* Riwayat Tahapan Status / Logs */}
            <div>
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-4 flex items-center space-x-2">
                <Clock className="w-4 h-4 text-emerald-600" />
                <span>Riwayat Tahapan Proses Seleksi</span>
              </h3>

              <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                {registrant.status_logs?.map((log: any, idx: number) => (
                  <div key={idx} className="relative">
                    <div className="absolute -left-[27px] top-1 w-3 h-3 rounded-full bg-emerald-500 ring-4 ring-emerald-50" />
                    <div className="bg-white p-3.5 rounded-xl border border-slate-200 text-xs shadow-sm">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-slate-900 uppercase tracking-wide">{log.status}</span>
                        <span className="text-[10px] text-slate-400">
                          {new Date(log.occurred_at).toLocaleString('id-ID')}
                        </span>
                      </div>
                      <p className="text-slate-600">{log.note || 'Status diperbarui oleh panitia PPDB'}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Catatan / Instruksi Lanjutan */}
            {registrant.status === 'accepted' && (
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs space-y-2">
                <p className="font-bold text-sm">🎉 Selamat! Calon Siswa Dinyatakan Diterima</p>
                <p>Silakan mengunduh surat kelulusan dan melanjutkan proses daftar ulang melalui sekretariat PPDB atau hubungi hotline kami.</p>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="text-center pt-4">
        <Link href="/ppdb" className="text-xs font-bold text-emerald-600 hover:text-emerald-700 inline-flex items-center space-x-1">
          <span>Formulir Pendaftaran Baru</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}

export default function StatusPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-xs text-slate-400">Memuat status pendaftaran...</div>}>
      <StatusTracker />
    </Suspense>
  );
}
