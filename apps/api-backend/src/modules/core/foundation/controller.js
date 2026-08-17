/**
 * Foundation Controller Implementation
 */
const foundationService = require('./service');

class FoundationController {
  async get(req, res, next) {
    try {
      const profile = await foundationService.getProfile();
      res.status(200).json({
        success: true,
        data: profile,
        message: 'Profil yayasan berhasil dimuat',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async update(req, res, next) {
    try {
      const ipAddress = req.ip || req.connection?.remoteAddress;
      const updatedProfile = await foundationService.updateProfile(
        req.body,
        req.user,
        ipAddress
      );

      res.status(200).json({
        success: true,
        data: updatedProfile,
        message: 'Profil yayasan berhasil diperbarui',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new FoundationController();
