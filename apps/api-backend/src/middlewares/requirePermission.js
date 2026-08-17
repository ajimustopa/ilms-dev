/**
 * Permission Authorization Middleware
 * Memeriksa apakah user memiliki permission tertentu untuk Satuan Pendidikan yang aktif
 */
const db = require('../config/db/core');

/**
 * Middleware factory untuk pengecekan permission
 * @param {string} permissionCode - Kode izin (mis. 'core.users.view', 'akademik.nilai.edit')
 * @returns {Function} Express middleware
 */
function requirePermission(permissionCode) {
  return async (req, res, next) => {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({
          success: false,
          data: null,
          message: 'Autentikasi diperlukan sebelum pemeriksaan izin',
          errors: null
        });
      }

      const userId = req.user.id;

      // 1. Tentukan konteks Satuan Pendidikan aktif dari header, query, params, atau body
      const schoolUnitId = req.headers['x-school-unit-id'] ||
                           req.query.school_unit_id ||
                           req.params.school_unit_id ||
                           req.body?.school_unit_id ||
                           null;

      // 2. Cek apakah user memiliki peran super_admin di database
      const superAdminRole = await db('user_school_roles')
        .join('roles', 'user_school_roles.role_id', 'roles.id')
        .where('user_school_roles.user_id', userId)
        .where('roles.name', 'super_admin')
        .first();

      if (superAdminRole) {
        // Super admin memiliki akses ke seluruh fitur tanpa batasan sekolah
        return next();
      }

      // 3. Jika izin memerlukan konteks Satuan Pendidikan atau query spesifik
      let query = db('user_school_roles')
        .join('roles', 'user_school_roles.role_id', 'roles.id')
        .join('role_permissions', 'roles.id', 'role_permissions.role_id')
        .join('permissions', 'role_permissions.permission_id', 'permissions.id')
        .where('user_school_roles.user_id', userId)
        .where('permissions.code', permissionCode);

      if (schoolUnitId) {
        query = query.where('user_school_roles.school_unit_id', schoolUnitId);
      }

      const hasPermission = await query.first();

      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          data: null,
          message: `Akses ditolak. Anda tidak memiliki izin '${permissionCode}'${schoolUnitId ? ` pada Satuan Pendidikan ID ${schoolUnitId}` : ''}`,
          errors: null
        });
      }

      next();
    } catch (err) {
      next(err);
    }
  };
}

module.exports = requirePermission;
