import React from 'react';
import { useOutletContext, Link, useNavigate } from 'react-router-dom';
import StatRibbonCard from '../../../shared/components/StatRibbonCard';
import StatusPill from '../../../shared/components/StatusPill';
import FlatAlertBanner from '../../../shared/components/FlatAlertBanner';
import {
  CheckCircle2,
  Clock,
  FileText,
  UploadCloud,
  FileCheck2,
  Building2,
  CalendarDays,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  Sparkles,
  Info,
  Layers,
  Award,
  BookOpen
} from 'lucide-react';

export default function CalonMuridDashboard() {
  const { profile } = useOutletContext();
  const navigate = useNavigate();

  const reg = profile?.registrant;
  const docs = profile?.documents || [];
  const tests = profile?.test_sessions || [];

  const getStatusContent = (status) => {
    switch (status) {
      case 'placed':
        return {
          title: 'Selamat! Anda Dinyatakan Diterima & Ditempatkan',
          badge: 'Diterima Definitif',
          badgeColor: 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 border-emerald-500/30',
          icon: CheckCircle2,
          iconColor: 'text-emerald-500',
          desc: `Selamat bergabung menjadi bagian dari santri/siswa aktif Aldepos Islamic Boarding School. Anda telah resmi ditempatkan di rombel ${reg?.placed_class_group_name || 'Kelas Tujuan'} dengan NIPD: ${reg?.placed_nipd || '-'}.`,
          stepNumber: 5
        };
      case 'test_passed':
        return {
          title: 'Lulus Seleksi Masuk',
          badge: 'Lulus Ambang Batas',
          badgeColor: 'bg-teal-500/20 text-teal-600 dark:text-teal-300 border-teal-500/30',
          icon: Award,
          iconColor: 'text-teal-500',
          desc: 'Hasil tes seleksi Anda telah memenuhi passing grade. Saat ini panitia sedang melakukan finalisasi penempatan rombel kelas dan penetapan administrasi masuk.',
          stepNumber: 4
        };
      case 'testing':
        return {
          title: 'Tahap Ujian Seleksi Masuk',
          badge: 'Sesi Ujian Aktif',
          badgeColor: 'bg-blue-500/20 text-blue-600 dark:text-blue-300 border-blue-500/30',
          icon: Clock,
          iconColor: 'text-blue-500',
          desc: 'Anda memiliki penugasan tes potensi akademik / seleksi santri yang siap dikerjakan. Silakan masuk ke menu Tes Seleksi untuk memulai ujian.',
          stepNumber: 3
        };
      case 'test_failed':
        return {
          title: 'Hasil Tes Belum Memenuhi Ambang Batas',
          badge: 'Belum Lulus Tes',
          badgeColor: 'bg-amber-500/20 text-amber-600 dark:text-amber-300 border-amber-500/30',
          icon: AlertCircle,
          iconColor: 'text-amber-500',
          desc: 'Nilai ujian Anda saat ini belum memenuhi passing grade. Silakan hubungi panitia PPDB untuk opsi pengayaan materi atau jadwal seleksi gelombang berikutnya.',
          stepNumber: 3
        };
      case 'rejected':
        return {
          title: 'Pendaftaran Belum Diterima',
          badge: 'Tidak Lolos',
          badgeColor: 'bg-rose-500/20 text-rose-600 dark:text-rose-300 border-rose-500/30',
          icon: AlertCircle,
          iconColor: 'text-rose-500',
          desc: 'Mohon maaf, pendaftaran Anda belum dapat diterima pada periode ini karena keterbatasan kuota penerimaan santri.',
          stepNumber: 2
        };
      default:
        return {
          title: 'Formulir Pendaftaran Diterima',
          badge: 'Verifikasi Berkas',
          badgeColor: 'bg-indigo-500/20 text-indigo-600 dark:text-indigo-300 border-indigo-500/30',
          icon: Clock,
          iconColor: 'text-indigo-500',
          desc: 'Data pendaftaran awal Anda telah tersimpan. Silakan lengkapi formulir data murid dan unggah dokumen persyaratan di bawah ini.',
          stepNumber: 2
        };
    }
  };

  const statusInfo = getStatusContent(reg?.status);
  const StatusIcon = statusInfo.icon;

  const steps = [
    { num: 1, title: 'Registrasi Online', desc: 'Selesai didaftarkan' },
    { num: 2, title: 'Kelengkapan Berkas', desc: `${docs.length} dokumen diunggah` },
    { num: 3, title: 'Tes Seleksi Masuk', desc: `${tests.length} sesi tes terjadwal` },
    { num: 4, title: 'Penetapan Kelulusan', desc: 'Verifikasi hasil' },
    { num: 5, title: 'Penempatan Kelas', desc: 'Siswa aktif definitif' }
  ];

  return (
    <div className="space-y-6">
      
      {/* 1. HERO GREETING & REGISTRATION BADGE */}
      <div className="rounded-xl bg-gradient-to-r from-emerald-700 via-teal-700 to-emerald-900 text-white p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="relative z-10 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-extrabold uppercase tracking-wider bg-white/20 text-white px-3 py-1 rounded-full backdrop-blur-md">
              {reg?.psb_group_name || 'Jalur Reguler'}
            </span>
            <span className="text-[10px] font-bold text-emerald-200">
              Tahun Ajaran {reg?.target_academic_year || '2026/2027'}
            </span>
          </div>

          <h1 className="text-xl sm:text-2xl font-black tracking-tight">
            Ahlan wa Sahlan, {reg?.full_name || 'Calon Santri'}!
          </h1>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 text-xs">
            <div className="bg-white/10 rounded-xl p-3 backdrop-blur-xs">
              <span className="text-[10px] text-emerald-200 font-medium">Nomor Registrasi</span>
              <p className="font-mono font-extrabold text-white text-sm mt-0.5">{reg?.registration_number || '-'}</p>
            </div>
            <div className="bg-white/10 rounded-xl p-3 backdrop-blur-xs">
              <span className="text-[10px] text-emerald-200 font-medium">NISN Asal</span>
              <p className="font-mono font-extrabold text-white text-sm mt-0.5">{reg?.nisn || '-'}</p>
            </div>
            <div className="bg-white/10 rounded-xl p-3 backdrop-blur-xs">
              <span className="text-[10px] text-emerald-200 font-medium">Jenis Masuk</span>
              <p className="font-bold text-white capitalize mt-0.5">{reg?.entry_type || 'Reguler'}</p>
            </div>
            <div className="bg-white/10 rounded-xl p-3 backdrop-blur-xs">
              <span className="text-[10px] text-emerald-200 font-medium">Kelompok Biaya</span>
              <p className="font-bold text-emerald-300 truncate mt-0.5">{reg?.fee_group_name_snapshot || 'Standar Unit'}</p>
            </div>
          </div>
        </div>

        {/* Decorative background glow */}
        <div className="absolute right-0 top-0 w-80 h-80 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
      </div>

      {/* 2. CURRENT STATUS CARD */}
      <div className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 ${statusInfo.iconColor}`}>
              <StatusIcon className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[11px] font-semibold text-slate-400">Status Tahapan Pendaftaran:</span>
              <h2 className="text-base font-extrabold text-slate-900 dark:text-slate-100">{statusInfo.title}</h2>
            </div>
          </div>

          <span className={`self-start sm:self-center text-xs font-bold px-3 py-1 rounded-full border ${statusInfo.badgeColor}`}>
            {statusInfo.badge}
          </span>
        </div>

        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
          {statusInfo.desc}
        </p>

        {/* Timeline Progression Indicator */}
        <div className="pt-4 grid grid-cols-1 sm:grid-cols-5 gap-2">
          {steps.map((s) => {
            const isDone = s.num < statusInfo.stepNumber;
            const isCurrent = s.num === statusInfo.stepNumber;
            return (
              <div
                key={s.num}
                className={`p-3 rounded-xl border text-center flex flex-col items-center justify-center space-y-1 transition ${
                  isCurrent
                    ? 'border-emerald-600 bg-emerald-50/70 dark:bg-emerald-500/20 text-emerald-900 dark:text-emerald-200 font-bold shadow-2xs'
                    : isDone
                    ? 'border-emerald-200 dark:border-emerald-800/40 bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 text-slate-400'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <span className={`text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold ${
                    isDone || isCurrent ? 'bg-emerald-600 text-white' : 'bg-slate-300 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                  }`}>
                    {s.num}
                  </span>
                  <span className="text-xs truncate">{s.title}</span>
                </div>
                <span className="text-[10px] text-slate-400 truncate">{s.desc}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. QUICK ACTION CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* Card 1: Data Lengkap */}
        <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-4 hover:border-emerald-400 dark:hover:border-emerald-600 transition">
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
              <FileText className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Formulir Data Lengkap</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Lengkapi data biodata diri, alamat domisili detail, data orang tua & riwayat asal sekolah.
            </p>
          </div>
          <Link
            to="/calon-murid/data-lengkap"
            className="inline-flex items-center justify-between text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline pt-2"
          >
            <span>Isi & Perbarui Data</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Card 2: Dokumen */}
        <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-4 hover:border-emerald-400 dark:hover:border-emerald-600 transition">
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center font-bold">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Berkas Dokumen</h3>
              <span className="text-[10px] bg-teal-100 dark:bg-teal-500/20 text-teal-800 dark:text-teal-300 font-bold px-2 py-0.5 rounded-full">
                {docs.length} Diunggah
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Unggah scan Kartu Keluarga, Akta Kelahiran, Ijazah/Rapor, dan Pas Foto untuk verifikasi.
            </p>
          </div>
          <Link
            to="/calon-murid/dokumen"
            className="inline-flex items-center justify-between text-xs font-bold text-teal-600 dark:text-teal-400 hover:underline pt-2"
          >
            <span>Kelola Dokumen</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Card 3: Tes Seleksi */}
        <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-4 hover:border-emerald-400 dark:hover:border-emerald-600 transition">
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
              <FileCheck2 className="w-5 h-5" />
            </div>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Tes Seleksi Masuk</h3>
              <span className="text-[10px] bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 font-bold px-2 py-0.5 rounded-full">
                {tests.length} Jadwal
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Akses modul ujian online CBT, pantau jadwal pelaksanaan tes, dan lihat hasil passing grade.
            </p>
          </div>
          <Link
            to="/calon-murid/test"
            className="inline-flex items-center justify-between text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline pt-2"
          >
            <span>Buka Modul Tes</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* 4. ANNOUNCEMENT & CONTACT INFO */}
      <div className="p-6 bg-slate-900 text-white rounded-xl space-y-3 shadow-lg">
        <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-wider">
          <Info className="w-4 h-4" />
          <span>Pengumuman & Petunjuk Panitia PPDB</span>
        </div>
        <p className="text-xs text-slate-300 leading-relaxed">
          {reg?.psb_process_description || 'Pastikan data dan dokumen yang Anda kirimkan telah sesuai dengan dokumen asli akta kelahiran dan kartu keluarga. Verifikasi kelulusan seleksi dan penempatan rombel kelas akan diumumkan melalui portal ini dan konfirmasi kontak WhatsApp resmi yayasan.'}
        </p>
        <div className="pt-2 flex flex-wrap items-center gap-4 text-xs text-slate-400 border-t border-slate-800">
          <span>📞 Hotline PPDB: <strong className="text-white">0812-3456-7890</strong></span>
          <span>📍 Lokasi: <strong className="text-white">Kampus Aldepos Islamic Boarding School, Bogor</strong></span>
        </div>
      </div>
    </div>
  );
}
