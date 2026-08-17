/**
 * Roles Controller Implementation
 */
const rolesService = require('./service');

class RolesController {
  async list(req, res, next) {
    try {
      const result = await rolesService.listRoles(req.query);
      res.status(200).json({
        success: true,
        data: result,
        message: 'Daftar role berhasil dimuat',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async getById(req, res, next) {
    try {
      const result = await rolesService.getRoleById(req.params.id);
      res.status(200).json({
        success: true,
        data: result,
        message: 'Detail role berhasil dimuat',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async create(req, res, next) {
    try {
      const result = await rolesService.createRole(
        req.body,
        req.user,
        req.ip || req.connection?.remoteAddress
      );
      res.status(201).json({
        success: true,
        data: result,
        message: 'Role baru berhasil dibuat',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async update(req, res, next) {
    try {
      const result = await rolesService.updateRole(
        req.params.id,
        req.body,
        req.user,
        req.ip || req.connection?.remoteAddress
      );
      res.status(200).json({
        success: true,
        data: result,
        message: 'Role berhasil diperbarui',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async delete(req, res, next) {
    try {
      await rolesService.deleteRole(
        req.params.id,
        req.user,
        req.ip || req.connection?.remoteAddress
      );
      res.status(200).json({
        success: true,
        data: null,
        message: 'Role berhasil dihapus',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async listPermissions(req, res, next) {
    try {
      const result = await rolesService.listPermissions(req.query);
      res.status(200).json({
        success: true,
        data: result,
        message: 'Daftar permissions berhasil dimuat',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async assignUserSchoolRoles(req, res, next) {
    try {
      const result = await rolesService.assignUserSchoolRoles(req.params.id, req.body);
      res.status(200).json({
        success: true,
        data: result,
        message: 'Penugasan role ke user berhasil diperbarui',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async removeUserSchoolRole(req, res, next) {
    try {
      await rolesService.removeUserSchoolRole(req.params.id, req.params.role_id);
      res.status(200).json({
        success: true,
        data: null,
        message: 'Penugasan role berhasil dicabut',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new RolesController();
