/**
 * Helper untuk menentukan URL halaman login aplikasi berdasarkan path URL saat ini.
 * Memastikan ketika user logout dari aplikasi manapun (misal Akademik, Kepegawaian, Keuangan, Kantin, dll),
 * user diarahkan kembali ke halaman login aplikasi terkait, bukan langsung ke core login.
 */
export const getAppLoginPath = (pathname = '') => {
  const path = typeof pathname === 'string' && pathname ? pathname : (typeof window !== 'undefined' ? window.location.pathname : '');
  
  if (path.startsWith('/akademik')) return '/akademik/login';
  if (path.startsWith('/guru')) return '/guru/login';
  if (path.startsWith('/kepegawaian')) return '/kepegawaian/login';
  if (path.startsWith('/keuangan')) return '/keuangan/login';
  if (path.startsWith('/alquran')) return '/alquran/login';
  if (path.startsWith('/kantin')) return '/kantin/login';
  if (path.startsWith('/sarpras')) return '/sarpras/login';
  if (path.startsWith('/dapur')) return '/dapur/login';
  if (path.startsWith('/perpustakaan')) return '/perpustakaan/login';
  if (path.startsWith('/manajemen')) return '/manajemen/login';
  if (path.startsWith('/calon-murid')) return '/calon-murid/login';
  if (path.startsWith('/ppdb') || path.startsWith('/psb')) return '/login';
  if (path.startsWith('/core')) return '/core/login';
  if (path.startsWith('/website-utama')) return '/core/login';
  
  return '/login';
};

/**
 * Cek apakah user merupakan akun Kasir Kantin murni (bukan admin/pengelola).
 * Akun kasir hanya diizinkan membuka halaman POS (/kantin/pos).
 */
export const isCashierOnlyUser = (user) => {
  if (!user) return false;

  const userRoles = new Set();
  if (user.account_type) userRoles.add(String(user.account_type).toLowerCase());
  if (user.role) userRoles.add(String(user.role).toLowerCase());
  if (Array.isArray(user.roles)) {
    user.roles.forEach(r => userRoles.add((typeof r === 'string' ? r : r.name || r.role_name || '').toLowerCase()));
  }
  if (Array.isArray(user.school_roles)) {
    user.school_roles.forEach(sr => {
      if (sr.role_name) userRoles.add(String(sr.role_name).toLowerCase());
      if (sr.name) userRoles.add(String(sr.name).toLowerCase());
    });
  }
  if (Array.isArray(user.school_units)) {
    user.school_units.forEach(su => {
      if (su.role) userRoles.add(String(su.role).toLowerCase());
      if (Array.isArray(su.roles)) {
        su.roles.forEach(r => userRoles.add((typeof r === 'string' ? r : r.name || r.role_name || '').toLowerCase()));
      }
    });
  }

  const userPermissions = new Set();
  if (Array.isArray(user.permissions)) {
    user.permissions.forEach(p => userPermissions.add(String(p).toLowerCase()));
  }

  const isSuperOrAdmin =
    user.is_super_admin ||
    userRoles.has('super_admin') ||
    userRoles.has('superadmin') ||
    userRoles.has('admin') ||
    userRoles.has('admin_yayasan') ||
    userRoles.has('admin_satuan_pendidikan') ||
    userRoles.has('admin_satuan') ||
    userRoles.has('pengelola_kantin') ||
    userRoles.has('kepala_kantin') ||
    userRoles.has('bendahara_kantin') ||
    userRoles.has('bendahara') ||
    userRoles.has('kepala_sekolah') ||
    userRoles.has('tu') ||
    userPermissions.has('kantin.manage') ||
    userPermissions.has('core.all');

  if (isSuperOrAdmin) return false;

  return (
    userRoles.has('kasir_kantin') ||
    userRoles.has('kasir') ||
    userRoles.has('kasir pos') ||
    userPermissions.has('kantin.pos')
  );
};
