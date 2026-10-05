/**
 * Permission Authorization Middleware
 * Memeriksa apakah user memiliki permission tertentu untuk Satuan Pendidikan yang aktif
 */
const db = require('../config/db/core');

/**
 * Middleware factory untuk pengecekan permission
 * @param {...(string|string[])} permissionCodes - Kode izin (mis. 'kepegawaian.employees.view', 'core.users.view', 'akademik.scores.create')
 * @returns {Function} Express middleware
 */
function requirePermission(...permissionCodes) {
  const codes = permissionCodes.flat().filter(Boolean);

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
      const rawSchoolUnitId = req.headers['x-school-unit-id'] ||
                              req.headers['x-school-unit-id'.toLowerCase()] ||
                              req.query.school_unit_id ||
                              req.params.school_unit_id ||
                              req.body?.school_unit_id ||
                              null;

      let validSchoolUnitId = null;
      if (
        rawSchoolUnitId !== null &&
        rawSchoolUnitId !== undefined &&
        rawSchoolUnitId !== '' &&
        rawSchoolUnitId !== 'all' &&
        rawSchoolUnitId !== 'null' &&
        rawSchoolUnitId !== 'undefined'
      ) {
        const num = Number(rawSchoolUnitId);
        if (!isNaN(num) && num > 0) {
          validSchoolUnitId = num;
        }
      }

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

      // Role HRD / Kepegawaian memiliki akses penuh ke seluruh fitur dan data Kepegawaian
      if (codes.some(c => c.startsWith('kepegawaian.')) && (roleNames.includes('hrd') || roleNames.includes('kepegawaian'))) {
        return next();
      }

      // Role Keuangan memiliki akses penuh ke seluruh fitur Keuangan
      if (codes.some(c => c.startsWith('keuangan.')) && roleNames.includes('keuangan')) {
        return next();
      }

      // Role Admin Satuan Pendidikan / Kepala Sekolah memiliki akses penuh ke modul satuan pendidikan
      if (
        codes.some(c => c.startsWith('akademik.') || c.startsWith('kesiswaan.') || c.startsWith('psb.') || c.startsWith('ppdb.')) &&
        (roleNames.includes('admin_satuan_pendidikan') || roleNames.includes('admin_satuan') || roleNames.includes('kepala_sekolah') || roleNames.includes('panitia_ppdb'))
      ) {
        if (!validSchoolUnitId) return next();
        const hasMatchingUnit = userRoles.some(
          (r) => (r.role_name === 'admin_satuan_pendidikan' || r.role_name === 'admin_satuan' || r.role_name === 'kepala_sekolah' || r.role_name === 'panitia_ppdb') &&
                 (!r.school_unit_id || String(r.school_unit_id) === String(validSchoolUnitId))
        );
        if (hasMatchingUnit) return next();
      }

      // 3. Pengecekan berbasis Granular Permissions di database
      const acceptableCodes = new Set();
      for (const code of codes) {
        acceptableCodes.add(code);
        const [moduleName] = code.split('.');
        if (moduleName) {
          acceptableCodes.add(`${moduleName}.manage`);
          if (
            code.includes('.view') ||
            code.includes('.read') ||
            req.method === 'GET'
          ) {
            acceptableCodes.add(`${moduleName}.view`);
          }
        }
      }

      let query = db('user_school_roles')
        .join('roles', 'user_school_roles.role_id', 'roles.id')
        .join('role_permissions', 'roles.id', 'role_permissions.role_id')
        .join('permissions', 'role_permissions.permission_id', 'permissions.id')
        .where('user_school_roles.user_id', userId)
        .whereIn('permissions.code', Array.from(acceptableCodes));

      if (validSchoolUnitId) {
        query = query.where((builder) => {
          builder.where('user_school_roles.school_unit_id', validSchoolUnitId)
            .orWhereNull('user_school_roles.school_unit_id');
        });
      }

      const hasPermission = await query.first();

      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          data: null,
          message: `Akses ditolak. Anda tidak memiliki izin '${codes.join(', ')}'${validSchoolUnitId ? ` pada Satuan Pendidikan ID ${validSchoolUnitId}` : ''}`,
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

