const canteenFeePaymentsService = require('./service');

class CanteenFeePaymentsController {
  async listPayments(req, res, next) {
    try {
      const schoolUnitId = req.query.school_unit_id || req.user?.school_units?.[0]?.id || 1;
      const data = await canteenFeePaymentsService.listPayments(schoolUnitId, req.query);
      res.json({ success: true, data, message: null, errors: null });
    } catch (err) {
      next(err);
    }
  }

  async createPayment(req, res, next) {
    try {
      const schoolUnitId = req.body.school_unit_id || req.user?.school_units?.[0]?.id || 1;
      const { period_start, period_end, amount } = req.body;
      if (!period_start || !period_end || amount === undefined) {
        return res.status(422).json({
          success: false,
          data: null,
          message: 'period_start, period_end, dan amount wajib diisi',
          errors: null
        });
      }
      const data = await canteenFeePaymentsService.createPayment(schoolUnitId, req.body, req.user?.id || 1);
      res.status(201).json({ success: true, data, message: 'Pembayaran hak kantin berhasil dicatat', errors: null });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new CanteenFeePaymentsController();
