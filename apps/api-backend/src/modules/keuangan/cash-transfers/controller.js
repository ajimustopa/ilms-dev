/**
 * Cash Transfers Controller for Keuangan Module
 * apps/api-backend/src/modules/keuangan/cash-transfers/controller.js
 */
const cashTransfersService = require('./service');

class CashTransfersController {
  getSchoolUnitId(req) {
    const raw = req.headers['x-school-unit-id'] || req.user?.active_school_unit_id || req.user?.school_unit_id || 1;
    return parseInt(raw, 10) || 1;
  }

  listTransfers = async (req, res, next) => {
    try {
      const schoolUnitId = this.getSchoolUnitId(req);
      const result = await cashTransfersService.listTransfers(schoolUnitId, req.query);
      res.json({
        success: true,
        data: result.data,
        meta: result.meta,
        message: 'Daftar riwayat transfer kas internal berhasil diambil',
        errors: null
      });
    } catch (err) {
      next(err);
    }
  };

  createTransfer = async (req, res, next) => {
    try {
      const schoolUnitId = this.getSchoolUnitId(req);
      const result = await cashTransfersService.createTransfer(schoolUnitId, req.body, req.user?.id);
      res.status(201).json({
        success: true,
        data: result.data,
        message: result.message,
        errors: null
      });
    } catch (err) {
      next(err);
    }
  };
}

module.exports = new CashTransfersController();
