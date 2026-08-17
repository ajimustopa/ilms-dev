/**
 * System Settings Controller Implementation
 */
const systemSettingsService = require('./service');

class SystemSettingsController {
  async list(req, res, next) {
    try {
      const result = await systemSettingsService.listSettings(req.query);
      res.status(200).json({
        success: true,
        data: result,
        message: 'Daftar pengaturan sistem berhasil dimuat',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async getByKey(req, res, next) {
    try {
      const schoolUnitId = req.headers['x-school-unit-id'] || req.query.school_unit_id;
      const result = await systemSettingsService.getSettingByKey(req.params.key, schoolUnitId);
      res.status(200).json({
        success: true,
        data: result,
        message: 'Pengaturan sistem berhasil dimuat',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async create(req, res, next) {
    try {
      const result = await systemSettingsService.createSetting(
        req.body,
        req.user,
        req.ip || req.connection?.remoteAddress
      );
      res.status(201).json({
        success: true,
        data: result,
        message: 'Pengaturan sistem berhasil ditambahkan',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async update(req, res, next) {
    try {
      const result = await systemSettingsService.updateSetting(
        req.params.id,
        req.body,
        req.user,
        req.ip || req.connection?.remoteAddress
      );
      res.status(200).json({
        success: true,
        data: result,
        message: 'Pengaturan sistem berhasil diperbarui',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async delete(req, res, next) {
    try {
      await systemSettingsService.deleteSetting(
        req.params.id,
        req.user,
        req.ip || req.connection?.remoteAddress
      );
      res.status(200).json({
        success: true,
        data: null,
        message: 'Pengaturan sistem berhasil dihapus',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new SystemSettingsController();
