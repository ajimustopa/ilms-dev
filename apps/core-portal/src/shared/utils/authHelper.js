/**
 * Helper untuk menentukan URL halaman login utama aplikasi.
 * Seluruh modul menggunakan satu halaman login terpusat (/login).
 */
export const getAppLoginPath = () => {
  return '/login';
};

export const isCashierOnlyUser = (user) => {
  if (!user) return false;

  const userRoles = new Set();
  if (user.account_type) userRoles.add(String(user.account_type).toLowerCase().trim());
  if (user.role) userRoles.add(String(user.role).toLowerCase().trim());
  if (user.active_role) userRoles.add(String(user.active_role).toLowerCase().trim());
  if (Array.isArray(user.roles)) {
    user.roles.forEach(r => userRoles.add((typeof r === 'string' ? r : r.name || r.role_name || '').toLowerCase().trim()));
  }
  if (Array.isArray(user.school_roles)) {
    user.school_roles.forEach(sr => {
      if (sr.role_name) userRoles.add(String(sr.role_name).toLowerCase().trim());
      if (sr.name) userRoles.add(String(sr.name).toLowerCase().trim());
    });
  }
  if (Array.isArray(user.school_units)) {
    user.school_units.forEach(su => {
      if (su.role) userRoles.add(String(su.role).toLowerCase().trim());
      if (Array.isArray(su.roles)) {
        su.roles.forEach(r => userRoles.add((typeof r === 'string' ? r : r.name || r.role_name || '').toLowerCase().trim()));
      }
    });
  }

  const userPermissions = new Set();
  if (Array.isArray(user.permissions)) {
    user.permissions.forEach(p => userPermissions.add(String(p).toLowerCase().trim()));
  }

  // Cek apakah user adalah Super Admin / Admin Institusi
  const isSuperOrAdmin =
    user.is_super_admin ||
    userRoles.has('super_admin') ||
    userRoles.has('superadmin') ||
    userRoles.has('admin') ||
    userRoles.has('admin_yayasan') ||
    userRoles.has('admin_satuan_pendidikan') ||
    userRoles.has('admin_satuan') ||
    userRoles.has('kepala_sekolah') ||
    userRoles.has('tu') ||
    userPermissions.has('core.all');

  if (isSuperOrAdmin) return false;

  const usernameLower = String(user.username || '').toLowerCase().trim();

  // Akun kasir kantin
  return (
    userRoles.has('kasir_kantin') ||
    userRoles.has('kasir') ||
    userRoles.has('kasir pos') ||
    userRoles.has('cashier') ||
    userRoles.has('canteen_cashier') ||
    usernameLower.startsWith('kasir') ||
    usernameLower.includes('kasir') ||
    userPermissions.has('kantin.pos')
  );
};
