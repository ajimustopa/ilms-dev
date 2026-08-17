/**
 * School Units Controller Implementation
 */
const schoolUnitsService = require('./service');

class SchoolUnitsController {
  async list(req, res, next) {
    try {
      const result = await schoolUnitsService.listSchoolUnits(req.query);
      res.status(200).json({
        success: true,
        data: result,
        message: 'Daftar satuan pendidikan berhasil dimuat',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async getById(req, res, next) {
    try {
      const result = await schoolUnitsService.getSchoolUnitById(req.params.id);
      res.status(200).json({
        success: true,
        data: result,
        message: 'Detail satuan pendidikan berhasil dimuat',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async create(req, res, next) {
    try {
      const result = await schoolUnitsService.createSchoolUnit(
        req.body,
        req.user,
        req.ip || req.connection?.remoteAddress
      );
      res.status(201).json({
        success: true,
        data: result,
        message: 'Satuan pendidikan berhasil ditambahkan',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async update(req, res, next) {
    try {
      const result = await schoolUnitsService.updateSchoolUnit(
        req.params.id,
        req.body,
        req.user,
        req.ip || req.connection?.remoteAddress
      );
      res.status(200).json({
        success: true,
        data: result,
        message: 'Data satuan pendidikan berhasil diperbarui',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async updateStatus(req, res, next) {
    try {
      const result = await schoolUnitsService.updateSchoolUnitStatus(
        req.params.id,
        req.body,
        req.user,
        req.ip || req.connection?.remoteAddress
      );
      res.status(200).json({
        success: true,
        data: result,
        message: 'Status satuan pendidikan berhasil diubah dan dicatat ke riwayat',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }

  async getStatusHistory(req, res, next) {
    try {
      const result = await schoolUnitsService.getStatusHistory(req.params.id);
      res.status(200).json({
        success: true,
        data: result,
        message: 'Riwayat status satuan pendidikan berhasil dimuat',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new SchoolUnitsController();
