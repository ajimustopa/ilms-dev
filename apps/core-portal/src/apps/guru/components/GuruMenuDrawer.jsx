import React from 'react';
import { NavLink, Link } from 'react-router-dom';
import { useTeacherAuth } from '../hooks/useTeacherAuth';
import {
  X,
  LayoutDashboard,
  CalendarDays,
  MapPin,
  ClipboardList,
  BookOpen,
  Users2,
  Award,
  BellRing,
  UserCheck,
  FileSpreadsheet,
  HeartHandshake,
  ShieldAlert,
  User,
  ExternalLink,
  ChevronRight,
  Sparkles,
  Layers,
  GraduationCap
} from 'lucide-react';

export function GuruMenuDrawer({ isOpen, onClose }) {
  const { teacherRoles, roleTitle } = useTeacherAuth();
  const { isHomeroom, isCounselor, isCurriculum } = teacherRoles;

  if (!isOpen) return null;

  // Struktur Menu Lengkap F1 - F9 dikelompokkan berdasarkan ranah kerja
  const menuSections = [
    {
      title: 'Presensi & Kepegawaian',
      items: [
        {
          to: '/guru/absensi',
          label: 'Presensi Guru (F1)',
          description: 'Presensi GPS masuk/pulang & riwayat',
          icon: MapPin,
          badge: 'GPS',
        },
        {
          to: '/guru/izin',
          label: 'Pengajuan Cuti & Izin (F2)',
          description: 'Sakit, dinas & upload berkas lampiran',
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
          description: 'Roster mengajar & agenda tatap muka',
          icon: CalendarDays,
        },
        {
          to: '/guru/perencanaan',
          label: 'Perencanaan / TP (F4)',
          description: 'Tujuan Pembelajaran & Silabus ajar',
          icon: BookOpen,
        },
        {
          to: '/guru/jurnal-mengajar',
          label: 'Jurnal Mengajar (F6)',
          description: 'Catatan materi KBM harian',
          icon: Layers,
        },
      ],
    },
    {
      title: 'Kelas & Santri',
      items: [
        {
          to: '/guru/presensi-siswa',
          label: 'Presensi Santri (F5)',
          description: 'Presensi jam KBM & harian kelas',
          icon: UserCheck,
        },
        {
          to: '/guru/nilai',
          label: 'Penilaian Siswa (F7)',
          description: 'Sesi asesmen, capaian TP & sikap',
          icon: Award,
        },
        {
          to: '/guru/santri',
          label: 'Direktori Santri (F8)',
          description: 'Data santri, wali santri & ekspor',
          icon: Users2,
        },
      ],
    },
    {
      title: 'Kesiswaan & BK',
      items: [
        {
          to: '/guru/kejadian-siswa',
          label: 'Kejadian Santri (F9)',
          description: 'Pencatatan pelanggaran & prestasi',
          icon: ShieldAlert,
        },
        // Menu Khusus Konseling: Hanya untuk Guru BK, Wali Kelas, atau Super Admin
        ...(isCounselor || isHomeroom || teacherRoles.isSuperAdmin
          ? [
              {
                to: '/guru/konseling',
                label: 'Layanan Konseling Santri',
                description: 'Catatan konseling privat santri',
                icon: HeartHandshake,
                roleBadge: isCounselor ? 'BK' : 'Wali Kelas',
              },
            ]
          : []),
      ],
    },
    {
      title: 'Informasi & Akun',
      items: [
        {
          to: '/guru/pengumuman',
          label: 'Pengumuman & Berita (F9)',
          description: 'Papan informasi resmi guru',
          icon: BellRing,
        },
        {
          to: '/guru/profil',
          label: 'Profil Saya & Password',
          description: 'Biodata kepegawaian & keamanan akun',
          icon: User,
        },
      ],
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
      {/* Backdrop overlay click to close */}
      <div className="fixed inset-0" onClick={onClose} />

      {/* Drawer Container */}
      <div
        className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col z-10 animate-in slide-in-from-right duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Drawer */}
        <div className="px-4 py-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Menu Portal Guru</h2>
              <p className="text-[11px] text-emerald-700 font-medium">Role Aktif: {roleTitle}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-700 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Konten Menu Scrollable */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-5">
          {menuSections.map((sec, idx) => (
            <div key={idx} className="space-y-1.5">
              <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-2">
                {sec.title}
              </h3>
              <div className="grid grid-cols-1 gap-1">
                {sec.items.map((item, iIdx) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={iIdx}
                      to={item.to}
                      onClick={onClose}
                      className={({ isActive }) =>
                        `flex items-center justify-between p-2.5 rounded-lg border transition text-left ${
                          isActive
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-semibold shadow-xs'
                            : 'bg-white border-slate-200/80 hover:bg-slate-50 text-slate-800'
                        }`
                      }
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center shrink-0 border border-slate-200/60">
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-semibold truncate text-slate-900">
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
      </div>
    </div>
  );
}

export default GuruMenuDrawer;
