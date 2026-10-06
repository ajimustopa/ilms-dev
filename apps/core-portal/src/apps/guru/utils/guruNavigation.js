import {
  LayoutDashboard,
  UserCheck,
  CalendarDays,
  CalendarCheck,
  BookOpen,
  Award,
  Users,
  ShieldAlert,
  BellRing,
  User,
  HeartHandshake
} from 'lucide-react';

/**
 * Sumber Tunggal (Single Source of Truth) Navigasi Portal Guru
 * Berdasarkan PRD Bagian 3, 4, 6 dan DESIGN.md
 */
export const GURU_MENU_ITEMS = [
  {
    id: 'beranda',
    label: 'Beranda',
    path: '/guru/dashboard',
    aliases: ['/guru', '/guru/dashboard'],
    icon: LayoutDashboard,
    bottomSlot: 1,
    description: 'Ringkasan KBM, jadwal & statistik',
    category: 'utama'
  },
  {
    id: 'absensi',
    label: 'Presensi Mandiri',
    path: '/guru/absensi',
    aliases: ['/guru/absensi', '/guru/presensi', '/guru/absensi-diri', '/guru/izin', '/guru/cuti'],
    icon: UserCheck,
    bottomSlot: 2,
    description: 'Presensi GPS masuk/pulang & pengajuan izin/cuti',
    category: 'presensi'
  },
  {
    id: 'jadwal',
    label: 'Jadwal Mengajar',
    path: '/guru/jadwal',
    aliases: ['/guru/jadwal'],
    icon: CalendarDays,
    bottomSlot: 3,
    description: 'Roster mengajar & agenda tatap muka',
    category: 'kbm'
  },
  {
    id: 'absensi-kelas',
    label: 'Presensi KBM & Jurnal',
    path: '/guru/absensi-kelas',
    aliases: ['/guru/absensi-kelas', '/guru/presensi-siswa', '/guru/jurnal-mengajar', '/guru/jurnal'],
    icon: CalendarCheck,
    bottomSlot: null,
    description: 'Presensi santri per jam KBM & jurnal harian',
    category: 'kbm'
  },
  {
    id: 'tujuan-pembelajaran',
    label: 'Perencanaan & TP',
    path: '/guru/tujuan-pembelajaran',
    aliases: ['/guru/tujuan-pembelajaran', '/guru/perencanaan', '/guru/tp'],
    icon: BookOpen,
    bottomSlot: null,
    description: 'Tujuan Pembelajaran & Silabus ajar',
    category: 'kbm'
  },
  {
    id: 'penilaian',
    label: 'Penilaian Siswa',
    path: '/guru/penilaian',
    aliases: ['/guru/penilaian', '/guru/nilai'],
    icon: Award,
    bottomSlot: 4,
    description: 'Sesi asesmen, capaian TP & nilai sikap',
    category: 'kelas'
  },
  {
    id: 'siswa',
    label: 'Data Siswa & Kelas',
    path: '/guru/siswa',
    aliases: ['/guru/siswa', '/guru/santri'],
    icon: Users,
    bottomSlot: null,
    description: 'Direktori santri, kontak wali santri & ekspor',
    category: 'kelas'
  },
  {
    id: 'kejadian-siswa',
    label: 'Kejadian & Konseling',
    path: '/guru/kejadian-siswa',
    aliases: ['/guru/kejadian-siswa', '/guru/kejadian', '/guru/disiplin', '/guru/konseling'],
    icon: ShieldAlert,
    bottomSlot: null,
    description: 'Pencatatan pelanggaran, prestasi & bimbingan',
    category: 'kesiswaan'
  },
  {
    id: 'pengumuman',
    label: 'Pengumuman',
    path: '/guru/pengumuman',
    aliases: ['/guru/pengumuman'],
    icon: BellRing,
    bottomSlot: null,
    description: 'Papan informasi resmi kedinasan',
    category: 'informasi'
  },
  {
    id: 'profil',
    label: 'Profil & Pengaturan',
    path: '/guru/profil',
    aliases: ['/guru/profil', '/guru/profile'],
    icon: User,
    bottomSlot: 5,
    description: 'Biodata kepegawaian & keamanan akun',
    category: 'informasi'
  }
];

/**
 * Menu khusus role tambahan (misal konseling privat untuk BK / Wali Kelas)
 */
export const GURU_SPECIAL_MENU_ITEMS = [
  {
    id: 'konseling-privat',
    label: 'Layanan Konseling Privat',
    path: '/guru/konseling',
    aliases: ['/guru/konseling'],
    icon: HeartHandshake,
    description: 'Catatan bimbingan & konseling privat santri',
    category: 'kesiswaan',
    requiredRoleCheck: (teacherRoles) =>
      Boolean(teacherRoles?.isCounselor || teacherRoles?.isHomeroom || teacherRoles?.isSuperAdmin),
    badgeRole: (teacherRoles) => (teacherRoles?.isCounselor ? 'BK' : 'Wali Kelas')
  }
];

/**
 * Evaluasi apakah rute tertentu sedang aktif berdasarkan pathname saat ini
 * Mendukung path utama dan seluruh alias rute
 */
export function isMenuItemActive(item, currentPathname) {
  if (!item || !currentPathname) return false;
  const path = currentPathname.replace(/\/$/, ''); // normalisasi trailing slash

  // 1. Cek kecocokan path utama
  const itemPath = item.path.replace(/\/$/, '');
  if (path === itemPath) return true;

  // Khusus root /guru
  if ((path === '/guru' || path === '/guru/dashboard') && item.id === 'beranda') {
    return true;
  }

  // 2. Cek semua alias
  if (Array.isArray(item.aliases)) {
    for (const alias of item.aliases) {
      const normAlias = alias.replace(/\/$/, '');
      if (path === normAlias || path.startsWith(`${normAlias}/`)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Mendapatkan item navigasi bottom nav yang diurutkan sesuai nomor slot (1 s/d 5)
 */
export function getBottomNavItems() {
  return GURU_MENU_ITEMS.filter((item) => item.bottomSlot !== null).sort(
    (a, b) => a.bottomSlot - b.bottomSlot
  );
}

/**
 * Pengelompokan menu untuk Drawer & Sidebar sekunder
 */
export function getDrawerSections(teacherRoles) {
  const sections = [
    {
      title: 'Presensi & Kepegawaian',
      items: GURU_MENU_ITEMS.filter((m) => m.category === 'presensi')
    },
    {
      title: 'KBM & Kurikulum',
      items: GURU_MENU_ITEMS.filter((m) => m.category === 'kbm')
    },
    {
      title: 'Kelas & Santri',
      items: GURU_MENU_ITEMS.filter((m) => m.category === 'kelas')
    },
    {
      title: 'Kesiswaan & BK',
      items: [
        ...GURU_MENU_ITEMS.filter((m) => m.category === 'kesiswaan'),
        ...GURU_SPECIAL_MENU_ITEMS.filter((m) => !m.requiredRoleCheck || m.requiredRoleCheck(teacherRoles))
      ]
    },
    {
      title: 'Informasi & Akun',
      items: GURU_MENU_ITEMS.filter((m) => m.category === 'informasi')
    }
  ];

  return sections;
}
