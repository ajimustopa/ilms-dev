/**
 * Auth Controller Implementation
 */
const authService = require('./service');

class AuthController {
  async login(req, res, next) {
    try {
      const payload = {
        username: req.body.username,
        password: req.body.password,
        school_unit_id: req.body.school_unit_id,
        ip_address: req.ip || req.connection?.remoteAddress,
        user_agent: req.headers['user-agent']
      };

      const result = await authService.login(payload);

      res.status(200).json({
        success: true,
        data: result,
        message: 'Login berhasil',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async refreshToken(req, res, next) {
    try {
      const payload = {
        refresh_token: req.body.refresh_token,
        ip_address: req.ip || req.connection?.remoteAddress,
        user_agent: req.headers['user-agent']
      };

      const result = await authService.refreshToken(payload);

      res.status(200).json({
        success: true,
        data: result,
        message: 'Token berhasil diperbarui',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async logout(req, res, next) {
    try {
      const payload = {
        refresh_token: req.body.refresh_token,
        user_id: req.user?.id,
        ip_address: req.ip || req.connection?.remoteAddress
      };

      await authService.logout(payload);

      res.status(200).json({
        success: true,
        data: null,
        message: 'Logout berhasil dan sesi telah diakhiri',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async getMe(req, res, next) {
    try {
      const result = await authService.getMe(req.user?.id);

      res.status(200).json({
        success: true,
        data: {
          user: result,
          ...result
        },
        message: 'Profil berhasil dimuat',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async verifyToken(req, res, next) {
    try {
      const result = await authService.verifyToken(req.body.token);

      res.status(200).json({
        success: true,
        data: result,
        message: 'Token valid',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async forgotPasswordRequest(req, res, next) {
    try {
      const result = await authService.requestPasswordReset(req.body);

      res.status(201).json({
        success: true,
        data: result,
        message: 'Permintaan reset password telah diajukan ke admin',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async listPasswordResets(req, res, next) {
    try {
      const result = await authService.listPasswordResets(req.query);

      res.status(200).json({
        success: true,
        data: result,
        message: 'Daftar permintaan reset password berhasil dimuat',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async processPasswordReset(req, res, next) {
    try {
      const result = await authService.processPasswordReset(
        req.params.id,
        req.body,
        req.user?.id
      );

      res.status(200).json({
        success: true,
        data: result,
        message: 'Permintaan reset password berhasil diproses',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new AuthController();
