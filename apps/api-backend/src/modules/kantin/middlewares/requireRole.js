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
      const validApiKey = process.env.INTERNAL_API_KEY || 'aldepos_internal_secret_key_2026';
      if (apiKey && apiKey === validApiKey) {
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

    // 2. Superadmin selalu memiliki akses penuh (global bypass)
    const userType = (user.account_type || '').toLowerCase();
    if (userType === 'superadmin' || userType === 'super_admin') {
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

    // Normalisasi role names (misal 'bendahara_kantin' / 'bendahara', 'kepala_kantin')
    if (userRoles.has('bendahara_kantin')) userRoles.add('bendahara');
    if (userRoles.has('kepala_kantin')) userRoles.add('admin');

    // 4. Cocokkan dengan allowedRoles
    const hasAllowedRole = roles.some(role => {
      const target = role.toLowerCase();
      if (target === 'super_admin' && userRoles.has('superadmin')) return true;
      if (target === 'bendahara' && (userRoles.has('bendahara') || userRoles.has('bendahara_kantin'))) return true;
      if (target === 'admin' && (userRoles.has('admin') || userRoles.has('kepala_kantin') || userRoles.has('superadmin'))) return true;
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
