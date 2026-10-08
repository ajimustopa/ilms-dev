import { getUserRoleNames, isSuperAdminUser } from './accessControl';

/**
 * Kamus Pemetaan Role Teknis ke Label Resmi Institusional Bahasa Indonesia
 */
const ROLE_LABEL_DICTIONARY = {
  super_admin: 'Superadmin',
  admin: 'Superadmin',
  admin_yayasan: 'Admin Yayasan',
  developer: 'Developer Sistem',
  kepala_sekolah: 'Kepala Sekolah',
  waka_kurikulum: 'Waka Kurikulum',
  guru: 'Dewan Guru',
  wali_kelas: 'Wali Kelas',
  guru_bk: 'Guru BK',
  guru_tamu: 'Guru Tamu',
  pelatih_ekskul: 'Pelatih Ekskul',
  keuangan: 'Staf Keuangan',
  bendahara: 'Bendahara Unit',
  hrd: 'Staf HRD',
  kepegawaian: 'Staf Kepegawaian',
  staff_payroll: 'Staf Payroll',
  sarpras_manager: 'Pengelola Sarpras',
  pustakawan: 'Pustakawan',
  panitia_ppdb: 'Panitia PPDB',
  kepala_kantin: 'Pengelola Kantin',
  kasir: 'Kasir Kantin',
  tu: 'Tata Usaha',
  admin_satuan: 'Admin Satuan',
  admin_satuan_pendidikan: 'Admin Satuan',
  staf: 'Staf Administrasi'
};

/**
 * Mengembalikan label bahasa Indonesia resmi untuk peran/role pengguna.
 * @param {Object} user Objek pengguna
 * @returns {string} Label role (mis. "Admin Yayasan", "Dewan Guru", "Staf Keuangan")
 */
export function getRoleLabel(user) {
  if (!user) return 'Tamu';

  const roleNames = getUserRoleNames(user);

  if (isSuperAdminUser(user, roleNames)) {
    if (roleNames.includes('admin_yayasan') && user.account_type !== 'super_admin') {
      return 'Admin Yayasan';
    }
    return 'Superadmin';
  }

  // Cari role pertama yang terdefinisi di kamus
  for (const r of roleNames) {
    if (ROLE_LABEL_DICTIONARY[r]) {
      return ROLE_LABEL_DICTIONARY[r];
    }
  }

  // Fallback: format rapi role yang ada
  if (roleNames.length > 0) {
    return roleNames[0]
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  return 'Staf';
}

/**
 * Mengambil inisial nama (maksimal 2 huruf) untuk avatar lingkaran.
 * @param {string} [name] Nama lengkap pengguna
 * @returns {string} Inisial 1-2 huruf kapital
 */
export function getInitials(name) {
  if (!name || typeof name !== 'string') return 'AF';

  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'A';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();

  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
