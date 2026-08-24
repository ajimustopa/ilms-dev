/**
 * CMS RBAC Middleware for Website Utama Module
 * Sesuai roles-website-utama.md Bagian 4.2
 */
const db = require('../db');

function requireCmsRole(...allowedRoles) {
  return async (req, res, next) => {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({
          success: false,
          data: null,
          message: 'Otentikasi diperlukan',
          errors: null
        });
      }

      const schoolUnitId = req.headers['x-school-unit-id'] || req.query.school_unit_id || req.body?.school_unit_id || req.schoolUnitId || 1;
      req.schoolUnitId = Number(schoolUnitId);

      // Bypass untuk Super Admin Global Core Service
      if (req.user.account_type === 'admin' || req.user.roles?.includes('super_admin')) {
        req.cmsRole = 'superadmin_cms';
        return next();
      }

      const grant = await db('cms_access_grants')
        .where({
          user_id: req.user.id,
          school_unit_id: req.schoolUnitId,
          status: 'active'
        })
        .first();

      if (!grant || (!allowedRoles.includes(grant.role_code) && grant.role_code !== 'superadmin_cms')) {
        return res.status(403).json({
          success: false,
          data: null,
          message: 'Tidak memiliki akses CMS',
          errors: null
        });
      }

      req.cmsRole = grant.role_code;
      next();
    } catch (err) {
      next(err);
    }
  };
}

module.exports = { requireCmsRole };
