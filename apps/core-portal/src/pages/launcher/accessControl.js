/**
 * accessControl.js — Fungsi Murni Kontrol Akses Modul Launcher Aldepos ILMS
 * 
 * Modul ini murni JavaScript (tanpa React/DOM) sehingga aman diuji secara unit test
 * maupun dipanggil dari hook/komponen launcher.
 */

/**
 * Pemetaan role standar untuk setiap modul aplikasi
 */
export const MODULE_ACCESS_MAP = {
  core: ['super_admin', 'admin_yayasan', 'developer'],
  keuangan: ['super_admin', 'admin_yayasan', 'keuangan', 'admin_satuan', 'admin_satuan_pendidikan', 'kepala_sekolah', 'tu', 'bendahara'],
  kepegawaian: ['super_admin', 'admin_yayasan', 'kepegawaian', 'hrd', 'admin_satuan', 'admin_satuan_pendidikan', 'kepala_sekolah', 'tu', 'staff_payroll', 'staf'],
  akademik: ['super_admin', 'admin_yayasan', 'admin_satuan', 'admin_satuan_pendidikan', 'kepala_sekolah', 'waka_kurikulum', 'guru', 'wali_kelas', 'guru_bk', 'pelatih_ekskul', 'guru_tamu', 'tu'],
  kesiswaan: ['super_admin', 'admin_yayasan', 'admin_satuan', 'admin_satuan_pendidikan', 'kepala_sekolah', 'waka_kurikulum', 'guru', 'wali_kelas', 'pelatih_ekskul', 'tu'],
  sarpras: ['super_admin', 'admin_yayasan', 'sarpras_manager', 'admin_satuan', 'admin_satuan_pendidikan', 'kepala_sekolah', 'tu', 'staf'],
  perpustakaan: ['super_admin', 'admin_yayasan', 'pustakawan', 'admin_satuan', 'admin_satuan_pendidikan', 'kepala_sekolah', 'guru', 'tu', 'staf'],
  cbt: ['super_admin', 'admin_yayasan', 'admin_satuan', 'admin_satuan_pendidikan', 'kepala_sekolah', 'waka_kurikulum', 'guru', 'tu'],
  bk: ['super_admin', 'admin_yayasan', 'guru_bk', 'admin_satuan', 'admin_satuan_pendidikan', 'kepala_sekolah', 'wali_kelas'],
  alumni: ['super_admin', 'admin_yayasan', 'admin_satuan', 'admin_satuan_pendidikan', 'kepala_sekolah', 'tu', 'staf'],
  ppdb: ['super_admin', 'admin_yayasan', 'panitia_ppdb', 'admin_satuan', 'admin_satuan_pendidikan', 'kepala_sekolah', 'tu'],
  alquran: ['super_admin', 'admin_yayasan', 'guru', 'wali_kelas', 'admin_satuan', 'admin_satuan_pendidikan', 'kepala_sekolah', 'tu'],
  manajemen: ['super_admin', 'admin_yayasan', 'admin_satuan', 'admin_satuan_pendidikan', 'kepala_sekolah', 'waka_kurikulum', 'hrd', 'kepegawaian', 'keuangan', 'sarpras_manager'],
  'website-utama': ['super_admin', 'admin_yayasan', 'admin_satuan', 'admin_satuan_pendidikan', 'panitia_ppdb', 'tu'],
  guru: ['super_admin', 'admin_yayasan', 'guru', 'wali_kelas', 'waka_kurikulum', 'guru_bk', 'pelatih_ekskul', 'guru_tamu'],
  kantin: ['super_admin', 'admin_yayasan', 'keuangan', 'admin_satuan', 'admin_satuan_pendidikan', 'kepala_sekolah', 'staf', 'tu', 'kepala_kantin', 'bendahara'],
  dapur: ['super_admin', 'admin_yayasan', 'sarpras_manager', 'admin_satuan', 'admin_satuan_pendidikan', 'kepala_sekolah', 'staf', 'tu']
};

/**
 * Mengumpulkan seluruh daftar nama role yang dimiliki pengguna (termasuk multi-role).
 * @param {Object} user Objek user dari sesi AuthContext
 * @returns {string[]} Array nama role (lowercase, trimmed)
 */
export function getUserRoleNames(user) {
  if (!user) return [];
  const roles = new Set();

  if (user.account_type) roles.add(String(user.account_type).toLowerCase().trim());
  if (user.role) roles.add(String(user.role).toLowerCase().trim());
  if (user.active_role) roles.add(String(user.active_role).toLowerCase().trim());

  if (Array.isArray(user.roles)) {
    user.roles.forEach((r) => {
      if (typeof r === 'string') roles.add(r.toLowerCase().trim());
      else if (r?.role_name) roles.add(String(r.role_name).toLowerCase().trim());
      else if (r?.name) roles.add(String(r.name).toLowerCase().trim());
    });
  }

  if (Array.isArray(user.school_roles)) {
    user.school_roles.forEach((sr) => {
      if (typeof sr === 'string') roles.add(sr.toLowerCase().trim());
      else if (sr?.role_name) roles.add(String(sr.role_name).toLowerCase().trim());
      else if (sr?.name) roles.add(String(sr.name).toLowerCase().trim());
    });
  }

  if (Array.isArray(user.school_units)) {
    user.school_units.forEach((su) => {
      if (su?.role) roles.add(String(su.role).toLowerCase().trim());
      if (Array.isArray(su?.roles)) {
        su.roles.forEach((r) => {
          if (typeof r === 'string') roles.add(r.toLowerCase().trim());
          else if (r?.role_name) roles.add(String(r.role_name).toLowerCase().trim());
          else if (r?.name) roles.add(String(r.name).toLowerCase().trim());
        });
      }
    });
  }

  return Array.from(roles);
}

/**
 * Mengecek apakah pengguna memiliki hak Super Admin / Administrator Yayasan.
 * @param {Object} user Objek user
 * @param {string[]} [roleNames] Opsi daftar role yang sudah dihitung
 * @returns {boolean}
 */
export function isSuperAdminUser(user, roleNames) {
  if (!user) return false;
  const roles = roleNames || getUserRoleNames(user);
  return (
    user.account_type === 'super_admin' ||
    user.account_type === 'admin' ||
    roles.includes('super_admin') ||
    roles.includes('admin') ||
    roles.includes('admin_yayasan')
  );
}

/**
 * Fungsi otorisasi modul per user (aturan identik dengan yang ada di Launcher.jsx).
 * @param {Object} user Objek user
 * @param {Object|string} app Objek modul atau string ID modul
 * @returns {boolean}
 */
export function canAccessModule(user, app) {
  if (!user) return false;

  const roleNames = getUserRoleNames(user);
  if (isSuperAdminUser(user, roleNames)) return true;

  const appId = typeof app === 'string' ? app : app?.id;
  if (!appId) return false;

  const normalized = appId.replace(/-/g, '_');

  // 1. Cek dari daftar user.modules (dihitung langsung oleh backend)
  if (Array.isArray(user?.modules)) {
    if (user.modules.includes(appId) || user.modules.includes(normalized)) {
      return true;
    }
  }

  // 2. Cek dari daftar user.permissions (kode permission granular)
  if (Array.isArray(user?.permissions)) {
    const hasPerm = user.permissions.some(
      (p) =>
        typeof p === 'string' &&
        (p.startsWith(`${appId}.`) || p.startsWith(`${normalized}.`))
    );
    if (hasPerm) return true;
  }

  // 3. Cek dari pemetaan role standar
  const allowedRoles = MODULE_ACCESS_MAP[appId] || MODULE_ACCESS_MAP[normalized] || [];
  if (roleNames.some((r) => allowedRoles.includes(r))) {
    return true;
  }

  return false;
}

/**
 * Menyaring modul yang diizinkan untuk pengguna ke dalam dua kelompok:
 * - active: modul yang berstatus 'active' dan diizinkan hak aksesnya
 * - comingSoon: modul yang berstatus 'coming_soon' dan diizinkan hak aksesnya
 * 
 * @param {Object} user Objek user
 * @param {Array} registry Daftar modul LAUNCHER_MODULES
 * @returns {{ active: Array, comingSoon: Array }}
 */
export function getVisibleModules(user, registry) {
  if (!Array.isArray(registry)) {
    return { active: [], comingSoon: [] };
  }

  const active = [];
  const comingSoon = [];

  registry.forEach((mod) => {
    if (canAccessModule(user, mod)) {
      if (mod.status === 'coming_soon') {
        comingSoon.push(mod);
      } else {
        active.push(mod);
      }
    }
  });

  return { active, comingSoon };
}
