/**
 * Users Controller Implementation
 */
const usersService = require('./service');

class UsersController {
  async internalCreate(req, res, next) {
    try {
      const result = await usersService.internalCreateUser(req.body);
      res.status(201).json({
        success: true,
        data: result,
        message: 'Akun berhasil dibuat otomatis dari aplikasi satelit',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async internalSync(req, res, next) {
    try {
      const result = await usersService.internalSyncUser(req.body);
      res.status(200).json({
        success: true,
        data: result,
        message: 'Data akun berhasil disinkronkan',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async list(req, res, next) {
    try {
      const result = await usersService.listUsers(req.query);
      res.status(200).json({
        success: true,
        data: result,
        message: 'Daftar pengguna berhasil dimuat',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async getById(req, res, next) {
    try {
      const result = await usersService.getUserById(req.params.id);
      res.status(200).json({
        success: true,
        data: result,
        message: 'Detail pengguna berhasil dimuat',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async createAdmin(req, res, next) {
    try {
      const result = await usersService.createAdminUser(
        req.body,
        req.user,
        req.ip || req.connection?.remoteAddress
      );
      res.status(201).json({
        success: true,
        data: result,
        message: 'Akun admin berhasil dibuat',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async updateStatus(req, res, next) {
    try {
      const result = await usersService.updateUserStatus(
        req.params.id,
        req.body.status,
        req.user,
        req.ip || req.connection?.remoteAddress
      );
      res.status(200).json({
        success: true,
        data: result,
        message: 'Status pengguna berhasil diperbarui',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async resetPassword(req, res, next) {
    try {
      const result = await usersService.adminResetPassword(
        req.params.id,
        req.body.new_password,
        req.user,
        req.ip || req.connection?.remoteAddress
      );
      res.status(200).json({
        success: true,
        data: result,
        message: 'Password pengguna berhasil direset',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async updateAccess(req, res, next) {
    try {
      const result = await usersService.updateUserAccess(
        req.params.id,
        req.body,
        req.user,
        req.ip || req.connection?.remoteAddress
      );
      res.status(200).json({
        success: true,
        data: result,
        message: 'Hak akses pengguna berhasil diperbarui',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async changePassword(req, res, next) {
    try {
      await usersService.changePassword(req.user?.id, req.body);
      res.status(200).json({
        success: true,
        data: null,
        message: 'Password Anda berhasil diperbarui',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new UsersController();
