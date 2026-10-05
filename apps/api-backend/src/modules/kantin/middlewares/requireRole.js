/**
 * Middleware: requireRole (Kantin RBAC)
 * Sesuai roles-kantin.md §2–3
 */
function requireRole(...allowedRoles) {
  // Flatten array jika dimasukkan dalam format array atau argumen terpisah
  const roles = allowedRoles.flat();

  return (req, res, next) => {
    // 1. Cek bypass untuk internal_service via X-API-Key jika diizinkan
    if (roles.includes('internal_service')) {
      const apiKey = req.headers['x-api-key'];
      const validApiKey = process.env.INTERNAL_API_KEY;
      if (validApiKey && apiKey && apiKey === validApiKey) {
        req.isInternalService = true;
        return next();
      }
    }

    const user = req.user;
    if (!user) {
      return res.status(401).json({
        success: false,
        data: null,
        message: 'Akses ditolak: User belum terautentikasi',
        errors: null
      });
    }

    // 2. Superadmin & Admin Yayasan selalu memiliki akses penuh (global bypass)
    const userType = (user.account_type || '').toLowerCase();
    if (userType === 'superadmin' || userType === 'super_admin' || userType === 'admin') {
      return next();
    }

    // 3. Ekstrak seluruh role yang dimiliki user
    const userRoles = new Set();
    if (userType) userRoles.add(userType);
    if (user.role) userRoles.add(user.role.toLowerCase());
    if (Array.isArray(user.roles)) {
      user.roles.forEach(r => userRoles.add((typeof r === 'string' ? r : r.name || '').toLowerCase()));
    }
    if (Array.isArray(user.school_units)) {
      user.school_units.forEach(su => {
        if (su.role) userRoles.add(su.role.toLowerCase());
        if (Array.isArray(su.roles)) {
          su.roles.forEach(r => userRoles.add((typeof r === 'string' ? r : r.name || '').toLowerCase()));
        }
      });
    }

    // 4. Ekstrak permissions yang dimiliki user
    const userPermissions = new Set();
    if (Array.isArray(user.permissions)) {
      user.permissions.forEach(p => userPermissions.add(String(p).toLowerCase()));
    }

    // Bypass jika memiliki hak akses penuh kantin / yayasan
    if (
      userRoles.has('super_admin') ||
      userRoles.has('superadmin') ||
      userRoles.has('admin_yayasan') ||
      userRoles.has('pengelola_kantin') ||
      userPermissions.has('kantin.manage') ||
      userPermissions.has('core.all')
    ) {
      return next();
    }

    // Jika memiliki permission kantin.view dan ini adalah operasi baca (GET)
    if (userPermissions.has('kantin.view') && req.method === 'GET') {
      return next();
    }

    // Normalisasi role names
    if (userRoles.has('kasir_kantin') || userPermissions.has('kantin.pos')) {
      userRoles.add('kasir');
    }
    if (userRoles.has('bendahara_kantin')) userRoles.add('bendahara');
    if (userRoles.has('kepala_kantin')) userRoles.add('admin');
    if (userRoles.has('pengelola_kantin')) {
      userRoles.add('admin');
      userRoles.add('kepala_kantin');
      userRoles.add('kasir');
      userRoles.add('bendahara');
    }
    if (userRoles.has('admin_satuan_pendidikan') || userRoles.has('admin_satuan')) {
      userRoles.add('admin');
      userRoles.add('kepala_kantin');
    }

    // 5. Cocokkan dengan allowedRoles
    const hasAllowedRole = roles.some(role => {
      const target = role.toLowerCase();
      if (target === 'super_admin' && userRoles.has('superadmin')) return true;
      if (target === 'bendahara' && (userRoles.has('bendahara') || userRoles.has('bendahara_kantin'))) return true;
      if (target === 'admin' && (userRoles.has('admin') || userRoles.has('kepala_kantin') || userRoles.has('pengelola_kantin') || userRoles.has('superadmin'))) return true;
      return userRoles.has(target);
    });

    if (hasAllowedRole) {
      return next();
    }

    return res.status(403).json({
      success: false,
      data: null,
      message: `Akses ditolak: Fitur ini hanya dapat diakses oleh role [${roles.join(', ')}]`,
      errors: null
    });
  };
}

module.exports = requireRole;
