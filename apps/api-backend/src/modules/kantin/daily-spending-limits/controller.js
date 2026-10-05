const dailySpendingLimitsService = require('./service');
const { getValidatedSchoolUnitId } = require('../utils/schoolUnitHelper');

class DailySpendingLimitsController {
  async listLimits(req, res, next) {
    try {
      const schoolUnitId = getValidatedSchoolUnitId(req);
      const data = await dailySpendingLimitsService.listLimits(schoolUnitId, req.query);
      res.json({ success: true, data, message: null, errors: null });
    } catch (err) {
      next(err);
    }
  }

  async getLimitById(req, res, next) {
    try {
      const schoolUnitId = getValidatedSchoolUnitId(req);
      const data = await dailySpendingLimitsService.getLimitById(schoolUnitId, req.params.id);
      if (!data) {
        return res.status(404).json({ success: false, data: null, message: 'Limit jajan tidak ditemukan', errors: null });
      }
      res.json({ success: true, data, message: null, errors: null });
    } catch (err) {
      next(err);
    }
  }

  async createLimit(req, res, next) {
    try {
      const schoolUnitId = getValidatedSchoolUnitId(req);
      const { limit_name, limit_amount } = req.body;
      if (!limit_name || limit_amount === undefined) {
        return res.status(422).json({ success: false, data: null, message: 'limit_name dan limit_amount wajib diisi', errors: null });
      }
      const data = await dailySpendingLimitsService.createLimit(schoolUnitId, req.body);
      res.status(201).json({ success: true, data, message: 'Limit jajan harian berhasil ditambahkan', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async updateLimit(req, res, next) {
    try {
      const schoolUnitId = getValidatedSchoolUnitId(req);
      const data = await dailySpendingLimitsService.updateLimit(schoolUnitId, req.params.id, req.body);
      if (!data) {
        return res.status(404).json({ success: false, data: null, message: 'Limit jajan tidak ditemukan', errors: null });
      }
      res.json({ success: true, data, message: 'Limit jajan harian berhasil diperbarui', errors: null });
    } catch (err) {
      next(err);
    }
  }

  async updateStatus(req, res, next) {
    try {
      const schoolUnitId = getValidatedSchoolUnitId(req);
      const { status } = req.body;
      if (!status || !['active', 'inactive'].includes(status)) {
        return res.status(422).json({ success: false, data: null, message: 'status harus active atau inactive', errors: null });
      }
      const data = await dailySpendingLimitsService.updateStatus(schoolUnitId, req.params.id, req.body);
      if (!data) {
        return res.status(404).json({ success: false, data: null, message: 'Limit jajan tidak ditemukan', errors: null });
      }
      res.json({ success: true, data, message: 'Status limit jajan berhasil diperbarui', errors: null });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new DailySpendingLimitsController();
