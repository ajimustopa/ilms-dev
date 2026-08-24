/**
 * Permission Authorization Middleware
 * Memeriksa apakah user memiliki permission tertentu untuk Satuan Pendidikan yang aktif
 */
const db = require('../config/db/core');

/**
 * Middleware factory untuk pengecekan permission
 * @param {string} permissionCode - Kode izin (mis. 'kepegawaian.employees.view', 'core.users.view', 'akademik.scores.create')
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

      // 2. Ambil seluruh role yang dimiliki user
      const userRoles = await db('user_school_roles')
        .leftJoin('roles', 'user_school_roles.role_id', 'roles.id')
        .where('user_school_roles.user_id', userId)
        .select(
          'roles.name as role_name',
          'user_school_roles.school_unit_id'
        );

      const roleNames = userRoles.map((r) => r.role_name).filter(Boolean);

      // Super Admin & Admin Yayasan memiliki bypass penuh ke seluruh aplikasi & seluruh unit sekolah
      if (roleNames.includes('super_admin') || roleNames.includes('admin_yayasan')) {
        return next();
      }

      // Role HRD memiliki akses penuh ke seluruh fitur dan data Kepegawaian (semua unit sekolah)
      if (permissionCode.startsWith('kepegawaian.') && roleNames.includes('hrd')) {
        return next();
      }

      // Role Keuangan memiliki akses penuh ke seluruh fitur Keuangan
      if (permissionCode.startsWith('keuangan.') && roleNames.includes('keuangan')) {
        return next();
      }

      // Role Admin Satuan Pendidikan memiliki akses penuh ke modul satuan pendidikan
      if (
        (permissionCode.startsWith('akademik.') || permissionCode.startsWith('kesiswaan.')) &&
        roleNames.includes('admin_satuan_pendidikan')
      ) {
        // Cek jika dibatasi school_unit_id
        if (!schoolUnitId) return next();
        const hasMatchingUnit = userRoles.some(
          (r) => r.role_name === 'admin_satuan_pendidikan' && (!r.school_unit_id || String(r.school_unit_id) === String(schoolUnitId))
        );
        if (hasMatchingUnit) return next();
      }

      // 3. Pengecekan berbasis Granular Permissions di database
      const [moduleName] = permissionCode.split('.');
      const acceptableCodes = [
        permissionCode,
        `${moduleName}.manage`
      ];

      // Jika operasi view/read/get, module.view juga memberi izin
      if (
        permissionCode.includes('.view') ||
        permissionCode.includes('.read') ||
        req.method === 'GET'
      ) {
        acceptableCodes.push(`${moduleName}.view`);
      }

      let query = db('user_school_roles')
        .join('roles', 'user_school_roles.role_id', 'roles.id')
        .join('role_permissions', 'roles.id', 'role_permissions.role_id')
        .join('permissions', 'role_permissions.permission_id', 'permissions.id')
        .where('user_school_roles.user_id', userId)
        .whereIn('permissions.code', acceptableCodes);

      if (schoolUnitId) {
        query = query.where((builder) => {
          builder.where('user_school_roles.school_unit_id', Number(schoolUnitId))
            .orWhereNull('user_school_roles.school_unit_id');
        });
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
