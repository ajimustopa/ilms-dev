import React from 'react';
import { NavLink, Link } from 'react-router-dom';
import { useTeacherAuth } from '../hooks/useTeacherAuth';
import {
  MapPin,
  ClipboardList,
  CalendarDays,
  BookOpen,
  UserCheck,
  Award,
  Users2,
  BellRing,
  Layers,
  ShieldAlert,
  HeartHandshake,
  User,
  ExternalLink,
  ChevronRight,
  GraduationCap
} from 'lucide-react';

export default function Lainnya() {
  const { teacherRoles, roleTitle } = useTeacherAuth();
  const { isHomeroom, isCounselor } = teacherRoles;

  const menuSections = [
    {
      title: 'Presensi & Kepegawaian',
      items: [
        {
          to: '/guru/absensi',
          label: 'Presensi Kehadiran Guru (F1)',
          description: 'Presensi GPS masuk/pulang & riwayat absensi bulanan',
          icon: MapPin,
          badge: 'GPS',
        },
        {
          to: '/guru/izin',
          label: 'Pengajuan Cuti & Izin (F2)',
          description: 'Sakit, keperluan dinas, dan lampiran surat dokter',
          icon: ClipboardList,
        },
      ],
    },
    {
      title: 'KBM & Kurikulum',
      items: [
        {
          to: '/guru/jadwal',
          label: 'Jadwal Mengajar (F3)',
          description: 'Roster mengajar dan agenda tatap muka mingguan',
          icon: CalendarDays,
        },
        {
          to: '/guru/perencanaan',
          label: 'Perencanaan Pembelajaran / TP (F4)',
          description: 'Tujuan Pembelajaran, lingkup materi & silabus ajar',
          icon: BookOpen,
        },
        {
          to: '/guru/jurnal-mengajar',
          label: 'Jurnal Mengajar Harian (F6)',
          description: 'Catatan materi pembahasan dan progres tatap muka KBM',
          icon: Layers,
        },
      ],
    },
    {
      title: 'Kelas & Santri',
      items: [
        {
          to: '/guru/presensi-siswa',
          label: 'Presensi Santri Rombel (F5)',
          description: 'Presensi kehadiran santri per jam pelajaran & harian',
          icon: UserCheck,
        },
        {
          to: '/guru/nilai',
          label: 'Penilaian Siswa Terpadu (F7)',
          description: 'Sesi asesmen tugas/ujian, capaian TP, dan nilai sikap',
          icon: Award,
        },
        {
          to: '/guru/santri',
          label: 'Direktori Santri & Kontak (F8)',
          description: 'Data biodata santri, kontak wali santri & ekspor',
          icon: Users2,
        },
      ],
    },
    {
      title: 'Kesiswaan & Bimbingan Konseling (BK)',
      items: [
        {
          to: '/guru/kejadian-siswa',
          label: 'Pencatatan Kejadian Santri (F9)',
          description: 'Pencatatan pelanggaran disiplin & prestasi santri',
          icon: ShieldAlert,
        },
        ...(isCounselor || isHomeroom || teacherRoles.isSuperAdmin
          ? [
              {
                to: '/guru/konseling',
                label: 'Layanan Konseling Santri',
                description: 'Catatan konseling privat santri dan tindak lanjut',
                icon: HeartHandshake,
                roleBadge: isCounselor ? 'BK' : 'Wali Kelas',
              },
            ]
          : []),
      ],
    },
    {
      title: 'Informasi & Pengaturan Akun',
      items: [
        {
          to: '/guru/pengumuman',
          label: 'Pengumuman & Berita Guru (F9)',
          description: 'Papan informasi resmi internal yayasan dan sekolah',
          icon: BellRing,
        },
        {
          to: '/guru/profil',
          label: 'Profil Saya & Ubah Password',
          description: 'Biodata kepegawaian guru dan keamanan akun',
          icon: User,
        },
      ],
    },
  ];

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      {/* Header Menu */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-xs">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold text-slate-900">
              Direktori Menu Portal Guru
            </h1>
            <p className="text-xs text-slate-500">
              Peran Aktif: <span className="font-semibold text-emerald-700">{roleTitle}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Grid Menu Kategori */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {menuSections.map((sec, idx) => (
          <div
            key={idx}
            className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-2.5"
          >
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">
              {sec.title}
            </h2>
            <div className="space-y-1.5">
              {sec.items.map((item, iIdx) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={iIdx}
                    to={item.to}
                    className={({ isActive }) =>
                      `flex items-center justify-between p-3 rounded-lg border transition ${
                        isActive
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-semibold'
                          : 'bg-slate-50/50 hover:bg-slate-100/70 border-slate-200/80 text-slate-800'
                      }`
                    }
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-white text-slate-700 flex items-center justify-center shrink-0 border border-slate-200 shadow-xs">
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold truncate text-slate-900">
                            {item.label}
                          </span>
                          {item.badge && (
                            <span className="text-[9px] font-bold bg-emerald-100 text-emerald-700 px-1.5 py-0.2 rounded">
                              {item.badge}
                            </span>
                          )}
                          {item.roleBadge && (
                            <span className="text-[9px] font-bold bg-indigo-100 text-indigo-700 px-1.5 py-0.2 rounded">
                              {item.roleBadge}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 truncate mt-0.5">
                          {item.description}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 shrink-0 ml-2" />
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Akses Portal Lama */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
        <Link
          to="/guru-lama/dashboard"
          className="flex items-center justify-between p-3 rounded-lg border border-amber-200 bg-amber-50/60 hover:bg-amber-100/70 transition"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
              <ExternalLink className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-amber-900">Buka Portal Guru Versi Lama (Legacy)</p>
              <p className="text-[11px] text-amber-700">Daftar halaman lama untuk rujukan sementara</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-amber-700" />
        </Link>
      </div>
    </div>
  );
}
